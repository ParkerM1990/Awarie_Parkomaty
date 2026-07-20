import { useEffect, useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";
import MapView from "./components/MapView";
import { supabase } from "./services/supabase";
import Awarie from "./components/Awarie";
import Historia from "./components/Historia";
import Urzadzenia from "./components/Urzadzenia";
import Interwencje from "./pages/Interwencje";
import Admin from "./pages/Admin";
import { useAuth } from "./context/AuthContext";

function App() {
  const { currentUser, loading } = useAuth();

const [view, setView] =
  useState("mapa");

const [alarms, setAlarms] = useState({
  devices: 0,
  total: 0,
});

  
useEffect(() => {
  loadAlarmCounter();

  const channel = supabase
    .channel("header-counter")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "active_events",
      },
      async () => {
        await loadAlarmCounter();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [currentUser]);

async function loadAlarmCounter() {
  const { data } = await supabase
    .from("active_events")
    .select("id, structure");

  if (!data) return;

  let filtered = data;

  if (
    currentUser &&
    currentUser.role !== "admin"
  ) {
    const allowedStructures =
      currentUser.structures || [];

    filtered = data.filter((event) =>
      allowedStructures.includes(
        event.structure
      )
    );
  }

  const devices = new Set(
    filtered.map(
      (e) => `${e.id}-${e.structure}`
    )
  );

  setAlarms({
    devices: devices.size,
    total: filtered.length,
  });
}
  async function logout() {
  await supabase.auth.signOut();
}

  if (loading) {
    return <div>Ładowanie...</div>;
  }

  if (!currentUser) {
  return <Login />;
}

  return (
    <>
      
<Header
  userName={
    currentUser
      ? `${currentUser.first_name} ${currentUser.last_name}`
      : ""
  }
  alarms={alarms}
  onRefresh={() =>
    window.location.reload()
  }
  onLogout={logout}
/>


      

<div
  style={{
    display: "flex",
    marginTop: "60px",
    height: "calc(100vh - 60px)",
    background:
      "linear-gradient(180deg,#020617 0%,#0f172a 100%)",
  }}
>


        

<Sidebar
  view={view}
  onChangeView={setView}
/>
      

<main
  style={{
    flex: 1,
    marginLeft: "72px",
    height: "100%",
    overflow: "hidden",
    background: "transparent",
  }}
>

          

{view === "mapa" && (
  <MapView />
)}

{view === "awarie" && (
  <Awarie />
)}

{view === "historia" && (
  <Historia />
)}

{view === "urzadzenia" && (
  <Urzadzenia />
)}

{view === "interwencje" && (
  <Interwencje />
)}



{view === "admin" && (
  <Admin />
)}




        </main>
      </div>
    </>
  );
}

export default App;