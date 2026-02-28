// Admin API functions - reused from mobile app logic
import request, { normalizeApiResponse } from './client';

// ------------------------------
// Types
// ------------------------------
export interface User {
  id: string;
  phoneNumber: string;
  fullName?: string;
  email?: string;
  role: "worker" | "employer" | "admin";
  isPhoneVerified: boolean;
  isProfileComplete: boolean;
  avatarUrl?: string;
  [key: string]: any;
}

export interface AdminUser extends User {
  state: 'ACTIVE' | 'KYC_PENDING' | 'ON_HOLD' | 'SUSPENDED';
  isIdentityVerified?: boolean;
  identityDocuments?: {
    verificationStatus?: 'pending' | 'approved' | 'rejected';
    aadhaarFront?: string;
    aadhaarBack?: string;
    selfie?: string;
    panCard?: string;
  };
  walletBalance?: number;
  walletFrozen?: boolean;
}

export interface PaymentSummary {
  jobsAwaitingPayout: number;
  failedPayoutsCount: number;
  employerDebt: {
    totalOutstanding: number;
    totalDebtAmount: number;
    totalPaidFromPool: number;
    uniqueEmployers: number;
    totalDebts: number;
  };
}

export interface Dispute {
  id: string;
  job: string | any;
  raisedBy: string | User;
  category: 'payment_issue' | 'attendance_dispute' | 'job_not_completed' | 'quality_issue' | 'safety_concern' | 'other';
  description?: string;
  status: 'pending' | 'in_review' | 'resolved' | 'dismissed';
  adminNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementAttempt {
  id: string;
  job: {
    id: string;
    title: string;
    status: string;
    paymentStatus: string;
    payoutMode: string;
  };
  triggeredBy: 'CRON' | 'MANUAL' | 'ADMIN';
  status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
  reason?: string;
  error?: string;
  createdAt: string;
}

export interface AdminActionLog {
  id: string;
  adminId: {
    id: string;
    fullName?: string;
    phoneNumber: string;
  };
  actionType: 'KYC_APPROVE' | 'KYC_REJECT' | 'DISPUTE_RESOLVE' | 'PAYOUT_PROCESS' | 'WALLET_FREEZE' | 'WALLET_UNFREEZE' | 'USER_SUSPEND' | 'USER_ACTIVATE' | 'USER_ON_HOLD' | 'SETTLEMENT_RETRY' | 'WITHDRAWAL_PROCESS' | 'WITHDRAWAL_REJECT';
  entityType: 'USER' | 'JOB' | 'PAYOUT' | 'WITHDRAWAL' | 'SETTLEMENT' | 'DISPUTE';
  entityId: string;
  reason: string;
  metadata?: any;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: {
    id: string;
    fullName?: string;
    phoneNumber: string;
    walletBalance: number;
    walletFrozen: boolean;
    isIdentityVerified?: boolean;
    identityDocuments?: {
      verificationStatus?: 'pending' | 'approved' | 'rejected';
      aadhaarFront?: string;
      aadhaarBack?: string;
      selfie?: string;
      panCard?: string;
    };
  };
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'REJECTED';
  bankSnapshot: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  requestedAt: string;
  processedAt?: string;
  processedBy?: {
    id: string;
    fullName?: string;
  };
  payoutReferenceId?: string;
  rejectionReason?: string;
}

export interface RefundRequest {
  id: string;
  job: {
    id: string;
    title: string;
    date: string;
    status: string;
  };
  employer: {
    id: string;
    fullName?: string;
    phoneNumber: string;
  };
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PAID';
  amountRequested?: number;
  submittedAt: string;
}

// ------------------------------
// Authentication APIs
// ------------------------------
export interface VerifyOtpResponse {
  success: boolean;
  message?: string;
  token: string;
  user: {
    id: string;
    phoneNumber: string;
    role?: string | null;
    isPhoneVerified: boolean;
    isProfileComplete: boolean;
    isAdmin?: boolean;
    state?: string;
    [key: string]: any;
  };
}

export const sendOtp = (phoneNumber: string) =>
  request<{ success: boolean; message: string; phoneNumber: string }>("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ phoneNumber }),
  });

export const verifyOtp = async (
  phoneNumber: string,
  otp: string
) => {
  const response = await request<VerifyOtpResponse>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({
      phoneNumber,
      otp,
    }),
  });
  if (response.token) {
    const { setToken } = await import('./client');
    setToken(response.token);
  }
  return response;
};

export const getCurrentUser = async () => {
  const response = await request<any>("/users/profile");
  return normalizeApiResponse(response.user || response);
};

// ------------------------------
// Admin User APIs
// ------------------------------
export const getKYCReviewList = async (params?: {
  page?: number;
  limit?: number;
  state?: 'ACTIVE' | 'KYC_PENDING' | 'ON_HOLD' | 'SUSPENDED' | 'all';
}) => {
  const queryString = params
    ? "?" +
    Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== 'all')
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&")
    : "";
  const response = await request<{ users: AdminUser[]; totalPages: number; currentPage: number; total: number }>(
    `/admin/kyc-review${queryString}`
  );
  // Normalize user IDs (_id to id)
  if (response.users) {
    response.users = response.users.map(user => normalizeApiResponse(user));
  }
  return response;
};

export const getUserList = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'worker' | 'employer' | 'admin' | 'all';
  state?: 'ACTIVE' | 'KYC_PENDING' | 'ON_HOLD' | 'SUSPENDED' | 'all';
}) => {
  const queryString = params
    ? "?" +
    Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== 'all')
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&")
    : "";
  const response = await request<{ users: AdminUser[]; totalPages: number; currentPage: number; total: number }>(
    `/admin/users${queryString}`
  );
  // Normalize user IDs (_id to id)
  if (response.users) {
    response.users = response.users.map(user => normalizeApiResponse(user));
  }
  return response;
};

export const getAdminUserDetail = async (id: string) => {
  const response = await request<{ user: AdminUser }>(`/admin/users/${id}`);
  // Normalize user ID (_id to id)
  if (response.user) {
    response.user = normalizeApiResponse(response.user);
  }
  return response;
};

export const approveKYC = (id: string, reason: string) =>
  request(`/admin/users/${id}/approve-kyc`, {
    method: "PUT",
    body: JSON.stringify({ reason }),
  });

export const rejectKYC = (id: string, reason: string) =>
  request(`/admin/users/${id}/reject-kyc`, {
    method: "PUT",
    body: JSON.stringify({ reason }),
  });

export const putUserOnHold = (id: string, reason: string) =>
  request(`/admin/users/${id}/on-hold`, {
    method: "PUT",
    body: JSON.stringify({ reason }),
  });

export const suspendUser = (id: string, reason: string) =>
  request(`/admin/users/${id}/suspend`, {
    method: "PUT",
    body: JSON.stringify({ reason }),
  });

export const activateUser = (id: string, reason: string) =>
  request(`/admin/users/${id}/activate`, {
    method: "PUT",
    body: JSON.stringify({ reason }),
  });

export const freezeWallet = (userId: string, reason: string) =>
  request<{ success: boolean; message: string }>(`/admin/users/${userId}/wallet/freeze`, {
    method: "PUT",
    body: JSON.stringify({ reason }),
  });

export const unfreezeWallet = (userId: string, reason: string) =>
  request<{ success: boolean; message: string }>(`/admin/users/${userId}/wallet/unfreeze`, {
    method: "PUT",
    body: JSON.stringify({ reason }),
  });

// ------------------------------
// Admin Payment APIs
// ------------------------------
export const getPaymentSummary = () =>
  request<{ summary: PaymentSummary }>('/admin/payments/summary');

// ------------------------------
// Dispute APIs
// ------------------------------
export const getDisputes = (params?: {
  status?: Dispute['status'];
  jobId?: string;
  page?: number;
  limit?: number;
}) => {
  const queryString = params
    ? "?" +
    Object.entries(params)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&")
    : "";
  return request<{ disputes: Dispute[]; totalPages: number; currentPage: number; total: number }>(
    `/disputes${queryString}`
  );
};

export const getDispute = (id: string) =>
  request<{ dispute: Dispute }>(`/disputes/${id}`);

export const updateDispute = (id: string, data: {
  status?: Dispute['status'];
  adminNotes?: string;
}) =>
  request<{ dispute: Dispute }>(`/disputes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

// ------------------------------
// Admin Settlement APIs
// ------------------------------
export const getSettlements = (params?: {
  page?: number;
  limit?: number;
  status?: 'SUCCESS' | 'SKIPPED' | 'FAILED';
  triggeredBy?: 'CRON' | 'MANUAL' | 'ADMIN';
  jobId?: string;
}) => {
  const queryString = params
    ? "?" +
    Object.entries(params)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&")
    : "";
  return request<{ settlements: SettlementAttempt[]; totalPages: number; currentPage: number; total: number }>(
    `/admin/settlements${queryString}`
  );
};

export const retrySettlement = (jobId: string, reason: string) =>
  request<{ success: boolean; message: string }>(`/admin/settlements/${jobId}/retry`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

// ------------------------------
// Admin Audit Log APIs
// ------------------------------
export const getAuditLog = (params?: {
  page?: number;
  limit?: number;
  adminId?: string;
  actionType?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const queryString = params
    ? "?" +
    Object.entries(params)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&")
    : "";
  return request<{ logs: AdminActionLog[]; totalPages: number; currentPage: number; total: number }>(
    `/admin/audit${queryString}`
  );
};

// ------------------------------
// Admin Withdrawal APIs
// ------------------------------
export const getWithdrawals = (params?: {
  page?: number;
  limit?: number;
  status?: 'PENDING' | 'PROCESSING' | 'PAID' | 'REJECTED';
  userId?: string;
}) => {
  const queryString = params
    ? "?" +
    Object.entries(params)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&")
    : "";
  return request<{ withdrawals: WithdrawalRequest[]; totalPages: number; currentPage: number; total: number }>(
    `/admin/withdrawals${queryString}`
  );
};

export const processWithdrawal = (id: string, payoutReferenceId: string) =>
  request<{ success: boolean; message: string }>(`/admin/withdrawals/${id}/process`, {
    method: "POST",
    body: JSON.stringify({ payoutReferenceId }),
  });

export const rejectWithdrawal = (id: string, reason: string) =>
  request<{ success: boolean; message: string }>(`/admin/withdrawals/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

// ------------------------------
// Admin Refund APIs
// ------------------------------
export const getRefundRequests = (params?: {
  page?: number;
  limit?: number;
  status?: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PAID';
  jobId?: string;
  employerId?: string;
}) => {
  const queryString = params
    ? "?" +
    Object.entries(params)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&")
    : "";
  return request<{ refunds: RefundRequest[]; totalPages: number; currentPage: number; total: number }>(
    `/admin/refunds${queryString}`
  );
};

// ------------------------------
// Presigned URL for viewing documents
// ------------------------------
export const getPresignedViewUrl = async (s3Url: string): Promise<string> => {
  const response = await request<{ success: boolean; signedUrl: string; key?: string }>('/uploads/presign-view', {
    method: 'POST',
    body: JSON.stringify({ s3Url }),
  });
  
  if (!response.success || !response.signedUrl) {
    throw new Error('Failed to get presigned URL');
  }
  
  return response.signedUrl;
};

// ------------------------------
// Admin Analytics APIs
// ------------------------------
export interface OverviewAnalytics {
  jobsCreatedToday: number;
  jobsCompletedToday: number;
  jobsCancelledOrExpiredToday: number;
  grossJobValueToday: number;
  platformFeeToday: number;
  gatewayFeesToday: number;
  netPlatformRevenueToday: number;
}

export interface PaymentsHealthAnalytics {
  paymentsCreatedToday: number;
  paymentsCompletedToday: number;
  paymentsPending: number;
  paymentsPendingOver15Min: number;
  paymentsFailed: number;
  oldestPendingPaymentAgeMinutes: number | null;
}

export interface WalletHealthAnalytics {
  walletCreditsToday: number;
  walletDebitsToday: number;
  manualAdjustmentsToday: number;
  mismatchedWalletCount: number | null;
}

export interface JobExecutionAnalytics {
  jobsInProgress: number;
  expectedCheckinsToday: number;
  actualCheckinsToday: number;
  autoCheckoutsToday: number;
  noShowsToday: number;
}

export interface SettlementsAnalytics {
  jobsEligibleForSettlement: number;
  jobsSettledToday: number;
  settlementsPendingOver24h: number;
  payoutFailuresToday: number;
}

export interface IncidentsAnalytics {
  paymentIssuesToday: number;
  settlementIssuesToday: number;
  manualInterventionsToday: number;
  unresolvedIncidentsCount: number;
}

export const getOverviewAnalytics = () =>
  request<{ data: OverviewAnalytics }>('/admin/analytics/overview');

export const getPaymentsHealthAnalytics = () =>
  request<{ data: PaymentsHealthAnalytics }>('/admin/analytics/payments-health');

export const getWalletHealthAnalytics = () =>
  request<{ data: WalletHealthAnalytics }>('/admin/analytics/wallet-health');

export const getJobExecutionAnalytics = () =>
  request<{ data: JobExecutionAnalytics }>('/admin/analytics/job-execution');

export const getSettlementsAnalytics = () =>
  request<{ data: SettlementsAnalytics }>('/admin/analytics/settlements');

export const getIncidentsAnalytics = () =>
  request<{ data: IncidentsAnalytics }>('/admin/analytics/incidents');

// ------------------------------
// Enhanced Analytics APIs
// ------------------------------
export interface JobTimelineEvent {
  type: string;
  timestamp: string;
  details: any;
}

export interface JobTimeline {
  job: {
    id: string;
    title: string;
    employer: any;
    currentStatus: any;
    createdAt: string;
    updatedAt: string;
  };
  timeline: JobTimelineEvent[];
  summary: {
    totalEvents: number;
    paymentsCount: number;
    settlementAttemptsCount: number;
    jobDaysCount: number;
    auditLogsCount: number;
  };
}

export interface JobsDetailed {
  breakdown: Array<{
    _id: {
      status: string;
      paymentStatus: string;
      jobType: string;
      payoutMode: string;
    };
    count: number;
    totalAmount: number;
    totalWorkers: number;
    avgAmountPerJob: number;
  }>;
  trends: Array<{
    _id: string;
    count: number;
    completed: number;
    cancelled: number;
    totalAmount: number;
  }>;
  jobsWithIssues: Array<{
    _id: string;
    title: string;
    employer: any;
    status: string;
    paymentStatus: string;
    completionConfirmedAt: string;
    daysSinceCompletion: number;
    totalAmount: number;
  }>;
  summary: {
    totalJobs: number;
    totalAmount: number;
    totalWorkers: number;
    jobsWithIssuesCount: number;
  };
}

export interface PaymentsDetailed {
  breakdown: Array<{
    _id: {
      status: string;
      type: string;
    };
    count: number;
    totalAmount: number;
    avgAmount: number;
  }>;
  processingTimes: Array<{
    _id: string;
    avgProcessingTime: number;
    minProcessingTime: number;
    maxProcessingTime: number;
    count: number;
  }>;
  failedPayments: Array<{
    _id: string;
    type: string;
    amount: number;
    failureReason?: string;
    createdAt: string;
    user: any;
    job: any;
  }>;
  pendingPaymentsByAge: Array<{
    _id: string;
    count: number;
    totalAmount: number;
  }>;
  summary: {
    totalPayments: number;
    totalAmount: number;
    failedCount: number;
    pendingCount: number;
  };
}

export const getJobTimeline = (jobId: string) =>
  request<{ data: JobTimeline }>(`/admin/analytics/job-timeline/${jobId}`);

export const getJobsDetailed = (params?: {
  startDate?: string;
  endDate?: string;
  status?: string;
  jobType?: string;
}) => {
  const queryString = params
    ? '?' + Object.entries(params)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&')
    : '';
  return request<{ data: JobsDetailed }>(`/admin/analytics/jobs-detailed${queryString}`);
};

export const getPaymentsDetailed = (params?: {
  startDate?: string;
  endDate?: string;
  status?: string;
  type?: string;
}) => {
  const queryString = params
    ? '?' + Object.entries(params)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&')
    : '';
  return request<{ data: PaymentsDetailed }>(`/admin/analytics/payments-detailed${queryString}`);
};

export interface ProtectionPoolAnalytics {
  current: {
    balance: number;
    totalContributions: number;
    totalPayouts: number;
    protectionCapPerJob: number;
    netValue: number;
    lastUpdated: string;
  };
  today: {
    contributions: number;
    payouts: number;
    netChange: number;
    jobsContributing: number;
    jobsPaidFromPool: number;
  };
  dailyTracking: Array<{
    date: string;
    contributions: number;
    payouts: number;
    netChange: number;
    jobsContributing: number;
    jobsPaidFromPool: number;
  }>;
  coverage: {
    jobsCoveredCount: number;
    totalCoveredAmount: number;
    employerDebtsCount: number;
    totalUnpaidDebt: number;
    eligibleJobsCount: number;
  };
  health: {
    status: 'HEALTHY' | 'LOW' | 'CRITICAL';
    message: string;
    balance: number;
    avgJobAmount: number;
    estimatedCoverageCapacity: number;
    utilizationRate: number;
  };
  jobsCovered: Array<{
    id: string;
    title: string;
    employer: any;
    amount: number;
    paidAt: string;
    createdAt: string;
  }>;
  employerDebts: Array<{
    id: string;
    employer: any;
    job: any;
    amount: number;
    amountPaid: number;
    remaining: number;
    status: string;
    createdAt: string;
  }>;
}

export const getProtectionPoolAnalytics = (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  const queryString = params
    ? '?' + Object.entries(params)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&')
    : '';
  return request<{ data: ProtectionPoolAnalytics }>(`/admin/analytics/protection-pool${queryString}`);
};