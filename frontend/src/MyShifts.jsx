import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import itLocale from "@fullcalendar/core/locales/it";
import api from "./api";
import "./myshifts.css";

export default function MyShifts({ userId }) {
  const [shifts, setShifts] = useState([]);

  // --- Tabs
  const [activeTab, setActiveTab] = useState("shifts");

  // --- Popup gestione sostituzioni
  const [selectedShift, setSelectedShift] = useState(null);
  const [step, setStep] = useState(null);
  const [partial, setPartial] = useState(false);
  const [partialStart, setPartialStart] = useState("");
  const [partialEnd, setPartialEnd] = useState("");
  const [collaborators, setCollaborators] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // --- Richieste sostituzione
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);

  // =====================================================
  // CARICA TURNI
  // =====================================================
  const loadShifts = () => {
    api
      .get(`shifts/?user=${userId}`)
      .then((res) => {
        const mapped = res.data.map((s) => {
          let color = "#3b82f6"; // blu
          let clickable = true;
          let title = s.role;

          // 🔥 Gestione sostituzioni accettate
          if (s.replacement_info?.accepted) {
            if (s.replacement_info.requester_id === userId) {
              color = "#9ca3af"; // grigio
              clickable = false;
              title = `Sostituito da ${s.replacement_info.accepted_by_username}`;
            }

            if (s.replacement_info.accepted_by_id === userId) {
              color = "#60a5fa"; // azzurro
              clickable = true;
            }
          }

          return {
            id: s.id,
            title,
            start: `${s.date}T${s.start_time}`,
            end: `${s.date}T${s.end_time}`,
            color,
            extendedProps: { clickable },
          };
        });

        setShifts(mapped);
      })
      .catch((err) => console.error("Errore caricamento turni:", err));
  };

  // =====================================================
  // CARICA COLLABORATORI
  // =====================================================
  const loadCollaborators = () => {
    api
      .get("users/")
      .then((res) => {
        setCollaborators((res.data || []).filter((u) => u.id !== userId));
      })
      .catch((err) => console.error("Errore caricamento utenti:", err));
  };

  // =====================================================
  // CARICA RICHIESTE INVIATE / RICEVUTE
  // =====================================================
  const loadRequests = () => {
    if (!userId) return;

    api
      .get(`shifts/replacements_sent/?user_id=${userId}`)
      .then((res) => setSentRequests(res.data || []));

    api
      .get(`shifts/replacements_received/?user_id=${userId}`)
      .then((res) => setReceivedRequests(res.data || []));
  };

  useEffect(() => {
    if (userId) {
      loadShifts();
      loadCollaborators();
      loadRequests();
    }
  }, [userId]);

  // =====================================================
  // APERTURA POPUP SOSTITUZIONE
  // =====================================================
  const openReplacementPopup = (fcEvent) => {
    setSelectedShift(fcEvent);
    setStep("choose-type");
    setPartial(false);
    setPartialStart("");
    setPartialEnd("");
    setSelectedUsers([]);
  };

  // =====================================================
  // INVIO RICHIESTE SOSTITUZIONE
  // =====================================================
  const sendReplacementRequests = async () => {
    if (!selectedShift) return;
    if (selectedUsers.length === 0) return alert("Seleziona almeno un collaboratore");

    const payload = {
      target_users: selectedUsers,
      partial,
      partial_start: partial ? partialStart : null,
      partial_end: partial ? partialEnd : null,
    };

    try {
      await api.post(`shifts/${selectedShift.id}/ask_replacement/`, payload);
      alert("Richieste inviate!");
      setSelectedShift(null);
      setStep(null);
      loadRequests();
    } catch {
      alert("Errore nell'invio delle richieste.");
    }
  };

  // =====================================================
  // ACCETTA / RIFIUTA
  // =====================================================
  const respond = async (id, status) => {
    const action = status === "accepted" ? "accept" : "reject";

    try {
      await api.post("shifts/respond_replacement/", {
        request_id: id,
        action,
      });
      loadRequests();
    } catch {
      alert("Errore nella risposta.");
    }
  };

  // =====================================================
  // EVENTO (STILE ADMIN)
  // =====================================================
  const renderEventContent = (info) => {
    const start = info.event.start.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const end = info.event.end.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const div = document.createElement("div");
    div.className = "fc-custom-event w-full";

    div.innerHTML = `
      <button>
        <div>${start} - ${end}</div>
        <div class="font-semibold">${info.event.title}</div>
      </button>
    `;

    div.querySelector("button").onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      info.view.calendar.trigger("eventClick", {
        event: info.event,
        jsEvent: e,
        view: info.view,
      });
    };

    return { domNodes: [div] };
  };

  // =====================================================
  // CALENDARIO
  // =====================================================
  const renderCalendar = () => (
    <div className="collab-calendar">
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        firstDay={1}
        locale={itLocale}
        allDaySlot={false}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        events={shifts}
        height="auto"
        eventClick={(info) => {
          if (!info.event.extendedProps.clickable) return;
          info.jsEvent.preventDefault();
          info.jsEvent.stopPropagation();
          openReplacementPopup(info.event);
        }}
        eventContent={renderEventContent}
      />
    </div>
  );

  // =====================================================
  // RENDER TAB SOSTITUZIONI
  // =====================================================
  const renderRequests = () => (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* --- RICHIESTE INVIATE --- */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-bold text-lg mb-2">Richieste inviate</h2>

        {sentRequests.length === 0 && (
          <div className="text-gray-500 text-sm">
            Nessuna richiesta inviata.
          </div>
        )}

        {sentRequests.map((r) => (
          <div key={r.id} className="border p-2 mb-2 rounded text-sm">
            <div className="font-semibold">
              {r.shift_info.role} – {r.shift_info.date}
            </div>
            <div>Orario: {r.shift_info.start_time} – {r.shift_info.end_time}</div>

            {r.partial && (
              <div>
                Parte richiesta: {r.partial_start} → {r.partial_end}
              </div>
            )}

            <div>
              Verso: <strong>{r.target_user_name}</strong>
            </div>

            <div>
              Stato:{" "}
              <strong>
                {r.status === "pending"
                  ? "In attesa"
                  : r.status === "accepted"
                  ? "Accettata"
                  : r.status === "rejected"
                  ? "Rifiutata"
                  : "Cancellata"}
              </strong>
            </div>
          </div>
        ))}
      </div>

      {/* --- RICHIESTE RICEVUTE --- */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-bold text-lg mb-2">Richieste ricevute</h2>

        {receivedRequests.length === 0 && (
          <div className="text-gray-500 text-sm">Nessuna richiesta ricevuta.</div>
        )}

        {receivedRequests.map((r) => (
          <div key={r.id} className="border p-2 mb-2 rounded text-sm">
            <div className="font-semibold">
              {r.shift_info.role} – {r.shift_info.date}
            </div>
            <div>Orario: {r.shift_info.start_time} – {r.shift_info.end_time}</div>

            {r.partial && (
              <div>
                Parte richiesta: {r.partial_start} → {r.partial_end}
              </div>
            )}

            <div>
              Richiesta da: <strong>{r.requester_name}</strong>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                onClick={() => respond(r.id, "accepted")}
              >
                Accetta
              </button>

              <button
                className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                onClick={() => respond(r.id, "rejected")}
              >
                Rifiuta
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );


  // =====================================================
  // POPUP (identico admin)
  // =====================================================
  const renderPopup = () => {
    if (!selectedShift) return null;

    const shiftStart = new Date(selectedShift.start);
    const shiftEnd = new Date(selectedShift.end);

    const startLabel = shiftStart.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const endLabel = shiftEnd.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return (
      <div id="popup-overlay-shifts">
        <div className="popup">
          {/* STEP 1 */}
          {step === "choose-type" && (
            <>
              <h2 className="font-bold text-lg mb-3">
                Turno {selectedShift.title} ({startLabel}–{endLabel})
              </h2>
              <p className="text-sm mb-4 text-gray-600">
                Seleziona cosa vuoi fare con questo turno.
              </p>

              <button
                className="w-full bg-blue-500 text-white px-3 py-2 rounded mb-2"
                onClick={() => {
                  setPartial(false);
                  setStep("choose-full-or-partial");
                }}
              >
                📢 Richiedi sostituzione
              </button>

              <button className="w-full bg-gray-200 text-gray-700 px-3 py-2 rounded mb-2">
                ⭐ Azione futura 1
              </button>

              <button className="w-full bg-gray-200 text-gray-700 px-3 py-2 rounded">
                ⚙️ Azione futura 2
              </button>

              <button
                className="mt-4 w-full bg-gray-300 py-2 rounded"
                onClick={() => {
                  setSelectedShift(null);
                  setStep(null);
                }}
              >
                Chiudi
              </button>
            </>
          )}

          {/* STEP 1b */}
          {step === "choose-full-or-partial" && (
            <>
              <h2 className="font-bold text-lg mb-3">Richiedi sostituzione</h2>
              <p className="text-sm mb-4 text-gray-600">
                Vuoi richiederla per tutto il turno o solo per una parte?
              </p>

              <button
                className="w-full bg-blue-600 text-white px-3 py-2 rounded mb-2"
                onClick={() => {
                  setPartial(false);
                  setStep("choose-users");
                }}
              >
                Intero turno ({startLabel}–{endLabel})
              </button>

              <button
                className="w-full bg-orange-500 text-white px-3 py-2 rounded"
                onClick={() => {
                  setPartial(true);
                  setPartialStart(startLabel.slice(0, 5));
                  setPartialEnd(endLabel.slice(0, 5));
                  setStep("partial-time");
                }}
              >
                Solo una parte del turno
              </button>

              <button
                className="mt-4 w-full bg-gray-300 py-2 rounded"
                onClick={() => {
                  setSelectedShift(null);
                  setStep(null);
                }}
              >
                Annulla
              </button>
            </>
          )}

          {/* STEP 2 */}
          {step === "partial-time" && (
            <>
              <h2 className="font-bold mb-4">Seleziona orario da coprire</h2>

              <label className="block text-sm mb-1">Inizio</label>
              <input
                type="time"
                className="w-full border p-2 rounded mb-3"
                value={partialStart}
                onChange={(e) => setPartialStart(e.target.value)}
              />

              <label className="block text-sm mb-1">Fine</label>
              <input
                type="time"
                className="w-full border p-2 rounded mb-4"
                value={partialEnd}
                onChange={(e) => setPartialEnd(e.target.value)}
              />

              <button
                className="w-full bg-blue-600 text-white py-2 rounded mb-2"
                onClick={() => setStep("choose-users")}
              >
                Continua
              </button>

              <button
                className="w-full bg-gray-300 py-2 rounded"
                onClick={() => {
                  setSelectedShift(null);
                  setStep(null);
                }}
              >
                Annulla
              </button>
            </>
          )}

          {/* STEP 3 */}
          {step === "choose-users" && (
            <>
              <h2 className="font-bold mb-4">Seleziona collaboratori</h2>

              <div className="max-h-48 overflow-y-auto mb-4 border rounded p-2 text-sm">
                {collaborators.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers((prev) =>
                            prev.includes(u.id) ? prev : [...prev, u.id]
                          );
                        } else {
                          setSelectedUsers((prev) =>
                            prev.filter((x) => x !== u.id)
                          );
                        }
                      }}
                    />
                    <span>
                      {u.username}{" "}
                      <span className="text-xs text-gray-500">({u.role})</span>
                    </span>
                  </label>
                ))}
              </div>

              <button
                className="w-full bg-green-600 text-white py-2 rounded mb-2"
                onClick={sendReplacementRequests}
              >
                Invia richieste
              </button>

              <button
                className="w-full bg-gray-300 py-2 rounded"
                onClick={() => {
                  setSelectedShift(null);
                  setStep(null);
                }}
              >
                Annulla
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // =====================================================
  // RENDER COMPLETO
  // =====================================================
  return (
    <div className="p-6 myshifts-wrapper">
      {/* TABS */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab("shifts")}
          className={`px-4 py-2 rounded ${
            activeTab === "shifts"
              ? "bg-blue-600 text-white"
              : "bg-gray-300 text-gray-800"
          }`}
        >
          I miei turni
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 rounded ${
            activeTab === "requests"
              ? "bg-blue-600 text-white"
              : "bg-gray-300 text-gray-800"
          }`}
        >
          Sostituzioni
        </button>
      </div>

      {activeTab === "shifts" ? renderCalendar() : renderRequests()}
      {renderPopup()}
    </div>
  );
}
