// ====================================================================
// TripMate - Centralized API Client & URL Resolution Utility
// ====================================================================

/**
 * Normalizes backend API base URL from Vite environment variable.
 * Handles edge cases such as trailing slashes and redundant `/api` suffixes.
 *
 * Example inputs:
 *  - "https://tripmate-api-sjni.onrender.com"    -> "https://tripmate-api-sjni.onrender.com"
 *  - "https://tripmate-api-sjni.onrender.com/"   -> "https://tripmate-api-sjni.onrender.com"
 *  - "https://tripmate-api-sjni.onrender.com/api"-> "https://tripmate-api-sjni.onrender.com"
 *  - "" or undefined (local dev with proxy)      -> ""
 */
export const normalizeApiUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  return rawUrl
    .trim()
    .replace(/\/+$/, '')             // Remove trailing slashes
    .replace(/\/api\/?$/i, '')       // Strip redundant trailing /api if user added it
    .replace(/\/+$/, '');
};

// Base URL derived from environment (Vite import.meta.env or Node process.env for tests)
const rawEnvUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) ||
  '';

export const API_BASE_URL = normalizeApiUrl(rawEnvUrl);

/**
 * Constructs a fully qualified API endpoint URL.
 * Automatically ensures the leading `/api` prefix is preserved.
 *
 * @param {string} path - e.g. "/api/trips" or "/trips" or "/api/auth/login"
 * @returns {string} Fully resolved URL for fetch()
 */
export const getApiEndpoint = (path) => {
  if (!path) return `${API_BASE_URL}/api`;
  
  // Ensure path starts with a slash
  let cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Ensure path has /api prefix
  if (!cleanPath.startsWith('/api')) {
    cleanPath = `/api${cleanPath}`;
  }

  return `${API_BASE_URL}${cleanPath}`;
};

/**
 * Returns authorization headers with JWT token from localStorage if available.
 *
 * @param {Object} [customHeaders={}] - Additional headers to merge
 * @returns {Object} Headers object with Content-Type and Authorization
 */
export const getAuthHeaders = (customHeaders = {}) => {
  const token = localStorage.getItem('tripmate_token');
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Safe fetch wrapper that handles:
 *  1. Base URL & endpoint formatting (local Vite proxy vs Render production)
 *  2. Automatic Authorization header injection
 *  3. Safe JSON parsing (prevents "Unexpected token '<'..." SyntaxErrors on HTML 404/502/503)
 *  4. Informative network error messages for Render cold starts
 *
 * @param {string} path - Route path (e.g. '/api/trips' or '/api/auth/me')
 * @param {RequestInit} [options={}] - Fetch configuration options
 * @returns {Promise<any>} Parsed JSON response body
 */
export const apiFetch = async (path, options = {}) => {
  const endpoint = getApiEndpoint(path);

  // Prepare headers
  const token = localStorage.getItem('tripmate_token');
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let res;
  try {
    res = await fetch(endpoint, {
      ...options,
      headers,
    });
  } catch (networkErr) {
    throw new Error(
      `Unable to connect to server at ${endpoint}. If hosted on Render, the free instance may take 30-50 seconds to spin up from sleep. Please check your network and retry.`
    );
  }

  // Safe response parsing: inspect Content-Type header
  const contentType = res.headers.get('content-type') || '';
  let data = null;

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (jsonErr) {
      data = null;
    }
  }

  if (!res.ok) {
    const fallbackMsg =
      res.status === 404
        ? `API endpoint not found (404): ${path}. Verify backend route configuration.`
        : res.status === 405
        ? `Request method not allowed (405) for ${path}. Ensure Vercel rewrites or VITE_API_URL are properly configured.`
        : res.status === 502 || res.status === 504
        ? 'Backend gateway timeout. The server instance may be waking up from idle on Render. Please retry in a moment.'
        : res.status === 503
        ? 'Database service is currently unavailable (503). Verify MongoDB connection string (MONGO_URI).'
        : res.status === 500
        ? 'Internal server error (500). Please check backend server logs.'
        : `Request failed with status ${res.status}`;

    const errorMsg = data?.message || fallbackMsg;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
};

export default apiFetch;
