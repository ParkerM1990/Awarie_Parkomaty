import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../services/supabase";

interface Part {
  id?: number;
  name: string;
  serial_number: string;
}

export default function PartsAdmin() {
  const [parts, setParts] =
    useState<Part[]>([]);

  const [name, setName] =
    useState("");

  const [serialNumber, setSerialNumber] =
    useState("nie");
    
const [editingPart, setEditingPart] =
  useState<string | null>(null);

const [editName, setEditName] =
  useState("");

const [editSerialNumber,
  setEditSerialNumber] =
  useState("nie");
  
const iconButtonStyle = {
  color: "white",
  border: "none",
  borderRadius: 10,
  width: 42,
  height: 42,
  cursor: "pointer",
  fontSize: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};



  async function loadParts() {
    const { data, error } =
      await supabase
        .from("parts")
        .select("*")
        .order("name");

    if (error) {
      console.error(error);
      return;
    }

    setParts(data || []);
  }

  useEffect(() => {
    loadParts();
  }, []);

  async function addPart() {
    if (!name.trim()) {
      alert("Podaj nazwę części");
      return;
    }

    const { error } =
      await supabase
        .from("parts")
        .insert([
          {
            name,
            serial_number:
              serialNumber,
          },
        ]);

    if (error) {
      console.error(error);
      return;
    }

    setName("");
    setSerialNumber("nie");

    loadParts();
  }
async function saveEdit(
  oldName: string
) {
  const { error } =
    await supabase
      .from("parts")
      .update({
        name: editName,
        serial_number:
          editSerialNumber,
      })
      .eq("name", oldName);

  if (error) {
    console.error(error);
    return;
  }

  setEditingPart(null);
  setEditName("");
  setEditSerialNumber("nie");

  loadParts();
}
  async function deletePart(
    name: string
  ) {
    if (
      !window.confirm(
        `Usunąć część ${name}?`
      )
    ) {
      return;
    }

    await supabase
      .from("parts")
      .delete()
      .eq("name", name);

    loadParts();
  }

  return (
    <div>
      <div
  className="app-card"
  style={{
    marginBottom: 20,
  }}
>
  <h3>🔧 Dodaj część</h3>

  <div
    style={{
      display: "grid",
      gap: 12,
    }}
  >
    <div
  style={{
    background: "#020617",
    border: "1px solid #1f2937",
    borderRadius: 12,
    padding: 12,
  }}
>
  <div
    style={{
      marginBottom: 6,
      color: "#94a3b8",
      fontSize: 13,
      fontWeight: 500,
    }}
  >
    Nazwa części
  </div>

  <input
    value={name}
    onChange={(e) =>
      setName(e.target.value)
    }
    placeholder="Np. CPU"
  />
</div>

    <div
  style={{
    background: "#020617",
    border: "1px solid #1f2937",
    borderRadius: 12,
    padding: 12,
  }}
>
  <div
    style={{
      marginBottom: 6,
      color: "#94a3b8",
      fontSize: 13,
      fontWeight: 500,
    }}
  >
    Numer seryjny
  </div>

  <select
    value={serialNumber}
    onChange={(e) =>
      setSerialNumber(
        e.target.value
      )
    }
  >
    <option value="nie">
      Nie wymagany
    </option>

    <option value="tak">
      Wymagany
    </option>
  </select>
</div>

    <button
      onClick={addPart}
      style={{
        background: "#16a34a",
        color: "white",
        border: "none",
        borderRadius: 10,
        padding: "10px 14px",
      }}
    >
      ➕ Dodaj część
    </button>
  </div>
</div>

      
{parts.map((p) => (
  <div
    key={p.name}
    className="app-card"
    style={{
    marginBottom: 12,
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent:
        "space-between",
      alignItems: "center",
    }}
  >
    {editingPart === p.name ? (
  <div
    style={{
      width: "100%",
      display: "grid",
      gap: 10,
    }}
  >
    <input
      value={editName}
      onChange={(e) =>
        setEditName(
          e.target.value
        )
      }
    />

    <select
      value={editSerialNumber}
      onChange={(e) =>
        setEditSerialNumber(
          e.target.value
        )
      }
    >
      <option value="nie">
        Nie wymagany
      </option>

      <option value="tak">
        Wymagany
      </option>
    </select>

    <div
      style={{
        display: "flex",
        gap: 8,
      }}
    >
      <button
        onClick={() =>
          saveEdit(
            p.name
          )
        }
      >
        ✅ Zapisz
      </button>

      <button
        onClick={() => {
          setEditingPart(null);
          setEditName("");
          setEditSerialNumber("nie");
        }}
      >
        Anuluj
      </button>
    </div>
  </div>
) : (
  <>
    <div>
      <b>{p.name}</b>

      <br />

      <small>
        {p.serial_number ===
        "tak"
          ? "✅ Wymaga numeru seryjnego"
          : "❌ Bez numeru seryjnego"}
      </small>
    </div>

    <div
      style={{
        display: "flex",
        gap: 8,
      }}
    >
      <button
  onClick={() => {
    setEditingPart(
      p.name
    );
    setEditName(
      p.name
    );
    setEditSerialNumber(
      p.serial_number
    );
  }}
  style={{
    ...iconButtonStyle,
    background: "#2563eb",
  }}
>
  ✏️
</button>

      <button
  onClick={() =>
    deletePart(
      p.name
    )
  }
  style={{
    ...iconButtonStyle,
    background: "#dc2626",
  }}
>
  🗑️
</button>
    </div>
  </>
)}
  </div>
</div>
      ))}
    </div>
  );
}