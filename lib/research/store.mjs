/**
 * Reads and writes lib/data/developments/<track>.json, and decides what counts
 * as a duplicate of something already stored.
 */

import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";

const DAY_MS = 86_400_000;
const DUPLICATE_WINDOW_DAYS = 21;
const WORD_OVERLAP = 0.8;
const STORY_WINDOW_DAYS = 5;
const STORY_MIN_SHARED = 3;
const STORY_MIN_SHARE = 0.5;

export function emptyStore(track) {
  return { track, checked: null, analysis: null, sources: [], items: [] };
}

/**
 * The stored file. The empty shape is returned ONLY when the file does not exist.
 * A file that exists but cannot be read, is not JSON, or is not an object with an
 * items array throws, so that the next save cannot overwrite history.
 */
export async function loadStore(path, track) {
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch (err) {
    if (err && err.code === "ENOENT") return emptyStore(track);
    throw new Error(`${path} exists but cannot be read (${err?.code ?? err?.message}); refusing to overwrite it`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !Array.isArray(parsed.items)) {
    throw new Error(`${path} exists but is not a valid store; refusing to overwrite it`);
  }
  return {
    ...emptyStore(track),
    ...parsed,
    track,
    sources: Array.isArray(parsed.sources) ? parsed.sources : [],
  };
}

/** Pretty JSON with a trailing newline. Written to a temp file, then renamed. */
export async function saveStore(path, store) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(tmp, path);
}

/** Lower-case letters and digits only. */
export function normaliseTitle(title) {
  return String(title ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function wordSet(title) {
  return new Set(String(title ?? "").toLowerCase().match(/\p{L}{3,}/gu) ?? []);
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared);
}

// ---- Same story -------------------------------------------------------------
//
// Two headlines are the same story when they are dated within 5 days, share at
// least 3 signature tokens, share at least half of the smaller signature, share
// at least one token that is not generic vocabulary, and do not name different
// companies or people. See signatureOf() for what a signature holds.

/** Light stem: strips -ing, -ed, -s and a final -e, keeping at least 3 letters. */
function stem(word) {
  let s = word;
  if (s.length - 3 >= 3 && s.endsWith("ing")) s = s.slice(0, -3);
  else if (s.length - 2 >= 3 && s.endsWith("ed")) s = s.slice(0, -2);
  else if (s.length - 1 >= 3 && s.endsWith("s") && !s.endsWith("ss")) s = s.slice(0, -1);
  if (s.length - 1 >= 3 && s.endsWith("e")) s = s.slice(0, -1);
  return s;
}

const stemSet = (text) => new Set(text.split(/\s+/).filter(Boolean).map(stem));

/** Words that carry no meaning for the story test. */
const STOP = stemSet(
  "the and for with from over into after that this its their they has have had are was were " +
    "will been being not but about against among than then also what when where who how why " +
    "new says said more most out off all any one two now can could may might must should would " +
    "does did doing done via per our your his her she him them while each both other such only " +
    "same under between through during before amid just lakh lakhs crore crores euro euros " +
    "dollar dollars pound pounds rupee rupees yen yuan eur usd gbp inr jpy cny million millions billion billions",
);

/** Place words. They are shared by unrelated stories, so they never count. */
const PLACE = stemSet(
  "european europe union united states state kingdom britain british england ireland irish " +
    "france french germany german italy italian spain spanish netherlands dutch california " +
    "colorado texas york virginia illinois utah connecticut china chinese beijing shanghai japan " +
    "japanese korea korean singapore hong kong taiwan india indian vietnam thailand indonesia " +
    "malaysia philippines canada canadian australia australian brazil brazilian brussels america american " +
    "asia asian southeast east west africa african middle latin pacific",
);

/**
 * Generic legal and news vocabulary. A shared token from this list is not enough
 * on its own: two stories that share only generic words (fine, data, breach) differ.
 */
const GENERIC = stemSet(
  "fine penalty data protection privacy commission commissioner authority board court law act " +
    "rule bill regulation regulator government ministry federal settle settlement " +
    "claim breach violation consumer guidance guideline enforcement order impose lawsuit ruling " +
    "case decision investigation amendment proposal consultation legal multistate multi attorney " +
    "artificial intelligence failure sanction watchdog " +
    "face scrutiny concern explain key add update issue publish launch announce introduce propose " +
    "approve pass warn plan step push urge call move report news",
);

/** Same concept, different word: the stem on the left reads as the words on the right. */
const SYNONYMS = {
  violation: ["breach"],
  gdpr: ["data", "protection"],
};

const AMOUNT = new RegExp(
  "((?:€|\\$|£|¥|₹|\\bRs\\b\\.?|\\bEUR\\b|\\bUSD\\b|\\bGBP\\b|\\bINR\\b|\\bJPY\\b|\\bCNY\\b)\\s?)?" +
    "(\\d+(?:,\\d+)*(?:\\.\\d+)?)\\s?" +
    "(million|mn|billion|bn|lakhs?|crores?|thousand|k|m|b)?(?![\\p{L}])",
  "giu",
);

/** "€11m", "€11 million", "EUR 11 million", "11 million euros" -> amt:11m. */
function amountToken(num, unit) {
  let n = Number(num.replace(/,/g, ""));
  const u = (unit ?? "").toLowerCase();
  let suffix = "";
  if (u === "million" || u === "mn" || u === "m") suffix = "m";
  else if (u === "billion" || u === "bn" || u === "b") suffix = "b";
  else if (u === "lakh" || u === "lakhs") {
    n *= 0.1;
    suffix = "m";
  } else if (u === "crore" || u === "crores") {
    n *= 10;
    suffix = "m";
  } else if (u === "thousand" || u === "k") suffix = "k";
  return `amt:${Number(n.toFixed(4))}${suffix}`;
}

/**
 * tokens: amounts and stemmed content words. names: capitalised words after the
 * first word of the headline (the first word is capitalised whatever the headline
 * says), not all-capitals (acronyms such as CCPA or GDPR), and not generic.
 */
function signatureOf(title) {
  const text = String(title ?? "");
  const amounts = [];
  const rest = text.replace(AMOUNT, (match, cur, num, unit) => {
    if (!cur && !unit) return match;
    amounts.push(amountToken(num, unit));
    return " ";
  });
  const tokens = new Set(amounts);
  for (const w of rest.toLowerCase().match(/\p{L}{3,}/gu) ?? []) {
    const s = stem(w);
    if (STOP.has(s) || PLACE.has(s)) continue;
    for (const t of SYNONYMS[s] ?? [s]) tokens.add(t);
  }
  const names = new Set();
  for (const w of (text.match(/\p{L}{3,}/gu) ?? []).slice(1)) {
    if (!/^\p{Lu}/u.test(w) || w === w.toUpperCase()) continue;
    const s = stem(w.toLowerCase());
    if (!STOP.has(s) && !PLACE.has(s) && !GENERIC.has(s)) names.add(s);
  }
  return { tokens, names };
}

/** The item's date for the story window: published, else found. */
function storyDay(item) {
  const d = item?.published || item?.found;
  const t = d ? Date.parse(`${String(d).slice(0, 10)}T00:00:00Z`) : NaN;
  return Number.isFinite(t) ? t : null;
}

/** True when two items report the same story (see the comment above). */
export function sameStory(a, b) {
  const da = storyDay(a);
  const db = storyDay(b);
  if (da === null || db === null || Math.abs(da - db) > STORY_WINDOW_DAYS * DAY_MS) return false;
  const sa = signatureOf(a.title);
  const sb = signatureOf(b.title);
  const smaller = Math.min(sa.tokens.size, sb.tokens.size);
  if (smaller === 0) return false;
  const shared = [...sa.tokens].filter((t) => sb.tokens.has(t));
  if (shared.length < STORY_MIN_SHARED || shared.length / smaller < STORY_MIN_SHARE) return false;
  if (!shared.some((t) => !GENERIC.has(t) && !t.startsWith("amt:"))) return false;
  if (sa.names.size > 0 && sb.names.size > 0 && ![...sa.names].some((n) => sb.names.has(n))) return false;
  return true;
}

/**
 * Why the item is already known, or null. Reasons: "same-id" (the same canonical
 * URL), "same-title" (the same normalised title), "similar-title" (a near-identical
 * headline, word overlap 0.8 or more, first seen in the last 21 days) and
 * "same-story" (see sameStory).
 */
export function duplicateReason(item, existingItems, { now = new Date() } = {}) {
  const nt = normaliseTitle(item.title);
  const words = wordSet(item.title);
  const cutoff = new Date(now.getTime() - DUPLICATE_WINDOW_DAYS * DAY_MS).toISOString().slice(0, 10);
  for (const e of existingItems) {
    if (e.id === item.id) return "same-id";
    if (nt && normaliseTitle(e.title) === nt) return "same-title";
    if (String(e.found ?? "") >= cutoff && jaccard(words, wordSet(e.title)) >= WORD_OVERLAP) return "similar-title";
    if (sameStory(item, e)) return "same-story";
  }
  return null;
}

/**
 * True when the item is already known. See duplicateReason for the tests.
 */
export function isDuplicate(item, existingItems, { now = new Date() } = {}) {
  return duplicateReason(item, existingItems, { now }) !== null;
}

/**
 * Existing items first, then incoming, de-duplicated by id, dropping items
 * older than maxAgeDays, newest first (by published, else found), capped at maxItems.
 */
export function mergeItems(existing, incoming, { now = new Date(), maxItems = 400, maxAgeDays = 365 } = {}) {
  const seen = new Set();
  const all = [];
  for (const it of [...existing, ...incoming]) {
    if (!it || !it.id || seen.has(it.id)) continue;
    seen.add(it.id);
    all.push(it);
  }
  const cutoff = new Date(now.getTime() - maxAgeDays * DAY_MS).toISOString().slice(0, 10);
  const dateKey = (it) => it.published || it.found || "";
  return all
    .filter((it) => dateKey(it) >= cutoff)
    .sort((a, b) => (dateKey(a) < dateKey(b) ? 1 : dateKey(a) > dateKey(b) ? -1 : 0))
    .slice(0, maxItems);
}
