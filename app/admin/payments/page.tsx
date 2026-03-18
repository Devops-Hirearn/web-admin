'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Alert from '@/components/Alert';
import LoadingSpinner from '@/components/LoadingSpinner';
import { isAuthenticated } from '@/lib/api/auth';
import {
  AdminPaymentItem,
  PaymentStatus,
  PaymentType,
  getPaymentsList,
  getPaymentsStats,
  reconcilePaymentById,
  reconcilePayments,
} from '@/lib/api/admin';

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [scanAllPending, setScanAllPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // list state
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<PaymentStatus | 'all'>('all');
  const [type, setType] = useState<PaymentType | 'all'>('all');
  const [q, setQ] = useState('');
  const [listLoading, setListLoading] = useState(false);
  const [stats, setStats] = useState<{ total: number; totalsByStatus: Record<string, { count: number; totalAmount: number }> } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Basic guard: redirect to login if not authenticated
  if (typeof window !== 'undefined' && !isAuthenticated()) {
    router.push('/login');
  }

  const statusOptions: Array<{ label: string; value: PaymentStatus | 'all' }> = useMemo(
    () => [
      { label: 'All', value: 'all' },
      { label: 'Pending', value: 'pending' },
      { label: 'Processing', value: 'processing' },
      { label: 'Completed', value: 'completed' },
      { label: 'Failed', value: 'failed' },
      { label: 'Refunded', value: 'refunded' },
      { label: 'Escalated', value: 'escalated' },
      { label: 'Covered by platform', value: 'covered_by_platform' },
    ],
    []
  );

  const typeOptions: Array<{ label: string; value: PaymentType | 'all' }> = useMemo(
    () => [
      { label: 'All', value: 'all' },
      { label: 'Wallet topup', value: 'wallet_topup' },
      { label: 'Deposit add', value: 'deposit_add' },
      { label: 'Job payment', value: 'job_payment' },
      { label: 'Job remaining', value: 'job_remaining_payment' },
      { label: 'Job posting additional', value: 'job_posting_additional_payment' },
      { label: 'Payout', value: 'payout' },
    ],
    []
  );

  const fetchPayments = async () => {
    try {
      setError(null);
      setListLoading(true);
      const res = await getPaymentsList({ page, limit: 25, status, type, q: q.trim() || undefined });
      setPayments(res.payments || []);
      setTotalPages(res.totalPages || 1);
    } catch (e: any) {
      setError(e.responseMessage || e.message || 'Failed to load payments');
    } finally {
      setListLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await getPaymentsStats({ type, q: q.trim() || undefined });
      setStats({ total: res.total || 0, totalsByStatus: res.totalsByStatus || {} });
    } catch (e: any) {
      // Don't block the page if stats fails; just log via UI error
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, type]);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const runBulk = async () => {
    try {
      setError(null);
      setResult(null);
      setLoading(true);
      const res = await reconcilePayments({ reason, scanAllPending });
      setResult(res);
      await fetchPayments();
      await fetchStats();
    } catch (e: any) {
      setError(e.responseMessage || e.message || 'Failed to run payment reconciliation');
    } finally {
      setLoading(false);
    }
  };

  const runSingle = async (paymentId: string) => {
    try {
      setError(null);
      setResult(null);
      setLoading(true);
      const res = await reconcilePaymentById(paymentId.trim(), { reason });
      setResult(res);
      await fetchPayments();
      await fetchStats();
    } catch (e: any) {
      setError(e.responseMessage || e.message || 'Failed to reconcile payment');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = reason.trim().length > 0 && !loading;
  const statusPill = (s: string) => {
    const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold';
    switch (s) {
      case 'completed':
        return `${base} bg-green-100 text-green-800`;
      case 'pending':
        return `${base} bg-yellow-100 text-yellow-800`;
      case 'processing':
        return `${base} bg-blue-100 text-blue-800`;
      case 'failed':
        return `${base} bg-red-100 text-red-800`;
      default:
        return `${base} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Tools</h1>
            <p className="text-sm text-gray-500 mt-1">Admin-only reconciliation utilities</p>
          </div>
          <Link href="/admin/dashboard" className="text-sm font-medium text-primary hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">All payments</h2>
              <p className="text-sm text-gray-600">
                Filter by status/type and search by user phone/name or Razorpay IDs. Reconcile any stuck payment from here.
              </p>
            </div>
            <button
              onClick={fetchPayments}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
              disabled={listLoading}
            >
              Refresh
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <div className="text-xs text-gray-600 mr-2">
              Status counts{statsLoading ? ' (loading…) ' : ''}:
            </div>
            {statusOptions
              .filter((o) => o.value !== 'all')
              .map((o) => {
                const count = stats?.totalsByStatus?.[o.value]?.count ?? 0;
                const isActive = status === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => {
                      setPage(1);
                      setStatus(o.value);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                      isActive
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                    title={`Filter to ${o.label}`}
                  >
                    {o.label}: {count}
                  </button>
                );
              })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
            <div>
              <label className="text-xs font-semibold text-gray-600">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value as any);
                }}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Type</label>
              <select
                value={type}
                onChange={(e) => {
                  setPage(1);
                  setType(e.target.value as any);
                }}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {typeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Search</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="phone/name/razorpay_order_id/razorpay_payment_id"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={() => {
                    setPage(1);
                    fetchPayments();
                    fetchStats();
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium"
                  disabled={listLoading}
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Created</th>
                    <th className="text-left px-4 py-3 font-semibold">User</th>
                    <th className="text-left px-4 py-3 font-semibold">Type</th>
                    <th className="text-left px-4 py-3 font-semibold">Amount</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Razorpay</th>
                    <th className="text-right px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {listLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Loading…
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No payments found.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {p.user?.fullName || p.user?.phoneNumber || '—'}
                          </div>
                          <div className="text-xs text-gray-500">{p.user?.phoneNumber || ''}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {p.type}
                          {p.job?.title ? (
                            <div className="text-xs text-gray-500">Job: {p.job.title}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                          ₹{Number(p.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={statusPill(p.status)}>{p.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <div>order: {p.razorpayOrderId || '—'}</div>
                          <div>pay: {p.razorpayPaymentId || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => runSingle(p._id)}
                            disabled={!canSubmit}
                            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!canSubmit ? 'Add audit reason first' : 'Reconcile this payment'}
                          >
                            Reconcile
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
              <div className="text-xs text-gray-600">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || listLoading}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || listLoading}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Audit reason (required)</h2>
          <p className="text-sm text-gray-600 mb-4">
            This will be stored in the admin audit log for compliance/debugging.
          </p>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. User reported deposit captured but not credited"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Bulk reconcile</h2>
            <p className="text-sm text-gray-600 mb-4">
              Runs the same logic as the server cron. Use this if you suspect the interval didn’t run on Render.
            </p>

            <label className="flex items-center gap-3 text-sm text-gray-700 mb-4">
              <input
                type="checkbox"
                checked={scanAllPending}
                onChange={(e) => setScanAllPending(e.target.checked)}
                className="h-4 w-4"
              />
              Scan all pending (ignore 2-minute age filter)
            </label>

            <button
              onClick={runBulk}
              disabled={!canSubmit}
              className="w-full px-4 py-3 rounded-lg bg-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Running…' : 'Run reconciliation'}
            </button>
          </div>
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Tip</h2>
            <p className="text-sm text-gray-600">
              If a payment is captured in Razorpay but still shows <b>pending</b> here, click <b>Reconcile</b>. If nothing changes,
              check Render logs for `cron.payment_reconciler.*` events and confirm Razorpay keys are set on Render.
            </p>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Result</h2>
            {loading && <LoadingSpinner />}
          </div>

          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto min-h-[120px]">
            {result ? JSON.stringify(result, null, 2) : 'No result yet.'}
          </pre>
        </div>
      </main>
    </div>
  );
}

