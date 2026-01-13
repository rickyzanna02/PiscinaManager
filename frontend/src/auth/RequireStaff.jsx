import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import UnauthorizedPage from "./UnauthorizedPage";

export default function RequireStaff({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Caricamento...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // 🔒 loggato ma NON staff
  if (!user.is_staff) {
    return <UnauthorizedPage />;
  }
  return children;
}
