'use client';

import { useState, useEffect } from 'react';
import {
  getJobTimeline,
  getJobsDetailed,
  getPaymentsDetailed,
  getProtectionPoolAnalytics,
  type JobTimeline,
  type JobsDetailed,
  type PaymentsDetailed,
  type ProtectionPoolAnalytics,
} from '@/lib/api/admin';
import LoadingSpinner, { SkeletonLoader } from '@/components/LoadingSpinner';
import Alert from '@/components/Alert';

/**
 * Enhanced Analytics Components
 * 
 * These components provide in-depth analysis including:
 * - Job timelines with audit logs
 * - Status change tracking
 * - Detailed payment flows
 * - Time-series trends
 */

export function JobTimelineViewer() {
  const [jobId, setJobId] = useState('');
  const [timeline, setTimeline] = useState<JobTimeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = async () => {
    if (!jobId.trim()) {
      setError('Please enter a job ID');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const response = await getJobTimeline(jobId.trim());
      setTimeline(response.data);
    } catch (err: any) {
      setError(err.responseMessage || err.message || 'Failed to fetch job timeline');
      setTimeline(null);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'JOB_CREATED': return '📝';
      case 'PAYMENT': return '💳';
      case 'SETTLEMENT_ATTEMPT': return '💰';
      case 'CHECK_IN': return '✅';
      case 'CHECK_OUT': return '🏁';
      case 'AUDIT_LOG': return '📋';
      case 'MONEY_AUDIT': return '💵';
      default: return '📌';
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Job Timeline & Audit Log</h2>

      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            placeholder="Enter Job ID"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && fetchTimeline()}
          />
          <button
            onClick={fetchTimeline}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'View Timeline'}
          </button>
        </div>
        {error && (
          <div className="mt-2">
            <Alert type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}
      </div>

      {loading && <SkeletonLoader className="h-96" />}

      {timeline && (
        <div className="space-y-6">
          {/* Job Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{timeline.job.title}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Employer</p>
                <p className="font-medium">{timeline.job.employer?.fullName || timeline.job.employer?.phoneNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <p className="font-medium">{timeline.job.currentStatus.status}</p>
              </div>
              <div>
                <p className="text-gray-600">Payment Status</p>
                <p className="font-medium">{timeline.job.currentStatus.paymentStatus}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Events</p>
                <p className="font-medium">{timeline.summary.totalEvents}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
            <div className="space-y-4">
              {timeline.timeline.map((event, index) => (
                <div key={index} className="relative pl-12">
                  <div className="absolute left-2 w-6 h-6 bg-white border-2 border-blue-500 rounded-full flex items-center justify-center text-xs">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{event.type.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-500">{formatTimestamp(event.timestamp)}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700">
                      {event.type === 'PAYMENT' && (
                        <div>
                          <p>Type: {event.details.paymentType}</p>
                          <p>Amount: ₹{(event.details.amount / 100).toLocaleString()}</p>
                          <p>Status: {event.details.status}</p>
                        </div>
                      )}
                      {event.type === 'SETTLEMENT_ATTEMPT' && (
                        <div>
                          <p>Status: {event.details.status}</p>
                          <p>Triggered By: {event.details.triggeredBy}</p>
                          {event.details.error && (
                            <p className="text-red-600">Error: {event.details.error}</p>
                          )}
                        </div>
                      )}
                      {event.type === 'CHECK_IN' && (
                        <div>
                          <p>Worker: {event.details.worker?.fullName || event.details.worker?.phoneNumber || 'N/A'}</p>
                          <p>Day: {event.details.dayIndex}</p>
                        </div>
                      )}
                      {event.type === 'CHECK_OUT' && (
                        <div>
                          <p>Worker: {event.details.worker?.fullName || event.details.worker?.phoneNumber || 'N/A'}</p>
                          <p>Day: {event.details.dayIndex}</p>
                          <p>Payable: ₹{(event.details.payableAmount / 100).toLocaleString()}</p>
                          <p>Worked: {event.details.workedMinutes} minutes</p>
                        </div>
                      )}
                      {event.details.reason && (
                        <p className="mt-2 text-gray-600">Reason: {event.details.reason}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function JobsDetailedView() {
  const [data, setData] = useState<JobsDetailed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await getJobsDetailed();
      setData(response.data);
    } catch (err: any) {
      setError(err.responseMessage || err.message || 'Failed to fetch detailed jobs data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <SkeletonLoader className="h-96" />;
  if (error) return <Alert type="error" message={error} onClose={() => setError(null)} />;
  if (!data) return null;

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Jobs Detailed Analysis</h2>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600">Total Jobs</p>
          <p className="text-2xl font-bold text-blue-700">{data.summary.totalJobs}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-gray-600">Total Amount</p>
          <p className="text-2xl font-bold text-green-700">₹{(data.summary.totalAmount / 100).toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-gray-600">Total Workers</p>
          <p className="text-2xl font-bold text-purple-700">{data.summary.totalWorkers}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-sm text-gray-600">Jobs with Issues</p>
          <p className="text-2xl font-bold text-red-700">{data.summary.jobsWithIssuesCount}</p>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Status Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.breakdown.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3 text-sm">{item._id.status}</td>
                  <td className="px-4 py-3 text-sm">{item._id.paymentStatus}</td>
                  <td className="px-4 py-3 text-sm">{item._id.jobType}</td>
                  <td className="px-4 py-3 text-sm text-right">{item.count}</td>
                  <td className="px-4 py-3 text-sm text-right">₹{(item.totalAmount / 100).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Jobs with Issues */}
      {data.jobsWithIssues.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-red-700">⚠️ Jobs with Payment Issues</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Job Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Employer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-red-700 uppercase">Days Since Completion</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-red-700 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.jobsWithIssues.map((job) => (
                  <tr key={job._id}>
                    <td className="px-4 py-3 text-sm">{job.title}</td>
                    <td className="px-4 py-3 text-sm">{job.employer?.fullName || job.employer?.phoneNumber || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{job.paymentStatus}</td>
                    <td className="px-4 py-3 text-sm text-right">{Math.round(job.daysSinceCompletion)} days</td>
                    <td className="px-4 py-3 text-sm text-right">₹{(job.totalAmount / 100).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProtectionPoolView() {
  const [data, setData] = useState<ProtectionPoolAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await getProtectionPoolAnalytics();
      setData(response.data);
    } catch (err: any) {
      setError(err.responseMessage || err.message || 'Failed to fetch protection pool data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'bg-red-100 border-red-300 text-red-700';
      case 'LOW': return 'bg-yellow-100 border-yellow-300 text-yellow-700';
      case 'HEALTHY': return 'bg-green-100 border-green-300 text-green-700';
      default: return 'bg-gray-100 border-gray-300 text-gray-700';
    }
  };

  if (loading) return <SkeletonLoader className="h-96" />;
  if (error) return <Alert type="error" message={error} onClose={() => setError(null)} />;
  if (!data) return null;

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Protection Pool Analytics</h2>
        <button
          onClick={fetchData}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Health Status */}
      <div className={`p-4 rounded-lg border mb-6 ${getHealthColor(data.health.status)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-lg mb-1">Pool Health: {data.health.status}</p>
            <p className="text-sm">{data.health.message}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{formatCurrency(data.current.balance)}</p>
            <p className="text-sm">Current Balance</p>
          </div>
        </div>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600">Total Contributions</p>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(data.current.totalContributions)}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <p className="text-sm text-gray-600">Total Payouts</p>
          <p className="text-2xl font-bold text-orange-700">{formatCurrency(data.current.totalPayouts)}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-gray-600">Net Value</p>
          <p className="text-2xl font-bold text-purple-700">{formatCurrency(data.current.netValue)}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Protection Cap/Job</p>
          <p className="text-2xl font-bold text-gray-700">{formatCurrency(data.current.protectionCapPerJob)}</p>
        </div>
      </div>

      {/* Today's Activity */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Today&apos;s Activity</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <p className="text-xs text-gray-600">Contributions</p>
            <p className="text-xl font-bold text-green-700">{formatCurrency(data.today.contributions)}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <p className="text-xs text-gray-600">Payouts</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(data.today.payouts)}</p>
          </div>
          <div className={`p-3 rounded-lg border ${data.today.netChange >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
            <p className="text-xs text-gray-600">Net Change</p>
            <p className={`text-xl font-bold ${data.today.netChange >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
              {formatCurrency(data.today.netChange)}
            </p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-xs text-gray-600">Jobs Contributing</p>
            <p className="text-xl font-bold text-blue-700">{data.today.jobsContributing}</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <p className="text-xs text-gray-600">Jobs Paid</p>
            <p className="text-xl font-bold text-orange-700">{data.today.jobsPaidFromPool}</p>
          </div>
        </div>
      </div>

      {/* Coverage Stats */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Coverage Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600">Jobs Covered</p>
            <p className="text-xl font-bold text-gray-700">{data.coverage.jobsCoveredCount}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600">Total Covered</p>
            <p className="text-xl font-bold text-gray-700">{formatCurrency(data.coverage.totalCoveredAmount)}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <p className="text-xs text-gray-600">Unpaid Debts</p>
            <p className="text-xl font-bold text-red-700">{data.coverage.employerDebtsCount}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <p className="text-xs text-gray-600">Total Unpaid</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(data.coverage.totalUnpaidDebt)}</p>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <p className="text-xs text-gray-600">Eligible Jobs</p>
            <p className="text-xl font-bold text-yellow-700">{data.coverage.eligibleJobsCount}</p>
          </div>
        </div>
      </div>

      {/* Health Metrics */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Health Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600">Avg Job Amount</p>
            <p className="text-xl font-bold text-gray-700">{formatCurrency(data.health.avgJobAmount)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600">Coverage Capacity</p>
            <p className="text-xl font-bold text-gray-700">{data.health.estimatedCoverageCapacity} jobs</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600">Utilization Rate</p>
            <p className="text-xl font-bold text-gray-700">{data.health.utilizationRate.toFixed(1)}%</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600">Last Updated</p>
            <p className="text-sm font-medium text-gray-700">
              {new Date(data.current.lastUpdated).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Daily Tracking Table */}
      {data.dailyTracking.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Daily Tracking (Last 30 Days)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Contributions</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Payouts</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Change</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jobs Contributing</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jobs Paid</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.dailyTracking.slice(-30).reverse().map((day, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm">{day.date}</td>
                    <td className="px-4 py-3 text-sm text-right text-green-700">{formatCurrency(day.contributions)}</td>
                    <td className="px-4 py-3 text-sm text-right text-red-700">{formatCurrency(day.payouts)}</td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${day.netChange >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                      {formatCurrency(day.netChange)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">{day.jobsContributing}</td>
                    <td className="px-4 py-3 text-sm text-right">{day.jobsPaidFromPool}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Jobs Covered by Pool */}
      {data.jobsCovered.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Recent Jobs Covered by Pool</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employer</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.jobsCovered.slice(0, 20).map((job) => (
                  <tr key={job.id}>
                    <td className="px-4 py-3 text-sm">{job.title}</td>
                    <td className="px-4 py-3 text-sm">{job.employer?.fullName || job.employer?.phoneNumber || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(job.amount)}</td>
                    <td className="px-4 py-3 text-sm">
                      {job.paidAt ? new Date(job.paidAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employer Debts */}
      {data.employerDebts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-red-700">⚠️ Unpaid Employer Debts</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Employer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Job</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-red-700 uppercase">Total Debt</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-red-700 uppercase">Paid</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-red-700 uppercase">Remaining</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.employerDebts.map((debt) => (
                  <tr key={debt.id}>
                    <td className="px-4 py-3 text-sm">{debt.employer?.fullName || debt.employer?.phoneNumber || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{debt.job?.title || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(debt.amount)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(debt.amountPaid)}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-red-700">{formatCurrency(debt.remaining)}</td>
                    <td className="px-4 py-3 text-sm">{debt.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
