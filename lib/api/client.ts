// Base API client adapted from mobile app for web use
// Uses localStorage instead of AsyncStorage

const getApiUrl = (): string => {
  // Use NEXT_PUBLIC_API_URL for Next.js environment variables
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Fallback to default backend URL
  return "https://api-hirearn.onrender.com/api";
};

export const BASE_URL = getApiUrl();
export const ACCESS_TOKEN_KEY = "authToken";

// ------------------------------
// Types
// ------------------------------
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

// ------------------------------
// Helper: Normalize API Response
// ------------------------------
export function normalizeApiResponse<T = any>(data: any): T {
  if (!data || typeof data !== 'object') return data as T;

  if (Array.isArray(data)) {
    return data.map(normalizeApiResponse) as T;
  }

  const normalized: Record<string, any> = { ...data };

  // Convert _id to id
  if (normalized._id && !normalized.id) {
    normalized.id = String(normalized._id);
  }

  // Recursively normalize nested objects
  for (const key in normalized) {
    if (normalized[key] && typeof normalized[key] === 'object') {
      if (Array.isArray(normalized[key])) {
        normalized[key] = normalized[key].map((item: any) =>
          typeof item === 'object' ? normalizeApiResponse(item) : item
        );
      } else if (!(normalized[key] instanceof Date)) {
        normalized[key] = normalizeApiResponse(normalized[key]);
      }
    }
  }

  return normalized as T;
}

// ------------------------------
// Token Management (Web - localStorage)
// ------------------------------
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    return null;
  }
};

export const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch (error) {
    // Error setting token - silently continue
  }
};

export const removeToken = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    // Error removing token - silently continue
  }
};

// ------------------------------
// Base Request Helper
// ------------------------------
async function request<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const token = getToken();

  const headers: Record<string, string> = {};

  // Copy existing headers
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, options.headers);
    }
  }

  // Add Content-Type only if not multipart/form-data
  if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    const text = await response.text();

    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      // Extract error message - backend returns { success: false, message: "..." }
      const errorMessage = data?.message || `Request failed with status ${response.status}`;
      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.response = data;
      error.responseMessage = data?.message;
      throw error;
    }

    return data as T;
  } catch (error: any) {
    // Handle network errors
    if (error.message === 'Network request failed' || error.message?.includes('Network') || error.message?.includes('fetch')) {
      const networkError: any = new Error(`Cannot connect to backend server at ${BASE_URL}. Please ensure the backend is running.`);
      networkError.isNetworkError = true;
      networkError.url = url;
      throw networkError;
    }

    // Handle 401 Unauthorized - token might be invalid
    if (error.status === 401) {
      removeToken();
      // Redirect to login in browser
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    throw error;
  }
}

export default request;
