#!/usr/bin/env node
/**
 * The gate on negative claims.
 *
 * Every positive claim in this catalog is verified at provision level by
 * scripts/check-citations.mjs. Negative claims — "no portability right", "no
 * sensitive-data category", a 0 that drives a gap in the comparison — had no
 * gate at all. This is it.
 *
 * What it enforces:
 *
 *  1. COVERAGE. Every cell without a quote has a trace. No blank cells, which
 *     is the rule "absence of data is not absence of law" made mechanical.
 *  2. FIDELITY. The shipped JSON is re-derived from the corpus and compared. A
 *     trace cannot be hand-edited into saying something the search did not
 *     find, and excerpts cannot drift from the statute.
 *  3. VERBATIM. Every excerpt appears inside the provision it is attributed to.
 *  4. WHITELIST (Control 2). Every provision named as a near-miss exists in the
 *     ingested text — and so does every provision cited in the author's prose,
 *     because a judgement that cites an invented section is worse than one that
 *     cites nothing.
 *  5. SELF-TEST. Every provision the author names must have been REACHED by the
 *     mechanical search. This is the rule that makes the trace load-bearing: if
 *     the author knows the nearest provision but the search never scored it,
 *     the vocabulary is too narrow and every other "nothing found" in that
 *     requirement is suspect.
 *  6. NO SHRUGGING. An author may claim nothing was found only where the
 *     search found nothing.
 *  7. CROSS-REFERENCES LEAD SOMEWHERE. A cell may point at a neighbouring
 *     requirement that carries the constraint instead — the GDPR imposes no
 *     storage mandate, but Chapter V prices export so heavily that a bare 0
 *     misleads. That pointer must name a real requirement, this law must be
 *     mapped against it, and it must score HIGHER than the cell pointing at
 *     it, because a pointer to an equally empty row is reassurance that
 *     delivers nothing.
 *
 * Deterministic. No model involved. Fails the build.
 *
 * Usage: node scripts/check-gap-traces.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildProvisionIndex,
  extractCitations,
  normalize,
  resolveKey,
  PROVISION_PATTERNS,
} from "../lib/provisions.mjs";
import { searchProvisions, flattenLinks, tidy } from "../lib/gap-search.mjs";
import { LAW_IDS, readMappings, readRequirements, needsTrace } from "../lib/law-source.mjs";
import { BINDING_FLOOR } from "../lib/strictness.mjs";
import { deriveTraces, serialise } from "./build-gap-traces.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TRACE_FILE = join(ROOT, "lib", "data", "gap-traces.json");

/**
 * Validate one trace against the corpus. Pure, so the self-test at the bottom
 * can feed it a deliberately broken trace and prove the gate bites.
 */
export function validateTrace(id, trace, index, search, knownRequirementIds = new Set()) {
  const problems = [];

  // --- 4. whitelist, on named near-misses -------------------------------
  for (const key of trace.nearest) {
    if (!resolveKey(key, index)) {
      problems.push(
        `${id}: names ${key} as a near-miss, but no such provision is in the ingested text`,
      );
      continue;
    }
    // --- 5. self-test --------------------------------------------------
    if (!search.allKeys.includes(key)) {
      problems.push(
        `${id}: names ${key} as the nearest provision, but the search never reached it. ` +
          `Either the vocabulary in lib/gap-search.mjs is too narrow — in which case every ` +
          `"nothing found" for this requirement is unsafe — or the claim is wrong.`,
      );
    }
  }

  // --- 6. no shrugging ---------------------------------------------------
  if (trace.noNearest && trace.nearest.length) {
    problems.push(`${id}: marked noNearest while naming ${trace.nearest.length} provision(s)`);
  }
  if (!trace.noNearest && !trace.nearest.length) {
    problems.push(
      `${id}: names no near-miss and is not marked noNearest. Say which provisions come closest, ` +
        `or declare that none do.`,
    );
  }
  if (trace.noNearest && search.candidatesFound > 0) {
    problems.push(
      `${id}: claims nothing was found, but the search surfaced ${search.candidatesFound} ` +
        `provision(s) — ${search.allKeys.slice(0, 4).join(", ")}. Evidence that exists has to be ` +
        `addressed, not passed over.`,
    );
  }

  // --- 3. verbatim excerpts ---------------------------------------------
  for (const c of trace.candidates) {
    const key = resolveKey(c.key, index);
    if (!key) {
      problems.push(`${id}: candidate ${c.key} is not in the ingested text`);
      continue;
    }
    const haystack = normalize(flattenLinks(tidy(index.get(key).text)));
    if (!haystack.includes(normalize(c.excerpt))) {
      problems.push(
        `${id}: the excerpt shown for ${c.key} is not in that provision's text. An excerpt is ` +
          `supposed to be a slice of the statute, so this means the generator is paraphrasing.`,
      );
    }
  }

  // --- 7. cross-references must lead somewhere better -------------------
  // "The constraint you are looking for is in that row" is only useful if that
  // row actually carries something. A pointer to an equally empty cell reads
  // as reassurance and delivers nothing, so it is rejected.
  for (const h of trace.handledBy ?? []) {
    if (!knownRequirementIds.has(h.requirementId)) {
      problems.push(`${id}: points at requirement "${h.requirementId}", which is not in the taxonomy`);
      continue;
    }
    if (h.requirementId === trace.requirementId) {
      problems.push(`${id}: points at itself`);
      continue;
    }
    if (h.strictness <= trace.strictness) {
      problems.push(
        `${id}: points at "${h.requirementId}", where ${trace.lawId} scores ${h.strictness} — ` +
          `no higher than the ${trace.strictness} it is meant to explain. A cross-reference to an ` +
          `equally empty row is false comfort.`,
      );
    }
    if (!h.note || h.note.length < 10) {
      problems.push(`${id}: cross-reference to "${h.requirementId}" has no note saying what is there`);
    }
    if (!["instead-of", "different-approach"].includes(h.kind)) {
      problems.push(`${id}: cross-reference to "${h.requirementId}" has an unknown kind "${h.kind}"`);
    }
    // "instead-of" is the strong claim — it puts a mark beside the score in the
    // comparison tables, saying the 0 understates the position. A row that only
    // gestures at the ground cannot carry that. The threshold is the published
    // binding floor, imported rather than written here a second time: this rule
    // and the rubric a reader is shown have to be the same number.
    if (h.kind === "instead-of" && h.strictness < BINDING_FLOOR) {
      problems.push(
        `${id}: claims "${h.requirementId}" constrains the same ground instead, but ${trace.lawId} ` +
          `scores only ${h.strictness} there. Below ${BINDING_FLOOR} — the binding floor in ` +
          `lib/strictness.mjs — that is a trace of a constraint, not one; use "different-approach".`,
      );
    }
  }

  // --- 4. whitelist, on the author's prose ------------------------------
  // The verdict is a reading, but a reading that cites a provision is making a
  // checkable claim. Prose may cite only the instrument the entry is about;
  // a section number from another statute would resolve against this index and
  // read as verified when nothing verified it. Every authored string is
  // screened, including the practical-effect note and the cross-reference
  // notes — a citation is a citation wherever the author puts it.
  const prose = [
    trace.verdict,
    trace.practicalEffect ?? "",
    trace.elsewhere ?? "",
    ...(trace.handledBy ?? []).map((h) => h.note),
  ].join(" ");
  for (const key of extractCitations(prose, trace.lawId)) {
    if (!resolveKey(key, index)) {
      problems.push(
        `${id}: the verdict cites ${key}, which is not in the ingested text of ${trace.lawId}`,
      );
    }
  }

  if (!trace.verdict || trace.verdict.length < 40) {
    problems.push(`${id}: the verdict is missing or too short to be a reason`);
  }
  if (!trace.reviewed) {
    problems.push(`${id}: no review date — a present-tense claim with no as-of date`);
  }

  return problems;
}

// ---- run ------------------------------------------------------------------
// Note: this runs on import, by design — it is a script, not a library. Only
// validateTrace above is meant to be pulled in from elsewhere.
const problems = [];
const rows = [];
const knownRequirementIds = new Set(readRequirements(ROOT).map((r) => r.id));

// --- 2. fidelity -----------------------------------------------------------
const { traces: fresh, missingVerdict } = deriveTraces(ROOT);
for (const id of missingVerdict) {
  problems.push(
    `${id}: has no quote and no verdict in lib/data/gap-verdicts.mjs. A cell cannot be left blank.`,
  );
}

if (!existsSync(TRACE_FILE)) {
  problems.push("lib/data/gap-traces.json is missing — run node scripts/build-gap-traces.mjs");
} else if (readFileSync(TRACE_FILE, "utf8") !== serialise(fresh)) {
  problems.push(
    "lib/data/gap-traces.json does not match a fresh derivation from the corpus. Either the " +
      "corpus or the vocabulary changed and the file is stale, or the file was edited by hand — " +
      "and a hand-edited trace is exactly the thing it exists to rule out. Run " +
      "node scripts/build-gap-traces.mjs.",
  );
}

for (const lawId of LAW_IDS) {
  const corpusFile = join(ROOT, "corpus", `${lawId}.md`);
  if (!existsSync(corpusFile)) {
    problems.push(`${lawId}: no corpus file`);
    continue;
  }
  const index = buildProvisionIndex(lawId, readFileSync(corpusFile, "utf8"));
  const mappings = readMappings(ROOT, lawId);

  // Guard against the parser silently reading nothing, which would make every
  // coverage assertion below vacuously true.
  if (mappings.length === 0) {
    problems.push(`${lawId}: no mappings parsed out of the law file — the reader is broken`);
    continue;
  }

  let traced = 0;
  let silent = 0;
  for (const mp of mappings) {
    const id = `${lawId}/${mp.requirementId}`;
    const trace = fresh[id];

    // --- 1. coverage ----------------------------------------------------
    if (needsTrace(mp) && !trace) {
      problems.push(`${id}: no quote and no search trace`);
      continue;
    }
    if (!needsTrace(mp) && trace) {
      problems.push(
        `${id}: carries a quote AND a search trace. One of them is wrong — a quoted cell is ` +
          `evidenced by the quote, and a trace for it will drift.`,
      );
      continue;
    }
    if (!trace) continue;

    traced++;
    if (trace.noNearest) silent++;
    const search = searchProvisions(lawId, mp.requirementId, index);
    problems.push(...validateTrace(id, trace, index, search, knownRequirementIds));

    if (PROVISION_PATTERNS[lawId].provisionScoped === false && !trace.degraded) {
      problems.push(`${id}: ${lawId} is not provision-scoped, but the trace does not say so`);
    }
  }

  rows.push({ lawId, provisions: index.size, mappings: mappings.length, traced, silent });
}

// --- self-test: prove the gate bites ---------------------------------------
// A check nobody has watched fail is a check nobody knows works. These feed the
// validator traces that are wrong in the two ways that matter most and assert
// it rejects them.
{
  const index = buildProvisionIndex("pdpo", readFileSync(join(ROOT, "corpus", "pdpo.md"), "utf8"));
  const search = searchProvisions("pdpo", "dpia", index);
  const base = {
    lawId: "pdpo",
    requirementId: "dpia",
    strictness: 1,
    candidates: [],
    handledBy: [],
    verdict: "A verdict long enough to pass the minimum-length rule for a stated reason.",
    practicalEffect: null,
    reviewed: "2026-10-18",
    elsewhere: null,
  };

  // Naming a provision the search never reached.
  const unreached = validateTrace(
    "self-test/unreached",
    { ...base, nearest: ["s-38"], noNearest: false },
    index,
    search,
  );
  if (!unreached.some((p) => /never reached it/.test(p))) {
    problems.push("SELF-TEST FAILED: a near-miss the search never scored was accepted");
  }

  // Citing a provision that does not exist in the instrument.
  const invented = validateTrace(
    "self-test/invented",
    { ...base, nearest: [], noNearest: true, verdict: `${base.verdict} See s.9999 of the Ordinance.` },
    index,
    search,
  );
  if (!invented.some((p) => /not in the ingested text/.test(p))) {
    problems.push("SELF-TEST FAILED: a verdict citing a non-existent provision was accepted");
  }

  // Claiming nothing was found where the search did find something.
  const shrug = searchProvisions("pdpo", "data-localization", index);
  const shrugged = validateTrace(
    "self-test/shrug",
    { ...base, nearest: [], noNearest: true },
    index,
    shrug,
  );
  if (!shrugged.some((p) => /has to be addressed/.test(p))) {
    problems.push("SELF-TEST FAILED: ignoring provisions the search surfaced was accepted");
  }

  // Pointing a reader at a row that is just as empty.
  const hollow = validateTrace(
    "self-test/hollow",
    {
      ...base,
      nearest: [],
      noNearest: true,
      handledBy: [
        {
          requirementId: "childrens-data",
          strictness: 1,
          note: "A note of adequate length to pass the note rule.",
        },
      ],
    },
    index,
    search,
    knownRequirementIds,
  );
  if (!hollow.some((p) => /false comfort/.test(p))) {
    problems.push("SELF-TEST FAILED: a cross-reference to an equally empty row was accepted");
  }

  // Claiming the same ground is constrained elsewhere, pointing at a row that
  // barely registers. This is the claim that puts a mark beside a score in the
  // comparison, so it has to be the hardest one to make.
  const overclaim = validateTrace(
    "self-test/overclaim",
    {
      ...base,
      strictness: 0,
      nearest: [],
      noNearest: true,
      handledBy: [
        {
          requirementId: "childrens-data",
          kind: "instead-of",
          strictness: 1,
          note: "A note of adequate length to pass the note rule.",
        },
      ],
    },
    index,
    search,
    knownRequirementIds,
  );
  if (!overclaim.some((p) => /not one/.test(p))) {
    problems.push(
      "SELF-TEST FAILED: 'constrained under another row' was accepted pointing at a strictness-1 row",
    );
  }
}

// ---- report ---------------------------------------------------------------
const out = [];
out.push("# Search traces for cells with no quote\n");
out.push("| Law | Provisions | Mappings | Cells with no quote | Of those, search found nothing |");
out.push("| --- | --- | --- | --- | --- |");
for (const r of rows) {
  out.push(`| \`${r.lawId}\` | ${r.provisions} | ${r.mappings} | ${r.traced} | ${r.silent} |`);
}

const all = Object.values(fresh);
const totalReads = all.reduce((n, t) => n + t.provisionsSearched, 0);
out.push(
  `\n${all.length} trace(s); ${totalReads} provision reads; ` +
    `${all.filter((t) => t.noNearest).length} cell(s) where no provision matched any specific term.\n`,
);

if (problems.length) {
  out.push(`\n**${problems.length} problem(s):**\n`);
  for (const p of problems) out.push(`- ${p}`);
  out.push(
    "\n> A 0 with nothing behind it is the weakest claim this catalog can make and the one most " +
      "likely to be relied on, because a gap analysis is built by comparing a quoted obligation " +
      "against an unquoted blank.",
  );
  console.log(out.join("\n"));
  process.exit(1);
}

const refs = all.flatMap((t) => t.handledBy ?? []);
const strong = refs.filter((h) => h.kind === "instead-of");
out.push(
  `${refs.length} cross-reference(s) out of these cells, each verified to score higher than the ` +
    `cell making it. ${strong.length} claim the same ground is constrained by another route — ` +
    `the only ones marked beside a score in the comparison, and each confirmed to point at a ` +
    `requirement scoring 2 or more.\n`,
);
out.push(
  "\nNo problems. Every cell that does not quote the statute records what was searched, how " +
    "far the search reached, and which provisions came closest — and the five self-tests " +
    "confirm the gate rejects an unreached near-miss, an invented citation, an ignored hit, " +
    "a cross-reference to an equally empty row, and a claim that the ground is covered " +
    "elsewhere when that row barely registers.\n",
);
out.push(
  "> This proves a search happened, not that the law is silent. The verdicts are a reading of " +
    "the provisions shown, dated, and labelled as a reading — they are there to be disagreed " +
    "with, which is the whole point of showing the excerpts next to them.",
);
console.log(out.join("\n"));
