import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import itLocale from "@fullcalendar/core/locales/it";
import api from "./api";

export default function RealCalendar() {
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);

  const today = new Date();
  const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));

  const [weekStart, setWeekStart] = useState(monday);
  const [calendarKey, setCalendarKey] = useState(0);

  const formatDate = (d) => d.toISOString().split("T")[0];

  // Carica utenti (serve per mostrare il nome nel box evento)
  useEffect(() => {
    api.get("users/").then((res) => setUsers(res.data));
  }, []);

  // Carica turni reali della settimana selezionata
  const loadShifts = () => {
    const startDate = formatDate(weekStart);

    api
      .get(`shifts/get_week_shifts/?start_date=${startDate}`)
      .then((res) => {
        const data = res.data;

        const mapped = data.map((s) => {
          const start = `${s.date}T${s.start_time}`;
          const end = `${s.date}T${s.end_time}`;
          const username = users.find((u) => u.id === s.user_id)?.username || "—";

          return {
            id: s.id,
            title: username,
            start,
            end,
            color: "#4ade80",
            textColor: "#000",
          };
        });

        setEvents(mapped);
        setCalendarKey((k) => k + 1);
      })
      .catch((err) => console.error("Errore week shifts", err));
  };

  useEffect(() => {
    loadShifts();
  }, [weekStart, users]);

  // Format settimana per scritta in alto
  const formatRange = () => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);

    return `${weekStart.toLocaleDateString("it-IT")} → ${end.toLocaleDateString(
      "it-IT"
    )}`;
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Turni reali – {formatRange()}</h2>

      {/* 🔵 Bottoni cambio settimana */}
      <div className="flex gap-2 mb-4">
        <button
          className="px-3 py-2 bg-slate-300 rounded"
          onClick={() => {
            const prev = new Date(weekStart);
            prev.setDate(prev.getDate() - 7);
            setWeekStart(prev);
          }}
        >
          ← Settimana precedente
        </button>

        <button
          className="px-3 py-2 bg-slate-300 rounded"
          onClick={() => {
            const next = new Date(weekStart);
            next.setDate(next.getDate() + 7);
            setWeekStart(next);
          }}
        >
          Settimana successiva →
        </button>
      </div>

      {/* Calendario */}
      <FullCalendar
        key={calendarKey}
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        firstDay={1}
        locale={itLocale}
        allDaySlot={false}
        events={events}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        height="auto"
        dayHeaderFormat={{
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
        }}
      />
    </div>
  );
}
S