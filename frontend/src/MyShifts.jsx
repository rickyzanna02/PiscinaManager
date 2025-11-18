import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import itLocale from "@fullcalendar/core/locales/it";
import api from "./api";
import "./myshifts.css";

export default function MyShifts({ userId }) {
  const [shifts, setShifts] = useState([]);

  // --- TABS: "turni" / "sostituzioni" ---
  const [activeTab, setActiveTab] = useState("shifts");

  // --- Popup gestione sostituzioni ---
  const [selectedShift, setSelectedShift] = useState(null); // FullCalendar event (con id = shift.id)
  const [step, setStep] = useState(null); // "choose-type" | "choose-full-or-partial" | "partial-time" | "choose-users"
  const [partial, setPartial] = useState(false);
  const [partialStart, setPartialStart] = useState("");
  const [partialEnd, setPartialEnd] = useState("");
  const [collaborators, setCollaborators] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // --- Richieste sostituzione ---
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
        // colore base
        let color = s.approved ? "#4ade80" : "#facc15";
        let clickable = true;
        let title = s.role;

        // --- 🔥 Gestione sostituzioni accettate ---
        if (s.replacement_info?.accepted) {
          // 👤 Sono il RICHIEDENTE che ha chiesto la sostituzione
          if (s.replacement_info.requester_id === userId) {
            color = "#9ca3af"; // grigio
            clickable = false;
            title = `Sostituito da ${s.replacement_info.accepted_by_username}`;
          }

          // 👤 Sono il SOSTITUTO che ha accettato la sostituzione
          if (s.replacement_info.accepted_by_id === userId) {
            color = "#60a5fa"; // blu chiaro
            clickable = true; // posso cliccare e fare richieste
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
  // CARICA COLLABORATORI (per scegliere a chi chiedere)
  // =====================================================
  const loadCollaborators = () => {
    api
      .get("users/")
      .then((res) => {
        const list = (res.data || []).filter((u) => u.id !== userId);
        setCollaborators(list);
      })
      .catch((err) => console.error("Errore caricamento utenti:", err));
  };

  // =====================================================
  // CARICA RICHIESTE INVIATE / RICEVUTE dal backend
  // (usa gli endpoint già esistenti: replacements_sent / replacements_received)
  // =====================================================
  const loadRequests = () => {
    if (!userId) return;

    // richieste INVIATE
    api
      .get(`shifts/replacements_sent/?user_id=${userId}`)
      .then((res) => {
        setSentRequests(res.data || []);
      })
      .catch((err) =>
        console.error("Errore caricamento richieste inviate:", err)
      );

    // richieste RICEVUTE
    api
      .get(`shifts/replacements_received/?user_id=${userId}`)
      .then((res) => {
        setReceivedRequests(res.data || []);
      })
      .catch((err) =>
        console.error("Errore caricamento richieste ricevute:", err)
      );
  };

  useEffect(() => {
    if (userId) {
      loadShifts();
      loadCollaborators();
      loadRequests();
    }
  }, [userId]);

  // =====================================================
  // APRI POPUP SOSTITUZIONE
  // =====================================================
  const openReplacementPopup = (fcEvent) => {
    setSelectedShift(fcEvent); // fcEvent.id = shift.id dal backend
    setStep("choose-type");
    setPartial(false);
    setPartialStart("");
    setPartialEnd("");
    setSelectedUsers([]);
  };

  // =====================================================
  // INVIA RICHIESTE SOSTITUZIONE
  // =====================================================
  const sendReplacementRequests = async () => {
    if (!selectedShift) return;

    if (selectedUsers.length === 0) {
      alert("Seleziona almeno un collaboratore");
      return;
    }

    const payload = {
      target_users: selectedUsers,
      partial: partial,
      partial_start: partial ? partialStart : null,
      partial_end: partial ? partialEnd : null,
    };

    try {
      await api.post(`shifts/${selectedShift.id}/ask_replacement/`, payload);
      alert("Richieste inviate!");
      setSelectedShift(null);
      setStep(null);
      setSelectedUsers([]);
      loadRequests();
    } catch (err) {
      console.error("Errore invio richieste:", err);
      alert("Errore nell'invio delle richieste di sostituzione.");
    }
  };

  // =====================================================
  // ACCETTA / RIFIUTA UNA RICHIESTA
  // Usa l'endpoint: POST /shifts/respond_replacement/
  // con body { request_id, action: "accept" | "reject" }
  // =====================================================
  const respond = async (id, status) => {
    const action = status === "accepted" ? "accept" : "reject";

    try {
      await api.post("shifts/respond_replacement/", {
        request_id: id,
        action,
      });
      loadRequests();
    } catch (err) {
      console.error("Errore risposta richiesta:", err);
      alert("Errore nella risposta alla richiesta.");
    }
  };

  // =====================================================
  // RENDER CALENDARIO (TAB "I MIEI TURNI")
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
        if (!info.event.extendedProps.clickable) return; // ⛔ blocca click
        info.jsEvent.preventDefault();
        info.jsEvent.stopPropagation();
        openReplacementPopup(info.event);
      }}
      eventContent={(info) => {
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
        div.className = "myshift-event-btn";

        div.innerHTML = `
          <div><strong>${start} - ${end}</strong></div>
          <div>${info.event.title}</div>
        `;

        div.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          info.view.calendar.trigger("eventClick", {
            event: info.event,
            jsEvent: e,
            view: info.view,
          });
        };

        return { domNodes: [div] };
      }}
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
              {r.shift?.role} – {r.shift?.date}
            </div>
            <div>
              Orario: {r.shift?.start_time} – {r.shift?.end_time}
            </div>
            {r.partial && (
              <div>
                Parte richiesta: {r.partial_start} → {r.partial_end}
              </div>
            )}
            <div>
              Verso utente ID: <strong>{r.target_user}</strong>
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
          <div className="text-gray-500 text-sm">
            Nessuna richiesta ricevuta.
          </div>
        )}

        {receivedRequests.map((r) => (
          <div key={r.id} className="border p-2 mb-2 rounded text-sm">
            <div className="font-semibold">
              {r.shift?.role} – {r.shift?.date}
            </div>
            <div>
              Orario: {r.shift?.start_time} – {r.shift?.end_time}
            </div>
            {r.partial && (
              <div>
                Parte richiesta: {r.partial_start} → {r.partial_end}
              </div>
            )}
            <div>
              Richiesta da utente ID: <strong>{r.requester}</strong>
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
  // POPUP SOSTITUZIONE
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
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded shadow p-6 w-[420px]">
          {/* STEP 1 — scelta azione */}
          {step === "choose-type" && (
            <>
              <h2 className="font-bold text-lg mb-3">
                Turno {selectedShift.title} ({startLabel}–{endLabel})
              </h2>
              <p className="text-sm mb-4 text-gray-600">
                Seleziona cosa vuoi fare con questo turno.
              </p>

              {/* Azione principale: richiesta sostituzione */}
              <button
                className="w-full bg-blue-500 text-white px-3 py-2 rounded mb-2"
                onClick={() => {
                  setPartial(false);
                  setStep("choose-full-or-partial");
                }}
              >
                📢 Richiedi sostituzione
              </button>

              {/* Dummy 1 */}
              <button
                className="w-full bg-gray-200 text-gray-700 px-3 py-2 rounded mb-2"
                onClick={() => alert("Funzione non ancora disponibile")}
              >
                ⭐ Azione futura 1 (dummy)
              </button>

              {/* Dummy 2 */}
              <button
                className="w-full bg-gray-200 text-gray-700 px-3 py-2 rounded"
                onClick={() => alert("Funzione non ancora disponibile")}
              >
                ⚙️ Azione futura 2 (dummy)
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

          {/* STEP 1b — intero turno / parte del turno */}
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
                  setPartialStart(startLabel.replace(".", ":").slice(0, 5));
                  setPartialEnd(endLabel.replace(".", ":").slice(0, 5));
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

          {/* STEP 2 — inserisci orari parziali */}
          {step === "partial-time" && (
            <>
              <h2 className="font-bold mb-4">Seleziona orario da coprire</h2>
              <p className="text-xs text-gray-500 mb-2">
                Turno originale: {startLabel} – {endLabel}
              </p>

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

          {/* STEP 3 — scegli collaboratori */}
          {step === "choose-users" && (
            <>
              <h2 className="font-bold mb-4">Seleziona collaboratori</h2>

              <div className="max-h-48 overflow-y-auto mb-4 border rounded p-2 text-sm">
                {collaborators.length === 0 && (
                  <div className="text-gray-500">
                    Nessun altro collaboratore disponibile.
                  </div>
                )}
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
                      {u.role ? (
                        <span className="text-xs text-gray-500">
                          ({u.role})
                        </span>
                      ) : null}
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
      {/* --- TABS --- */}
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

      {/* --- CONTENUTO TAB --- */}
      {activeTab === "shifts" ? renderCalendar() : renderRequests()}

      {/* --- POPUP SOSTITUZIONE --- */}
      {renderPopup()}
    </div>
  );
}
