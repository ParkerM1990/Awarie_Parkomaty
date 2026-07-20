import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../services/supabase";
import { useParkomaty } from "../context/ParkomatyContext";
type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

interface Action {
  name: string;
}

interface Part {
  name: string;
}
interface GeneralCategory {
  id: number;
  name: string;
  requires_quantity: boolean;
  quantity_label: string;
  stat_mode: string;
}
export default function ManualInterventionModal({
  open,
  onClose,
  onSaved,
}: Props) {
  
const { parkomaty } =
  useParkomaty();


  const [actions, setActions] =
    useState<Action[]>([]);

  const [parts, setParts] =
    useState<Part[]>([]);
const [
  generalCategories,
  setGeneralCategories,
] = useState<
  GeneralCategory[]
>([]);

const [
  selectedCategory,
  setSelectedCategory,
] = useState("");

const [quantity, setQuantity] =
  useState("");

  const [search, setSearch] =
    useState("");

  const [selectedParkomat, setSelectedParkomat] =
    useState("");

  const [
    selectedActions,
    setSelectedActions,
  ] = useState<string[]>([]);

  const [
    selectedParts,
    setSelectedParts,
  ] = useState<string[]>([]);
  
const [mode, setMode] =
  useState<"service" | "general">(
    "service"
  );


  useEffect(() => {
    if (!open) return;

    loadData();
  }, [open]);

  async function loadData() {
    
const [
  actionsResult,
  partsResult,
  categoriesResult,
] = await Promise.all([
  supabase
    .from("actions")
    .select("*")
    .order("name"),

  supabase
    .from("parts")
    .select("*")
    .order("name"),

  supabase
    .from(
      "general_intervention_categories"
    )
    .select("*")
    .order("name"),
]);

 setActions(
  actionsResult.data || []
);

setParts(
  partsResult.data || []
);

setGeneralCategories(
  categoriesResult.data || []
);}

  function toggleAction(
    action: string
  ) {
    setSelectedActions((prev) =>
      prev.includes(action)
        ? prev.filter(
            (a) => a !== action
          )
        : [...prev, action]
    );
  }

  function togglePart(
    part: string
  ) {
    setSelectedParts((prev) =>
      prev.includes(part)
        ? prev.filter(
            (p) => p !== part
          )
        : [...prev, part]
    );
  }

  async function save() {
    if (mode === "general") {
  if (!selectedCategory) {
    alert("Wybierz kategorię");
    return;
  }

  if (
    currentCategory
      ?.requires_quantity &&
    !quantity
  ) {
    alert(
      `Podaj ${currentCategory.quantity_label}`
    );
    return;
  }

  const category =
  generalCategories.find(
    (c) =>
      c.name ===
      selectedCategory
  );

const {
  data: { user },
} = await supabase.auth.getUser();

const { data: profile } =
  await supabase
    .from("users")
    .select(
      "first_name,last_name"
    )
    .eq("id", user?.id)
    .single();

const fullName = [
  profile?.first_name,
  profile?.last_name,
]
  .filter(Boolean)
  .join(" ");

const { error } =
  await supabase
    .from("general_interventions")
    .insert([
      {
        category_id: category?.id,
        category_name: category?.name,

        quantity: quantity
          ? Number(quantity)
          : null,

        user_id: user?.id,
        user_email: fullName,
      },
    ]);

if (error) {
  console.error(error);
  alert("Błąd zapisu");
  return;
}

setSelectedCategory("");
setQuantity("");

onSaved?.();
onClose();

return;}

    const parkomat =
      parkomaty.find(
        (p) =>
          `${p.id}|${p.structure}` ===
          selectedParkomat
      );

    if (!parkomat) {
      alert("Wybierz parkomat");
      return;
    }

    if (
      selectedActions.length === 0
    ) {
      alert(
        "Wybierz przynajmniej jedną czynność"
      );
      return;
    }

    const now =
      new Date().toISOString();

    const {
      data: interwencja,
      error,
    } = await supabase
      .from("interwencje2")
      .insert([
        {
          device_id:
            parkomat.id,

          structure:
            parkomat.structure,

          location:
            parkomat.location,

          event_name:
            "Interwencja serwisowa",

          start_date: now,
          end_date: now,

          actions:
            selectedActions,

          parts:
            selectedParts,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Błąd zapisu");
      return;
    }

    if (
      selectedParts.length > 0
    ) {
      await supabase
        .from(
          "interwencje_parts"
        )
        .insert(
          selectedParts.map(
            (part) => ({
              interwencja_id:
                interwencja.id,

              device_id:
                parkomat.id,

              part_name: part,
            })
          )
        );
    }

    setSelectedActions([]);
    setSelectedParts([]);
    setSearch("");
    setSelectedParkomat("");

    onSaved?.();
    onClose();
  }

  if (!open) {
    return null;
  }

  const filteredParkomaty =
    parkomaty.filter((p) => {
      const text =
        `${p.id} ${p.location}`.toLowerCase();

      return text.includes(
        search.toLowerCase()
      );
    });
const currentCategory =
  generalCategories.find(
    (c) =>
      c.name ===
      selectedCategory
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "rgba(0,0,0,0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        className="app-card"
        style={{
          width: "90%",
          maxWidth: 650,
          maxHeight: "85vh",
          overflowY: "auto",
          padding: 20,
        }}
      >
        


        <h3>
  🔧 Nowa interwencja
</h3>

<div
  style={{
    display: "flex",
    gap: 10,
    marginBottom: 20,
  }}
>
  <button
    type="button"
    onClick={() =>
      setMode("service")
    }
    className="switch-btn"
    style={{
      background:
        mode === "service"
          ? "#1d4ed8"
          : "#374151",
      color: "white",
      border: "none",
      borderRadius: 10,
      padding: "10px 14px",
    }}
  >
    🔧 Interwencja serwisowa
  </button>

  <button
    type="button"
    onClick={() =>
      setMode("general")
    }
    className="switch-btn"
    style={{
      background:
        mode === "general"
          ? "#1d4ed8"
          : "#374151",
      color: "white",
      border: "none",
      borderRadius: 10,
      padding: "10px 14px",
    }}
  >
    📊 Czynność ogólna
  </button>
</div>

{mode === "service" && (
  <>
    <div
      style={{
        color: "#94a3b8",
        marginBottom: 20,
      }}
    >
      Wybierz parkomat, następnie czynności i części.
    </div>

    <div
      style={{
        display: "grid",
        gap: 12,
        marginBottom: 20,
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
          🔎 Wyszukaj parkomat
        </div>

        <input
          type="text"
          placeholder="Numer parkomatu lub adres"
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
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
          🅿️ Wybierz parkomat
        </div>

        <div
          style={{
            color: "#94a3b8",
            fontSize: 12,
            marginBottom: 10,
          }}
        >
          Znaleziono:{" "}
          {filteredParkomaty.length}
        </div>

        <div
          style={{
            display: "grid",
            gap: 8,
            maxHeight: 250,
            overflowY: "auto",
          }}
        >
          {filteredParkomaty
            .slice(0, 50)
            .map((p) => {
              const value =
                `${p.id}|${p.structure}`;

              const selected =
                selectedParkomat ===
                value;

              return (
                <div
                  key={value}
                  onClick={() =>
                    setSelectedParkomat(
                      value
                    )
                  }
                  style={{
                    cursor: "pointer",
                    padding: 12,
                    borderRadius: 12,
                    border: selected
                      ? "1px solid #2563eb"
                      : "1px solid #1f2937",
                    background: selected
                      ? "#1e3a8a"
                      : "#020617",
                  }}
                >
                  <div>
                    <b>
                      🅿️ {p.id}
                    </b>
                  </div>

                  <div
                    style={{
                      color:
                        "#cbd5e1",
                      fontSize: 14,
                    }}
                  >
                    {p.location}
                  </div>

                  <div
                    style={{
                      color:
                        "#94a3b8",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {p.structure}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  </>
)}

{mode === "general" && (
  <div
    className="app-card"
    style={{
      padding: 20,
      marginBottom: 20,
    }}
  >
    <h4>
      📊 Czynność ogólna
    </h4>

    <select
      value={selectedCategory}
      onChange={(e) =>
        setSelectedCategory(
          e.target.value
        )
      }
    >
      <option value="">
        Wybierz kategorię
      </option>

      {generalCategories.map(
        (category) => (
          <option
            key={category.id}
            value={category.name}
          >
            {category.name}
          </option>
        )
      )}
    </select>

    {currentCategory
      ?.requires_quantity && (
      <>
        <div
          style={{
            marginTop: 16,
            marginBottom: 6,
            color: "#94a3b8",
          }}
        >
          {
            currentCategory.quantity_label
          }
        </div>

        <input
          type="number"
          value={quantity}
          onChange={(e) =>
            setQuantity(
              e.target.value
            )
          }
        />
      </>
    )}
  </div>
)}

{mode === "service" && (
  <>

        <h4>
          ⚙️ Czynności
        </h4>

        {actions.map((action) => (
          <label
            key={action.name}
            style={{
              display: "block",
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              checked={selectedActions.includes(
                action.name
              )}
              onChange={() =>
                toggleAction(
                  action.name
                )
              }
            />

            {" "}
            {action.name}
          </label>
        ))}

        <h4>
          🔧 Wymienione części
        </h4>

        {parts.map((part) => (
          <label
            key={part.name}
            style={{
              display: "block",
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              checked={selectedParts.includes(
                part.name
              )}
              onChange={() =>
                togglePart(
                  part.name
                )
              }
            />

            {" "}
            {part.name}
          </label>
        ))}
</>
)}


        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 20,
          }}
        >
          
<button
  onClick={save}
  disabled={
    mode === "general" &&
    !selectedCategory
  }
  style={{
    background:
      mode === "general" &&
      !selectedCategory
        ? "#6b7280"
        : "#16a34a",
    color: "white",
    cursor:
      mode === "general" &&
      !selectedCategory
        ? "not-allowed"
        : "pointer",
  }}
>
  ✅ Zapisz
</button>

          <button
            onClick={onClose}
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
}