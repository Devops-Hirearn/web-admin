'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getAdminUserDetail,
  approveKYC,
  rejectKYC,
  putUserOnHold,
  suspendUser,
  activateUser,
  freezeWallet,
  unfreezeWallet,
  AdminUser,
} from '@/lib/api/admin';
import { isAuthenticated, logout } from '@/lib/api/auth';
import LoadingSpinner, { LoadingOverlay, SkeletonLoader } from '@/components/LoadingSpinner';
import Alert from '@/components/Alert';

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'approve-kyc' | 'reject-kyc' | 'suspend' | 'activate' | 'on-hold' | 'freeze-wallet' | 'unfreeze-wallet';
    userId: string;
  } | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (userId) {
      fetchUser();
    }
  }, [router, userId]);

  const fetchUser = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await getAdminUserDetail(userId);
      setUser(response.user);
    } catch (error: any) {
      console.error('Failed to fetch user:', error);
      setError(error.responseMessage || error.message || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (
    type: 'approve-kyc' | 'reject-kyc' | 'suspend' | 'activate' | 'on-hold' | 'freeze-wallet' | 'unfreeze-wallet'
  ) => {
    setPendingAction({ type, userId });
    setReason('');
    setShowReasonModal(true);
  };

  const handleConfirmAction = async () => {
    if (!pendingAction || !reason.trim()) {
      setError('Please enter a reason for audit logging');
      return;
    }

    try {
      setError(null);
      setActionLoading(pendingAction.type);
      let message = '';

      switch (pendingAction.type) {
        case 'approve-kyc':
          await approveKYC(pendingAction.userId, reason);
          message = 'KYC approved successfully';
          break;
        case 'reject-kyc':
          await rejectKYC(pendingAction.userId, reason);
          message = 'KYC rejected successfully';
          break;
        case 'suspend':
          await suspendUser(pendingAction.userId, reason);
          message = 'User suspended successfully';
          break;
        case 'activate':
          await activateUser(pendingAction.userId, reason);
          message = 'User activated successfully';
          break;
        case 'on-hold':
          await putUserOnHold(pendingAction.userId, reason);
          message = 'User put on hold successfully';
          break;
        case 'freeze-wallet':
          await freezeWallet(pendingAction.userId, reason);
          message = 'Wallet frozen successfully';
          break;
        case 'unfreeze-wallet':
          await unfreezeWallet(pendingAction.userId, reason);
          message = 'Wallet unfrozen successfully';
          break;
      }

      setSuccessMessage(message);
      setShowReasonModal(false);
      setPendingAction(null);
      setReason('');
      await fetchUser();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setError(error.responseMessage || error.message || `Failed to ${pendingAction.type}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStateColor = (state?: string) => {
    switch (state) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'KYC_PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ON_HOLD':
        return 'bg-orange-100 text-orange-800';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SkeletonLoader className="h-96" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👤</div>
          <p className="text-gray-500 text-lg">User not found</p>
          <Link href="/admin/users" className="text-primary hover:text-primary-dark mt-4 inline-block">
            ← Back to Users
          </Link>
        </div>
      </div>
    );
  }

  const isKYCApproved = user.identityDocuments?.verificationStatus === 'approved';
  const isKYCPending = user.identityDocuments?.verificationStatus === 'pending';
  const userState = (user.state || '').toUpperCase();
  const isSuspended = userState === 'SUSPENDED';
  const isOnHold = userState === 'ON_HOLD';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link 
                href="/admin/users" 
                className="text-gray-600 hover:text-primary transition-colors flex items-center"
              >
                <span className="mr-2">←</span>
                <span>Back to Users</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
                <p className="text-sm text-gray-500 mt-1">{user.fullName || user.phoneNumber}</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-1 h-8 bg-primary rounded-full mr-3"></div>
                <h2 className="text-xl font-bold text-gray-900">User Information</h2>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-base font-semibold text-gray-900 mt-1">{user.fullName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-base font-semibold text-gray-900 mt-1">{user.phoneNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-base font-semibold text-gray-900 mt-1">{user.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Role</label>
                    <p className="mt-1">
                      <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {user.role === 'worker' ? '👷 Worker' : user.role === 'employer' ? '👔 Employer' : '👨‍💼 Admin'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className="mt-1">
                      <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${getStateColor(user.state)}`}>
                        {user.state || 'ACTIVE'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">KYC Status</label>
                    <p className="mt-1">
                      <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${
                        isKYCApproved ? 'bg-green-100 text-green-800' :
                        isKYCPending ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.identityDocuments?.verificationStatus?.toUpperCase() || 'N/A'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Information */}
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-1 h-8 bg-primary rounded-full mr-3"></div>
                <h2 className="text-xl font-bold text-gray-900">Wallet Information</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Balance</label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ₹{((user.walletBalance || 0) / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="mt-1">
                    {user.walletFrozen ? (
                      <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        🔒 Frozen
                      </span>
                    ) : (
                      <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        ✓ Active
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          <div className="space-y-6">
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-1 h-8 bg-primary rounded-full mr-3"></div>
                <h2 className="text-xl font-bold text-gray-900">Admin Actions</h2>
              </div>
              <div className="space-y-3">
                {/* KYC Actions */}
                {isKYCPending && (
                  <div className="space-y-2 pb-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700">KYC Review</h3>
                    <button
                      onClick={() => handleAction('approve-kyc')}
                      disabled={!!actionLoading}
                      className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                    >
                      {actionLoading === 'approve-kyc' ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>✓</span>
                          <span>Approve KYC</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleAction('reject-kyc')}
                      disabled={!!actionLoading}
                      className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                    >
                      {actionLoading === 'reject-kyc' ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>✗</span>
                          <span>Reject KYC</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* State Actions */}
                {!isSuspended && !isOnHold && (
                  <div className="space-y-2 pb-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700">User Status</h3>
                    <button
                      onClick={() => handleAction('on-hold')}
                      disabled={!!actionLoading}
                      className="w-full px-4 py-2.5 border-2 border-orange-300 text-orange-700 bg-orange-50 rounded-lg text-sm font-semibold hover:bg-orange-100 disabled:opacity-50 transition-colors"
                    >
                      ⏸ Put On Hold
                    </button>
                    <button
                      onClick={() => handleAction('suspend')}
                      disabled={!!actionLoading}
                      className="w-full px-4 py-2.5 border-2 border-red-300 text-red-700 bg-red-50 rounded-lg text-sm font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      🚫 Suspend User
                    </button>
                  </div>
                )}

                {/* Activate User */}
                {(isSuspended || isOnHold) && (
                  <div className="space-y-2 pb-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700">Activate User</h3>
                    <button
                      onClick={() => handleAction('activate')}
                      disabled={!!actionLoading}
                      className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                    >
                      {actionLoading === 'activate' ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>✓</span>
                          <span>Activate User</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Wallet Actions */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">Wallet Management</h3>
                  {user.walletFrozen ? (
                    <button
                      onClick={() => handleAction('unfreeze-wallet')}
                      disabled={!!actionLoading}
                      className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === 'unfreeze-wallet' ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span className="ml-2">Processing...</span>
                        </>
                      ) : (
                        '🔓 Unfreeze Wallet'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction('freeze-wallet')}
                      disabled={!!actionLoading}
                      className="w-full px-4 py-2.5 border-2 border-red-300 text-red-700 bg-red-50 rounded-lg text-sm font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === 'freeze-wallet' ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span className="ml-2">Processing...</span>
                        </>
                      ) : (
                        '🔒 Freeze Wallet'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Reason Modal */}
      {showReasonModal && pendingAction && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-xl font-bold text-gray-900">
                {pendingAction.type === 'approve-kyc' ? '✓ Approve KYC' :
                 pendingAction.type === 'reject-kyc' ? '✗ Reject KYC' :
                 pendingAction.type === 'suspend' ? '🚫 Suspend User' :
                 pendingAction.type === 'activate' ? '✓ Activate User' :
                 pendingAction.type === 'on-hold' ? '⏸ Put On Hold' :
                 pendingAction.type === 'freeze-wallet' ? '🔒 Freeze Wallet' :
                 '🔓 Unfreeze Wallet'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">Enter reason for audit logging</p>
            </div>
            <div className="p-6">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for audit logging..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary mb-4 resize-none"
                rows={4}
              />
              {error && (
                <div className="mb-4">
                  <Alert type="error" message={error} onClose={() => setError(null)} />
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowReasonModal(false);
                    setPendingAction(null);
                    setReason('');
                    setError(null);
                  }}
                  className="px-5 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={!reason.trim() || !!actionLoading}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-colors flex items-center space-x-2 ${
                    pendingAction.type === 'approve-kyc' || pendingAction.type === 'activate' || pendingAction.type === 'unfreeze-wallet'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {actionLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Confirm</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
