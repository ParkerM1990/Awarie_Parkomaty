import MultiNodeSelect from "./MultiNodeSelect";
type Props = {
  nodes: string[];
  selectedNodes: string[];
  selectedEvent: string;

  threshold: number;
  hours: number;

  
onNodeChange: (
  nodes: string[]
) => void;

  onEventChange: (v: string) => void;

  onThresholdChange: (
    value: number
  ) => void;

  onHoursChange: (
    value: number
  ) => void;

  eventNames: string[];
};



export default function MapFilters({
  nodes,
  selectedNodes,
  selectedEvent,
  threshold,
  hours,
  onNodeChange,
  onEventChange,
  onThresholdChange,
  onHoursChange,
  eventNames,
}: Props) {

  return (
 <>   
<div
    style={{
      marginBottom: 10,
      position: "relative",
      zIndex: 2000,
    }}
  >
    <MultiNodeSelect
      options={nodes}
      selected={selectedNodes}
      onChange={onNodeChange}
    />
  </div>

    
<div
    className="app-panel"
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit,minmax(180px,1fr))",
      gap: 8,
    }}
  >

    
<select
  value={threshold}
  onChange={(e) =>
    onThresholdChange(
      Number(e.target.value)
    )
  }
>
  <option value={1}>
    🔥 Czuły (1)
  </option>

  <option value={7}>
    ⚖️ Standard (7)
  </option>

  <option value={15}>
    🧊 Duże (15)
  </option>
</select>

<select
  value={hours}
  onChange={(e) =>
    onHoursChange(
      Number(e.target.value)
    )
  }
>
  <option value={24}>24h</option>
  <option value={48}>48h</option>
  <option value={72}>72h</option>
</select>
      <select
        value={selectedEvent}
        onChange={(e) =>
          onEventChange(e.target.value)
        }
      >
        <option value="">
          Wszystkie awarie
        </option>

        {eventNames.map((event) => (
          <option
            key={event}
            value={event}
          >
            {event}
          </option>
        ))}
      </select>
    </div>
</>
  );
}