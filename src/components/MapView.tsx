import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  LayersControl,
  Marker,
  Popup,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { supabase } from "../services/supabase";
import type { Parkomat } from "../types/Parkomat";
import type { ActiveEvent } from "../types/ActiveEvent";

import MapFilters from "./MapFilters";
import ServiceModal from "./ServiceModal";

import {  formatDatePL,} from "../utils/date";

const RED_CODES = [
  "16384",
  "16385",
  "16386",
  "16900",
  "16899",
  "16897",
  "16901",
  "16401",
  "33280",
  "228",
  "202",
  "234",
  "10000",
  "124",
  "23297",
];

function parseUTC(dateStr: string) {
  if (!dateStr) return null;

  const iso =
    dateStr
      .replace(" ", "T")
      .split(".")[0] + "Z";

  const d = new Date(iso);

  return isNaN(d.getTime())
    ? null
    : d;
}

export default function MapView() {
  const [parkomaty, setParkomaty] = useState<Parkomat[]>([]);
  const [events, setEvents] = useState<ActiveEvent[]>([]);
  const [ selectedNodes,setSelectedNodes,] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [threshold, setThreshold] = useState(1);
  const [hours, setHours] =  useState(24);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [ selectedEventForService, setSelectedEventForService] = useState<ActiveEvent | null>(null);
  const [ selectedParkomat, setSelectedParkomat] = useState<Parkomat | null>(null);

  async function loadData() {
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

    const { data: eData } =
      await supabase
        .from("active_events")
        .select("*")
        .neq("level", "RESET");
    setEvents(eData || []);
  }

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("map-realtime")
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

  function markerIcon(
    count: number,
    critical: boolean
  ) {
    return L.divIcon({
      className: "",
      html: `
        <div style="
          width:24px;
          height:24px;
          border-radius:50%;
          background:${critical ? "#dc2626" : "#16a34a"};
          border:2px solid white;
          display:flex;
          align-items:center;
          justify-content:center;
          color:white;
          font-size:12px;
          font-weight:bold;
          box-shadow:0 0 8px rgba(0,0,0,0.6);
        ">
          ${count}
        </div>
      `,
    });
  }

  const nodes = [
    ...new Set(
      parkomaty
        .map((p) => p.node)
        .filter(Boolean)
    ),
  ].sort();

  const now = new Date();

const filteredEventsForDropdown =
  events.filter((e) => {
    const isInfo =
      e.event_level_name ===
      "Informacja";

    if (!isInfo) {
      return true;
    }

    const count =
      e.info_count || 0;

    const diffHours =
      (now.getTime() -
        new Date(e.date).getTime()) /
      (1000 * 60 * 60);

    return (
      count >= threshold &&
      diffHours <= hours
    );
  });

const eventNames = [
  ...new Set(
    filteredEventsForDropdown
      .filter(
        (e) =>
          e.event_level_name !==
          "Informacja" &&
          e.event_name
      )
      .map((e) => e.event_name)
  ),
].sort();
const activeEventsMap: Record<
  string,
  ActiveEvent[]
> = {};

events.forEach((e) => {
  const key =
  `${String(e.id).trim()}|${String(
    e.structure || ""
  )
    .trim()
    .toUpperCase()}`;

  const isInfo =
    e.event_level_name ===
    "Informacja";

  let add = false;

  if (isInfo) {
    const count = Number(
      e.info_count || 0
    );

    const d = parseUTC(e.date);

    if (!count || !d) {
      return;
    }

    const diffHours =
      (now.getTime() -
        d.getTime()) /
      (1000 * 60 * 60);

    if (
      count >= threshold &&
      diffHours <= hours
    ) {
      add = true;
    }
  } else {
    add = true;
  }

  if (!add) {
    return;
  }

  if (!activeEventsMap[key]) {
    activeEventsMap[key] = [];
  }

  activeEventsMap[key].push(e);
});

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      
<MapFilters
  nodes={nodes}
  selectedNodes={selectedNodes}
  selectedEvent={selectedEvent}
  threshold={threshold}
  hours={hours}
  onNodeChange={setSelectedNodes}
  onEventChange={setSelectedEvent}
  onThresholdChange={setThreshold}
  onHoursChange={setHours}
  eventNames={eventNames}
/>


      
<div
  style={{
    flex: 1,
    minHeight: 0,
  }}
>

        


<MapContainer
  center={[52.23218, 21.00788]}
  zoom={12}
  style={{
    height: "100%",
    width: "100%",
  }}
>

          <LayersControl position="bottomleft">
            <LayersControl.BaseLayer
              checked
              name="Ciemna mapa"
            >
              <TileLayer
                attribution="CARTO"
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer
              name="Jasna mapa"
            >
              <TileLayer
                attribution="Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer
              name="Satelita"
            >
              <TileLayer
                attribution="Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {parkomaty.map((p) => {

  
if (
  selectedNodes.length > 0 &&
  !selectedNodes.includes(
    p.node
  )
) {
  return null;
}



  const key =
  `${String(p.id).trim()}|${String(
    p.structure || ""
  )
    .trim()
    .toUpperCase()}`;

let visibleEvents =
  activeEventsMap[key] || [];
  // identycznie jak renderMarkers()
  if (selectedEvent) {
    visibleEvents =
      visibleEvents.filter(
        (e) =>
          e.event_name ===
          selectedEvent
      );
  }

  if (
    visibleEvents.length === 0
  ) {
    return null;
  }

  const critical =
    visibleEvents.some((e) =>
      RED_CODES.includes(
        String(e.event_code).trim()
      )
    );

  const totalCount =
  visibleEvents.reduce(
    (sum, e) =>
      sum +
      (
        e.event_level_name ===
        "Informacja"
          ? Number(
              e.info_count || 1
            )
          : 1
      ),
    0
  );

return (
  <Marker

                key={`${p.id}-${p.structure}`}
                position={[
                  Number(p.lat),
                  Number(p.lng),
                ]}
                
icon={markerIcon(
  totalCount,
  critical
)}

              >
                <Popup>
                  <b>
                    Parkomat {p.id}
                  </b>

                  <br />

                  {p.location}

                  <hr />

                  {visibleEvents.map(
                    (ev, i) => (
                      <div key={i}>
                        <b>
                          {ev.hardware ||
                            "Inne"}
                        </b>

                        <br />

                        
{Number(ev.info_count || 0) > 1
  ? `ℹ️ ${ev.event_name} (${ev.info_count})`
  : ev.event_name}

<br />

<small>
  {formatDatePL(ev.date)}
</small>

<br />

<button
  
onClick={() => {
  setSelectedEventForService(ev);
  setSelectedParkomat(p);
  setServiceModalOpen(true);
}}

  style={{
    marginTop: "4px",
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "6px 10px",
    borderRadius: "6px",
    cursor: "pointer",
  }}
>
  🔧 Usuń awarię
</button>

<br />
<br />
                      </div>
                    )
                  )}

                  <br />

<a
  href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
  target="_blank"
  rel="noreferrer"
  style={{
    display: "inline-block",
    background: "#16a34a",
    color: "white",
    padding: "6px 10px",
    borderRadius: "6px",
    textDecoration: "none",
  }}
>
  🧭 Nawiguj
</a>

                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
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
