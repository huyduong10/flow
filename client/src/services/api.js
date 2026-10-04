import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Request interceptor: tự động đính kèm Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('flow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: xử lý 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token hết hạn hoặc không hợp lệ
      localStorage.removeItem('flow_token');
      localStorage.removeItem('flow_user');
      window.dispatchEvent(new Event('auth-logout'));
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  getUsers: (params) => api.get('/auth/users', { params }),
};

export const projectApi = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  getExpenseSummary: (projectId) =>
    api.get('/projects/expense-summary', { params: { projectId } }),
};

export const requestApi = {
  getAll: (params) => api.get('/requests', { params }),
  getById: (id) => api.get(`/requests/${id}`),
  create: (data) => api.post('/requests', data),
  ceoApprove: (id, action, rejectionReason) =>
    api.patch(`/requests/${id}/ceo-approve`, { action, rejectionReason }),
};

export const vendorApi = {
  getAll: (params) => api.get('/vendor-quotes', { params }),
  getByRequestId: (requestId) => api.get(`/requests/${requestId}/vendors`),
  create: (requestId, vendors) => api.post(`/requests/${requestId}/vendors`, { vendors }),
  approve: (requestId, action, rejectionReason) =>
    api.patch(`/requests/${requestId}/vendor-approval`, { action, rejectionReason }),
};

export const contractApi = {
  getAll: (params) => api.get('/contracts', { params }),
  getById: (id) => api.get(`/contracts/${id}`),
  create: (formData) =>
    api.post('/contracts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  handover: (id) => api.patch(`/contracts/${id}/handover`),
};

export const paymentApi = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  approve: (id, action, rejectionReason) =>
    api.patch(`/payments/${id}/approve`, { action, rejectionReason }),
  disburse: (id, data) => api.patch(`/payments/${id}/disburse`, data),
};

export const warehouseApi = {
  getPendingRequests: (params) => api.get('/warehouse/pending-requests', { params }),
  getRequestById: (id) => api.get(`/warehouse/requests/${id}`),
  checkStock: (id, data) => api.patch(`/warehouse/requests/${id}/check`, data),
  siteConfirm: (id) => api.patch(`/warehouse/requests/${id}/site-confirm`),
  getHistory: (params) => api.get('/warehouse/history', { params }),
};

export const materialRequestApi = {
  getAll: (params) => api.get('/material-requests', { params }),
  getById: (id) => api.get(`/material-requests/${id}`),
  create: (data) => api.post('/material-requests', data),
};

export default api;
