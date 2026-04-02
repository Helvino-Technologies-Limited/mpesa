'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { initiateStkPush, getPaymentStatus, markTimeout, getSettings } from '@/lib/api';
import PaymentStatus from '@/components/PaymentStatus';

const TIMEOUT_SECONDS = 60;
const POLL_INTERVAL_MS = 3000;

export default function HomePage() {
  const [form, setForm] = useState({
    phone: '',
    amount: '',
    reference: '',
    description: '',
    cashier_note: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState(null);  // { status, transaction, checkoutRequestId }
  const [elapsed, setElapsed] = useState(0);
  const [configured, setConfigured] = useState(true);

  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const socketRef = useRef(null);

  // Check if settings are configured on mount
  useEffect(() => {
    getSettings()
      .then((s) => setConfigured(s.is_configured))
      .catch(() => setConfigured(false));
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    pollRef.current = null;
    timerRef.current = null;
  }, []);

  const handlePaymentUpdate = useCallback((data) => {
    setPayment((prev) => ({
      ...prev,
      status: data.status,
      transaction: data.transaction || prev?.transaction,
    }));
    if (data.status !== 'pending') stopPolling();
  }, [stopPolling]);

  const startPolling = useCallback((checkoutRequestId, transactionId) => {
    let elapsedSecs = 0;

    // Elapsed timer
    timerRef.current = setInterval(() => {
      elapsedSecs += 1;
      setElapsed(elapsedSecs);

      if (elapsedSecs >= TIMEOUT_SECONDS) {
        stopPolling();
        // Mark as timeout in DB
        markTimeout(transactionId).catch(() => {});
        setPayment((prev) => ({ ...prev, status: 'timeout' }));
      }
    }, 1000);

    // Polling
    pollRef.current = setInterval(async () => {
      try {
        const txn = await getPaymentStatus(checkoutRequestId);
        if (txn.status !== 'pending') {
          setPayment((prev) => ({ ...prev, status: txn.status, transaction: txn }));
          stopPolling();
        }
      } catch (_) {}
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  const setupSocket = useCallback(async (checkoutRequestId) => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) return;

    try {
      const { io } = await import('socket.io-client');
      const socket = io(wsUrl, { transports: ['websocket', 'polling'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('subscribe:payment', checkoutRequestId);
      });

      socket.on(`payment:${checkoutRequestId}`, (data) => {
        handlePaymentUpdate(data);
        socket.disconnect();
      });

      socket.on('connect_error', () => {
        // Silent fail — polling handles this
      });
    } catch (_) {
      // socket.io unavailable, polling handles it
    }
  }, [handlePaymentUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      socketRef.current?.disconnect();
    };
  }, [stopPolling]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.phone || !form.amount) {
      setError('Phone number and amount are required');
      return;
    }

    setLoading(true);
    try {
      const res = await initiateStkPush(form);
      const initialTransaction = {
        phone: form.phone,
        amount: form.amount,
        reference: form.reference,
      };

      setElapsed(0);
      setPayment({
        status: 'pending',
        transaction: initialTransaction,
        checkoutRequestId: res.checkout_request_id,
        transactionId: res.transaction_id,
      });

      startPolling(res.checkout_request_id, res.transaction_id);
      setupSocket(res.checkout_request_id);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    stopPolling();
    socketRef.current?.disconnect();
    setPayment(null);
    setElapsed(0);
    setForm({ phone: '', amount: '', reference: '', description: '', cashier_note: '' });
  };

  const handleRetry = () => {
    stopPolling();
    socketRef.current?.disconnect();
    setPayment(null);
    setElapsed(0);
  };

  return (
    <div className="min-h-screen">
      {!configured && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-yellow-400 font-medium text-sm">Configuration Required</p>
            <p className="text-yellow-300/70 text-sm mt-0.5">
              Please configure your Daraja API credentials in{' '}
              <a href="/settings" className="underline hover:text-yellow-300">Settings</a>.
            </p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Payment Form */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-mpesa-green/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-mpesa-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Send STK Push</h1>
              <p className="text-gray-400 text-sm">Initiate M-Pesa payment</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Customer Phone Number <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  🇰🇪
                </span>
                <input
                  type="tel"
                  placeholder="0712 345 678"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-field pl-10"
                  required
                  autoComplete="off"
                />
              </div>
              <p className="text-gray-500 text-xs mt-1">Format: 07XX XXX XXX or 254XXXXXXXXX</p>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Amount (KES) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  KES
                </span>
                <input
                  type="number"
                  placeholder="0.00"
                  min="1"
                  step="1"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="input-field pl-14"
                  required
                />
              </div>
            </div>

            {/* Quick amounts */}
            <div className="flex flex-wrap gap-2">
              {[50, 100, 200, 500, 1000, 2000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setForm({ ...form, amount: String(amt) })}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-all
                    ${form.amount === String(amt)
                      ? 'bg-mpesa-green border-mpesa-green text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                    }`}
                >
                  {amt.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Account Reference
              </label>
              <input
                type="text"
                placeholder="e.g. INV-001 or POS-12345"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                className="input-field"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Description
              </label>
              <input
                type="text"
                placeholder="e.g. Goods payment"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field"
                maxLength={255}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !configured}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send STK Push
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info Panel */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              How It Works
            </h3>
            <ol className="space-y-3">
              {[
                { n: '1', text: 'Enter the customer\'s phone number and payment amount' },
                { n: '2', text: 'Click "Send STK Push" to prompt the customer' },
                { n: '3', text: 'Customer sees a payment prompt on their phone' },
                { n: '4', text: 'Customer enters their M-Pesa PIN to confirm' },
                { n: '5', text: 'Payment status updates automatically' },
              ].map((step) => (
                <li key={step.n} className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-mpesa-green/20 text-mpesa-green rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {step.n}
                  </span>
                  <p className="text-gray-400 text-sm">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Tips
            </h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-start gap-2">
                <span className="text-mpesa-green mt-1">•</span>
                Ensure the customer has sufficient M-Pesa balance
              </li>
              <li className="flex items-start gap-2">
                <span className="text-mpesa-green mt-1">•</span>
                Customer has 60 seconds to enter their PIN
              </li>
              <li className="flex items-start gap-2">
                <span className="text-mpesa-green mt-1">•</span>
                Use Account Reference to match with your POS system
              </li>
              <li className="flex items-start gap-2">
                <span className="text-mpesa-green mt-1">•</span>
                Keep the receipt number for your records
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Payment status overlay */}
      {payment && (
        <PaymentStatus
          status={payment.status}
          transaction={payment.transaction}
          elapsed={elapsed}
          timeoutSeconds={TIMEOUT_SECONDS}
          onRetry={handleRetry}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
