import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  useParkomaty,
} from "../context/ParkomatyContext";
import MultiNodeSelect from "../components/MultiNodeSelect";
import {  formatDatePL,} from "../utils/date";

interface HistoryEvent {
  id: string;
  structure: string;
  event_name: string;
  hardware: string;
  start_date: string;
  end_date: string;
}


export default function Historia() {
  const [events, setEvents] = useState<
    HistoryEvent[]
  >([]);


const { parkomaty } =
  useParkomaty();

  const [search, setSearch] = useState("");

const [
  nodeFilters,
  setNodeFilters,
] = useState<string[]>([]);

  const [eventFilter, setEventFilter] =
    useState("");
  
const [dateFrom, setDateFrom] =
  useState<Date | null>(null);

const [dateTo, setDateTo] =
  useState<Date | null>(null);

const [visibleCount, setVisibleCount] =
  useState(100);

const [groupByParkomat, setGroupByParkomat] =
  useState(false);

  async function loadData() {
  let query = supabase
    .from("history_events")
    .select("*");

  // domyślnie tylko ostatnie 3 dni
  if (!dateFrom && !dateTo) {
    const threeDaysAgo = new Date();

    threeDaysAgo.setDate(
      threeDaysAgo.getDate() - 3
    );

    query = query.gte(
      "end_date",
      threeDaysAgo.toISOString()
    );
  }

  const { data: historyData } =
    await query.order(
      "start_date",
      {
        ascending: false,
      }
    );
  setEvents(historyData || []);
}

  
useEffect(() => {
  loadData();
}, [dateFrom, dateTo]);


    useEffect(() => {
  const channel = supabase
    .channel("history-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "history_events",
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
useEffect(() => {
  setVisibleCount(100);
}, [
  search,
  nodeFilters,
  eventFilter,
  dateFrom,
  dateTo,
]);
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

  const filteredEvents =
    events.filter((event) => {
      const p = getParkomat(
        event.id,
        event.structure
      );

      if (!p) {
        return false;
      }

      if (
        search &&
        !event.id
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
      ) {
        return false;
      }

      
if (
  nodeFilters.length > 0 &&
  !nodeFilters.includes(
    p.node
  )
) {
  return false;
}


      if (
        eventFilter &&
        event.event_name !==
          eventFilter
      ) {
        return false;
      }

      const eventDate =
        new Date(event.start_date);

      if (dateFrom) {
  const from = new Date(dateFrom);

  if (eventDate < from) {
    return false;
  }
}

if (dateTo) {
  const to = new Date(dateTo);

  to.setHours(
    23,
    59,
    59,
    999
  );

  if (eventDate > to) {
    return false;
  }
}
      return true;
    });
const groupedEvents =
  filteredEvents.reduce(
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
      HistoryEvent[]
    >
  );
const groupedEntries =
  Object.entries(groupedEvents)
    .sort((a, b) => {
      const aId = a[1][0].id;
      const bId = b[1][0].id;

      return aId.localeCompare(
        bId,
        undefined,
        {
          numeric: true,
        }
      );
    });
    
  return (
    
<div
  style={{
    padding: 20,
    paddingBottom: 120,
    height: "100%",
    overflowY: "auto",
  }}
>

      
<h2>
  📜 Historia awarii ({filteredEvents.length})

  {!dateFrom && !dateTo && (
    <span
      style={{
        fontSize: 14,
        color: "#9ca3af",
        marginLeft: 8,
      }}
    >
      ostatnie 3 dni
    </span>
  )}
</h2>

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

      

        <DatePicker
  selected={dateFrom}
  onChange={(date: Date | null) =>
    setDateFrom(date)
  }
  dateFormat="dd.MM.yyyy"
  placeholderText="Data od"
/>


<DatePicker
  selected={dateTo}
  onChange={(date: Date | null) =>
    setDateTo(date)
  }
  dateFormat="dd.MM.yyyy"
  placeholderText="Data do"
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
        <label
  style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
  }}
>
  <input
    type="checkbox"
    checked={groupByParkomat}
    onChange={(e) =>
      setGroupByParkomat(
        e.target.checked
      )
    }
  />

  Grupuj po parkomacie
</label>
      </div>

      {groupByParkomat ? (
  groupedEntries.map(
    ([key, items]) => {
      const first = items[0];

      const parkomat =
        getParkomat(
          first.id,
          first.structure
        );

      const counters =
        items.reduce(
          (acc, ev) => {
            acc[ev.event_name] =
              (acc[ev.event_name] || 0) + 1;

            return acc;
          },
          {} as Record<
            string,
            number
          >
        );

      return (
        <div
          key={`group-${key}`}
          className="app-card"
        >
          <b>
            Parkomat {first.id}
          </b>

          <br />

          {parkomat?.location}

          <br />
          <br />

          
Łącznie zdarzeń:{" "}
{items.length}

<br />

Różne typy awarii:{" "}
{Object.keys(counters).length}


          <hr />
{Object.entries(counters)
  .sort(
    (a, b) => b[1] - a[1]
  )
  .map(

            ([name, count]) => (
              <div key={name}>
                {name} ({count})
              </div>
            )
          )}
        </div>
      );
    }
  )
) : (
  filteredEvents
    .slice(0, visibleCount)
    .map((event) => {
      const parkomat =
        getParkomat(
          event.id,
          event.structure
        );

      return (
        <div
          key={`${event.id}-${event.structure}-${event.start_date}-${event.end_date}-${event.event_name}`}
          className="app-card"
        >
          <b>
            Parkomat {event.id}
          </b>

          <br />

          {parkomat?.location}

          <br />
          <br />

          <small
            style={{
              color: "#9ca3af",
            }}
          >
            {event.hardware ||
              "Brak danych"}
          </small>

          <br />

          {event.event_name}

          <br />
          <br />

          Od{" "}
          {formatDatePL(
  event.start_date
)}

          <br />

          Do{" "}
          {formatDatePL(
  event.end_date
)}
        </div>
      );
    })
)}

{!groupByParkomat &&
  filteredEvents.length >
    visibleCount && (
    <button
      onClick={() =>
        setVisibleCount(
          (prev) =>
            prev + 100
        )
      }
      style={{
        width: "100%",
        marginTop: 12,
        marginBottom: 80,
        padding: 12,
        background: "#2563eb",
        color: "white",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
      }}
    >
      📜 Pokaż kolejne 100
    </button>
)}
    </div>
  );
}