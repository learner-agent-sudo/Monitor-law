"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { lawsById, jurisdictions, jurisdictionsById } from "@/lib/data";
import { analyzeGap } from "@/lib/gap";
import type { Role, MapMarker } from "./WorldMap";

const WorldMap = dynamic(() => import("./WorldMap"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map…</div>,
});

const EU_MEMBERS = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czechia", "Denmark",
  "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Ireland",
  "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands", "Poland",
  "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden",
];

// Polygon countries -> laws.
const COUNTRY_LAWS: Record<string, string[]> = {
  "United States of America": ["ccpa"],
  Canada: ["pipeda", "quebec-law25"],
  China: ["pipl"],
  ...Object.fromEntries(EU_MEMBERS.map((c) => [c, ["gdpr"]])),
};

// Small / city jurisdictions shown as labeled pins rather than polygons.
const MARKER_DEFS: { id: string; name: string; short: string; coordinates: [number, number]; laws: string[] }[] = [
  { id: "hk", name: "Hong Kong SAR", short: "HK", coordinates: [114.17, 22.32], laws: ["pdpo"] },
];
const MARKER_LAWS: Record<string, string[]> = Object.fromEntries(MARKER_DEFS.map((m) => [m.id, m.laws]));

// Jurisdiction id (used by gap analysis) -> the countries / markers it paints.
const JUR_COUNTRIES: Record<string, string[]> = {
  eu: EU_MEMBERS,
  "us-ca": ["United States of America"],
  ca: ["Canada"],
  "ca-qc": ["Canada"],
  cn: ["China"],
  hk: [],
};
const JUR_MARKERS: Record<string, string[]> = {
  eu: [], "us-ca": [], ca: [], "ca-qc": [], cn: [], hk: ["hk"],
};

const STATUS_LABEL: Record<string, string> = {
  "in-force": "In force",
  proposed: "Proposed",
  repealed: "Repealed",
};

/** All countries sharing a country's exact law set (so the whole EU lights up together). */
function groupFor(country: string): string[] {
  const key = JSON.stringify(COUNTRY_LAWS[country] ?? []);
  return Object.keys(COUNTRY_LAWS).filter((c) => JSON.stringify(COUNTRY_LAWS[c]) === key);
}

function exploreDescribe(sel: { type: "country" | "marker"; key: string }): {
  title: string;
  note: string;
  lawIds: string[];
} {
  if (sel.type === "marker") {
    if (sel.key === "hk")
      return { title: "Hong Kong SAR", note: "Special Administrative Region of China with its own data-protection law (PDPO).", lawIds: MARKER_LAWS.hk };
    return { title: sel.key, note: "", lawIds: MARKER_LAWS[sel.key] ?? [] };
  }
  const c = sel.key;
  if (EU_MEMBERS.includes(c))
    return { title: `${c} · European Union`, note: "GDPR applies across all EU/EEA member states.", lawIds: ["gdpr"] };
  switch (c) {
    case "United States of America":
      return {
        title: "United States",
        note: "No comprehensive federal privacy law — protection is state-by-state. Showing California (CCPA/CPRA); more states in Phase 2.",
        lawIds: ["ccpa"],
      };
    case "Canada":
      return { title: "Canada", note: "Federal law (PIPEDA) plus the Québec provincial regime (Law 25).", lawIds: ["pipeda", "quebec-law25"] };
    case "China":
      return { title: "China", note: "National personal-information law (PIPL).", lawIds: ["pipl"] };
    default:
      return { title: c, note: "", lawIds: COUNTRY_LAWS[c] ?? [] };
  }
}

type Mode = "explore" | "compare";

export default function HomeExplorer() {
  const [mode, setMode] = useState<Mode>("explore");
  const [hovered, setHovered] = useState<string | null>(null);

  // explore selection
  const [selection, setSelection] = useState<{ type: "country" | "marker"; key: string } | null>(null);

  // compare selection
  const [baseline, setBaseline] = useState("ca");
  const [target, setTarget] = useState("cn");

  const { roleByCountry, markers } = useMemo(() => {
    const rc: Record<string, Role> = {};
    const mr: Record<string, Role> = {};
    for (const c of Object.keys(COUNTRY_LAWS)) rc[c] = "covered";
    for (const m of MARKER_DEFS) mr[m.id] = "covered";

    if (mode === "explore" && selection) {
      if (selection.type === "country") for (const c of groupFor(selection.key)) rc[c] = "selected";
      else mr[selection.key] = "selected";
    } else if (mode === "compare") {
      for (const c of JUR_COUNTRIES[baseline] ?? []) rc[c] = "baseline";
      for (const id of JUR_MARKERS[baseline] ?? []) mr[id] = "baseline";
      for (const c of JUR_COUNTRIES[target] ?? []) rc[c] = "target";
      for (const id of JUR_MARKERS[target] ?? []) mr[id] = "target";
    }
    const markerList: MapMarker[] = MARKER_DEFS.map((m) => ({
      id: m.id, name: m.name, short: m.short, coordinates: m.coordinates, role: mr[m.id],
    }));
    return { roleByCountry: rc, markers: markerList };
  }, [mode, selection, baseline, target]);

  const gap = useMemo(
    () => (mode === "compare" && baseline !== target ? analyzeGap(baseline, target) : null),
    [mode, baseline, target],
  );

  const explore = selection ? exploreDescribe(selection) : null;

  return (
    <section className="map-hero">
      <div className="map-heading">
        <span className="stage-tag">PRIVACY LAW MONITOR</span>
        <p>Explore data-protection laws by jurisdiction — click a highlighted region, or switch to Compare to see the gap between two regimes.</p>
      </div>

      <div className="map-fill">
        <WorldMap
          roleByCountry={roleByCountry}
          markers={markers}
          clickable={mode === "explore"}
          onSelectCountry={(c) => setSelection(c ? { type: "country", key: c } : null)}
          onSelectMarker={(id) => setSelection({ type: "marker", key: id })}
          onHover={setHovered}
        />
      </div>

      <div className="map-legend-float">
        <span className="legend-item"><span className="legend-swatch swatch-covered" /> Covered</span>
        {mode === "explore" ? (
          <span className="legend-item"><span className="legend-swatch swatch-selected" /> Selected</span>
        ) : (
          <>
            <span className="legend-item"><span className="legend-swatch swatch-baseline" /> You comply</span>
            <span className="legend-item"><span className="legend-swatch swatch-target" /> Target</span>
          </>
        )}
        <span className="legend-item"><span className="legend-swatch swatch-none" /> Not covered</span>
        {hovered && <span className="map-hint">▸ {hovered}</span>}
      </div>

      <aside className="map-panel">
        <div className="mode-toggle">
          <button className={mode === "explore" ? "on" : ""} onClick={() => setMode("explore")}>Explore</button>
          <button className={mode === "compare" ? "on" : ""} onClick={() => setMode("compare")}>Compare</button>
        </div>

        {mode === "explore" ? (
          <>
            <div className="quick-chips">
              {[
                { label: "🇪🇺 EU", sel: { type: "country", key: "France" } },
                { label: "🇺🇸 US", sel: { type: "country", key: "United States of America" } },
                { label: "🇨🇦 Canada", sel: { type: "country", key: "Canada" } },
                { label: "🇨🇳 China", sel: { type: "country", key: "China" } },
                { label: "🇭🇰 HK", sel: { type: "marker", key: "hk" } },
              ].map((c) => (
                <button key={c.label} className="chip" onClick={() => setSelection(c.sel as any)}>
                  {c.label}
                </button>
              ))}
            </div>
            {!explore ? (
              <p className="panel-empty">Select a highlighted country or pin on the map to view its privacy laws.</p>
            ) : (
              <div className="panel-scroll">
                <h2 className="panel-title">{explore.title}</h2>
                {explore.note && <p className="panel-note">{explore.note}</p>}
                {explore.lawIds.map((id) => {
                  const law = lawsById[id];
                  if (!law) return null;
                  return (
                    <Link key={id} href={`/laws/${id}`} className="card panel-card">
                      <div className="card-title">{law.shortName}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0" }}>
                        <span className={`badge badge-status-${law.status}`}>{STATUS_LABEL[law.status]}</span>
                        <span className="badge badge-region">Effective {law.effectiveDate}</span>
                      </div>
                      <span className="card-cta">View obligations →</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="compare-controls">
              <label>
                <span>You comply with</span>
                <select value={baseline} onChange={(e) => setBaseline(e.target.value)}>
                  {jurisdictions.map((j) => (
                    <option key={j.id} value={j.id}>{j.flag} {j.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Target</span>
                <select value={target} onChange={(e) => setTarget(e.target.value)}>
                  {jurisdictions.map((j) => (
                    <option key={j.id} value={j.id}>{j.flag} {j.name}</option>
                  ))}
                </select>
              </label>
            </div>
            {baseline === target ? (
              <p className="panel-empty">Pick two different jurisdictions to compare.</p>
            ) : gap ? (
              <div className="panel-scroll">
                <div className="gap-count">
                  <span className="gap-num">{gap.gaps.length}</span>
                  <span> gap{gap.gaps.length === 1 ? "" : "s"} moving to {jurisdictionsById[target].name}</span>
                </div>
                {gap.gaps.slice(0, 6).map((g) => (
                  <div key={g.requirement.id} className="gap-row">
                    <div className="gap-req">{g.requirement.name}</div>
                    <div className="gap-oblig">{g.targetObligation}</div>
                  </div>
                ))}
                {gap.gaps.length === 0 && (
                  <p className="panel-note">Complying with {jurisdictionsById[baseline].name} already meets or exceeds {jurisdictionsById[target].name} across the tracked requirements.</p>
                )}
                <Link href="/gap-analysis" className="card-cta" style={{ marginTop: 12, display: "inline-block" }}>
                  Full gap analysis →
                </Link>
              </div>
            ) : null}
          </>
        )}
      </aside>
    </section>
  );
}
