const axios = require('axios');
const { pool } = require('../db');

// Simple in-memory token cache
let tokenCache = { token: null, expiresAt: 0 };

function getBaseUrl(environment) {
  return environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
}

async function getSettings() {
  const result = await pool.query('SELECT * FROM settings WHERE id = 1');
  const s = result.rows[0] || {};

  // Merge DB values with env-var fallbacks (DB takes priority if set)
  const merged = {
    ...s,
    consumer_key:     s.consumer_key     || process.env.MPESA_CONSUMER_KEY     || '',
    consumer_secret:  s.consumer_secret  || process.env.MPESA_CONSUMER_SECRET  || '',
    shortcode:        s.shortcode        || process.env.MPESA_SHORTCODE         || '',
    passkey:          s.passkey          || process.env.MPESA_PASSKEY           || '',
    environment:      s.environment      || process.env.MPESA_ENVIRONMENT       || 'sandbox',
    business_name:    s.business_name    || process.env.MPESA_BUSINESS_NAME     || 'My Business',
  };

  if (!merged.consumer_key || !merged.consumer_secret || !merged.shortcode || !merged.passkey) {
    throw new Error('Daraja credentials are not fully configured. Please update Settings.');
  }

  return merged;
}

async function getAccessToken(settings) {
  const now = Date.now();

  // Return cached token if still valid (with 60-second buffer)
  if (tokenCache.token && now < tokenCache.expiresAt - 60000) {
    return tokenCache.token;
  }

  const credentials = Buffer.from(
    `${settings.consumer_key}:${settings.consumer_secret}`
  ).toString('base64');

  const baseUrl = getBaseUrl(settings.environment);
  const response = await axios.get(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${credentials}` },
      timeout: 15000,
    }
  );

  const { access_token, expires_in } = response.data;
  tokenCache = {
    token: access_token,
    expiresAt: now + parseInt(expires_in, 10) * 1000,
  };

  return access_token;
}

function generateTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

function generatePassword(shortcode, passkey, timestamp) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

function formatPhone(phone) {
  // Strip spaces and non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('254') && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith('0') && cleaned.length === 10) return `254${cleaned.slice(1)}`;
  if (cleaned.startsWith('7') && cleaned.length === 9) return `254${cleaned}`;
  if (cleaned.startsWith('1') && cleaned.length === 9) return `254${cleaned}`;

  throw new Error(`Invalid phone number format: ${phone}`);
}

async function initiateStkPush({ phone, amount, reference, description }) {
  const settings = await getSettings();
  const accessToken = await getAccessToken(settings);
  const timestamp = generateTimestamp();
  const password = generatePassword(settings.shortcode, settings.passkey, timestamp);
  const formattedPhone = formatPhone(phone);

  const callbackUrl = settings.callback_url;
  if (!callbackUrl) {
    throw new Error('Callback URL is not configured. Please update Settings.');
  }

  const payload = {
    BusinessShortCode: settings.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: settings.transaction_type || 'CustomerPayBillOnline',
    Amount: Math.round(amount),
    PartyA: formattedPhone,
    PartyB: settings.shortcode,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl,
    AccountReference: reference || 'Payment',
    TransactionDesc: description || 'POS Payment',
  };

  const baseUrl = getBaseUrl(settings.environment);
  const response = await axios.post(
    `${baseUrl}/mpesa/stkpush/v1/processrequest`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  return response.data;
}

async function queryStkStatus(checkoutRequestId) {
  const settings = await getSettings();
  const accessToken = await getAccessToken(settings);
  const timestamp = generateTimestamp();
  const password = generatePassword(settings.shortcode, settings.passkey, timestamp);

  const payload = {
    BusinessShortCode: settings.shortcode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const baseUrl = getBaseUrl(settings.environment);
  const response = await axios.post(
    `${baseUrl}/mpesa/stkpushquery/v1/query`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  return response.data;
}

module.exports = {
  getSettings,
  getAccessToken,
  initiateStkPush,
  queryStkStatus,
  formatPhone,
  generateTimestamp,
};
