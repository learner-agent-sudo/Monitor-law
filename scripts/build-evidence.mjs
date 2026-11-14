#!/usr/bin/env node
/**
 * Builds the evidence files behind every citation the site shows.
 *
 * For each law, lib/data/evidence/<lawId>.json holds one item per quoted
 * finding: the passage of the law's own text (from corpus/<lawId>.md) that the
 * finding rests on, with the quoted words marked. The site shows this on hover,
 * focus or tap (app/components/LawCite.tsx), so a reader can check a finding
 * against the law without leaving the page.
 *
 * Keys:
 *   f:<facetId>        a point-of-comparison answer (lib/data/facet-answers)
 *   t:<termId>         a term entry (lib/data/facet-answers, terms)
 *   m:<requirementId>  a requirement-level mapping (lib/data/laws/<lawId>.ts)
 *
 * Only entries that carry a quote get an item.
 *
 * Usage:
 *   node scripts/build-evidence.mjs           write the files and print a table
 *   node scripts/build-evidence.mjs --check   rebuild in memory; exit 1 if any
 *                                             file on disk differs (stale evidence)
 *
 * Exit status 1 when a facet-answer (f:) quote cannot be located in its law's
 * text, or, with --check, when an evidence file is missing or stale. Term and
 * mapping quotes that cannot be located are reported but do not fail.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildProvisionIndex,
  extractCitations,
  resolveKey,
  PROVISION_PATTERNS,
} from "../lib/provisions.mjs";
import { readMappings } from "../lib/law-source.mjs";
import { readFrontMatter, stripFrontMatter, stripCjkLines } from "../lib/corpus-text.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS_DIR = join(ROOT, "corpus");
const ANSWERS_DIR = join(ROOT, "lib", "data", "facet-answers");
const EVIDENCE_DIR = join(ROOT, "lib", "data", "evidence");
const FACETS_FILE = join(ROOT, "lib", "data", "facets.json");

/**
 * The laws to build: every answer file in lib/data/facet-answers, named by the
 * lawId inside it. A law with no corpus/<lawId>.md is skipped with a note, not
 * treated as an error, so a law can be added before its text is ingested.
 */
function lawIds() {
  const ids = [];
  for (const file of readdirSync(ANSWERS_DIR).filter((f) => f.endsWith(".json")).sort()) {
    const doc = JSON.parse(readFileSync(join(ANSWERS_DIR, file), "utf8"));
    const lawId = doc.lawId ?? file.replace(/\.json$/, "");
    if (!existsSync(join(CORPUS_DIR, `${lawId}.md`))) {
      console.log(`- note: ${lawId}: no corpus/${lawId}.md, so no evidence file was built for it`);
      continue;
    }
    ids.push(lawId);
  }
  return ids;
}

/** Excerpts: a chunk this short is shown whole; longer ones are cut around the match. */
const WHOLE_LIMIT = 1400;
const SIDE = 420;
/** How far a cut may move to reach a word boundary. */
const WORD_SEARCH = 40;

// ---- display text ----------------------------------------------------------

/**
 * The text a reader sees: front matter removed, CJK-only lines dropped for a
 * bilingual file, markdown links and emphasis removed, and the line breaks of
 * the source turned into spaces, with a single "\n" between paragraphs.
 */
function displayText(raw, language = "") {
  let t = stripCjkLines(stripFrontMatter(raw), language).replace(/\r\n?/g, "\n");
  t = t
    .replace(/\[([^\]\n]*)\]\([^)\n]*\)/g, "$1") // [text](url) -> text
    .replace(/\*\*|__/g, "") // bold markers
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "") // heading markers
    .replace(/^[ \t]*[-*][ \t]+/gm, "") // list markers: "-   ", "*   "
    .replace(/[ \t]+/g, " ") // runs of spaces and tabs
    .replace(/ ?\n ?\n[ \n]*/g, "\n") // paragraph break (2+ newlines) -> one "\n"
    .replace(/-[ \t]*\n[ \t]*/g, "-") // a hyphenated line end keeps its hyphen
    .replace(/ ?\n ?/g, " ") // single newlines -> space
    .trim();
  return t;
}

// ---- fingerprint -----------------------------------------------------------

/**
 * The letters and digits of a text, lower-cased and compatibility-folded, with
 * a map from each fingerprint position back to the text index it came from.
 * Punctuation, quotation marks, dashes, spacing and line breaks are ignored, so
 * a quote matches through line wrapping, hyphenation and markdown differences.
 */
const KEEP = /[\p{L}\p{N}]/u;

function fingerprint(text) {
  let fp = "";
  const starts = [];
  const ends = [];
  let i = 0;
  for (const ch of text) {
    const at = i;
    i += ch.length;
    for (const folded of ch.normalize("NFKD").toLowerCase()) {
      if (!KEEP.test(folded)) continue;
      fp += folded;
      for (let u = 0; u < folded.length; u++) {
        starts.push(at);
        ends.push(i);
      }
    }
  }
  return { fp, starts, ends };
}

/** Locate a quote in a display text: { start, end } as indices into the display text, or null. */
function locate(chunk, quote) {
  const q = fingerprint(quote).fp;
  if (!q) return null;
  const k = chunk.fp.fp.indexOf(q);
  if (k === -1) return null;
  return { start: chunk.fp.starts[k], end: chunk.fp.ends[k + q.length - 1] };
}

// ---- excerpt ---------------------------------------------------------------

/** Move a cut forward to the start of the next word (within WORD_SEARCH characters). */
function wordAfter(text, pos) {
  for (let i = pos; i < Math.min(text.length, pos + WORD_SEARCH); i++) {
    if (/\s/.test(text[i])) return i + 1;
  }
  return pos;
}

/** Move a cut back to the last word break before pos, not before floor. */
function wordBefore(text, pos, floor) {
  for (let i = pos - 1; i > Math.max(floor, pos - WORD_SEARCH); i--) {
    if (/\s/.test(text[i])) return i;
  }
  return pos;
}

/**
 * Cut the text around [start, end). Short text is shown whole. Long text keeps
 * up to SIDE characters either side, cut at a word boundary where there is one
 * (CJK has none, so it is cut by character).
 */
function excerpt(display, start, end) {
  const match = display.slice(start, end);
  if (display.length <= WHOLE_LIMIT) {
    return {
      before: display.slice(0, start),
      match,
      after: display.slice(end),
      cutStart: false,
      cutEnd: false,
    };
  }
  let from = Math.max(0, start - SIDE);
  let cutStart = false;
  if (from > 0) {
    from = wordAfter(display, from);
    cutStart = true;
  }
  let to = Math.min(display.length, end + SIDE);
  let cutEnd = false;
  if (to < display.length) {
    to = wordBefore(display, to, end);
    cutEnd = true;
  }
  return {
    before: display.slice(from, start),
    match,
    after: display.slice(end, to),
    cutStart,
    cutEnd,
  };
}

/**
 * Take the quote's surrounding opening and closing punctuation into the match,
 * so a quotation mark or full stop is highlighted with the words it belongs to.
 */
function widen(display, start, end) {
  let s = start;
  let e = end;
  while (s > 0 && s > start - 2 && /[“‘"'(\[«]/.test(display[s - 1])) s--;
  while (e < display.length && e < end + 2 && /[.,;:!?)\]”’"'»]/.test(display[e])) e++;
  return { start: s, end: e };
}

// ---- one law ---------------------------------------------------------------

function loadCorpus(lawId) {
  const raw = readFileSync(join(CORPUS_DIR, `${lawId}.md`), "utf8");
  const language = readFrontMatter(raw).language ?? "";
  const spec = PROVISION_PATTERNS[lawId];
  const scoped = Boolean(spec) && spec.provisionScoped !== false;
  const index = scoped ? buildProvisionIndex(lawId, raw) : new Map();
  const chunks = new Map();
  for (const [key, p] of index) {
    const display = displayText(p.text, language);
    chunks.set(key, { label: p.label, display, fp: fingerprint(display) });
  }
  const whole = displayText(raw, language);
  return { scoped, index, chunks, whole: { label: null, display: whole, fp: fingerprint(whole) } };
}

/** Where a quote is found: the cited provisions first, then any provision, then the whole file. */
function findPassage(lawId, corpus, citation, quote) {
  if (corpus.scoped) {
    const cited = [
      ...new Set(
        extractCitations(citation, lawId)
          .map((k) => resolveKey(k, corpus.index))
          .filter(Boolean),
      ),
    ];
    for (const key of cited) {
      const chunk = corpus.chunks.get(key);
      const at = chunk && locate(chunk, quote);
      if (at) return { chunk, at, scope: "provision", where: "cited" };
    }
    for (const chunk of corpus.chunks.values()) {
      const at = locate(chunk, quote);
      if (at) return { chunk, at, scope: "provision", where: "other" };
    }
  }
  const at = locate(corpus.whole, quote);
  if (at) return { chunk: corpus.whole, at, scope: "file", where: "file" };
  return null;
}

function collectQuotes(lawId) {
  const out = [];
  const answers = JSON.parse(readFileSync(join(ANSWERS_DIR, `${lawId}.json`), "utf8"));
  for (const [facetId, a] of Object.entries(answers.answers ?? {})) {
    if (typeof a?.quote === "string" && a.quote.trim()) {
      out.push({ key: `f:${facetId}`, citation: a.citation ?? "", quote: a.quote });
    }
  }
  for (const [termId, t] of Object.entries(answers.terms ?? {})) {
    if (typeof t?.quote === "string" && t.quote.trim()) {
      out.push({ key: `t:${termId}`, citation: t.citation ?? "", quote: t.quote });
    }
  }
  for (const m of readMappings(ROOT, lawId)) {
    if (!m.quote) continue;
    let quote;
    try {
      quote = JSON.parse(`"${m.quote}"`);
    } catch {
      throw new Error(`${lawId}: mapping ${m.requirementId} has a quote that is not a JSON-escaped string`);
    }
    out.push({ key: `m:${m.requirementId}`, citation: m.citation ?? "", quote });
  }
  return out;
}

/** Build one law's evidence document. Returns { text, stats, failures }. */
function buildLaw(lawId) {
  const corpus = loadCorpus(lawId);
  const items = {};
  const stats = { items: 0, cited: 0, other: 0, file: 0, quoteOnly: 0 };
  const failures = [];

  for (const q of collectQuotes(lawId)) {
    const found = findPassage(lawId, corpus, q.citation, q.quote);
    stats.items++;
    if (!found) {
      stats.quoteOnly++;
      if (q.key.startsWith("f:")) failures.push(q.key);
      items[q.key] = {
        citation: q.citation,
        provision: null,
        scope: "quote-only",
        before: "",
        match: q.quote,
        after: "",
        cutStart: false,
        cutEnd: false,
      };
      continue;
    }
    if (found.where === "cited") stats.cited++;
    else if (found.where === "other") stats.other++;
    else stats.file++;

    const { start, end } = widen(found.chunk.display, found.at.start, found.at.end);
    const ex = excerpt(found.chunk.display, start, end);
    items[q.key] = {
      citation: q.citation,
      provision: found.scope === "provision" ? found.chunk.label : null,
      scope: found.scope,
      before: ex.before,
      match: ex.match,
      after: ex.after,
      cutStart: ex.cutStart,
      cutEnd: ex.cutEnd,
    };
  }

  const text = JSON.stringify({ lawId, items }, null, 2) + "\n";
  return { text, stats, failures };
}

// ---- main ------------------------------------------------------------------

function main(argv) {
  const check = argv.includes("--check");
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const results = lawIds().map((lawId) => ({ lawId, ...buildLaw(lawId) }));
  const problems = [];

  if (check) {
    for (const r of results) {
      const file = join(EVIDENCE_DIR, `${r.lawId}.json`);
      const onDisk = existsSync(file) ? readFileSync(file, "utf8") : null;
      if (onDisk !== r.text) {
        problems.push(
          `lib/data/evidence/${r.lawId}.json is ${onDisk === null ? "missing" : "stale"}; ` +
            `run: npm run build:evidence`,
        );
      }
    }
  } else {
    for (const r of results) writeFileSync(join(EVIDENCE_DIR, `${r.lawId}.json`), r.text);
  }

  const head = ["law", "items", "cited", "other", "file", "quote-only", "KB"];
  const rows = results.map((r) => [
    r.lawId,
    r.stats.items,
    r.stats.cited,
    r.stats.other,
    r.stats.file,
    r.stats.quoteOnly,
    (Buffer.byteLength(r.text) / 1024).toFixed(1),
  ]);
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((row) => String(row[i]).length)));
  const line = (cells) => cells.map((c, i) => (i === 0 ? String(c).padEnd(widths[i]) : String(c).padStart(widths[i]))).join("  ");
  console.log(
    `${check ? "Checked" : "Wrote"} evidence for ${results.length} laws. ` +
      `cited = located in a cited provision; other = in another provision; ` +
      `file = found by searching the whole file; quote-only = not located.`,
  );
  console.log(line(head));
  for (const row of rows) console.log(line(row));

  for (const r of results) {
    if (r.stats.quoteOnly && r.failures.length === 0) {
      console.log(`- note: ${r.lawId}: ${r.stats.quoteOnly} term or mapping quote(s) not located (reported, not failing)`);
    }
    for (const key of r.failures) problems.push(`${r.lawId} / ${key}: facet-answer quote could not be located in the law text`);
  }

  for (const p of problems) console.log(`- ${p}`);
  if (problems.length) {
    console.log(`\nFAILED: ${problems.length} problem(s).`);
    return 1;
  }
  console.log(check ? "\nOK: evidence files are current." : "\nOK: evidence written.");
  return 0;
}

process.exit(main(process.argv.slice(2)));
