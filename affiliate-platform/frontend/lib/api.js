/**
 * lib/api.js — Axios API client with base URL from env
 * All frontend API calls should go through this module.
 */

import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Products ────────────────────────────────────────────────────────────────
export const productAPI = {
  /** Fetch paginated products with optional filters */
  list: (params = {}) => api.get('/products', { params }),

  /** Fetch a single product by URL slug */
  bySlug: (slug) => api.get(`/products/${slug}`),

  /** Fetch trending products */
  trending: () => api.get('/products/trending'),

  /** Track a user interaction event */
  track: (id, event) => api.patch(`/products/${id}/track`, { event }),
};

// ─── Blog Posts ──────────────────────────────────────────────────────────────
export const blogAPI = {
  list: (params = {}) => api.get('/blog', { params }),
  bySlug: (slug) => api.get(`/blog/${slug}`),
};

// ─── Chat Assistant ──────────────────────────────────────────────────────────
export const chatAPI = {
  /** Send a message to the AI chat assistant */
  send: (message, session_id) => api.post('/chat', { message, session_id }),
};

// ─── Analytics ───────────────────────────────────────────────────────────────
export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),
};

export default api;
