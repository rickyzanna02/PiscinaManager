import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const rolesLabel = [
    user.is_staff && "Admin",
    ...(user.roles || []),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="flex justify-between items-center px-6 py-3 bg-white border-b shadow-sm">
      <div>
        <h1 className="text-lg font-bold text-gray-800">
          Piscina Manager
        </h1>
        <p className="text-sm text-gray-600">
          {user.first_name} {user.last_name}
          {rolesLabel && ` · ${rolesLabel}`}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* 🔑 Navigazione rapida SOLO ADMIN */}
        {user.is_staff && (
          <>
            <button
              onClick={() => navigate("/admin")}
              className="text-sm px-3 py-1 rounded bg-blue-100 hover:bg-blue-200"
            >
              Admin
            </button>

            <button
              onClick={() => navigate("/contabilita")}
              className="text-sm px-3 py-1 rounded bg-green-100 hover:bg-green-200"
            >
              Contabilità
            </button>
          </>
        )}

        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="text-sm px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
