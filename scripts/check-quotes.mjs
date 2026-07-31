#!/usr/bin/env node
/**
 * Quote anchoring — the guarantee that makes this catalog trustworthy.
 *
 * Once a law's text is in corpus/<lawId>.md, every obligation mapping that
 * carries a `quote` must reproduce that quote VERBATIM from the corpus. If a
 * quote cannot be found, the build fails.
 *
 * This is what separates a claim from a citation: an AI can invent an
 * obligation, but it cannot invent a sentence into a file you downloaded
 * yourself. Unlike scripts/verify-sources.mjs (which needs the network and
 * only proves a page exists), this check is exact, offline, and deterministic.
 *
 * Statuses reported per law:
 *   no corpus       corpus/<lawId>.md absent — mappings remain AI-drafted
 *   unanchored      corpus present, but mappings carry no quotes yet
 *   anchored        every quote verified verbatim against the corpus
 *
 * Usage: node scripts/check-quotes.mjs
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS_DIR = join(ROOT, "corpus");
const LAWS_DIR = join(ROOT, "lib", "data", "laws");

/**
 * Normalize for comparison. Legal texts are riddled with typographic quotes,
 * non-breaking spaces, soft hyphens and inconsistent line wrapping; comparing
 * raw strings would produce false failures that train you to ignore the check.
 * Whitespace and punctuation shape are normalized — wording is not.
 */
function normalize(text) {
  return text
    .replace(/­/g, "")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/[    ]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

/** Strip the YAML-ish metadata block so it can't accidentally satisfy a quote. */
function stripFrontMatter(md) {
  const m = md.match(/^---\n[\s\S]*?\n---\n/);
  return m ? md.slice(m[0].length) : md;
}

function readFrontMatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return {};
  return Object.fromEntries(
    m[1]
      .split("\n")
      .map((l) => l.match(/^([\w]+):\s*(.*)$/))
      .filter(Boolean)
      .map((x) => [x[1], x[2].trim()]),
  );
}

/** Pull { requirementId, quote, citation } triples out of a law's TS source. */
function extractQuotes(src) {
  const out = [];
  // Match each mapping block. Keys appear both quoted ("rights-access") and as
  // bare identifiers (consent, dpia, security) — missing the bare form silently
  // skips those mappings, which is worse than a false failure. Anchoring to the
  // 4-space mapping indent keeps the enclosing `mappings: {` from matching.
  const re =
    /\n {4}(?:"([a-z0-9-]+)"|([a-zA-Z_$][\w$]*))\s*:\s*\{([\s\S]*?)\n {4}\}/g;
  let m;
  while ((m = re.exec(src))) {
    const requirementId = m[1] ?? m[2];
    const body = m[3];
    // Match the string literal itself (handling escapes) rather than relying on
    // what follows it — a trailing comma or newline may fall outside the block.
    const rawQuote = body.match(/quote:\s*"((?:[^"\\]|\\.)*)"/)?.[1];
    const quote = rawQuote?.replace(/\\"/g, '"').replace(/\\n/g, " ").replace(/\\\\/g, "\\");
    const citation = body.match(/citation:\s*"([^"]*)"/)?.[1] ?? "";
    if (quote) out.push({ requirementId, quote, citation });
  }
  return out;
}

const lawFiles = existsSync(LAWS_DIR)
  ? readdirSync(LAWS_DIR).filter((f) => f.endsWith(".ts"))
  : [];

const rows = [];
let failures = 0;

for (const file of lawFiles) {
  const src = readFileSync(join(LAWS_DIR, file), "utf8");
  const lawId = src.match(/id:\s*"([^"]+)"/)?.[1] ?? file.replace(/\.ts$/, "");
  const corpusPath = join(CORPUS_DIR, `${lawId}.md`);

  if (!existsSync(corpusPath)) {
    rows.push({ lawId, state: "no corpus", detail: `add corpus/${lawId}.md — see corpus/SOURCES.md` });
    continue;
  }

  const raw = readFileSync(corpusPath, "utf8");
  const meta = readFrontMatter(raw);
  const haystack = normalize(stripFrontMatter(raw));
  const quotes = extractQuotes(src);

  if (quotes.length === 0) {
    rows.push({
      lawId,
      state: "unanchored",
      detail: `corpus present (${meta.retrieved ?? "no date"}) but no quotes yet`,
    });
    continue;
  }

  const missing = quotes.filter((q) => !haystack.includes(normalize(q.quote)));
  if (missing.length) {
    failures += missing.length;
    for (const q of missing) {
      rows.push({
        lawId,
        state: "QUOTE NOT FOUND",
        detail: `${q.requirementId} (${q.citation}): "${q.quote.slice(0, 70)}…"`,
      });
    }
  } else {
    rows.push({
      lawId,
      state: "anchored",
      detail: `${quotes.length}/${quotes.length} quotes verified against corpus`,
    });
  }
}

const lines = ["# Quote anchoring\n", "| Law | State | Detail |", "| --- | ----- | ------ |"];
for (const r of rows) lines.push(`| \`${r.lawId}\` | ${r.state} | ${r.detail} |`);
lines.push(
  `\n**${failures}** unverifiable quote(s). A quote that cannot be found in the corpus is ` +
    `either misquoted or invented — both are content errors.\n`,
);
lines.push(
  "> Anchoring proves a mapping reproduces the statute's own words. It does **not** prove the " +
    "surrounding interpretation is correct.",
);

const summary = lines.join("\n");
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

process.exit(failures > 0 ? 1 : 0);
