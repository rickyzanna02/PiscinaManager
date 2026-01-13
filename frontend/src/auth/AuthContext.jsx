import { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (username, password) => {
    const res = await api.post("/api/auth/login/", {
      username,
      password,
    });

    localStorage.setItem("access_token", res.data.access);

    const me = await api.get("/api/auth/me/");
    setUser(me.data);
    return me.data;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
  };

  const loadUser = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const me = await api.get("/api/auth/me/");
      setUser(me.data);
    } catch {
      localStorage.removeItem("access_token");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
