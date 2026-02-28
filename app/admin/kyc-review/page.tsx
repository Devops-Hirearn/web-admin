'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getKYCReviewList, approveKYC, rejectKYC, getAdminUserDetail, getPresignedViewUrl, AdminUser } from '@/lib/api/admin';
import { isAuthenticated, logout } from '@/lib/api/auth';
import { BASE_URL } from '@/lib/api/client';
import LoadingSpinner, { LoadingOverlay, SkeletonLoader } from '@/components/LoadingSpinner';
import Alert from '@/components/Alert';

type UserState = 'ACTIVE' | 'KYC_PENDING' | 'ON_HOLD' | 'SUSPENDED' | 'all';

export default function KYCReviewPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterState, setFilterState] = useState<UserState>('all');
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userDocuments, setUserDocuments] = useState<AdminUser | null>(null);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'approve' | 'reject'; userId: string } | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (filterState !== 'all') {
        params.state = filterState;
      }
      const response = await getKYCReviewList(params);
      setUsers(response.users || []);
      setTotalPages(response.totalPages || 1);
    } catch (error: any) {
      console.error('Failed to fetch KYC users:', error);
      setError(error.responseMessage || error.message || 'Failed to load KYC users');
    } finally {
      setLoading(false);
    }
  }, [page, filterState]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchUsers();
  }, [router, fetchUsers]);

  // Helper to get user ID (handles both id and _id from backend)
  const getUserId = (user: AdminUser): string => {
    return user.id || (user as any)._id || '';
  };

  // Helper to get presigned URL for S3 documents
  const getImageUri = async (uri?: string | null): Promise<string | null> => {
    if (!uri) return null;

    // If it's a relative path (local upload), prefix with BASE_URL
    if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
      const baseUrl = BASE_URL.replace('/api', '');
      return `${baseUrl}${uri.startsWith('/') ? uri : '/' + uri}`;
    }

    // If it's an S3 URL, get a presigned URL for viewing
    if (uri.includes('.s3.')) {
      try {
        const signedUrl = await getPresignedViewUrl(uri);
        return signedUrl;
      } catch (error) {
        console.error('Failed to get presigned URL:', error);
        return null;
      }
    }

    // For other URLs (already public), return as is
    return uri;
  };

  const handleViewDocuments = async (user: AdminUser) => {
    const userId = getUserId(user);
    if (!userId) {
      setError('Invalid user ID');
      return;
    }

    try {
      setError(null);
      setLoadingDocuments(true);
      setActionLoading(`loading-${userId}`);
      const response = await getAdminUserDetail(userId);
      const userData = response.user;

      // Get signed URLs for S3 images or normalize local paths
      if (userData?.identityDocuments) {
        const [aadhaarFrontUrl, aadhaarBackUrl, selfieUrl, panCardUrl] = await Promise.all([
          getImageUri(userData.identityDocuments.aadhaarFront),
          getImageUri(userData.identityDocuments.aadhaarBack),
          getImageUri(userData.identityDocuments.selfie),
          getImageUri(userData.identityDocuments.panCard),
        ]);

        userData.identityDocuments = {
          ...userData.identityDocuments,
          aadhaarFront: aadhaarFrontUrl || undefined,
          aadhaarBack: aadhaarBackUrl || undefined,
          selfie: selfieUrl || undefined,
          panCard: panCardUrl || undefined,
        };
      }

      setUserDocuments(userData);
      setSelectedUser(user);
      setShowDocumentsModal(true);
    } catch (error: any) {
      setError(error.responseMessage || error.message || 'Failed to load documents');
    } finally {
      setLoadingDocuments(false);
      setActionLoading(null);
    }
  };

  const handleApprove = (user: AdminUser) => {
    const userId = getUserId(user);
    if (!userId) {
      alert('Error: Invalid user ID');
      return;
    }
    setPendingAction({ type: 'approve', userId });
    setReason('');
    setShowReasonModal(true);
  };

  const handleReject = (user: AdminUser) => {
    const userId = getUserId(user);
    if (!userId) {
      alert('Error: Invalid user ID');
      return;
    }
    setPendingAction({ type: 'reject', userId });
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
      if (pendingAction.type === 'approve') {
        await approveKYC(pendingAction.userId, reason);
        setSuccessMessage('KYC approved successfully');
      } else {
        await rejectKYC(pendingAction.userId, reason);
        setSuccessMessage('KYC rejected successfully');
      }
      setShowReasonModal(false);
      setPendingAction(null);
      setReason('');
      fetchUsers();
      if (showDocumentsModal) {
        setShowDocumentsModal(false);
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setError(error.responseMessage || error.message || `Failed to ${pendingAction.type} KYC`);
    } finally {
      setActionLoading(null);
    }
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
                <h1 className="text-3xl font-bold text-gray-900">KYC Review</h1>
                <p className="text-sm text-gray-500 mt-1">Review and verify user identity documents</p>
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

        {/* Filter */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                User Status
              </label>
              <select
                id="state"
                value={filterState}
                onChange={(e) => {
                  setFilterState(e.target.value as UserState);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="KYC_PENDING">KYC Pending</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-1 h-8 bg-primary rounded-full mr-3"></div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Pending KYC Verifications
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {loading ? 'Loading...' : `${users.length} pending verification${users.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <button
                onClick={fetchUsers}
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
                  <SkeletonLoader key={i} className="h-16" />
                ))}
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-gray-500 text-lg">No pending KYC verifications</p>
              <p className="text-gray-400 text-sm mt-2">All verifications are up to date</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => {
                    const isLoading = actionLoading === `loading-${getUserId(user)}`;
                    return (
                      <tr key={getUserId(user)} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {user.fullName || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{user.phoneNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {user.role || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {user.state}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewDocuments(user)}
                              disabled={isLoading || loadingDocuments}
                              className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {isLoading ? <LoadingSpinner size="sm" /> : '📄 View'}
                            </button>
                            <button
                              onClick={() => handleApprove(user)}
                              disabled={actionLoading === 'approve'}
                              className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {actionLoading === 'approve' ? <LoadingSpinner size="sm" /> : '✓ Approve'}
                            </button>
                            <button
                              onClick={() => handleReject(user)}
                              disabled={actionLoading === 'reject'}
                              className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {actionLoading === 'reject' ? <LoadingSpinner size="sm" /> : '✗ Reject'}
                            </button>
                          </div>
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

      {/* Documents Modal */}
      {showDocumentsModal && userDocuments && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-6 py-5 flex justify-between items-center z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  KYC Documents
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedUser.fullName || 'User'} • {selectedUser.phoneNumber}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setUserDocuments(null);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {userDocuments.identityDocuments?.aadhaarFront && (
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                      <span className="mr-2">🆔</span>
                      Aadhaar Front
                    </h4>
                    <div className="relative rounded-lg overflow-hidden border-2 border-gray-300 bg-white">
                      <img
                        src={userDocuments.identityDocuments.aadhaarFront}
                        alt="Aadhaar Front"
                        className="w-full h-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EFailed to load image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  </div>
                )}
                {userDocuments.identityDocuments?.aadhaarBack && (
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                      <span className="mr-2">🆔</span>
                      Aadhaar Back
                    </h4>
                    <div className="relative rounded-lg overflow-hidden border-2 border-gray-300 bg-white">
                      <img
                        src={userDocuments.identityDocuments.aadhaarBack}
                        alt="Aadhaar Back"
                        className="w-full h-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EFailed to load image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  </div>
                )}
                {userDocuments.identityDocuments?.selfie && (
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                      <span className="mr-2">📸</span>
                      Selfie
                    </h4>
                    <div className="relative rounded-lg overflow-hidden border-2 border-gray-300 bg-white">
                      <img
                        src={userDocuments.identityDocuments.selfie}
                        alt="Selfie"
                        className="w-full h-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EFailed to load image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  </div>
                )}
                {userDocuments.identityDocuments?.panCard && (
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                      <span className="mr-2">💳</span>
                      PAN Card
                    </h4>
                    <div className="relative rounded-lg overflow-hidden border-2 border-gray-300 bg-white">
                      <img
                        src={userDocuments.identityDocuments.panCard}
                        alt="PAN Card"
                        className="w-full h-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EFailed to load image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {(!userDocuments.identityDocuments?.aadhaarFront &&
                !userDocuments.identityDocuments?.aadhaarBack &&
                !userDocuments.identityDocuments?.selfie &&
                !userDocuments.identityDocuments?.panCard) && (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">📄</div>
                    <p className="text-gray-500 text-lg font-medium">No documents available</p>
                  </div>
                )}
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setUserDocuments(null);
                  setSelectedUser(null);
                }}
                className="px-5 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  handleApprove(selectedUser);
                }}
                disabled={actionLoading === 'approve'}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm flex items-center space-x-2"
              >
                {actionLoading === 'approve' ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>Approve</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  handleReject(selectedUser);
                }}
                disabled={actionLoading === 'reject'}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm flex items-center space-x-2"
              >
                {actionLoading === 'reject' ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>✗</span>
                    <span>Reject</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reason Modal */}
      {showReasonModal && pendingAction && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-xl font-bold text-gray-900">
                {pendingAction.type === 'approve' ? '✓ Approve' : '✗ Reject'} KYC
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
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-colors flex items-center space-x-2 ${pendingAction.type === 'approve'
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
                    <span>Confirm {pendingAction.type === 'approve' ? 'Approve' : 'Reject'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loadingDocuments && <LoadingOverlay message="Loading documents..." />}
    </div>
  );
}
