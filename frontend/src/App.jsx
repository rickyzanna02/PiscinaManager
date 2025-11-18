import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import api from "./api";
import itLocale from "@fullcalendar/core/locales/it";

export default function App() {
  const [category, setCategory] = useState("bagnini");
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [calendarKey, setCalendarKey] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // NUOVO: stato per popup "Inserisci corso" (istruttori)
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState({
    weekday: 0,              // 0=Lun ... 6=Dom (BACKEND)
    start_time: "06:00",
    end_time: "",            // 👈 aggiunto per propaganda/agonismo
    course_type: "scuola_nuoto",
    user: "",
  });
  const [showQuickModal, setShowQuickModal] = useState(false);

  const [quickForm, setQuickForm] = useState({
    weekday: 0,
    group: "bambini",
    selectedTimes: {},
    user: "",
  });


  // mappa tipi corso → durata minuti + etichetta
  const COURSE_TYPES = {
    scuola_nuoto: { label: "Scuola nuoto", minutes: 40 },
    scuola_nuoto_adulti: { label: "Scuola nuoto adulti", minutes: 45 },
    fitness: { label: "Fitness", minutes: 45 },
    propaganda: { label: "Propaganda", minutes: null },
    agonismo: { label: "Agonismo", minutes: null },
  };
  const QUICK_COURSES = {
  bambini: {
    label: "Corsi bambini (40 min)",
    minutes: 40,
    times: ["16:00", "16:40", "17:20", "18:00"],
  },
  adulti: {
    label: "Corsi adulti (45 min)",
    minutes: 45,
    times: ["08:30", "09:15", "18:45", "19:30", "20:15"],
  },
  fitness: {
    label: "Fitness (45 min)",
    minutes: 45,
    times: [
      "07:00", "07:45", "08:30", "09:15", "10:00",
      "12:45", "13:30", "14:15",
      "18:00", "18:45", "19:30", "20:15"
    ],
  },
};


  // util
  const hhmm = (t) => (t ? String(t).slice(0, 5) : "");
  const usernameById = (id) => users.find((u) => u.id === id)?.username || "—";
  const jsToBackendWeekday = (jsDay) => (jsDay + 6) % 7; // JS: 0=Dom → BE: 0=Lun
  const addMinutes = (timeHHMM, minutes) => {
    const [h, m] = timeHHMM.split(":").map((x) => parseInt(x, 10));
    const base = new Date(2000, 0, 1, h, m, 0);
    const end = new Date(base.getTime() + minutes * 60000);
    const eh = String(end.getHours()).padStart(2, "0");
    const em = String(end.getMinutes()).padStart(2, "0");
    return `${eh}:${em}`;
  };

  // carica utenti
  useEffect(() => {
    api.get("users/").then((res) => setUsers(res.data || []));
  }, []);

  // ricarica events dai template
  const loadEvents = () => {
    api.get(`templates/?category=${category}`).then((res) => {
      const rows = Array.isArray(res.data) ? res.data : [];
      const mapped = rows.map((t) => {
        const userId = typeof t.user === "number" ? t.user : t.user?.id ?? null;
        const title =
          typeof t.user === "object" ? t.user.username ?? "—" : usernameById(userId);

        return {
          id: t.id,
          title: title || "—",
          color: userId ? "#4ade80" : "#facc15",
          textColor: "#000000",
          startRecur: "2024-01-01",
          // allineamento BE→FE: 0=Lun(BE) → 1=Lun(FE) ; 6=Dom → 0=Dom
          daysOfWeek: [(t.weekday + 1) % 7],
          startTime: hhmm(t.start_time),
          endTime: hhmm(t.end_time),
          extendedProps: {
            user: userId,
            startTime: hhmm(t.start_time),
            endTime: hhmm(t.end_time),
            category,
          },
        };
      });

      setEvents(mapped);
      setCalendarKey((k) => k + 1);
    });
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, users]);

  // selezione drag (creazione turno “generico”)
  const handleSelect = (info) => {
    const diffMinutes = (info.end - info.start) / (1000 * 60);
    if (diffMinutes < 20) return;
    setSelectedSlot(info);
  };

  // crea turno generico
  const handleAssign = (userId) => {
    if (!selectedSlot) return;

    const weekday = jsToBackendWeekday(selectedSlot.start.getDay());
    const start = hhmm(selectedSlot.start.toTimeString());
    const end = hhmm(selectedSlot.end.toTimeString());

    const payload = {
      category,
      user: userId,
      weekday,
      start_time: start,
      end_time: end,
    };

    api
      .post("templates/", payload)
      .then(() => {
        setSelectedSlot(null);
        loadEvents();
      })
      .catch((err) => {
        console.error("Errore nel salvataggio:", err);
        alert("Errore nel salvataggio del turno");
      });
  };

  // elimina
  const handleDelete = (id) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo turno?")) return;
    api.delete(`templates/${id}/`).then(() => {
      setSelectedEvent(null);
      loadEvents();
    });
  };

  // aggiorna
  const handleUpdate = (id, updated) => {
    const payload = {
      ...updated,
      start_time: hhmm(updated.start_time),
      end_time: hhmm(updated.end_time),
    };

    api.patch(`templates/${id}/`, payload).then(() => {
      setSelectedEvent(null);
      loadEvents();
    });
  };

  // richiesta sostituzione
  const handleNotify = (event) => {
    api.post("notify_replacement/", { shift_id: event.id }).then(() => {
      alert("Richiesta di sostituzione inviata a tutti gli utenti.");
      setSelectedEvent(null);
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, color: "#60a5fa" } : e))
      );
      setCalendarKey((k) => k + 1);
    });
  };

  const openManageFromEvent = (fcEvent) => {
    const data = {
      id: fcEvent.id,
      title: fcEvent.title,
      user: fcEvent.extendedProps.user || "",
      startTime:
        fcEvent.extendedProps.startTime ||
        (fcEvent.startStr ? fcEvent.startStr.slice(11, 16) : ""),
      endTime:
        fcEvent.extendedProps.endTime ||
        (fcEvent.endStr ? fcEvent.endStr.slice(11, 16) : ""),
    };
    setSelectedEvent(data);
    setIsEditing(false);
    setSelectedSlot(null);
  };

  const renderEventContent = (eventInfo) => {
    const start =
      eventInfo.event.extendedProps.startTime ||
      (eventInfo.event.startStr ? eventInfo.event.startStr.slice(11, 16) : "");
    const end =
      eventInfo.event.extendedProps.endTime ||
      (eventInfo.event.endStr ? eventInfo.event.endStr.slice(11, 16) : "");
    const timeLabel = `${start} - ${end}`;
    const userLabel = eventInfo.event.title || "—";

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
          <div className="text-[12px] font-semibold">{userLabel}</div>
        </button>
      </div>
    );
  };

  // ====== INSERISCI CORSO (solo per categoria "istruttori") ======
  const openCourseModal = () => {
    setCourseForm({
      weekday: 0,
      start_time: "06:00",
      end_time: "",
      course_type: "scuola_nuoto",
      user: "",
    });
    setShowCourseModal(true);
  };

  const saveCourse = async () => {
    const { weekday, start_time, end_time, course_type, user } = courseForm;
    if (!user) {
      alert("Seleziona un collaboratore");
      return;
    }

    const def = COURSE_TYPES[course_type] || COURSE_TYPES.scuola_nuoto;
    let finalEnd = end_time;
    if (def.minutes) {
      finalEnd = addMinutes(start_time, def.minutes);
    } else if (!finalEnd) {
      alert("Specifica l’orario di fine per questo corso");
      return;
    }

    const payload = {
      category: "istruttori",
      user,
      weekday,
      start_time,
      end_time: finalEnd,
    };

    try {
      await api.post("templates/", payload);
      setShowCourseModal(false);
      loadEvents();
    } catch (e) {
      console.error(e);
      alert("Errore nel salvataggio del corso");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gestione settimana tipo</h1>

      {/* --- Selezione categoria e azioni --- */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          className="border p-2 rounded"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="bagnini">Bagnini</option>
          <option value="istruttori">Istruttori</option>
          <option value="segreteria">Segreteria</option>
          <option value="pulizie">Pulizie</option>
        </select>

        {category === "istruttori" && (
        <>
          <button
            onClick={openCourseModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded"
          >
            ➕ Inserisci corso
          </button>

          <button
            onClick={() => {
              // reset iniziale
              setQuickForm({
                weekday: 0,
                group: "bambini",
                selectedTimes: {},
                user: "",
              });
              setShowQuickModal(true);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded"
          >
            ⚡ Inserimento veloce
          </button>
        </>
      )}




        {/* 👇 Pulsanti pubblicazione */}
        <button
          onClick={async () => {
            try {
              await api.post("shifts/publish_week/", { category });
              alert("Pubblicazione completata");
              loadEvents();
            } catch (e) {
              console.error(e);
              alert("Errore nella pubblicazione della settimana");
            }
          }}
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded"
        >
          📆 Pubblica settimana
        </button>

        <button
          onClick={async () => {
            try {
              await api.post("shifts/publish_month/", { category });
              alert("Pubblicazione completata");
              loadEvents();
            } catch (e) {
              console.error(e);
              alert("Errore nella pubblicazione del mese");
            }
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded"
        >
          📅 Pubblica mese
        </button>
      </div>

      {/* --- Calendario --- */}
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
        selectable={true}
        selectMirror={true}
        selectOverlap={true}
        eventOverlap={true}
        editable={false}
        allDaySlot={false}
        events={events}
        select={handleSelect}
        eventContent={renderEventContent}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        height="auto"
      />

      {/* ... resto identico al tuo (popup assegnazione, gestione turno e inserisci corso) ... */}


      {/* --- Popup assegnazione / inserimento corso (drag & drop) --- */}
      {selectedSlot && (
        <div id="popup-overlay">
          <div className="popup">
            {category === "istruttori" ? (
              <>
                <h2 className="text-lg font-bold mb-3">Inserisci corso</h2>

                <p className="text-sm mb-4 text-gray-600">
                  Giorno:{" "}
                  {selectedSlot.start.toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  <br />
                  Orario:{" "}
                  {selectedSlot.start.toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}{" "}
                  –{" "}
                  {selectedSlot.end.toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </p>

                {/* Tipo corso */}
                <label className="block mb-2 font-semibold">Tipo di corso</label>
                <select
                  className="w-full border p-2 rounded mb-3"
                  defaultValue="scuola_nuoto"
                  id="drag-course-type"
                >
                  {Object.entries(COURSE_TYPES).map(([key, { label, minutes }]) => (
                    <option key={key} value={key}>
                      {label} {minutes ? `(${minutes} min)` : ""}
                    </option>
                  ))}
                </select>

                {/* Istruttore */}
                <label className="block mb-2 font-semibold">Istruttore</label>
                <select
                  className="w-full border p-2 rounded mb-4"
                  id="drag-course-user"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Seleziona un collaboratore...
                  </option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.role})
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <button
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded"
                    onClick={async () => {
                      const userId = parseInt(
                        document.getElementById("drag-course-user").value
                      );
                      const courseType =
                        document.getElementById("drag-course-type").value;

                      if (!userId) {
                        alert("Seleziona un istruttore");
                        return;
                      }

                      const def = COURSE_TYPES[courseType];

                      const weekday = jsToBackendWeekday(selectedSlot.start.getDay());
                      const start = hhmm(selectedSlot.start.toTimeString());

                      // se il corso ha durata predefinita → calcola end_time
                      let end;
                      if (def.minutes) {
                        end = addMinutes(start, def.minutes);
                      } else {
                        // altrimenti usa la durata effettiva del drag&drop
                        end = hhmm(selectedSlot.end.toTimeString());
                      }

                      const payload = {
                        category: "istruttori",
                        user: userId,
                        weekday,
                        start_time: start,
                        end_time: end,
                        course_type: courseType,
                      };

                      try {
                        await api.post("templates/", payload);
                        setSelectedSlot(null);
                        loadEvents();
                      } catch (e) {
                        console.error(e);
                        alert("Errore nel salvataggio del corso");
                      }
                    }}
                  >
                    💾 Salva corso
                  </button>

                  <button
                    className="flex-1 bg-gray-300 hover:bg-gray-400 px-3 py-2 rounded"
                    onClick={() => setSelectedSlot(null)}
                  >
                    Annulla
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold mb-3">Assegna collaboratore</h2>
                <p className="text-sm mb-4 text-gray-600">
                  Giorno:{" "}
                  {selectedSlot.start.toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  <br />
                  Orario:{" "}
                  {selectedSlot.start.toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}{" "}
                  –{" "}
                  {selectedSlot.end.toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </p>

                <select
                  className="w-full border p-2 rounded mb-4"
                  onChange={(e) => handleAssign(parseInt(e.target.value))}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Seleziona un collaboratore...
                  </option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.role})
                    </option>
                  ))}
                </select>

                <button
                  className="bg-gray-300 hover:bg-gray-400 transition px-3 py-1 rounded w-full"
                  onClick={() => setSelectedSlot(null)}
                >
                  Annulla
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- Popup gestione turno (esistente) --- */}
      {selectedEvent && (
        <div id="popup-overlay">
          <div className="popup">
            <h2 className="text-lg font-bold mb-3">
              Gestisci turno – {selectedEvent.title}
            </h2>

            {!isEditing ? (
              <>
                <p className="text-sm mb-4 text-gray-600">
                  Orario: {selectedEvent.startTime} – {selectedEvent.endTime}
                </p>

                <button
                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded w-full mb-2"
                  onClick={() => setIsEditing(true)}
                >
                  ✏️ Modifica
                </button>

                <button
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded w-full mb-2"
                  onClick={() => handleDelete(selectedEvent.id)}
                >
                  🗑️ Elimina
                </button>

                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded w-full"
                  onClick={() => handleNotify(selectedEvent)}
                >
                  📢 Richiedi sostituzione
                </button>

                <button
                  className="bg-gray-300 hover:bg-gray-400 transition px-3 py-1 rounded w-full mt-2"
                  onClick={() => setSelectedEvent(null)}
                >
                  Chiudi
                </button>
              </>
            ) : (
              <EditForm
                event={selectedEvent}
                users={users}
                onSave={(updated) => handleUpdate(selectedEvent.id, updated)}
                onCancel={() => setIsEditing(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* --- NUOVO: Popup "Inserisci corso" (solo istruttori, da bottone) --- */}
      {showCourseModal && category === "istruttori" && (
        <div id="popup-overlay">
          <div className="popup">
            <h2 className="text-lg font-bold mb-3">Inserisci corso</h2>

            {/* Giorno settimana */}
            <label className="block mb-2 font-semibold">Giorno della settimana</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={courseForm.weekday}
              onChange={(e) =>
                setCourseForm((f) => ({ ...f, weekday: parseInt(e.target.value) }))
              }
            >
              <option value={0}>Lunedì</option>
              <option value={1}>Martedì</option>
              <option value={2}>Mercoledì</option>
              <option value={3}>Giovedì</option>
              <option value={4}>Venerdì</option>
              <option value={5}>Sabato</option>
              <option value={6}>Domenica</option>
            </select>

            {/* Ora inizio */}
            <label className="block mb-2 font-semibold">Ora di inizio</label>
            <input
              type="time"
              className="w-full border p-2 rounded mb-3"
              value={courseForm.start_time}
              onChange={(e) =>
                setCourseForm((f) => ({ ...f, start_time: e.target.value }))
              }
            />

            {/* Tipo corso */}
            <label className="block mb-2 font-semibold">Tipo di corso</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={courseForm.course_type}
              onChange={(e) =>
                setCourseForm((f) => ({ ...f, course_type: e.target.value }))
              }
            >
              {Object.entries(COURSE_TYPES).map(([key, { label, minutes }]) => (
                <option key={key} value={key}>
                  {label} {minutes ? `(${minutes} min)` : ""}
                </option>
              ))}
            </select>

            {/* Ora fine — SOLO per propaganda/agonismo */}
            {(courseForm.course_type === "propaganda" ||
              courseForm.course_type === "agonismo") && (
              <>
                <label className="block mb-2 font-semibold">Ora di fine</label>
                <input
                  type="time"
                  className="w-full border p-2 rounded mb-3"
                  value={courseForm.end_time}
                  onChange={(e) =>
                    setCourseForm((f) => ({ ...f, end_time: e.target.value }))
                  }
                />
              </>
            )}

            {/* Collaboratore */}
            <label className="block mb-2 font-semibold">Istruttore</label>
            <select
              className="w-full border p-2 rounded mb-4"
              value={courseForm.user}
              onChange={(e) =>
                setCourseForm((f) => ({ ...f, user: parseInt(e.target.value) }))
              }
            >
              <option value="" disabled>
                Seleziona un collaboratore...
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} ({u.role})
                </option>
              ))}
            </select>

            {/* Azioni */}
            <div className="flex gap-2">
              <button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded"
                onClick={saveCourse}
              >
                💾 Salva corso
              </button>
              <button
                className="flex-1 bg-gray-300 hover:bg-gray-400 px-3 py-2 rounded"
                onClick={() => setShowCourseModal(false)}
              >
                Annulla
              </button>
            </div>

            {/* Info durata calcolata */}
            {COURSE_TYPES[courseForm.course_type].minutes ? (
              <p className="mt-3 text-sm text-gray-600">
                Durata automatica:{" "}
                <strong>{COURSE_TYPES[courseForm.course_type].minutes} minuti</strong> → fine alle{" "}
                <strong>
                  {addMinutes(
                    courseForm.start_time,
                    COURSE_TYPES[courseForm.course_type].minutes
                  )}
                </strong>
              </p>
            ) : (
              <p className="mt-3 text-sm text-gray-600 italic">
                Durata non predefinita per questo corso (es. Propaganda o Agonismo).  
                Imposta manualmente l’orario di fine o usa il drag & drop.
              </p>
            )}
          </div>
        </div>
      )}

      {showQuickModal && (
        <div id="popup-overlay">
          <div className="popup">

            <h2 className="text-lg font-bold mb-3">⚡ Inserimento veloce corsi</h2>

            {/* Giorno */}
            <label className="block mb-2 font-semibold">Giorno</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={quickForm.weekday}
              onChange={(e) =>
                setQuickForm((f) => ({ ...f, weekday: parseInt(e.target.value) }))
              }
            >
              <option value={0}>Lunedì</option>
              <option value={1}>Martedì</option>
              <option value={2}>Mercoledì</option>
              <option value={3}>Giovedì</option>
              <option value={4}>Venerdì</option>
              <option value={5}>Sabato</option>
              <option value={6}>Domenica</option>
            </select>

            {/* Gruppo */}
            <label className="block mb-2 font-semibold">Tipo corsi</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={quickForm.group}
              onChange={(e) =>
                setQuickForm((f) => ({
                  ...f,
                  group: e.target.value,
                  selectedTimes: {},
                }))
              }
            >
              {Object.entries(QUICK_COURSES).map(([key, g]) => (
                <option key={key} value={key}>
                  {g.label}
                </option>
              ))}
            </select>

            {/* Orari */}
            <label className="block mb-2 font-semibold">Seleziona orari</label>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {QUICK_COURSES[quickForm.group].times.map((t) => (
                <label key={t} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={quickForm.selectedTimes[t] || false}
                    onChange={() =>
                      setQuickForm((f) => ({
                        ...f,
                        selectedTimes: {
                          ...f.selectedTimes,
                          [t]: !f.selectedTimes[t],
                        },
                      }))
                    }
                  />
                  {t}
                </label>
              ))}
            </div>

            {/* Istruttore */}
            <label className="block mb-2 font-semibold">Istruttore</label>
            <select
              className="w-full border p-2 rounded mb-4"
              value={quickForm.user}
              onChange={(e) =>
                setQuickForm((f) => ({ ...f, user: parseInt(e.target.value) }))
              }
            >
              <option value="" disabled>
                Seleziona un collaboratore...
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} ({u.role})
                </option>
              ))}
            </select>

            {/* Bottoni */}
            <div className="flex gap-2">
              <button
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded"
                onClick={async () => {
                  const group = QUICK_COURSES[quickForm.group];
                  const minutes = group.minutes;
                  const weekday = quickForm.weekday;

                  if (!quickForm.user) {
                    alert("Seleziona un istruttore");
                    return;
                  }

                  const selected = Object.entries(quickForm.selectedTimes)
                    .filter(([t, selected]) => selected)
                    .map(([t]) => t);

                  if (selected.length === 0) {
                    alert("Seleziona almeno un orario");
                    return;
                  }

                  for (const start of selected) {
                    const end = addMinutes(start, minutes);

                    await api.post("templates/", {
                      category: "istruttori",
                      user: quickForm.user,
                      weekday,
                      start_time: start,
                      end_time: end,
                    });
                  }

                  alert("Corsi inseriti");
                  setShowQuickModal(false);
                  loadEvents();
                }}
              >
                💾 Crea corsi selezionati
              </button>

              <button
                className="flex-1 bg-gray-300 hover:bg-gray-400 px-3 py-2 rounded"
                onClick={() => setShowQuickModal(false)}
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

function EditForm({ event, users, onSave, onCancel }) {
  const [form, setForm] = useState({
    user: event.user || "",
    start_time: event.startTime,
    end_time: event.endTime,
  });

  return (
    <div>
      <label className="block mb-2 font-semibold">Collaboratore:</label>
      <select
        className="w-full border p-2 rounded mb-4"
        value={form.user}
        onChange={(e) => setForm({ ...form, user: parseInt(e.target.value) })}
      >
        <option value="" disabled>
          Seleziona un collaboratore...
        </option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.username} ({u.role})
          </option>
        ))}
      </select>

      <label className="block mb-2 font-semibold">Orario inizio:</label>
      <input
        type="time"
        className="w-full border p-2 rounded mb-4"
        value={form.start_time}
        onChange={(e) => setForm({ ...form, start_time: e.target.value })}
      />

      <label className="block mb-2 font-semibold">Orario fine:</label>
      <input
        type="time"
        className="w-full border p-2 rounded mb-4"
        value={form.end_time}
        onChange={(e) => setForm({ ...form, end_time: e.target.value })}
      />

      <button
        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded w-full mb-2"
        onClick={() => onSave(form)}
      >
        💾 Salva
      </button>

      <button
        className="bg-gray-300 hover:bg-gray-400 transition px-3 py-1 rounded w-full"
        onClick={onCancel}
      >
        Annulla
      </button>
    </div>
  );
}
