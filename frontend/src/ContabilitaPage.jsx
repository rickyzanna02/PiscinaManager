import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "./api";
import AppHeader from "./components/AppHeader";

export default function ContabilitaPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkedUsers, setCheckedUsers] = useState({});
  const [showOnlyUnchecked, setShowOnlyUnchecked] = useState(false);

  const toggleChecked = async (userId) => {
    try {
      const res = await api.post(
        `/contabilita/checks/${userId}/`,
        { checked: !checkedUsers[userId] }
      );

      setCheckedUsers(prev => ({
        ...prev,
        [userId]: res.data.checked,
      }));
    } catch {
      alert("Errore nel salvataggio dello stato");
    }
  };



  useEffect(() => {
    api
      .get("/users/", { params: { only_collaborators: true } })
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

      api.get("/contabilita/checks/")
        .then(res => {
        const map = {};
        res.data.forEach(c => {
        map[c.user_id] = true;
        });
        setCheckedUsers(map);
      });
  }, []);

  const filteredUsers = showOnlyUnchecked
  ? users.filter((u) => !checkedUsers[u.id])
  : users;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔝 HEADER UNIFICATO */}
      <AppHeader />

      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">
          Elenco Collaboratori
        </h1>

        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="only-unchecked"
            checked={showOnlyUnchecked}
            onChange={(e) => setShowOnlyUnchecked(e.target.checked)}
          />
          <label htmlFor="only-unchecked" className="text-sm">
            Vedi solo da controllare
          </label>
        </div>

        {!loading && !error && (
          <div className="bg-white p-4 rounded shadow max-w-md">
            {users.length === 0 ? (
              <p className="text-gray-500 italic">
                Nessun collaboratore trovato
              </p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-gray-500 italic">
                Tutti i collaboratori sono già stati controllati 🎉
              </p>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-2 border-b last:border-none hover:bg-gray-100"
                >
                  <Link
                    to={`/contabilita/${u.id}`}
                    className={`flex-1 ${
                      checkedUsers[u.id] ? "text-gray-400 line-through" : ""
                    }`}
                  >
                    {u.username}
                  </Link>

                  <input
                    type="checkbox"
                    checked={!!checkedUsers[u.id]}
                    onChange={() => toggleChecked(u.id)}
                    title="Contrassegna come già controllato"
                    className="ml-3"
                  />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
