const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

function signToken() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub: 'admin', exp: Math.floor(Date.now() / 1000) + 8 * 3600 })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [header, payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');
  if (sig !== expectedSig) throw new Error('Invalid signature');
  const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
}

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    verifyToken(authHeader.slice(7));
    next();
  } catch (err) {
    return res.status(401).json({ error: err.message || 'Invalid token' });
  }
}

module.exports = { requireAuth, signToken };
