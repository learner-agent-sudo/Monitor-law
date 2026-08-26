"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { laws, jurisdictionsById, requirementsById } from "@/lib/data";
// Shared with scripts/analyze-policy.mjs so both run the exact same rules.
import {
  analyzePolicy,
  gapStatement,
  LANES,
  LANE_ORDER,
  VERDICT_ORDER,
  VERDICT_GUIDE,
} from "@/lib/policy-rules.mjs";
import { BASIS } from "@/lib/policy-remediation.mjs";
import {
  buildInterpretationPrompt,
  interpretableFindings,
  parseInterpretation,
  requestInterpretation,
  verifyAgainstPolicy,
  INTERPRET_STATES,
  PROVIDERS,
  DEFAULT_PROVIDER,
} from "@/lib/policy-interpret.mjs";
import KeyVault, { type VaultState } from "./KeyVault";

/**
 * Public text-extraction service used for the URL option. A browser cannot
 * fetch an arbitrary third-party page directly — the same-origin policy blocks
 * it unless that site opts in with CORS headers, which privacy policies never
 * do. Routing through a reader service is the only way to offer URL input from
 * a site with no backend, and it means the URL leaves the user's machine. That
 * trade is stated in the UI rather than hidden.
 */
const READER = "https://r.jina.ai/";

type Basis = "law" | "guidance" | "practice";
type Step = { text: string; basis: Basis; cite?: string | null };
type Clause = { text: string; basis: Basis; cite?: string | null };

type Remediation = {
  steps: Step[];
  clause: Clause | null;
  clauseNote?: string;
  warning?: string;
  lawNote: string | null;
  requiredCount: number;
  totalCount: number;
};

type Evidence = { text: string; section: string | null };
type Element = { id: string; label: string; basis: Basis; found: boolean; section: string | null };

type Searched = { label: string; found: boolean };

type Interpretation = {
  id: string;
  verdict: "addressed" | "partially" | "absent" | "unverified";
  quotes: string[];
  rejectedQuotes: string[];
  reason: string;
  missing: string | null;
};

const STATES = INTERPRET_STATES as Record<
  string,
  { id: string; label: string; blurb: string }
>;

type Finding = {
  id: string;
  citation: string;
  searched: Searched[];
  obligation: string;
  quote: string | null;
  verdict: string;
  lane: string;
  scopeReason: string;
  evidence: Evidence[];
  editTarget: string | null;
  elements: Element[];
  missingElements: Element[];
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
  CONSIDER: "lane-consider",
  ELSEWHERE: "lane-elsewhere",
  NONE: "lane-none",
};

const BASIS_INFO = BASIS as Record<Basis, { id: string; label: string; blurb: string }>;

/**
 * The tag that lets a reader agree or disagree. Without it every bullet reads
 * with the same authority, and "we suggest a table" is indistinguishable from
 * "the statute requires this" — which is how advice ends up overclaiming.
 */
function BasisTag({ item }: { item: { basis: Basis; cite?: string | null } }) {
  const b = BASIS_INFO[item.basis] ?? BASIS_INFO.practice;
  return (
    <span className={`basis basis-${b.id}`} title={b.blurb}>
      {b.label}
      {item.cite ? <span className="basis-cite"> · {item.cite}</span> : null}
    </span>
  );
}

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
  CONSIDER: {
    practice: "What you could do",
    clause: "Optional wording",
    summary: "What you could do, and optional wording",
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

      out.push("", "**① Your policy**");
      if (f.evidence.length) {
        for (const e of f.evidence) out.push(`- ${e.section ? `**${e.section}:** ` : ""}“${e.text}”`);
      } else {
        out.push("- _No clause matching this obligation was located._");
      }

      out.push("", `**② ${shortName} — ${f.citation}**`, f.obligation);
      if (f.quote) out.push(`> ${f.quote}`);

      out.push("", "**③ The gap**", gapStatement(f, shortName));
      for (const e of f.elements ?? []) {
        out.push(
          `- ${e.found ? "✓" : "✗"} ${e.label}` +
            (e.found && e.section ? ` — located in ${e.section}` : e.found ? "" : " — _not located_"),
        );
      }
      if (lane === "ELSEWHERE") out.push("", `_${f.scopeReason}_`);

      out.push(
        "",
        `**④ How to close it**` +
          (f.editTarget ? ` — amend ${f.editTarget}` : f.evidence.length ? "" : " — insert new wording"),
      );
      const r = f.remediation;
      if (r) {
        if (r.lawNote) out.push("", `**Under ${shortName}:** ${r.lawNote}`);
        if (r.requiredCount === 0 && r.totalCount > 0) {
          out.push(
            "",
            `> **Nothing below is required by ${shortName}.** Every step is our recommendation for ` +
              `how to discharge the duty, not a rule the statute imposes.`,
          );
        }
        const labels = STEP_LABELS[lane];
        if (r.steps?.length) {
          out.push("", `**1 · ${labels.practice}**`);
          r.steps.forEach((s, i) => out.push(`${i + 1}. ${s.text} ${tagText(s)}`));
        }
        if (r.clause) {
          const where = f.editTarget ? `Amend ${f.editTarget} — suggested wording` : labels.clause;
          out.push("", `**2 · ${where}** ${tagText(r.clause)}`);
          if (r.clauseNote) out.push("", r.clauseNote);
          out.push("```markdown", r.clause.text, "```");
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

/** Basis tag in the markdown export — same claim, plain text. */
function tagText(item: { basis: Basis; cite?: string | null }): string {
  const b = BASIS_INFO[item.basis] ?? BASIS_INFO.practice;
  return item.cite ? `_[${b.label.toLowerCase()} — ${item.cite}]_` : `_[${b.label.toLowerCase()}]_`;
}

/**
 * The model's answer, held to the same evidence standard as everything else:
 * every quote below survived an exact-substring check against the policy. The
 * block is visually distinct from the deterministic findings on purpose — a
 * reader must never have to wonder which pass produced a claim.
 */
function InterpretationBlock({ r }: { r: Interpretation }) {
  const state = STATES[r.verdict] ?? STATES.absent;
  return (
    <div className={`interp interp-${state.id}`}>
      <div className="interp-head">
        <span className="interp-tag">Second opinion · read by a model</span>
        <span className={`interp-verdict iv-${state.id}`}>{state.label}</span>
      </div>
      <p className="interp-blurb">{state.blurb}</p>
      {r.reason && <p className="interp-reason">{r.reason}</p>}
      {r.quotes.map((q, i) => (
        <blockquote key={i} className="policy-quote">
          <span className="quote-src">verified present in your policy</span>“{q}”
        </blockquote>
      ))}
      {r.missing && (
        <p className="interp-missing">
          <strong>Still not covered:</strong> {r.missing}
        </p>
      )}
      {r.rejectedQuotes.length > 0 && (
        <p className="interp-rejected">
          <strong>{r.rejectedQuotes.length} quote{r.rejectedQuotes.length > 1 ? "s" : ""} discarded</strong>{" "}
          — the model produced wording that is not in your document, so any claim resting on it was
          dropped. This is why quotes are checked rather than trusted.
        </p>
      )}
    </div>
  );
}

function Recommendation({
  f,
  index,
  shortName,
  openByDefault,
  interpretation,
}: {
  f: Finding;
  index: number;
  shortName: string;
  openByDefault: boolean;
  interpretation?: Interpretation;
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
      {r.requiredCount === 0 && r.totalCount > 0 && (
        <p className="rec-optional">
          <strong>Nothing below is required by {shortName}.</strong> Every step is our
          recommendation for how to discharge the duty, not a rule the statute imposes.
        </p>
      )}
      {r.steps?.length > 0 && (
        <div className="step">
          <div className="step-head">
            <span className="step-n">1</span> {labels.practice}
          </div>
          <ol className="step-list">
            {r.steps.map((s, i) => (
              <li key={i}>
                {s.text} <BasisTag item={s} />
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="step">
        <div className="step-head">
          <span className="step-n">2</span>{" "}
          {f.editTarget && r.clause ? `Amend ${f.editTarget} — suggested wording` : labels.clause}
          {r.clause && <BasisTag item={r.clause} />}
        </div>
        {r.clause ? (
          <>
            {r.clauseNote && <p className="finding-note">{r.clauseNote}</p>}
            <div className="draft-bar">
              <span>
                Draft wording — every <code>[BRACKET]</code> is a fact you must supply
              </span>
              <CopyButton text={r.clause.text} label="Copy wording" />
            </div>
            <pre className="draft">{r.clause.text}</pre>
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

      {/* ① what your policy says, and where */}
      <div className="beat">
        <div className="beat-head">
          <span className="beat-n">1</span> Your policy
        </div>
        {f.evidence.length ? (
          f.evidence.map((e, i) => (
            <blockquote key={i} className="policy-quote">
              {e.section && <span className="quote-src">{e.section}</span>}“{e.text}”
            </blockquote>
          ))
        ) : (
          <p className="finding-note">
            No wording matching this obligation&apos;s search terms was located. That is not a
            finding of non-compliance — the practice may exist, or your policy may say the same
            thing in different words.
          </p>
        )}
        {f.searched?.length > 0 && (
          <details className="searched">
            <summary>
              Matched by text search, not by reading — see the {f.searched.length} terms
            </summary>
            <ul className="searched-list">
              {f.searched.map((s, i) => (
                <li key={i} className={s.found ? "el-found" : "el-missing"}>
                  <span className="el-mark">{s.found ? "✓" : "✗"}</span>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
            <p className="searched-note">
              These are regular expressions run over your text. If your policy addresses this in
              words none of the above would catch, the finding above is wrong — and that is a defect
              in the search terms, not in your policy.
            </p>
          </details>
        )}
        {interpretation && <InterpretationBlock r={interpretation} />}
      </div>

      {/* ② what the law says */}
      <div className="beat">
        <div className="beat-head">
          <span className="beat-n">2</span> {shortName} — <span className="citation">{f.citation}</span>
        </div>
        <p className="finding-law">{f.obligation}</p>
        {f.quote && <blockquote className="statute-quote">“{f.quote}”</blockquote>}
      </div>

      {/* ③ the gap between them, element by element */}
      <div className="beat">
        <div className="beat-head">
          <span className="beat-n">3</span> The gap
        </div>
        <p className="gap-statement">{gapStatement(f, shortName)}</p>
        {f.elements?.length > 0 && (
          <ul className="element-list">
            {f.elements.map((e) => (
              <li key={e.id} className={e.found ? "el-found" : "el-missing"}>
                <span className="el-mark">{e.found ? "✓" : "✗"}</span>
                <span>
                  {e.label}
                  {e.found && e.section ? (
                    <span className="el-where"> — located in {e.section}</span>
                  ) : e.found ? null : (
                    <span className="el-where"> — not located</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {f.lane === "ELSEWHERE" && <p className="finding-note">{f.scopeReason}</p>}
        {f.verdict === "PARTIAL" && <p className="finding-note">{f.scopeReason}</p>}
      </div>

      {r &&
        (openByDefault ? (
          <div className="beat">
            <div className="beat-head">
              <span className="beat-n">4</span> How to close it
              {f.editTarget ? <span className="beat-where"> — amend {f.editTarget}</span> : null}
            </div>
            {steps}
          </div>
        ) : (
          <details className="rec-more">
            <summary>
              4 · How to close it — {labels.summary}
              {f.editTarget ? ` (amend ${f.editTarget})` : ""}
            </summary>
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

  // ---- layer 2: interpretation ----
  const [vault, setVault] = useState<VaultState>({
    provider: DEFAULT_PROVIDER as string,
    model: (PROVIDERS as any)[DEFAULT_PROVIDER].defaultModel as string,
    apiKey: "",
  });
  const [interpreting, setInterpreting] = useState(false);
  const [interpretError, setInterpretError] = useState<string | null>(null);
  const [interpretations, setInterpretations] = useState<Record<string, Interpretation>>({});
  const [showInterpret, setShowInterpret] = useState(false);

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
  const hasKey = Boolean(vault.apiKey.trim());
  const providerLabel = (PROVIDERS as any)[vault.provider]?.label ?? vault.provider;

  // Only the gaps are worth a call — everything already evidenced was found on
  // the free, reproducible path and does not need a model's opinion.
  const gaps = useMemo(
    () =>
      (interpretableFindings(findings) as Finding[]).map((f) => ({
        id: f.id,
        name: name(f),
        citation: f.citation,
        obligation: f.obligation,
        quote: f.quote,
      })),
    [findings],
  );

  const prompt = useMemo(
    () =>
      gaps.length
        ? (buildInterpretationPrompt({
            lawShortName: law.shortName,
            findings: gaps,
            policyText: text,
          }) as string)
        : "",
    [gaps, law.shortName, text],
  );

  async function runInterpretation() {
    if (!vault.apiKey.trim() || !gaps.length) return;
    setInterpreting(true);
    setInterpretError(null);
    try {
      const raw = await requestInterpretation({
        apiKey: vault.apiKey.trim(),
        prompt,
        provider: vault.provider,
        model: vault.model,
      });
      const { results, error } = parseInterpretation(raw) as {
        results: any[];
        error: string | null;
      };
      if (error) throw new Error(error);
      // Nothing reaches the screen before its quotes are checked against the
      // document. An unverifiable quote invalidates the claim built on it.
      const verified = verifyAgainstPolicy(results, text) as Interpretation[];
      setInterpretations(Object.fromEntries(verified.map((r) => [r.id, r])));
      if (!verified.length) setInterpretError("The model returned no usable results.");
    } catch (e: any) {
      setInterpretError(
        `${e?.message ?? e}. Check the key belongs to the selected provider and that the model name ` +
          `is one your key can reach — model names change, and the field above is editable for ` +
          `exactly that reason. You can also copy the prompt below and run it anywhere yourself.`,
      );
    } finally {
      setInterpreting(false);
    }
  }

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
        <strong>The first pass matches text, it does not read your policy.</strong> Findings come
        from regular expressions — Ctrl-F with synonyms — so a policy that addresses something in
        unanticipated words is reported as not evidenced, which is a defect in the search terms
        rather than in the policy. Every finding shows exactly what was searched for, and where the
        patterns find nothing you can hand that gap to a model to read properly. It is not a
        compliance score, and the draft wording is not legal advice.
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
        machine. <strong>Two things are exceptions, both opt-in.</strong> Fetching a URL is routed
        through the public reader service <code>r.jina.ai</code>, which will see the address you
        enter, because browsers cannot fetch other sites directly. And the optional second opinion
        on the results sends your policy text to whichever provider you set up below, under your own key. Paste the
        text and skip the second opinion, and nothing leaves this tab.
      </p>

      {/* Key setup lives here, with the other inputs, NOT inside the results.
          It was previously only reachable after running an analysis that found
          gaps — which meant a reader who wanted to set a key up first, or whose
          policy had no gaps, could not find it at all. */}
      <details className="setup-block" open={!hasKey && showInterpret}>
        <summary>
          <span className="setup-title">Second opinion on the results — optional</span>
          <span className={`setup-status ${hasKey ? "on" : ""}`}>
            {hasKey
              ? `${providerLabel} key ready`
              : "No API key set up — the checker still works without one"}
          </span>
        </summary>
        <p className="setup-lead">
          The checker matches text patterns. Where it finds nothing, a model can read the policy
          properly and tell a real gap from a wording it did not recognise. That needs an API key —
          Google Gemini has a free tier. Nothing here is required: without a key you can still copy
          the prompt and run it yourself.
        </p>
        <KeyVault value={vault} onChange={setVault} />
      </details>

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

          {/* ---- layer 2: interpretation, offered only where layer 1 found nothing ---- */}
          {gaps.length > 0 && (
            <div className="interp-panel">
              <div className="interp-panel-head">
                <div>
                  <strong>Pattern matching found nothing for {gaps.length} obligation
                  {gaps.length > 1 ? "s" : ""}.</strong>{" "}
                  That can mean the policy is silent — or that it says the same thing in words the
                  search terms do not know. A model can read the text properly and tell the two
                  apart.
                </div>
                <button className="bar-btn" onClick={() => setShowInterpret((s) => !s)}>
                  {showInterpret ? "Hide" : "Get a second opinion"}
                </button>
              </div>

              {showInterpret && (
                <div className="interp-panel-body">
                  <p className="interp-privacy">
                    <strong>This one sends your policy off your machine.</strong> Everything else on
                    this page runs locally; this does not. The policy text and the statutory quotes
                    go to the provider you choose below, under <em>your</em> key. This site is a
                    static export with no backend, so there is nowhere to keep a shared key — and
                    nowhere for the operator of this site to see your text either. The request goes
                    from your browser straight to the provider.
                  </p>

                  <div className="interp-controls">
                    {hasKey ? (
                      <>
                        <button
                          className="bar-btn primary"
                          onClick={runInterpretation}
                          disabled={interpreting}
                        >
                          {interpreting
                            ? "Reading…"
                            : `Read the ${gaps.length} gap${gaps.length > 1 ? "s" : ""} with ${providerLabel}`}
                        </button>
                        <span className="char-count">
                          Using <code>{vault.model}</code>. Change it in{" "}
                          <em>Second opinion on the results</em>, above the policy box.
                        </span>
                      </>
                    ) : (
                      <p className="interp-nokey">
                        <strong>No API key set up yet.</strong> Open{" "}
                        <em>Second opinion on the results</em> above the policy box to add one —
                        Google Gemini has a free tier. Or take the prompt below and run it yourself.
                      </p>
                    )}
                  </div>

                  <p className="interp-alt">
                    No key, or would rather not paste one? <CopyButton text={prompt} label="Copy the prompt" />{" "}
                    and run it in Claude, or anywhere else. Paste the reply back into whatever you
                    like — the answer is the same, you just check the quotes by hand.
                  </p>

                  {interpretError && <div className="checker-error">{interpretError}</div>}

                  {Object.keys(interpretations).length > 0 && (
                    <p className="interp-done">
                      Second opinion attached to {Object.keys(interpretations).length} finding
                      {Object.keys(interpretations).length > 1 ? "s" : ""} below. Every quote shown
                      was verified as present in your document; anything the model produced that was
                      not in your text has been discarded.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="basis-legend">
            <div className="basis-legend-head">
              Every step below is tagged with its basis, so you can tell what {law.shortName}{" "}
              actually demands from what is merely recommended:
            </div>
            <ul className="basis-legend-list">
              {(Object.values(BASIS_INFO) as { id: string; label: string; blurb: string }[]).map(
                (b) => (
                  <li key={b.id}>
                    <span className={`basis basis-${b.id}`}>{b.label}</span> {b.blurb}
                  </li>
                ),
              )}
            </ul>
            <p className="basis-legend-foot">
              Where a step rests on a <em>different</em> provision from the one quoted in the
              finding, the tag names it — that link is usually the thing you cannot see from the
              quote alone.
            </p>
          </div>

          <div className="legend-warn" style={{ margin: "14px 0 4px" }}>
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
                    interpretation={interpretations[f.id]}
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
