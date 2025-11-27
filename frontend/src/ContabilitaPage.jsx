import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "./api";

export default function ContabilitaPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get("users/").then((res) => {
      const sorted = [...res.data].sort((a, b) =>
        a.username.localeCompare(b.username)
      );
      setUsers(sorted);
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Elenco Collaboratori</h1>

      <div className="bg-white p-4 rounded shadow max-w-md">
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
    </div>
  );
}
