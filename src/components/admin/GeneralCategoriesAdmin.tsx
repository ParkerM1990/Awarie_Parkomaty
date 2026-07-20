import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../services/supabase";

interface Category {
  id: number;
  name: string;
  requires_quantity: boolean;
  quantity_label: string;
  stat_mode: string;
}

export default function GeneralCategoriesAdmin() {
  const [items, setItems] =
    useState<Category[]>([]);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [name, setName] =
    useState("");

  const [
    requiresQuantity,
    setRequiresQuantity,
  ] = useState(false);

  const [
    quantityLabel,
    setQuantityLabel,
  ] = useState("Ilość");

  const [statMode, setStatMode] =
    useState("count");

  async function loadCategories() {
    const { data, error } =
      await supabase
        .from(
          "general_intervention_categories"
        )
        .select("*")
        .order("name");

    if (error) {
      console.error(error);
      return;
    }

    setItems(data || []);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function resetForm() {
    setEditingId(null);
    setName("");
    setRequiresQuantity(false);
    setQuantityLabel("Ilość");
    setStatMode("count");
  }

  async function saveCategory() {
    if (!name.trim()) {
      alert("Podaj nazwę");
      return;
    }

    const payload = {
      name,
      requires_quantity:
        requiresQuantity,
      quantity_label:
        quantityLabel,
      stat_mode: statMode,
    };

    let error;

    if (editingId) {
      const result =
        await supabase
          .from(
            "general_intervention_categories"
          )
          .update(payload)
          .eq("id", editingId);

      error = result.error;
    } else {
      const result =
        await supabase
          .from(
            "general_intervention_categories"
          )
          .insert([payload]);

      error = result.error;
    }

    if (error) {
      console.error(error);
      alert("Błąd zapisu");
      return;
    }

    resetForm();
    loadCategories();
  }

  async function removeCategory(
    id: number,
    name: string
  ) {
    if (
      !window.confirm(
        `Usunąć "${name}"?`
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from(
          "general_intervention_categories"
        )
        .delete()
        .eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    loadCategories();
  }

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
  } as const;

  return (
    <div>
      <div
        className="app-card"
        style={{
          marginBottom: 20,
        }}
      >
        <h3>
          📊 Kategorie interwencji
        </h3>

        <div
          style={{
            display: "grid",
            gap: 12,
          }}
        >
          <div
            style={{
              background:
                "#020617",
              border:
                "1px solid #1f2937",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div
              style={{
                marginBottom: 6,
                color:
                  "#94a3b8",
              }}
            >
              Nazwa
            </div>

            <input
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
              placeholder="Np. Kolekcja bilonu"
            />
          </div>

          <div
            style={{
              background:
                "#020617",
              border:
                "1px solid #1f2937",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <label
              style={{
                display: "flex",
                gap: 10,
              }}
            >
              <input
                type="checkbox"
                checked={
                  requiresQuantity
                }
                onChange={(e) =>
                  setRequiresQuantity(
                    e.target.checked
                  )
                }
              />

              Wymaga ilości
            </label>
          </div>

          <div
            style={{
              background:
                "#020617",
              border:
                "1px solid #1f2937",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div
              style={{
                marginBottom: 6,
                color:
                  "#94a3b8",
              }}
            >
              Opis pola
            </div>

            <input
              value={
                quantityLabel
              }
              onChange={(e) =>
                setQuantityLabel(
                  e.target.value
                )
              }
            />
          </div>

          <div
            style={{
              background:
                "#020617",
              border:
                "1px solid #1f2937",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div
              style={{
                marginBottom: 6,
                color:
                  "#94a3b8",
              }}
            >
              Tryb statystyk
            </div>

            <select
              value={statMode}
              onChange={(e) =>
                setStatMode(
                  e.target.value
                )
              }
            >
              <option value="count">
                COUNT
              </option>

              <option value="sum">
                SUM
              </option>
            </select>
          </div>

          <button
            onClick={saveCategory}
            style={{
              background:
                "#16a34a",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding:
                "10px 14px",
            }}
          >
            {editingId
              ? "✅ Zapisz"
              : "➕ Dodaj"}
          </button>
        </div>
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          className="app-card"
          style={{
            marginBottom: 12,
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
                {item.name}
              </b>

              <br />

              <small>
                {item.requires_quantity
                  ? "✅ Wymaga ilości"
                  : "❌ Bez ilości"}
              </small>

              <br />

              <small>
                Pole:
                {" "}
                {
                  item.quantity_label
                }
              </small>

              <br />

              <small>
                Statystyka:
                {" "}
                {
                  item.stat_mode
                }
              </small>
            </div>

            <div
              style={{
                display:
                  "flex",
                gap: 8,
              }}
            >
              <button
                onClick={() => {
                  setEditingId(
                    item.id
                  );

                  setName(
                    item.name
                  );

                  setRequiresQuantity(
                    item.requires_quantity
                  );

                  setQuantityLabel(
                    item.quantity_label
                  );

                  setStatMode(
                    item.stat_mode
                  );
                }}
                style={{
                  ...iconButtonStyle,
                  background:
                    "#2563eb",
                }}
              >
                ✏️
              </button>

              <button
                onClick={() =>
                  removeCategory(
                    item.id,
                    item.name
                  )
                }
                style={{
                  ...iconButtonStyle,
                  background:
                    "#dc2626",
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}