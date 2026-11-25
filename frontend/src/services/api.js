import axios from 'axios';
import { tokenStorage } from '../utils/tokenStorage';

/** The single Axios instance every API module uses. */
const api = axios.create({
  // Configured per environment; '/api' works behind a same-origin proxy.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let handleUnauthorized = () => {};

/** AuthProvider registers its logout here so an expired token signs the user out. */
export function setUnauthorizedHandler(handler) {
  handleUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 while holding a token means it expired or was revoked.
    if (error.response?.status === 401 && tokenStorage.get()) handleUnauthorized();
    return Promise.reject(error);
  },
);

export default api;
