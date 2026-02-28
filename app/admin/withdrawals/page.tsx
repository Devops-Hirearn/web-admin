'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getWithdrawals, processWithdrawal, rejectWithdrawal, WithdrawalRequest } from '@/lib/api/admin';
import { isAuthenticated, logout } from '@/lib/api/auth';
import LoadingSpinner, { LoadingOverlay, SkeletonLoader } from '@/components/LoadingSpinner';
import Alert from '@/components/Alert';

export default function WithdrawalsPage() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'all'>('all');
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [payoutReferenceId, setPayoutReferenceId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchWithdrawals();
  }, [router, page, statusFilter]);

  const fetchWithdrawals = async () => {
    try {
      setError(null);
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await getWithdrawals(params);
      setWithdrawals(response.withdrawals || []);
      setTotalPages(response.totalPages || 1);
    } catch (error: any) {
      console.error('Failed to fetch withdrawals:', error);
      setError(error.responseMessage || error.message || 'Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get withdrawal ID (handles both id and _id from backend)
  const getWithdrawalId = (withdrawal: WithdrawalRequest): string => {
    return withdrawal.id || (withdrawal as any)._id || '';
  };

  // Helper to get user ID
  const getUserId = (withdrawal: WithdrawalRequest): string => {
    const userId = withdrawal.userId;
    if (typeof userId === 'object') {
      return userId.id || (userId as any)._id || '';
    }
    return userId || '';
  };

  const handleProcess = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setPayoutReferenceId('');
    setShowProcessModal(true);
  };

  const handleReject = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleConfirmProcess = async () => {
    if (!selectedWithdrawal || !payoutReferenceId.trim()) {
      setError('Please enter a payout reference ID');
      return;
    }

    try {
      setError(null);
      setActionLoading('process');
      const withdrawalId = getWithdrawalId(selectedWithdrawal);
      await processWithdrawal(withdrawalId, payoutReferenceId.trim());
      setSuccessMessage('Withdrawal processed successfully');
      setShowProcessModal(false);
      setSelectedWithdrawal(null);
      setPayoutReferenceId('');
      fetchWithdrawals();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setError(error.responseMessage || error.message || 'Failed to process withdrawal');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedWithdrawal || !rejectionReason.trim()) {
      setError('Please enter a rejection reason');
      return;
    }

    try {
      setError(null);
      setActionLoading('reject');
      const withdrawalId = getWithdrawalId(selectedWithdrawal);
      await rejectWithdrawal(withdrawalId, rejectionReason.trim());
      setSuccessMessage('Withdrawal rejected successfully');
      setShowRejectModal(false);
      setSelectedWithdrawal(null);
      setRejectionReason('');
      fetchWithdrawals();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setError(error.responseMessage || error.message || 'Failed to reject withdrawal');
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      PROCESSING: { bg: 'bg-blue-100', text: 'text-blue-800' },
      PAID: { bg: 'bg-green-100', text: 'text-green-800' },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800' },
    };
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
    return (
      <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/dashboard"
                className="text-gray-600 hover:text-primary transition-colors flex items-center"
              >
                <span className="mr-2">←</span>
                <span>Back to Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Withdrawal Processing</h1>
                <p className="text-sm text-gray-500 mt-1">Process worker withdrawal requests</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6">
            <Alert type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}

        {successMessage && (
          <div className="mb-6">
            <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />
          </div>
        )}

        {/* Status Filter */}
        <div className="mb-6 bg-white shadow-lg rounded-xl p-4 border border-gray-100">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-semibold text-gray-700">Filter by Status:</span>
            {(['all', 'PENDING', 'PROCESSING', 'PAID', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === status
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-1 h-8 bg-primary rounded-full mr-3"></div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Withdrawal Requests</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {loading ? 'Loading...' : `${withdrawals.length} withdrawal${withdrawals.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <button
                onClick={fetchWithdrawals}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {loading ? <LoadingSpinner size="sm" /> : '🔄 Refresh'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <SkeletonLoader key={i} className="h-24" />
                ))}
              </div>
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="text-6xl mb-4">💸</div>
              <p className="text-gray-500 text-lg">No withdrawal requests found</p>
              <p className="text-gray-400 text-sm mt-2">
                {statusFilter !== 'all' ? `No ${statusFilter.toLowerCase()} withdrawals` : 'All withdrawals are processed'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Worker
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Bank Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Requested
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {withdrawals.map((withdrawal) => {
                    const withdrawalId = getWithdrawalId(withdrawal);
                    const userId = withdrawal.userId;
                    const user = typeof userId === 'object' ? userId : null;
                    const isLoading = actionLoading === withdrawalId;

                    return (
                      <tr key={withdrawalId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {user?.fullName || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">{user?.phoneNumber || 'N/A'}</div>
                          {user?.walletFrozen && (
                            <span className="mt-1 inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Wallet Frozen
                            </span>
                          )}
                          {user && (!user.isIdentityVerified || user.identityDocuments?.verificationStatus !== 'approved') && (
                            <span className="mt-1 inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              KYC Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            {formatCurrency(withdrawal.amount)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Wallet: {formatCurrency(user?.walletBalance || 0)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            <div className="font-semibold">{withdrawal.bankSnapshot.accountHolderName}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {withdrawal.bankSnapshot.bankName}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              A/C: ••••{withdrawal.bankSnapshot.accountNumber.slice(-4)} | IFSC: {withdrawal.bankSnapshot.ifscCode}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(withdrawal.status)}
                          {withdrawal.payoutReferenceId && (
                            <div className="text-xs text-gray-500 mt-1">
                              Ref: {withdrawal.payoutReferenceId}
                            </div>
                          )}
                          {withdrawal.rejectionReason && (
                            <div className="text-xs text-red-600 mt-1">
                              Reason: {withdrawal.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(withdrawal.requestedAt)}
                          </div>
                          {withdrawal.processedAt && (
                            <div className="text-xs text-gray-500 mt-1">
                              Processed: {formatDate(withdrawal.processedAt)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {withdrawal.status === 'PENDING' && (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleProcess(withdrawal)}
                                disabled={isLoading || user?.walletFrozen || !user?.isIdentityVerified}
                                className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title={
                                  user?.walletFrozen
                                    ? 'Wallet is frozen'
                                    : !user?.isIdentityVerified
                                    ? 'KYC not approved'
                                    : 'Process withdrawal'
                                }
                              >
                                {isLoading ? <LoadingSpinner size="sm" /> : '✓ Process'}
                              </button>
                              <button
                                onClick={() => handleReject(withdrawal)}
                                disabled={isLoading}
                                className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {isLoading ? <LoadingSpinner size="sm" /> : '✗ Reject'}
                              </button>
                            </div>
                          )}
                          {withdrawal.status === 'PAID' && (
                            <span className="text-xs text-green-600 font-semibold">Processed</span>
                          )}
                          {withdrawal.status === 'REJECTED' && (
                            <span className="text-xs text-red-600 font-semibold">Rejected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <span className="text-sm font-medium text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Process Modal */}
      {showProcessModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-xl font-bold text-gray-900">✓ Process Withdrawal</h3>
              <p className="text-sm text-gray-500 mt-1">Enter payout reference ID after confirming bank transfer</p>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount
                </label>
                <div className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-lg font-bold text-gray-900">
                  {formatCurrency(selectedWithdrawal.amount)}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payout Reference ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={payoutReferenceId}
                  onChange={(e) => setPayoutReferenceId(e.target.value)}
                  placeholder="Enter bank transfer reference ID"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              {error && (
                <div className="mb-4">
                  <Alert type="error" message={error} onClose={() => setError(null)} />
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowProcessModal(false);
                    setSelectedWithdrawal(null);
                    setPayoutReferenceId('');
                    setError(null);
                  }}
                  className="px-5 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmProcess}
                  disabled={!payoutReferenceId.trim() || !!actionLoading}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center space-x-2"
                >
                  {actionLoading === 'process' ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>Confirm Process</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-xl font-bold text-gray-900">✗ Reject Withdrawal</h3>
              <p className="text-sm text-gray-500 mt-1">Enter reason for rejection</p>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount
                </label>
                <div className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-lg font-bold text-gray-900">
                  {formatCurrency(selectedWithdrawal.amount)}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                  rows={4}
                />
              </div>
              {error && (
                <div className="mb-4">
                  <Alert type="error" message={error} onClose={() => setError(null)} />
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedWithdrawal(null);
                    setRejectionReason('');
                    setError(null);
                  }}
                  className="px-5 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={!rejectionReason.trim() || !!actionLoading}
                  className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center space-x-2"
                >
                  {actionLoading === 'reject' ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>✗</span>
                      <span>Confirm Reject</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {actionLoading && <LoadingOverlay message="Processing..." />}
    </div>
  );
}
