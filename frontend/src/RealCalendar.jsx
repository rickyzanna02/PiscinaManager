import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import itLocale from "@fullcalendar/core/locales/it";
import api from "./api";

// Utility: dd/mm/yyyy
function formatIT(d) {
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function RealCalendar() {
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [calendarKey, setCalendarKey] = useState(0);

  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");

  // popup gestione turno reale
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
   // ✅ tipi di corso per eventuale editing
  const [courseTypes, setCourseTypes] = useState([]);
  const [roles, setRoles] = useState([]);

  // ==========================
  // CARICA UTENTI
  // ==========================
  useEffect(() => {
    api
      .get("/api/users/")
      .then((res) => setUsers(res.data || []))
      .catch((err) => console.error("Errore caricamento utenti:", err));
  }, []);

  // carica tipi corso
  useEffect(() => {
    api
      .get("/api/courses/types/")
      .then((res) => setCourseTypes(res.data || []))
      .catch((err) => console.error("Errore caricamento tipi corso:", err));
  }, []);

  const usernameFromUserField = (userField) => {
    if (!userField) return "—";
    if (typeof userField === "object" && userField.username)
      return userField.username;
    const u = users.find((x) => x.id === userField);
    return u ? u.username : `User #${userField}`;
  };
  // carica ruoli utenti
  useEffect(() => {
    api
      .get("/api/roles/")
      .then((res) => setRoles(res.data || []))
      .catch((err) => console.error("Errore caricamento ruoli:", err));
  }, []);

  // ==========================
  // CARICA TUTTI I TURNI REALI
  // ==========================
  const loadAllShifts = () => {
    setLoading(true);

    api
      .get("/api/shifts/")
      .then((res) => {
        const all = Array.isArray(res.data) ? res.data : [];

        const mapped = all.map((s) => {
          const userId =
            typeof s.user === "number"
              ? s.user
              : s.user && typeof s.user === "object"
              ? s.user.id
              : null;

          const userUsername = (() => {
            if (typeof s.user === "object" && s.user?.username) {
              return s.user.username;
            }
            const u = users.find((x) => x.id === userId);
            return u ? u.username : "—";
          })();

          const startTime = s.start_time?.slice(0, 5);
          const endTime = s.end_time?.slice(0, 5);

          // info corso se presente
          const courseName = s.course_type_data?.name || null;

          const baseTitle = courseName
            ? `${userUsername} – ${s.role} – ${courseName}`
            : `${userUsername} – ${s.role}`;

          let color = "#4ade80";
          let borderColor = "#16a34a";
          let textColor = "#000000";

          if (s.replacement_info?.accepted) {
            if (s.replacement_info.partial) {
              color = "#bfdbfe";
              borderColor = "#1d4ed8";
            } else {
              color = "#ddd6fe";
              borderColor = "#7c3aed";
            }
          }

          return {
            id: s.id,
            title: baseTitle,
            start: `${s.date}T${startTime}`,
            end: `${s.date}T${endTime}`,
            backgroundColor: color,
            borderColor,
            textColor,
            extendedProps: {
              raw: {
                ...s,
                start_time: startTime,
                end_time: endTime,
                user_id: userId,
                user_username: userUsername,
                course_name: courseName,
                course_type_id: s.course_type_data?.id || s.course_type || null,
              },
            },
          };
        });

        setEvents(mapped);
        setCalendarKey((k) => k + 1);
      })
      .catch((err) => {
        console.error("Errore caricamento turni:", err);
        alert("Errore nel caricamento dei turni reali.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (users.length > 0) {
      loadAllShifts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  // ==========================
  // EVENT CLICK → POPUP
  // ==========================
  const openManageFromEvent = (fcEvent) => {
    const raw = fcEvent.extendedProps.raw || {};
    const dateStr =
      raw.date || (fcEvent.startStr ? fcEvent.startStr.slice(0, 10) : "");

    const data = {
      id: raw.id || fcEvent.id,
      user: raw.user_id,
      user_username: raw.user_username,
      role: raw.role || "",
      date: dateStr,
      start_time:
        raw.start_time ||
        (fcEvent.startStr ? fcEvent.startStr.slice(11, 16) : ""),
      end_time:
        raw.end_time ||
        (fcEvent.endStr ? fcEvent.endStr.slice(11, 16) : ""),
      replacement_info: raw.replacement_info || null,
      course: raw.course_type_id || null,        // ✅ id corso
      course_name: raw.course_name || null,      // ✅ nome corso
    };

    setSelectedEvent(data);
    setIsEditing(false);
  };

  // ==========================
  // RENDER EVENTO
  // ==========================
  const renderEventContent = (eventInfo) => {
    const raw = eventInfo.event.extendedProps.raw || {};

    const formatTime = (t) => (t ? t.slice(0, 5) : "");

    const start = formatTime(raw.start_time);
    const end = formatTime(raw.end_time);
    const timeLabel = `${start} - ${end}`;

    const titleUser = raw.user_username || "—";
    const role = raw.role || "";
    const courseName = raw.course_name || "";

    let label = "";

if (role === "istruttore") {
  label = courseName
    ? `${titleUser} – ${courseName}`
    : `${titleUser}`;
} else {
  label = `${titleUser} – ${role}`;
}


    const onButtonClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openManageFromEvent(eventInfo.event);
    };

    return (
      <div className="fc-custom-event flex flex-col items-start text-left">
        <button
          onClick={onButtonClick}
          className="text-[12px] font-semibold bg-white/90 hover:bg-white text-gray-800 border border-gray-300 rounded-md px-2 py-1 leading-tight shadow-sm transition w-3/4"
          style={{ whiteSpace: "normal", lineHeight: "1.2" }}
        >
          <div className="text-[11px] font-normal">{timeLabel}</div>
          <div className="text-[12px] font-semibold">{label}</div>
        </button>
      </div>
    );
  };

  // ==========================
  // AZIONI POPUP: UPDATE / DELETE
  // ==========================
  const handleDelete = async () => {
    if (!selectedEvent) return;
    if (!window.confirm("Sei sicuro di voler eliminare questo turno reale?"))
      return;

    try {
      await api.delete(`/api/shifts/${selectedEvent.id}/`);
      setSelectedEvent(null);
      loadAllShifts();
    } catch (e) {
      console.error(e);
      alert("Errore nell'eliminazione del turno.");
    }
  };

  const handleSave = async () => {
    if (!selectedEvent) return;

    const payload = {
      user: selectedEvent.user,
      role: selectedEvent.role,
      date: selectedEvent.date,
      start_time: selectedEvent.start_time,
      end_time: selectedEvent.end_time,
      course: selectedEvent.course || null,    // ✅ aggiorna corso
    };

    try {
      await api.patch(`/api/shifts/${selectedEvent.id}/`, payload);
      setIsEditing(false);
      setSelectedEvent(null);
      loadAllShifts();
    } catch (e) {
      console.error(e);
      alert("Errore nel salvataggio del turno.");
    }
  };

  // ==========================
  // RENDER POPUP
  // ==========================
  const renderPopup = () => {
    if (!selectedEvent) return null;

    const rep = selectedEvent.replacement_info;

    return (
      <div id="popup-overlay">
        <div className="popup">
          <h2 className="text-lg font-bold mb-3">
            Gestione turno – {formatIT(new Date(selectedEvent.date))}
          </h2>

          {!isEditing ? (
            <>
              <p className="text-sm mb-1">
                <strong>Orario:</strong>{" "}
                {selectedEvent.start_time?.slice(0, 5)} –{" "}
                {selectedEvent.end_time?.slice(0, 5)}
              </p>
              <p className="text-sm mb-1">
                <strong>Collaboratore:</strong>{" "}
                {usernameFromUserField(selectedEvent.user)}
              </p>

              <p className="text-sm mb-1">
                <strong>Ruolo:</strong> {selectedEvent.role}
              </p>

              {selectedEvent.role === "istruttore" && (
              <p className="text-sm mb-3">
                <strong>Tipo corso:</strong>{" "}
                {selectedEvent.course_name || "—"}
              </p>
            )}


              {rep && rep.accepted && (
                <div className="text-xs mb-3 p-2 rounded bg-blue-50 border border-blue-200">
                  <strong>Sostituzione accettata</strong>
                  <br />
                  Richiesta da:{" "}
                  {users.find((u) => u.id === rep.requester_id)?.username ||
                    "—"}
                  <br />
                  Accettata da: {rep.accepted_by_username}
                  <br />
                  Orario:{" "}
                  {rep.partial
                    ? `${rep.partial_start.slice(0, 5)} – ${rep.partial_end.slice(0, 5)}`
                    : `${rep.original_start.slice(0, 5)} – ${rep.original_end.slice(0, 5)}`}
                  <br />
                  Tipo sostituzione: {rep.partial ? "Parziale" : "Intero turno"}
                  <br />
                </div>
              )}

              <button
                className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded w-full mb-2"
                onClick={() => setIsEditing(true)}
              >
                ✏️ Modifica turno
              </button>

              <button
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded w-full mb-2"
                onClick={handleDelete}
              >
                🗑️ Elimina turno
              </button>

              <button
                className="bg-gray-300 hover:bg-gray-400 transition px-3 py-1 rounded w-full"
                onClick={() => setSelectedEvent(null)}
              >
                Chiudi
              </button>
            </>
          ) : (
            <>
              <h3 className="text-md font-semibold mb-2">Modifica turno</h3>

              {/* Data */}
              <label className="block mb-1 text-sm font-semibold">Data</label>
              <input
                type="date"
                className="w-full border p-2 rounded mb-3"
                value={selectedEvent.date}
                onChange={(e) =>
                  setSelectedEvent((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
              />

              {/* Orari */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="block mb-1 text-sm font-semibold">
                    Inizio
                  </label>
                  <input
                    type="time"
                    className="w-full border p-2 rounded"
                    value={selectedEvent.start_time}
                    onChange={(e) =>
                      setSelectedEvent((prev) => ({
                        ...prev,
                        start_time: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex-1">
                  <label className="block mb-1 text-sm font-semibold">
                    Fine
                  </label>
                  <input
                    type="time"
                    className="w-full border p-2 rounded"
                    value={selectedEvent.end_time}
                    onChange={(e) =>
                      setSelectedEvent((prev) => ({
                        ...prev,
                        end_time: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Collaboratore */}
              <label className="block mb-1 text_sm font-semibold">
                Collaboratore
              </label>
              <select
                className="w-full border p-2 rounded mb-3"
                value={selectedEvent.user}
                onChange={(e) =>
                  setSelectedEvent((prev) => ({
                    ...prev,
                    user: parseInt(e.target.value),
                  }))
                }
              >
                <option value="" disabled>
                  Seleziona collaboratore…
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.role})
                  </option>
                ))}
              </select>

              {/* ✅ Corso */}
              <label className="block mb-1 text-sm font-semibold">
                Corso
              </label>
              <select
                className="w-full border p-2 rounded mb-3"
                value={selectedEvent.course || ""}
                onChange={(e) =>
                  setSelectedEvent((prev) => ({
                    ...prev,
                    course: e.target.value ? parseInt(e.target.value) : null,
                    course_name:
                      courseTypes.find(
                        (ct) => ct.id === parseInt(e.target.value)
                      )?.name || null,
                  }))
                }
              >
                <option value="" disabled> Seleziona un tipo di corso</option>
                {courseTypes.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.name}
                    {ct.default_minutes
                      ? ` (${ct.default_minutes} min)`
                      : ""}
                  </option>
                ))}
              </select>

              <button
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded w-full mb-2"
                onClick={handleSave}
              >
                💾 Salva modifiche
              </button>

              <button
                className="bg-gray-300 hover:bg-gray-400 transition px-3 py-1 rounded w-full"
                onClick={() => setIsEditing(false)}
              >
                Annulla
              </button>
            </>
          )}
        </div>
      </div>
    );
  };




  // ==========================
  // RENDER COMPLETO
  // ==========================
  const filteredEvents =
    roleFilter === ""
      ? events
      : events.filter((e) => {
          const raw = e.extendedProps?.raw;
          return raw?.role === roleFilter;
        });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Turni reali (calendario settimanale)
      </h1>

      {/* Barra controlli */}
      <div className="flex items-center flex-wrap gap-3 mb-4">
        {/* Filtro ruolo */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm font-semibold">Ruolo:</span>
          <select
            className="border p-2 rounded"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Tutti i ruoli</option>

            {roles
              .filter((r) => r.code !== "contabilita") // HARDCODE: escludi "contabilita" tra i ruoli selezionabili nel filtro
              .map((r) => (
                <option key={r.id} value={r.code}>
                  {r.label}
                </option>
              ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="mb-2 text-sm text-gray-500">Caricamento turni...</div>
      )}

      {/* Calendario */}
      <div className="admin-calendar">
        <FullCalendar
          key={calendarKey}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          firstDay={1}
          locale={itLocale}
          slotLabelFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
          dayHeaderFormat={{
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          }}
          allDaySlot={false}
          selectable={false}
          selectMirror={false}
          events={filteredEvents}
          eventContent={renderEventContent}
          eventClick={(info) => {
            info.jsEvent.preventDefault();
            info.jsEvent.stopPropagation();
            openManageFromEvent(info.event);
          }}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          height="auto"
        />
      </div>

      {renderPopup()}
    </div>
  );
} 
