'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserList, AdminUser } from '@/lib/api/admin';
import { isAuthenticated, logout } from '@/lib/api/auth';
import LoadingSpinner, { SkeletonLoader } from '@/components/LoadingSpinner';
import Alert from '@/components/Alert';

type UserState = 'ACTIVE' | 'KYC_PENDING' | 'ON_HOLD' | 'SUSPENDED' | 'all';
type UserRole = 'worker' | 'employer' | 'admin' | 'all';

export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole>('all');
  const [filterState, setFilterState] = useState<UserState>('all');
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchUsers();
  }, [router, page, filterRole, filterState]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim() || !searchQuery) {
        setPage(1);
        fetchUsers();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const fetchUsers = async () => {
    try {
      setError(null);
      setLoading(true);
      const params: any = {
        page,
        limit: 20,
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (filterRole !== 'all') {
        params.role = filterRole;
      }
      if (filterState !== 'all') {
        params.state = filterState;
      }
      const response = await getUserList(params);
      setUsers(response.users || []);
      setTotalPages(response.totalPages || 1);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      setError(error.responseMessage || error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const getUserId = (user: AdminUser): string => {
    return user.id || (user as any)._id || '';
  };

  const getStateColor = (state: string) => {
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

  const getRoleLabel = (role?: string | null) => {
    switch (role) {
      case 'worker':
        return '👷 Worker';
      case 'employer':
        return '👔 Employer';
      case 'admin':
        return '👨‍💼 Admin';
      default:
        return role || 'N/A';
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
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="text-sm text-gray-500 mt-1">Manage users, suspend, activate, or put on hold</p>
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

        {/* Filters and Search */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, or email..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                id="role"
                value={filterRole}
                onChange={(e) => {
                  setFilterRole(e.target.value as UserRole);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="all">All Roles</option>
                <option value="worker">Worker</option>
                <option value="employer">Employer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                Status
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

        {/* Users Table */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-1 h-8 bg-primary rounded-full mr-3"></div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Users
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {loading ? 'Loading...' : `${users.length} user${users.length !== 1 ? 's' : ''} found`}
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
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-500 text-lg">No users found</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
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
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Wallet
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={getUserId(user)} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {user.fullName || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{user.phoneNumber}</div>
                        {user.email && (
                          <div className="text-xs text-gray-500">{user.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${getStateColor(user.state || 'ACTIVE')}`}>
                          {user.state || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          ₹{((user.walletBalance || 0) / 100).toFixed(2)}
                        </div>
                        {user.walletFrozen && (
                          <div className="text-xs text-red-600 font-medium">Frozen</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/users/${getUserId(user)}`}
                          className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          View Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
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
    </div>
  );
}
