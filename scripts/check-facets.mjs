#!/usr/bin/env node
/**
 * Checks the points-of-comparison layer.
 *
 * Two inputs:
 *   lib/data/facets.json                 the points each requirement is split into
 *   lib/data/facet-answers/<lawId>.json  one law's placement on every point
 *
 * An answer is accepted only when its quote can be found inside the provision
 * it cites. The provision logic is the same as scripts/check-citations.mjs
 * (lib/provisions.mjs), and quotes are normalised the same way
 * scripts/check-quotes.mjs normalises them, so a worker who passes this check
 * has passed the checks that gate the rest of the catalog.
 *
 * Usage:
 *   node scripts/check-facets.mjs              facets.json plus every catalog law
 *   node scripts/check-facets.mjs --law pdpo   one law's answer file only
 *
 * Exit status 1 when anything is wrong, including a missing answer file.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildProvisionIndex,
  extractCitations,
  normalize,
  resolveKey,
  PROVISION_PATTERNS,
} from "../lib/provisions.mjs";
import { readRequirements } from "../lib/law-source.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FACETS_FILE = join(ROOT, "lib", "data", "facets.json");
const ANSWERS_DIR = join(ROOT, "lib", "data", "facet-answers");
const CORPUS_DIR = join(ROOT, "corpus");
const LAWS_DIR = join(ROOT, "lib", "data", "laws");

const MAX_SAYS = 240;
const MIN_QUOTE_WORDS = 4;
const MIN_QUOTE_CHARS_CJK = 8;

const problems = [];
const notes = [];
const problem = (where, msg) => problems.push(`${where}: ${msg}`);
const note = (msg) => notes.push(msg);

// ---- catalog --------------------------------------------------------------

/** A catalog law has BOTH a law file and a corpus file. Derived, not listed. */
function catalogLawIds() {
  if (!existsSync(LAWS_DIR)) return [];
  return readdirSync(LAWS_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => f.slice(0, -3))
    .filter((id) => existsSync(join(CORPUS_DIR, `${id}.md`)))
    .sort();
}

// ---- facets.json self-checks ---------------------------------------------

function checkFacetsFile(facetsData) {
  const facets = Array.isArray(facetsData.facets) ? facetsData.facets : [];
  const terms = Array.isArray(facetsData.terms) ? facetsData.terms : [];

  if (!Array.isArray(facetsData.facets)) problem("facets.json", "no facets array");
  if (!Array.isArray(facetsData.terms)) problem("facets.json", "no terms array");

  const reqIds = new Set(readRequirements(ROOT).map((r) => r.id));

  const seenFacet = new Set();
  for (const f of facets) {
    const where = `facets.json / ${f.id ?? "(no id)"}`;
    if (!f.id || typeof f.id !== "string") problem(where, "facet has no id");
    else if (seenFacet.has(f.id)) problem(where, "duplicate facet id");
    seenFacet.add(f.id);

    if (!reqIds.has(f.requirementId)) {
      problem(where, `requirementId "${f.requirementId}" is not in lib/data/requirements.ts`);
    }
    if (typeof f.label !== "string" || !f.label) problem(where, "no label");
    if (typeof f.question !== "string" || !f.question) problem(where, "no question");
    if (typeof f.ordered !== "boolean") problem(where, "`ordered` must be true or false");

    const opts = Array.isArray(f.options) ? f.options : [];
    if (opts.length < 2) problem(where, `has ${opts.length} option(s); at least 2 are required`);
    const seenOpt = new Set();
    for (const o of opts) {
      if (!o.id || typeof o.id !== "string") problem(where, "an option has no id");
      else if (seenOpt.has(o.id)) problem(where, `duplicate option id "${o.id}"`);
      seenOpt.add(o.id);
      if (!o.label) problem(where, `option "${o.id}" has no label`);
    }
  }

  for (const r of reqIds) {
    if (!facets.some((f) => f.requirementId === r)) {
      problem(`facets.json / requirement ${r}`, "no facet covers this requirement");
    }
  }

  const seenTerm = new Set();
  for (const t of terms) {
    if (seenTerm.has(t.id)) problem(`facets.json / term ${t.id}`, "duplicate term id");
    seenTerm.add(t.id);
  }
}

// ---- corpus ----------------------------------------------------------------

function readFrontMatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return {};
  return Object.fromEntries(
    m[1]
      .split("\n")
      .map((l) => l.match(/^(\w+):\s*(.*)$/))
      .filter(Boolean)
      .map((x) => [x[1], x[2].trim()]),
  );
}

function stripFrontMatter(md) {
  const m = md.match(/^---\n[\s\S]*?\n---\n/);
  return m ? md.slice(m[0].length) : md;
}

/**
 * Same filter as scripts/check-quotes.mjs: for a bilingual CJK+Latin text only,
 * drop the CJK-dominant lines so the English can be matched contiguously.
 */
function stripCjkLines(text, language = "") {
  const bilingual = /zh/.test(language) && /en/.test(language);
  if (!bilingual) return text;
  const cjk = /[　-〿㐀-䶿一-鿿豈-﫿＀-￯]/g;
  return text
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      return (t.match(cjk) || []).length / t.length < 0.2;
    })
    .join("\n");
}

/**
 * Everything needed to verify quotes for one law, or null when it has no corpus.
 *
 *   scoped     false where provision-level scoping is disabled (Québec's PDF)
 *   index      provision key -> { label, text }, from the same builder as check-citations
 *   provNorm   provision key -> normalised text
 *   fileNorm   the whole corpus file, normalised, front matter removed
 */
function loadCorpus(lawId) {
  const file = join(CORPUS_DIR, `${lawId}.md`);
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, "utf8");
  const meta = readFrontMatter(raw);
  const spec = PROVISION_PATTERNS[lawId];
  const scoped = Boolean(spec) && spec.provisionScoped !== false;
  const index = spec ? buildProvisionIndex(lawId, raw) : new Map();
  const provNorm = new Map();
  for (const [key, p] of index) provNorm.set(key, normalize(p.text));
  const fileNorm = normalize(stripCjkLines(stripFrontMatter(raw), meta.language ?? ""));
  return {
    lawId,
    scoped,
    spec,
    index,
    provNorm,
    fileNorm,
    cjk: /^zh\b/.test(meta.language ?? ""),
  };
}

/**
 * The index-size guard from check-citations.mjs: if the chunker finds far fewer
 * provisions than the source has, scoped checks are meaningless.
 */
function checkIndexHealth(ctx) {
  if (!ctx.scoped) {
    note(
      `${ctx.lawId}: provision scoping is disabled (${ctx.spec?.scopeNote ?? "no provision pattern"}). ` +
        `Quotes are verified against the whole corpus file only.`,
    );
    return;
  }
  if (ctx.index.size < ctx.spec.expectAtLeast) {
    problem(
      `${ctx.lawId}`,
      `indexed only ${ctx.index.size} provisions, expected at least ${ctx.spec.expectAtLeast}; ` +
        `the corpus layout has probably changed, so every provision citation is unverifiable`,
    );
  }
}

// ---- quote verification (the part that matters) ---------------------------

/**
 * Verify a quote against a citation, scoped the way scripts/check-citations.mjs
 * scopes it. Returns true when the quote is accepted. Reports otherwise.
 *
 * Provision-named citations must name only provisions that exist, unless the
 * citation itself declares the provision outside the corpus.
 *
 * A citation that names no provision the checker can read is a FAILURE for an
 * answer on a provision-scoped law: the quote cannot be placed inside a
 * provision. The file-level fallback is kept for a law that is not
 * provision-scoped (quebec-law25), where it applies to every quote, and for
 * term entries (opts.termEntry), where a definition may be cited by a name the
 * parser does not read.
 */
function verifyQuote(where, ctx, citation, quote, opts = {}) {
  const q = normalize(quote);
  if (!q) {
    problem(where, "quote is empty after normalising");
    return false;
  }

  if (!ctx.scoped) {
    if (ctx.fileNorm.includes(q)) return true;
    problem(where, `quote is not verbatim: not found anywhere in corpus/${ctx.lawId}.md`);
    return false;
  }

  const keys = extractCitations(citation, ctx.lawId);
  const declaredOutside = /not (?:held )?in corpus|outside (?:the )?corpus|separate statute/i.test(
    citation ?? "",
  );
  const unknown = keys.filter((k) => !resolveKey(k, ctx.index));
  if (unknown.length && !declaredOutside) {
    problem(
      where,
      `citation names ${unknown.join(", ")}, which is not a provision in corpus/${ctx.lawId}.md ` +
        `(citation: "${citation}")`,
    );
    return false;
  }

  const known = [...new Set(keys.map((k) => resolveKey(k, ctx.index)).filter(Boolean))];
  if (!known.length) {
    if (opts.termEntry) {
      if (ctx.fileNorm.includes(q)) {
        note(`${where}: citation "${citation}" names no provision, so the term quote was checked against the whole file`);
        return true;
      }
      problem(where, `quote is not verbatim: not found anywhere in corpus/${ctx.lawId}.md`);
      return false;
    }
    problem(where, `citation names no provision the checker can read (citation: "${citation}")`);
    return false;
  }

  if (known.some((k) => ctx.provNorm.get(k)?.includes(q))) return true;

  const actual = [...ctx.provNorm.entries()].filter(([, t]) => t.includes(q)).map(([k]) => k);
  if (actual.length) {
    const labels = actual.slice(0, 3).map((k) => ctx.index.get(k)?.label ?? k).join(", ");
    problem(
      where,
      `quote is NOT inside the cited provision (${known.join(", ")}): it is found elsewhere, in ${labels}. ` +
        `Wrong provision: correct the citation or the quote.`,
    );
  } else if (ctx.fileNorm.includes(q)) {
    problem(
      where,
      `quote is NOT inside the cited provision (${known.join(", ")}): it is found elsewhere in the file, ` +
        `but in no indexed provision. Wrong provision, or text the index does not hold.`,
    );
  } else {
    problem(
      where,
      `quote is not verbatim: not found anywhere in corpus/${ctx.lawId}.md (cited ${known.join(", ")})`,
    );
  }
  return false;
}

function quoteLongEnough(quote, cjk) {
  if (cjk) return [...quote.replace(/\s+/g, "")].length >= MIN_QUOTE_CHARS_CJK;
  return normalize(quote).split(" ").filter(Boolean).length >= MIN_QUOTE_WORDS;
}

// ---- one answer ------------------------------------------------------------

function checkAnswer(where, facet, a, ctx, stats) {
  if (!a || typeof a !== "object" || Array.isArray(a)) {
    problem(where, "answer must be an object");
    return;
  }

  const option = facet.options.find((o) => o.id === a.option);
  if (!option) {
    problem(
      where,
      `option "${a.option}" is not one of this facet's options: ${facet.options.map((o) => o.id).join(", ")}`,
    );
  }

  if (typeof a.says !== "string" || !a.says.trim()) {
    problem(where, "`says` is missing or empty");
  } else if (a.says.length > MAX_SAYS) {
    problem(where, `\`says\` is ${a.says.length} characters; the limit is ${MAX_SAYS}`);
  }
  if (a.ownTerm !== undefined && typeof a.ownTerm !== "string") {
    problem(where, "`ownTerm` must be a string when present");
  }

  const silent = option?.silent === true;
  const hasQuote = a.quote !== undefined && a.quote !== null && a.quote !== "";

  if (!silent) {
    if (typeof a.citation !== "string" || !a.citation.trim()) {
      problem(where, `option "${a.option}" is not silent, so a citation is required`);
    }
    if (!hasQuote || typeof a.quote !== "string") {
      problem(where, `option "${a.option}" is not silent, so a quote is required`);
    }
    if (typeof a.quote === "string" && hasQuote) {
      if (!quoteLongEnough(a.quote, ctx?.cjk)) {
        problem(
          where,
          ctx?.cjk
            ? `quote is too short: at least ${MIN_QUOTE_CHARS_CJK} characters are required`
            : `quote is too short: at least ${MIN_QUOTE_WORDS} words are required`,
        );
      }
    }
    if (ctx && typeof a.quote === "string" && typeof a.citation === "string" && a.citation.trim()) {
      stats.quotes++;
      if (verifyQuote(where, ctx, a.citation, a.quote)) stats.verified++;
    }
  } else if (hasQuote) {
    // Silent: a quote is optional, but if present it must at least be in the file.
    if (typeof a.quote !== "string") {
      problem(where, "`quote` must be a string when present");
    } else if (ctx) {
      stats.quotes++;
      const q = normalize(a.quote);
      if (ctx.fileNorm.includes(q)) stats.verified++;
      else problem(where, `quote is not verbatim: not found anywhere in corpus/${ctx.lawId}.md`);
    }
  }
}

function checkTerm(where, termId, t, ctx, stats) {
  if (!t || typeof t !== "object") {
    problem(where, "term entry must be an object");
    return;
  }
  if (t.term === null) {
    if (typeof t.note !== "string" || !t.note.trim()) {
      problem(where, "term is null, so a `note` explaining that the law has no such term is required");
    }
    return;
  }
  if (typeof t.term !== "string" || !t.term.trim()) {
    problem(where, "`term` must be a non-empty string, or null");
    return;
  }
  if (typeof t.citation !== "string" || !t.citation.trim()) problem(where, "a term needs a citation");
  if (typeof t.quote !== "string" || !t.quote.trim()) {
    problem(where, "a term needs a quote");
    return;
  }
  if (!quoteLongEnough(t.quote, ctx?.cjk)) {
    problem(where, "term quote is too short");
  }
  if (ctx && typeof t.citation === "string") {
    stats.quotes++;
    const quoteOk = verifyQuote(where, ctx, t.citation, t.quote, { termEntry: true });
    if (quoteOk) stats.verified++;
    if (!normalize(t.quote).includes(normalize(t.term))) {
      problem(where, `quote does not contain the term "${t.term}"`);
    }
  }
}

// ---- one law ---------------------------------------------------------------

function checkLaw(lawId, facets, termIds, stats) {
  const file = join(ANSWERS_DIR, `${lawId}.json`);
  if (!existsSync(file)) {
    problem(lawId, `no answer file lib/data/facet-answers/${lawId}.json (missing answer file)`);
    return;
  }

  let doc;
  try {
    doc = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    problem(lawId, `answer file is not valid JSON: ${err.message}`);
    return;
  }

  if (doc.lawId !== lawId) {
    problem(lawId, `lawId is "${doc.lawId}" but the file is named ${lawId}.json`);
  }
  if (!doc.answers || typeof doc.answers !== "object" || Array.isArray(doc.answers)) {
    problem(lawId, "`answers` must be an object keyed by facet id");
    return;
  }
  if (!doc.terms || typeof doc.terms !== "object" || Array.isArray(doc.terms)) {
    problem(lawId, "`terms` must be an object keyed by term id");
    return;
  }

  const ctx = loadCorpus(lawId);
  if (!ctx) {
    problem(lawId, `no corpus file corpus/${lawId}.md, so no quote can be verified`);
  } else {
    checkIndexHealth(ctx);
  }

  const facetIds = new Set(facets.map((f) => f.id));
  for (const id of Object.keys(doc.answers)) {
    if (!facetIds.has(id)) problem(`${lawId} / ${id}`, "unknown facet id: not in lib/data/facets.json");
  }

  for (const facet of facets) {
    const where = `${lawId} / ${facet.id}`;
    const a = doc.answers[facet.id];
    if (a === undefined) {
      problem(where, "missing answer");
      continue;
    }
    checkAnswer(where, facet, a, ctx, stats);
  }

  for (const id of Object.keys(doc.terms)) {
    if (!termIds.has(id)) problem(`${lawId} / term ${id}`, "unknown term id: not in lib/data/facets.json");
  }
  for (const id of termIds) {
    const where = `${lawId} / term ${id}`;
    const t = doc.terms[id];
    if (t === undefined) {
      problem(where, "missing term entry");
      continue;
    }
    checkTerm(where, id, t, ctx, stats);
  }

  stats.laws++;
}

// ---- main ------------------------------------------------------------------

function main(argv) {
  const lawFlag = argv.indexOf("--law");
  const onlyLaw = lawFlag !== -1 ? argv[lawFlag + 1] : null;
  if (lawFlag !== -1 && !onlyLaw) {
    console.log("usage: node scripts/check-facets.mjs [--law <lawId>]");
    return 1;
  }

  const facetsData = JSON.parse(readFileSync(FACETS_FILE, "utf8"));
  const facets = Array.isArray(facetsData.facets) ? facetsData.facets : [];
  const termIds = new Set((facetsData.terms ?? []).map((t) => t.id));

  const catalog = catalogLawIds();
  let laws;
  if (onlyLaw) {
    if (!catalog.includes(onlyLaw)) {
      problem(onlyLaw, "not a catalog law: it needs both lib/data/laws/<id>.ts and corpus/<id>.md");
      laws = [];
    } else {
      laws = [onlyLaw];
    }
  } else {
    checkFacetsFile(facetsData);
    laws = catalog;
  }

  const stats = { laws: 0, quotes: 0, verified: 0 };
  for (const lawId of laws) checkLaw(lawId, facets, termIds, stats);

  for (const n of notes) console.log(`- note: ${n}`);
  for (const p of problems) console.log(`- ${p}`);

  const scope = onlyLaw ? `law ${onlyLaw}` : `${laws.length} catalog law(s)`;
  if (problems.length) {
    console.log(
      `\nFAILED: ${problems.length} problem(s) in ${scope}; ${stats.verified}/${stats.quotes} quote(s) verified.`,
    );
    return 1;
  }
  console.log(`\nOK: ${scope} passed; ${stats.verified}/${stats.quotes} quote(s) verified inside their cited provision.`);
  return 0;
}

process.exit(main(process.argv.slice(2)));
