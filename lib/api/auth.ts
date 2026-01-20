// Authentication utilities
import { getToken, removeToken, setToken } from './client';
import { verifyOtp, sendOtp, getCurrentUser, VerifyOtpResponse } from './admin';

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

export const logout = (): void => {
  removeToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

export { sendOtp, verifyOtp, getCurrentUser };
export type { VerifyOtpResponse };
