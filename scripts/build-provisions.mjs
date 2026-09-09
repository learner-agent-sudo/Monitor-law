#!/usr/bin/env node
/**
 * Generate the browser-side provision whitelist and the coverage manifest.
 *
 * The full corpus is 2.4 MB and cannot ship to a browser, but Control 2 only
 * needs to answer "does this provision exist in what we ingested?" — which is a
 * set of ids, a few kilobytes. Control 3 keeps the full text and stays in CI.
 *
 * The coverage manifest exists because silence reads as "no requirement". If a
 * jurisdiction is not ingested, an empty cell in a comparison looks identical
 * to a jurisdiction with no such rule, and that false negative is the worst
 * outcome for a gap-analysis tool. Absence of data is not absence of law, so
 * what is and is not covered is published as data rather than left implicit.
 *
 * Usage: node scripts/build-provisions.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildProvisionIndex, PROVISION_PATTERNS } from "../lib/provisions.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "lib", "data", "provision-index.json");

const manifest = { generated: new Date().toISOString().slice(0, 10), laws: {} };
let failed = false;
const lines = ["# Provision index\n"];
lines.push("| Law | Provisions | Scoped verification | Corpus |");
lines.push("| --- | --- | --- | --- |");

for (const [lawId, spec] of Object.entries(PROVISION_PATTERNS)) {
  const corpusFile = join(ROOT, "corpus", `${lawId}.md`);
  if (!existsSync(corpusFile)) {
    lines.push(`| \`${lawId}\` | — | — | **missing** |`);
    manifest.laws[lawId] = { provisions: [], scoped: false, note: "no corpus file ingested" };
    failed = true;
    continue;
  }

  const index = buildProvisionIndex(lawId, readFileSync(corpusFile, "utf8"));
  const scoped = spec.provisionScoped !== false;

  if (index.size < spec.expectAtLeast) {
    lines.push(
      `| \`${lawId}\` | ${index.size} | — | **below expected ${spec.expectAtLeast}** |`,
    );
    failed = true;
    continue;
  }

  manifest.laws[lawId] = {
    provisions: [...index.keys()].sort(),
    scoped,
    ...(spec.scopeNote ? { note: spec.scopeNote } : {}),
  };
  lines.push(
    `| \`${lawId}\` | ${index.size} | ${scoped ? "yes" : "**file level only**"} | \`corpus/${lawId}.md\` |`,
  );
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(manifest, null, 2) + "\n");

const total = Object.values(manifest.laws).reduce((n, l) => n + l.provisions.length, 0);
lines.push(`\n${total} provisions indexed across ${Object.keys(manifest.laws).length} instruments.`);
lines.push(`Written to \`lib/data/provision-index.json\`.\n`);
lines.push(
  "> This manifest is what stops an un-ingested jurisdiction from reading as a jurisdiction with " +
    "no rule. Absence of data is not absence of law.",
);

console.log(lines.join("\n"));
if (failed) process.exit(1);
