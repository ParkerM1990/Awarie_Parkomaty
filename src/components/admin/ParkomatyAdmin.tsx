import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../services/supabase";
import ParkomatModal from "./ParkomatModal";
interface Parkomat {
  id: string;
  location: string;
  node: string;
  node_2: string;
  lat: number;
  lng: number;
  structure: string;
}

export default function ParkomatyAdmin() {
  const [items, setItems] =
    useState<Parkomat[]>([]);

  const [search, setSearch] =
    useState("");

const [showModal, setShowModal] =
  useState(false);

const [selected, setSelected] =
  useState<any>(null);

  async function load() {
    const { data, error } =
      await supabase
        .from("parkomaty")
        .select("*")
        .order("id");

    if (error) {
      console.error(error);
      return;
    }

    setItems(
      (data || []) as Parkomat[]
    );
  }

  useEffect(() => {
    load();
  }, []);

  const filtered =
    useMemo(() => {
      return items.filter((p) => {
        const text =
          `${p.id} ${p.location}`.toLowerCase();

        return text.includes(
          search.toLowerCase()
        );
      });
    }, [items, search]);

  return (
    <div>
      <div
  className="app-panel"
  style={{
    marginBottom: 20,
  }}
>
    <button
  onClick={() => {
    setSelected(null);
    setShowModal(true);
  }}
  style={{
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 12,
  }}
>
  ➕ Dodaj parkomat
</button>
  <input
    type="text"
    placeholder="🔎 Szukaj numeru lub adresu..."
    value={search}
    onChange={(e) =>
      setSearch(e.target.value)
    }
    style={{
      width: "100%",
    }}
  />
</div>

      {filtered.map((p) => (
        <div
          key={`${p.id}-${p.structure}`}
          className="app-card"
          style={{
            marginBottom: 12,
          }}
        >
          <b>{p.id}</b>

          <br />

          {p.location}

          <br />

          <small>
            {p.node_2 ||
              p.node}
          </small>

          <br />

          <small>
            {p.lat},{" "}
            {p.lng}
          </small>
          <br />
<br />

<button
  onClick={() => {
    setSelected(p);
    setShowModal(true);
  }}
  style={{
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "6px 10px",
  }}
>
  ✏️ Edytuj
</button>
        </div>
      ))}
      <ParkomatModal
  open={showModal}
  parkomat={selected}
  onClose={() =>
    setShowModal(false)
  }
  onSaved={() => {
    load();
    setShowModal(false);
  }}
/>
    </div>
  );
}