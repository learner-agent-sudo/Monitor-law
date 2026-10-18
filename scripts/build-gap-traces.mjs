#!/usr/bin/env node
/**
 * Generate lib/data/gap-traces.json — the evidence behind every empty cell.
 *
 * A cell with no quote is a claim with nothing behind it. This script replaces
 * that nothing with a record of the search: how many provisions were read,
 * which terms were tried, which of them appear nowhere in the instrument, and
 * the nearest provisions with their own words attached.
 *
 * The excerpts are sliced out of the corpus here, at build time, rather than
 * typed into a data file by hand. That is the point: a hand-written "nearest
 * provision says X" can drift from the statute, while a generated one cannot,
 * and scripts/check-gap-traces.mjs re-derives this file to prove it was
 * generated rather than edited.
 *
 * The judgement — why those provisions do not impose the obligation — comes
 * from lib/data/gap-verdicts.mjs and is carried through unchanged. It is
 * labelled as a reading, never as a finding of the search.
 *
 * Usage: node scripts/build-gap-traces.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildProvisionIndex, PROVISION_PATTERNS } from "../lib/provisions.mjs";
import { searchProvisions } from "../lib/gap-search.mjs";
import { LAW_IDS, readMappings, needsTrace } from "../lib/law-source.mjs";
import { GAP_VERDICTS, VERDICTS_REVIEWED } from "../lib/data/gap-verdicts.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "lib", "data", "gap-traces.json");

/**
 * Build every trace. Exported so the check script can re-derive and compare
 * rather than trusting the file on disk.
 */
export function deriveTraces(root = ROOT) {
  const traces = {};
  const missingVerdict = [];

  for (const lawId of LAW_IDS) {
    const corpusFile = join(root, "corpus", `${lawId}.md`);
    if (!existsSync(corpusFile)) continue;
    const index = buildProvisionIndex(lawId, readFileSync(corpusFile, "utf8"));
    const spec = PROVISION_PATTERNS[lawId];

    for (const mp of readMappings(root, lawId)) {
      if (!needsTrace(mp)) continue;
      const id = `${lawId}/${mp.requirementId}`;
      const search = searchProvisions(lawId, mp.requirementId, index);
      const verdict = GAP_VERDICTS[id];
      if (!verdict) {
        missingVerdict.push(id);
        continue;
      }

      // The author's named near-misses get their own excerpt, pulled the same
      // way as the ranked ones. Where a named provision did not make the top
      // three it still appears, marked as named rather than ranked — the
      // ranking is a heuristic and the author is allowed to disagree with it,
      // as long as the search did reach the provision at all.
      const rankedKeys = new Set(search.candidates.map((c) => c.key));
      const named = (verdict.nearest ?? [])
        .filter((k) => !rankedKeys.has(k))
        .map((k) => search.candidateFor(k))
        .filter(Boolean)
        .map((c) => ({ ...c, named: true }));

      traces[id] = {
        lawId,
        requirementId: mp.requirementId,
        strictness: mp.strictness,
        sourceType: mp.sourceType,
        obligation: mp.obligation,
        citation: mp.citation,
        // --- mechanical, reproducible from the corpus -------------------
        provisionsSearched: search.provisionsSearched,
        termsTried: search.termsTried,
        termsAbsent: search.termsAbsent,
        candidatesFound: search.candidatesFound,
        weakOnly: search.weakOnly,
        candidates: [
          ...search.candidates.map((c) => ({
            ...c,
            named: (verdict.nearest ?? []).includes(c.key),
          })),
          ...named,
        ],
        // --- judgement, authored ----------------------------------------
        nearest: verdict.nearest ?? [],
        noNearest: Boolean(verdict.noNearest),
        verdict: verdict.verdict,
        elsewhere: verdict.elsewhere ?? null,
        reviewed: VERDICTS_REVIEWED,
        // Québec's source cannot support provision-level scoping, so a trace
        // for it inherits the same caveat the citation check prints.
        degraded: spec.provisionScoped === false ? spec.scopeNote : null,
      };
    }
  }

  return { traces, missingVerdict };
}

/** Stable serialisation: key order fixed, so a diff means the data changed. */
export function serialise(traces) {
  const ordered = {};
  for (const key of Object.keys(traces).sort()) ordered[key] = traces[key];
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

// ---- run ------------------------------------------------------------------
if (process.argv[1] && process.argv[1].endsWith("build-gap-traces.mjs")) {
  const { traces, missingVerdict } = deriveTraces();

  if (missingVerdict.length) {
    console.log(
      `# Gap traces\n\n**${missingVerdict.length} cell(s) with no quote and no verdict.**\n`,
    );
    for (const id of missingVerdict) console.log(`- ${id}`);
    console.log(
      "\n> Every cell that does not quote the statute has to say what was searched and why the " +
        "result is what it is. Add an entry to lib/data/gap-verdicts.mjs — a blank cell is not an " +
        "option.",
    );
    process.exit(1);
  }

  writeFileSync(OUT, serialise(traces));

  const rows = Object.values(traces);
  const out = [];
  out.push("# Gap traces — evidence for cells with no quote\n");
  out.push("| Cell | Strictness | Searched | Terms | Absent | Near-misses | Basis |");
  out.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const t of rows) {
    out.push(
      `| \`${t.lawId}/${t.requirementId}\` | ${t.strictness} | ${t.provisionsSearched} | ` +
        `${t.termsTried.length} | ${t.termsAbsent.length} | ` +
        `${t.noNearest ? "_none found_" : t.nearest.join(", ")} | ${t.sourceType} |`,
    );
  }

  const totalSearched = rows.reduce((n, t) => n + t.provisionsSearched, 0);
  const silent = rows.filter((t) => t.noNearest).length;
  out.push(
    `\n${rows.length} trace(s) written to \`lib/data/gap-traces.json\`. ` +
      `${totalSearched} provision reads across the instruments; ` +
      `${silent} cell(s) where the search found nothing at all.\n`,
  );
  out.push(
    "> A trace proves a search happened and shows its reach. It does not prove absence: a statute " +
      "can impose a duty in words nobody thought to search for, which is exactly how " +
      "GDPR-shaped vocabulary makes a non-GDPR law look emptier than it is. The verdicts are a " +
      "reading, offered to be argued with.",
  );
  console.log(out.join("\n"));
}
