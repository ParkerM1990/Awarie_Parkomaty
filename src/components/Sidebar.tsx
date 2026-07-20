import { useAuth } from "../context/AuthContext";

type Props = {
  view: string;
  onChangeView: (view: string) => void;
};

export default function Sidebar({
  view,
  onChangeView,
}: Props) {
  const { currentUser } = useAuth();
  const btnStyle = (
    active: boolean
  ): React.CSSProperties => ({
    width: "56px",
    height: "56px",
    border: "none",
    borderRadius: "14px",
    background: active
      ? "#1d4ed8"
      : "transparent",
    color: "#e5e7eb",
    fontSize: "20px",
    cursor: "pointer",
    transition: "0.2s",
  });

  return (
    <div className="sidebar">
      <button
        style={btnStyle(view === "mapa")}
        onClick={() =>
          onChangeView("mapa")
        }
        title="Mapa"
      >
        🗺️
      </button>

      <button
        style={btnStyle(view === "awarie")}
        onClick={() =>
          onChangeView("awarie")
        }
        title="Awarie"
      >
        ⚠️
      </button>

      <button
        style={btnStyle(view === "historia")}
        onClick={() =>
          onChangeView("historia")
        }
        title="Historia"
      >
        📜
      </button>

      <button
        style={btnStyle(
          view === "urzadzenia"
        )}
        onClick={() =>
          onChangeView("urzadzenia")
        }
        title="Urządzenia"
      >
        🖥️
      </button>

      <button
        style={btnStyle(
          view === "interwencje"
        )}
        onClick={() =>
          onChangeView("interwencje")
        }
        title="Interwencje"
      >
        🧰
      </button>

{currentUser?.role === "admin" && (
  <button
    style={btnStyle(view === "admin")}
    onClick={() =>
      onChangeView("admin")
    }
    title="Admin"
  >
    ⚙️
  </button>
)}

      <button
        style={btnStyle(view === "konto")}
        onClick={() =>
          onChangeView("konto")
        }
        title="Konto"
      >
        👤
      </button>
    </div>
  );
}