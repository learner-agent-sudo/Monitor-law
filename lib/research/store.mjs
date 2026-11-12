/**
 * Reads and writes lib/data/developments/<track>.json, and decides what counts
 * as a duplicate of something already stored.
 */

import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";

const DAY_MS = 86_400_000;
const DUPLICATE_WINDOW_DAYS = 21;
const WORD_OVERLAP = 0.8;

export function emptyStore(track) {
  return { track, checked: null, analysis: null, sources: [], items: [] };
}

/** The stored file, or the empty shape if it is missing or unreadable. */
export async function loadStore(path, track) {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8"));
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) return emptyStore(track);
    return {
      ...emptyStore(track),
      ...parsed,
      track,
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      items: parsed.items.filter((it) => it && typeof it === "object"),
    };
  } catch {
    return emptyStore(track);
  }
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

/**
 * True when the item is already known: the same id (canonical URL), the same
 * normalised title, or a near-identical headline (word overlap of 0.8 or more)
 * with an item first seen in the last 21 days.
 */
export function isDuplicate(item, existingItems, { now = new Date() } = {}) {
  const nt = normaliseTitle(item.title);
  const words = wordSet(item.title);
  const cutoff = new Date(now.getTime() - DUPLICATE_WINDOW_DAYS * DAY_MS).toISOString().slice(0, 10);
  for (const e of existingItems) {
    if (e.id === item.id) return true;
    if (nt && normaliseTitle(e.title) === nt) return true;
    if (String(e.found ?? "") >= cutoff && jaccard(words, wordSet(e.title)) >= WORD_OVERLAP) return true;
  }
  return false;
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
