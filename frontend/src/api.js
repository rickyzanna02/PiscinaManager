import axios from "axios";

const api = axios.create({
   baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',  // ✅ Fallback
});

// 🔐 Interceptor JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================
// ✅ FASE 2: API Functions
// ============================================

/**
 * Ottieni tutti i ruoli disponibili dal backend.
 * 
 * @returns {Promise<Array>} Lista di ruoli: [{id, code, label}, ...]
 */
export const getRoles = async () => {
  const response = await api.get('/users/roles/');
  return response.data;
};

export default api;
