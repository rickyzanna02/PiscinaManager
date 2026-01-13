import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import UnauthorizedPage from "./UnauthorizedPage";

export default function RequireContabilita({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Caricamento...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (
    !user.is_staff && //togliere se admin non deve accedere
    !user.roles?.includes("contabilita")
  ) {
    return <UnauthorizedPage />;
  }


  return children;
}
