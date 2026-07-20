import React, {
  useState,
  useEffect,
} from "react";

import { supabase } from "../../services/supabase";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  parkomat?: any;
}

export default function ParkomatModal({
  open,
  onClose,
  onSaved,
  parkomat,
}: Props) {
  const [id, setId] = useState("");
  const [location, setLocation] =
    useState("");

  const [node, setNode] =
    useState("");

  const [node2, setNode2] =
    useState("");

  const [lat, setLat] =
    useState("");

  const [lng, setLng] =
    useState("");

  const [structure, setStructure] =
    useState("");

  useEffect(() => {
    if (!parkomat) {
      setId("");
      setLocation("");
      setNode("");
      setNode2("");
      setLat("");
      setLng("");
      setStructure("");
      return;
    }

    setId(parkomat.id || "");
    setLocation(
      parkomat.location || ""
    );
    setNode(parkomat.node || "");
    setNode2(
      parkomat.node_2 || ""
    );
    setLat(
      String(parkomat.lat || "")
    );
    setLng(
      String(parkomat.lng || "")
    );
    setStructure(
      parkomat.structure || ""
    );
  }, [parkomat]);

  async function save() {
    const obj = {
      id,
      location,
      node,
      node_2: node2,
      lat: Number(lat),
      lng: Number(lng),
      structure,
    };

    if (!id.trim()) {
      alert(
        "❌ Podaj numer parkomatu"
      );
      return;
    }

    if (
      isNaN(Number(lat)) ||
      isNaN(Number(lng))
    ) {
      alert(
        "❌ Lat/Lng muszą być liczbami"
      );
      return;
    }

    let error;

    if (parkomat) {
      const result =
        await supabase
          .from("parkomaty")
          .update(obj)
          .eq("id", parkomat.id);

      error = result.error;
    } else {
      const result =
        await supabase
          .from("parkomaty")
          .insert([obj]);

      error = result.error;
    }

    if (error) {
      console.error(error);
      alert("❌ Błąd zapisu");
      return;
    }

    alert("✅ Zapisano");
    onSaved();
  }

  async function remove() {
    if (!parkomat) return;

    if (
      !window.confirm(
        `Usunąć parkomat ${parkomat.id}?`
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("parkomaty")
        .delete()
        .eq("id", parkomat.id);

    if (error) {
      console.error(error);
      alert("❌ Błąd usuwania");
      return;
    }

    alert("✅ Usunięto");
    onSaved();
  }

  if (!open) return null;

  
const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #1f2937",
  background: "#0f172a",
  color: "white",
  fontSize: "14px",
  outline: "none",
};


  const boxStyle: React.CSSProperties =
    {
      background: "#020617",
      border:
        "1px solid #1f2937",
      borderRadius: "12px",
      padding: "12px",
    };

  const labelStyle: React.CSSProperties =
    {
      marginBottom: 6,
      color: "#94a3b8",
      fontSize: 13,
      fontWeight: 500,
    };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "rgba(0,0,0,0.75)",
        display: "flex",
        justifyContent:
          "center",
        alignItems:
          "center",
        zIndex: 9999,
      }}
    >
      <div
        className="app-card"
        style={{
          width: "90%",
          maxWidth: 400,
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <h3
          style={{
            margin: 0,
          }}
        >
          {parkomat
            ? "✏️ Edytuj parkomat"
            : "➕ Dodaj parkomat"}
        </h3>

        <div style={boxStyle}>
          <div style={labelStyle}>
            🅿️ Numer parkomatu
          </div>

          <input
            style={fieldStyle}
            value={id}
            disabled={!!parkomat}
            onChange={(e) =>
              setId(
                e.target.value
              )
            }
          />
        </div>

        <div style={boxStyle}>
          <div style={labelStyle}>
            📍 Adres
          </div>

          <input
            style={fieldStyle}
            value={location}
            onChange={(e) =>
              setLocation(
                e.target.value
              )
            }
          />
        </div>

        <div style={boxStyle}>
          <div style={labelStyle}>
            🔧 Strefa dla serwisu
          </div>

          <input
            style={fieldStyle}
            value={node}
            onChange={(e) =>
              setNode(
                e.target.value
              )
            }
          />
        </div>

        <div style={boxStyle}>
          <div style={labelStyle}>
            🏙️ Miasto /
            struktura administratora
          </div>

          <input
            style={fieldStyle}
            value={node2}
            onChange={(e) =>
              setNode2(
                e.target.value
              )
            }
          />
        </div>

        <div style={boxStyle}>
          <div style={labelStyle}>
            🌍 Latitude (LAT)
          </div>

          <input
            style={fieldStyle}
            value={lat}
            onChange={(e) =>
              setLat(
                e.target.value
              )
            }
          />
        </div>

        <div style={boxStyle}>
          <div style={labelStyle}>
            🌍 Longitude (LNG)
          </div>

          <input
            style={fieldStyle}
            value={lng}
            onChange={(e) =>
              setLng(
                e.target.value
              )
            }
          />
        </div>

        <div style={boxStyle}>
          <div style={labelStyle}>
            📧 Structure do emaili
          </div>

          <input
            style={fieldStyle}
            value={structure}
            onChange={(e) =>
              setStructure(
                e.target.value
              )
            }
          />
        </div>

        <button
          onClick={save}
          style={{
            background:
              "#16a34a",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ✅ Zapisz
        </button>

        {parkomat && (
          <button
            onClick={remove}
            style={{
              background:
                "#dc2626",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🗑️ Usuń parkomat
          </button>
        )}

        <button
          onClick={onClose}
          style={{
            background:
              "#374151",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: 12,
            cursor: "pointer",
          }}
        >
          Anuluj
        </button>
      </div>
    </div>
  );
}