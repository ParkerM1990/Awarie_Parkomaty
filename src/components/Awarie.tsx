import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import ServiceModal from "./ServiceModal";
import type { Parkomat } from "../types/Parkomat";
import MultiNodeSelect from "../components/MultiNodeSelect";
import {  formatDatePL,} from "../utils/date";

interface ActiveEvent {
  id: string;
  structure: string;

  event_name: string;
  event_code: string;

  hardware: string;
  date: string;

  event_level_name?: string;
  info_count?: number;
}


export default function Awarie() {
  const [events, setEvents] =
    useState<ActiveEvent[]>([]);

  const [parkomaty, setParkomaty] =
    useState<Parkomat[]>([]);

  const [search, setSearch] = useState("");
  
const [nodeFilters,  setNodeFilters,] = useState<string[]>([]);

  const [eventFilter, setEventFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [serviceModalOpen,
    setServiceModalOpen] =
    useState(false);

  const [
    selectedEventForService,
    setSelectedEventForService,
  ] = useState<ActiveEvent | null>(
    null
  );

  const [
    selectedParkomat,
    setSelectedParkomat,
  ] = useState<Parkomat | null>(
    null
  );

  async function loadData() {
    const { data: eventsData } = await supabase
      .from("active_events")
      .select("*")
      .neq("level", "RESET");

    let allParkomaty: Parkomat[] = [];

let from = 0;
const limit = 1000;

while (true) {
  const { data, error } =
    await supabase
      .from("parkomaty")
      .select("*")
      .range(
        from,
        from + limit - 1
      );

  if (error) {
    console.error(error);
    break;
  }

  allParkomaty = [
    ...allParkomaty,
    ...(data || []),
  ];

  if (
    !data ||
    data.length < limit
  ) {
    break;
  }

  from += limit;
}

setParkomaty(allParkomaty);
setEvents(eventsData || []);
console.log(
  "AWARIE - PARKOMATY:",
  allParkomaty.length
);
  }

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("active-events-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "active_events",
        },
        async () => {
          await loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function getParkomat(
  id: string,
  structure: string
) {
  return parkomaty.find(
    (p) =>
      String(p.id).trim() ===
        String(id).trim() &&
      String(
        p.structure || ""
      )
        .trim()
        .toUpperCase() ===
      String(
        structure || ""
      )
        .trim()
        .toUpperCase()
  );
}

  const nodes = useMemo(() => {
    return [
      ...new Set(
        parkomaty
          .map((p) => p.node)
          .filter(Boolean)
      ),
    ].sort();
  }, [parkomaty]);

  const eventNames = useMemo(() => {
    return [
      ...new Set(
        events
          .map((e) => e.event_name)
          .filter(Boolean)
      ),
    ].sort();
  }, [events]);

const now = new Date();

const activeEvents = events.filter(
  (e) => {

    const isInfo =
      e.event_level_name ===
      "Informacja";

    if (!isInfo) {
      return true;
    }

    const count = Number(
      e.info_count || 0
    );

    if (!count) {
      return false;
    }

    const diffHours =
      (now.getTime() -
        new Date(
          e.date
        ).getTime()) /
      (1000 * 60 * 60);

    return (
      count >= 1 &&
      diffHours <= 24
    );
  }
);
  const filteredEvents =
    activeEvents.filter((e) => {
      const p = getParkomat(
        e.id,
        e.structure
      );

      if (!p) {
        return false;
      }

      if (
        search &&
        !e.id
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
      ) {
        return false;
      }

      
if (
  nodeFilters.length > 0 &&
  !nodeFilters.includes(p.node)
) {
  return false;
}


      if (
        eventFilter &&
        e.event_name !==
          eventFilter
      ) {
        return false;
      }

      const eventDate =
        new Date(e.date);

      if (dateFrom) {
        const from =
          new Date(
            dateFrom +
              "T00:00:00"
          );

        if (eventDate < from) {
          return false;
        }
      }

      if (dateTo) {
        const to =
          new Date(
            dateTo +
              "T23:59:59"
          );

        if (eventDate > to) {
          return false;
        }
      }

      return true;
    });

  const groupedEvents = filteredEvents.reduce(
  (acc, event) => {

    
const key =
  `${String(event.id).trim()}|${String(
    event.structure || ""
  )
    .trim()
    .toUpperCase()}`;


    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(event);

    return acc;
  },
  {} as Record<
    string,
    ActiveEvent[]
  >
);

return (
  <div
    style={{
      padding: 20,
      height: "100%",
      overflowY: "auto",
    }}
  >

      <h2>⚠️ Aktywne awarie</h2>

   <MultiNodeSelect
  options={nodes}
  selected={nodeFilters}
  onChange={setNodeFilters}
/>   
<div
  className="app-panel"
  style={{
    display: "grid",
    gap: 10,
    marginBottom: 20,
  }}
>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) =>
            setDateFrom(
              e.target.value
            )
          }
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) =>
            setDateTo(
              e.target.value
            )
          }
        />

        <input
          type="text"
          placeholder="Numer parkomatu"
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
        />

        <select
          value={eventFilter}
          onChange={(e) =>
            setEventFilter(
              e.target.value
            )
          }
        >
          <option value="">
            Wszystkie awarie
          </option>

          {eventNames.map(
            (eventName) => (
              <option
                key={eventName}
                value={eventName}
              >
                {eventName}
              </option>
            )
          )}
        </select>
      </div>

      

{Object.entries(groupedEvents)
  .sort((a, b) =>
    a[1][0].id.localeCompare(
      b[1][0].id
    )
  )
  .map(([key, group]) => {


    const first = group[0];

    const parkomat = getParkomat(
      first.id,
      first.structure
    );

    return (
      
<div
    key={key}
  className="app-card"
  style={{
    marginBottom: 10,
  }}
>

        <b>
          Parkomat {first.id}
        </b>

        <br />

        {parkomat?.location}

        <br />
        <br />

        {group.map((event, idx) => (
          <div key={idx}>
            <b>
              {event.hardware || "Inne"}
            </b>

            <br />

            {event.event_name}

            <br />

            
<small>
  {formatDatePL(
    event.date
  )}
</small>


            <br />
            <br />

<button
  onClick={() => {
    setSelectedEventForService(event);

    setSelectedParkomat(
      getParkomat(
        event.id,
        event.structure
      ) || null
    );

    setServiceModalOpen(true);
  }}
  style={{
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
  }}
>
  🔧 Usuń awarię
</button>
          </div>
        ))}
      </div>
    );
  }
)}
<ServiceModal
  open={serviceModalOpen}
  event={selectedEventForService}
  parkomat={selectedParkomat}
  onClose={() => {
    setServiceModalOpen(false);
    setSelectedEventForService(null);
    setSelectedParkomat(null);
  }}
  onSaved={loadData}
/>



</div>
  );
}
