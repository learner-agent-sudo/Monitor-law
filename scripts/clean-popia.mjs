#!/usr/bin/env node
/**
 * Clean the POPIA gazette conversion into corpus/popia.md.
 *
 * The source is the Government Gazette PDF converted to Markdown. Its printing
 * artifacts (publisher's note, a stray Afrikaans page, running headers, page
 * numbers, and margin line numbers that the conversion appended to text lines)
 * are removed here. No word of the law is changed: the script records every
 * removal in corpus/popia.cleaning-log.txt, and before it writes anything it
 * proves that the word sequence of the output equals the word sequence of the
 * input with exactly the logged removals taken out.
 *
 * Usage: node scripts/clean-popia.mjs <source.md> corpus/popia.md
 *
 * Writes corpus/popia.md and, next to it, popia.cleaning-log.txt.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const [, , SRC, OUT] = process.argv;
if (!SRC || !OUT) {
  console.error("Usage: node scripts/clean-popia.mjs <source.md> corpus/popia.md");
  process.exit(2);
}

function fail(msg) {
  console.error(`clean-popia: FAILED: ${msg}`);
  process.exit(1);
}
function assert(cond, msg) {
  if (!cond) fail(msg);
}

const FRONT_MATTER = `---
lawId: popia
title: Protection of Personal Information Act 4 of 2013 (POPIA)
jurisdiction: ZA
sourceUrl: https://www.gov.za/documents/protection-personal-information-act
retrieved: 2026-11-13
versionNote: Act No. 4 of 2013 as published in Government Gazette No. 37067, 26 November 2013 (English text). Not amended since; the Regulations (outside this file) were amended on 17 April 2025. Commencement: ss.1, 39-54, 112-113 on 11 April 2014; ss.2-38, 55-109, 111, 114(1)-(3) on 1 July 2020; ss.110 and 114(4) on 30 June 2021.
language: en
official: true
textQuality: English pages of the official Gazette PDF. Printing artifacts removed by scripts/clean-popia.mjs (page headers, page numbers, margin line numbers, one stray Afrikaans page); wording unchanged. See corpus/popia.cleaning-log.txt.
---
`;

// ---------------------------------------------------------------------------
// Read the source. Line endings and trailing spaces are checked, not assumed.
// ---------------------------------------------------------------------------
const raw = readFileSync(SRC, "utf8");
assert(!raw.includes("\r"), "source contains carriage returns; expected Unix newlines");
const src = raw.split("\n");
if (src[src.length - 1] === "") src.pop(); // the trailing newline, restored on output
assert(!src.some((l) => /[ \t]$/.test(l)), "source has trailing whitespace; expected none");

const removed = new Map(); // source index -> { rule, text }
const trailing = new Map(); // source index -> { n, before, after, kind }
const ambiguous = []; // { idx, text, reason }
const log = []; // human-readable log lines, in source order
const counts = {
  note: 0,
  afrikaansLines: 0,
  gazetteHeaders: 0,
  actHeaders: 0,
  aidsHeaders: 0,
  pageNumbers: 0,
  marginNumbers: 0,
};

function lineNo(i) {
  return String(i + 1).padStart(5, " ");
}
function markWhole(i, rule, text) {
  removed.set(i, { rule, text });
  log.push(`src line ${lineNo(i)} | ${rule.padEnd(24)} | removed: "${text}"`);
}

// ---------------------------------------------------------------------------
// Rule 1. The publisher's four-line note at the top, and the blank line after.
// ---------------------------------------------------------------------------
assert(
  src[0].startsWith("Please note that most Acts are published") &&
    src[3] === "language is printed on uneven numbered pages." &&
    src[4] === "",
  "publisher's note is not where expected at the top of the file",
);
for (let i = 0; i <= 4; i++) {
  markWhole(i, "1 publisher note", src[i]);
  counts.note++;
}

// ---------------------------------------------------------------------------
// Rule 2. The stray Afrikaans page: from the line exactly
// "GOVERNMENT GAZETTE, 26 November 2013 No. 37067 17" up to, not including,
// the line starting "18 No. 37067 GOVERNMENT GAZETTE".
// ---------------------------------------------------------------------------
const AF_START_TEXT = "GOVERNMENT GAZETTE, 26 November 2013 No. 37067 17";
const afStarts = src.map((l, i) => (l === AF_START_TEXT ? i : -1)).filter((i) => i !== -1);
assert(afStarts.length === 1, `expected one Afrikaans page start, found ${afStarts.length}`);
const afStart = afStarts[0];
const afEnd = src.findIndex((l, i) => i > afStart && l.startsWith("18 No. 37067 GOVERNMENT GAZETTE"));
assert(afEnd !== -1, "Afrikaans page end (18 No. 37067 header) not found");

// English text on both sides of the removed page must be intact.
const prevNonEmpty = [...src.slice(0, afStart)].reverse().find((l) => l.trim() !== "");
assert(
  prevNonEmpty.startsWith("3. (1) This Act applies to the processing of personal information"),
  `English page before the Afrikaans page does not end where expected: "${prevNonEmpty}"`,
);
const isHeaderish = (l) =>
  /^\d+ No\. 37067 GOVERNMENT GAZETTE, 26 November 2013$/.test(l) ||
  /^Act No\. 4 of 2013 Protection of Personal Information Act, 2013$/.test(l) ||
  /^\s*\d+\s*$/.test(l) ||
  l.trim() === "";
const nextContent = src.slice(afEnd).find((l) => !isHeaderish(l));
assert(
  nextContent !== undefined && nextContent.startsWith("(a) entered in a record by or for a responsible party"),
  `English page after the Afrikaans page does not start where expected: "${nextContent}"`,
);

for (let i = afStart; i < afEnd; i++) {
  markWhole(i, "2 afrikaans page", src[i]);
  counts.afrikaansLines++;
}

// ---------------------------------------------------------------------------
// Rule 3. Running headers, and the page number that follows each header.
// ---------------------------------------------------------------------------
const GAZETTE_HEADER = /^\d+ No\. 37067 GOVERNMENT GAZETTE, 26 November 2013$/;
const ACT_HEADER = /^Act No\. 4 of 2013 Protection of Personal Information Act, 2013$/;
const AIDS_HEADER = "### AIDS HELPLINE: 0800-123-22 Prevention is the cure";

const gazetteIdx = [];
const actIdx = [];
const aidsIdx = [];
src.forEach((l, i) => {
  if (removed.has(i)) return;
  if (GAZETTE_HEADER.test(l)) gazetteIdx.push(i);
  if (ACT_HEADER.test(l)) actIdx.push(i);
  if (l === AIDS_HEADER) aidsIdx.push(i);
});
assert(gazetteIdx.length === 74, `expected 74 gazette running headers, found ${gazetteIdx.length}`);
assert(actIdx.length === 74, `expected 74 Act running headers, found ${actIdx.length}`);
assert(aidsIdx.length === 1, `expected 1 AIDS HELPLINE line, found ${aidsIdx.length}`);

for (const i of gazetteIdx) {
  markWhole(i, "3 page header", src[i]);
  counts.gazetteHeaders++;
}
for (const i of actIdx) {
  markWhole(i, "3 page header", src[i]);
  counts.actHeaders++;
}
for (const i of aidsIdx) {
  markWhole(i, "3 page header", src[i]);
  counts.aidsHeaders++;
}

// A line that is only a number, within 3 lines after a header, is the page number.
const headerIdx = [...gazetteIdx, ...actIdx, ...aidsIdx].sort((a, b) => a - b);
for (const h of headerIdx) {
  for (let j = h + 1; j <= h + 3 && j < src.length; j++) {
    if (removed.has(j)) continue;
    if (/^\s*\d+\s*$/.test(src[j])) {
      markWhole(j, "3 page number", src[j]);
      counts.pageNumbers++;
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Page membership, used by the margin sequence guard below. Margin numbers are
// printed in fives and restart on every page, so within one page they can only
// increase. A candidate that breaks that order is not treated as a margin
// number; it is kept and listed for review.
// ---------------------------------------------------------------------------
const pageOf = new Array(src.length);
{
  let page = 0;
  src.forEach((l, i) => {
    if (gazetteIdx.includes(i)) page++;
    pageOf[i] = page;
  });
}

// ---------------------------------------------------------------------------
// Rule 4. Margin line numbers appended to the end of text lines.
// The stream is the text that survives rules 1-3, so "next line" means the next
// line of the law, not a header or page number.
// ---------------------------------------------------------------------------
const stream = [];
src.forEach((l, i) => {
  if (!removed.has(i)) stream.push(i);
});
const nextContentLine = (k) => {
  for (let j = k + 1; j < stream.length; j++) {
    const t = src[stream[j]];
    if (t.trim() !== "") return t;
  }
  return undefined;
};

const MARGIN_NUMBERS = new Set([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
const REFERENCE_WORDS = new Set([
  "section", "sections", "subsection", "subsections", "paragraph", "paragraphs",
  "item", "items", "chapter", "part", "regulation", "regulations", "article",
  "articles", "schedule", "no.", "act",
]);
const lastMargin = new Map(); // page -> highest margin number removed so far on that page

stream.forEach((i, k) => {
  const text = src[i];

  // Heading lines: "CHAPTER 3 15", "Condition 7 5", "Part B 15". The keyword and
  // its number are the heading; a trailing multiple of five is the margin. A
  // heading with only one token after the keyword ("CHAPTER 5", "Condition 5")
  // matches nothing here and is kept.
  const h = text.match(/^((?:CHAPTER|Condition|Part)[ \t]+\S+)[ \t]+(\d+)$/i);
  if (h && MARGIN_NUMBERS.has(Number(h[2]))) {
    const n = Number(h[2]);
    trailing.set(i, { n, before: text, after: h[1], kind: "margin" });
    counts.marginNumbers++;
    log.push(
      `src line ${lineNo(i)} | 4 margin number       | "${text}" -> "${h[1]}" | heading number followed by margin number`,
    );
    return;
  }

  const m = text.match(/^(.*[^\s\d])[ \t]+(\d+)$/);
  if (!m) return;
  const n = Number(m[2]);
  if (!MARGIN_NUMBERS.has(n)) return;

  const prefix = m[1];
  const lastWord = prefix.split(/\s+/).pop().toLowerCase().replace(/^[(‘“"']+/, "");
  const page = pageOf[i];
  const after = prefix.replace(/[ \t]+$/, "");
  const record = (kind, reason) => {
    if (kind === "remove") {
      trailing.set(i, { n, before: text, after, kind: "margin" });
      counts.marginNumbers++;
      log.push(
        `src line ${lineNo(i)} | 4 margin number       | "${text}" -> "${after}" | ${reason}`,
      );
    } else {
      ambiguous.push({ idx: i, text, reason });
    }
  };

  // South African drafting always letters paragraphs and numbers subsections in
  // brackets ("(a)", "(1)"), so "paragraph 40" or "subsection 25" at the end of
  // a line can only be a margin number.
  if (["paragraph", "paragraphs", "subsection", "subsections"].includes(lastWord)) {
    record("remove", "paragraph/subsection word: always a margin number");
    return;
  }

  if (REFERENCE_WORDS.has(lastWord)) {
    const next = nextContentLine(k);
    if (next !== undefined && /^\d/.test(next)) {
      // Real reference continues on the next line; the trailing number is the margin.
      if ((lastMargin.get(page) ?? 0) >= n) {
        record("keep", "reference word and continuation, but margin sequence broken");
      } else {
        lastMargin.set(page, n);
        record("remove", "reference word + continuation digit");
      }
    } else {
      record("keep", "reference word, next line does not start with a digit");
    }
    return;
  }

  if ((lastMargin.get(page) ?? 0) >= n) {
    record("keep", "not a reference word; margin sequence broken on this page");
    return;
  }
  lastMargin.set(page, n);
  record("remove", "margin number");
});

// ---------------------------------------------------------------------------
// Build the output and prove that only the logged tokens are gone.
// ---------------------------------------------------------------------------
// Removed lines can leave runs of blank lines behind. Collapsing a run to one
// blank line is whitespace only: no word changes and nothing is logged.
const kept = [];
src.forEach((l, i) => {
  if (removed.has(i)) return;
  const t = trailing.get(i);
  const text = t ? t.after : l;
  if (text === "" && kept.length && kept[kept.length - 1] === "") return;
  kept.push(text);
});

const body = kept.join("\n") + "\n";
const out = FRONT_MATTER + "\n" + body;

const tok = (s) => s.split(/\s+/).filter(Boolean);
const expectedTokens = [];
src.forEach((l, i) => {
  if (removed.has(i)) return;
  const words = tok(l);
  const t = trailing.get(i);
  if (t) {
    assert(words[words.length - 1] === String(t.n), `token mismatch at line ${i + 1}`);
    words.pop();
  }
  expectedTokens.push(...words);
});
const outTokens = tok(body);
assert(
  outTokens.length === expectedTokens.length &&
    outTokens.every((w, j) => w === expectedTokens[j]),
  "word-sequence self-check failed: output differs from input beyond the logged removals",
);

const MARKER = /\b(hierdie Wet|HOOFSTUK|persoonlike inligting)\b/;
assert(!MARKER.test(body), "an Afrikaans marker remains in the output");

// ---------------------------------------------------------------------------
// Write the corpus file and the audit log.
// ---------------------------------------------------------------------------
writeFileSync(OUT, out);

const ambiguousLines = ambiguous.map(
  (a) => `src line ${lineNo(a.idx)} | ambiguous, kept        | "${a.text}" | ${a.reason}`,
);
const summary = [
  "POPIA cleaning log",
  `source file: ${basename(SRC)}`,
  `output file: ${basename(OUT)}`,
  "Only printing artifacts are removed. No word of the law is changed.",
  "Line numbers below are 1-based line numbers in the source file.",
  "",
  "Counts",
  `  publisher note lines removed:     ${counts.note}`,
  `  Afrikaans page lines removed:     ${counts.afrikaansLines}`,
  `  gazette running headers removed:  ${counts.gazetteHeaders}`,
  `  Act running headers removed:      ${counts.actHeaders}`,
  `  AIDS HELPLINE lines removed:      ${counts.aidsHeaders}`,
  `  page numbers removed:             ${counts.pageNumbers}`,
  `  margin line numbers removed:      ${counts.marginNumbers}`,
  `  ambiguous, kept:                  ${ambiguous.length}`,
  "",
  "Removals",
  ...log,
  "",
  "Ambiguous, kept (for human review)",
  ...(ambiguousLines.length ? ambiguousLines : ["  none"]),
  "",
];
const logPath = join(dirname(OUT), basename(OUT).replace(/\.md$/, "") + ".cleaning-log.txt");
writeFileSync(logPath, summary.join("\n") + "\n");

console.log(
  [
    `wrote ${OUT}`,
    `wrote ${logPath}`,
    `header lines removed:      ${counts.gazetteHeaders + counts.actHeaders + counts.aidsHeaders}` +
      ` (gazette ${counts.gazetteHeaders}, act ${counts.actHeaders}, aids ${counts.aidsHeaders})`,
    `page numbers removed:      ${counts.pageNumbers}`,
    `margin numbers removed:    ${counts.marginNumbers}`,
    `ambiguous, kept:           ${ambiguous.length}`,
    `afrikaans lines removed:   ${counts.afrikaansLines}`,
    `publisher note lines:      ${counts.note}`,
    "word-sequence self-check:  passed",
  ].join("\n"),
);
