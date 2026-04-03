import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token to every request if present
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('pos_token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ---------- Auth ----------

export async function verifyPassword(password) {
  const res = await api.post('/auth/verify', { password });
  return res.data; // { token }
}

export async function changePassword(current_password, new_password) {
  const res = await api.post('/auth/change-password', { current_password, new_password });
  return res.data;
}

// ---------- M-Pesa ----------

export async function initiateStkPush(payload) {
  const res = await api.post('/mpesa/stkpush', payload);
  return res.data;
}

export async function getPaymentStatus(checkoutRequestId) {
  const res = await api.get(`/mpesa/status/${checkoutRequestId}`);
  return res.data;
}

export async function queryDaraja(checkoutRequestId) {
  const res = await api.post('/mpesa/query', { checkout_request_id: checkoutRequestId });
  return res.data;
}

export async function markTimeout(transactionId) {
  const res = await api.patch(`/transactions/${transactionId}/timeout`);
  return res.data;
}

// ---------- Transactions ----------

export async function getTransactions(params = {}) {
  const res = await api.get('/transactions', { params });
  return res.data;
}

export async function getTransaction(id) {
  const res = await api.get(`/transactions/${id}`);
  return res.data;
}

export async function getTransactionSummary() {
  const res = await api.get('/transactions/summary');
  return res.data;
}

// ---------- Settings ----------

export async function getSettings() {
  const res = await api.get('/settings');
  return res.data;
}

export async function saveSettings(data) {
  const res = await api.post('/settings', data);
  return res.data;
}

export async function testConnection() {
  const res = await api.get('/settings/test');
  return res.data;
}
