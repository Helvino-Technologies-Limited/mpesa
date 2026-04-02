const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { getAccessToken, getSettings } = require('../utils/mpesa');

// GET /api/settings - Get current settings (secrets masked)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings WHERE id = 1');
    const s = result.rows[0] || {};

    // Mask sensitive fields: show only last 4 chars
    const mask = (val) => {
      if (!val) return '';
      if (val.length <= 4) return '****';
      return '****' + val.slice(-4);
    };

    return res.json({
      id: s.id,
      business_name: s.business_name || '',
      consumer_key: mask(s.consumer_key),
      consumer_secret: mask(s.consumer_secret),
      shortcode: s.shortcode || '',
      passkey: mask(s.passkey),
      transaction_type: s.transaction_type || 'CustomerPayBillOnline',
      callback_url: s.callback_url || '',
      environment: s.environment || 'sandbox',
      is_configured: !!(s.consumer_key && s.consumer_secret && s.shortcode && s.passkey),
      updated_at: s.updated_at,
    });
  } catch (err) {
    console.error('Get settings error:', err);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /api/settings - Save/update settings
router.post('/', async (req, res) => {
  const {
    business_name,
    consumer_key,
    consumer_secret,
    shortcode,
    passkey,
    transaction_type,
    callback_url,
    environment,
  } = req.body;

  // Build dynamic update — only update fields that are provided and not masked
  const updates = [];
  const params = [];

  const addField = (col, val) => {
    // Skip if value is masked (starts with ****)
    if (val === undefined || val === null) return;
    if (typeof val === 'string' && val.startsWith('****')) return;
    params.push(val);
    updates.push(`${col} = $${params.length}`);
  };

  addField('business_name', business_name);
  addField('consumer_key', consumer_key);
  addField('consumer_secret', consumer_secret);
  addField('shortcode', shortcode);
  addField('passkey', passkey);
  addField('transaction_type', transaction_type);
  addField('callback_url', callback_url);
  addField('environment', environment);

  if (!updates.length) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  updates.push(`updated_at = NOW()`);

  try {
    await pool.query(
      `UPDATE settings SET ${updates.join(', ')} WHERE id = 1`,
      params
    );
    return res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    console.error('Save settings error:', err);
    return res.status(500).json({ error: 'Failed to save settings' });
  }
});

// GET /api/settings/test - Test Daraja connection
router.get('/test', async (req, res) => {
  try {
    const settings = await getSettings();
    const token = await getAccessToken(settings);
    return res.json({
      success: true,
      message: 'Connection successful',
      environment: settings.environment,
      token_preview: token.slice(0, 10) + '...',
    });
  } catch (err) {
    const msg = err.response?.data?.errorMessage || err.message;
    return res.status(400).json({ success: false, error: msg });
  }
});

module.exports = router;
