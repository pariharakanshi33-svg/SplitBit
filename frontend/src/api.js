/**
 * api.js — Centralized API client
 *
 * Token injection: Clerk auth token is attached via setTokenProvider().
 * Call setTokenProvider(getToken) once from App.jsx after sign-in.
 * All API methods then automatically include "Authorization: Bearer <token>".
 *
 * userId is NO LONGER sent from the frontend — the backend derives it
 * from the verified Clerk JWT token.
 */

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

// Global token provider — set by App.jsx using Clerk's getToken()
let _getToken = null;

export function setTokenProvider(getTokenFn) {
  _getToken = getTokenFn;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  // Attach Clerk auth token to every request
  if (_getToken) {
    try {
      const token = await _getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch (e) {
      console.warn('Failed to get auth token:', e);
    }
  }

  const config = { ...options, headers };

  // Serialize JSON body (not FormData)
  if (!(options.body instanceof FormData) && options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Unable to connect to server. Make sure the backend is running.', { cause: error });
    }
    throw error;
  }
}

// ─── Bill APIs ─────────────────────────────────────────────────
export const billApi = {
  upload: (formData) => request('/upload-bill', { method: 'POST', body: formData }),
  analyze: (formData) => request('/analyze-bill', { method: 'POST', body: formData }),
  split: (data) => request('/split', { method: 'POST', body: data }),
  getById: (id) => request(`/bill/${id}`),
  getHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/history${query ? `?${query}` : ''}`);
  },
  delete: (id) => request(`/bill/${id}`, { method: 'DELETE' }),
};

// ─── User APIs ─────────────────────────────────────────────────
export const userApi = {
  search: (q) => request(`/users/search?q=${encodeURIComponent(q)}`),
  addContact: (data) => request('/users/contacts', { method: 'POST', body: data }),
  getAll: () => request('/users'),
  getById: (id) => request(`/users/${id}`),
  delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};

// ─── Auth API ──────────────────────────────────────────────────
export const authApi = {
  sync: (data) => request('/auth/sync', { method: 'POST', body: data }),
};

// ─── Group APIs ────────────────────────────────────────────────
export const groupApi = {
  create: (data) => request('/groups', { method: 'POST', body: data }),
  getAll: () => request('/groups'),
  getById: (id) => request(`/groups/${id}`),
  delete: (id) => request(`/groups/${id}`, { method: 'DELETE' }),
  addMember: (groupId, data) => request(`/groups/${groupId}/members`, { method: 'POST', body: data }),
  removeMember: (groupId, userId) => request(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
};

// ─── Settlement APIs ───────────────────────────────────────────
export const settlementApi = {
  settle: (id) => request(`/settlements/${id}/settle`, { method: 'POST' }),
  minimize: (groupId) => request(`/settlements/group/${groupId}/minimize`),
  getMySettlements: () => request('/settlements/me'),
};
