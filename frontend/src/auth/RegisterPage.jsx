import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";



export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    date_of_birth: "",
    roles: [],
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);

  useEffect(() => {
    api
      .get("/users/roles/")
      // filtra se ruolo diverso da contabilita
      .then((res) => {
        const filteredRoles = res.data.filter(role => role.label.toLowerCase() !== "contabilita");
        setAvailableRoles(filteredRoles);
      })
      .catch(() => {
        setError("Errore nel caricamento dei ruoli");
      });
  }, []);

  const toggleRole = (roleId) => {
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(roleId)
        ? prev.roles.filter((id) => id !== roleId)
        : [...prev.roles, roleId],
    }));
  };



  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post("/auth/register/", {
        ...form,
        roles: form.roles, 
      });

      // 👉 dopo registrazione vai al login
      navigate("/login");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Errore nella registrazione. Controlla i dati."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        className="bg-white p-6 rounded shadow w-96"
      >
        <h1 className="text-xl font-bold mb-4 text-center">
          Registrazione
        </h1>

        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">
            {error}
          </div>
        )}

        <label className="block mb-1 text-sm font-semibold">Nome</label>
        <input
          name="first_name"
          className="w-full border p-2 rounded mb-2"
          onChange={handleChange}
          required
        />

        <label className="block mb-1 text-sm font-semibold">Cognome</label>
        <input
          name="last_name"
          className="w-full border p-2 rounded mb-2"
          onChange={handleChange}
          required
        />

        <label className="block mb-1 text-sm font-semibold">Data di nascita</label>
        <input
          type="date"
          name="date_of_birth"
          className="w-full border p-2 rounded mb-2"
          onChange={handleChange}
          required
        />

        <label className="block mb-1 text-sm font-semibold">Username</label>
        <input
          name="username"
          className="w-full border p-2 rounded mb-2"
          onChange={handleChange}
          required
        />

        <label className="block mb-1 text-sm font-semibold">Password</label>
        <input
          type="password"
          name="password"
          className="w-full border p-2 rounded mb-4"
          onChange={handleChange}
          required
        />

        <label className="block mb-2 text-sm font-semibold">
          Ruoli:
        </label>

        <div className="border rounded p-3 mb-4 max-h-40 overflow-y-auto text-sm">
          {availableRoles.length === 0 && (
            <div className="text-gray-500">
              Nessun ruolo disponibile
            </div>
          )}

          {availableRoles.map((role) => (
            <label
              key={role.id}
              className="flex items-center gap-2 mb-1 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={form.roles.includes(role.id)}
                onChange={() => toggleRole(role.id)}
              />
              <span>{role.label}</span>
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
        >
          {loading ? "Registrazione..." : "Registrati"}
        </button>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Hai già un account?
          </p>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded"
          >
            Accedi
          </button>
        </div>
        
      </form>
    </div>
  );
}

