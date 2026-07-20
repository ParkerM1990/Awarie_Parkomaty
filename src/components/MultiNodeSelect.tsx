import {
  useEffect,
  useRef,
  useState,
} from "react";

type Props = {
  options: string[];
  selected: string[];
  onChange: (
    values: string[]
  ) => void;
};

export default function MultiNodeSelect({
  options,
  selected,
  onChange,
}: Props) {
  const [open, setOpen] =
    useState(false);

  const wrapperRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  function toggleNode(
    node: string
  ) {
    if (selected.includes(node)) {
      onChange(
        selected.filter(
          (n) => n !== node
        )
      );
    } else {
      onChange([
        ...selected,
        node,
      ]);
    }
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        marginBottom: 20,
        zIndex: 1000,
      }}
    >
      <div
        onClick={() =>
          setOpen(!open)
        }
        style={{
          border:
            "1px solid #374151",
          borderRadius: 8,
          padding: 10,
          cursor: "pointer",
          background:
            "#111827",
          userSelect: "none",
        }}
      >
        {selected.length === 0
          ? "📍 Wszystkie strefy"
          : `📍 Wybrano: ${selected.length}`}{" "}
        ▼
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "105%",
            left: 0,
            right: 0,
            background:
              "#111827",
            border:
              "1px solid #374151",
            borderRadius: 8,
            maxHeight: 300,
            overflowY: "auto",
            zIndex: 9999,
            padding: 10,
            boxShadow:
              "0 10px 25px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <button
              type="button"
              onClick={() =>
                onChange(options)
              }
            >
              Wszystkie
            </button>

            <button
              type="button"
              onClick={() =>
                onChange([])
              }
            >
              Wyczyść
            </button>
          </div>

          {options.map((node) => (
            <label
              key={node}
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 6,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(
                  node
                )}
                onChange={() =>
                  toggleNode(node)
                }
              />

              {node}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}