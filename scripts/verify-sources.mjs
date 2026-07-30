#!/usr/bin/env node
/**
 * Automated source verification.
 *
 * What this CAN do:
 *   1. Confirm every primary-source link still resolves (statutes get moved).
 *   2. Detect when the primary text CHANGES — the signal that a law was amended
 *      and our summary may now be wrong.
 *   3. Confirm cited provisions actually appear in the primary text
 *      (catches invented or mistyped citations).
 *   4. Flag entries that have gone stale and need re-review.
 *
 * What this CANNOT do:
 *   Judge whether a summary's *interpretation* of the law is correct. That is a
 *   legal judgment and needs a human reading the source. This tool tells you
 *   WHEN and WHERE to look; it does not tell you the content is right.
 *
 * Usage:
 *   node scripts/verify-sources.mjs            # check, write report, exit 1 on problems
 *   node scripts/verify-sources.mjs --update   # accept current text as the new baseline
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SNAPSHOT_PATH = join(ROOT, "verification", "snapshots.json");
const REPORT_PATH = join(ROOT, "verification", "report.json");
const UPDATE = process.argv.includes("--update");
const STALE_AFTER_DAYS = 180;
const TIMEOUT_MS = 30_000;

/** Parse the provenance entries out of the TypeScript source (no build step needed). */
function loadProvenance() {
  const src = readFileSync(join(ROOT, "lib", "data", "verification.ts"), "utf8");
  const entries = [];
  const blocks = src.split(/\n  \{\n/).slice(1);
  for (const block of blocks) {
    const pick = (key) => block.match(new RegExp(`${key}:\\s*"([^"]*)"`))?.[1];
    const lawId = pick("lawId");
    if (!lawId) continue;
    const markersRaw = block.match(/expectedMarkers:\s*\[([^\]]*)\]/s)?.[1] ?? "";
    entries.push({
      lawId,
      status: pick("status"),
      sourceRef: pick("sourceRef"),
      checkUrl: pick("checkUrl"),
      lastReviewed: pick("lastReviewed"),
      expectedMarkers: [...markersRaw.matchAll(/"([^"]+)"/g)].map((m) => m[1]),
    });
  }
  return entries;
}

/** Strip markup and collapse whitespace so trivial rendering noise is ignored. */
function normalize(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "privacy-law-monitor-verifier/1.0 (+source verification)" },
    });
    const body = res.ok ? await res.text() : "";
    return { status: res.status, ok: res.ok, text: normalize(body) };
  } catch (err) {
    return { status: 0, ok: false, text: "", error: String(err?.message ?? err) };
  } finally {
    clearTimeout(timer);
  }
}

const snapshots = existsSync(SNAPSHOT_PATH)
  ? JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"))
  : {};

const entries = loadProvenance();
const results = [];
const now = new Date();

for (const entry of entries) {
  const res = await fetchText(entry.checkUrl);
  const hash = res.ok ? createHash("sha256").update(res.text).digest("hex").slice(0, 16) : null;
  const prev = snapshots[entry.lawId];

  const ageDays = Math.floor((now - new Date(entry.lastReviewed)) / 86_400_000);
  const problems = [];

  // Distinguish "the citation is wrong" from "a bot-blocker got in the way".
  // Conflating these makes the report untrustworthy: a 403 says nothing about
  // whether the law is where we claim it is.
  let severity = "ok";

  if (res.status === 404 || res.status === 410) {
    severity = "broken";
    problems.push(`DEAD LINK (HTTP ${res.status}) — the cited source is not at this URL`);
  } else if (res.status === 403 || res.status === 401 || res.status === 429) {
    severity = "blocked";
    problems.push(`blocked by the host (HTTP ${res.status}) — verify this one by hand`);
  } else if (!res.ok) {
    severity = "blocked";
    problems.push(`unreachable (HTTP ${res.status}${res.error ? `: ${res.error}` : ""})`);
  } else if (res.text.length < 2000) {
    // Almost certainly a JS-rendered shell; there is no text to check markers against.
    severity = "blocked";
    problems.push(
      `only ${res.text.length} chars of text extracted (likely JS-rendered) — verify by hand`,
    );
  } else {
    // Citation sanity: do the cited provisions actually appear in the source?
    const missing = entry.expectedMarkers.filter(
      (m) => !res.text.toLowerCase().includes(m.toLowerCase()),
    );
    if (missing.length) {
      severity = "suspect";
      problems.push(`CITATION NOT FOUND in source text: ${missing.join(", ")}`);
    }

    if (prev?.hash && prev.hash !== hash) {
      severity = "changed";
      const delta = res.text.length - (prev.length ?? 0);
      problems.push(
        `PRIMARY SOURCE CHANGED (${delta >= 0 ? "+" : ""}${delta} chars) — re-check this entry`,
      );
    }
  }

  if (ageDays > STALE_AFTER_DAYS) problems.push(`stale: last reviewed ${ageDays} days ago`);
  if (entry.status === "ai-drafted") problems.push("not yet verified against primary source");

  results.push({
    lawId: entry.lawId,
    status: entry.status,
    severity,
    url: entry.checkUrl,
    http: res.status,
    hash,
    previousHash: prev?.hash ?? null,
    ageDays,
    problems,
  });

  if (res.ok && (UPDATE || !prev)) {
    snapshots[entry.lawId] = {
      hash,
      length: res.text.length,
      checkedAt: now.toISOString().slice(0, 10),
      url: entry.checkUrl,
    };
  }
}

mkdirSync(dirname(REPORT_PATH), { recursive: true });
writeFileSync(REPORT_PATH, JSON.stringify({ generatedAt: now.toISOString(), results }, null, 2));
writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshots, null, 2) + "\n");

// --- console + CI summary -------------------------------------------------
const lines = [];
lines.push(`# Source verification — ${now.toISOString().slice(0, 10)}\n`);
lines.push("| Law | HTTP | Status | Findings |");
lines.push("| --- | ---- | ------ | -------- |");
for (const r of results) {
  lines.push(
    `| \`${r.lawId}\` | ${r.http || "—"} | ${r.status} | ${r.problems.length ? r.problems.join("; ") : "no issues"} |`,
  );
}
const changed = results.filter((r) => r.severity === "changed");
const broken = results.filter((r) => r.severity === "broken");
const suspect = results.filter((r) => r.severity === "suspect");
const blocked = results.filter((r) => r.severity === "blocked");
lines.push(
  `\n**${broken.length}** dead link(s) · **${suspect.length}** citation(s) not found · ` +
    `**${changed.length}** source(s) changed · **${blocked.length}** need manual check · ` +
    `**${results.filter((r) => r.status === "ai-drafted").length}** still unverified.\n`,
);
lines.push(
  "> This check confirms links resolve, citations exist, and flags changed sources. " +
    "It does **not** confirm the summaries are legally correct — that needs a human reading the source.",
);

const summary = lines.join("\n");
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

// Fail only on problems we can actually act on. A bot-blocked host is not a
// content error, and the standing "unverified" state is expected, not a regression.
const actionable = changed.length + broken.length + suspect.length;
process.exit(actionable > 0 && !UPDATE ? 1 : 0);
