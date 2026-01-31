'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getOverviewAnalytics,
  getPaymentsHealthAnalytics,
  getWalletHealthAnalytics,
  getJobExecutionAnalytics,
  getSettlementsAnalytics,
  getIncidentsAnalytics,
  type OverviewAnalytics,
  type PaymentsHealthAnalytics,
  type WalletHealthAnalytics,
  type JobExecutionAnalytics,
  type SettlementsAnalytics,
  type IncidentsAnalytics,
} from '@/lib/api/admin';
import { isAuthenticated, logout } from '@/lib/api/auth';
import LoadingSpinner, { SkeletonLoader } from '@/components/LoadingSpinner';
import Alert from '@/components/Alert';
import { JobTimelineViewer, JobsDetailedView, ProtectionPoolView } from './enhanced';

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [overview, setOverview] = useState<OverviewAnalytics | null>(null);
  const [paymentsHealth, setPaymentsHealth] = useState<PaymentsHealthAnalytics | null>(null);
  const [walletHealth, setWalletHealth] = useState<WalletHealthAnalytics | null>(null);
  const [jobExecution, setJobExecution] = useState<JobExecutionAnalytics | null>(null);
  const [settlements, setSettlements] = useState<SettlementsAnalytics | null>(null);
  const [incidents, setIncidents] = useState<IncidentsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchAllData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchAllData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [router]);

  const fetchAllData = async () => {
    try {
      setError(null);
      const [
        overviewRes,
        paymentsRes,
        walletRes,
        jobRes,
        settlementsRes,
        incidentsRes,
      ] = await Promise.all([
        getOverviewAnalytics(),
        getPaymentsHealthAnalytics(),
        getWalletHealthAnalytics(),
        getJobExecutionAnalytics(),
        getSettlementsAnalytics(),
        getIncidentsAnalytics(),
      ]);

      setOverview(overviewRes.data);
      setPaymentsHealth(paymentsRes.data);
      setWalletHealth(walletRes.data);
      setJobExecution(jobRes.data);
      setSettlements(settlementsRes.data);
      setIncidents(incidentsRes.data);
      setLastRefresh(new Date());
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
      setError(error.responseMessage || error.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const getStatusColor = (value: number, threshold: number, type: 'higher' | 'lower' = 'higher') => {
    if (type === 'higher') {
      return value >= threshold ? 'bg-red-500' : value >= threshold * 0.5 ? 'bg-yellow-500' : 'bg-green-500';
    } else {
      return value <= threshold ? 'bg-green-500' : value <= threshold * 1.5 ? 'bg-yellow-500' : 'bg-red-500';
    }
  };

  if (loading && !overview) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SkeletonLoader className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Extended Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                Real-time operational KPIs • Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={fetchAllData}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Refresh
              </button>
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Dashboard
              </Link>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
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

        {/* SECTION 1: Money Health (P0) */}
        <section className="mb-8">
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Money Health (P0)</h2>
            
            {paymentsHealth ? (
              <div className="space-y-6">
                {/* Payment Status Breakdown */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Payment Status Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600">Completed Today</p>
                      <p className="text-2xl font-bold text-green-700">{paymentsHealth.paymentsCompletedToday}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${
                      paymentsHealth.paymentsPending > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                    }`}>
                      <p className="text-sm text-gray-600">Pending (All)</p>
                      <p className={`text-2xl font-bold ${
                        paymentsHealth.paymentsPending > 0 ? 'text-red-700' : 'text-green-700'
                      }`}>
                        {paymentsHealth.paymentsPending}
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg border ${
                      paymentsHealth.paymentsPendingOver15Min > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                    }`}>
                      <p className="text-sm text-gray-600">Pending &gt;15min</p>
                      <p className={`text-2xl font-bold ${
                        paymentsHealth.paymentsPendingOver15Min > 0 ? 'text-red-700' : 'text-green-700'
                      }`}>
                        {paymentsHealth.paymentsPendingOver15Min}
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg border ${
                      paymentsHealth.paymentsFailed > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                    }`}>
                      <p className="text-sm text-gray-600">Failed Today</p>
                      <p className={`text-2xl font-bold ${
                        paymentsHealth.paymentsFailed > 0 ? 'text-red-700' : 'text-green-700'
                      }`}>
                        {paymentsHealth.paymentsFailed}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Oldest Pending Payment */}
                {paymentsHealth.oldestPendingPaymentAgeMinutes !== null && (
                  <div className={`p-4 rounded-lg border ${
                    paymentsHealth.oldestPendingPaymentAgeMinutes > 15
                      ? 'bg-red-100 border-red-300'
                      : paymentsHealth.oldestPendingPaymentAgeMinutes > 5
                      ? 'bg-yellow-100 border-yellow-300'
                      : 'bg-green-100 border-green-300'
                  }`}>
                    <p className="text-sm font-medium text-gray-700 mb-1">Oldest Pending Payment</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {paymentsHealth.oldestPendingPaymentAgeMinutes} minutes
                    </p>
                    {paymentsHealth.oldestPendingPaymentAgeMinutes > 15 && (
                      <p className="text-sm text-red-700 mt-2">⚠️ Action Required: Investigate payment delays</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <SkeletonLoader className="h-48" />
            )}
          </div>
        </section>

        {/* SECTION 2: Revenue Reality */}
        <section className="mb-8">
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Revenue Reality</h2>
            
            {overview ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600">Gross Job Value</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(overview.grossJobValueToday)}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-sm text-gray-600">Platform Fee</p>
                    <p className="text-2xl font-bold text-purple-700">{formatCurrency(overview.platformFeeToday)}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <p className="text-sm text-gray-600">Gateway Fees</p>
                    <p className="text-2xl font-bold text-orange-700">{formatCurrency(overview.gatewayFeesToday)}</p>
                  </div>
                  <div className={`p-4 rounded-lg border ${
                    overview.netPlatformRevenueToday > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <p className="text-sm text-gray-600">Net Revenue</p>
                    <p className={`text-2xl font-bold ${
                      overview.netPlatformRevenueToday > 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {formatCurrency(overview.netPlatformRevenueToday)}
                    </p>
                  </div>
                </div>

                {/* Simple Bar Chart */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Revenue Breakdown</h3>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Gross Job Value</span>
                        <span>{formatCurrency(overview.grossJobValueToday)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-blue-500 h-4 rounded-full"
                          style={{ width: '100%' }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Platform Fee (7%)</span>
                        <span>{formatCurrency(overview.platformFeeToday)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-purple-500 h-4 rounded-full"
                          style={{
                            width: overview.grossJobValueToday > 0
                              ? `${(overview.platformFeeToday / overview.grossJobValueToday) * 100}%`
                              : '0%',
                          }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Gateway Fees (~2%)</span>
                        <span>{formatCurrency(overview.gatewayFeesToday)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-orange-500 h-4 rounded-full"
                          style={{
                            width: overview.grossJobValueToday > 0
                              ? `${(overview.gatewayFeesToday / overview.grossJobValueToday) * 100}%`
                              : '0%',
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <SkeletonLoader className="h-48" />
            )}
          </div>
        </section>

        {/* SECTION 3: Job Execution Health */}
        <section className="mb-8">
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Job Execution Health</h2>
            
            {jobExecution ? (
              <div className="space-y-6">
                {/* Jobs Lifecycle Funnel */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Jobs Lifecycle</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-600">Created Today</p>
                      <p className="text-2xl font-bold text-blue-700">{overview?.jobsCreatedToday || 0}</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <p className="text-sm text-gray-600">In Progress</p>
                      <p className="text-2xl font-bold text-yellow-700">{jobExecution.jobsInProgress}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600">Completed Today</p>
                      <p className="text-2xl font-bold text-green-700">{overview?.jobsCompletedToday || 0}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <p className="text-sm text-gray-600">Cancelled/Expired</p>
                      <p className="text-2xl font-bold text-red-700">{overview?.jobsCancelledOrExpiredToday || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Attendance Reliability */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Attendance Reliability</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600">Expected Check-ins</p>
                      <p className="text-2xl font-bold text-gray-700">{jobExecution.expectedCheckinsToday}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${
                      jobExecution.actualCheckinsToday < jobExecution.expectedCheckinsToday * 0.8
                        ? 'bg-red-50 border-red-200'
                        : 'bg-green-50 border-green-200'
                    }`}>
                      <p className="text-sm text-gray-600">Actual Check-ins</p>
                      <p className={`text-2xl font-bold ${
                        jobExecution.actualCheckinsToday < jobExecution.expectedCheckinsToday * 0.8
                          ? 'text-red-700'
                          : 'text-green-700'
                      }`}>
                        {jobExecution.actualCheckinsToday}
                      </p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <p className="text-sm text-gray-600">Auto Checkouts</p>
                      <p className="text-2xl font-bold text-orange-700">{jobExecution.autoCheckoutsToday}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${
                      jobExecution.noShowsToday > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                    }`}>
                      <p className="text-sm text-gray-600">No-Shows</p>
                      <p className={`text-2xl font-bold ${
                        jobExecution.noShowsToday > 0 ? 'text-red-700' : 'text-green-700'
                      }`}>
                        {jobExecution.noShowsToday}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <SkeletonLoader className="h-48" />
            )}
          </div>
        </section>

        {/* SECTION 4: Settlement & Payout Health */}
        <section className="mb-8">
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Settlement & Payout Health</h2>
            
            {settlements ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">Eligible for Settlement</p>
                  <p className="text-2xl font-bold text-gray-700">{settlements.jobsEligibleForSettlement}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600">Settled Today</p>
                  <p className="text-2xl font-bold text-green-700">{settlements.jobsSettledToday}</p>
                </div>
                <div className={`p-4 rounded-lg border ${
                  settlements.settlementsPendingOver24h > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                }`}>
                  <p className="text-sm text-gray-600">Pending &gt;24h</p>
                  <p className={`text-2xl font-bold ${
                    settlements.settlementsPendingOver24h > 0 ? 'text-red-700' : 'text-green-700'
                  }`}>
                    {settlements.settlementsPendingOver24h}
                  </p>
                  {settlements.settlementsPendingOver24h > 0 && (
                    <p className="text-xs text-red-600 mt-1">⚠️ Action Required</p>
                  )}
                </div>
                <div className={`p-4 rounded-lg border ${
                  settlements.payoutFailuresToday > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                }`}>
                  <p className="text-sm text-gray-600">Payout Failures</p>
                  <p className={`text-2xl font-bold ${
                    settlements.payoutFailuresToday > 0 ? 'text-red-700' : 'text-green-700'
                  }`}>
                    {settlements.payoutFailuresToday}
                  </p>
                </div>
              </div>
            ) : (
              <SkeletonLoader className="h-48" />
            )}
          </div>
        </section>

        {/* SECTION 5: Trust & Intervention */}
        <section className="mb-8">
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Trust & Intervention</h2>
            
            {incidents ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-lg border ${
                    incidents.paymentIssuesToday > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                  }`}>
                    <p className="text-sm text-gray-600">Payment Issues</p>
                    <p className={`text-2xl font-bold ${
                      incidents.paymentIssuesToday > 0 ? 'text-red-700' : 'text-green-700'
                    }`}>
                      {incidents.paymentIssuesToday}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg border ${
                    incidents.settlementIssuesToday > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                  }`}>
                    <p className="text-sm text-gray-600">Settlement Issues</p>
                    <p className={`text-2xl font-bold ${
                      incidents.settlementIssuesToday > 0 ? 'text-red-700' : 'text-green-700'
                    }`}>
                      {incidents.settlementIssuesToday}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600">Manual Interventions</p>
                    <p className="text-2xl font-bold text-blue-700">{incidents.manualInterventionsToday}</p>
                  </div>
                  <div className={`p-4 rounded-lg border ${
                    incidents.unresolvedIncidentsCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                  }`}>
                    <p className="text-sm text-gray-600">Unresolved</p>
                    <p className={`text-2xl font-bold ${
                      incidents.unresolvedIncidentsCount > 0 ? 'text-red-700' : 'text-green-700'
                    }`}>
                      {incidents.unresolvedIncidentsCount}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <SkeletonLoader className="h-48" />
            )}
          </div>
        </section>

        {/* Enhanced Analytics Sections */}
        <section className="mb-8">
          <JobTimelineViewer />
        </section>

        <section className="mb-8">
          <JobsDetailedView />
        </section>

        <section className="mb-8">
          <ProtectionPoolView />
        </section>
      </main>
    </div>
  );
}
