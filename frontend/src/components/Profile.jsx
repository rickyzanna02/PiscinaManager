import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // -------------------------
  // PROFILO
  // -------------------------
  const [profile, setProfile] = useState({
    username: "",
    first_name: "",
    last_name: "",
    date_of_birth: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // -------------------------
  // PASSWORD
  // -------------------------
  const [passwords, setPasswords] = useState({
    old: "",
    new1: "",
    new2: "",
  });

  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  // =====================================================
  // LOAD PROFILO
  // =====================================================
  useEffect(() => {
    api.get("/auth/me/")
      .then((res) => {
        setProfile({
          username: res.data.username,
          first_name: res.data.first_name || "",
          last_name: res.data.last_name || "",
          date_of_birth: res.data.date_of_birth || "",
        });
      });
  }, []);

  // =====================================================
  // SALVA PROFILO
  // =====================================================
  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      await api.put("/auth/me/", {
        first_name: profile.first_name,
        last_name: profile.last_name,
        date_of_birth: profile.date_of_birth || null,
      });

      setProfileMsg("Profilo aggiornato con successo ✅");
    } catch (err) {
      setProfileMsg("Errore nel salvataggio del profilo ❌");
    } finally {
      setSavingProfile(false);
    }
  };

  // =====================================================
  // CAMBIO PASSWORD
  // =====================================================
  const changePassword = async () => {
    setPasswordMsg(null);

    if (passwords.new1 !== passwords.new2) {
      setPasswordMsg("Le nuove password non coincidono");
      return;
    }

    setSavingPassword(true);

    try {
      await api.post("/auth/change-password/", {
        old_password: passwords.old,
        new_password: passwords.new1,
      });

      setPasswordMsg("Password cambiata con successo 🔐");
      setPasswords({ old: "", new1: "", new2: "" });
    } catch (err) {
      setPasswordMsg("Password attuale errata o non valida");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
       <button
            onClick={() => navigate(-1)}
            className="text-sm text-blue-600 hover:underline mb-4"
        >
            ← Torna indietro
        </button> 

      <h1 className="text-2xl font-bold mb-6">Il mio profilo</h1>

      {/* ================= PROFILO ================= */}
      <div className="bg-white p-6 rounded shadow mb-8">
        <h2 className="text-lg font-semibold mb-4">Dati personali</h2>

        {profileMsg && (
          <div className="mb-3 text-sm text-gray-700">
            {profileMsg}
          </div>
        )}

        <label className="block text-sm font-semibold mb-1">
          Username
        </label>
        <input
          value={profile.username}
          disabled
          className="w-full border p-2 rounded mb-3 bg-gray-100"
        />

        <label className="block text-sm font-semibold mb-1">
          Nome
        </label>
        <input
          value={profile.first_name}
          onChange={(e) =>
            setProfile({ ...profile, first_name: e.target.value })
          }
          className="w-full border p-2 rounded mb-3"
        />

        <label className="block text-sm font-semibold mb-1">
          Cognome
        </label>
        <input
          value={profile.last_name}
          onChange={(e) =>
            setProfile({ ...profile, last_name: e.target.value })
          }
          className="w-full border p-2 rounded mb-3"
        />

        <label className="block text-sm font-semibold mb-1">
          Data di nascita
        </label>
        <input
          type="date"
          value={profile.date_of_birth || ""}
          onChange={(e) =>
            setProfile({ ...profile, date_of_birth: e.target.value })
          }
          className="w-full border p-2 rounded mb-4"
        />

        <button
          onClick={saveProfile}
          disabled={savingProfile}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          {savingProfile ? "Salvataggio..." : "Salva modifiche"}
        </button>
      </div>

      {/* ================= PASSWORD ================= */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-lg font-semibold mb-4">Cambia password</h2>

        {passwordMsg && (
          <div className="mb-3 text-sm text-gray-700">
            {passwordMsg}
          </div>
        )}

        <label className="block text-sm font-semibold mb-1">
          Password attuale
        </label>
        <input
          type="password"
          value={passwords.old}
          onChange={(e) =>
            setPasswords({ ...passwords, old: e.target.value })
          }
          className="w-full border p-2 rounded mb-3"
        />

        <label className="block text-sm font-semibold mb-1">
          Nuova password
        </label>
        <input
          type="password"
          value={passwords.new1}
          onChange={(e) =>
            setPasswords({ ...passwords, new1: e.target.value })
          }
          className="w-full border p-2 rounded mb-3"
        />

        <label className="block text-sm font-semibold mb-1">
          Conferma nuova password
        </label>
        <input
          type="password"
          value={passwords.new2}
          onChange={(e) =>
            setPasswords({ ...passwords, new2: e.target.value })
          }
          className="w-full border p-2 rounded mb-4"
        />

        <button
          onClick={changePassword}
          disabled={savingPassword}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          {savingPassword ? "Aggiornamento..." : "Cambia password"}
        </button>
      </div>
    </div>
  );
}