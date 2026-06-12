import axios from 'axios';
import { API_URL } from './config';

const API = axios.create({ baseURL: `${API_URL}/api` });

API.interceptors.request.use((req) => {
  const user = JSON.parse(localStorage.getItem('userInfo') || 'null');
  if (user?.token) {
    req.headers.Authorization = `Bearer ${user.token}`;
  }
  return req;
});

export default API;
