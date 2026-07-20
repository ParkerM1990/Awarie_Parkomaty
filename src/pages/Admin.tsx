import { useState } from "react";
import UsersAdmin from "../components/admin/UsersAdmin";
import ParkomatyAdmin from "../components/admin/ParkomatyAdmin";

import PartsAdmin from "../components/admin/PartsAdmin";
import ActionsAdmin from "../components/admin/ActionsAdmin";
import GeneralCategoriesAdmin from "../components/admin/GeneralCategoriesAdmin";


export default function Admin() {
  const [tab, setTab] =
    useState("users");

  return (
    <div
      style={{
        padding: 20,
        paddingBottom: 120,
        height: "100%",
        overflowY: "auto",
      }}
    >
      <h2>👤 Panel admina</h2>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <button
  className="switch-btn"
  style={{
    background:
      tab === "users"
        ? "#1d4ed8"
        : "#374151",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
  }}
  onClick={() =>
    setTab("users")
  }
>
  📋 Użytkownicy
</button>

<button
  className="switch-btn"
  style={{
    background:
      tab === "parkomaty"
        ? "#1d4ed8"
        : "#374151",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
  }}
  onClick={() =>
    setTab("parkomaty")
  }
>
  🅿️ Parkomaty
</button>

<button
  className="switch-btn"
  style={{
    background:
      tab === "parts"
        ? "#1d4ed8"
        : "#374151",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
  }}
  onClick={() =>
    setTab("parts")
  }
>
  🔧 Części
</button>

<button
  className="switch-btn"
  style={{
    background:
      tab === "actions"
        ? "#1d4ed8"
        : "#374151",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
  }}
  onClick={() =>
    setTab("actions")
  }
>
  ⚙️ Czynności
</button>
<button
  className="switch-btn"
  style={{
    background:
      tab === "generalCategories"
        ? "#1d4ed8"
        : "#374151",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
  }}
  onClick={() =>
    setTab(
      "generalCategories"
    )
  }
>
  📊 Kategorie interwencji
</button>
      </div>

      
{tab === "users" && (
  <UsersAdmin />
)}


      {tab ===
  "parkomaty" && (
  <ParkomatyAdmin />
)}

      
{tab === "parts" && (
  <PartsAdmin />
)}

{tab === "actions" && (
  <ActionsAdmin />
)}

{tab ===
  "generalCategories" && (
  <GeneralCategoriesAdmin />
)}

    </div>
  );
}