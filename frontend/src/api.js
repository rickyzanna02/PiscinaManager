import axios from "axios";

// ============================================
// 🌍 CONFIGURAZIONE BASE
// ============================================

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL + "/api",

  withCredentials: true,
});

// ============================================
// 🔐 JWT INTERCEPTOR
// ============================================

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
// 🔁 REFRESH TOKEN AUTOMATICO (PREPARATO)
// ============================================

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem("refresh")
    ) {
      originalRequest._retry = true;

      try {
        const refresh = localStorage.getItem("refresh");
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh/`,
          { refresh }
        );

        localStorage.setItem("access", data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// ✅ API FUNCTIONS
// ============================================

// 🔐 AUTH
export const login = async (credentials) => {
  const { data } = await api.post("/auth/login/", credentials);
  return data;
};

export const getMe = async () => {
  const { data } = await api.get("/auth/me/");
  return data;
};

// 👥 USERS
export const getUsers = async () => {
  const { data } = await api.get("/users/");
  return data;
};

export const getRoles = async () => {
  const { data } = await api.get("/users/roles/");
  return data;
};

// ============================================
// 🔧 EXPORT DEFAULT
// ============================================

export default api;
