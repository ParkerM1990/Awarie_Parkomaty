import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";

import {
  useParkomaty,
} from "../context/ParkomatyContext";

import MultiNodeSelect from "../components/MultiNodeSelect";

interface ActiveEvent {
  id: string;
  structure: string;
}

export default function Urzadzenia() {
  
  const [events, setEvents] =
    useState<ActiveEvent[]>([]);

const { parkomaty } =
  useParkomaty();

  const [search, setSearch] =
    useState("");

  

const [
  nodeFilters,
  setNodeFilters,
] = useState<string[]>([]);



  async function loadData() {

    const {
      data: activeData,
    } = await supabase
      .from("active_events")
      .select(
        "id,structure"
      );

    setEvents(
      activeData || []
    );
  }

  useEffect(() => {
    loadData();

    const channel =
      supabase
        .channel(
          "devices-realtime"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "active_events",
          },
          async () => {
            await loadData();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, []);

  const nodes = useMemo(() => {
    return [
      ...new Set(
        parkomaty
          .map(
            (p) => p.node
          )
          .filter(Boolean)
      ),
    ].sort();
  }, [parkomaty]);

  function getAlarmCount(
    id: string,
    structure: string
  ) {
    return events.filter(
      (event) =>
        event.id === id &&
        event.structure ===
          structure
    ).length;
  }

  const filteredDevices =
    parkomaty.filter(
      (device) => {
        const text =
          `${device.id} ${device.location}`.toLowerCase();

        if (
          search &&
          !text.includes(
            search.toLowerCase()
          )
        ) {
          return false;
        }

       if (
  nodeFilters.length > 0 &&
  !nodeFilters.includes(
    device.node
  )
) {
  return false;
}

        return true;
      }
    );

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
  🖥️ Urządzenia ({filteredDevices.length})
</h2>


      <div
        className="app-panel"
        style={{
          display: "grid",
          gap: 10,
          marginBottom: 20,
        }}
      >
        

        <input
          type="text"
          placeholder="Szukaj numeru lub adresu..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
        />
      </div>

<MultiNodeSelect
  options={nodes}
  selected={nodeFilters}
  onChange={setNodeFilters}
/>

      {filteredDevices.map(
        (device) => {
          const alarms =
            getAlarmCount(
              device.id,
              device.structure
            );

          return (
            <div
              key={`${device.id}-${device.structure}`}
              className="app-card"
              style={{
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                }}
              >
                <div>
                  <b>
                    Parkomat{" "}
                    {device.id}
                  </b>

                  <br />

                  {
                    device.location
                  }

                  <br />

                  <small
                    style={{
                      color:
                        "#9ca3af",
                    }}
                  >
                    Strefa:{" "}
                    {
                      device.node
                    }
                  </small>
                </div>

                <div
                  style={{
                    minWidth: 50,
                    textAlign:
                      "center",
                    padding:
                      "6px 10px",
                    borderRadius: 10,
                    background:
                      alarms >
                      0
                        ? "#dc2626"
                        : "#16a34a",
                    color:
                      "white",
                    fontWeight:
                      "bold",
                  }}
                >
                  {alarms}
                </div>
              </div>

              <div
  style={{
    marginTop: 12,
  }}
>
  <a
    href={`https://www.google.com/maps/dir/?api=1&destination=${device.lat},${device.lng}`}
    target="_blank"
    rel="noreferrer"
    style={{
      display: "inline-block",
      background: "#16a34a",
      color: "white",
      padding: "8px 12px",
      borderRadius: 8,
      textDecoration: "none",
      fontWeight: "bold",
    }}
  >
    🧭 Nawiguj
  </a>
</div>
              </div>
          );
        }
      )}
    </div>
  );
}