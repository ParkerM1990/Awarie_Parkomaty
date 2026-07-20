import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../services/supabase";

interface Action {
  id?: number;
  name: string;
}

export default function ActionsAdmin() {
  const [actions, setActions] =
    useState<Action[]>([]);

  const [name, setName] =
    useState("");

  
const [editingAction, setEditingAction] =
  useState<string | null>(null);


  const [editName, setEditName] =
    useState("");

  async function loadActions() {
    const { data, error } =
      await supabase
        .from("actions")
        .select("*")
        .order("name");

    if (error) {
      console.error(error);
      return;
    }

    setActions(data || []);
  }

  useEffect(() => {
    loadActions();
  }, []);

  async function addAction() {
    if (!name.trim()) {
      alert("Podaj nazwę czynności");
      return;
    }

    const { error } =
      await supabase
        .from("actions")
        .insert([
          {
            name,
          },
        ]);

    if (error) {
      console.error(error);
      alert("Błąd dodawania");
      return;
    }

    setName("");
    loadActions();
  }

  
async function saveEdit(
  oldName: string
) {

    if (!editingAction) {
      return;
    }

    if (!editName.trim()) {
      alert("Podaj nazwę");
      return;
    }

    const { error } =
      await supabase
        .from("actions")
        .update({
          name: editName,
        })
        .eq("name", oldName);

    if (error) {
      console.error(error);
      alert("Błąd zapisu");
      return;
    }

    setEditingAction(null);
    setEditName("");

    loadActions();
  }

  async function deleteAction(
    name: string
  ) {
    if (
      !window.confirm(
        `Usunąć czynność "${name}"?`
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("actions")
        .delete()
        .eq("name", name);

    if (error) {
      console.error(error);
      alert("Błąd usuwania");
      return;
    }

    loadActions();
  }

  return (
    <div>
      <div
        className="app-card"
        style={{
          marginBottom: 20,
        }}
      >
        <h3>
          ⚙️ Dodaj czynność
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
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Nazwa czynności
            </div>

            <input
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
              placeholder="Np. Restart terminala"
            />
          </div>

          <button
            onClick={addAction}
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
            ➕ Dodaj czynność
          </button>
        </div>
      </div>

      {actions.map((a) => (
        <div
          key={a.id || a.name}
          className="app-card"
          style={{
            marginBottom: 12,
          }}
        >
          
{editingAction === a.name ? (

            <>
              <div
                style={{
                  marginBottom: 10,
                }}
              >
                <input
                  value={editName}
                  onChange={(
                    e
                  ) =>
                    setEditName(
                      e.target
                        .value
                    )
                  }
                />
              </div>

              <div
                style={{
                  display:
                    "flex",
                  gap: 8,
                }}
              >
                
<button
  onClick={() =>
    saveEdit(a.name)
  }
  style={{
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
  }}
>
  ✅ Zapisz
</button>


                <button
                  onClick={() => {
                    setEditingAction(
                      null
                    );
                    setEditName(
                      ""
                    );
                  }}
                  style={{
                    background:
                      "#374151",
                    color:
                      "white",
                    border:
                      "none",
                    borderRadius: 8,
                    padding:
                      "8px 12px",
                  }}
                >
                  Anuluj
                </button>
              </div>
            </>
          ) : (
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
                  {a.name}
                </b>
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
                    setEditingAction(a.name);
                    setEditName(a.name);
                  }}
                  style={{
                    background:
                      "#2563eb",
                    color:
                      "white",
                    border:
                      "none",
                    borderRadius: 8,
                    padding:
                      "8px 10px",
                  }}
                >
                  ✏️
                </button>

                <button
                  onClick={() =>
                    deleteAction(
                      a.name
                    )
                  }
                  style={{
                    background:
                      "#dc2626",
                    color:
                      "white",
                    border:
                      "none",
                    borderRadius: 8,
                    padding:
                      "8px 10px",
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}