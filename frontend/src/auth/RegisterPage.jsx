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
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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
      await api.post("/api/auth/register/", {
        ...form,
        roles: [], // per ora vuoto (ruoli assegnati dopo)
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
        className="bg-white p-6 rounded shadow w-96"
      >
        <h1 className="text-xl font-bold mb-4 text-center">
          Registrazione collaboratore
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
        >
          {loading ? "Registrazione..." : "Registrati"}
        </button>

        <p className="text-sm text-center mt-4">
          Hai già un account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-blue-600 underline"
          >
            Accedi
          </button>
        </p>
      </form>
    </div>
  );
}
