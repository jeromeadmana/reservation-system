import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  logout: () => api.post('/auth/logout'),
};

// Reservation APIs
export const reservationAPI = {
  create: (data: any) => api.post('/reservations', data),
  list: (params?: any) => api.get('/reservations', { params }),
  get: (id: string) => api.get(`/reservations/${id}`),
  update: (id: string, data: any) => api.patch(`/reservations/${id}`, data),
  cancel: (id: string) => api.post(`/reservations/${id}/cancel`),
  delete: (id: string) => api.delete(`/reservations/${id}`),
  deleteAll: () => api.post('/reservations/demo/reset'),
};

export default api;
