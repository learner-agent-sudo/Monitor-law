"use client";

import { useMemo, useState } from "react";
import { jurisdictions } from "@/lib/data";
import { analyzeGap } from "@/lib/gap";
import { CoverageBadge } from "@/app/components/CoverageBadge";
import { Disclaimer } from "@/app/components/Disclaimer";

export default function GapAnalysisPage() {
  const [sourceId, setSourceId] = useState("ca"); // "I comply with Canada"
  const [targetId, setTargetId] = useState("cn"); // "...gap to China?"

  const result = useMemo(() => analyzeGap(sourceId, targetId), [sourceId, targetId]);
  const sameJurisdiction = sourceId === targetId;

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
              <div className="num">{result.covered.length}</div>
              <div className="lbl">Requirements already met or exceeded</div>
            </div>
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
                      </td>
                      <td>
                        <CoverageBadge level={c.targetStrictness} />
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>{c.targetObligation}</td>
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
                {result.covered.map((c) => (
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
        </>
      )}

      <Disclaimer />
    </>
  );
}
