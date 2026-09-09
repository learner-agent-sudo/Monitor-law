#!/usr/bin/env node
/**
 * Control 4 — assert that every ingested instrument can be dated.
 *
 * An instrument with no version metadata cannot be gated by date, so any answer
 * drawn from it is undated. Undated is not neutral: it silently asserts "this
 * is the law now", which is the claim most likely to be wrong.
 *
 * Also checks the two dates that are routinely confused. `consolidationDate` is
 * the "text as at" date of the file in corpus/ and is the honest limit of what
 * this repository knows; if it PRE-dates a known later amendment, the metadata
 * must say so rather than let the gap pass unremarked.
 *
 * Usage: node scripts/check-temporal.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AUTHORITY, LIFECYCLE, statusAsOf, requirementAppliesAsOf } from "../lib/temporal.mjs";
import { PROVISION_PATTERNS } from "../lib/provisions.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Read versions.ts as text: no TypeScript toolchain in the check path.
const src = readFileSync(join(ROOT, "lib", "data", "versions.ts"), "utf8");
const entries = [];
for (const m of src.matchAll(/\{\s*\n\s*lawId: "([a-z0-9-]+)",([\s\S]*?)\n  \},/g)) {
  const body = m[2];
  entries.push({
    lawId: m[1],
    authority: body.match(/authority: "([a-z]+)"/)?.[1],
    status: body.match(/status: "([a-z-]+)"/)?.[1],
    inForceDate: body.match(/inForceDate: "([^"]*)"/)?.[1],
    consolidationDate: body.match(/consolidationDate: "([^"]*)"/)?.[1],
    note: body.match(/note:\s*\n?\s*"((?:[^"\\]|\\.)*)"/)?.[1] ?? "",
  });
}

const problems = [];
const rows = [];

for (const lawId of Object.keys(PROVISION_PATTERNS)) {
  const v = entries.find((e) => e.lawId === lawId);
  if (!v) {
    problems.push(
      `${lawId}: no version metadata — every answer drawn from it would be undated, which reads as "this is the law now"`,
    );
    continue;
  }

  if (!AUTHORITY[v.authority]) problems.push(`${lawId}: authority "${v.authority}" is not a known kind`);
  if (!LIFECYCLE[v.status]) problems.push(`${lawId}: status "${v.status}" is not a known lifecycle state`);
  if (!ISO.test(v.inForceDate ?? "")) problems.push(`${lawId}: inForceDate "${v.inForceDate}" is not an ISO date`);
  if (!ISO.test(v.consolidationDate ?? ""))
    problems.push(`${lawId}: consolidationDate "${v.consolidationDate}" is not an ISO date`);

  // Only primary text may ground a stated requirement (Control 1).
  if (v.authority !== "primary") {
    problems.push(
      `${lawId}: authority is "${v.authority}", but this law carries requirement mappings — only primary text may ground a stated requirement`,
    );
  }

  // A consolidation older than the in-force date means the ingested text
  // predates the obligations it is being used to describe.
  if (ISO.test(v.consolidationDate ?? "") && ISO.test(v.inForceDate ?? "")) {
    if (v.consolidationDate < v.inForceDate && !v.note) {
      problems.push(
        `${lawId}: consolidated ${v.consolidationDate} but in force from ${v.inForceDate}, with no note explaining the gap`,
      );
    }
  }

  const s = statusAsOf(v);
  rows.push({ lawId, ...v, computed: s.status, binding: s.binding });
}

const out = ["# Temporal & version gating check\n"];
out.push("| Law | Authority | Recorded status | As of today | Binding | In force | Corpus text as at |");
out.push("| --- | --- | --- | --- | --- | --- | --- |");
for (const r of rows) {
  out.push(
    `| \`${r.lawId}\` | ${r.authority} | ${r.status} | ${r.computed} | ${r.binding ? "yes" : "**no**"} | ${r.inForceDate} | ${r.consolidationDate} |`,
  );
}

// Demonstrate the mechanism works on a phased instrument, since none of the
// privacy laws exercise it and AI law will depend on it entirely.
const phased = {
  lawId: "example-phased",
  status: "partial",
  inForceDate: "2024-08-01",
  consolidationDate: "2024-07-12",
  phases: [
    { from: "2025-02-02", applies: ["prohibited-practices"], note: "prohibitions" },
    { from: "2026-08-02", applies: ["high-risk-conformity"], note: "high-risk duties" },
  ],
};
const early = requirementAppliesAsOf(phased, "high-risk-conformity", "2025-06-01");
const late = requirementAppliesAsOf(phased, "high-risk-conformity", "2026-09-01");
if (early.applies || !late.applies) {
  problems.push("phase gating is broken: an obligation applied before its start date, or failed to apply after it");
}
out.push(
  `\nPhase gating self-test: the same obligation is **${early.applies ? "applicable" : "not applicable"}** ` +
    `on 2025-06-01 and **${late.applies ? "applicable" : "not applicable"}** on 2026-09-01. ` +
    `One instrument, one obligation, two correct answers — which is why every answer must carry its as-of date.\n`,
);

if (problems.length) {
  out.push(`\n**${problems.length} problem(s):**\n`);
  for (const p of problems) out.push(`- ${p}`);
  console.log(out.join("\n"));
  process.exit(1);
}

out.push(
  "\nNo problems. Every ingested instrument can be dated, and every one is primary text.\n",
);
out.push(
  "> The corpus-text date is the limit of what this repository knows. An amendment made after it is " +
    "invisible here however correct everything else is — which is why it is published rather than assumed.",
);
console.log(out.join("\n"));
