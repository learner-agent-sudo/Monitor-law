"use client";

import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import worldTopo from "@/lib/data/world-110m.json";

// Theme-matched colors (kept in sync with globals.css).
const COLORS = {
  sea: "transparent",
  land: "#1b2230",
  landStroke: "#0d1117",
  covered: "#38537f",
  coveredHover: "#5b9bff",
  selected: "#4c8dff",
};

export interface WorldMapProps {
  /** Country name (as in the topojson) -> law ids covering it. */
  covered: Record<string, string[]>;
  /** Countries currently highlighted as the active selection group. */
  selectedCountries: string[];
  onSelect: (country: string | null) => void;
  onHover: (country: string | null) => void;
}

export default function WorldMap({
  covered,
  selectedCountries,
  onSelect,
  onHover,
}: WorldMapProps) {
  const selectedSet = new Set(selectedCountries);
  return (
    <div className="map-canvas">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 165 }}
        width={900}
        height={440}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={worldTopo}>
          {({ geographies }: { geographies: any[] }) =>
            geographies.map((geo) => {
              const name: string = geo.properties.name;
              const isCovered = Boolean(covered[name]);
              const isSelected = selectedSet.has(name);
              const baseFill = isSelected
                ? COLORS.selected
                : isCovered
                  ? COLORS.covered
                  : COLORS.land;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={() => onHover(isCovered ? name : null)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onSelect(isCovered ? name : null)}
                  style={{
                    default: {
                      fill: baseFill,
                      stroke: COLORS.landStroke,
                      strokeWidth: 0.4,
                      outline: "none",
                      cursor: isCovered ? "pointer" : "default",
                      transition: "fill 0.15s ease",
                    },
                    hover: {
                      fill: isCovered ? COLORS.coveredHover : COLORS.land,
                      stroke: COLORS.landStroke,
                      strokeWidth: 0.4,
                      outline: "none",
                      cursor: isCovered ? "pointer" : "default",
                    },
                    pressed: {
                      fill: COLORS.selected,
                      stroke: COLORS.landStroke,
                      strokeWidth: 0.4,
                      outline: "none",
                    },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}
