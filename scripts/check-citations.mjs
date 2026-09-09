#!/usr/bin/env node
/**
 * Controls 2 and 3, at provision level.
 *
 * Control 2 — provision whitelist. Every provision a mapping cites must exist
 * in the ingested corpus. An ID lookup, not a judgement: it catches invented
 * provisions and real provisions from instruments we never ingested.
 *
 * Control 3 — verbatim quote, SCOPED TO THE CITED PROVISION. This is the part
 * that matters. scripts/check-quotes.mjs already proves a quote appears
 * somewhere in the statute file; that is not enough. A sentence lifted verbatim
 * from Art. 30 and labelled Art. 37 passes a file-level search and is exactly
 * the failure this system exists to prevent — a real number from the right
 * statute attached to the wrong obligation. Requiring the quote to appear
 * inside the provision actually cited makes that structurally impossible.
 *
 * Deterministic. No model involved. Fails the build.
 *
 * Usage: node scripts/check-citations.mjs
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LAWS = Object.keys(PROVISION_PATTERNS);

/** Pull { requirementId, citation, quote } out of a law's TypeScript source. */
function readMappings(lawId) {
  const file = join(ROOT, "lib", "data", "laws", `${lawId}.ts`);
  if (!existsSync(file)) return [];
  const src = readFileSync(file, "utf8");
  const out = [];
  const re = /\n {4}(?:"([a-z0-9-]+)"|([a-zA-Z_$][\w$]*))\s*:\s*\{([\s\S]*?)\n {4}\}/g;
  let m;
  while ((m = re.exec(src))) {
    const body = m[3];
    out.push({
      requirementId: m[1] ?? m[2],
      citation: body.match(/citation:\s*"([^"]*)"/)?.[1] ?? "",
      quote: body.match(/quote:\s*\n?\s*"((?:[^"\\]|\\.)*)"/)?.[1] ?? null,
      strictness: Number(body.match(/strictness:\s*(\d)/)?.[1] ?? 0),
    });
  }
  return out;
}

const rows = [];
const problems = [];
let checkedCitations = 0;
let scopedQuotes = 0;
const outsideCorpus = [];

for (const lawId of LAWS) {
  const corpusFile = join(ROOT, "corpus", `${lawId}.md`);
  if (!existsSync(corpusFile)) {
    problems.push(`${lawId}: no corpus file — every mapping for it is unverifiable`);
    continue;
  }
  const text = readFileSync(corpusFile, "utf8");
  const index = buildProvisionIndex(lawId, text);
  const spec = PROVISION_PATTERNS[lawId];

  // Some sources are too damaged to support provision-level scoping. Skipping
  // them is stated in the report, never silent: an unscoped law is a weaker
  // guarantee and the reader has to know which laws carry it.
  if (spec.provisionScoped === false) {
    rows.push({
      lawId,
      provisions: index.size,
      mappings: readMappings(lawId).length,
      scoped: 0,
      unscoped: readMappings(lawId).length,
      unresolved: 0,
      degraded: spec.scopeNote,
    });
    continue;
  }

  if (index.size < spec.expectAtLeast) {
    problems.push(
      `${lawId}: indexed only ${index.size} provisions, expected at least ${spec.expectAtLeast} — ` +
        `the source layout has probably changed and the chunker needs updating`,
    );
  }

  // Provision text, normalised once.
  const normProvisions = new Map();
  for (const [key, p] of index) normProvisions.set(key, normalize(p.text));

  const mappings = readMappings(lawId);
  let unresolved = 0;
  let scoped = 0;
  let unscoped = 0;

  for (const mp of mappings) {
    const keys = extractCitations(mp.citation, lawId);

    // --- Control 2 -------------------------------------------------------
    if (keys.length === 0) {
      // A citation naming no parseable provision cannot be whitelisted. That is
      // reported, not ignored — "PCPD guidance (voluntary)" is a legitimate
      // such case, but it must be visible as resting on no ingested provision.
      unresolved++;
    } else {
      checkedCitations += keys.length;
      // A citation may deliberately name an instrument outside the corpus —
      // California's breach statute sits in §1798.82, which this repository
      // does not hold. That is legitimate ONLY when declared in the citation
      // string, and it is reported as unsupported rather than treated as
      // verified.
      const declaredOutside = /not (?:held )?in corpus|outside (?:the )?corpus|separate statute/i.test(
        mp.citation,
      );
      const unknown = keys.filter((k) => !resolveKey(k, index));
      if (unknown.length && declaredOutside) {
        outsideCorpus.push(
          `${lawId}/${mp.requirementId}: ${unknown.join(", ")} is outside the ingested corpus, and the citation says so. No claim may rest on it.`,
        );
      } else if (unknown.length) {
        problems.push(
          `${lawId}/${mp.requirementId}: cites ${unknown.join(", ")} — not in the ingested corpus ` +
            `(citation string: "${mp.citation}")`,
        );
      }
    }

    // --- Control 3, scoped ------------------------------------------------
    if (!mp.quote) continue;
    // Sub-clause citations verify against the clause that contains them.
    const known = [...new Set(keys.map((k) => resolveKey(k, index)).filter(Boolean))];
    if (!known.length) {
      unscoped++;
      continue; // no provision to scope to; file-level check still applies
    }
    const q = normalize(mp.quote);
    const inCited = known.some((k) => normProvisions.get(k).includes(q));
    if (inCited) {
      scoped++;
      scopedQuotes++;
    } else {
      // Where does it actually live? Naming the real provision turns a failure
      // into a one-line fix.
      const actual = [...normProvisions.entries()]
        .filter(([, t]) => t.includes(q))
        .map(([k]) => k);
      problems.push(
        `${lawId}/${mp.requirementId}: quote is NOT in the cited provision ` +
          `(${known.join(", ")})` +
          (actual.length
            ? ` — it appears in ${actual.slice(0, 3).join(", ")}. The citation or the quote is wrong.`
            : ` — and it appears in no indexed provision at all.`),
      );
    }
  }

  rows.push({ lawId, provisions: index.size, mappings: mappings.length, scoped, unscoped, unresolved });
}

// ---- report ---------------------------------------------------------------
const out = [];
out.push("# Citation & provision-scoped quote check\n");
out.push("| Law | Provisions indexed | Mappings | Quote verified in cited provision | Citation not resolvable |");
out.push("| --- | --- | --- | --- | --- |");
for (const r of rows) {
  out.push(
    `| \`${r.lawId}\` | ${r.provisions} | ${r.mappings} | ` +
      `${r.degraded ? "— _not scoped_" : r.scoped} | ${r.unresolved} |`,
  );
}
for (const r of rows.filter((x) => x.degraded)) {
  out.push(`\n> **\`${r.lawId}\` is file-level verified only.** ${r.degraded}`);
}
if (outsideCorpus.length) {
  out.push("\n**Declared outside the corpus** (allowed, but unsupported by ingested text):\n");
  for (const o of outsideCorpus) out.push(`- ${o}`);
}
out.push(
  `\n${checkedCitations} provision reference(s) checked against the whitelist; ` +
    `${scopedQuotes} quote(s) verified inside the specific provision cited.\n`,
);

if (problems.length) {
  out.push(`\n**${problems.length} problem(s):**\n`);
  for (const p of problems) out.push(`- ${p}`);
  out.push(
    "\n> A quote that is real but attached to the wrong provision is the most dangerous error this " +
      "system can make: it looks authoritative and cites a genuine article. That is why this check " +
      "is scoped rather than file-wide.",
  );
  console.log(out.join("\n"));
  process.exit(1);
}

out.push(
  "\nNo problems. Every cited provision exists in the ingested text, and every quote appears " +
    "inside the provision it is attributed to.\n",
);
out.push(
  "> This proves attribution, not interpretation. The words are the statute's and they sit where " +
    "the citation says — whether the surrounding summary reads them correctly still needs a lawyer.",
);
console.log(out.join("\n"));
