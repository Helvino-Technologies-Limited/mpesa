'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function PasswordGate({ children }) {
  const { authenticated, checking, login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-mpesa-green/30 border-t-mpesa-green rounded-full animate-spin" />
      </div>
    );
  }

  if (authenticated) return children;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) return;
    setError('');
    setLoading(true);
    try {
      await login(password);
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect password');
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="card p-8 w-full max-w-sm">
        {/* Lock icon */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-mpesa-green/20 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-mpesa-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Enter Password</h2>
          <p className="text-gray-400 text-sm mt-1 text-center">
            This area is protected. Enter the admin password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field text-center text-lg tracking-widest"
            autoFocus
            autoComplete="current-password"
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Unlock'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
