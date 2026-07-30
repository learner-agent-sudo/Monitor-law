"use client";

import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import worldTopo from "@/lib/data/world-110m.json";

export const FILL_BASE = "#1b2230";
export const FILL_COVERED = "#38537f";
export const FILL_COVERED_HOVER = "#5b9bff";
const STROKE = "#0d1117";

export interface MapMarker {
  id: string;
  name: string;
  short: string;
  coordinates: [number, number];
  fill: string;
}

export interface WorldMapProps {
  /** Country name (topojson) -> fill color. Missing = not covered. */
  fillByCountry: Record<string, string>;
  markers: MapMarker[];
  onSelectCountry: (country: string) => void;
  onSelectMarker: (id: string) => void;
  onHover: (label: string | null) => void;
}

export default function WorldMap({
  fillByCountry,
  markers,
  onSelectCountry,
  onSelectMarker,
  onHover,
}: WorldMapProps) {
  return (
    <ComposableMap
      projection="geoEqualEarth"
      projectionConfig={{ scale: 200, center: [12, 12] }}
      width={980}
      height={500}
      style={{ width: "100%", height: "100%" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <Geographies geography={worldTopo}>
        {({ geographies }: { geographies: any[] }) =>
          geographies.map((geo) => {
            const name: string = geo.properties.name;
            const fill = fillByCountry[name];
            const isCovered = Boolean(fill);
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                onMouseEnter={() => isCovered && onHover(name)}
                onMouseLeave={() => onHover(null)}
                onClick={() => isCovered && onSelectCountry(name)}
                style={{
                  default: {
                    fill: fill ?? FILL_BASE,
                    stroke: STROKE,
                    strokeWidth: 0.4,
                    outline: "none",
                    cursor: isCovered ? "pointer" : "default",
                    transition: "fill 0.2s ease",
                  },
                  hover: {
                    fill: fill === FILL_COVERED ? FILL_COVERED_HOVER : (fill ?? FILL_BASE),
                    stroke: STROKE,
                    strokeWidth: 0.4,
                    outline: "none",
                    cursor: isCovered ? "pointer" : "default",
                  },
                  pressed: {
                    fill: fill ?? FILL_BASE,
                    stroke: STROKE,
                    strokeWidth: 0.4,
                    outline: "none",
                  },
                }}
              />
            );
          })
        }
      </Geographies>

      {markers.map((m) => (
        <Marker
          key={m.id}
          coordinates={m.coordinates}
          onMouseEnter={() => onHover(m.name)}
          onMouseLeave={() => onHover(null)}
          onClick={() => onSelectMarker(m.id)}
          style={{
            default: { cursor: "pointer" },
            hover: { cursor: "pointer" },
            pressed: {},
          }}
        >
          <circle r={6.5} fill={m.fill} stroke="#fff" strokeWidth={1.4} />
          <circle r={11} fill="none" stroke={m.fill} strokeWidth={1} opacity={0.5} />
          <text
            x={15}
            y={4}
            textAnchor="start"
            style={{
              fill: "#e6edf3",
              fontSize: 13,
              fontWeight: 700,
              paintOrder: "stroke",
              stroke: "#0d1117",
              strokeWidth: 3,
            }}
          >
            {m.short}
          </text>
        </Marker>
      ))}
    </ComposableMap>
  );
}
