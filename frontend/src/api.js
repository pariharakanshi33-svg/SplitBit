/**
 * API Service — Frontend HTTP client
 * 
 * Centralized API calls to the backend.
 * Uses the Vite proxy to forward /api requests to the backend.
 */

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const config = {
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    ...options,
  };

  const userId = localStorage.getItem('userId');
  
  if (options.body instanceof FormData) {
    if (userId && !options.body.has('userId')) options.body.append('userId', userId);
  } else if (options.body && typeof options.body === 'object') {
    if (userId && !options.body.userId) options.body.userId = userId;
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
      throw new Error('Unable to connect to server. Make sure the backend is running.');
    }
    throw error;
  }
}

// ─── Bill APIs ─────────────────────────────────────────────
export const billApi = {
  upload: (formData) => request('/upload-bill', { method: 'POST', body: formData }),
  analyze: (formData) => request('/analyze-bill', { method: 'POST', body: formData }),
  split: (data) => request('/split', { method: 'POST', body: data }),
  getById: (id) => request(`/bill/${id}`),
  getHistory: (params = {}) => {
    const userId = localStorage.getItem('userId');
    if (userId) params.userId = userId;
    const query = new URLSearchParams(params).toString();
    return request(`/history${query ? `?${query}` : ''}`);
  },
  delete: (id) => request(`/bill/${id}`, { method: 'DELETE' }),
};

// ─── User APIs ─────────────────────────────────────────────
export const userApi = {
  create: (data) => request('/users', { method: 'POST', body: data }),
  getAll: () => request('/users'),
  getById: (id) => request(`/users/${id}`),
  delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};

// ─── Group APIs ────────────────────────────────────────────
export const groupApi = {
  create: (data) => request('/groups', { method: 'POST', body: data }),
  getAll: () => {
    const userId = localStorage.getItem('userId');
    return request(`/groups${userId ? `?userId=${userId}` : ''}`);
  },
  getById: (id) => request(`/groups/${id}`),
  delete: (id) => request(`/groups/${id}`, { method: 'DELETE' }),
  addMember: (groupId, data) => request(`/groups/${groupId}/members`, { method: 'POST', body: data }),
  removeMember: (groupId, userId) => request(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
};

// ─── Settlement APIs ───────────────────────────────────────
export const settlementApi = {
  settle: (id) => request(`/settlements/${id}/settle`, { method: 'POST' }),
  minimize: (groupId) => request(`/settlements/group/${groupId}/minimize`),
  getUserSettlements: (userId) => request(`/settlements/user/${userId}`),
};
