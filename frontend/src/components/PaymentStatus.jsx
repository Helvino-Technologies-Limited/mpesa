'use client';

import { useEffect, useRef } from 'react';

const STATUS_CONFIG = {
  pending: {
    icon: (
      <div className="w-20 h-20 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin" />
    ),
    title: 'Waiting for Payment',
    subtitle: 'Ask the customer to check their phone and enter their M-Pesa PIN',
    color: 'yellow',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
  },
  success: {
    icon: (
      <div className="w-20 h-20 rounded-full bg-mpesa-green/20 flex items-center justify-center">
        <svg className="w-10 h-10 text-mpesa-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    ),
    title: 'Payment Successful',
    subtitle: 'Transaction completed',
    color: 'green',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  failed: {
    icon: (
      <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
        <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    ),
    title: 'Payment Failed',
    subtitle: 'The payment could not be completed',
    color: 'red',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
  timeout: {
    icon: (
      <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center">
        <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
    title: 'Payment Timed Out',
    subtitle: 'No response received from the customer',
    color: 'orange',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  },
};

function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'success') {
      oscillator.frequency.setValueAtTime(523, ctx.currentTime);
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.7);
    } else if (type === 'failed') {
      oscillator.frequency.setValueAtTime(300, ctx.currentTime);
      oscillator.frequency.setValueAtTime(200, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    }
  } catch (_) {}
}

export default function PaymentStatus({
  status,
  transaction,
  elapsed,
  timeoutSeconds = 60,
  onRetry,
  onClose,
}) {
  const prevStatus = useRef(null);

  useEffect(() => {
    if (status !== prevStatus.current) {
      if (status === 'success') playSound('success');
      else if (status === 'failed' || status === 'timeout') playSound('failed');
      prevStatus.current = status;
    }
  }, [status]);

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const progress = Math.min((elapsed / timeoutSeconds) * 100, 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`card w-full max-w-md p-8 ${cfg.bg} ${cfg.border} border`}>
        {/* Icon */}
        <div className="flex justify-center mb-6">{cfg.icon}</div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-white mb-2">{cfg.title}</h2>
        <p className="text-center text-gray-400 text-sm mb-6">{cfg.subtitle}</p>

        {/* Transaction details */}
        {transaction && (
          <div className="bg-gray-800/60 rounded-xl p-4 space-y-2 mb-6 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Phone</span>
              <span className="text-white font-medium">{transaction.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Amount</span>
              <span className="text-white font-bold text-base">
                KES {Number(transaction.amount).toLocaleString()}
              </span>
            </div>
            {transaction.reference && (
              <div className="flex justify-between">
                <span className="text-gray-400">Reference</span>
                <span className="text-white">{transaction.reference}</span>
              </div>
            )}
            {transaction.mpesa_receipt && (
              <div className="flex justify-between">
                <span className="text-gray-400">M-Pesa Receipt</span>
                <span className="text-mpesa-green font-bold">{transaction.mpesa_receipt}</span>
              </div>
            )}
            {status !== 'success' && transaction.result_desc && (
              <div className="flex justify-between">
                <span className="text-gray-400">Reason</span>
                <span className="text-red-400 text-right max-w-48">{transaction.result_desc}</span>
              </div>
            )}
          </div>
        )}

        {/* Progress bar (only when pending) */}
        {status === 'pending' && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Waiting...</span>
              <span>{timeoutSeconds - elapsed}s remaining</span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {(status === 'failed' || status === 'timeout') && onRetry && (
            <button onClick={onRetry} className="btn-primary flex-1">
              Retry Payment
            </button>
          )}
          {status !== 'pending' && (
            <button onClick={onClose} className={`btn-secondary ${status === 'success' ? 'flex-1' : 'flex-none px-4'}`}>
              {status === 'success' ? 'New Payment' : 'Cancel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
