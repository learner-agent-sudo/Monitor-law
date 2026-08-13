#!/usr/bin/env node
/**
 * Gap analysis #2 — a privacy policy against a law.
 *
 * This is deliberately NOT a compliance score. It produces three things per
 * obligation:
 *   1. what the law requires, quoted verbatim from corpus/<lawId>.md
 *   2. what the policy says, quoted verbatim from the policy file
 *   3. whether (2) appears to address (1)
 *
 * Both sides are quoted so every finding is checkable rather than taken on
 * trust. The deterministic pass below locates candidate clauses; a human (or a
 * model) then judges sufficiency, and that judgement is recorded separately
 * from the evidence.
 *
 * Three things this cannot tell you:
 *   - Absence of a clause is NOT proof of non-compliance. The practice may
 *     exist and simply not be described. Findings say "not evidenced", never
 *     "non-compliant".
 *   - Presence of a clause is NOT proof of compliance. "We take security
 *     seriously" satisfies nothing.
 *   - A policy is one artifact. Obligations discharged through contracts,
 *     records or internal assessments are reported as NOT ASSESSABLE.
 *
 * Usage:
 *   node scripts/analyze-policy.mjs <policy-file> <lawId> [--json]
 *   e.g. node scripts/analyze-policy.mjs policies/yuja.md gdpr
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const [, , policyPath, lawId, ...rest] = process.argv;
const asJson = rest.includes("--json");

if (!policyPath || !lawId) {
  console.error("usage: node scripts/analyze-policy.mjs <policy-file> <lawId> [--json]");
  process.exit(2);
}
if (!existsSync(policyPath)) {
  console.error(`policy file not found: ${policyPath}`);
  process.exit(2);
}

// ---- load the law's obligations (with their anchored quotes) --------------
const lawFile = join(ROOT, "lib", "data", "laws", `${lawId}.ts`);
if (!existsSync(lawFile)) {
  console.error(`no such law: ${lawId}`);
  process.exit(2);
}
const lawSrc = readFileSync(lawFile, "utf8");
const shortName = lawSrc.match(/shortName:\s*"([^"]*)"/)?.[1] ?? lawId;

const obligations = [];
{
  const re = /\n {4}(?:"([a-z0-9-]+)"|([a-zA-Z_$][\w$]*))\s*:\s*\{([\s\S]*?)\n {4}\}/g;
  let m;
  while ((m = re.exec(lawSrc))) {
    const id = m[1] ?? m[2];
    const body = m[3];
    obligations.push({
      id,
      strictness: Number(body.match(/strictness:\s*(\d)/)?.[1] ?? 0),
      obligation: body.match(/obligation:\s*\n?\s*"((?:[^"\\]|\\.)*)"/)?.[1] ?? "",
      citation: body.match(/citation:\s*"([^"]*)"/)?.[1] ?? "",
      quote: body.match(/quote:\s*\n?\s*"((?:[^"\\]|\\.)*)"/)?.[1] ?? null,
    });
  }
}

// ---- load scope + probes (parsed from the TS so there is one source) ------
/**
 * Deterministic probes locating candidate clauses. Defined here as real regex
 * literals — an earlier version parsed them out of the TypeScript source, and
 * `[^\]]*` truncated every pattern at the first "]" inside a character class
 * (so /opt[- ]out/ became /opt[-/), silently producing false "not evidenced"
 * results. Evidence-finding must not depend on parsing code as text.
 */
const probes = {
  "notice-transparency": [/personal (information|data) (we|that we) collect/i, /categories of personal/i, /this (privacy )?(policy|notice)/i],
  "lawful-basis": [/legal basis|lawful basis|legitimate interest|contractual necessity/i],
  consent: [/\bconsent\b/i, /withdraw (your )?consent/i, /opt[- ]in/i],
  "rights-access": [/right to (request )?(access|know)/i, /request a copy of/i, /access to the personal/i],
  "rights-deletion": [/right to (request )?(delete|deletion|erasure)/i, /right to be forgotten/i, /seeks? to .{0,40}delete/i, /(remove|delet\w+) (your |such |the )?(personal )?(data|information)/i],
  "rights-correction": [/right to (request )?(correct|rectif)/i, /correct\W{0,3}.{0,40}inaccurate/i, /seeks? to correct/i, /(correct|amend|rectify) (inaccurate|incomplete|your)/i],
  "rights-portability": [/data portability|portable format|machine[- ]readable/i],
  "rights-optout-sale": [/opt[- ]out/i, /do not sell/i, /sale of personal/i, /global privacy control/i, /unsubscribe/i],
  "rights-automated-decision": [/automated (decision|processing)/i, /\bprofiling\b/i],
  "sensitive-data": [/sensitive (personal )?(information|data)/i, /special categor/i, /biometric/i],
  "childrens-data": [/\bchild(ren)?\b|\bminors?\b|under the age of|parental consent|COPPA|FERPA/i],
  "cross-border-transfer": [/transfer.{0,40}(outside|international|cross[- ]border)/i, /standard contractual clauses|adequacy decision/i, /data privacy framework|\bDPF\b|privacy shield/i, /transferred to the united states|received from the european union/i],
  "dpo-representative": [/data protection officer|EU representative|privacy officer/i],
  "data-localization": [/stored? (in|within)|data cent(er|re)s? (located|in)/i],
};

/** Scope classification is plain strings, so parsing it from TS is safe. */
function parseScope() {
  const src = readFileSync(join(ROOT, "lib", "policy-scope.ts"), "utf8");
  const scope = {};
  const re = /\n {2}(?:"([a-z0-9-]+)"|([a-zA-Z_$][\w$]*)):\s*\{\s*\n?\s*scope:\s*"([a-z-]+)",\s*\n?\s*reason:\s*\n?\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(src))) {
    scope[m[1] ?? m[2]] = { scope: m[3], reason: m[4].replace(/\\"/g, '"') };
  }
  return scope;
}
const scope = parseScope();

// ---- read the policy, split into sentences for quoting --------------------
const policyRaw = readFileSync(policyPath, "utf8");
const policyText = policyRaw.replace(/\r/g, "");
const sentences = policyText
  .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z“"])/)
  .map((s) => s.replace(/\s+/g, " ").trim())
  .filter((s) => s.length > 25 && s.length < 700);

function findEvidence(reqId) {
  const pats = probes[reqId] ?? [];
  const hits = [];
  for (const s of sentences) {
    if (pats.some((p) => p.test(s))) {
      hits.push(s);
      if (hits.length >= 3) break;
    }
  }
  return hits;
}

// ---- build findings -------------------------------------------------------
const findings = obligations.map((o) => {
  const sc = scope[o.id] ?? { scope: "assessable", reason: "" };
  // If the law imposes nothing here, there is nothing for a policy to evidence.
  // Reporting it as a gap invents a failure out of the law's own silence.
  if (o.strictness === 0) {
    return {
      ...o,
      scope: "n/a",
      scopeReason: "This law imposes no such obligation, so there is nothing for a policy to address.",
      verdict: "NO OBLIGATION",
      evidence: [],
    };
  }
  if (sc.scope === "not-assessable") {
    return { ...o, scope: sc.scope, scopeReason: sc.reason, verdict: "NOT ASSESSABLE", evidence: [] };
  }
  const evidence = findEvidence(o.id);
  const verdict = evidence.length === 0 ? "NOT EVIDENCED" : sc.scope === "partial" ? "PARTIAL" : "EVIDENCED";
  return { ...o, scope: sc.scope, scopeReason: sc.reason, verdict, evidence };
});

if (asJson) {
  console.log(JSON.stringify({ lawId, shortName, policyPath, findings }, null, 2));
  process.exit(0);
}

// ---- report ---------------------------------------------------------------
const count = (v) => findings.filter((f) => f.verdict === v).length;
const out = [];
out.push(`# Policy gap analysis — ${policyPath} vs ${shortName}\n`);
out.push(
  `**${count("EVIDENCED")}** evidenced · **${count("PARTIAL")}** partial · ` +
    `**${count("NOT EVIDENCED")}** not evidenced · **${count("NOT ASSESSABLE")}** not assessable from a policy · ` +
    `**${count("NO OBLIGATION")}** not required by this law\n`,
);
out.push(
  "> Absence of a clause is not proof of non-compliance, and presence of one is not proof of compliance. " +
    "This locates evidence; it does not reach a legal conclusion.\n",
);

for (const group of ["NOT EVIDENCED", "PARTIAL", "EVIDENCED", "NOT ASSESSABLE", "NO OBLIGATION"]) {
  const rows = findings.filter((f) => f.verdict === group);
  if (!rows.length) continue;
  out.push(`\n## ${group} (${rows.length})\n`);
  for (const f of rows) {
    out.push(`### ${f.id} — ${f.citation}`);
    out.push(`**Law requires:** ${f.obligation}`);
    if (f.quote) out.push(`> ${f.quote}`);
    if (f.verdict === "NOT ASSESSABLE" || f.verdict === "NO OBLIGATION") {
      out.push(`_Why not assessable:_ ${f.scopeReason}`);
    } else if (f.evidence.length) {
      out.push(`**Policy says:**`);
      for (const e of f.evidence) out.push(`- “${e}”`);
    } else {
      out.push(`**Policy says:** _no matching clause found_`);
    }
    out.push("");
  }
}
console.log(out.join("\n"));
