#!/usr/bin/env node
/**
 * Research agent: looks for new legal developments on one track and writes them
 * to lib/data/developments/<track>.json.
 *
 * Usage: node scripts/research-agent.mjs --track ai|privacy [--dry-run] [--lookback-days N]
 *
 * GITHUB_TOKEN enables the model step (GitHub Models). Without it the agent
 * uses keyword rules only. GITHUB_STEP_SUMMARY, when set, gets a short report.
 */

import { appendFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../lib/research/run.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const USAGE = "Usage: node scripts/research-agent.mjs --track ai|privacy [--dry-run] [--lookback-days N]";

function parseArgs(argv) {
  const out = { track: null, dryRun: false, lookbackDays: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--track") out.track = argv[++i];
    else if (a.startsWith("--track=")) out.track = a.slice("--track=".length);
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--lookback-days") {
      const v = argv[++i];
      if (!/^\d+$/.test(String(v ?? ""))) return { error: "--lookback-days needs a whole number" };
      out.lookbackDays = Number(v);
    } else return { error: `unknown argument: ${a}` };
  }
  if (out.track !== "ai" && out.track !== "privacy") return { error: "--track must be ai or privacy" };
  if (out.lookbackDays !== undefined && (out.lookbackDays < 1 || out.lookbackDays > 365)) {
    return { error: "--lookback-days must be between 1 and 365" };
  }
  return out;
}

const mdEscape = (s) => String(s ?? "").replace(/[[\]]/g, " ").replace(/\s+/g, " ").trim();

async function writeStepSummary(result, track) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const { store, added } = result;
  const ok = store.sources.filter((s) => s.ok).length;
  const mode = store.analysis?.mode === "model"
    ? `model \`${store.analysis.model}\``
    : `keyword rules only (${store.analysis?.reason ?? "unknown"})`;
  const lines = [
    `## Research agent: ${track === "ai" ? "AI law" : "privacy law"}`,
    "",
    `- Sources answered: **${ok} of ${store.sources.length}**`,
    `- Analysis: ${mode}`,
    `- Items added: **${added.length}**`,
    "",
  ];
  if (added.length) {
    lines.push("### Added");
    for (const it of added) lines.push(`- [${mdEscape(it.title)}](${it.url}) (${mdEscape(it.source)})`);
    lines.push("");
  }
  const failed = store.sources.filter((s) => !s.ok);
  if (failed.length) {
    lines.push("### Sources that failed");
    for (const s of failed) lines.push(`- ${mdEscape(s.name)} [${s.id}]: ${mdEscape(s.error)}`);
    lines.push("");
  }
  await appendFile(file, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) {
    console.error(`${args.error}\n${USAGE}`);
    process.exit(2);
  }
  const storePath = join(ROOT, "lib", "data", "developments", `${args.track}.json`);
  const result = await run({
    track: args.track,
    storePath,
    dryRun: args.dryRun,
    lookbackDays: args.lookbackDays,
    env: process.env,
  });
  await writeStepSummary(result, args.track);
}

main().catch((err) => {
  console.error("Research agent failed:", err);
  process.exit(1);
});
