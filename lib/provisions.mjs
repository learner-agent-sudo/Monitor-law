// ---------------------------------------------------------------------------
// Article-aware chunking and the provision index.
//
// WHY THIS EXISTS
//
// Until now, quote verification searched the WHOLE statute file. A quote taken
// verbatim from Art. 30 would pass while being cited as Art. 37, because both
// live in gdpr.md. That is the exact shape of the classic failure: a real
// number from the right statute attached to the wrong obligation. Verifying at
// file level cannot catch it; verifying at provision level makes it impossible.
//
// So every corpus file is split into provisions — one article or section per
// chunk, keyed by its own number — and both controls run against the specific
// provision a mapping cites, not against the document.
//
// PER-INSTRUMENT PATTERNS, NOT A GENERIC SPLITTER
//
// Legislation is not uniformly formatted and a character-count splitter slices
// through the middle of articles, which is precisely what makes provision-level
// citation impossible. Each instrument therefore gets a rule matched to how its
// official text is actually laid out. Counts are asserted in
// scripts/build-provisions.mjs so a source that changes shape fails loudly
// rather than silently indexing nothing.
// ---------------------------------------------------------------------------

/**
 * How each ingested instrument marks the start of a provision.
 *
 *   match   regex with a capture group holding the provision number
 *   key     turns that number into the index key
 *   label   human-readable form, for display and error messages
 */
export const PROVISION_PATTERNS = {
  gdpr: {
    match: /^[ \t]*(?:#{1,6}[ \t]*)?Article[ \t]+(\d+)[ \t]*$/gim,
    key: (n) => `art-${n}`,
    label: (n) => `Article ${n}`,
    expectAtLeast: 90, // GDPR has 99 articles
  },
  "uk-gdpr": {
    match: /^[ \t]*(?:#{1,6}[ \t]*)?Article[ \t]+(\d+)[ \t]*$/gim,
    key: (n) => `art-${n}`,
    label: (n) => `Article ${n}`,
    // The retained UK text omits Arts. 61, 63-66, 68-73, 75 and 92 (the EU
    // cooperation, consistency and EDPB machinery), so 99 is not the target.
    expectAtLeast: 85,
  },
  pipl: {
    // The Chinese text numbers articles as 第十三条 ("Article 13").
    match: /^[ \t]*第([一二三四五六七八九十百零]+)条/gm,
    key: (n) => `art-${cnNum(n)}`,
    label: (n) => `Article ${cnNum(n)}`,
    expectAtLeast: 70, // PIPL has 74 articles
    // Chinese carries far more meaning per character, so the default minimum
    // body length would discard most of the statute as though it were a
    // contents listing. Median PIPL article body is ~110 characters.
    minBody: 25,
  },
  ccpa: {
    // Section headings arrive as a linked bold number: [**1798.100.**](...)
    match: /^\[?\*\*(1798\.\d+)\.?\*\*/gm,
    key: (n) => `sec-${n}`,
    label: (n) => `§${n}`,
    expectAtLeast: 25, // 27 operative sections in the ingested text
  },
  pipeda: {
    // Two layouts in one Act. Body sections close the bold immediately —
    // "**5** **(1)** Subject to..." — while Schedule 1 clauses run the heading
    // on inside the bold: "**4.3 Principle 3 - Consent**". Both are indexed,
    // and Schedule 1 keys are namespaced so clause 4.3 can never satisfy a
    // citation to section 4.
    match: /^[ \t]*(?:-[ \t]+)?\*\*(?:(\d+(?:\.\d+)*)\*\*|(4\.\d+(?:\.\d+)*)(?=[ \t]))/gm,
    // Discriminate by POSITION, not by number shape. PIPEDA has a section 4.1
    // (Canada Evidence Act certificates) and a Schedule 1 clause 4.1
    // (Accountability); it also numbers Schedule 1 sub-clauses (4.5.3, 4.9.5)
    // in the same closed-bold form the body sections use. Only "is this before
    // or after the SCHEDULE 1 heading" separates them reliably.
    scheduleAt: /\*\*SCHEDULE 1\(/,
    key: (n, m, inSchedule) => (inSchedule ? `sch1-${n}` : `s-${n}`),
    label: (n, m, inSchedule) => (inSchedule ? `Schedule 1, clause ${n}` : `Section ${n}`),
    expectAtLeast: 80,
  },
  "quebec-law25": {
    // This source is a damaged PDF conversion: page line numbers are fused into
    // the words ("him2", "is1") and into section headings, so section 5 arrives
    // as "5.2 Any person collecting..." — a stray "2" where a space belongs.
    // Without the optional digit below, s.5 is never indexed and its text is
    // silently absorbed into s.4.1, which would let a quote from one section be
    // verified against the other. Real decimal sections (4.1, 12.1, 23.1) still
    // parse correctly because they are followed by a period.
    match: /^[ \t]*(?:#{1,6}[ \t]*)?(\d+(?:\.\d+)*)\.\d?[ \t]+[A-ZÀ-Ý"“]/gm,
    key: (n) => `s-${n}`,
    label: (n) => `Section ${n}`,
    expectAtLeast: 80,
    // The damage runs deeper than stray digits inside words: a line number
    // fuses onto the SECTION NUMBER ITSELF, so s.3.1 is rendered "23.1.",
    // s.3.5 as "23.5." and so on. The proof is the amendment footer beneath
    // them — "22021, c. 25, s. 1031." is "2021, c. 25, s. 103" wearing the
    // same stray 2 and 1 — and the division heading above 23.1 is the one
    // that precedes s.3.1 in the Act.
    //
    // This makes provision-level verification impossible for Québec: the
    // index cannot tell a real s.23.1 from a mangled s.3.1. Scoped checking
    // is therefore DISABLED here rather than quietly passing, and the
    // citations in the catalog are left as they are — they are correct for
    // P-39.1, and rewriting them to match a corrupted rendering would put an
    // error into the data to make a check go green.
    //
    // Fix: re-ingest Québec from a clean text source (LégisQuébec HTML rather
    // than the PDF). Until then this law is file-level verified only, and the
    // coverage manifest says so.
    provisionScoped: false,
    scopeNote:
      "PDF conversion fused page line-numbers into section numbers (s.3.1 renders as 23.1), so a citation cannot be matched to a provision. Quotes are still verified against the file; only the provision-level scoping is unavailable.",
  },
  pdpo: {
    // Two numbering systems in one instrument, and they collide: the Ordinance
    // has a section 1 AND Schedule 1 has Data Protection Principle 1. Keying
    // both as "s-1" would let a DPP quote satisfy a section citation and vice
    // versa — the misattribution this whole index exists to prevent. The
    // Principle form is matched first and keyed separately.
    match: /^[ \t]*(?:(\d+)\.[ \t]+Principle[ \t]+\d|(\d+)\.[ \t]+[A-Z])/gm,
    key: (n, m) => (m?.[1] ? `dpp-${n}` : `s-${n}`),
    label: (n, m) => (m?.[1] ? `Data Protection Principle ${n}` : `Section ${n}`),
    expectAtLeast: 60,
  },
};

/** Chinese numeral to integer, enough for 一 through 百 (PIPL tops out at 74). */
function cnNum(s) {
  const d = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (s === "十") return 10;
  let total = 0;
  // Hundreds.
  const hIdx = s.indexOf("百");
  if (hIdx !== -1) {
    total += (d[s[hIdx - 1]] ?? 1) * 100;
    s = s.slice(hIdx + 1);
  }
  const tIdx = s.indexOf("十");
  if (tIdx !== -1) {
    total += (tIdx === 0 ? 1 : d[s[tIdx - 1]] ?? 0) * 10;
    s = s.slice(tIdx + 1);
  }
  for (const ch of s) if (d[ch] !== undefined) total += d[ch];
  return total;
}

/** Shared with scripts/check-quotes.mjs: differences that are not substance. */
export function normalize(text) {
  return String(text)
    .replace(/­/g, "")
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
    .replace(/-[ \t]*\n[ \t]*/g, "-")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/[     ]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

/**
 * Split one instrument into provisions.
 *
 * Where a number appears more than once — a table of contents followed by the
 * operative text, which is how the Hong Kong and Canadian sources are laid out
 * — the LONGEST body wins. A contents line carries a few words; the provision
 * itself carries the substance.
 */
export function buildProvisionIndex(lawId, text) {
  const spec = PROVISION_PATTERNS[lawId];
  if (!spec) return new Map();

  const starts = [];
  const re = new RegExp(spec.match.source, spec.match.flags);
  let m;
  while ((m = re.exec(text))) {
    const num = m[1] ?? m[2];
    if (!num) continue;
    // The whole match is passed to key()/label() so a pattern with alternatives
    // can tell which one fired — PDPO needs this to separate Schedule 1
    // Principles from Ordinance sections that share a number.
    starts.push({ num, index: m.index, groups: m });
  }

  // Where a schedule begins, if this instrument has one that renumbers.
  const scheduleStart = spec.scheduleAt ? text.search(spec.scheduleAt) : -1;

  const byKey = new Map();
  for (let i = 0; i < starts.length; i++) {
    const { num, index, groups } = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].index : text.length;
    const body = text.slice(index, end);
    const inSchedule = scheduleStart !== -1 && index >= scheduleStart;
    const key = spec.key(num, groups, inSchedule);
    const prev = byKey.get(key);
    if (!prev || body.length > prev.text.length) {
      byKey.set(key, { key, number: num, label: spec.label(num, groups, inSchedule), text: body });
    }
  }

  // A contents entry that survived because its provision was never repeated is
  // not a provision. Where a number appears in both a contents list and the
  // body, the longest-wins rule above already picked the body; this only
  // catches numbers that exist SOLELY as a contents reference — which is
  // correct to exclude, since no text was ingested to verify a quote against.
  const minBody = spec.minBody ?? 120;
  for (const [key, p] of byKey) if (p.text.trim().length < minBody) byKey.delete(key);

  return byKey;
}

// ---------------------------------------------------------------------------
// Citation parsing — Control 2's input.
//
// Citations are written the way lawyers write them, not the way a database
// stores them: "Arts. 33–34 GDPR", "PIPEDA s.5(3); Sch.1 Principle 4.3",
// "§1798.100(c)", "DPP1 (Schedule 1)". Each has to resolve to the provision
// keys it names, and a range has to expand to every provision in it.
// ---------------------------------------------------------------------------

/**
 * Expand a citation list — "4(11), 7, 9" or "27, 37-39" — into provision keys.
 * Subsection parentheses are dropped: the index is at provision granularity, so
 * Art. 4(11) and Art. 4 are the same chunk.
 */
function expandList(list, prefix) {
  const keys = [];
  for (const part of String(list).split(",")) {
    const range = part.trim().match(/^(\d+(?:\.\d+)*)(?:\(\d+\))?\s*[–—-]\s*(\d+(?:\.\d+)*)$/);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      if (Number.isInteger(a) && Number.isInteger(b) && b >= a && b - a < 40) {
        for (let n = a; n <= b; n++) keys.push(`${prefix}${n}`);
      } else {
        keys.push(`${prefix}${range[1]}`, `${prefix}${range[2]}`);
      }
      continue;
    }
    const single = part.trim().match(/^(\d+(?:\.\d+)*)(?:\(\d+\))?/);
    if (single) keys.push(`${prefix}${single[1]}`);
  }
  return keys;
}

/** Every provision key a citation string refers to. */
export function extractCitations(citation, lawId) {
  const keys = new Set();
  const s = String(citation ?? "");
  const isEu = lawId === "gdpr" || lawId === "uk-gdpr" || lawId === "pipl";

  // "Article 33", "Arts. 33-34", "Arts. 4(11), 7, 9", "Arts. 27, 37-39".
  // The list form matters: citing three articles and checking only the first
  // would report a correctly-cited quote as misattributed.
  for (const m of s.matchAll(/\bArts?(?:icles?)?\.?\s*(\d+(?:\(\d+\))?(?:\s*[–—-]\s*\d+)?(?:\s*,\s*\d+(?:\(\d+\))?(?:\s*[–—-]\s*\d+)?)*)/gi)) {
    for (const key of expandList(m[1], "art-")) keys.add(key);
  }

  // "§1798.100", "1798.150"
  for (const m of s.matchAll(/§?\s*(1798\.\d+)/g)) keys.add(`sec-${m[1]}`);

  // "Sch.1 Principle 4.3", "Schedule 1 clause 4.3", or a bare "Principle 4.3"
  for (const m of s.matchAll(/(?:Sch(?:edule)?\.?\s*1[^0-9]{0,20})?Principle\s+(\d+(?:\.\d+)*)/gi)) {
    keys.add(`sch1-${m[1]}`);
  }
  for (const m of s.matchAll(/\bSch\.?\s*1\s+(?:cl(?:ause)?\.?\s*)?(\d+\.\d+(?:\.\d+)*)/gi)) {
    keys.add(`sch1-${m[1]}`);
  }

  // "DPP1", "DPP2(3)" — Hong Kong's Data Protection Principles.
  for (const m of s.matchAll(/\bDPP\s*(\d+)/gi)) keys.add(`dpp-${m[1]}`);

  // "s.5(3)", "ss.22-23", "s.18.3, s.20", "section 3.5-3.8"
  for (const m of s.matchAll(
    /\bs(?:s|ec(?:tion)?s?)?\.?\s*(\d+(?:\.\d+)*(?:\(\d+\))?(?:\s*[–—-]\s*\d+(?:\.\d+)*)?(?:\s*,\s*\d+(?:\.\d+)*(?:\(\d+\))?)*)/gi,
  )) {
    for (const key of expandList(m[1], "s-")) keys.add(key);
  }

  // An EU-style instrument has no "sections"; drop any that leaked in from
  // wording like "subsection".
  if (isEu) for (const k of [...keys]) if (k.startsWith("s-")) keys.delete(k);

  return [...keys];
}

/**
 * Resolve a citation to the deepest provision the index actually holds.
 *
 * Statutes are cited at finer granularity than they are chunked: PIPEDA's
 * Schedule 1 numbers sub-clauses (4.3.4, 4.9.5) that live inside clause 4.3 and
 * 4.9. Walking up the dotted path means a sub-clause citation verifies against
 * its parent's text — which is correct, since the text of 4.3.4 IS part of 4.3
 * — instead of being reported as an invented provision.
 *
 * Returns null when nothing in the chain is indexed.
 */
export function resolveKey(key, index) {
  const m = String(key).match(/^([a-z0-9]+-)(.+)$/);
  if (!m) return index.has(key) ? key : null;
  let [, prefix, num] = m;
  for (;;) {
    if (index.has(prefix + num)) return prefix + num;
    const cut = num.lastIndexOf(".");
    if (cut === -1) return null;
    num = num.slice(0, cut);
  }
}

/**
 * Control 2 — the provision whitelist.
 *
 * Returns the citations that are NOT in the index, after ancestor resolution.
 * An empty array means every provision named really exists in the ingested
 * text. A non-empty one means the answer named something this corpus does not
 * contain, and the claim resting on it must not be shown.
 */
export function unknownCitations(citation, lawId, index) {
  return extractCitations(citation, lawId).filter((k) => !resolveKey(k, index));
}
