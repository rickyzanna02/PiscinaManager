import { useState } from "react";
import MyShifts from "./MyShifts";

export default function CollaboratorePage() {
  const [userId, setUserId] = useState(null);

  // utenti fittizi per simulazione — in futuro saranno quelli del login
  const utentiFake = [
    { id: 1, nome: "admin" },
    { id: 2, nome: "Riccardo" },
    { id: 3, nome: "Giada" },
  ];

  if (!userId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Seleziona collaboratore</h1>
        <p className="mb-4 text-gray-600">
          (Simulazione login per testare l’interfaccia collaboratore)
        </p>

        <div className="flex flex-col gap-2">
          {utentiFake.map((u) => (
            <button
              key={u.id}
              onClick={() => setUserId(u.id)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-60 text-left shadow"
            >
              👤 {u.nome}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex justify-between items-center p-4 bg-white border-b shadow-sm">
        <h1 className="text-lg font-bold">Area Collaboratore</h1>
        <button
          className="bg-gray-300 hover:bg-gray-400 px-3 py-1 rounded"
          onClick={() => setUserId(null)}
        >
          🔙 Cambia utente
        </button>
      </div>

      <MyShifts userId={userId} />
    </div>
  );
}
