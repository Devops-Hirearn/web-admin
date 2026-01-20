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
}) => {
  const queryString = params
    ? "?" +
    Object.entries(params)
      .filter(([_, v]) => v !== undefined)
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

export const getUserList = (params?: {
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
  return request<{ users: AdminUser[]; totalPages: number; currentPage: number; total: number }>(
    `/admin/users${queryString}`
  );
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
