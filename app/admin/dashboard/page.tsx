'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPaymentSummary, getKYCReviewList } from '@/lib/api/admin';
import { isAuthenticated, logout } from '@/lib/api/auth';
import LoadingSpinner, { LoadingOverlay, SkeletonLoader } from '@/components/LoadingSpinner';
import Alert from '@/components/Alert';

interface DashboardStats {
  pendingKYC: number;
  jobsAwaitingPayout: number;
  failedPayouts: number;
  totalOutstandingDebt: number;
  uniqueEmployersWithDebt: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    pendingKYC: 0,
    jobsAwaitingPayout: 0,
    failedPayouts: 0,
    totalOutstandingDebt: 0,
    uniqueEmployersWithDebt: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchStats();
  }, [router]);

  const fetchStats = async () => {
    try {
      setError(null);
      setLoading(true);
      const [paymentSummary, kycList] = await Promise.all([
        getPaymentSummary(),
        getKYCReviewList({ page: 1, limit: 1 }),
      ]);

      const paymentData = paymentSummary as any;
      const kycData = kycList as any;

      setStats({
        pendingKYC: kycData.total || 0,
        jobsAwaitingPayout: paymentData.summary?.jobsAwaitingPayout || 0,
        failedPayouts: paymentData.summary?.failedPayoutsCount || 0,
        totalOutstandingDebt: paymentData.summary?.employerDebt?.totalOutstanding || 0,
        uniqueEmployersWithDebt: paymentData.summary?.employerDebt?.uniqueEmployers || 0,
      });
    } catch (error: any) {
      console.error('Failed to fetch stats:', error);
      setError(error.responseMessage || error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Hirearn Administration Panel</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6">
            <Alert type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {[...Array(5)].map((_, i) => (
                <SkeletonLoader key={i} className="h-24" />
              ))}
            </div>
            <SkeletonLoader className="h-96" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Pending KYC"
            value={stats.pendingKYC}
            icon="📋"
            color="bg-yellow-500"
            href="/admin/kyc-review"
          />
          <StatCard
            title="Jobs Awaiting Payout"
            value={stats.jobsAwaitingPayout}
            icon="💰"
            color="bg-blue-500"
            href="/admin/payments"
          />
          <StatCard
            title="Failed Payouts"
            value={stats.failedPayouts}
            icon="⚠️"
            color="bg-red-500"
            href="/admin/payments"
          />
          <StatCard
            title="Outstanding Debt"
            value={`₹${(stats.totalOutstandingDebt / 100).toLocaleString()}`}
            icon="💳"
            color="bg-orange-500"
            href="/admin/payments"
          />
          <StatCard
            title="Employers with Debt"
            value={stats.uniqueEmployersWithDebt}
            icon="🏢"
            color="bg-purple-500"
            href="/admin/payments"
          />
        </div>

            {/* Quick Actions */}
            <div className="bg-white shadow-lg rounded-xl p-8 border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-1 h-8 bg-primary rounded-full mr-3"></div>
                <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ActionCard
              title="KYC Review"
              description="Review and approve pending KYC verifications"
              icon="📋"
              href="/admin/kyc-review"
            />
            <ActionCard
              title="User Management"
              description="Manage users, suspend, activate, or put on hold"
              icon="👥"
              href="/admin/users"
            />
            <ActionCard
              title="Payment Management"
              description="Monitor payments, payouts, and settlements"
              icon="💳"
              href="/admin/payments"
            />
            <ActionCard
              title="Dispute Management"
              description="Handle disputes between workers and employers"
              icon="⚖️"
              href="/admin/disputes"
            />
            <ActionCard
              title="Withdrawal Processing"
              description="Process worker withdrawal requests"
              icon="💸"
              href="/admin/withdrawals"
            />
            <ActionCard
              title="Refund Management"
              description="Manage employer refund requests"
              icon="↩️"
              href="/admin/refunds"
            />
            <ActionCard
              title="Settlement Monitor"
              description="Monitor and retry failed settlements"
              icon="🔄"
              href="/admin/settlements"
            />
            <ActionCard
              title="Audit Logs"
              description="Track all admin actions"
              icon="📊"
              href="/admin/audit"
            />
            <ActionCard
              title="Job Audit"
              description="View job audit timeline"
              icon="📅"
              href="/admin/job-audit"
              />
            <ActionCard
              title="Extended Dashboard"
              description="Real-time operational KPIs and analytics"
              icon="📊"
              href="/admin/analytics"
              />
            </div>
          </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color, href }: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  href: string;
}) {
  return (
    <Link 
      href={href} 
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 p-6 border border-gray-100 hover:border-primary/20 group"
    >
      <div className="flex items-center">
        <div className={`${color} rounded-xl p-4 text-white text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
      </div>
    </Link>
  );
}

function ActionCard({ title, description, icon, href }: {
  title: string;
  description: string;
  icon: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block p-6 border-2 border-gray-200 rounded-xl hover:border-primary hover:shadow-lg transition-all duration-200 bg-white hover:bg-gray-50 group"
    >
      <div className="flex items-start">
        <div className="text-4xl mr-4 group-hover:scale-110 transition-transform">{icon}</div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        </div>
        <span className="text-gray-400 group-hover:text-primary transition-colors">→</span>
      </div>
    </Link>
  );
}
