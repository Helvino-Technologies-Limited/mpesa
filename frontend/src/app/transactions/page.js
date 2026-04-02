'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTransactions } from '@/lib/api';
import { format, parseISO } from 'date-fns';

const STATUS_STYLES = {
  success: 'bg-green-500/20 text-green-400 border border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border border-red-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  timeout: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  cancelled: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

function formatDate(dateStr) {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy HH:mm');
  } catch {
    return dateStr;
  }
}

export default function TransactionsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    page: 1,
  });
  const [selectedTxn, setSelectedTxn] = useState(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTransactions({
        status: filters.status !== 'all' ? filters.status : undefined,
        search: filters.search || undefined,
        page: filters.page,
        limit: 20,
      });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Auto-refresh every 10s for pending transactions
  useEffect(() => {
    const interval = setInterval(fetchTransactions, 10000);
    return () => clearInterval(interval);
  }, [fetchTransactions]);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, page: 1 }));
  };

  const summary = data?.summary;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-gray-400 text-sm mt-1">Payment history and status</p>
        </div>
        <button onClick={fetchTransactions} className="btn-secondary flex items-center gap-2 py-2 px-4 text-sm">
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Successful', value: summary.successful, color: 'text-mpesa-green', bg: 'bg-green-500/10' },
            { label: 'Failed', value: summary.failed, color: 'text-red-400', bg: 'bg-red-500/10' },
            { label: 'Pending', value: summary.pending, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            {
              label: 'Total Collected',
              value: `KES ${Number(summary.total_amount).toLocaleString()}`,
              color: 'text-mpesa-green',
              bg: 'bg-green-500/10',
            },
          ].map((s) => (
            <div key={s.label} className={`card p-4 ${s.bg}`}>
              <p className="text-gray-400 text-xs uppercase tracking-wider">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search phone, reference, receipt..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
            className="input-field py-2 flex-1"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
            className="input-field py-2 sm:w-40 bg-gray-800"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="timeout">Timeout</option>
          </select>
        </form>
      </div>

      {/* Transactions table */}
      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-mpesa-green/30 border-t-mpesa-green rounded-full animate-spin" />
          </div>
        ) : data?.transactions.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            No transactions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Date</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Phone</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">Amount</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3 hidden md:table-cell">Reference</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3 hidden lg:table-cell">Receipt</th>
                  <th className="text-center text-gray-400 font-medium px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.transactions.map((txn) => (
                  <tr
                    key={txn.id}
                    onClick={() => setSelectedTxn(txn)}
                    className="border-b border-gray-800/50 hover:bg-gray-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {formatDate(txn.created_at)}
                    </td>
                    <td className="px-4 py-3 text-white font-medium">{txn.phone}</td>
                    <td className="px-4 py-3 text-right text-white font-bold whitespace-nowrap">
                      KES {Number(txn.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                      {txn.reference || <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-mpesa-green font-medium hidden lg:table-cell">
                      {txn.mpesa_receipt || <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`status-badge ${STATUS_STYLES[txn.status] || STATUS_STYLES.pending}`}>
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data?.pagination && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <p className="text-gray-500 text-sm">
              Page {data.pagination.page} of {data.pagination.pages} ({data.pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={filters.page >= data.pagination.pages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction detail modal */}
      {selectedTxn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedTxn(null)}
        >
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Transaction Details</h3>
              <button
                onClick={() => setSelectedTxn(null)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {[
                { label: 'Transaction ID', value: selectedTxn.id },
                { label: 'Phone', value: selectedTxn.phone },
                { label: 'Amount', value: `KES ${Number(selectedTxn.amount).toLocaleString()}`, bold: true },
                { label: 'Reference', value: selectedTxn.reference || '—' },
                { label: 'Description', value: selectedTxn.description || '—' },
                { label: 'M-Pesa Receipt', value: selectedTxn.mpesa_receipt || '—', green: !!selectedTxn.mpesa_receipt },
                { label: 'Checkout Request ID', value: selectedTxn.checkout_request_id, small: true },
                { label: 'Result', value: selectedTxn.result_desc || '—' },
                { label: 'Date', value: formatDate(selectedTxn.created_at) },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-start gap-4">
                  <span className="text-gray-500 flex-shrink-0">{row.label}</span>
                  <span className={`text-right break-all ${row.bold ? 'text-white font-bold' : row.green ? 'text-mpesa-green font-bold' : row.small ? 'text-gray-400 text-xs' : 'text-gray-300'}`}>
                    {row.value}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                <span className="text-gray-500">Status</span>
                <span className={`status-badge ${STATUS_STYLES[selectedTxn.status] || ''}`}>
                  {selectedTxn.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
