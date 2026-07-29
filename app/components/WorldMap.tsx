"use client";

import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import worldTopo from "@/lib/data/world-110m.json";

export type Role = "base" | "covered" | "selected" | "baseline" | "target";

const ROLE_FILL: Record<Role, string> = {
  base: "#1b2230",
  covered: "#38537f",
  selected: "#4c8dff",
  baseline: "#3fb950",
  target: "#d29922",
};

const STROKE = "#0d1117";

export interface MapMarker {
  id: string;
  name: string;
  short: string;
  coordinates: [number, number];
  role: Role;
}

export interface WorldMapProps {
  /** Country name (topojson) -> role driving its fill. Missing = "base". */
  roleByCountry: Record<string, Role>;
  markers: MapMarker[];
  clickable: boolean;
  onSelectCountry: (country: string | null) => void;
  onSelectMarker: (id: string) => void;
  onHover: (label: string | null) => void;
}

export default function WorldMap({
  roleByCountry,
  markers,
  clickable,
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
            const role: Role = roleByCountry[name] ?? "base";
            const isCovered = role !== "base";
            const canClick = clickable && isCovered;
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                onMouseEnter={() => isCovered && onHover(name)}
                onMouseLeave={() => onHover(null)}
                onClick={() => canClick && onSelectCountry(name)}
                style={{
                  default: {
                    fill: ROLE_FILL[role],
                    stroke: STROKE,
                    strokeWidth: 0.4,
                    outline: "none",
                    cursor: canClick ? "pointer" : "default",
                    transition: "fill 0.2s ease",
                  },
                  hover: {
                    fill: role === "base" ? ROLE_FILL.base : role === "covered" ? "#5b9bff" : ROLE_FILL[role],
                    stroke: STROKE,
                    strokeWidth: 0.4,
                    outline: "none",
                    cursor: canClick ? "pointer" : "default",
                  },
                  pressed: {
                    fill: ROLE_FILL[role],
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

      {markers.map((m) => {
        const fill = ROLE_FILL[m.role];
        const canClick = clickable;
        return (
          <Marker
            key={m.id}
            coordinates={m.coordinates}
            onMouseEnter={() => onHover(m.name)}
            onMouseLeave={() => onHover(null)}
            onClick={() => canClick && onSelectMarker(m.id)}
            style={{
              default: { cursor: canClick ? "pointer" : "default" },
              hover: { cursor: canClick ? "pointer" : "default" },
              pressed: {},
            }}
          >
            <circle r={6.5} fill={fill} stroke="#fff" strokeWidth={1.4} />
            <circle r={11} fill="none" stroke={fill} strokeWidth={1} opacity={0.5} />
            <text
              x={15}
              y={4}
              textAnchor="start"
              style={{ fill: "#e6edf3", fontSize: 13, fontWeight: 700, paintOrder: "stroke", stroke: "#0d1117", strokeWidth: 3 }}
            >
              {m.short}
            </text>
          </Marker>
        );
      })}
    </ComposableMap>
  );
}
