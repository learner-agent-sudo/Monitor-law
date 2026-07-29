"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { lawsById } from "@/lib/data";

// Load the SVG map on the client only — keeps the static export build simple
// and avoids any server-side rendering of the geography library.
const WorldMap = dynamic(() => import("./WorldMap"), {
  ssr: false,
  loading: () => <div className="map-canvas map-loading">Loading map…</div>,
});

const EU_MEMBERS = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czechia", "Denmark",
  "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Ireland",
  "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands", "Poland",
  "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden",
];

// Country name (as in the topojson) -> the laws that apply there.
const COUNTRY_LAWS: Record<string, string[]> = {
  "United States of America": ["ccpa"],
  Canada: ["pipeda", "quebec-law25"],
  China: ["pipl"],
  ...Object.fromEntries(EU_MEMBERS.map((c) => [c, ["gdpr"]])),
};

const STATUS_LABEL: Record<string, string> = {
  "in-force": "In force",
  proposed: "Proposed",
  repealed: "Repealed",
};

function describe(country: string): { title: string; note: string } {
  if (EU_MEMBERS.includes(country)) {
    return { title: `${country} · European Union`, note: "GDPR applies across all EU/EEA member states." };
  }
  switch (country) {
    case "United States of America":
      return { title: "United States", note: "Showing California (CCPA/CPRA). More US states arrive in Phase 2." };
    case "Canada":
      return { title: "Canada", note: "Federal law plus the Québec provincial regime." };
    case "China":
      return { title: "China", note: "National personal-information law (PIPL)." };
    default:
      return { title: country, note: "" };
  }
}

/** All countries sharing the selected country's exact law set (for group highlight). */
function groupFor(country: string | null): string[] {
  if (!country) return [];
  const key = JSON.stringify(COUNTRY_LAWS[country] ?? []);
  return Object.keys(COUNTRY_LAWS).filter((c) => JSON.stringify(COUNTRY_LAWS[c]) === key);
}

export default function HomeExplorer() {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const selectedCountries = useMemo(() => groupFor(selected), [selected]);
  const lawIds = selected ? COUNTRY_LAWS[selected] ?? [] : [];
  const info = selected ? describe(selected) : null;

  const coveredCount = 4; // EU, US, Canada, China (distinct regimes shown)

  return (
    <>
      <span className="stage-tag">STAGE 1 · CURRENT LAWS</span>
      <h1 className="page-title">Privacy Law Monitor</h1>
      <p className="page-lead">
        Explore privacy &amp; data-protection laws by jurisdiction. Highlighted regions are covered —
        click one to see its laws, or use Gap Analysis to compare two regimes.
      </p>

      <div className="explorer">
        <div className="explorer-map">
          <WorldMap
            covered={COUNTRY_LAWS}
            selectedCountries={selectedCountries}
            onSelect={setSelected}
            onHover={setHovered}
          />
          <div className="map-legend">
            <span className="legend-item">
              <span className="legend-swatch swatch-covered" /> Covered
            </span>
            <span className="legend-item">
              <span className="legend-swatch swatch-selected" /> Selected
            </span>
            <span className="legend-item">
              <span className="legend-swatch swatch-none" /> Not yet covered
            </span>
            <span className="map-hint">{hovered ? `▸ ${hovered}` : "Hover a highlighted country"}</span>
          </div>
        </div>

        <aside className="explorer-panel">
          <div className="quick-chips">
            {["European Union", "United States of America", "Canada", "China"].map((c) => (
              <button
                key={c}
                className={`chip ${selectedCountries.includes(c === "European Union" ? "France" : c) ? "chip-active" : ""}`}
                onClick={() => setSelected(c === "European Union" ? "France" : c)}
              >
                {c === "European Union" ? "🇪🇺 EU" : c === "United States of America" ? "🇺🇸 US" : c === "Canada" ? "🇨🇦 Canada" : "🇨🇳 China"}
              </button>
            ))}
          </div>

          {!selected ? (
            <div className="panel-empty">
              <div className="stat-row" style={{ marginBottom: 20 }}>
                <div className="stat">
                  <div className="num">{Object.keys(lawsById).length}</div>
                  <div className="lbl">Laws</div>
                </div>
                <div className="stat">
                  <div className="num">{coveredCount}</div>
                  <div className="lbl">Regimes</div>
                </div>
              </div>
              <p>Select a highlighted country on the map (or a chip above) to view its privacy laws.</p>
            </div>
          ) : (
            <div className="panel-content">
              <h2 className="panel-title">{info?.title}</h2>
              {info?.note && <p className="panel-note">{info.note}</p>}
              <div className="panel-laws">
                {lawIds.map((id) => {
                  const law = lawsById[id];
                  if (!law) return null;
                  return (
                    <Link key={id} href={`/laws/${id}`} className="card">
                      <div className="card-title">{law.shortName}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
                        <span className={`badge badge-status-${law.status}`}>
                          {STATUS_LABEL[law.status]}
                        </span>
                        <span className="badge badge-region">Effective {law.effectiveDate}</span>
                      </div>
                      <p className="card-summary">{law.summary}</p>
                      <span className="card-cta">View obligations →</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
