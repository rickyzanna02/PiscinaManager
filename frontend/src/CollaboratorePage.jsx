import { useAuth } from "./auth/AuthContext";
import AppHeader from "./components/AppHeader";
import MyShifts from "./MyShifts";

export default function CollaboratorePage() {
  const { user, logout } = useAuth();

  if (!user) {
    // non dovrebbe mai succedere grazie a RequireAuth
    return null;
  }

  return (
    
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <div className="flex justify-between items-center p-4 bg-white border-b shadow-sm">
        <div>
          <h1 className="text-lg font-bold">
            Area Collaboratore
          </h1>
          <p className="text-sm text-gray-600">
            {user.first_name} {user.last_name}
          </p>
        </div>

        <button
          className="bg-gray-300 hover:bg-gray-400 px-3 py-1 rounded"
          onClick={logout}
        >
          Logout
        </button>
      </div>

      {/* CONTENUTO */}
      <MyShifts userId={user.id} />
    </div>
  );
}
