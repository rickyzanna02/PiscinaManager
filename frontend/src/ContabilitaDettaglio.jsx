import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "./api";

// =======================================
// MERGE TURNI CONTIGUI PER VISUALIZZAZIONE
// =======================================
function mergeContiguousShifts(shiftsOfDay) {
  if (!shiftsOfDay || shiftsOfDay.length === 0) return [];

  // ordina per orario
  const sorted = [...shiftsOfDay].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );

  const merged = [];
  let buffer = [sorted[0]];

  // funzione per sapere se due turni sono fondibili
  const areContiguous = (a, b) => {
    // devono essere stesso ruolo
    if (a.role !== b.role) return false;

    // devono essere contigui come orario
    if (a.end_time !== b.start_time) return false;

    // caso istruttore: stesso tipo di corso
    if (a.role === "istruttore") {
      const aCourseId =
        a.course_type_data?.id ??
        a.course_type ??
        null;
      const bCourseId =
        b.course_type_data?.id ??
        b.course_type ??
        null;

      return !!aCourseId && aCourseId === bCourseId;
    }

    // per bagnino / segreteria / pulizia basta stesso ruolo + contigui
    return true;
  };

  for (let i = 1; i < sorted.length; i++) {
    const prev = buffer[buffer.length - 1];
    const curr = sorted[i];

    if (areContiguous(prev, curr)) {
      // continua il blocco
      buffer.push(curr);
    } else {
      // chiudi blocco precedente
      merged.push(buffer);
      buffer = [curr];
    }
  }

  // push dell’ultimo blocco
  merged.push(buffer);

  // trasforma ogni blocco in un oggetto unico o singolo turno
  return merged.map((block) => {
    if (block.length === 1) return block[0];

    return {
      ...block[0],
      start_time: block[0].start_time,
      end_time: block[block.length - 1].end_time,
      merged_count: block.length, // numero di corsi nel blocco
      merged_course:
        block[0].course_type_data?.name ||
        block[0].course?.name ||
        "",
      _is_merged: true,
    };
  });
}

// =======================================
// CALCOLO TOTALI MENSILI
// =======================================

function diffHours(start_time, end_time) {
  // usa solo HH:MM
  const [sh, sm] = start_time.slice(0, 5).split(":").map(Number);
  const [eh, em] = end_time.slice(0, 5).split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return minutes / 60;
}

function computeMonthlyTotals(shifts) {
  const roles = ["bagnino", "segreteria", "pulizia"];

  // ore per ruolo non istruttore
  const hoursByRole = {
    bagnino: 0,
    segreteria: 0,
    pulizia: 0,
  };

  // istruttori: conteggio turni per tipo corso
  const instructorByCourse = {};

  shifts.forEach((s) => {
    if (roles.includes(s.role)) {
      // somma ore
      hoursByRole[s.role] += diffHours(s.start_time, s.end_time);
    } else if (s.role === "istruttore") {
      const courseName =
        s.course_type_data?.name ||
        s.course?.name ||
        "Altro";
      instructorByCourse[courseName] =
        (instructorByCourse[courseName] || 0) + 1;
    }
  });

  const instructorTotalShifts = Object.values(instructorByCourse).reduce(
    (sum, n) => sum + n,
    0
  );

  return {
    hoursByRole,
    instructorByCourse,
    instructorTotalShifts,
  };
}

export default function ContabilitaDettaglio() {
  const { userId } = useParams();

  const [user, setUser] = useState(null);
  const [shifts, setShifts] = useState([]);

  // mese/anno attuali come stato, per poter cambiare mese
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1–12
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // helper per bottone ◀ / ▶
  const changeMonth = (delta) => {
    setCurrentMonth((prevMonth) => {
      let newMonth = prevMonth + delta;
      let newYear = currentYear;

      if (newMonth < 1) {
        newMonth = 12;
        newYear = currentYear - 1;
      } else if (newMonth > 12) {
        newMonth = 1;
        newYear = currentYear + 1;
      }

      setCurrentYear(newYear);
      return newMonth;
    });
  };

  useEffect(() => {
    // carica informazioni utente (non dipende dal mese)
    api
      .get(`/api/users/${userId}/`)
      .then((res) => setUser(res.data))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    // carica turni del mese selezionato
    api
      .get(
        `/api/shifts/?user=${userId}&month=${currentMonth}&year=${currentYear}`
      )
      .then((res) => {
        // ordina per data
        const sorted = res.data.sort((a, b) =>
          a.date.localeCompare(b.date)
        );
        setShifts(sorted);
      });
  }, [userId, currentMonth, currentYear]);

  // Raggruppa turni per giorno
  const grouped = shifts.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});

  if (!user) return <div className="p-6">Caricamento…</div>;

  // Oggetto Date fittizio solo per mostrare il nome del mese selezionato
  const monthLabelDate = new Date(currentYear, currentMonth - 1, 1);
  const monthLabel = monthLabelDate
    .toLocaleString("it-IT", { month: "long" })
    .toUpperCase();

  // === TOTALI MENSILI A PARTIRE DA shifts (crudi, non mergiati) ===
  const { hoursByRole, instructorByCourse, instructorTotalShifts } =
    computeMonthlyTotals(shifts);

  const formatHours = (h) => {
    const isInt = Number.isInteger(h);
    const val = isInt ? h : Number(h.toFixed(2));
    // usa virgola per decimali
    return isInt ? `${val}` : `${val}`.replace(".", ",");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">{user.username}</h1>

      {/* Barra mese con frecce */}
      <div className="flex items-center gap-4 mb-4">
        <button
          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={() => changeMonth(-1)}
        >
          ◀
        </button>

        <h2 className="text-lg font-semibold">
          {monthLabel} {currentYear}
        </h2>

        <button
          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={() => changeMonth(1)}
        >
          ▶
        </button>
      </div>

      {/* LISTA GIORNI / TURNI */}
      <div className="bg-white p-4 rounded shadow mb-4">
        {Object.keys(grouped)
          .sort() // giorni in ordine crescente
          .map((day) => (
            <div key={day} className="mb-4">
              <h3 className="font-bold text-md mb-2">
                {new Date(day).toLocaleDateString("it-IT", {
                  day: "numeric",
                  month: "long",
                })}
              </h3>

              {mergeContiguousShifts(grouped[day]).map((s) => {
                const start = s.start_time.slice(0, 5);
                const end = s.end_time.slice(0, 5);

                let extraLabel = null;

                // ---------- ISTRUTTORI: numero corsi + nome corso ----------
                if (s.role === "istruttore") {
                  const courseCount = s._is_merged ? s.merged_count : 1;
                  const label = courseCount === 1 ? "corso" : "corsi";

                  const courseName =
                    s.merged_course ||
                    s.course_type_data?.name ||
                    s.course?.name ||
                    "";

                  extraLabel = `(${courseCount} ${label}${
                    courseName ? ` ${courseName}` : ""
                  })`;
                }

                // ---------- ALTRI RUOLI: numero di ore ----------
                if (
                  ["bagnino", "segreteria", "pulizia"].includes(s.role)
                ) {
                  const hours = diffHours(s.start_time, s.end_time);
                  const label = hours === 1 ? "ora" : "ore";
                  extraLabel = `(${formatHours(hours)} ${label})`;
                }

                return (
                  <div
                    key={s.id || s.start_time}
                    className="ml-4 text-sm text-gray-700 mb-1"
                  >
                    ▸ {s.role} {start}–{end}
                    {extraLabel && (
                      <span className="text-gray-500">
                        {" "}
                        {extraLabel}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
      </div>

      {/* ===========================
          TOTALE MENSILE PER RUOLO
          =========================== */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-md font-bold mb-3">
          Totale mese – {monthLabel} {currentYear}
        </h3>

        {/* Bagnino / Segreteria / Pulizia → totale ore */}
        <div className="mb-3 text-sm">
        {hoursByRole.bagnino > 0 && (
          <p>
            <strong>Bagnino:</strong>{" "}
            {formatHours(hoursByRole.bagnino)}{" "}
            {hoursByRole.bagnino === 1 ? "ora" : "ore"}
          </p>
        )}

        {hoursByRole.segreteria > 0 && (
          <p>
            <strong>Segreteria:</strong>{" "}
            {formatHours(hoursByRole.segreteria)}{" "}
            {hoursByRole.segreteria === 1 ? "ora" : "ore"}
          </p>
        )}

        {hoursByRole.pulizia > 0 && (
          <p>
            <strong>Pulizia:</strong>{" "}
            {formatHours(hoursByRole.pulizia)}{" "}
            {hoursByRole.pulizia === 1 ? "ora" : "ore"}
          </p>
        )}
      </div>


        {/* Istruttore → totale turni, divisi per tipo corso */}
        {Object.entries(instructorByCourse).filter(([, count]) => count > 0).length > 0 && (
        <div className="text-sm">
          <p className="mb-1">
            <strong>Istruttore:</strong>
          </p>

          <ul className="ml-4 list-disc">
            {Object.entries(instructorByCourse)
              .filter(([, count]) => count > 0)
              .map(([courseName, count]) => (
                <li key={courseName}>
                  {courseName}: {count}{" "}
                  {count === 1 ? "turno" : "turni"}
                </li>
              ))}
          </ul>
        </div>
      )}

      </div>
    </div>
  );
}
