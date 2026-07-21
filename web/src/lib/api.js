const DEV_BASE = 'http://localhost:3000/api/v1';

export function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return configured;
  if (import.meta.env.PROD) {
    throw new Error('VITE_API_URL is required in production');
  }
  return DEV_BASE;
}

const BASE = getApiBaseUrl();

const ACCESS = 'kg_access';
const REFRESH = 'kg_refresh';
const USER = 'kg_user';

export const session = {
  access: () => (typeof window !== 'undefined' ? localStorage.getItem(ACCESS) : null),
  refresh: () => (typeof window !== 'undefined' ? localStorage.getItem(REFRESH) : null),
  user: () => {
    if (typeof window === 'undefined') return null;
    const u = localStorage.getItem(USER);
    return u ? JSON.parse(u) : null;
  },
  set: (access, refresh, user) => {
    localStorage.setItem(ACCESS, access);
    localStorage.setItem(REFRESH, refresh);
    if (user) localStorage.setItem(USER, JSON.stringify(user));
  },
  setUser: (user) => localStorage.setItem(USER, JSON.stringify(user)),
  clear: () => {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
    localStorage.removeItem(USER);
  },
};

export class ApiError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

async function raw(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = opts.token ?? (opts.auth ? session.access() : null);
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res
    .json()
    .catch(() => ({ data: null, error: { code: res.status, message: res.statusText }, meta: null }));
  if (!res.ok || json.error) {
    throw new ApiError(json.error?.code ?? res.status, json.error?.message ?? 'Request failed', json.error?.details);
  }
  return json;
}

export async function api(path, opts = {}) {
  try {
    return await raw(path, opts);
  } catch (e) {
    if (e instanceof ApiError && e.code === 401 && opts.auth && session.refresh()) {
      try {
        const r = await raw('/auth/refresh', { method: 'POST', body: { refreshToken: session.refresh() } });
        session.set(r.data.accessToken, r.data.refreshToken);
        return await raw(path, { ...opts, token: r.data.accessToken });
      } catch {
        session.clear();
        throw e;
      }
    }
    throw e;
  }
}

export const Api = {
  requestOtp: (phone, role) => api('/auth/otp/request', { method: 'POST', body: { phone, ...(role ? { role } : {}) } }),
  verifyOtp: (phone, code, role) => api('/auth/otp/verify', { method: 'POST', body: { phone, code, ...(role ? { role } : {}) } }),
  me: () => api('/me', { auth: true }),
  updateMe: (body) => api('/me', { method: 'PATCH', body, auth: true }),

  categories: () => api('/categories'),
  services: (categoryId) => api(`/services${categoryId ? `?categoryId=${categoryId}` : ''}`),
  searchWorkers: (lat, lng, categoryId) => api(`/workers/search?lat=${lat}&lng=${lng}${categoryId ? `&categoryId=${categoryId}` : ''}`),

  createBooking: (body) => api('/bookings', { method: 'POST', body, auth: true }),
  myBookings: (status) => api(`/bookings${status ? `?status=${status}` : ''}`, { auth: true }),
  booking: (id) => api(`/bookings/${id}`, { auth: true }),
  review: (id, body) => api(`/bookings/${id}/review`, { method: 'POST', body, auth: true }),

  paymentOrder: (bookingId) => api('/payments/order', { method: 'POST', body: { bookingId }, auth: true }),
  mockPay: (orderId) => api(`/payments/order/${orderId}/mock-pay`, { method: 'POST' }),
  upiQr: (bookingId) => api('/payments/upi/qr', { method: 'POST', body: { bookingId }, auth: true }),
  upiConfirm: (bookingId) => api('/payments/upi/confirm', { method: 'POST', body: { bookingId }, auth: true }),
  wallet: () => api('/wallet', { auth: true }),

  // Admin
  adminOverview: () => api('/admin/analytics/overview', { auth: true }),
  adminBookings: (status) => api(`/admin/bookings${status ? `?status=${status}` : ''}`, { auth: true }),
  adminKyc: (status = 'PENDING') => api(`/admin/kyc?status=${status}`, { auth: true }),
  approveKyc: (id) => api(`/admin/kyc/${id}/approve`, { method: 'POST', auth: true }),
  rejectKyc: (id, reason) => api(`/admin/kyc/${id}/reject`, { method: 'POST', body: { reason }, auth: true }),
  adminDisputes: (status) => api(`/admin/disputes${status ? `?status=${status}` : ''}`, { auth: true }),
  adminWorkers: () => api('/admin/workers', { auth: true }),
};
