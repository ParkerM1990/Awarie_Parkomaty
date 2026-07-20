import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import {  formatDatePL,} from "../../utils/date";
import StructureSelector from "./StructureSelector";
import { useAuth } from "../../context/AuthContext";


interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  session_status: string;
  last_seen: string;
  structures?: string[];
  nodes?: string[];
}
interface Parkomat {
  id: string;
  node: string;
  node_2: string;
  structure: string;
}

export default function UsersAdmin() {
    
const { currentUser, loading } =
    useAuth();
    console.log("CURRENT USER", currentUser);

  const [users, setUsers] =
    useState<User[]>([]);
    const [parkomaty, setParkomaty] =
  useState<Parkomat[]>([]);

const [firstName, setFirstName] =
  useState("");

const [lastName, setLastName] =
  useState("");

const [email, setEmail] =
  useState("");

const [password, setPassword] =
  useState("");

const [role, setRole] =
  useState("serwis");
  const [editingUserId, setEditingUserId] =
  useState<string | null>(null);

const [editFirstName, setEditFirstName] =
  useState("");

const [editLastName, setEditLastName] =
  useState("");

const [editRole, setEditRole] =
  useState("serwis");

const [editStructures, setEditStructures] =
  useState<string[]>([]);

const [editNodes, setEditNodes] =
  useState<string[]>([]);

const [selectedStructures, setSelectedStructures] =
  useState<string[]>([]);

const [selectedNodes, setSelectedNodes] =
  useState<string[]>([]);

  async function loadUsers() {
    const { data, error } =
      await supabase
        .from("users_status")
        .select("*")
        .order("first_name");

    if (error) {
      console.error(error);
      return;
    }

    setUsers(data || []);
  }
  async function loadParkomaty() {
  const { data, error } = await supabase
    .from("parkomaty")
    .select("id, node, node_2, structure");

  if (error) {
    console.error(error);
    return;
  }

  setParkomaty(data || []);
}

  useEffect(() => {
  loadUsers();
  loadParkomaty();

  const channel = supabase
      .channel("users-admin")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
        },
        async () => {
          await loadUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function toggleUser(
    id: string,
    active: boolean
  ) {
    await supabase
      .from("users")
      .update({
        is_active: !active,
      })
      .eq("id", id);

    loadUsers();
  }

  async function forceLogout(
    id: string
  ) {
    await supabase
      .from("users")
      .update({
        is_online: false,
      })
      .eq("id", id);

    loadUsers();
  }
 function openEditUser(user: User) {
  setEditingUserId(user.id);

  setEditFirstName(user.first_name || "");
  setEditLastName(user.last_name || "");
  setEditRole(user.role || "serwis");

  setEditStructures(user.structures || []);
  setEditNodes(user.nodes || []);
} 
function closeEditUser() {
  setEditingUserId(null);

  setEditFirstName("");
  setEditLastName("");
  setEditRole("serwis");
  setEditStructures([]);
  setEditNodes([]);
}
async function saveUserEdit() {
  if (!editingUserId) return;

  const { error } = await supabase
    .from("users")
    .update({
      first_name: editFirstName,
      last_name: editLastName,
      role: editRole,
      structures: editStructures,
      nodes: editNodes,
    })
    .eq("id", editingUserId);

  if (error) {
    console.error(error);
    alert("❌ Błąd zapisu użytkownika");
    return;
  }

  alert("✅ Użytkownik zapisany");

  closeEditUser();
  loadUsers();
}
async function resetPassword(email: string) {
  const { error } =
    await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: window.location.origin,
      }
    );

  if (error) {
    console.error(error);
    alert("❌ Błąd wysyłki resetu hasła");
    return;
  }

  alert("✅ Mail resetu hasła wysłany");
}
  async function createUser() {
  if (!firstName || !email || !password) {
    alert("❌ Uzupełnij imię, email i hasło");
    return;
  }

  const cleanEmail = email
    .trim()
    .toLowerCase();

  const { data: authData, error: authError } =
    await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });

  if (authError) {
    console.error(authError);
    alert("❌ " + authError.message);
    return;
  }

  const userId = authData.user?.id;

  if (!userId) {
    alert("❌ Nie udało się utworzyć użytkownika");
    return;
  }

  const { error: insertError } = await supabase
    .from("users")
    .insert({
      id: userId,
      email: cleanEmail,
      first_name: firstName,
      last_name: lastName,
      role,
      structures: selectedStructures,
      nodes: selectedNodes,
      is_active: true,
      is_online: false,
    });

  if (insertError) {
    console.error(insertError);
    alert("❌ " + insertError.message);
    return;
  }

  alert("✅ Użytkownik utworzony");

  setFirstName("");
  setLastName("");
  setEmail("");
  setPassword("");
  setRole("serwis");
  setSelectedStructures([]);
  setSelectedNodes([]);

  loadUsers();
}
const structureMap = parkomaty.reduce(
  (
    acc: Record<string, string[]>,
    p
  ) => {
    const main = p.node_2 || p.node;
    const sub = p.node;

    if (!main) return acc;

    if (!acc[main]) {
      acc[main] = [];
    }

    if (
      sub &&
      !acc[main].includes(sub)
    ) {
      acc[main].push(sub);
    }

    return acc;
  },
  {}
);

if (loading) {
  return <div>Ładowanie...</div>;
}

if (currentUser?.role !== "admin") {
  return (
    <div className="app-card">
      ⛔ Brak dostępu
    </div>
  );
}

  return (
  <div>
    <div
      className="app-card"
      style={{
        marginBottom: 20,
      }}
    >
      <h3>➕ Dodaj użytkownika</h3>

      <input
        placeholder="Imię"
        value={firstName}
        onChange={(e) =>
          setFirstName(e.target.value)
        }
        style={{
          width: "100%",
          marginBottom: 8,
        }}
      />

      <input
        placeholder="Nazwisko"
        value={lastName}
        onChange={(e) =>
          setLastName(e.target.value)
        }
        style={{
          width: "100%",
          marginBottom: 8,
        }}
      />

      <input
        placeholder="Email"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
        style={{
          width: "100%",
          marginBottom: 8,
        }}
      />

      <input
        type="password"
        placeholder="Hasło"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
        style={{
          width: "100%",
          marginBottom: 8,
        }}
      />

      <select
        value={role}
        onChange={(e) =>
          setRole(e.target.value)
        }
        style={{
          width: "100%",
          marginBottom: 12,
        }}
      >
        <option value="serwis">
          Serwis
        </option>
        <option value="admin">
          Admin
        </option>
      </select>

      <h4>📍 Struktury / Strefy</h4>

      <StructureSelector
        structureMap={structureMap}
        selectedStructures={
          selectedStructures
        }
        selectedNodes={selectedNodes}
        setSelectedStructures={
          setSelectedStructures
        }
        setSelectedNodes={
          setSelectedNodes
        }
      />

      <button
        onClick={createUser}
        style={{
          marginTop: 14,
          background: "#16a34a",
          color: "white",
          border: "none",
          borderRadius: 10,
          padding: "10px 14px",
        }}
      >
        ✅ Utwórz użytkownika
      </button>
    </div>

    {users.map((u) => (
        <div
          key={u.id}
          className="app-card"
          style={{
            marginBottom: 12,
          }}
        >
          <b>
            {u.first_name}{" "}
            {u.last_name}
          </b>

          <br />

          {u.email}

          <br />

          <small>
            Rola: {u.role}
          </small>

          <br />
          <br />

          Status:
          {" "}
          {u.is_active
            ? "✅ aktywny"
            : "⛔ zablokowany"}

          <br />

          Online:
{" "}
{u.session_status ===
"online"
  ? "🟢 ONLINE"
  : "⚫ Offline"}

<br />

<span
  style={{
    color: "#9ca3af",
  }}
>
  Ostatnio:
  {" "}
  {u.last_seen
    ? formatDatePL(
        u.last_seen
      )
    : "-"}
</span>

<br />
<br />

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            

<button
              onClick={() => openEditUser(u)}
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "8px 12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✏️ Edytuj
            </button>

            <button
              onClick={() =>
                forceLogout(u.id)
              }
              style={{
                background: "#f59e0b",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "8px 12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🔌 Wyloguj
            </button>

            <button
              onClick={() =>
                toggleUser(
                  u.id,
                  u.is_active
                )
              }
              style={{
                background: u.is_active
                  ? "#f59e0b"
                  : "#16a34a",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "8px 12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {u.is_active
                ? "🚫 Zablokuj"
                : "✅ Odblokuj"}
            </button>

            <button
              onClick={() =>
                resetPassword(u.email)
              }
              style={{
                background: "#7c3aed",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "8px 12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🔑 Hasło
            </button>

          </div>
        </div>
      ))}
      {editingUserId && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.75)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
      padding: 16,
    }}
  >
    <div
      style={{
        background: "#020617",
        color: "white",
        borderRadius: 14,
        padding: 16,
        width: "100%",
        maxWidth: 520,
        maxHeight: "85vh",
        overflowY: "auto",
        border: "1px solid #1f2937",
      }}
    >
      <h3>✏️ Edytuj użytkownika</h3>

      <input
        placeholder="Imię"
        value={editFirstName}
        onChange={(e) =>
          setEditFirstName(e.target.value)
        }
        style={{
          width: "100%",
          marginBottom: 8,
        }}
      />

      <input
        placeholder="Nazwisko"
        value={editLastName}
        onChange={(e) =>
          setEditLastName(e.target.value)
        }
        style={{
          width: "100%",
          marginBottom: 8,
        }}
      />

      <select
        value={editRole}
        onChange={(e) =>
          setEditRole(e.target.value)
        }
        style={{
          width: "100%",
          marginBottom: 12,
        }}
      >
        <option value="serwis">
          Serwis
        </option>
        <option value="admin">
          Admin
        </option>
      </select>

      <h4>📍 Struktury / Strefy</h4>

      <StructureSelector
        structureMap={structureMap}
        selectedStructures={editStructures}
        selectedNodes={editNodes}
        setSelectedStructures={
          setEditStructures
        }
        setSelectedNodes={setEditNodes}
      />

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 16,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={saveUserEdit}
          style={{
            background: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          ✅ Zapisz
        </button>

        <button
          onClick={closeEditUser}
          style={{
            background: "#374151",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          ❌ Anuluj
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}