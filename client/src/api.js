// src/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5090/api',
  timeout: 10000,
});

// Attach token header for every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers['token'] = token; // backend expects 'token'
  return config;
}, (error) => Promise.reject(error));

export default api;
