import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { supabase } from "../services/supabase";
import ManualInterventionModal from "../components/ManualInterventionModal";
import {  formatDatePL,} from "../utils/date";

interface Interwencja {
  id: number;
  device_id: string;
  structure: string;
  location: string;
  event_name: string;
  start_date: string;
  end_date: string;
  user_email: string;
  actions: string[];
  parts: string[];
  hardware: string;
}

interface GeneralIntervention {
  id: number;
  category_name: string;
  quantity: number | null;
  user_email: string | null;
  created_at: string;
}

interface GeneralCategory {
  id: number;
  name: string;
  requires_quantity: boolean;
  quantity_label: string;
  stat_mode: string;
}


export default function Interwencje() {
 
const [dateFrom, setDateFrom] =
  useState<Date | null>(null);

const [dateTo, setDateTo] =
  useState<Date | null>(null);

const [rangePreset, setRangePreset] =
  useState("");

  const [terminalFilter, setTerminalFilter] =
    useState("");

  const [userFilter, setUserFilter] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState("");

  
const [viewMode, setViewMode] =
  useState<
    "list" |
    "stats" |
    "general"
  >("list");


  const [loading, setLoading] =
    useState(true);

  const [interwencje, setInterwencje] =
    useState<Interwencja[]>([]);

const [showModal, setShowModal] =
  useState(false);

const [
  generalInterventions,
  setGeneralInterventions,
] = useState<
  GeneralIntervention[]
>([]);

const [
  generalCategories,
  setGeneralCategories,
] = useState<GeneralCategory[]>([]);


  async function loadInterwencje() {
  setLoading(true);

  const [
    interwencjeResult,
    generalResult,
    categoriesResult,
  ] = await Promise.all([
    supabase
      .from("interwencje2")
      .select("*")
      .order("start_date", {
        ascending: false,
      }),

    supabase
      .from("general_interventions")
      .select("*")
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from(
        "general_intervention_categories"
      )
      .select("*"),
  ]);

  if (!interwencjeResult.error) {
    setInterwencje(
      interwencjeResult.data || []
    );
  }

  if (!generalResult.error) {
    setGeneralInterventions(
      generalResult.data || []
    );
  }

  if (!categoriesResult.error) {
    setGeneralCategories(
      categoriesResult.data || []
    );
  }

  setLoading(false);
}


  useEffect(() => {
    loadInterwencje();

    const channel = supabase
      .channel("interwencje-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "interwencje2",
        },
        async () => {
          await loadInterwencje();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, []);

  const users = useMemo(() => {
    return [
      ...new Set(
        interwencje
          .map((i) => i.user_email)
          .filter(Boolean)
      ),
    ].sort();
  }, [interwencje]);

  const filteredInterwencje =
    interwencje.filter((i) => {
      if (
        terminalFilter &&
        !String(i.device_id)
          .toLowerCase()
          .includes(
            terminalFilter.toLowerCase()
          )
      ) {
        return false;
      }

      if (
        userFilter &&
        i.user_email !== userFilter
      ) {
        return false;
      }

      const parts =
        Array.isArray(i.parts)
          ? i.parts
          : [];

      if (
        typeFilter === "wymiany" &&
        parts.length === 0
      ) {
        return false;
      }

      if (
        typeFilter === "operacje" &&
        parts.length > 0
      ) {
        return false;
      }

      const d = new Date(
        i.start_date
      );

      if (dateFrom) {
  const from = new Date(
    dateFrom
  );

  from.setHours(
    0,
    0,
    0,
    0
  );

  if (d < from) {
    return false;
  }
}

      if (dateTo) {
  const to = new Date(
    dateTo
  );

  to.setHours(
    23,
    59,
    59,
    999
  );

  if (d > to) {
    return false;
  }
}

      return true;
    });

  const stats = useMemo(() => {
  const result: Record<
    string,
    
{
  total: number;
  actions: Record<string, number>;
  wymiany: Record<string, number>;
  general: Record<string, number>;
}

  > = {};

  filteredInterwencje.forEach(
    (i) => {
      const user =
        i.user_email ||
        "Brak danych";

      if (!result[user]) {
        result[user] = {
          total: 0,
          actions: {},
          wymiany: {},
          general: {},
};

      }

      result[user].total++;

      (i.actions || []).forEach(
        (a) => {
          result[user].actions[a] =
            (result[user]
              .actions[a] || 0) + 1;
        }
      );

      (i.parts || []).forEach(
        (p) => {
          result[user].wymiany[p] =
            (result[user]
              .wymiany[p] || 0) + 1;
        }
      );
    }
  );
generalInterventions.forEach(
  (i) => {
    const user =
      i.user_email ||
      "Brak danych";

    if (!result[user]) {
      result[user] = {
        total: 0,
        actions: {},
        wymiany: {},
        general: {},
      };
    }

    const category =
  generalCategories.find(
    (c) =>
      c.name ===
      i.category_name
  );

const statMode =
  category?.stat_mode ||
  "count";

result[user].general[
  i.category_name
] =
  (result[user].general[
    i.category_name
  ] || 0) +
  (
    statMode === "sum"
      ? (i.quantity || 0)
      : 1
  );
  }
);

  return result;
}, [filteredInterwencje]);
function setDateRange(
  value: string
) {
  setRangePreset(value);

  const now = new Date();

  if (!value) {
    return;
  }

  if (value === "today") {
    setDateFrom(now);
    setDateTo(now);
  }

  if (value === "week") {
    const past = new Date();

    past.setDate(
      now.getDate() - 7
    );

    setDateFrom(past);
    setDateTo(now);
  }

  if (value === "month") {
    const start =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

    setDateFrom(start);
    setDateTo(now);
  }

  if (value === "prevMonth") {
    const start =
      new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );

    const end =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        0
      );

    setDateFrom(start);
    setDateTo(end);
  }
}
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
        🧰 Interwencje (
        {filteredInterwencje.length})
      </h2>

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
<select
  value={rangePreset}
  onChange={(e) =>
    setDateRange(
      e.target.value
    )
  }
>
  <option value="">
    📅 Własny zakres
  </option>

  <option value="today">
    Dziś
  </option>

  <option value="week">
    Ostatnie 7 dni
  </option>

  <option value="month">
    Obecny miesiąc
  </option>

  <option value="prevMonth">
    Poprzedni miesiąc
  </option>
</select>

        <input
          type="text"
          placeholder="Numer parkomatu"
          value={terminalFilter}
          onChange={(e) =>
            setTerminalFilter(
              e.target.value
            )
          }
        />

        <select
          value={userFilter}
          onChange={(e) =>
            setUserFilter(
              e.target.value
            )
          }
        >
          <option value="">
            Wszyscy pracownicy
          </option>

          {users.map((user) => (
            <option
              key={user}
              value={user}
            >
              {user}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(
              e.target.value
            )
          }
        >
          <option value="">
            Wszystkie
          </option>

          <option value="wymiany">
            🔧 Wymiany
          </option>

          <option value="operacje">
            ⚙️ Operacje
          </option>
        </select>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <button
  onClick={() =>
    setViewMode("stats")
  }
  style={{
    background:
      viewMode === "stats"
        ? "#1d4ed8"
        : "#374151",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
  }}
>
  📊 Statystyki
</button>

<button
  onClick={() =>
    setViewMode("list")
  }
  style={{
    background:
      viewMode === "list"
        ? "#1d4ed8"
        : "#374151",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
  }}
>
  📋 Lista
</button>
<button
  onClick={() =>
    setViewMode("general")
  }
  style={{
    background:
      viewMode === "general"
        ? "#1d4ed8"
        : "#374151",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
  }}
>
  📈 Czynności ogólne
</button>
        <button
  onClick={() =>
    setShowModal(true)
  }
  style={{
    background: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
  }}
>
  ➕ Dodaj interwencję
</button>
      </div>

      {loading ? (
        <div>
          Ładowanie...
        </div>
      ) : viewMode === "stats" ? (
        <div>
  {Object.entries(stats).map(
    ([user, data]) => (
      <div
        key={user}
        className="app-card"
        style={{
          marginBottom: 12,
        }}
      >
        <b>
          👤 {user}
        </b>

        <br />

        Interwencji:
        {" "}
        {data.total}

        <br />
        <br />

        <b>
          🔧 Wymiany
        </b>

        <ul>
          {Object.entries(
            data.wymiany
          )
            .sort(
              (a, b) =>
                b[1] - a[1]
            )
            .map(
              ([name, count]) => (
                <li key={name}>
                  {name}: {count}
                </li>
              )
            )}

          {Object.keys(
            data.wymiany
          ).length === 0 && (
            <li>Brak</li>
          )}
        </ul>

        <b>
  ⚙️ Wszystkie czynności
</b>

<ul>
  {Object.entries(
    data.actions
  )
    .sort(
      (a, b) =>
        b[1] - a[1]
    )
    .map(
      ([name, count]) => (
        <li key={name}>
          {name}: {count}
        </li>
      )
    )}

  {Object.keys(
    data.actions
  ).length === 0 && (
    <li>Brak</li>
  )}
</ul>

<br />

<b>
  📈 Czynności ogólne
</b>

<ul>
  {Object.keys(
    data.general
  ).length === 0 ? (
    <li>Brak</li>
  ) : (
    Object.entries(
      data.general
    )
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
      .map(
        ([name, count]) => (
          <li key={name}>
            {name}: {count}
          </li>
        )
      )
  )}
</ul>
      </div>
    )
  )}
</div>
      ) : viewMode === "general" ? (
  <div>
    {generalInterventions.map(
      (item) => (
        <div
          key={item.id}
          className="app-card"
          style={{
            marginBottom: 12,
          }}
        >
          <b>
            📊 {item.category_name}
          </b>

          <br />

          👤 {item.user_email}

          <br />

          📅{" "}
          {formatDatePL(
            item.created_at
          )}

          {item.quantity !== null && (
            <>
              <br />
              Ilość: {item.quantity}
            </>
          )}
        </div>
      )
    )}

    {generalInterventions.length === 0 && (
      <div>
        Brak czynności ogólnych
      </div>
    )}
  </div>
) : (
  <div>
    {filteredInterwencje.map(
            (i) => (
              <div
                key={i.id}
                className="app-card"
                style={{
                  marginBottom: 12,
                }}
              >
                <b>
                  Parkomat{" "}
                  {i.device_id}
                </b>

                <br />

                {i.location}

                <br />
                <br />

                <b>
                  {i.event_name}
                </b>

                <br />

                👤{" "}
                {i.user_email}

                <br />
                <br />

                Od:
{" "}
{formatDatePL(
  i.start_date
)}

<br />

Do:
{" "}
{formatDatePL(
  i.end_date
)}

                {Array.isArray(i.actions) &&
  i.actions.length > 0 && (
    <>
      <br />
      <br />

      <b>⚙️ Operacje</b>

      <ul>
        {i.actions.map((action) => (
          <li key={action}>
            {action}
          </li>
        ))}
      </ul>
    </>
)}


                {Array.isArray(
                  i.parts
                ) &&
                  i.parts.length >
                    0 && (
                    <>
                      <b>
                        🔧
                        Wymienione
                        części
                      </b>

                      <ul>
                        {i.parts.map(
                          (
                            part
                          ) => (
                            <li
                              key={
                                part
                              }
                            >
                              {part}
                            </li>
                          )
                        )}
                      </ul>
                    </>
                  )}
              </div>
            )
          )}
        </div>
      )}
      {showModal && (
  <ManualInterventionModal
    open={showModal}
    onClose={() =>
      setShowModal(false)
    }
    onSaved={() => {
      loadInterwencje();
      setShowModal(false);
    }}
  />
)}
    </div>
  );
}