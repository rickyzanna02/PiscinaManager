import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import api, { getRoles } from "./api";  // ✅ Aggiungi { getRoles }
import itLocale from "@fullcalendar/core/locales/it";

export default function App() {
  const [roles, setRoles] = useState([]);  // Carica da API
  const [category, setCategory] = useState(null);  // ✅ null invece di ""

  // ✅ NUOVO useEffect con getRoles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const data = await getRoles();
        setRoles(data);
        if (data && data.length > 0) {
          setCategory(data[0].code);
        }
      } catch (error) {
        console.error("Errore caricamento ruoli:", error);
        // Fallback: usa ruolo di default
        setCategory("bagnino");
      }
    };
    loadRoles();
  }, []);

  // ✅ Non renderizzare finché category non è caricato
  if (!category) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Caricamento ruoli...</p>
      </div>
    );
  }

  
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [calendarKey, setCalendarKey] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [courseTypes, setCourseTypes] = useState([]);
  const instructorRole = roles.find(r => r.code === "istruttore");

  // Popup "Inserisci corso" (istruttore)
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState({
    weekday: 0,
    start_time: "06:00",
    end_time: "",
    course: "",
    user: "",
  });

  const [showQuickModal, setShowQuickModal] = useState(false);

  const [quickForm, setQuickForm] = useState({
    weekday: 0,
    group: "bambini",
    selectedTimes: {},
    user: "",
  });

  // Pubblicazione multi-settimana
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [publishedWeeks, setPublishedWeeks] = useState([]);

  const getWeeksOfMonth = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const weeks = [];
    let current = new Date(firstDay);

    // porta a lunedì
    current.setDate(current.getDate() - ((current.getDay() + 6) % 7));

    let index = 1;

    while (current <= lastDay) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekStart.getDate() + 6);

      if (weekEnd >= firstDay && weekStart <= lastDay) {
        weeks.push({
          id: `${year}-${month + 1}-${index}`,
          label: `Settimana ${index} (${weekStart.getDate()}–${weekEnd.getDate()})`,
          start: new Date(weekStart),
          end: new Date(weekEnd),
        });
        index++;
      }

      current.setDate(current.getDate() + 7);
    }

    return weeks;
  };

  const changeMonth = (dir) => {
    setSelectedMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + dir);
      return d;
    });
  };

  // carica tipi corso dal backend
  useEffect(() => {
    api.get("/api/courses/types/").then((res) => {
      setCourseTypes(res.data || []);
    });
  }, []);

  // settimane già pubblicate
  useEffect(() => {
    api
      .get("/api/shifts/published_weeks/", {
        params: {
          year: selectedMonth.getFullYear(),
          month: selectedMonth.getMonth() + 1,
          category: category,
        },
      })
      .then((res) => {
        setPublishedWeeks(res.data.published || []);
      });
  }, [selectedMonth, category]);

  const toggleWeek = (id) => {
    setSelectedWeeks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Mappa per trovare il CourseType corretto nell'inserimento veloce
  const QUICK_MAP = {
    bambini: "scuola nuoto",
    adulti: "scuola nuoto adulti",
    fitness: "fitness",
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
        "07:00",
        "07:45",
        "08:30",
        "09:15",
        "10:00",
        "12:45",
        "13:30",
        "14:15",
        "18:00",
        "18:45",
        "19:30",
        "20:15",
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

  const getQuickCourseId = (group) => {
    const name = QUICK_MAP[group];
    const ct = courseTypes.find((c) => c.name === name);
    return ct ? ct.id : null;
  };

  // carica utenti
  useEffect(() => {
    api
      .get("/api/users/", {
        params: { role: category },
      })
      .then((res) => setUsers(res.data || []));
  }, [category]);


  // ricarica events dai template
  

  const loadEvents = () => {
    api.get(`/api/templates/?category=${category}`).then((res) => {
      const rows = Array.isArray(res.data) ? res.data : [];
      const mapped = rows.map((t) => {
        const userId = typeof t.user === "number" ? t.user : t.user?.id ?? null;
        const title =
          typeof t.user === "object" ? t.user.username ?? "—" : usernameById(userId);

        // ✅ prendo il nome del corso dal serializer
        const courseName = t.course_type_data?.name || "";

        return {
          id: t.id,
          title: title || "—",
          color: userId ? "#4ade80" : "#facc15",
          textColor: "#000000",
          startRecur: "2024-01-01",
          daysOfWeek: [(t.weekday + 1) % 7],
          startTime: hhmm(t.start_time),
          endTime: hhmm(t.end_time),
          extendedProps: {
            user: userId,
            startTime: hhmm(t.start_time),
            endTime: hhmm(t.end_time),
            category,
            course_type_id: t.course_type_data?.id || t.course_type || null,
            courseName,   // ✅ ora esiste
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

  // selezione drag (creazione turno generico)
  const handleSelect = (info) => {
    const diffMinutes = (info.end - info.start) / (1000 * 60);
    if (diffMinutes < 20) return;
    setSelectedSlot(info);
  };

  // crea turno generico (no corso)
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
      .post("/api/templates/", payload)
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
    api.delete(`/api/templates/${id}/`).then(() => {
      setSelectedEvent(null);
      loadEvents();
    });
  };

  // aggiorna (solo user/orari, NON il corso)
  const handleUpdate = (id, updated) => {
    const payload = {
      user: updated.user,
      start_time: hhmm(updated.start_time),
      end_time: hhmm(updated.end_time),
    };

    api.patch(`/api/templates/${id}/`, payload).then(() => {
      setSelectedEvent(null);
      loadEvents();
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
      courseName: fcEvent.extendedProps.courseName || null,
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
    const courseLabel = eventInfo.event.extendedProps.courseName;

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
          {courseLabel && (
            <div className="text-[11px] text-blue-600">{courseLabel}</div>
          )}
        </button>
      </div>
    );
  };

  // ====== Inserisci corso (solo categoria "istruttore") ======
  const openCourseModal = () => {
    setCourseForm({
      weekday: 0,
      start_time: "06:00",
      end_time: "",
      course: "",
      user: "",
    });
    setShowCourseModal(true);
  };

  const saveCourse = async () => {
    const { weekday, start_time, end_time, course, user } = courseForm;

    if (!user) {
      alert("Seleziona un collaboratore");
      return;
    }

    if (!course) {
      alert("Seleziona un tipo di corso");
      return;
    }

    const def = courseTypes.find((c) => c.id === course);
    if (!def) {
      alert("Tipo di corso non valido");
      return;
    }

    let finalEnd = end_time;

    if (def.default_minutes) {
      finalEnd = addMinutes(start_time, def.default_minutes);
    } else if (!finalEnd) {
      alert("Specifica l’orario di fine per questo corso");
      return;
    }

    const payload = {
      category: instructorRole.code,
      user,
      weekday,
      start_time,
      end_time: finalEnd,
      course,
    };

    try {
      await api.post("/api/templates/", payload);
      setShowCourseModal(false);
      loadEvents();
    } catch (err) {
      console.error(err);
      alert("Errore nel salvataggio del corso");
    }
  };

  const renderCalendar = () => (
    <div className="admin-calendar">
      <FullCalendar
        key={calendarKey}
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        initialDate="2024-01-01"
        headerToolbar={{
          left: "",
          center: "",
          right: "",
        }}
        footerToolbar={false}
        navLinks={false}
        dayHeaderFormat={{ weekday: "short" }}
        firstDay={1}
        locale={itLocale}
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
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
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gestione settimana tipo</h1>

      {/* Selezione categoria e azioni */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {roles.map(role => (
            <option key={role.code} value={role.code}>
              {role.label}
            </option>
          ))}
        </select>

        {category === instructorRole?.code && (
          <>
            <button
              onClick={openCourseModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded"
            >
              ➕ Inserisci corso
            </button>

            <button
              onClick={() => {
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

        <button
          onClick={() => {
            setSelectedWeeks([]);
            setShowPublishModal(true);
          }}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded"
        >
          📢 Pubblica
        </button>
      </div>

      {/* Calendario */}
      {renderCalendar()}

      {/* Popup pubblicazione */}
      {showPublishModal && (
        <div id="popup-overlay">
          <div className="popup w-[400px]">
            <h2 className="text-xl font-bold mb-3 text-center">
              Pubblicazione turni
            </h2>

            <div className="flex justify-between items-center mb-4">
              <button
                className="px-3 py-1 bg-gray-200 rounded"
                onClick={() => changeMonth(-1)}
              >
                ◀
              </button>

              <span className="text-lg font-semibold">
                {selectedMonth.toLocaleDateString("it-IT", {
                  month: "long",
                  year: "numeric",
                })}
              </span>

              <button
                className="px-3 py-1 bg-gray-200 rounded"
                onClick={() => changeMonth(1)}
              >
                ▶
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto mb-4">
              {getWeeksOfMonth(
                selectedMonth.getFullYear(),
                selectedMonth.getMonth()
              ).map((week) => {
                const weekStartKey = week.start.toLocaleDateString("sv-SE");
                const isPublished = publishedWeeks.includes(weekStartKey);

                return (
                  <label key={week.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedWeeks.includes(week.id)}
                      disabled={isPublished}
                      onChange={() => toggleWeek(week.id)}
                    />
                    {isPublished && (
                      <span className="text-xs text-red-500 ml-1">
                        (già pubblicata)
                      </span>
                    )}
                    {week.label}
                  </label>
                );
              })}
            </div>

            <button
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded w-full mb-2"
              onClick={async () => {
                try {
                  const weeksPayload = getWeeksOfMonth(
                    selectedMonth.getFullYear(),
                    selectedMonth.getMonth()
                  )
                    .filter((w) => selectedWeeks.includes(w.id))
                    .map((w) => ({
                      start: w.start.toISOString().slice(0, 10),
                      end: w.end.toISOString().slice(0, 10),
                    }));

                  await api.post("/api/shifts/publish/", {
                    category: category,
                    weeks: weeksPayload,
                  });

                  alert("Pubblicazione completata!");
                  setShowPublishModal(false);
                } catch (e) {
                  console.error(e);
                  alert("Errore nella pubblicazione");
                }
              }}
            >
              Pubblica
            </button>

            <button
              className="bg-gray-300 hover:bg-gray-400 px-3 py-2 rounded w-full"
              onClick={() => setShowPublishModal(false)}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Popup assegnazione / inserimento corso (drag & drop) */}
      {selectedSlot && (
        <div id="popup-overlay">
          <div className="popup">
            {category === instructorRole?.code ? (
              <>
                <h2 className="text-lg font-bold mb-3">Inserisci corso</h2>

                <p className="text-sm mb-4 text-gray-600">
                  Giorno:{" "}
                  {selectedSlot.start.toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
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

                <label className="block mb-2 font-semibold">Tipo di corso</label>
                <select
                  className="w-full border p-2 rounded mb-3"
                  defaultValue=""
                  id="drag-course-type"
                >
                  <option value="" disabled>
                    Seleziona un corso…
                  </option>
                  {courseTypes.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name}{" "}
                      {ct.default_minutes
                        ? `(${ct.default_minutes} min)`
                        : ""}
                    </option>
                  ))}
                </select>

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
                      {u.username}
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
                      const courseId = parseInt(
                        document.getElementById("drag-course-type").value
                      );

                      if (!userId) {
                        alert("Seleziona un istruttore");
                        return;
                      }
                      if (!courseId) {
                        alert("Seleziona un corso");
                        return;
                      }

                      const def = courseTypes.find((c) => c.id === courseId);

                      const weekday = jsToBackendWeekday(
                        selectedSlot.start.getDay()
                      );
                      const start = hhmm(selectedSlot.start.toTimeString());

                      let end;
                      if (def && def.default_minutes) {
                        end = addMinutes(start, def.default_minutes);
                      } else {
                        end = hhmm(selectedSlot.end.toTimeString());
                      }

                      const payload = {
                        category: instructorRole.code,
                        user: userId,
                        weekday,
                        start_time: start,
                        end_time: end,
                        course: courseId,
                      };

                      try {
                        await api.post("/api/templates/", payload);
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
                  })}
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
                      {u.username}
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

      {/* Popup gestione turno */}
      {selectedEvent && (
        <div id="popup-overlay">
          <div className="popup">
            <h2 className="text-lg font-bold mb-3">Gestione turno</h2>

            {!isEditing ? (
              <>
                <div className="mb-4 text-sm text-gray-700 space-y-1">
                  <p>
                    <strong>Ruolo:</strong> {category}
                  </p>

                  <p>
                    <strong>Collaboratore:</strong> {selectedEvent.title}
                  </p>

                  <p>
                    <strong>Orario:</strong> {selectedEvent.startTime} – {selectedEvent.endTime}
                  </p>

                   {/* Se ruolo = istruttore → mostra tipo corso */}
                    {category === instructorRole?.code && selectedEvent.courseName && (
                      <p>
                        <strong>Tipo corso:</strong> {selectedEvent.courseName}
                      </p>
                    )}
                </div>

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

      {/* Popup "Inserisci corso" (bottone) */}
      {showCourseModal && category === instructorRole?.code && (
        <div id="popup-overlay">
          <div className="popup">
            <h2 className="text-lg font-bold mb-3">Inserisci corso</h2>

            <label className="block mb-2 font-semibold">
              Giorno della settimana
            </label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={courseForm.weekday}
              onChange={(e) =>
                setCourseForm((f) => ({
                  ...f,
                  weekday: parseInt(e.target.value),
                }))
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

            <label className="block mb-2 font-semibold">Ora di inizio</label>
            <input
              type="time"
              className="w-full border p-2 rounded mb-3"
              value={courseForm.start_time}
              onChange={(e) =>
                setCourseForm((f) => ({ ...f, start_time: e.target.value }))
              }
            />

            <label className="block mb-2 font-semibold">Tipo di corso</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={courseForm.course}
              onChange={(e) =>
                setCourseForm((f) => ({
                  ...f,
                  course: parseInt(e.target.value),
                }))
              }
            >
              <option value="" disabled>
                Seleziona un corso…
              </option>
              {courseTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name}{" "}
                  {ct.default_minutes ? `(${ct.default_minutes} min)` : ""}
                </option>
              ))}
            </select>

            {/* Se il corso NON ha durata predefinita → chiedi ora fine */}
            {(() => {
              const ct = courseTypes.find((c) => c.id === courseForm.course);
              if (ct && !ct.default_minutes) {
                return (
                  <>
                    <label className="block mb-2 font-semibold">
                      Ora di fine
                    </label>
                    <input
                      type="time"
                      className="w-full border p-2 rounded mb-3"
                      value={courseForm.end_time}
                      onChange={(e) =>
                        setCourseForm((f) => ({ ...f, end_time: e.target.value }))
                      }
                    />
                  </>
                );
              }
              return null;
            })()}

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
                  {u.username}
                </option>
              ))}
            </select>

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

            {(() => {
              const ct = courseTypes.find((c) => c.id === courseForm.course);
              return ct && ct.default_minutes ? (
                <p className="mt-3 text-sm text-gray-600">
                  Durata automatica:{" "}
                  <strong>{ct.default_minutes} minuti</strong> → fine alle{" "}
                  <strong>
                    {addMinutes(courseForm.start_time, ct.default_minutes)}
                  </strong>
                </p>
              ) : (
                <p className="mt-3 text-sm text-gray-600 italic">
                  Durata non predefinita. Imposta manualmente l’orario di fine.
                </p>
              );
            })()}
          </div>
        </div>
      )}

      {/* Popup inserimento veloce */}
      {showQuickModal && (
        <div id="popup-overlay">
          <div className="popup">
            <h2 className="text-lg font-bold mb-3">⚡ Inserimento veloce corsi</h2>

            <label className="block mb-2 font-semibold">Giorno</label>
            <select
              className="w-full border p-2 rounded mb-3"
              value={quickForm.weekday}
              onChange={(e) =>
                setQuickForm((f) => ({
                  ...f,
                  weekday: parseInt(e.target.value),
                }))
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
                  {u.username}
                </option>
              ))}
            </select>

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
                    .filter(([, selected]) => selected)
                    .map(([t]) => t);

                  if (selected.length === 0) {
                    alert("Seleziona almeno un orario");
                    return;
                  }

                  const courseId = getQuickCourseId(quickForm.group);
                  if (!courseId) {
                    alert("Tipo corso non trovato nel database");
                    return;
                  }

                  for (const start of selected) {
                    const end = addMinutes(start, minutes);

                    await api.post("/api/templates/", {
                      category: instructorRole.code,
                      user: quickForm.user,
                      weekday,
                      start_time: start,
                      end_time: end,
                      course: courseId,
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
        onChange={(e) =>
          setForm({ ...form, user: parseInt(e.target.value) })
        }
      >
        <option value="" disabled>
          Seleziona un collaboratore...
        </option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.username}
          </option>
        ))}
      </select>

      <label className="block mb-2 font-semibold">Orario inizio:</label>
      <input
        type="time"
        className="w-full border p-2 rounded mb-4"
        value={form.start_time}
        onChange={(e) =>
          setForm({ ...form, start_time: e.target.value })
        }
      />

      <label className="block mb-2 font-semibold">Orario fine:</label>
      <input
        type="time"
        className="w-full border p-2 rounded mb-4"
        value={form.end_time}
        onChange={(e) =>
          setForm({ ...form, end_time: e.target.value })
        }
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
