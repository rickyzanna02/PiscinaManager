import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "./api";

import "./ContabilitaDettaglio.css";



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

  // istruttori: alcuni corsi a ORE, altri a TURNI
  const INSTRUCTOR_COURSES_COUNT_AS_HOURS = new Set(["propaganda", "agonismo"]);

  const instructorByCourse = {}; // turni (default)
  const instructorHoursByCourse = {}; // ore (propaganda/agonismo)

  shifts.forEach((s) => {
    if (roles.includes(s.role)) {
      hoursByRole[s.role] += diffHours(s.start_time, s.end_time);
      return;
    }

    if (s.role === "istruttore") {
      const courseName =
        (s.course_type_data?.name || s.course?.name || "Altro").toLowerCase();

      if (INSTRUCTOR_COURSES_COUNT_AS_HOURS.has(courseName)) {
        instructorHoursByCourse[courseName] =
          (instructorHoursByCourse[courseName] || 0) +
          diffHours(s.start_time, s.end_time);
      } else {
        instructorByCourse[courseName] =
          (instructorByCourse[courseName] || 0) + 1;
      }
    }
  });

  return {
    hoursByRole,
    instructorByCourse,
    instructorHoursByCourse,
  };
}


export default function ContabilitaDettaglio() {
  const { userId } = useParams();

  const [user, setUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [courseTypes, setCourseTypes] = useState([]);
  const [baseRates, setBaseRates] = useState([]);
  const [userHourlyRates, setUserHourlyRates] = useState([]);
  const [instructorCourseRates, setInstructorCourseRates] = useState([]);


  useEffect(() => {
    api.get("/api/courses/types/").then((r) => setCourseTypes(r.data || [])).catch(()=>{});
    api.get("/api/courses/base-rates/").then((r) => setBaseRates(r.data || [])).catch(()=>{});
    api.get("/api/courses/user-hourly-rates/").then((r) => setUserHourlyRates(r.data || [])).catch(()=>{});
    api.get("/api/courses/instructor-course-rates/").then((r) => setInstructorCourseRates(r.data || [])).catch(()=>{});
  }, []);

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
  const { hoursByRole, instructorByCourse, instructorHoursByCourse } =
    computeMonthlyTotals(shifts);


  const formatHours = (h) => {
    const isInt = Number.isInteger(h);
    const val = isInt ? h : Number(h.toFixed(2));
    // usa virgola per decimali
    return isInt ? `${val}` : `${val}`.replace(".", ",");
  };

  const formatEUR = (n) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

  // bagnino/segreteria/pulizia: prima personalizzata (UserHourlyRate), altrimenti base (CategoryBaseRate)
  const getHourlyRateForRole = (role) => {
    const custom = userHourlyRates.find((x) => x.user === Number(userId));
    if (custom?.rate != null) return Number(custom.rate);

    const base = baseRates.find((x) => x.category === role);
    if (base?.base_rate != null) return Number(base.base_rate);

    return 0;
  };


  const pretty = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  // costruisce righe di breakdown e totale
  const computeMonthlyPayBreakdown = (shifts) => {
    const HOURLY_INSTRUCTOR_COURSES = new Set(["propaganda", "agonismo"]);
    const roleHourly = ["bagnino", "segreteria", "pulizia"];

    // aggregazioni
    const hoursByRole = {};
    const instructorTurnsByCourse = {};
    const instructorHoursByCourse = {};

    for (const s of shifts) {
      if (roleHourly.includes(s.role)) {
        hoursByRole[s.role] = (hoursByRole[s.role] || 0) + diffHours(s.start_time, s.end_time);
        continue;
      }

      if (s.role === "istruttore") {
        const courseNameRaw = (s.course_type_data?.name || s.course?.name || "Altro").toLowerCase();
        const courseTypeId = s.course_type_data?.id ?? s.course_type ?? null;

        if (HOURLY_INSTRUCTOR_COURSES.has(courseNameRaw)) {
          instructorHoursByCourse[courseNameRaw] = (instructorHoursByCourse[courseNameRaw] || 0) + diffHours(s.start_time, s.end_time);
        } else {
          // per corsi a turno raggruppiamo per courseTypeId, così la tariffa è corretta
          const key = String(courseTypeId ?? courseNameRaw);
          instructorTurnsByCourse[key] = instructorTurnsByCourse[key] || { count: 0, name: courseNameRaw, courseTypeId };
          instructorTurnsByCourse[key].count += 1;
        }
      }
    }

    const lines = [];
    let totalEUR = 0;

    // --- bagnino/segreteria/pulizia ---
    for (const role of roleHourly) {
      const hours = hoursByRole[role] || 0;
      if (hours <= 0) continue;

      const rate = getHourlyRateForRole(role);
      const subtotal = hours * rate;
      totalEUR += subtotal;

      lines.push({
        section: "role",
        label: pretty(role),
        qtyText: `${formatHours(hours)} ore`,
        rateText: `${formatEUR(rate)}/h`,
        subtotal,
      });
    }

    // --- istruttore: corsi a turno ---
    // ordina per nome corso
    const turnCourses = Object.values(instructorTurnsByCourse).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );

    for (const c of turnCourses) {
      if (!c.count) continue;

      const rate = getInstructorRateForCourseTypeId(c.courseTypeId);
      const subtotal = c.count * rate;
      totalEUR += subtotal;

      lines.push({
        section: "instructor",
        label: `Istruttore – ${pretty(c.name)}`,
        qtyText: `${c.count} ${c.count === 1 ? "turno" : "turni"}`,
        rateText: `${formatEUR(rate)}/turno`,
        subtotal,
      });
    }

    // --- istruttore: corsi a ore (propaganda/agonismo) ---
    const hourCourses = Object.entries(instructorHoursByCourse).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    for (const [courseName, hours] of hourCourses) {
      if (hours <= 0) continue;

      // tariffa: serve courseTypeId per essere corretti al 100%
      // qui usiamo una lookup sul primo shift di quel corso per recuperare l'id
      const sample = shifts.find(
        (s) =>
          s.role === "istruttore" &&
          (s.course_type_data?.name || s.course?.name || "").toLowerCase() === courseName
      );
      const courseTypeId = sample?.course_type_data?.id ?? sample?.course_type ?? null;

      const rate = getInstructorRateForCourseTypeId(courseTypeId);
      const subtotal = hours * rate;
      totalEUR += subtotal;

      lines.push({
        section: "instructor",
        label: `Istruttore – ${pretty(courseName)}`,
        qtyText: `${formatHours(hours)} ore`,
        rateText: `${formatEUR(rate)}/h`,
        subtotal,
      });
    }

    return { lines, totalEUR };
  };


  

  // istruttore: prima personalizzata per corso (InstructorCourseRate), altrimenti base del corso (CourseType.base_rate)
  const getInstructorRateForCourseTypeId = (courseTypeId) => {
    if (!courseTypeId) return 0;

    const custom = instructorCourseRates.find(
      (x) => x.instructor === Number(userId) && x.course_type === courseTypeId
    );
    if (custom?.rate != null) return Number(custom.rate);

    const base = courseTypes.find((ct) => ct.id === courseTypeId);
    if (base?.base_rate != null) return Number(base.base_rate);

    return 0;
  };

  const computeMonthlyPayEUR = (shifts) => {
    const HOURLY_INSTRUCTOR_COURSES = new Set(["propaganda", "agonismo"]);
    let total = 0;

    for (const s of shifts) {
      if (["bagnino", "segreteria", "pulizia"].includes(s.role)) {
        const hours = diffHours(s.start_time, s.end_time);
        total += hours * getHourlyRateForRole(s.role);
        continue;
      }

      if (s.role === "istruttore") {
        const courseTypeId = s.course_type_data?.id ?? s.course_type ?? null;
        const courseName = (s.course_type_data?.name || s.course?.name || "").toLowerCase();
        const rate = getInstructorRateForCourseTypeId(courseTypeId);

        if (HOURLY_INSTRUCTOR_COURSES.has(courseName)) {
          const hours = diffHours(s.start_time, s.end_time);
          total += hours * rate;       // €/h
        } else {
          total += 1 * rate;           // €/turno
        }
      }
    }

    return total;
  };


  const { lines: payLines, totalEUR: monthlyPay } = computeMonthlyPayBreakdown(shifts);


  return (
    <div className="cd-page-6">
      <div className="cd-container">

        {/* Header + mese */}
        <div className="cd-header">
          <div>
            <h1 className="cd-title">{user.username}</h1>
            <div className="cd-subtitle">Contabilità</div>
          </div>

          <div className="cd-monthbar">
            <button className="cd-navbtn" onClick={() => changeMonth(-1)}>
              ◀
            </button>
            <div className="cd-monthlabel">
              {monthLabel} {currentYear}
            </div>
            <button className="cd-navbtn" onClick={() => changeMonth(1)}>
              ▶
            </button>
          </div>
        </div>

        {/* LISTA GIORNI / TURNI */}
        <div className="cd-card">
          <div className="cd-card-header">
            <h3 className="cd-card-title">Turni del mese</h3>
          </div>

          <div className="cd-card-body">
            {Object.keys(grouped).sort().map((day) => (
              <div key={day} className="cd-day">
                <div className="cd-day-title">
                  <span className="cd-day-dot" />
                  {new Date(day).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "long",
                  })}
                </div>

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
                  if (["bagnino", "segreteria", "pulizia"].includes(s.role)) {
                    const hours = diffHours(s.start_time, s.end_time);
                    const label = hours === 1 ? "ora" : "ore";
                    extraLabel = `(${formatHours(hours)} ${label})`;
                  }

                  return (
                    <div key={s.id || s.start_time} className="cd-shift">
                      <div className="cd-shift-left">
                        <span className="cd-bullet">▸</span>
                        <span className="cd-role">{s.role}</span>
                        <span className="cd-time">
                          {start}–{end}
                        </span>
                      </div>

                      {extraLabel && <span className="cd-meta cd-pill">{extraLabel}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* TOTALI MESE */}
        <div className="cd-card">
          <div className="cd-card-header">
            <h3 className="cd-card-title">
              Totale mese – {monthLabel} {currentYear}
            </h3>
          </div>

          <div className="cd-card-body">
            {/* Bagnino / Segreteria / Pulizia → totale ore */}
            <div className="cd-totals">
              {hoursByRole.bagnino > 0 && (
                <p>
                  <strong>Bagnino:</strong> {formatHours(hoursByRole.bagnino)}{" "}
                  {hoursByRole.bagnino === 1 ? "ora" : "ore"}
                </p>
              )}

              {hoursByRole.segreteria > 0 && (
                <p>
                  <strong>Segreteria:</strong> {formatHours(hoursByRole.segreteria)}{" "}
                  {hoursByRole.segreteria === 1 ? "ora" : "ore"}
                </p>
              )}

              {hoursByRole.pulizia > 0 && (
                <p>
                  <strong>Pulizia:</strong> {formatHours(hoursByRole.pulizia)}{" "}
                  {hoursByRole.pulizia === 1 ? "ora" : "ore"}
                </p>
              )}
            </div>

            {/* Istruttore */}
            {(
              Object.entries(instructorByCourse).some(([, count]) => count > 0) ||
              Object.entries(instructorHoursByCourse).some(([, hours]) => hours > 0)
            ) && (
              <div className="cd-section">
                <p className="cd-subtitle" style={{ marginTop: 8 }}>
                  <strong>Istruttore</strong>
                </p>

                <ul className="cd-list">
                  {/* Corsi conteggiati a TURNI */}
                  {Object.entries(instructorByCourse)
                    .filter(([, count]) => count > 0)
                    .map(([courseName, count]) => (
                      <li key={`turni-${courseName}`}>
                        {courseName}: {count} {count === 1 ? "turno" : "turni"}
                      </li>
                    ))}

                  {/* Corsi conteggiati a ORE (propaganda, agonismo) */}
                  {Object.entries(instructorHoursByCourse)
                    .filter(([, hours]) => hours > 0)
                    .map(([courseName, hours]) => (
                      <li key={`ore-${courseName}`}>
                        {courseName}: {formatHours(hours)} {hours === 1 ? "ora" : "ore"}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* Compenso mese */}
            {payLines.length > 0 && (
              <div className="cd-paybox">
                <p className="cd-paybox-title">Compenso mese</p>

                <ul className="cd-list">
                  {payLines.map((l) => (
                    <li key={`${l.label}-${l.qtyText}-${l.rateText}`}>
                      {l.label}: {l.qtyText} × {l.rateText} = {formatEUR(l.subtotal)}
                    </li>
                  ))}
                </ul>

                <div className="cd-paytotal">
                  <span>Totale</span>
                  <span>{formatEUR(monthlyPay)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}