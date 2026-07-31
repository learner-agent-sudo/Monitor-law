"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { laws, lawsById, jurisdictionsById, requirements, requirementCategories } from "@/lib/data";
import { analyzeGap, aggregateByJurisdiction } from "@/lib/gap";
import { CoverageBadge } from "./CoverageBadge";
import { FILL_BASE, FILL_COVERED, type MapMarker } from "./WorldMap";
import type { Strictness } from "@/lib/types";

const WorldMap = dynamic(() => import("./WorldMap"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map…</div>,
});

/** Distinct colors assigned in selection order. */
const SELECTION_COLORS = ["#4c8dff", "#3fb950", "#d29922", "#a371f7"];
const MAX_SELECTION = SELECTION_COLORS.length;

const EU_MEMBERS = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czechia", "Denmark",
  "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Ireland",
  "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands", "Poland",
  "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden",
];

/** Map polygon -> the jurisdiction it selects. */
const COUNTRY_JURISDICTION: Record<string, string> = {
  "United Kingdom": "uk",
  "United States of America": "us-ca",
  Canada: "ca",
  China: "cn",
  ...Object.fromEntries(EU_MEMBERS.map((c) => [c, "eu"])),
};

/** Countries painted for a given jurisdiction. */
const JURISDICTION_COUNTRIES: Record<string, string[]> = {
  eu: EU_MEMBERS,
  uk: ["United Kingdom"],
  "us-ca": ["United States of America"],
  ca: ["Canada"],
  cn: ["China"],
  "ca-qc": [],
  hk: [],
};

/**
 * Small or sub-national jurisdictions render as labeled pins — a city-state or
 * province is invisible as a polygon next to a country like Canada.
 */
const MARKER_DEFS: { id: string; jurisdictionId: string; name: string; short: string; coordinates: [number, number] }[] = [
  { id: "hk", jurisdictionId: "hk", name: "Hong Kong SAR", short: "HK", coordinates: [114.17, 22.32] },
  { id: "qc", jurisdictionId: "ca-qc", name: "Québec", short: "QC", coordinates: [-71.5, 47.5] },
];

const NOTES: Record<string, string> = {
  eu: "The GDPR applies across all EU/EEA member states.",
  uk: "Retained EU law, now measurably diverging: child consent at 13, fines in sterling, and the Data (Use and Access) Act 2025 replaced Art. 22 and omitted Art. 44 from 5 Feb 2026.",
  "us-ca":
    "The United States has no comprehensive federal privacy law — protection is state-by-state. California is shown here; more states arrive in Phase 2.",
  ca: "Canada's federal private-sector law. Québec has its own, stricter regime — select QC on the map.",
  "ca-qc": "Québec's provincial regime, the most GDPR-like law in North America.",
  cn: "China's national personal-information law, alongside the Cybersecurity and Data Security Laws.",
  hk: "Special Administrative Region of China with its own, comparatively light-touch data-protection law.",
};

const STATUS_LABEL: Record<string, string> = {
  "in-force": "In force",
  proposed: "Proposed",
  repealed: "Repealed",
};

export default function HomeExplorer() {
  const [selected, setSelected] = useState<string[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  function toggle(jurisdictionId: string) {
    setSelected((prev) => {
      if (prev.includes(jurisdictionId)) return prev.filter((id) => id !== jurisdictionId);
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, jurisdictionId];
    });
  }

  const colorOf = (jurisdictionId: string): string | null => {
    const i = selected.indexOf(jurisdictionId);
    return i === -1 ? null : SELECTION_COLORS[i];
  };

  const { fillByCountry, markers } = useMemo(() => {
    const fills: Record<string, string> = {};
    for (const [country, jid] of Object.entries(COUNTRY_JURISDICTION)) {
      const i = selected.indexOf(jid);
      fills[country] = i === -1 ? FILL_COVERED : SELECTION_COLORS[i];
    }
    const list: MapMarker[] = MARKER_DEFS.map((m) => {
      const i = selected.indexOf(m.jurisdictionId);
      return {
        id: m.id,
        name: m.name,
        short: m.short,
        coordinates: m.coordinates,
        fill: i === -1 ? FILL_COVERED : SELECTION_COLORS[i],
      };
    });
    return { fillByCountry: fills, markers: list };
  }, [selected]);

  const gap = useMemo(
    () => (selected.length === 2 ? analyzeGap(selected[0], selected[1]) : null),
    [selected],
  );

  const coverage = useMemo(
    () => Object.fromEntries(selected.map((id) => [id, aggregateByJurisdiction(id)])),
    [selected],
  );

  const scrollToDetail = () =>
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <div className="map-intro">
        <h1 className="map-title">Privacy Law Monitor</h1>
        <p>
          Click a region to see its laws. Select two or more to compare them side by side.
        </p>
      </div>

      <section className="map-hero">
        <div className="map-fill">
          <WorldMap
            fillByCountry={fillByCountry}
            markers={markers}
            onSelectCountry={(c) => {
              const jid = COUNTRY_JURISDICTION[c];
              if (jid) toggle(jid);
            }}
            onSelectMarker={(id) => {
              const m = MARKER_DEFS.find((d) => d.id === id);
              if (m) toggle(m.jurisdictionId);
            }}
            onHover={setHovered}
          />
        </div>

        <div className="map-bar">
          {selected.length === 0 ? (
            <span className="bar-hint">
              {hovered ? <strong>{hovered}</strong> : "Click a highlighted region or pin to begin"}
            </span>
          ) : (
            <>
              {selected.map((id) => (
                <button key={id} className="sel-chip" onClick={() => toggle(id)} title="Remove">
                  <span className="sel-dot" style={{ background: colorOf(id) ?? "" }} />
                  {jurisdictionsById[id].flag} {jurisdictionsById[id].name}
                  <span className="sel-x">×</span>
                </button>
              ))}
              <button className="bar-btn" onClick={() => setSelected([])}>
                Clear
              </button>
              <button className="bar-btn primary" onClick={scrollToDetail}>
                {selected.length === 1 ? "View laws ↓" : "Compare ↓"}
              </button>
            </>
          )}
        </div>
      </section>

      <div ref={detailRef} className="detail-anchor" />

      {selected.length === 0 && <AllLaws />}
      {selected.length === 1 && <SingleJurisdiction id={selected[0]} />}
      {selected.length >= 2 && (
        <Comparison ids={selected} colorOf={colorOf} coverage={coverage} gap={gap} onSwap={() => setSelected([selected[1], selected[0]])} />
      )}
    </>
  );
}

function LawCard({ id }: { id: string }) {
  const law = lawsById[id];
  if (!law) return null;
  return (
    <Link href={`/laws/${id}`} className="card">
      <div className="card-title">{law.shortName}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
        <span className={`badge badge-status-${law.status}`}>{STATUS_LABEL[law.status]}</span>
        <span className="badge badge-region">Effective {law.effectiveDate}</span>
      </div>
      <p className="card-summary">{law.summary}</p>
      <span className="card-cta">View obligations →</span>
    </Link>
  );
}

function SingleJurisdiction({ id }: { id: string }) {
  const j = jurisdictionsById[id];
  const theseLaws = laws.filter((l) => l.jurisdictionId === id);
  return (
    <section className="detail-section">
      <h2 className="detail-title">
        <span className="detail-flag">{j.flag}</span> {j.name}
      </h2>
      {NOTES[id] && <p className="detail-note">{NOTES[id]}</p>}
      <div className="grid">
        {theseLaws.map((l) => (
          <LawCard key={l.id} id={l.id} />
        ))}
      </div>
    </section>
  );
}

function Comparison({
  ids,
  colorOf,
  coverage,
  gap,
  onSwap,
}: {
  ids: string[];
  colorOf: (id: string) => string | null;
  coverage: Record<string, ReturnType<typeof aggregateByJurisdiction>>;
  gap: ReturnType<typeof analyzeGap> | null;
  onSwap: () => void;
}) {
  return (
    <section className="detail-section">
      <h2 className="detail-title">Comparing {ids.length} jurisdictions</h2>
      <div className="compare-heads">
        {ids.map((id) => (
          <span key={id} className="compare-head">
            <span className="sel-dot" style={{ background: colorOf(id) ?? "" }} />
            {jurisdictionsById[id].flag} {jurisdictionsById[id].name}
          </span>
        ))}
      </div>

      {gap && (
        <div className="gap-callout">
          <div className="gap-callout-head">
            <span>
              Moving from <strong>{gap.source.name}</strong> to <strong>{gap.target.name}</strong>:{" "}
              <span className="gap-num-inline">{gap.gaps.length}</span> gap
              {gap.gaps.length === 1 ? "" : "s"} to close
            </span>
            <button className="bar-btn" onClick={onSwap}>
              ⇄ Swap direction
            </button>
          </div>
          {gap.gaps.length > 0 ? (
            <div className="gap-list">
              {gap.gaps.map((g) => (
                <div key={g.requirement.id} className="gap-row">
                  <div className="gap-req">{g.requirement.name}</div>
                  <div className="gap-oblig">{g.targetObligation}</div>
                  <div className="citation">{g.targetCitation}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="detail-note" style={{ margin: 0 }}>
              Complying with {gap.source.name} already meets or exceeds {gap.target.name} across the
              tracked requirements.
            </p>
          )}
        </div>
      )}

      <h3 className="region-heading">Obligation coverage</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: "28%" }}>Requirement</th>
              {ids.map((id) => (
                <th key={id}>
                  <span className="sel-dot" style={{ background: colorOf(id) ?? "" }} />{" "}
                  {jurisdictionsById[id].flag} {jurisdictionsById[id].name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requirementCategories.map((category) => (
              <Fragment key={category}>
                <tr>
                  <td
                    colSpan={1 + ids.length}
                    style={{
                      background: "var(--bg)",
                      color: "var(--text-faint)",
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {category}
                  </td>
                </tr>
                {requirements
                  .filter((r) => r.category === category)
                  .map((req) => (
                    <tr key={req.id}>
                      <td>
                        <div className="req-name">{req.name}</div>
                      </td>
                      {ids.map((id) => {
                        const level = (coverage[id]?.[req.id]?.strictness ?? 0) as Strictness;
                        return (
                          <td key={id}>
                            <CoverageBadge level={level} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <Link href="/gap-analysis" className="card-cta" style={{ marginTop: 16, display: "inline-block" }}>
        Open full gap analysis →
      </Link>
    </section>
  );
}

function AllLaws() {
  const grouped = laws.reduce<Record<string, typeof laws>>((acc, law) => {
    const j = jurisdictionsById[law.jurisdictionId];
    (acc[j.region] ||= []).push(law);
    return acc;
  }, {});
  return (
    <section className="detail-section">
      <h2 className="detail-title">All tracked laws</h2>
      {Object.entries(grouped).map(([region, regionLaws]) => (
        <div key={region}>
          <h3 className="region-heading">{region}</h3>
          <div className="grid">
            {regionLaws.map((law) => {
              const j = jurisdictionsById[law.jurisdictionId];
              return (
                <Link key={law.id} href={`/laws/${law.id}`} className="card">
                  <div className="card-head">
                    <span className="card-flag">{j.flag}</span>
                    <div>
                      <div className="card-title">{law.shortName}</div>
                      <div className="card-sub">{j.name}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className={`badge badge-status-${law.status}`}>
                      {STATUS_LABEL[law.status]}
                    </span>
                    <span className="badge badge-region">Effective {law.effectiveDate}</span>
                  </div>
                  <p className="card-summary">{law.summary}</p>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
