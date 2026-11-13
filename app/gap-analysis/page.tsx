"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { jurisdictions } from "@/lib/data";
import { analyzeGap, type RequirementComparison } from "@/lib/gap";
import { Disclaimer } from "@/app/components/Disclaimer";
import { GapCard, type GapMode } from "@/app/components/GapCard";
import { TermsTable } from "@/app/components/TermsTable";
import { usePreloadEvidence } from "@/lib/evidence";

const DEFAULT_SOURCE = "ca"; // "I comply with Canada"
const DEFAULT_TARGET = "cn"; // "...gap to China?"
const KNOWN_IDS = new Set(jurisdictions.map((j) => j.id));

/** A list of cards for one group of requirements. */
function CardList({
  items,
  mode,
  sourceName,
  targetName,
}: {
  items: RequirementComparison[];
  mode: GapMode;
  sourceName: string;
  targetName: string;
}) {
  return (
    <div className="gap-list">
      {items.map((c) => (
        <GapCard
          key={c.requirement.id}
          c={c}
          mode={mode}
          sourceName={sourceName}
          targetName={targetName}
        />
      ))}
    </div>
  );
}

/** A long tail of requirements sits in a disclosure: open when short, closed when long. */
function Collapsible({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  return (
    <details className="cmp-section" open={count <= 4}>
      <summary>
        Show {count} {count === 1 ? "requirement" : "requirements"}
      </summary>
      {children}
    </details>
  );
}

export default function GapAnalysisPage() {
  const [sourceId, setSourceId] = useState(DEFAULT_SOURCE);
  const [targetId, setTargetId] = useState(DEFAULT_TARGET);
  // The URL is read once on mount and written from then on. Until the read
  // has happened, writing would overwrite the shared link with the defaults.
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const from = params.get("from");
      const to = params.get("to");
      if (from && KNOWN_IDS.has(from)) setSourceId(from);
      if (to && KNOWN_IDS.has(to)) setTargetId(to);
    } catch {
      // Keep the defaults when the URL cannot be read.
    }
    setUrlReady(true);
  }, []);

  useEffect(() => {
    if (!urlReady) return;
    try {
      const query = `?from=${encodeURIComponent(sourceId)}&to=${encodeURIComponent(targetId)}`;
      window.history.replaceState(null, "", query);
    } catch {
      // The page works without the shareable URL.
    }
  }, [urlReady, sourceId, targetId]);

  const result = useMemo(() => analyzeGap(sourceId, targetId), [sourceId, targetId]);
  const sameJurisdiction = sourceId === targetId;
  // Load the law text for every law on both sides, so it is ready before the first hover.
  usePreloadEvidence([
    ...(result.comparisons[0]?.sourceLawIds ?? []),
    ...(result.comparisons[0]?.targetLawIds ?? []),
  ]);
  const sourceName = result.source.name;
  const targetName = result.target.name;

  const swap = () => {
    setSourceId(targetId);
    setTargetId(sourceId);
  };

  return (
    <>
      <span className="stage-tag">STAGE 3 · GAP ANALYSIS</span>
      <h1 className="page-title">Cross-jurisdiction gap analysis</h1>
      <p className="page-lead">
        Pick the regime you already comply with, then the regime you want to comply with. The tool
        shows where the target asks for more than your current baseline, where it takes a different
        approach, and where the two already line up.
      </p>
      <div className="cmp-howto">
        <strong>How to read this.</strong> Each requirement is broken into the points that are
        actually compared in practice. Each law is placed on every point from its own text, with the
        passage quoted, and two laws are then compared by what they require, not by the words they
        use. Each card shows the target&apos;s position first and yours beside it; open &ldquo;All
        points&rdquo; on a card for the full side-by-side table.
      </div>

      <div className="controls">
        <div className="control">
          <label htmlFor="source">I currently comply with</label>
          <select id="source" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            {jurisdictions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.flag} {j.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="swap-btn"
          aria-label="Swap the two jurisdictions"
          title="Swap the two jurisdictions"
          onClick={swap}
        >
          ⇄
        </button>
        <div className="control">
          <label htmlFor="target">I want to comply with</label>
          <select id="target" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            {jurisdictions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.flag} {j.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sameJurisdiction ? (
        <p className="empty">Select two different jurisdictions to compare.</p>
      ) : (
        <>
          <nav className="stat-row" aria-label="Jump to a group of requirements">
            <a className="stat stat-link" data-group="gap" href="#sec-gaps">
              <div className="num">{result.gaps.length}</div>
              <div className="lbl">Requirements where {targetName} asks for more</div>
            </a>
            {result.different.length > 0 && (
              <a className="stat stat-link" data-group="different" href="#sec-different">
                <div className="num">{result.different.length}</div>
                <div className="lbl">Different approach: read both</div>
              </a>
            )}
            {result.secondLook.length > 0 && (
              <a className="stat stat-link" data-group="second" href="#sec-second">
                <div className="num">{result.secondLook.length}</div>
                <div className="lbl">Worth a second look</div>
              </a>
            )}
            <a className="stat stat-link" data-group="covered" href="#sec-covered">
              <div className="num">{result.covered.length}</div>
              <div className="lbl">Same in substance, or {sourceName} already asks for more</div>
            </a>
            {result.neither.length > 0 && (
              <a className="stat stat-link" data-group="neither" href="#sec-neither">
                <div className="num">{result.neither.length}</div>
                <div className="lbl">Neither law deals with this</div>
              </a>
            )}
          </nav>
          <p className="gap-hint">
            Hover or tap any § citation to read the law text it rests on.
          </p>

          <h2 className="section gap-section" id="sec-gaps">
            Where {targetName} asks for more than {sourceName}
          </h2>
          {result.gaps.length === 0 ? (
            <p className="empty">
              No additional obligations detected. Complying with {sourceName} broadly meets or
              exceeds {targetName} across the tracked requirements.
            </p>
          ) : (
            <CardList
              items={result.gaps}
              mode="gap"
              sourceName={sourceName}
              targetName={targetName}
            />
          )}

          {result.different.length > 0 && (
            <>
              <h2 className="section gap-section" id="sec-different">
                Different approach
              </h2>
              <p className="cmp-intro">
                Both laws deal with these points, but not in the same way. Neither is simply stricter
                here, so read both placements before drawing a conclusion.
              </p>
              <CardList
                items={result.different}
                mode="different"
                sourceName={sourceName}
                targetName={targetName}
              />
            </>
          )}

          {result.secondLook.length > 0 && (
            <>
              <h2 className="section gap-section" id="sec-second">
                Worth a second look
              </h2>
              <p className="cmp-intro">
                On the points compared here, {sourceName} already matches or goes further than{" "}
                {targetName}. But {targetName}&apos;s rule is rated firmer overall, usually because it
                spells out more detail than these points capture. Read {targetName}&apos;s rule before
                treating these as covered.
              </p>
              <CardList
                items={result.secondLook}
                mode="second"
                sourceName={sourceName}
                targetName={targetName}
              />
            </>
          )}

          <h2 className="section gap-section" id="sec-covered">
            Same in substance, or {sourceName} already asks for more
          </h2>
          {result.covered.length === 0 ? (
            <p className="empty">No requirements fall in this group.</p>
          ) : (
            <Collapsible count={result.covered.length}>
              <CardList
                items={result.covered}
                mode="covered"
                sourceName={sourceName}
                targetName={targetName}
              />
            </Collapsible>
          )}

          {result.neither.length > 0 && (
            <>
              <h2 className="section gap-section" id="sec-neither">
                Neither law deals with this
              </h2>
              <p className="page-lead" style={{ marginBottom: 16 }}>
                Both instruments are silent on these, so there is no gap <em>between</em> them —
                which is not the same as there being no obligation. Each card carries the search
                behind it: how many provisions were read, which words appear nowhere in the
                instrument, and which provisions came closest. Where a regime constrains the same
                ground from another direction — restricting export rather than mandating storage,
                say — the card says which requirement to read instead.
              </p>
              <Collapsible count={result.neither.length}>
                <CardList
                  items={result.neither}
                  mode="neither"
                  sourceName={sourceName}
                  targetName={targetName}
                />
              </Collapsible>
            </>
          )}

          <TermsTable
            sourceLawIds={result.comparisons[0]?.sourceLawIds ?? []}
            targetLawIds={result.comparisons[0]?.targetLawIds ?? []}
            sourceName={sourceName}
            targetName={targetName}
          />
        </>
      )}

      <Disclaimer />
    </>
  );
}
