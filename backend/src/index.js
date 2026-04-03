require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');
const { initDb, pool } = require('./db');
const mpesaRoutes = require('./routes/mpesa');
const transactionRoutes = require('./routes/transactions');
const settingsRoutes = require('./routes/settings');
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((u) => u.trim())
  : ['http://localhost:3000'];

// Socket.io
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

// Make io available to routes
app.set('io', io);

// Security
app.use(helmet());
app.set('trust proxy', 1);

// CORS
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting (skip for callback endpoint)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.includes('/callback'),
});
app.use('/api', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('WS client connected:', socket.id);

  socket.on('subscribe:payment', (checkoutRequestId) => {
    socket.join(`payment:${checkoutRequestId}`);
  });

  socket.on('disconnect', () => {
    console.log('WS client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

// Seed DB with credentials from env (only if DB row has no consumer_key / no password yet)
async function seedDefaults() {
  try {
    const { rows } = await pool.query(
      'SELECT consumer_key, admin_password_hash FROM settings WHERE id = 1'
    );
    const row = rows[0] || {};
    const updates = [];
    const params = [];

    const set = (col, val) => {
      if (!val) return;
      params.push(val);
      updates.push(`${col} = $${params.length}`);
    };

    if (!row.consumer_key) {
      set('business_name', process.env.MPESA_BUSINESS_NAME);
      set('consumer_key', process.env.MPESA_CONSUMER_KEY);
      set('consumer_secret', process.env.MPESA_CONSUMER_SECRET);
      set('environment', process.env.MPESA_ENVIRONMENT);
      set('shortcode', process.env.MPESA_SHORTCODE);
      set('passkey', process.env.MPESA_PASSKEY);
    }

    if (!row.admin_password_hash) {
      const hash = await bcrypt.hash('1234', 10);
      params.push(hash);
      updates.push(`admin_password_hash = $${params.length}`);
    }

    if (updates.length) {
      await pool.query(`UPDATE settings SET ${updates.join(', ')} WHERE id = 1`, params);
      console.log('Default settings seeded from environment variables');
    }
  } catch (err) {
    console.warn('Seed defaults warning:', err.message);
  }
}

// Start server; attempt DB migration but don't crash if it fails
// (schema may already exist from a prior run, or network may be unavailable locally)
server.listen(PORT, async () => {
  console.log(`M-Pesa POS backend running on port ${PORT}`);
  try {
    await initDb();
    await seedDefaults();
  } catch (err) {
    console.warn(
      'DB init warning (schema may already exist or DB unreachable locally):',
      err.message
    );
  }
});
