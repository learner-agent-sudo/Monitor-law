// ---------------------------------------------------------------------------
// One reader for the catalog's TypeScript sources.
//
// The build scripts are plain Node and the law files are TypeScript, so the
// mappings are parsed out of the source text rather than imported. That parse
// used to live inside scripts/check-citations.mjs, and a second copy was about
// to appear in the gap-trace scripts.
//
// Two copies of this regex would be a real bug, not just duplication: the
// trace check asserts that EVERY cell without a quote carries a search trace,
// and it can only do that if it agrees with the citation check about which
// cells exist and which of them have quotes. A parser that drifts in one file
// would silently shrink the set of cells being policed. So there is one reader,
// and both checks see the same catalog.
// ---------------------------------------------------------------------------

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PROVISION_PATTERNS } from "./provisions.mjs";

/** Every instrument with an ingested corpus and a chunking rule. */
export const LAW_IDS = Object.keys(PROVISION_PATTERNS);

/**
 * Pull { requirementId, citation, quote, strictness, sourceType } out of one
 * law's TypeScript source.
 *
 * Deliberately shallow: it matches mapping entries at a fixed indentation
 * rather than parsing TypeScript. If a law file is ever reformatted this
 * returns fewer entries, which is why both callers assert a count — a parser
 * that quietly reads nothing would turn every check downstream into a no-op.
 */
export function readMappings(root, lawId) {
  const file = join(root, "lib", "data", "laws", `${lawId}.ts`);
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
      sourceType: body.match(/sourceType:\s*"([a-z-]+)"/)?.[1] ?? "statute",
      obligation:
        body.match(/obligation:\s*\n?\s*"((?:[^"\\]|\\.)*)"/)?.[1]?.replace(/\\"/g, '"') ?? "",
    });
  }
  return out;
}

/**
 * The requirement taxonomy, read the same shallow way.
 *
 * Needed so a trace can point at a NEIGHBOURING requirement by name and the
 * build can confirm that requirement exists — a cross-reference to a row that
 * is not in the taxonomy would send the reader nowhere.
 */
export function readRequirements(root) {
  const src = readFileSync(join(root, "lib", "data", "requirements.ts"), "utf8");
  return [
    ...src.matchAll(/id:\s*"([a-z0-9-]+)",\s*\n\s*category:\s*"([^"]+)",\s*\n\s*name:\s*"([^"]+)"/g),
  ].map((m) => ({ id: m[1], category: m[2], name: m[3] }));
}

/**
 * Does this cell need a search trace?
 *
 * The test is the absence of a quote, not a low strictness score. Every cell
 * that quotes the statute is already evidenced at provision level by
 * scripts/check-citations.mjs; every cell that does not is making a claim with
 * nothing behind it, whatever number it carries. Tying the requirement to
 * strictness would let a future strictness-3 assertion with no quote escape
 * both checks.
 */
export function needsTrace(mapping) {
  return !mapping.quote;
}
