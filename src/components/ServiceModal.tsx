import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

import type { ActiveEvent } from "../types/ActiveEvent";
import type { Parkomat } from "../types/Parkomat";


type Props = {
  open: boolean;
  event: ActiveEvent | null;
  parkomat: Parkomat | null;
  onClose: () => void;
  onSaved?: () => void;
};



export default function ServiceModal({
  open,
  event,
  parkomat,
  onClose,
  onSaved,
}: Props)
 {
  const [actions, setActions] =
    useState<any[]>([]);

  const [parts, setParts] =
    useState<any[]>([]);

  const [
    selectedActions,
    setSelectedActions,
  ] = useState<string[]>([]);

  const [
    selectedParts,
    setSelectedParts,
  ] = useState<string[]>([]);

  
useEffect(() => {
  if (!open) return;

  setSelectedActions([]);
  setSelectedParts([]);

  loadLists();
}, [open]);


  async function loadLists() {
    const { data: actionsData } =
      await supabase
        .from("actions")
        .select("*")
        .order("name");

    const { data: partsData } =
      await supabase
        .from("parts")
        .select("*")
        .order("name");

    setActions(actionsData || []);
    setParts(partsData || []);
  }

  async function saveService() {
  if (!event || !parkomat) {
    return;
  }

  if (selectedActions.length === 0) {
    alert(
      "Wybierz przynajmniej jedną czynność"
    );
    return;
  }

  const now = new Date().toISOString();

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
  try {
    const {
      data: interwencja,
      error: interError,
    } = await supabase
      .from("interwencje2")
      .insert([
  {
    device_id: parkomat.id,
    structure: parkomat.structure,
    location: parkomat.location,

    event_name: event.event_name,

    start_date: event.date,
    end_date: now,

    user_id: user?.id,
    user_email: fullName,

    actions: selectedActions,
    parts: selectedParts,

    hardware: event.hardware,
  },
])
      .select()
      .single();

    if (interError) {
      throw interError;
    }

    // zapis historii
    const { error: historyError } =
      await supabase
        .from("history_events")
        .insert([
          {
            id: event.id,
            structure:
              event.structure,

            event_name:
              event.event_name,

            event_code:
              event.event_code,

            hardware:
              event.hardware,

            start_date:
              event.date,

            end_date: now,
          },
        ]);

    if (historyError) {
      throw historyError;
    }

    // usunięcie awarii aktywnej
    const { error: deleteError } =
      await supabase
        .from("active_events")
        .delete()
        .match({
          id: event.id,
          structure:
            event.structure,
          event_code:
            event.event_code,
        });

    if (deleteError) {
      throw deleteError;
    }

    // zapis części do osobnej tabeli
    if (
      interwencja &&
      selectedParts.length > 0
    ) {
      await supabase
        .from("interwencje_parts")
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

    alert("✅ Awaria zamknięta");

    onSaved?.();

    setSelectedActions([]);
    setSelectedParts([]);

    onClose();
  } catch (err: any) {
    console.error(err);

    alert(
      err?.message ||
        "Błąd zapisu"
    );
  }
}

  if (!open || !event || !parkomat) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "rgba(0,0,0,.7)",
        display: "flex",
        justifyContent:
          "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        className="app-card"
        style={{
          width: "90%",
          maxWidth: 600,
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <h3>
          🔧 Interwencja
          Serwisowa
        </h3>

        <p>
          <b>
            Parkomat{" "}
            {parkomat.id}
          </b>
          <br />
          {parkomat.location}
        </p>

        <p>
          <b>Awaria:</b>
          <br />
          {event.event_name}
        </p>
        <p>  <b>Urządzenie:</b>  <br />  {event.hardware || "Brak danych"}</p>
        <h4>
          ⚙️ Czynności
        </h4>

        {actions.map(
          (action) => (
            <label
              key={action.id}
              style={{
                display:
                  "block",
                marginBottom: 8,
              }}
            >
              <input
                type="checkbox"
                value={
                  action.name
                }
                onChange={(
                  e
                ) => {
                  if (
                    e.target
                      .checked
                  ) {
                    setSelectedActions(
                      (
                        prev
                      ) => [
                        ...prev,
                        action.name,
                      ]
                    );
                  } else {
                    setSelectedActions(
                      (
                        prev
                      ) =>
                        prev.filter(
                          (
                            a
                          ) =>
                            a !==
                            action.name
                        )
                    );
                  }
                }}
              />{" "}
              {action.name}
            </label>
          )
        )}

        <h4>
          🔧 Wymienione
          podzespoły
        </h4>

        {parts.map((part) => (
          <label
            key={part.id}
            style={{
              display: "block",
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              value={part.name}
              onChange={(e) => {
                if (
                  e.target.checked
                ) {
                  setSelectedParts(
                    (
                      prev
                    ) => [
                      ...prev,
                      part.name,
                    ]
                  );
                } else {
                  setSelectedParts(
                    (
                      prev
                    ) =>
                      prev.filter(
                        (
                          p
                        ) =>
                          p !==
                          part.name
                      )
                  );
                }
              }}
            />{" "}
            {part.name}
          </label>
        ))}

        <br />

        <button
          onClick={() => {
            setSelectedActions(
              []
            );
            setSelectedParts(
              []
            );

            onClose();
          }}
          style={{
            background:
              "#374151",
            color: "white",
            border: "none",
            padding:
              "10px 14px",
            borderRadius: 8,
            marginRight: 8,
          }}
        >
          Anuluj
        </button>

        <button
          onClick={
            saveService
          }
          style={{
            background:
              "#16a34a",
            color: "white",
            border: "none",
            padding:
              "10px 14px",
            borderRadius: 8,
          }}
        >
          ✅ Zapisz
        </button>
      </div>
    </div>
  );
}