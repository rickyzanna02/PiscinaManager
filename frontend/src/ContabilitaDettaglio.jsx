import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "./api";



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
    return (
      a.role === "istruttore" &&
      b.role === "istruttore" &&
      a.course?.name === b.course?.name && // stesso tipo di corso
      a.end_time === b.start_time // contigui
    );
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
      merged_count: block.length,
      merged_course: block[0].course?.name || "",
      _is_merged: true,
    };
  });
}


export default function ContabilitaDettaglio() {
  const { userId } = useParams();

  const [user, setUser] = useState(null);
  const [shifts, setShifts] = useState([]);

  // mese/anno attuali
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  useEffect(() => {
    // carica informazioni utente
    api.get(`users/${userId}/`).then((res) => setUser(res.data)).catch(() => {});

    // carica turni del mese
    api
      .get(`shifts/?user=${userId}&month=${month}&year=${year}`)
      .then((res) => {
        // ordina per data
        const sorted = res.data.sort((a, b) =>
          a.date.localeCompare(b.date)
        );
        setShifts(sorted);
      });
  }, [userId, month, year]);

  // Raggruppa turni per giorno
  const grouped = shifts.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});

  if (!user) return <div className="p-6">Caricamento…</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">{user.username}</h1>
      <h2 className="text-lg font-semibold mb-4">
        {today.toLocaleString("it-IT", { month: "long" }).toUpperCase()} {year}
      </h2>

      <div className="bg-white p-4 rounded shadow">
        {Object.keys(grouped).map((day) => (
          <div key={day} className="mb-4">
            <h3 className="font-bold text-md mb-2">
              {new Date(day).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
              })}
            </h3>

            {mergeContiguousShifts(grouped[day]).map((s) => (
              <div key={s.id || s.start_time} className="ml-4 text-sm text-gray-700 mb-1">
                ▸ {s.role} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                {s._is_merged && (
                    <span className="text-gray-500">
                    {" "}
                    ({s.merged_count} corsi {s.merged_course})
                    </span>
                )}
                </div>

            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
