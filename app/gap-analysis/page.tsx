"use client";

import { Fragment, useMemo, useState } from "react";
import { jurisdictions } from "@/lib/data";
import {
  analyzeGap,
  sameMeaningDifferentWords,
  type Point,
  type RequirementComparison,
} from "@/lib/gap";
import { CoverageBadge } from "@/app/components/CoverageBadge";
import { Disclaimer } from "@/app/components/Disclaimer";
import { GapTraceDetails } from "@/app/components/GapTrace";
import { LawCite } from "@/app/components/LawCite";
import { PointTable } from "@/app/components/PointTable";
import { TermsTable } from "@/app/components/TermsTable";
import { usePreloadEvidence } from "@/lib/evidence";
import { tracesFor, understatedBy } from "@/lib/gap-traces";
import type { Strictness } from "@/lib/types";

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

/** The requirement-level citation: opens the mapping's law text, or stays plain when unmapped. */
function RequirementCite({ c }: { c: RequirementComparison }) {
  if (!c.targetLawId) return <span className="citation">{c.targetCitation}</span>;
  return (
    <LawCite
      lawId={c.targetLawId}
      citation={c.targetCitationRaw}
      ev={"m:" + c.requirement.id}
      finding={c.targetObligation}
    />
  );
}

function pointsWith(c: RequirementComparison, relation: Point["relation"]): Point[] {
  return c.points.filter((p) => p.relation === relation);
}

function comparedCount(c: RequirementComparison): number {
  return c.points.filter((p) => p.relation !== "unknown").length;
}

function RequirementCell({ c }: { c: RequirementComparison }) {
  return (
    <td>
      <div className="req-name">{c.requirement.name}</div>
      <div className="req-cat">{c.requirement.category}</div>
    </td>
  );
}

function ScoreCell({
  label,
  level,
  lawIds,
  requirementId,
}: {
  label: string;
  level: Strictness;
  lawIds: string[];
  requirementId: string;
}) {
  return (
    <td data-label={label}>
      <CoverageBadge level={level} />
      <Understated lawIds={lawIds} requirementId={requirementId} />
    </td>
  );
}

/** The points, and the byScoreOnly note for a gap row. */
function WhatDiffers({
  c,
  sourceName,
  targetName,
}: {
  c: RequirementComparison;
  sourceName: string;
  targetName: string;
}) {
  const more = pointsWith(c, "more");
  const less = pointsWith(c, "less");
  return (
    <>
      {more.length > 0 && (
        <ul className="diff-list">
          {more.map((p) =>
            p.source && p.target ? (
              <li key={p.facetId}>
                <strong>{p.label}</strong>: {p.target.says}
                {p.target.citation && (
                  <>
                    {" "}
                    <LawCite
                      lawId={p.target.lawId}
                      citation={p.target.citation}
                      ev={"f:" + p.facetId}
                      finding={p.target.says}
                    />
                  </>
                )}
                <div className="diff-muted">
                  {sourceName}: {p.source.says}
                  {p.source.citation && (
                    <>
                      {" "}
                      <LawCite
                        lawId={p.source.lawId}
                        citation={p.source.citation}
                        ev={"f:" + p.facetId}
                        finding={p.source.says}
                      />
                    </>
                  )}
                </div>
              </li>
            ) : null,
          )}
        </ul>
      )}
      {c.verdict === "mixed" && less.length > 0 && (
        <p className="diff-muted">
          Where {sourceName} already asks for more: {less.map((p) => p.label).join("; ")}
        </p>
      )}
      {c.byScoreOnly && (
        <p className="diff-note">
          {c.targetObligation} <RequirementCite c={c} />
        </p>
      )}
    </>
  );
}

/** Full-width row under a requirement: every point, both laws side by side. */
function PointsRow({
  c,
  colSpan,
  sourceName,
  targetName,
}: {
  c: RequirementComparison;
  colSpan: number;
  sourceName: string;
  targetName: string;
}) {
  if (c.points.length === 0) return null;
  return (
    <tr className="cmp-detail-row">
      <td colSpan={colSpan}>
        <details className="cmp-disclosure">
          <summary>
            All {c.points.length} {c.points.length === 1 ? "point" : "points"} for this requirement
          </summary>
          <div className="cmp-detail-body">
            <PointTable points={c.points} sourceName={sourceName} targetName={targetName} />
          </div>
        </details>
      </td>
    </tr>
  );
}

export default function GapAnalysisPage() {
  const [sourceId, setSourceId] = useState("ca"); // "I comply with Canada"
  const [targetId, setTargetId] = useState("cn"); // "...gap to China?"

  const result = useMemo(() => analyzeGap(sourceId, targetId), [sourceId, targetId]);
  const sameJurisdiction = sourceId === targetId;
  // Load the law text for every law on both sides, so it is ready before the first hover.
  usePreloadEvidence([
    ...(result.comparisons[0]?.sourceLawIds ?? []),
    ...(result.comparisons[0]?.targetLawIds ?? []),
  ]);
  const sourceName = result.source.name;
  const targetName = result.target.name;

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
        use. Open a row to see both laws side by side.
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
              <div className="lbl">Requirements where {targetName} asks for more</div>
            </div>
            {result.different.length > 0 && (
              <div className="stat">
                <div className="num">{result.different.length}</div>
                <div className="lbl">Different approach: read both</div>
              </div>
            )}
            {result.secondLook.length > 0 && (
              <div className="stat">
                <div className="num">{result.secondLook.length}</div>
                <div className="lbl">Worth a second look</div>
              </div>
            )}
            <div className="stat covered">
              <div className="num">{result.covered.length}</div>
              <div className="lbl">
                Same in substance, or {sourceName} already asks for more
              </div>
            </div>
            {result.neither.length > 0 && (
              <div className="stat">
                <div className="num">{result.neither.length}</div>
                <div className="lbl">Neither law deals with this</div>
              </div>
            )}
          </div>

          <h2 className="section">
            Where {targetName} asks for more than {sourceName}
          </h2>
          {result.gaps.length === 0 ? (
            <p className="empty">
              No additional obligations detected. Complying with {sourceName} broadly meets or
              exceeds {targetName} across the tracked requirements.
            </p>
          ) : (
            <div className="table-wrap">
              <table className="cmp-stack cmp-stack-pair">
                <thead>
                  <tr>
                    <th style={{ width: "20%" }}>Requirement</th>
                    <th style={{ width: "13%" }}>{sourceName}</th>
                    <th style={{ width: "13%" }}>{targetName}</th>
                    <th>What differs</th>
                  </tr>
                </thead>
                <tbody>
                  {result.gaps.map((c) => (
                    <Fragment key={c.requirement.id}>
                      <tr>
                        <RequirementCell c={c} />
                        <ScoreCell
                          label={sourceName} level={c.sourceStrictness}
                          lawIds={c.sourceLawIds}
                          requirementId={c.requirement.id}
                        />
                        <ScoreCell
                          label={targetName} level={c.targetStrictness}
                          lawIds={c.targetLawIds}
                          requirementId={c.requirement.id}
                        />
                        <td>
                          <WhatDiffers c={c} sourceName={sourceName} targetName={targetName} />
                          {/* A gap is the difference between two scores, and where
                              the baseline score rests on no quoted text it is the
                              unevidenced half driving the conclusion. Show it. */}
                          {!c.sourceQuoted &&
                            tracesFor(c.sourceLawIds, c.requirement.id).map((t) => (
                              <GapTraceDetails key={t.lawId} trace={t} showLaw />
                            ))}
                        </td>
                      </tr>
                      <PointsRow
                        c={c}
                        colSpan={4}
                        sourceName={sourceName}
                        targetName={targetName}
                      />
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.different.length > 0 && (
            <>
              <h2 className="section">Different approach</h2>
              <p className="cmp-intro">
                Both laws deal with these points, but not in the same way. Neither is simply stricter
                here, so read both placements before drawing a conclusion.
              </p>
              <div className="table-wrap">
                <table className="cmp-stack cmp-stack-pair">
                  <thead>
                    <tr>
                      <th style={{ width: "20%" }}>Requirement</th>
                      <th style={{ width: "13%" }}>{sourceName}</th>
                      <th style={{ width: "13%" }}>{targetName}</th>
                      <th>What differs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.different.map((c) => (
                      <Fragment key={c.requirement.id}>
                        <tr>
                          <RequirementCell c={c} />
                          <ScoreCell
                            label={sourceName} level={c.sourceStrictness}
                            lawIds={c.sourceLawIds}
                            requirementId={c.requirement.id}
                          />
                          <ScoreCell
                            label={targetName} level={c.targetStrictness}
                            lawIds={c.targetLawIds}
                            requirementId={c.requirement.id}
                          />
                          <td>
                            <ul className="diff-list">
                              {pointsWith(c, "different").map((p) =>
                                p.source && p.target ? (
                                  <li key={p.facetId}>
                                    <strong>{p.label}</strong>
                                    <div className="diff-muted">
                                      {sourceName}: {p.source.says}
                                    </div>
                                    <div className="diff-muted">
                                      {targetName}: {p.target.says}
                                    </div>
                                  </li>
                                ) : null,
                              )}
                            </ul>
                            {c.scoreDisagrees && (
                              <div className="diff-muted">
                                {targetName}&apos;s rule is also rated firmer overall:{" "}
                                {c.targetObligation}{" "}
                                <RequirementCite c={c} />
                              </div>
                            )}
                          </td>
                        </tr>
                        <PointsRow
                          c={c}
                          colSpan={4}
                          sourceName={sourceName}
                          targetName={targetName}
                        />
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {result.secondLook.length > 0 && (
            <>
              <h2 className="section">Worth a second look</h2>
              <p className="cmp-intro">
                On the points compared here, {sourceName} already matches or goes further than{" "}
                {targetName}. But {targetName}&apos;s rule is rated firmer overall, usually because it
                spells out more detail than these points capture. Read {targetName}&apos;s rule before
                treating these as covered.
              </p>
              <div className="table-wrap">
                <table className="cmp-stack cmp-stack-pair">
                  <thead>
                    <tr>
                      <th style={{ width: "20%" }}>Requirement</th>
                      <th style={{ width: "13%" }}>{sourceName}</th>
                      <th style={{ width: "13%" }}>{targetName}</th>
                      <th>Why</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.secondLook.map((c) => (
                      <Fragment key={c.requirement.id}>
                        <tr>
                          <RequirementCell c={c} />
                          <ScoreCell
                            label={sourceName} level={c.sourceStrictness}
                            lawIds={c.sourceLawIds}
                            requirementId={c.requirement.id}
                          />
                          <ScoreCell
                            label={targetName} level={c.targetStrictness}
                            lawIds={c.targetLawIds}
                            requirementId={c.requirement.id}
                          />
                          <td>
                            <div>
                              {c.verdict === "same" ? (
                                `Same on all ${comparedCount(c)} ${comparedCount(c) === 1 ? "point" : "points"} compared.`
                              ) : (
                                <>
                                  {sourceName} already asks for more on:{" "}
                                  {pointsWith(c, "less").map((p) => p.label).join("; ")}
                                </>
                              )}
                            </div>
                            <div className="diff-note">
                              {targetName}&apos;s rule: {c.targetObligation}{" "}
                              <RequirementCite c={c} />
                            </div>
                          </td>
                        </tr>
                        <PointsRow
                          c={c}
                          colSpan={4}
                          sourceName={sourceName}
                          targetName={targetName}
                        />
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {result.covered.length > 0 && (
            <>
              <h2 className="section">
                Same in substance, or {sourceName} already asks for more
              </h2>
              <div className="table-wrap">
                <table className="cmp-stack cmp-stack-pair">
                  <thead>
                    <tr>
                      <th style={{ width: "20%" }}>Requirement</th>
                      <th style={{ width: "13%" }}>{sourceName}</th>
                      <th style={{ width: "13%" }}>{targetName}</th>
                      <th>In substance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.covered.map((c) => (
                      <Fragment key={c.requirement.id}>
                        <tr>
                          <RequirementCell c={c} />
                          <ScoreCell
                            label={sourceName} level={c.sourceStrictness}
                            lawIds={c.sourceLawIds}
                            requirementId={c.requirement.id}
                          />
                          <ScoreCell
                            label={targetName} level={c.targetStrictness}
                            lawIds={c.targetLawIds}
                            requirementId={c.requirement.id}
                          />
                          <td>
                            {c.byScoreOnly ? (
                              <p className="diff-note">
                                {c.targetObligation}{" "}
                                <RequirementCite c={c} />
                              </p>
                            ) : c.verdict === "same" ? (
                              <>
                                <div>Same on all {comparedCount(c)} points compared.</div>
                                {c.points
                                  .filter((p) => sameMeaningDifferentWords(p))
                                  .map((p) => (
                                    <div key={p.facetId} className="diff-muted">
                                      Same rule, different name: “{p.source?.ownTerm}” (
                                      {p.source?.lawShortName}) / “{p.target?.ownTerm}” (
                                      {p.target?.lawShortName})
                                    </div>
                                  ))}
                              </>
                            ) : (
                              <div>
                                {sourceName} already asks for more on:{" "}
                                {pointsWith(c, "less")
                                  .map((p) => p.label)
                                  .join("; ")}
                              </div>
                            )}
                          </td>
                        </tr>
                        <PointsRow
                          c={c}
                          colSpan={4}
                          sourceName={sourceName}
                          targetName={targetName}
                        />
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {result.neither.length > 0 && (
            <>
              <h2 className="section">Neither law deals with this</h2>
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
                      <th style={{ width: "15%" }}>{sourceName}</th>
                      <th style={{ width: "15%" }}>{targetName}</th>
                      <th>What was searched</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.neither.map((c) => (
                      <tr key={c.requirement.id}>
                        <RequirementCell c={c} />
                        <ScoreCell
                          label={sourceName} level={c.sourceStrictness}
                          lawIds={c.sourceLawIds}
                          requirementId={c.requirement.id}
                        />
                        <ScoreCell
                          label={targetName} level={c.targetStrictness}
                          lawIds={c.targetLawIds}
                          requirementId={c.requirement.id}
                        />
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
