import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(username, password);

      // 🔀 PRIORITÀ DI ACCESSO
      if (user.is_staff) {
        navigate("/admin");
      } else if (user.roles?.includes("contabilita")) {
        navigate("/contabilita");
      } else {
        navigate("/collaboratore");
      }
    } catch (err) {
      setError("Credenziali non valide");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow w-80"
      >
        <h1 className="text-xl font-bold mb-4 text-center">
          Login
        </h1>

        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">
            {error}
          </div>
        )}

        <label className="block mb-2 text-sm font-semibold">Username</label>
        <input
          type="text"
          className="w-full border p-2 rounded mb-3"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <label className="block mb-2 text-sm font-semibold">Password</label>
        <input
          type="password"
          className="w-full border p-2 rounded mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
        >
          {loading ? "Accesso..." : "Accedi"}
        </button>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Non hai un account?
          </p>

          <button
            type="button"
            onClick={() => navigate("/register")}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded"
          >
            Registrati
          </button>
        </div>

      </form>
    </div>
  );
}
