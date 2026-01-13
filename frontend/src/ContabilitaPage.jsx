import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "./api";
import AppHeader from "./components/AppHeader";

export default function ContabilitaPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/api/users/", { params: { only_collaborators: true } })
      .then((res) => {
        const sorted = [...res.data].sort((a, b) =>
          a.username.localeCompare(b.username)
        );
        setUsers(sorted);
      })
      .catch(() => {
        setError("Errore nel caricamento degli utenti");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔝 HEADER UNIFICATO */}
      <AppHeader />

      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">
          Elenco Collaboratori
        </h1>

        {loading && (
          <p className="text-gray-600">Caricamento…</p>
        )}

        {error && (
          <p className="text-red-600">{error}</p>
        )}

        {!loading && !error && (
          <div className="bg-white p-4 rounded shadow max-w-md">
            {users.length === 0 && (
              <p className="text-gray-500 italic">
                Nessun collaboratore trovato
              </p>
            )}

            {users.map((u) => (
              <Link
                key={u.id}
                to={`/contabilita/${u.id}`}
                className="block p-2 border-b last:border-none hover:bg-gray-100"
              >
                {u.username}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
