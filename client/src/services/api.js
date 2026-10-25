import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('showbook_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If token is invalid or expired, clear local storage
    if (error.response && error.response.status === 401) {
      const url = error.config.url;
      // Don't auto-logout if login/register endpoint returned 401
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('showbook_token');
        localStorage.removeItem('showbook_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
