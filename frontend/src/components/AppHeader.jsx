import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);


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
              Gestione Turni
            </button>

            <button
              onClick={() => navigate("/contabilita")}
              className="text-sm px-3 py-1 rounded bg-green-100 hover:bg-green-200"
            >
              Contabilità
            </button>
          </>
        )}

        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 text-sm px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            👤 {user.first_name}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-md z-50">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/profile");
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                Il mio profilo
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/profile?tab=password");
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                Cambia password
              </button>

              <div className="border-t my-1" />

              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
