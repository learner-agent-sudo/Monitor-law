#!/usr/bin/env node
/**
 * The gate on the scale itself.
 *
 * Every gap this catalog reports is one score minus another, which makes the
 * scores the most load-bearing data in the system — and until lib/strictness.mjs
 * existed they were four adjectives with no definition behind them. A reader
 * could disagree with a number only by feel.
 *
 * A published rubric is only worth something if it describes the catalog it
 * claims to describe, so this checks that it does:
 *
 *  1. All four levels are defined, each with a question a reader can apply,
 *     what the level means, and what it does NOT mean.
 *  2. Every worked example names a real mapping whose strictness is actually
 *     the level it illustrates. An example drifting from the catalog would
 *     teach the scale wrongly, and the examples are the part people read.
 *  3. The worked ladder's levels all exist on the requirement it uses, so the
 *     "same obligation at three levels" claim stays true.
 *  4. Every mapping in the catalog sits on the scale at all.
 *  5. BINDING_FLOOR names a defined level — it is imported by
 *     scripts/check-gap-traces.mjs to police cross-references, so the rule and
 *     its published meaning cannot drift.
 *
 * Usage: node scripts/check-strictness.mjs
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LEVELS, LEVEL_BY_N, BINDING_FLOOR, WORKED_LADDER } from "../lib/strictness.mjs";
import { LAW_IDS, readMappings, readRequirements } from "../lib/law-source.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Pure, so the self-test can feed it a rubric that is wrong on purpose. */
export function validateRubric(levels, catalog, requirementIds) {
  const problems = [];

  for (const n of [0, 1, 2, 3]) {
    const def = levels.find((l) => l.level === n);
    if (!def) {
      problems.push(`level ${n} has no definition`);
      continue;
    }
    // A label is a badge and is meant to be short; the prose fields are the
    // definition and have to carry their weight.
    // Each field has a different job, so each gets its own floor. A label is a
    // badge and should be short; a test should be one sentence; the two prose
    // fields are the definition and have to carry their weight.
    if (!def.label || def.label.length < 3) problems.push(`level ${n}: no label`);
    for (const [field, min] of [
      ["question", 30],
      ["means", 80],
      ["notMeans", 80],
    ]) {
      if (!def[field] || def[field].length < min) {
        problems.push(`level ${n}: "${field}" is missing or too short to say anything`);
      }
    }
    if (!/\?$/.test(def.question ?? "")) {
      problems.push(
        `level ${n}: "question" is not a question. The scale is defined by tests a reader can ` +
          `apply to a provision, not by adjectives.`,
      );
    }

    const ex = def.example;
    if (!ex) {
      problems.push(`level ${n}: no worked example`);
      continue;
    }
    const key = `${ex.lawId}/${ex.requirementId}`;
    const actual = catalog[key];
    if (actual === undefined) {
      problems.push(`level ${n}: example ${key} is not in the catalog`);
    } else if (actual !== n) {
      problems.push(
        `level ${n}: example ${key} actually scores ${actual}. An example that drifts from the ` +
          `catalog teaches the scale wrongly, and the examples are the part people read.`,
      );
    }
    if (!requirementIds.has(ex.requirementId)) {
      problems.push(`level ${n}: example names requirement "${ex.requirementId}", not in the taxonomy`);
    }
    if (!ex.why || ex.why.length < 40) {
      problems.push(`level ${n}: the example does not say why it sits at that level`);
    }
  }

  if (!levels.some((l) => l.level === BINDING_FLOOR)) {
    problems.push(`BINDING_FLOOR is ${BINDING_FLOOR}, which is not a defined level`);
  }

  return problems;
}

// ---- run ------------------------------------------------------------------
const catalog = {};
const problems = [];
for (const lawId of LAW_IDS) {
  for (const mp of readMappings(ROOT, lawId)) {
    catalog[`${lawId}/${mp.requirementId}`] = mp.strictness;
    // --- 4. everything sits on the scale --------------------------------
    if (!Number.isInteger(mp.strictness) || mp.strictness < 0 || mp.strictness > 3) {
      problems.push(`${lawId}/${mp.requirementId}: strictness ${mp.strictness} is off the scale`);
    }
  }
}
const requirementIds = new Set(readRequirements(ROOT).map((r) => r.id));

problems.push(...validateRubric(LEVELS, catalog, requirementIds));

// --- 3. the worked ladder is real ------------------------------------------
const onLadder = Object.entries(catalog)
  .filter(([k]) => k.endsWith(`/${WORKED_LADDER.requirementId}`))
  .map(([k, v]) => ({ key: k, level: v }));
for (const n of WORKED_LADDER.levels) {
  if (!onLadder.some((x) => x.level === n)) {
    problems.push(
      `the worked ladder claims ${WORKED_LADDER.requirementId} is scored ${n} by some instrument, ` +
        `and none scores it ${n}`,
    );
  }
}

// --- self-test: prove the gate bites ---------------------------------------
{
  const broken = LEVELS.map((l) =>
    l.level === 2 ? { ...l, example: { ...l.example, lawId: "gdpr" } } : l,
  );
  const caught = validateRubric(broken, catalog, requirementIds);
  if (!caught.some((p) => /actually scores 3/.test(p))) {
    problems.push("SELF-TEST FAILED: an example pointing at the wrong level was accepted");
  }

  const adjectival = LEVELS.map((l) =>
    l.level === 3 ? { ...l, question: "Comprehensive coverage of the requirement." } : l,
  );
  if (!validateRubric(adjectival, catalog, requirementIds).some((p) => /not a question/.test(p))) {
    problems.push("SELF-TEST FAILED: an adjective in place of a test was accepted");
  }
}

// ---- report ---------------------------------------------------------------
const out = [];
out.push("# Strictness rubric\n");
out.push("| Level | Label | The test | Worked example |");
out.push("| --- | --- | --- | --- |");
for (const l of LEVELS) {
  out.push(
    `| **${l.level}** | ${l.label} | ${l.question} | \`${l.example.lawId}/${l.example.requirementId}\` |`,
  );
}
out.push(
  `\nBinding floor: **${BINDING_FLOOR}** — the level at or above which an instrument genuinely ` +
    `constrains. scripts/check-gap-traces.mjs imports this constant, so the cross-reference rule ` +
    `and the published definition are the same number.\n`,
);
// One instrument per rung — the point of the ladder is the step between
// levels, which a list of every instrument at every level obscures.
const ladder = WORKED_LADDER.levels.map((n) => {
  const pick = LEVEL_BY_N[n].example;
  const onThisRung = onLadder.filter((x) => x.level === n);
  const chosen =
    onThisRung.find((x) => x.key === `${pick.lawId}/${pick.requirementId}`) ?? onThisRung[0];
  return `${chosen.key} = ${n}`;
});
out.push(
  `Worked ladder on one obligation: ${ladder.join(" → ")} ` +
    `(${onLadder.length} instruments score this requirement in all).\n`,
);
out.push(`${Object.keys(catalog).length} mapping(s) checked against the scale.\n`);

if (problems.length) {
  out.push(`\n**${problems.length} problem(s):**\n`);
  for (const p of problems) out.push(`- ${p}`);
  out.push(
    "\n> The scores decide every gap this catalog reports. A scale nobody can apply is a scale " +
      "nobody can contradict.",
  );
  console.log(out.join("\n"));
  process.exit(1);
}

out.push(
  "\nNo problems. Every level is defined by a test rather than an adjective, every worked " +
    "example scores what it claims to illustrate, and the two self-tests confirm the gate " +
    "rejects a drifting example and an adjective standing in for a test.\n",
);
out.push(
  "> The rubric says what the TEXT specifies, not which regime is better. Since the requirement " +
    "list is largely the GDPR's own obligation set, the GDPR reaches the top of the scale almost " +
    "everywhere by construction — that is a property of the ruler, and the rubric says so where " +
    "a reader meets it.",
);
console.log(out.join("\n"));
