/**
 * One daily pass for one track: fetch sources, keep on-topic items, drop
 * duplicates, classify with the model (or keyword rules), merge into the store.
 *
 * A failing source is recorded and skipped. This function does not throw for
 * source or model failures. It does throw if the store file exists but is not a
 * valid store, so that history is never overwritten.
 */

import { SOURCES } from "./sources.mjs";
import { fetchSource, isHttpUrl, itemId } from "./feeds.mjs";
import { scoreItem, guessKind, guessPlace, keywordKeep, matchPlace } from "./relevance.mjs";
import { analyze, cleanSummary } from "./analyze.mjs";
import { loadStore, saveStore, isDuplicate, mergeItems } from "./store.mjs";

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Most keyword-rule additions per run. Model-decided items are not capped. */
export const KEYWORD_CAP = 40;
const ymd = (date) => date.toISOString().slice(0, 10);

async function mapLimit(list, limit, fn) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, list.length) }, async () => {
    while (next < list.length) {
      const i = next++;
      await fn(list[i], i);
    }
  });
  await Promise.all(workers);
}

async function safeFetch(source, track, options) {
  try {
    return await fetchSource(source, track, options);
  } catch (e) {
    return { items: [], error: String(e?.message ?? e).slice(0, 120) };
  }
}

/**
 * @returns {Promise<{store: object, added: object[], kept: number, dropped: number, notes: string[]}>}
 *   added: items new in this run. kept: items in the store afterwards. dropped:
 *   candidates rejected. notes: model diagnostics (never stored).
 */
export async function run({
  track,
  storePath,
  fetchImpl = fetch,
  now = new Date(),
  env = process.env,
  dryRun = false,
  lookbackDays,
  log = console.log,
  delays = {},
}) {
  if (track !== "ai" && track !== "privacy") throw new Error(`unknown track: ${track}`);
  const sleep = delays.sleep ?? defaultSleep;

  const store = await loadStore(storePath, track);
  const days = lookbackDays ?? (store.items.length === 0 ? 21 : 4);
  const today = ymd(now);
  log(`Track ${track}: looking back ${days} days; ${store.items.length} items already stored.`);

  // 1. Fetch. Four sources at a time.
  const sources = SOURCES.filter((s) => s.tracks.includes(track));
  const options = { fetchImpl, now, lookbackDays: days };
  const outcomes = new Map();
  await mapLimit(sources, 4, async (s) => outcomes.set(s.id, await safeFetch(s, track, options)));

  const sourceRecords = sources.map((s) => {
    const o = outcomes.get(s.id);
    const found = o.items.length;
    const ok = o.error === null || found > 0;
    if (ok) {
      log(`  ok      ${s.name} [${s.id}]: ${found} item(s)${o.error ? ` (${o.error})` : ""}`);
    } else {
      log(`  FAILED  ${s.name} [${s.id}]: ${o.error}`);
    }
    return { id: s.id, name: s.name, type: s.type, ok, found, error: o.error ?? null };
  });

  // 2. Candidates: on topic, http(s) link, with region and kind guesses.
  const candidates = [];
  for (const s of sources) {
    for (const it of outcomes.get(s.id).items) {
      if (!isHttpUrl(it.url)) continue;
      const item = { title: it.title, description: it.description };
      const sc = scoreItem(item, track, s);
      if (!sc.onTopic) continue;
      const text = `${it.title} ${it.description ?? ""}`;
      const place = guessPlace(item, s);
      candidates.push({
        id: itemId(it.url),
        title: it.title,
        url: it.url,
        source: it.source,
        sourceType: s.type,
        published: it.published ? ymd(it.published) : null,
        region: place.region,
        jurisdiction: place.jurisdiction,
        kind: guessKind(text),
        description: it.description ?? "",
        src: s,
        score: sc.score,
      });
    }
  }
  const recency = (c) => c.published ?? today;
  candidates.sort((a, b) => b.score - a.score || (recency(a) < recency(b) ? 1 : recency(a) > recency(b) ? -1 : 0));

  // 3. Drop duplicates of stored items and of each other.
  const fresh = [];
  for (const c of candidates) {
    const c2 = { ...c, found: today };
    if (isDuplicate(c2, store.items, { now }) || isDuplicate(c2, fresh, { now })) continue;
    fresh.push(c2);
  }
  log(`Candidates: ${candidates.length} on topic, ${fresh.length} new after duplicate check.`);

  // 4. Classify.
  const analysis = await analyze(fresh, track, {
    token: env.GITHUB_TOKEN,
    fetchImpl,
    maxBatches: 12,
    batchSize: 10,
    retryMs: delays.modelRetry ?? 20_000,
    gapMs: delays.modelGap ?? 4_500,
    sleep,
  });
  for (const line of analysis.notes) log(`  model: ${line}`);
  if (analysis.mode.mode === "model") {
    log(`Analysis: model ${analysis.mode.model}; ${analysis.failedBatches} batch(es) failed.`);
  } else {
    log(`Analysis: keyword rules only (${analysis.mode.reason}).`);
  }

  // 5. Decide per candidate.
  //  - Model mode: candidates beyond the batch budget were never sent to the model.
  //    They are held for the next run (they are fetched again while in the look-back
  //    window) and are not added now.
  //  - A candidate that was sent but got no valid entry falls back to keyword rules.
  //  - Keyword-rule additions are strict (keywordKeep) and capped per run. Candidates
  //    are already sorted by score, so the cap keeps the highest-scored.
  const modelUsed = analysis.mode.mode === "model";
  const sentCount = modelUsed ? analysis.sentCount : fresh.length;
  const heldForNextRun = fresh.length - sentCount;
  const added = [];
  let dropped = 0;
  let keywordAdded = 0;
  let heldByCap = 0;
  fresh.forEach((c, i) => {
    if (i >= sentCount) return; // held for the next run
    const r = analysis.results.get(i);
    let keep;
    let summary;
    let summaryBy;
    let kind = c.kind;
    let jurisdiction = c.jurisdiction;
    let region = c.region;
    if (r) {
      keep = r.keep;
      summary = r.summary;
      summaryBy = "model";
      kind = r.kind;
      if (r.jurisdiction) {
        jurisdiction = r.jurisdiction;
        const place = matchPlace(r.jurisdiction);
        region = place ? place.region : c.region;
      }
    } else {
      keep = keywordKeep({ title: c.title, description: c.description }, track, c.src);
      summary = cleanSummary(c.description || c.title);
      summaryBy = "source";
      if (keep) {
        if (keywordAdded >= KEYWORD_CAP) {
          heldByCap++;
          return;
        }
        keywordAdded++;
      }
    }
    if (!keep) {
      dropped++;
      return;
    }
    added.push({
      id: c.id,
      track,
      title: c.title,
      url: c.url,
      source: c.source,
      sourceType: c.sourceType,
      published: c.published,
      found: today,
      region,
      jurisdiction,
      kind,
      summary,
      summaryBy,
    });
    log(`  + ${c.title} [${region}, ${kind}]`);
  });
  if (heldForNextRun > 0) log(`${heldForNextRun} candidate(s) left for the next run (beyond the model budget).`);
  if (heldByCap > 0) log(`${heldByCap} keyword-rule item(s) held back by the cap of ${KEYWORD_CAP} per run.`);

  // 6. Merge, record the run, save.
  // With nothing new to check, the previous analysis is still the truth about how
  // the stored items were decided, so it is kept rather than replaced.
  const merged = mergeItems(store.items, added, { now });
  const next = {
    track,
    checked: now.toISOString(),
    analysis: fresh.length === 0 ? store.analysis ?? null : analysis.mode,
    sources: sourceRecords,
    items: merged,
  };
  log(`Added ${added.length}; ${dropped} rejected; ${merged.length} stored.`);
  if (dryRun) {
    log("Dry run: nothing written.");
  } else {
    await saveStore(storePath, next);
  }
  return { store: next, added, kept: merged.length, dropped, notes: analysis.notes };
}
