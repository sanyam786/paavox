import axios from 'axios';

// Set by AuthTokenSync component once Clerk is ready
let _getToken: (() => Promise<string | null>) | null = null;

export function setGetToken(fn: () => Promise<string | null>) {
  _getToken = fn;
}

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Clerk JWT on every request
apiClient.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined' && _getToken) {
    try {
      const token = await _getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Not authenticated — continue without token
    }
  }
  return config;
});

// Redirect to sign-in on 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/auth/sign-in';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
