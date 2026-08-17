"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { laws, jurisdictionsById, requirementsById } from "@/lib/data";
// Shared with scripts/analyze-policy.mjs so both run the exact same rules.
import { analyzePolicy, LANES, LANE_ORDER, VERDICT_ORDER, VERDICT_GUIDE } from "@/lib/policy-rules.mjs";

/**
 * Public text-extraction service used for the URL option. A browser cannot
 * fetch an arbitrary third-party page directly — the same-origin policy blocks
 * it unless that site opts in with CORS headers, which privacy policies never
 * do. Routing through a reader service is the only way to offer URL input from
 * a site with no backend, and it means the URL leaves the user's machine. That
 * trade is stated in the UI rather than hidden.
 */
const READER = "https://r.jina.ai/";

type Remediation = {
  practice: string[];
  clause: string | null;
  clauseNote?: string;
  warning?: string;
  lawNote: string | null;
};

type Finding = {
  id: string;
  citation: string;
  obligation: string;
  quote: string | null;
  verdict: string;
  lane: string;
  scopeReason: string;
  evidence: string[];
  severity: { label: string; note: string } | null;
  remediation: Remediation | null;
};

const GUIDE = VERDICT_GUIDE as Record<string, { meaning: string; action: string }>;
const LANE_INFO = LANES as Record<string, { id: string; title: string; blurb: string }>;

const VERDICT_CLASS: Record<string, string> = {
  "NOT EVIDENCED": "v-gap",
  PARTIAL: "v-partial",
  EVIDENCED: "v-ok",
  "NOT ASSESSABLE": "v-na",
  "NO OBLIGATION": "v-none",
};

/**
 * Separate from VERDICT_CLASS on purpose. Those classes carry a text colour for
 * the pills; applying one to a whole card would tint every word inside it.
 * These set the left border only.
 */
const REC_CLASS: Record<string, string> = {
  "NOT EVIDENCED": "rec-gap",
  PARTIAL: "rec-partial",
  EVIDENCED: "rec-ok",
  "NOT ASSESSABLE": "rec-na",
  "NO OBLIGATION": "rec-na",
};

const LANE_CLASS: Record<string, string> = {
  ACT: "lane-act",
  REVIEW: "lane-review",
  ELSEWHERE: "lane-elsewhere",
  NONE: "lane-none",
};

/**
 * The two steps are the same shape everywhere — practice first, paper second —
 * but the instruction differs by lane. Telling someone to "change the practice"
 * for an obligation their policy already addresses would be wrong; so would
 * offering publishable wording for a duty discharged in a contract.
 */
const STEP_LABELS: Record<string, { practice: string; clause: string; summary: string }> = {
  ACT: {
    practice: "Change the practice",
    clause: "Then publish wording along these lines",
    summary: "What to do, and draft wording",
  },
  REVIEW: {
    practice: "Confirm the practice behind the wording",
    clause: "Compare your wording against this",
    summary: "What to check, and model wording",
  },
  ELSEWHERE: {
    practice: "Build or check this artefact",
    clause: "Policy wording",
    summary: "What to build or check",
  },
};

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="copy-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

/** The whole plan as markdown, so a reviewer can paste it into a document. */
function buildPlan(findings: Finding[], shortName: string): string {
  const out: string[] = [`# Action plan — privacy policy vs ${shortName}`, ""];
  for (const lane of LANE_ORDER as string[]) {
    const rows = findings.filter((f) => f.lane === lane);
    if (!rows.length) continue;
    out.push(`## ${LANE_INFO[lane].title} (${rows.length})`, "", `_${LANE_INFO[lane].blurb}_`, "");
    if (lane === "NONE") {
      for (const f of rows) out.push(`- **${name(f)}** — ${f.scopeReason}`);
      out.push("");
      continue;
    }
    for (const f of rows) {
      out.push(`### ${name(f)} — ${f.citation}${f.severity ? ` (${f.severity.label})` : ""}`);
      out.push(`**Law requires:** ${f.obligation}`);
      if (f.quote) out.push(`> ${f.quote}`);
      if (lane === "ELSEWHERE") out.push(`_${f.scopeReason}_`);
      else if (f.evidence.length) {
        out.push("", "**Your policy says:**");
        for (const e of f.evidence) out.push(`- “${e}”`);
      } else out.push("", "**Your policy says:** _no matching clause found_");
      const r = f.remediation;
      if (r) {
        if (r.lawNote) out.push("", `**Under ${shortName}:** ${r.lawNote}`);
        const labels = STEP_LABELS[lane];
        if (r.practice?.length) {
          out.push("", `**1 · ${labels.practice}**`);
          r.practice.forEach((p, i) => out.push(`${i + 1}. ${p}`));
        }
        if (r.clause) {
          out.push("", `**2 · ${labels.clause}**`, "```markdown", r.clause, "```");
        } else if (r.clauseNote) {
          out.push("", `**2 · Policy wording:** ${r.clauseNote}`);
        }
        if (r.warning) out.push("", `> ⚠️ ${r.warning}`);
      }
      out.push("");
    }
  }
  return out.join("\n");
}

function name(f: Finding): string {
  return requirementsById[f.id]?.name ?? f.id;
}

function Recommendation({
  f,
  index,
  shortName,
  openByDefault,
}: {
  f: Finding;
  index: number;
  shortName: string;
  openByDefault: boolean;
}) {
  const r = f.remediation;
  const labels = STEP_LABELS[f.lane] ?? STEP_LABELS.ACT;

  const steps = r && (
    <>
      {r.lawNote && (
        <p className="rec-lawnote">
          <strong>Under {shortName}:</strong> {r.lawNote}
        </p>
      )}
      {r.practice?.length > 0 && (
        <div className="step">
          <div className="step-head">
            <span className="step-n">1</span> {labels.practice}
          </div>
          <ol className="step-list">
            {r.practice.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </div>
      )}
      <div className="step">
        <div className="step-head">
          <span className="step-n">2</span> {labels.clause}
        </div>
        {r.clause ? (
          <>
            <div className="draft-bar">
              <span>
                Draft wording — every <code>[BRACKET]</code> is a fact you must supply
              </span>
              <CopyButton text={r.clause} label="Copy wording" />
            </div>
            <pre className="draft">{r.clause}</pre>
          </>
        ) : (
          <p className="finding-note">{r.clauseNote}</p>
        )}
      </div>
      {r.warning && (
        <p className="rec-warn">
          <strong>Careful:</strong> {r.warning}
        </p>
      )}
    </>
  );

  return (
    <article className={`rec ${REC_CLASS[f.verdict]}`}>
      <div className="rec-head">
        <span className="rec-num">{index}</span>
        <div className="rec-title">
          <h4>{name(f)}</h4>
          <div className="rec-meta">
            {f.severity && <span className={`sev sev-${f.severity.label.toLowerCase()}`}>{f.severity.label}</span>}
            <span className="citation">{f.citation}</span>
          </div>
        </div>
      </div>

      <p className="finding-law">{f.obligation}</p>
      {f.quote && <blockquote className="statute-quote">“{f.quote}”</blockquote>}

      {f.lane === "ELSEWHERE" ? (
        <p className="finding-note">{f.scopeReason}</p>
      ) : f.evidence.length ? (
        <>
          <div className="finding-label">Your policy says</div>
          {f.evidence.map((e, i) => (
            <blockquote key={i} className="policy-quote">
              “{e}”
            </blockquote>
          ))}
          {f.verdict === "PARTIAL" && <p className="finding-note">{f.scopeReason}</p>}
        </>
      ) : (
        <p className="finding-note">
          No matching clause found. That is not a finding of non-compliance — the practice may exist and
          simply not be described here.
        </p>
      )}

      {r &&
        (openByDefault ? (
          steps
        ) : (
          <details className="rec-more">
            <summary>{labels.summary}</summary>
            {steps}
          </details>
        ))}
    </article>
  );
}

export default function PolicyChecker() {
  const [text, setText] = useState("");
  const [lawId, setLawId] = useState("gdpr");
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ran, setRan] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const law = laws.find((l) => l.id === lawId)!;

  const findings: Finding[] = useMemo(() => {
    if (!ran || !text.trim()) return [];
    const obligations = Object.entries(law.mappings).map(([id, m]) => ({
      id,
      strictness: m.strictness,
      obligation: m.obligation,
      citation: m.citation,
      quote: m.quote ?? null,
    }));
    return analyzePolicy(obligations, text, law.id) as Finding[];
  }, [ran, text, law]);

  const inLane = (l: string) => findings.filter((f) => f.lane === l);

  async function loadFile(f: File) {
    setError(null);
    setText(await f.text());
    setRan(false);
  }

  async function fetchUrl() {
    if (!url.trim()) return;
    setFetching(true);
    setError(null);
    try {
      const res = await fetch(READER + url.trim().replace(/^https?:\/\//, "https://"));
      if (!res.ok) throw new Error(`reader returned HTTP ${res.status}`);
      const body = await res.text();
      if (body.trim().length < 200) throw new Error("the page returned almost no text");
      setText(body);
      setRan(false);
    } catch (e: any) {
      setError(
        `Could not retrieve that URL (${e?.message ?? e}). Many sites block automated readers. ` +
          `Open the policy, select all, and paste it below — that always works and keeps the text on your machine.`,
      );
    } finally {
      setFetching(false);
    }
  }

  return (
    <>
      <span className="stage-tag">GAP ANALYSIS · POLICY vs LAW</span>
      <h1 className="page-title">Check a privacy policy against a law</h1>
      <p className="page-lead">
        Paste a privacy policy and compare it, obligation by obligation, against the statute text
        held in this repository. Every finding quotes <strong>both sides</strong> — the law&apos;s
        own words and the policy&apos;s own sentence — and then says what to do about it: first what
        to change in practice, then draft wording for the policy.
      </p>

      <div className="disclaimer" style={{ marginTop: 0, marginBottom: 28 }}>
        <strong>This is not a compliance score, and the draft wording is not legal advice.</strong> A
        missing clause is reported as <em>not evidenced</em>, never as non-compliance — the practice
        may exist and simply not be described. Every draft clause below is a starting point with
        blanks you must fill in, and none of it has been reviewed by a lawyer.
      </div>

      {/* ---- input ---- */}
      <div className="checker-inputs">
        <div className="control">
          <label htmlFor="law">Compare against</label>
          <select
            id="law"
            value={lawId}
            onChange={(e) => {
              setLawId(e.target.value);
              setRan(false);
            }}
          >
            {laws.map((l) => (
              <option key={l.id} value={l.id}>
                {jurisdictionsById[l.jurisdictionId].flag} {l.shortName}
              </option>
            ))}
          </select>
        </div>

        <div className="control" style={{ flex: 1, minWidth: 280 }}>
          <label htmlFor="url">Fetch from a URL (optional)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="url"
              type="url"
              placeholder="https://example.com/privacy"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="text-input"
            />
            <button className="bar-btn" onClick={fetchUrl} disabled={fetching || !url.trim()}>
              {fetching ? "Fetching…" : "Fetch"}
            </button>
          </div>
        </div>

        <div className="control">
          <label htmlFor="file">Or upload a file</label>
          <input
            id="file"
            ref={fileRef}
            type="file"
            accept=".txt,.md,.html"
            onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
            className="text-input"
          />
        </div>
      </div>

      <p className="url-note">
        The analysis runs entirely in your browser — pasted or uploaded text never leaves your
        machine. <strong>The URL option is the exception:</strong> browsers cannot fetch other
        sites directly, so that request is routed through the public reader service{" "}
        <code>r.jina.ai</code>, which will see the address you enter. Paste the text instead if
        that matters to you.
      </p>

      {error && <div className="checker-error">{error}</div>}

      <textarea
        className="policy-input"
        placeholder="Paste the full privacy policy text here…"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setRan(false);
        }}
      />

      <div className="checker-actions">
        <button
          className="bar-btn primary"
          onClick={() => setRan(true)}
          disabled={text.trim().length < 200}
        >
          Analyse against {law.shortName}
        </button>
        {text && (
          <button
            className="bar-btn"
            onClick={() => {
              setText("");
              setRan(false);
              if (fileRef.current) fileRef.current.value = "";
            }}
          >
            Clear
          </button>
        )}
        <span className="char-count">
          {text.trim().length < 200
            ? `${text.trim().length} characters — paste at least 200 to analyse`
            : `${text.trim().length.toLocaleString()} characters loaded`}
        </span>
      </div>

      {/* ---- results ---- */}
      {ran && findings.length > 0 && (
        <>
          <h2 className="section">Your action plan — {law.shortName}</h2>

          <div className="plan-summary">
            {(LANE_ORDER as string[]).map((l) => (
              <div key={l} className={`plan-stat ${LANE_CLASS[l]}`}>
                <span className="plan-num">{inLane(l).length}</span>
                <span className="plan-lbl">{LANE_INFO[l].title}</span>
              </div>
            ))}
          </div>

          <div className="plan-actions">
            <CopyButton text={buildPlan(findings, law.shortName)} label="Copy the whole plan as markdown" />
            <span className="char-count">
              Paste it into a document to work through with whoever owns the practice.
            </span>
          </div>

          <div className="legend-warn" style={{ margin: "18px 0 4px" }}>
            <strong>Read this before you copy any wording.</strong> The order below is deliberate:
            change the practice first, publish the wording second. A clause describing something the
            organization does not actually do turns a documentation gap into a false statement to
            regulators and users — a worse problem than the one it papers over. That is why every
            draft has blanks in it.
          </div>

          {(LANE_ORDER as string[]).map((lane) => {
            const rows = inLane(lane);
            if (!rows.length) return null;
            const info = LANE_INFO[lane];

            if (lane === "NONE") {
              return (
                <section key={lane} className={`lane ${LANE_CLASS[lane]}`}>
                  <h3 className="lane-title">
                    {info.title} <span className="lane-count">{rows.length}</span>
                  </h3>
                  <p className="lane-blurb">{info.blurb}</p>
                  <ul className="lane-none-list">
                    {rows.map((f) => (
                      <li key={f.id}>
                        <strong>{name(f)}</strong> — {f.scopeReason}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            }

            return (
              <section key={lane} className={`lane ${LANE_CLASS[lane]}`}>
                <h3 className="lane-title">
                  {info.title} <span className="lane-count">{rows.length}</span>
                </h3>
                <p className="lane-blurb">{info.blurb}</p>
                {rows.map((f, i) => (
                  <Recommendation
                    key={f.id}
                    f={f}
                    index={i + 1}
                    shortName={law.shortName}
                    openByDefault={lane === "ACT"}
                  />
                ))}
              </section>
            );
          })}

          <details className="legend">
            <summary>How each finding was classified</summary>
            <table className="legend-table">
              <thead>
                <tr>
                  <th style={{ width: "16%" }}>Verdict</th>
                  <th style={{ width: "34%" }}>Meaning</th>
                  <th>Your next step as reviewer</th>
                </tr>
              </thead>
              <tbody>
                {(VERDICT_ORDER as string[]).map((v) => (
                  <tr key={v}>
                    <td>
                      <span className={`verdict-pill ${VERDICT_CLASS[v]}`}>{v.toLowerCase()}</span>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{GUIDE[v].meaning}</td>
                    <td style={{ color: "var(--text-muted)" }}>{GUIDE[v].action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>

          <div className="disclaimer">
            <strong>What this cannot tell you.</strong> Evidence located is not adequacy assessed. A
            clause may exist and still fall short; a gap may be closed by a document this tool never
            sees. Read the statute — see <Link href="/verify">how to verify</Link>.
          </div>
        </>
      )}
    </>
  );
}
