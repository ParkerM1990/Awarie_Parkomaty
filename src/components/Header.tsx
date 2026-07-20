type Props = {
  userName: string;
  alarms: {
    devices: number;
    total: number;
  };
  onRefresh: () => void;
  onLogout: () => void;
};

export default function Header({
  userName,
  alarms,
  onRefresh,
  onLogout,
}: Props) {
  return (
    <header
      style={{
        height: "60px",
        background: "#020617",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 10px",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 3000,
      }}
    >
      <div
        style={{
          fontWeight: 500,
        }}
      >
        Monitoring Parkomatów
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <button
          onClick={onRefresh}
          style={{
            background: "#1f2937",
            color: "white",
            border: "none",
            padding: "6px 10px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          🔄
        </button>

        <div
          style={{
            background: "#dc2626",
            padding: "4px 10px",
            borderRadius: "20px",
            minWidth: "50px",
            textAlign: "center",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          {alarms.devices} / {alarms.total}
        </div>

        <div
          style={{
            background: "#1f2937",
            padding: "4px 10px",
            borderRadius: "10px",
            fontSize: "13px",
          }}
        >
          👤 {userName}
        </div>

        <button
          onClick={onLogout}
          style={{
            background: "#374151",
            color: "white",
            border: "none",
            padding: "6px 10px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          🔓
        </button>
      </div>
    </header>
  );
}