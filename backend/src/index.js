require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const { initDb } = require('./db');
const mpesaRoutes = require('./routes/mpesa');
const transactionRoutes = require('./routes/transactions');
const settingsRoutes = require('./routes/settings');

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

initDb()
  .then(() => {
    server.listen(PORT, () =>
      console.log(`M-Pesa POS backend running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
