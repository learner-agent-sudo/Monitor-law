#!/usr/bin/env node
/**
 * Guard for the remediation catalog.
 *
 * The basis tag is what lets a reader disagree with advice: "the statute
 * requires this" and "we suggest a table" must not read alike. An untagged step
 * falls back to the weakest label in the UI, so a missing tag on a genuinely
 * mandatory step silently UNDERSTATES the law — and a typo'd tag ("statute"
 * instead of "law") would do the same without any visible symptom.
 *
 * This also catches the opposite and worse failure: a step tagged "law" that
 * names no provision, in a law-specific override where the whole point of the
 * override was to name one.
 *
 * Usage: node scripts/check-remediation.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BASIS, remediation, remediationFor } from "../lib/policy-remediation.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VALID = Object.keys(BASIS);

// The taxonomy and the law catalog, read as text so this script stays
// dependency-free and does not need the TypeScript files compiled.
const reqSrc = readFileSync(join(ROOT, "lib", "data", "requirements.ts"), "utf8");
const requirementIds = [...reqSrc.matchAll(/^\s{4}id: "([a-z0-9-]+)",$/gm)].map((m) => m[1]);

const lawSrc = readFileSync(join(ROOT, "lib", "data", "index.ts"), "utf8");
const lawIds = [...lawSrc.matchAll(/from "\.\/laws\/([a-z0-9-]+)"/g)].map((m) => m[1]);

const problems = [];

for (const id of requirementIds) {
  if (!remediation[id]) {
    problems.push(`${id}: no remediation entry — every requirement in the taxonomy needs one`);
    continue;
  }

  // Resolve per law, because byLaw overrides replace steps wholesale and an
  // override is exactly where a tag is most likely to be forgotten.
  for (const lawId of lawIds) {
    const r = remediationFor(id, lawId);
    const where = `${id} [${lawId}]`;

    if (!r.steps.length) {
      problems.push(`${where}: no steps`);
    }
    for (const [i, s] of r.steps.entries()) {
      if (!s.text?.trim()) problems.push(`${where}: step ${i + 1} has no text`);
      if (!VALID.includes(s.basis)) {
        problems.push(
          `${where}: step ${i + 1} has basis "${s.basis}" — must be one of ${VALID.join(", ")}`,
        );
      }
    }
    if (r.clause) {
      if (!r.clause.text?.trim()) problems.push(`${where}: clause has no text`);
      if (!VALID.includes(r.clause.basis)) {
        problems.push(`${where}: clause has basis "${r.clause.basis}"`);
      }
    } else if (!r.clauseNote) {
      problems.push(`${where}: no clause and no clauseNote explaining why nothing is published`);
    }
  }
}

const lines = [];
lines.push("# Remediation catalog check\n");
lines.push(
  `${requirementIds.length} requirements × ${lawIds.length} laws resolved. ` +
    `Every step and draft clause must declare a basis: ${VALID.join(", ")}.\n`,
);

if (problems.length) {
  lines.push(`\n**${problems.length} problem(s):**\n`);
  for (const p of problems) lines.push(`- ${p}`);
  console.log(lines.join("\n"));
  process.exit(1);
}

lines.push("\nNo problems. Every step and clause carries a basis a reader can check.\n");
lines.push(
  "> A basis tag says where advice comes from. It does not certify the citation is correct — " +
    "that still needs a human reading the statute.",
);
console.log(lines.join("\n"));
