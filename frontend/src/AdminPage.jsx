import { useState } from "react";
import App from "./App";                 // settimana tipo
import RealCalendar from "./RealCalendar"; // turni reali
import AppHeader from "./components/AppHeader";

export default function AdminPage() {
  const [tab, setTab] = useState("template"); // template | real

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔝 HEADER UNIFICATO */}
      <AppHeader />

      <div className="p-6">
        {/* ======== TABS ======== */}
        <div className="flex gap-3 border-b mb-4">
          <button
            onClick={() => setTab("template")}
            className={`px-4 py-2 font-semibold border-b-2 ${
              tab === "template"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Settimana tipo
          </button>

          <button
            onClick={() => setTab("real")}
            className={`px-4 py-2 font-semibold border-b-2 ${
              tab === "real"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Turni reali
          </button>
        </div>

        {/* ======== CONTENUTO ======== */}
        {tab === "template" && <App />}
        {tab === "real" && <RealCalendar />}
      </div>
    </div>
  );
}
