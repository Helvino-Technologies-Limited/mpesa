const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireAuth, signToken } = require('../middleware/auth');

// POST /api/auth/verify — verify password, return token
router.post('/verify', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password is required' });

  try {
    const result = await pool.query('SELECT admin_password_hash FROM settings WHERE id = 1');
    const hash = result.rows[0]?.admin_password_hash;
    if (!hash) return res.status(500).json({ error: 'Admin password not set' });

    const valid = await bcrypt.compare(password, hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    return res.json({ token: signToken() });
  } catch (err) {
    console.error('Auth verify error:', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
});

// POST /api/auth/change-password — change admin password (requires valid token)
router.post('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }
  if (new_password.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }

  try {
    const result = await pool.query('SELECT admin_password_hash FROM settings WHERE id = 1');
    const hash = result.rows[0]?.admin_password_hash;
    if (!hash) return res.status(500).json({ error: 'Admin password not set' });

    const valid = await bcrypt.compare(current_password, hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE settings SET admin_password_hash = $1 WHERE id = 1', [newHash]);

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
