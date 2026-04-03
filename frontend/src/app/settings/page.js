'use client';

import { useState, useEffect } from 'react';
import { getSettings, saveSettings, testConnection, changePassword } from '@/lib/api';
import PasswordGate from '@/components/PasswordGate';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    business_name: '',
    consumer_key: '',
    consumer_secret: '',
    shortcode: '',
    passkey: '',
    transaction_type: 'CustomerPayBillOnline',
    callback_url: '',
    environment: 'sandbox',
    account_reference: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [alert, setAlert] = useState(null); // { type: 'success'|'error', message }
  const [showSecrets, setShowSecrets] = useState({
    consumer_key: false,
    consumer_secret: false,
    passkey: false,
  });
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => setSettings(s))
      .catch(() => showAlert('error', 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  function showAlert(type, message) {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(settings);
      showAlert('success', 'Settings saved successfully');
    } catch (err) {
      showAlert('error', err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const result = await testConnection();
      showAlert('success', `Connection successful (${result.environment})`);
    } catch (err) {
      showAlert('error', err.response?.data?.error || 'Connection failed');
    } finally {
      setTesting(false);
    }
  }

  const update = (field) => (e) =>
    setSettings((s) => ({ ...s, [field]: e.target.value }));

  async function handleChangePassword(e) {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) {
      showAlert('error', 'New passwords do not match');
      return;
    }
    if (pwForm.newPw.length < 4) {
      showAlert('error', 'New password must be at least 4 characters');
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(pwForm.current, pwForm.newPw);
      showAlert('success', 'Password changed successfully');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err) {
      showAlert('error', err.response?.data?.error || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  }

  const toggleSecret = (field) =>
    setShowSecrets((s) => ({ ...s, [field]: !s[field] }));

  const SecretInput = ({ field, placeholder, label }) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={showSecrets[field] ? 'text' : 'password'}
          placeholder={placeholder}
          value={settings[field] || ''}
          onChange={update(field)}
          className="input-field pr-12"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => toggleSecret(field)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          tabIndex={-1}
        >
          {showSecrets[field] ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
      <p className="text-gray-600 text-xs mt-1">
        Leave unchanged to keep existing value (shown masked for security)
      </p>
    </div>
  );

  if (loading) {
    return (
      <PasswordGate>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-mpesa-green/30 border-t-mpesa-green rounded-full animate-spin" />
        </div>
      </PasswordGate>
    );
  }

  return (
    <PasswordGate>
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Configure your Daraja API credentials</p>
      </div>

      {alert && (
        <div className={`mb-6 rounded-xl p-4 flex items-start gap-3 ${
          alert.type === 'success'
            ? 'bg-green-500/10 border border-green-500/30'
            : 'bg-red-500/10 border border-red-500/30'
        }`}>
          {alert.type === 'success' ? (
            <svg className="w-5 h-5 text-mpesa-green mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <p className={alert.type === 'success' ? 'text-mpesa-green' : 'text-red-400'}>
            {alert.message}
          </p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Info */}
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <div className="w-6 h-6 bg-mpesa-green/20 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-mpesa-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            Business Information
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Business Name</label>
            <input
              type="text"
              placeholder="My Business"
              value={settings.business_name || ''}
              onChange={update('business_name')}
              className="input-field"
            />
          </div>
        </div>

        {/* Daraja Credentials */}
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <div className="w-6 h-6 bg-mpesa-green/20 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-mpesa-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            Daraja API Credentials
          </h2>

          <SecretInput
            field="consumer_key"
            label="Consumer Key"
            placeholder="Enter Consumer Key from Safaricom Developer Portal"
          />

          <SecretInput
            field="consumer_secret"
            label="Consumer Secret"
            placeholder="Enter Consumer Secret from Safaricom Developer Portal"
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Business Short Code
            </label>
            <input
              type="text"
              placeholder="e.g. 174379 (sandbox) or your Paybill/Till"
              value={settings.shortcode || ''}
              onChange={update('shortcode')}
              className="input-field"
            />
          </div>

          <SecretInput
            field="passkey"
            label="Lipa Na M-Pesa Passkey"
            placeholder="Enter your Passkey from Safaricom"
          />
        </div>

        {/* Transaction Settings */}
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <div className="w-6 h-6 bg-mpesa-green/20 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-mpesa-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            Transaction Settings
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Transaction Type
            </label>
            <select
              value={settings.transaction_type || 'CustomerPayBillOnline'}
              onChange={update('transaction_type')}
              className="input-field bg-gray-800"
            >
              <option value="CustomerPayBillOnline">PayBill (CustomerPayBillOnline)</option>
              <option value="CustomerBuyGoodsOnline">Buy Goods / Till (CustomerBuyGoodsOnline)</option>
            </select>
            <p className="text-gray-500 text-xs mt-1">
              Use PayBill for Paybill numbers, Buy Goods for Till numbers
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Default Account Reference
            </label>
            <input
              type="text"
              placeholder="e.g. 0740240877 (your Equity/Paybill account number)"
              value={settings.account_reference || ''}
              onChange={update('account_reference')}
              className="input-field"
              maxLength={100}
            />
            <p className="text-gray-500 text-xs mt-1">
              Pre-filled on every payment form — must match the account that receives the money (e.g. your Equity phone number for Paybill 247247)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Environment
            </label>
            <div className="grid grid-cols-2 gap-3">
              {['sandbox', 'production'].map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, environment: env }))}
                  className={`py-2.5 px-4 rounded-xl border text-sm font-medium transition-all ${
                    settings.environment === env
                      ? 'bg-mpesa-green border-mpesa-green text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {env === 'sandbox' ? '🧪 Sandbox' : '🚀 Production'}
                </button>
              ))}
            </div>
            {settings.environment === 'production' && (
              <p className="text-yellow-400 text-xs mt-2 flex items-start gap-1">
                <span className="mt-0.5">⚠️</span>
                Production mode processes real M-Pesa transactions
              </p>
            )}
          </div>
        </div>

        {/* Callback URL */}
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <div className="w-6 h-6 bg-mpesa-green/20 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-mpesa-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            Callback URL
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Daraja Callback URL
            </label>
            <input
              type="url"
              placeholder="https://your-backend.onrender.com/api/mpesa/callback"
              value={settings.callback_url || ''}
              onChange={update('callback_url')}
              className="input-field"
            />
            <div className="mt-2 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-400">Requirements:</p>
              <p>• Must be a publicly accessible HTTPS URL</p>
              <p>• Safaricom will POST payment results to this endpoint</p>
              <p>• Format: https://your-backend-url/api/mpesa/callback</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Settings
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="btn-secondary flex items-center justify-center gap-2 sm:w-48"
          >
            {testing ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Test Connection
              </>
            )}
          </button>
        </div>
      </form>

      {/* Change Admin Password */}
      <div className="card p-6 mt-6">
        <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-mpesa-green/20 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-mpesa-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          Change Admin Password
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Current Password</label>
            <input
              type="password"
              placeholder="Enter current password"
              value={pwForm.current}
              onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
              className="input-field"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">New Password</label>
            <input
              type="password"
              placeholder="Enter new password (min 4 characters)"
              value={pwForm.newPw}
              onChange={(e) => setPwForm((f) => ({ ...f, newPw: e.target.value }))}
              className="input-field"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              placeholder="Re-enter new password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
              className="input-field"
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={pwSaving || !pwForm.current || !pwForm.newPw || !pwForm.confirm}
            className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto px-6"
          >
            {pwSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Update Password'
            )}
          </button>
        </form>
        <p className="text-gray-600 text-xs mt-3">Default password is <strong className="text-gray-500">1234</strong> — change it immediately.</p>
      </div>

      {/* Daraja setup guide */}
      <div className="card p-6 mt-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Daraja Setup Guide
        </h3>
        <ol className="space-y-3 text-sm text-gray-500">
          <li className="flex items-start gap-3">
            <span className="w-5 h-5 bg-gray-800 text-gray-400 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
            <span>Go to <span className="text-mpesa-green">developer.safaricom.co.ke</span> and create an account</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-5 h-5 bg-gray-800 text-gray-400 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
            <span>Create a new App and add the <strong className="text-gray-300">Lipa Na M-Pesa Sandbox</strong> product</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-5 h-5 bg-gray-800 text-gray-400 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
            <span>Copy your Consumer Key and Consumer Secret from the app details</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-5 h-5 bg-gray-800 text-gray-400 rounded-full flex items-center justify-center text-xs flex-shrink-0">4</span>
            <span>For sandbox: use shortcode <strong className="text-gray-300">174379</strong> and get the passkey from the Lipa Na M-Pesa section</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-5 h-5 bg-gray-800 text-gray-400 rounded-full flex items-center justify-center text-xs flex-shrink-0">5</span>
            <span>Set callback URL to your backend URL + <strong className="text-gray-300">/api/mpesa/callback</strong></span>
          </li>
        </ol>
      </div>
    </div>
    </PasswordGate>
  );
}
