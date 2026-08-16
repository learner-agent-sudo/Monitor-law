"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { laws, jurisdictionsById } from "@/lib/data";
// Shared with scripts/analyze-policy.mjs so both run the exact same rules.
import { analyzePolicy, VERDICT_ORDER } from "@/lib/policy-rules.mjs";

/**
 * Public text-extraction service used for the URL option. A browser cannot
 * fetch an arbitrary third-party page directly — the same-origin policy blocks
 * it unless that site opts in with CORS headers, which privacy policies never
 * do. Routing through a reader service is the only way to offer URL input from
 * a site with no backend, and it means the URL leaves the user's machine. That
 * trade is stated in the UI rather than hidden.
 */
const READER = "https://r.jina.ai/";

type Finding = {
  id: string;
  citation: string;
  obligation: string;
  quote: string | null;
  verdict: string;
  scopeReason: string;
  evidence: string[];
};

const VERDICT_CLASS: Record<string, string> = {
  "NOT EVIDENCED": "v-gap",
  PARTIAL: "v-partial",
  EVIDENCED: "v-ok",
  "NOT ASSESSABLE": "v-na",
  "NO OBLIGATION": "v-none",
};

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
    return analyzePolicy(obligations, text) as Finding[];
  }, [ran, text, law]);

  const count = (v: string) => findings.filter((f) => f.verdict === v).length;

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
        own words and the policy&apos;s own sentence — so you can check it rather than trust it.
      </p>

      <div className="disclaimer" style={{ marginTop: 0, marginBottom: 28 }}>
        <strong>This is not a compliance score.</strong> A missing clause is reported as{" "}
        <em>not evidenced</em>, never as non-compliance — the practice may exist and simply not be
        described. And roughly a third of the taxonomy cannot be judged from a policy at all,
        because it lives in contracts and internal records. Those are listed separately.
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
          <h2 className="section">
            {law.shortName} — {count("NOT EVIDENCED")} not evidenced
          </h2>
          <div className="verdict-row">
            {VERDICT_ORDER.map((v: string) => (
              <span key={v} className={`verdict-pill ${VERDICT_CLASS[v]}`}>
                {count(v)} {v.toLowerCase()}
              </span>
            ))}
          </div>

          {VERDICT_ORDER.map((group: string) => {
            const rows = findings.filter((f) => f.verdict === group);
            if (!rows.length) return null;
            return (
              <section key={group} style={{ marginTop: 28 }}>
                <h3 className="region-heading">
                  {group} ({rows.length})
                </h3>
                {rows.map((f) => (
                  <div key={f.id} className={`finding ${VERDICT_CLASS[f.verdict]}`}>
                    <div className="finding-head">
                      <strong>{f.id}</strong>
                      <span className="citation">{f.citation}</span>
                    </div>
                    <p className="finding-law">{f.obligation}</p>
                    {f.quote && <blockquote className="statute-quote">“{f.quote}”</blockquote>}
                    {f.verdict === "NOT ASSESSABLE" || f.verdict === "NO OBLIGATION" ? (
                      <p className="finding-note">{f.scopeReason}</p>
                    ) : f.evidence.length ? (
                      <>
                        <div className="finding-label">Policy says</div>
                        {f.evidence.map((e, i) => (
                          <blockquote key={i} className="policy-quote">
                            “{e}”
                          </blockquote>
                        ))}
                      </>
                    ) : (
                      <p className="finding-note">
                        No matching clause found. This is not a finding of non-compliance — the
                        practice may exist and simply not be described here.
                      </p>
                    )}
                  </div>
                ))}
              </section>
            );
          })}

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
