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
import { analyzePolicy, VERDICT_ORDER } from "../lib/policy-rules.mjs";

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


// ---- analyse (shared with the browser page — one implementation) ----------
const policyText = readFileSync(policyPath, "utf8");
const findings = analyzePolicy(obligations, policyText);

if (asJson) {
  console.log(JSON.stringify({ lawId, shortName, policyPath, findings }, null, 2));
  process.exit(0);
}

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
for (const group of VERDICT_ORDER) {
  const rows = findings.filter((f) => f.verdict === group);
  if (!rows.length) continue;
  out.push(`\n## ${group} (${rows.length})\n`);
  for (const f of rows) {
    out.push(`### ${f.id} — ${f.citation}`);
    out.push(`**Law requires:** ${f.obligation}`);
    if (f.quote) out.push(`> ${f.quote}`);
    if (f.verdict === "NOT ASSESSABLE" || f.verdict === "NO OBLIGATION") {
      out.push(`_${f.scopeReason}_`);
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
