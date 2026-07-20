import { useState } from "react";
import type {
  Dispatch,
  SetStateAction,
} from "react";

type StructureMap = {
  [structure: string]: string[];
};

type StructureSelectorProps = {
  structureMap: StructureMap;

  selectedStructures: string[];
  selectedNodes: string[];

  setSelectedStructures: Dispatch<
    SetStateAction<string[]>
  >;

  setSelectedNodes: Dispatch<
    SetStateAction<string[]>
  >;
};

export default function StructureSelector({
  structureMap,
  selectedStructures,
  selectedNodes,
  setSelectedStructures,
  setSelectedNodes,
}: StructureSelectorProps) {
  const [expanded, setExpanded] =
    useState<Record<string, boolean>>({});

  function toggleExpand(structure: string) {
  setExpanded((prev) => ({
    ...prev,
    [structure]: !prev[structure],
  }));
}

  function handleStructureChange(
    structure: string,
    checked: boolean
  ) {
    const nodesForStructure =
      structureMap[structure] || [];

    if (checked) {
      setSelectedStructures((prev) => [
        ...new Set([
          ...prev,
          structure,
        ]),
      ]);

      setSelectedNodes((prev) => [
        ...new Set([
          ...prev,
          ...nodesForStructure,
        ]),
      ]);
    } else {
      setSelectedStructures((prev) =>
        prev.filter(
          (item) =>
            item !== structure
        )
      );

      setSelectedNodes((prev) =>
        prev.filter(
          (node) =>
            !nodesForStructure.includes(
              node
            )
        )
      );
    }
  }

  function handleNodeChange(
    structure: string,
    node: string,
    checked: boolean
  ) {
    if (checked) {
      setSelectedNodes((prev) => [
        ...new Set([
          ...prev,
          node,
        ]),
      ]);

      setSelectedStructures((prev) => [
        ...new Set([
          ...prev,
          structure,
        ]),
      ]);
    } else {
      setSelectedNodes((prev) =>
        prev.filter(
          (item) => item !== node
        )
      );

      const nodesForStructure =
        structureMap[structure] || [];

      const remainingSelectedNodes =
        nodesForStructure.filter(
          (item) =>
            item !== node &&
            selectedNodes.includes(item)
        );

      if (
        remainingSelectedNodes.length === 0
      ) {
        setSelectedStructures((prev) =>
          prev.filter(
            (item) =>
              item !== structure
          )
        );
      }
    }
  }

  const structures =
    Object.entries(structureMap).sort(
      ([a], [b]) =>
        a.localeCompare(b, "pl")
    );

  if (structures.length === 0) {
    return (
      <div
        style={{
          color: "#9ca3af",
          fontSize: 14,
          padding: 10,
        }}
      >
        Brak dostępnych struktur.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {structures.map(
        ([structure, nodes]) => {
          const isExpanded =
            expanded[structure] || false;

          const isStructureChecked =
            selectedStructures.includes(
              structure
            );

          const sortedNodes = [
            ...nodes,
          ].sort((a, b) =>
            a.localeCompare(b, "pl")
          );

          return (
            <div
              key={structure}
              style={{
                border:
                  "1px solid #1f2937",
                borderRadius: 12,
                padding: 12,
                background: "#020617",
              }}
            >
              <div
                onClick={() =>
                  toggleExpand(structure)
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    isStructureChecked
                  }
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                  onChange={(event) =>
                    handleStructureChange(
                      structure,
                      event.target.checked
                    )
                  }
                />

                <strong>
                  {structure}
                </strong>

                <span
                  style={{
                    marginLeft: "auto",
                    color: "#9ca3af",
                  }}
                >
                  {isExpanded
                    ? "▼"
                    : "▶"}
                </span>
              </div>

              {isExpanded && (
                <div
                  style={{
                    marginTop: 10,
                    marginLeft: 28,
                    display: "flex",
                    flexDirection:
                      "column",
                    gap: 8,
                  }}
                >
                  {sortedNodes.map(
                    (node) => (
                      <label
                        key={node}
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          gap: 8,
                          cursor:
                            "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedNodes.includes(
                            node
                          )}
                          onChange={(
                            event
                          ) =>
                            handleNodeChange(
                              structure,
                              node,
                              event.target
                                .checked
                            )
                          }
                        />

                        <span>{node}</span>
                      </label>
                    )
                  )}
                </div>
              )}
            </div>
          );
        }
      )}
    </div>
  );
}