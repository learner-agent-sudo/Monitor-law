"use client";

import { useMemo, useState } from "react";
import { jurisdictions } from "@/lib/data";
import { analyzeGap } from "@/lib/gap";
import { CoverageBadge } from "@/app/components/CoverageBadge";
import { Disclaimer } from "@/app/components/Disclaimer";
import { GapTraceDetails } from "@/app/components/GapTrace";
import { tracesFor, understatedBy } from "@/lib/gap-traces";

/**
 * Marks a score that is correct but reads as less than it is.
 *
 * A jurisdiction can impose nothing under one requirement while constraining
 * the same ground firmly under its neighbour — the GDPR requires no storage
 * location yet lets data leave the EEA only on Chapter V's conditions. Left
 * unmarked, that 0 sits beside California's genuine nil and says the opposite
 * of the truth.
 */
function Understated({ lawIds, requirementId }: { lawIds: string[]; requirementId: string }) {
  const handled = understatedBy(lawIds, requirementId);
  if (!handled.length) return null;
  return (
    <span className="understated">
      constrained under {handled.map((h) => h.name).join(" and ")}
    </span>
  );
}

export default function GapAnalysisPage() {
  const [sourceId, setSourceId] = useState("ca"); // "I comply with Canada"
  const [targetId, setTargetId] = useState("cn"); // "...gap to China?"

  const result = useMemo(() => analyzeGap(sourceId, targetId), [sourceId, targetId]);
  const sameJurisdiction = sourceId === targetId;

  // Requirements where BOTH regimes are silent. Counting these as "already
  // covered" would turn two absences into a reassurance, which is the exact
  // error a gap-analysis tool must not make: nothing here says a duty does not
  // exist elsewhere — in a sectoral statute, in guidance, or in contract.
  const nilBoth = useMemo(() => result.covered.filter((c) => c.neitherAddresses), [result]);
  const trulyCovered = useMemo(
    () => result.covered.filter((c) => !c.neitherAddresses),
    [result],
  );

  return (
    <>
      <span className="stage-tag">STAGE 3 · GAP ANALYSIS</span>
      <h1 className="page-title">Cross-jurisdiction gap analysis</h1>
      <p className="page-lead">
        Pick the regime you already comply with, then the regime you want to comply with. The tool
        surfaces every obligation where the target demands <em>more or different</em> than your
        current baseline — a prioritized list of gaps to close.
      </p>

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
        <div className="arrow">→</div>
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
          <div className="stat-row">
            <div className="stat gap">
              <div className="num">{result.gaps.length}</div>
              <div className="lbl">
                Gaps to close moving to {result.target.name}
              </div>
            </div>
            <div className="stat covered">
              <div className="num">{result.covered.length - nilBoth.length}</div>
              <div className="lbl">Requirements already met or exceeded</div>
            </div>
            {nilBoth.length > 0 && (
              <div className="stat">
                <div className="num">{nilBoth.length}</div>
                <div className="lbl">
                  Neither regime addresses — silence on both sides, not coverage
                </div>
              </div>
            )}
          </div>

          <h2 className="section">
            Gaps — where {result.target.name} demands more than {result.source.name}
          </h2>
          {result.gaps.length === 0 ? (
            <p className="empty">
              No additional obligations detected. Complying with {result.source.name} broadly meets
              or exceeds {result.target.name} across the tracked requirements.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "20%" }}>Requirement</th>
                    <th style={{ width: "13%" }}>Your baseline</th>
                    <th style={{ width: "13%" }}>Target</th>
                    <th>What the target additionally requires</th>
                    <th style={{ width: "16%" }}>Citation</th>
                  </tr>
                </thead>
                <tbody>
                  {result.gaps.map((c) => (
                    <tr key={c.requirement.id}>
                      <td>
                        <div className="req-name">{c.requirement.name}</div>
                        <div className="req-cat">{c.requirement.category}</div>
                      </td>
                      <td>
                        <CoverageBadge level={c.sourceStrictness} />
                        <Understated lawIds={c.sourceLawIds} requirementId={c.requirement.id} />
                      </td>
                      <td>
                        <CoverageBadge level={c.targetStrictness} />
                        <Understated lawIds={c.targetLawIds} requirementId={c.requirement.id} />
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>
                        {c.targetObligation}
                        {/* A gap is the difference between two scores, and where
                            the baseline score rests on no quoted text it is the
                            unevidenced half driving the conclusion. Show it. */}
                        {!c.sourceQuoted &&
                          tracesFor(c.sourceLawIds, c.requirement.id).map((t) => (
                            <GapTraceDetails key={t.lawId} trace={t} showLaw />
                          ))}
                      </td>
                      <td className="citation">{c.targetCitation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="section">Already covered</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "24%" }}>Requirement</th>
                  <th style={{ width: "15%" }}>Your baseline</th>
                  <th style={{ width: "15%" }}>Target</th>
                  <th>Target obligation</th>
                </tr>
              </thead>
              <tbody>
                {trulyCovered.map((c) => (
                  <tr key={c.requirement.id}>
                    <td>
                      <div className="req-name">{c.requirement.name}</div>
                    </td>
                    <td>
                      <CoverageBadge level={c.sourceStrictness} />
                    </td>
                    <td>
                      <CoverageBadge level={c.targetStrictness} />
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{c.targetObligation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {nilBoth.length > 0 && (
            <>
              <h2 className="section">Neither regime addresses</h2>
              <p className="page-lead" style={{ marginBottom: 16 }}>
                Both instruments are silent on these, so there is no gap <em>between</em> them —
                which is not the same as there being no obligation. Each row carries the search
                behind it: how many provisions were read, which words appear nowhere in the
                instrument, and which provisions came closest. Where a regime constrains the same
                ground from another direction — restricting export rather than mandating storage,
                say — the row says which requirement to read instead.
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "24%" }}>Requirement</th>
                      <th style={{ width: "15%" }}>{result.source.name}</th>
                      <th style={{ width: "15%" }}>{result.target.name}</th>
                      <th>What was searched</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nilBoth.map((c) => (
                      <tr key={c.requirement.id}>
                        <td>
                          <div className="req-name">{c.requirement.name}</div>
                          <div className="req-cat">{c.requirement.category}</div>
                        </td>
                        <td>
                          <CoverageBadge level={c.sourceStrictness} />
                          <Understated lawIds={c.sourceLawIds} requirementId={c.requirement.id} />
                        </td>
                        <td>
                          <CoverageBadge level={c.targetStrictness} />
                          <Understated lawIds={c.targetLawIds} requirementId={c.requirement.id} />
                        </td>
                        <td style={{ color: "var(--text-muted)" }}>
                          {[
                            ...tracesFor(c.sourceLawIds, c.requirement.id),
                            ...tracesFor(c.targetLawIds, c.requirement.id),
                          ].map((t) => (
                            <GapTraceDetails key={t.lawId} trace={t} showLaw />
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      <Disclaimer />
    </>
  );
}
