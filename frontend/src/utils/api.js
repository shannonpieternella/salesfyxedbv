import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  changePassword: (passwords) => api.put('/auth/change-password', passwords),
};

export const usersAPI = {
  createUser: (userData) => api.post('/users', userData),
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  updateUser: (id, userData) => api.patch(`/users/${id}`, userData),
  getUserTeam: (id) => api.get(`/users/${id}/team`),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

export const salesAPI = {
  createSale: (saleData) => api.post('/sales', saleData),
  getSales: (params) => api.get('/sales', { params }),
  getSale: (id) => api.get(`/sales/${id}`),
  updateSale: (id, data) => api.patch(`/sales/${id}`, data),
  deleteSale: (id) => api.delete(`/sales/${id}`),
};

export const invoicesAPI = {
  createInvoice: (invoiceData) => api.post('/invoices', invoiceData),
  getInvoices: (params) => api.get('/invoices', { params }),
  getInvoice: (id) => api.get(`/invoices/${id}`),
  updateInvoiceStatus: (id, status) => api.patch(`/invoices/${id}/status`, { status }),
  markInvoicePaid: (id, data) => api.patch(`/invoices/${id}/mark-paid`, data),
  deleteInvoice: (id) => api.delete(`/invoices/${id}`),
};

export const paymentsAPI = {
  createPaymentIntent: (data) => api.post('/payments/create-payment-intent', data),
  getPaymentStatus: (id) => api.get(`/payments/status/${id}`),
  getPaymentHistory: (params) => api.get('/payments/history', { params }),
};

export const earningsAPI = {
  getSummary: (params) => api.get('/earnings/summary', { params }),
  getTeamEarnings: (params) => api.get('/earnings/team', { params }),
  getBreakdown: (params) => api.get('/earnings/breakdown', { params }),
  calculatePotential: (scenario) => api.post('/earnings/calculate-potential', scenario),
  getMonthlyStats: (params) => api.get('/earnings/monthly-stats', { params }),
};

export const teamsAPI = {
  getTeams: () => api.get('/teams'),
  createTeam: (teamData) => api.post('/teams', teamData),
  getTeam: (id) => api.get(`/teams/${id}`),
  updateTeam: (id, data) => api.patch(`/teams/${id}`, data),
  addMember: (id, userId) => api.patch(`/teams/${id}/add-member`, { userId }),
  removeMember: (id, userId) => api.patch(`/teams/${id}/remove-member`, { userId }),
  deleteTeam: (id) => api.delete(`/teams/${id}`),
};

export const payoutsAPI = {
  generatePayouts: (data) => api.post('/payouts/generate', data),
  getPayouts: (params) => api.get('/payouts', { params }),
  getPayout: (id) => api.get(`/payouts/${id}`),
  markPayoutPaid: (id, data) => api.patch(`/payouts/${id}/mark-paid`, data),
  updatePayoutStatus: (id, data) => api.patch(`/payouts/${id}/status`, data),
  exportPayouts: (period) => api.get(`/payouts/export/${period}`, { responseType: 'blob' }),
  deletePayout: (id) => api.delete(`/payouts/${id}`),
};

export const adminAPI = {
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settings) => api.put('/admin/settings', settings),
  recomputeSales: (data) => api.post('/admin/recompute-sales', data),
  getDashboardStats: (params) => api.get('/admin/dashboard-stats', { params }),
  getAuditLog: (params) => api.get('/admin/audit-log', { params }),
  getSystemHealth: () => api.get('/admin/system-health'),
};

export default api;