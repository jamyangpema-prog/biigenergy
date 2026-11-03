import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('be_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && window.location.pathname !== '/') {
      localStorage.removeItem('be_token');
      localStorage.removeItem('be_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export const fmtAUD = (n) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 }).format(Number(n) || 0);

export const fmtNum = (n, d = 2) =>
  new Intl.NumberFormat('en-AU', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(n) || 0);
