import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded shadow w-96 text-center">
        <h1 className="text-xl font-bold mb-3 text-red-600">
          Accesso non autorizzato
        </h1>

        <p className="text-gray-700 mb-4">
          Non hai i permessi necessari per accedere a questa sezione.
        </p>

        <div className="flex flex-col gap-2">
          {user?.is_staff && (
            <button
              onClick={() => navigate("/admin")}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
            >
              Vai all’area admin
            </button>
          )}

          {!user?.is_staff && (
            <button
              onClick={() => navigate("/collaboratore")}
              className="bg-green-600 hover:bg-green-700 text-white py-2 rounded"
            >
              Vai alla tua area
            </button>
          )}

          <button
            onClick={() => navigate(-1)}
            className="bg-gray-300 hover:bg-gray-400 py-2 rounded"
          >
            Torna indietro
          </button>
        </div>
      </div>
    </div>
  );
}
