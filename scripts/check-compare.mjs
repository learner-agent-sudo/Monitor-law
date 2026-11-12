#!/usr/bin/env node
/**
 * Offline tests for lib/compare.mjs.
 *
 * Part 1 uses small hand-made facets and answers, so every relation, verdict
 * and label is exercised with known inputs.
 *
 * Part 2 runs on the real data in lib/data/facet-answers/ once a law has been
 * filled in. A law with an empty answers object is skipped with a line saying
 * so. Two properties are checked:
 *   - a law compared with itself is "same" on every point;
 *   - for every ordered facet, A->B is "more" exactly when B->A is "less".
 *
 * Usage: node scripts/check-compare.mjs
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  optionRank,
  isSilent,
  pickAnswer,
  comparePoint,
  compareRequirement,
  isGap,
  needsSecondLook,
  verdictLabel,
  sameMeaningDifferentWords,
} from "../lib/compare.mjs";
import { readMappings } from "../lib/law-source.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
const results = [];
const skipped = [];

function check(name, condition, detail = "") {
  results.push({ name, ok: Boolean(condition), detail });
  if (!condition) failures++;
}

// ---- fixtures ---------------------------------------------------------------

const ORDERED = {
  id: "t.ordered",
  requirementId: "t",
  label: "Ordered point",
  question: "How strict?",
  ordered: true,
  options: [
    { id: "none", label: "None", silent: true },
    { id: "mid", label: "Middle" },
    { id: "high", label: "High" },
  ],
};

const UNORDERED = {
  id: "t.unordered",
  requirementId: "t",
  label: "Unordered point",
  question: "Which approach?",
  ordered: false,
  options: [
    { id: "x", label: "Not dealt with", silent: true },
    { id: "a", label: "Approach A" },
    { id: "b", label: "Approach B" },
  ],
};

const ONE = (lawId, option, extra = {}) => ({
  lawId,
  lawShortName: lawId.toUpperCase(),
  answer: { option, says: `${lawId} says ${option}`, citation: "s.1", quote: "some quoted words here", ...extra },
});

/** Answers map for a one-law jurisdiction, keyed by facet id. */
const mapOf = (entries) => Object.fromEntries(entries);

// ---- optionRank and isSilent ----------------------------------------------

check("optionRank: index in facet order", optionRank(ORDERED, "high") === 2 && optionRank(ORDERED, "none") === 0);
check("optionRank: unknown option is -1", optionRank(ORDERED, "nope") === -1);
check("isSilent: silent option", isSilent(ORDERED, "none") === true);
check("isSilent: non-silent option", isSilent(ORDERED, "mid") === false);
check("isSilent: unknown option is not silent", isSilent(ORDERED, "nope") === false);

// ---- comparePoint: every relation value -----------------------------------

check(
  "relation unknown when the source has no answer",
  comparePoint(ORDERED, null, ONE("pdpo", "mid")).relation === "unknown",
);
check(
  "relation unknown when the target has no answer",
  comparePoint(ORDERED, ONE("gdpr", "mid"), null).relation === "unknown",
);
check("relation unknown when neither side has an answer", comparePoint(ORDERED, null, null).relation === "unknown");
check(
  "relation same when both chose the same option",
  comparePoint(ORDERED, ONE("gdpr", "mid"), ONE("pdpo", "mid")).relation === "same",
);
check(
  "relation more when the target's ordered option is higher",
  comparePoint(ORDERED, ONE("gdpr", "mid"), ONE("pdpo", "high")).relation === "more",
);
check(
  "relation less when the target's ordered option is lower",
  comparePoint(ORDERED, ONE("gdpr", "high"), ONE("pdpo", "mid")).relation === "less",
);
check(
  "relation different for unordered facets with different options",
  comparePoint(UNORDERED, ONE("gdpr", "a"), ONE("pdpo", "b")).relation === "different",
);

const silentPair = comparePoint(ORDERED, ONE("gdpr", "none"), ONE("pdpo", "none"));
check("bothSilent true when both chose silent options", silentPair.bothSilent === true);
check(
  "bothSilent false when only one side is silent",
  comparePoint(ORDERED, ONE("gdpr", "none"), ONE("pdpo", "mid")).bothSilent === false,
);
check("bothSilent false when a side is unknown", comparePoint(ORDERED, null, ONE("pdpo", "none")).bothSilent === false);

const pt = comparePoint(ORDERED, ONE("gdpr", "mid"), ONE("pdpo", "high"));
check(
  "point carries facet id, label, question and ordered flag",
  pt.facetId === "t.ordered" && pt.label === "Ordered point" && pt.question === "How strict?" && pt.ordered === true,
);
check(
  "point sides carry law, option label and the words of the answer",
  pt.source.lawId === "gdpr" &&
    pt.source.optionLabel === "Middle" &&
    pt.target.optionLabel === "High" &&
    pt.target.says === "pdpo says high" &&
    pt.target.citation === "s.1" &&
    pt.target.quote === "some quoted words here",
);
check("point side is null for a missing answer", comparePoint(ORDERED, null, ONE("pdpo", "mid")).source === null);

// ---- pickAnswer -------------------------------------------------------------

check(
  "pickAnswer ordered: picks the stricter of two laws in a jurisdiction",
  pickAnswer(ORDERED, [ONE("gdpr", "mid"), ONE("uk-gdpr", "high")]).lawId === "uk-gdpr",
);
check(
  "pickAnswer ordered: picks the stricter regardless of order",
  pickAnswer(ORDERED, [ONE("uk-gdpr", "high"), ONE("gdpr", "mid")]).lawId === "uk-gdpr",
);
check(
  "pickAnswer ordered: a law with no answer does not win",
  pickAnswer(ORDERED, [{ lawId: "gdpr", lawShortName: "GDPR", answer: undefined }, ONE("uk-gdpr", "mid")]).lawId ===
    "uk-gdpr",
);
check(
  "pickAnswer unordered: picks the first non-silent answer",
  pickAnswer(UNORDERED, [ONE("gdpr", "x"), ONE("uk-gdpr", "b"), ONE("pdpo", "a")]).lawId === "uk-gdpr",
);
check(
  "pickAnswer unordered: first law wins when both are non-silent",
  pickAnswer(UNORDERED, [ONE("gdpr", "a"), ONE("uk-gdpr", "b")]).lawId === "gdpr",
);
check(
  "pickAnswer unordered: falls back to the first answer when all are silent",
  pickAnswer(UNORDERED, [ONE("gdpr", "x"), ONE("uk-gdpr", "x")]).lawId === "gdpr",
);
check(
  "pickAnswer unordered: skips a law with no answer",
  pickAnswer(UNORDERED, [{ lawId: "gdpr", lawShortName: "GDPR" }, ONE("uk-gdpr", "x")]).lawId === "uk-gdpr",
);
check("pickAnswer: null when no law answers", pickAnswer(ORDERED, [{ lawId: "gdpr", lawShortName: "GDPR" }]) === null);
check("pickAnswer: null for an empty jurisdiction", pickAnswer(UNORDERED, []) === null);

// ---- compareRequirement: verdicts ------------------------------------------

const req = (facets, source, target, sourceStrictness, targetStrictness) =>
  compareRequirement({
    facets,
    sourceAnswers: source,
    targetAnswers: target,
    sourceStrictness,
    targetStrictness,
  });

const single = (facetId, lawId, option) => ({ [facetId]: [ONE(lawId, option)] });

check(
  "verdict more: target asks for more on the points",
  req([ORDERED], single("t.ordered", "gdpr", "mid"), single("t.ordered", "pdpo", "high"), 1, 2).verdict === "more",
);
check(
  "verdict less: target asks for less on the points",
  req([ORDERED], single("t.ordered", "gdpr", "high"), single("t.ordered", "pdpo", "mid"), 2, 1).verdict === "less",
);
check(
  "verdict same: identical points and scores",
  req([ORDERED], single("t.ordered", "gdpr", "mid"), single("t.ordered", "pdpo", "mid"), 2, 2).verdict === "same",
);
check(
  "verdict different: unordered facets differ",
  req([UNORDERED], single("t.unordered", "gdpr", "a"), single("t.unordered", "pdpo", "b"), 2, 2).verdict ===
    "different",
);
const mixed = req(
  [ORDERED, { ...ORDERED, id: "t.ordered-2" }],
  { ...single("t.ordered", "gdpr", "mid"), ...single("t.ordered-2", "gdpr", "high") },
  { ...single("t.ordered", "pdpo", "high"), ...single("t.ordered-2", "pdpo", "mid") },
  2,
  2,
);
check("verdict mixed: more on one point and less on another", mixed.verdict === "mixed");
check("mixed is a gap", isGap(mixed.verdict) === true);
check(
  "verdict neither: every comparable point silent on both sides, scores 0",
  req([ORDERED], single("t.ordered", "gdpr", "none"), single("t.ordered", "pdpo", "none"), 0, 0).verdict === "neither",
);
check(
  "verdict is not neither when a score is above 0, even if the points are silent",
  req([ORDERED], single("t.ordered", "gdpr", "none"), single("t.ordered", "pdpo", "none"), 0, 1).verdict !== "neither",
);

// ---- compareRequirement: byScoreOnly ----------------------------------------

const noAnswers = {};
const scoreOnly = req([ORDERED], noAnswers, noAnswers, 0, 0);
check("byScoreOnly: no answers and both scores 0 gives neither", scoreOnly.verdict === "neither");
check("byScoreOnly: flagged when no point can be compared", scoreOnly.byScoreOnly === true);
check("byScoreOnly: no answers, target score higher gives more", req([ORDERED], noAnswers, noAnswers, 1, 3).verdict === "more");
check("byScoreOnly: no answers, target score lower gives less", req([ORDERED], noAnswers, noAnswers, 3, 1).verdict === "less");
check("byScoreOnly: no answers, equal scores give same", req([ORDERED], noAnswers, noAnswers, 2, 2).verdict === "same");
check("byScoreOnly: not flagged when points were compared", req([ORDERED], single("t.ordered", "gdpr", "mid"), single("t.ordered", "pdpo", "mid"), 2, 2).byScoreOnly === false);

// ---- compareRequirement: scoreDisagrees -----------------------------------

// The points decide the verdict. The score can only set scoreDisagrees (a flag).

const samePts = req([ORDERED], single("t.ordered", "gdpr", "mid"), single("t.ordered", "pdpo", "mid"), 1, 2);
check("points all same, target score higher: verdict is same, not more", samePts.verdict === "same");
check("points all same, target score higher: scoreDisagrees true", samePts.scoreDisagrees === true);
check("points all same, target score higher: needsSecondLook true", needsSecondLook(samePts) === true);
check("points all same, target score higher: not a gap", isGap(samePts.verdict) === false);

const lessPts = req([ORDERED], single("t.ordered", "gdpr", "high"), single("t.ordered", "pdpo", "mid"), 1, 2);
check("points less, target score higher: verdict is less, not more", lessPts.verdict === "less");
check("points less, target score higher: scoreDisagrees true", lessPts.scoreDisagrees === true);
check("points less, target score higher: needsSecondLook true", needsSecondLook(lessPts) === true);

const diffPts = req([UNORDERED], single("t.unordered", "gdpr", "a"), single("t.unordered", "pdpo", "b"), 1, 2);
check("points different, target score higher: verdict is different", diffPts.verdict === "different");
check("points different, target score higher: scoreDisagrees true", diffPts.scoreDisagrees === true);
check("points different, target score higher: needsSecondLook false", needsSecondLook(diffPts) === false);

for (const [label, s, t] of [
  ["source 3 target 0", 3, 0],
  ["source 0 target 3", 0, 3],
  ["source 1 target 2", 1, 2],
  ["source 2 target 2", 2, 2],
]) {
  const r = req([ORDERED], single("t.ordered", "gdpr", "mid"), single("t.ordered", "pdpo", "high"), s, t);
  check(
    `points more (${label}): verdict more, scoreDisagrees false`,
    r.verdict === "more" && r.scoreDisagrees === false,
  );
}

const mixedHigher = req(
  [ORDERED, { ...ORDERED, id: "t.ordered-2" }],
  { ...single("t.ordered", "gdpr", "mid"), ...single("t.ordered-2", "gdpr", "high") },
  { ...single("t.ordered", "pdpo", "high"), ...single("t.ordered-2", "pdpo", "mid") },
  1,
  3,
);
check("points mixed, target score higher: verdict mixed, scoreDisagrees false", mixedHigher.verdict === "mixed" && mixedHigher.scoreDisagrees === false);

check(
  "scoreDisagrees: not set when the points and scores agree",
  req([ORDERED], single("t.ordered", "gdpr", "mid"), single("t.ordered", "pdpo", "mid"), 2, 2).scoreDisagrees === false,
);
check(
  "silent points, scores 0 and 1: verdict same (not more), flagged for a second look",
  (() => {
    const r = req([ORDERED], single("t.ordered", "gdpr", "none"), single("t.ordered", "pdpo", "none"), 0, 1);
    return r.verdict === "same" && r.scoreDisagrees === true && needsSecondLook(r) === true;
  })(),
);

// ---- needsSecondLook ----------------------------------------------------------

check("needsSecondLook: same with the flag is true", needsSecondLook({ verdict: "same", scoreDisagrees: true }) === true);
check("needsSecondLook: less with the flag is true", needsSecondLook({ verdict: "less", scoreDisagrees: true }) === true);
check("needsSecondLook: different with the flag is false", needsSecondLook({ verdict: "different", scoreDisagrees: true }) === false);
check("needsSecondLook: more with the flag is false", needsSecondLook({ verdict: "more", scoreDisagrees: true }) === false);
check("needsSecondLook: same without the flag is false", needsSecondLook({ verdict: "same", scoreDisagrees: false }) === false);

// ---- compareRequirement: functions and maps ---------------------------------

check(
  "accepts answers as a function of facet id",
  req(
    [ORDERED],
    (id) => (id === "t.ordered" ? [ONE("gdpr", "mid")] : []),
    (id) => (id === "t.ordered" ? [ONE("pdpo", "high")] : []),
    1,
    2,
  ).verdict === "more",
);
check(
  "points come back in facet order",
  req([ORDERED, UNORDERED], noAnswers, noAnswers, 0, 0).points.map((p) => p.facetId).join() ===
    "t.ordered,t.unordered",
);

// ---- isGap ---------------------------------------------------------------

check("isGap: more is a gap", isGap("more") === true);
check("isGap: mixed is a gap", isGap("mixed") === true);
for (const v of ["less", "same", "different", "neither"]) {
  check(`isGap: ${v} is not a gap`, isGap(v) === false);
}

// ---- verdictLabel -----------------------------------------------------------

check("verdictLabel: more names the target", verdictLabel("more", "GDPR", "PDPO") === "PDPO asks for more");
check("verdictLabel: less names the target", verdictLabel("less", "GDPR", "PDPO") === "PDPO asks for less");
check(
  "verdictLabel: mixed names the target",
  verdictLabel("mixed", "GDPR", "PDPO") === "PDPO asks for more on some points and less on others",
);
check("verdictLabel: same has no placeholder", verdictLabel("same", "GDPR", "PDPO") === "Same in substance");
check("verdictLabel: neither has no placeholder", verdictLabel("neither", "GDPR", "PDPO") === "Neither law deals with this");
check("verdictLabel: different", verdictLabel("different", "GDPR", "PDPO") === "Different approach");

// ---- sameMeaningDifferentWords ----------------------------------------------

/** Both sides choose "mid" on ORDERED; each names it with the given own term. */
const sameOptionWithTerms = (sourceTerm, targetTerm) =>
  comparePoint(
    ORDERED,
    ONE("gdpr", "mid", sourceTerm === undefined ? {} : { ownTerm: sourceTerm }),
    ONE("pdpo", "mid", targetTerm === undefined ? {} : { ownTerm: targetTerm }),
  );

check(
  "sameMeaningDifferentWords: same option, different own names",
  sameMeaningDifferentWords(sameOptionWithTerms("prescribed consent", "express consent")) === true,
);
check(
  "sameMeaningDifferentWords: own names differ only by case is not different",
  sameMeaningDifferentWords(sameOptionWithTerms("Consent", "consent")) === false,
);
check(
  "sameMeaningDifferentWords: false when the relation is not same",
  sameMeaningDifferentWords(
    comparePoint(ORDERED, ONE("gdpr", "mid", { ownTerm: "a" }), ONE("pdpo", "high", { ownTerm: "b" })),
  ) === false,
);
check(
  "sameMeaningDifferentWords: false when a side has no own name",
  sameMeaningDifferentWords(sameOptionWithTerms("prescribed consent", undefined)) === false,
);

// ---- real data ---------------------------------------------------------------

const facetsData = JSON.parse(readFileSync(join(ROOT, "lib", "data", "facets.json"), "utf8"));
const realFacets = facetsData.facets;
const answersDir = join(ROOT, "lib", "data", "facet-answers");
const filled = [];
for (const file of readdirSync(answersDir).filter((f) => f.endsWith(".json")).sort()) {
  const lawId = file.slice(0, -5);
  const doc = JSON.parse(readFileSync(join(answersDir, file), "utf8"));
  if (!doc.answers || Object.keys(doc.answers).length === 0) {
    skipped.push(`- skipped: answers not filled in yet (${lawId})`);
    continue;
  }
  filled.push({ lawId, answers: doc.answers });
}

const answersFnFor = (answers, lawId) => (facetId) =>
  answers[facetId] ? [{ lawId, lawShortName: lawId.toUpperCase(), answer: answers[facetId] }] : [];

for (const { lawId, answers } of filled) {
  const bad = [];
  let verdictBad = null;
  for (const requirement of new Set(realFacets.map((f) => f.requirementId))) {
    const facets = realFacets.filter((f) => f.requirementId === requirement);
    const r = compareRequirement({
      facets,
      sourceAnswers: answersFnFor(answers, lawId),
      targetAnswers: answersFnFor(answers, lawId),
      sourceStrictness: 0,
      targetStrictness: 0,
    });
    for (const p of r.points) if (p.relation !== "same") bad.push(`${p.facetId} (${p.relation})`);
    if (verdictBad === null && r.verdict !== "same" && r.verdict !== "neither") verdictBad = `${requirement}: ${r.verdict}`;
  }
  check(`${lawId} compared with itself is "same" on every point`, bad.length === 0, bad.join(", "));
  check(
    `${lawId} compared with itself gives "same" or "neither" for every requirement`,
    verdictBad === null,
    verdictBad ?? "",
  );
}

for (let i = 0; i < filled.length; i++) {
  for (let j = 0; j < filled.length; j++) {
    if (i === j) continue;
    const A = filled[i];
    const B = filled[j];
    const mismatched = [];
    for (const facet of realFacets.filter((f) => f.ordered)) {
      const ab = comparePoint(
        facet,
        pickAnswer(facet, answersFnFor(A.answers, A.lawId)(facet.id)),
        pickAnswer(facet, answersFnFor(B.answers, B.lawId)(facet.id)),
      ).relation;
      const ba = comparePoint(
        facet,
        pickAnswer(facet, answersFnFor(B.answers, B.lawId)(facet.id)),
        pickAnswer(facet, answersFnFor(A.answers, A.lawId)(facet.id)),
      ).relation;
      if ((ab === "more") !== (ba === "less")) mismatched.push(`${facet.id} (${ab} / ${ba})`);
    }
    check(
      `${A.lawId} -> ${B.lawId} is "more" exactly when ${B.lawId} -> ${A.lawId} is "less"`,
      mismatched.length === 0,
      mismatched.join(", "),
    );
  }
}

// The points decide: a cell may read "more" or "mixed" only if one of its points
// says "more". Run with the real 0-3 scores, so the score path is exercised too.
{
  const strictness = Object.fromEntries(
    filled.map(({ lawId }) => [
      lawId,
      Object.fromEntries(readMappings(ROOT, lawId).map((m) => [m.requirementId, m.strictness])),
    ]),
  );
  const requirementIds = [...new Set(realFacets.map((f) => f.requirementId))];
  let cells = 0;
  const violations = [];
  for (const A of filled) {
    for (const B of filled) {
      if (A === B) continue;
      for (const requirementId of requirementIds) {
        cells++;
        const facets = realFacets.filter((f) => f.requirementId === requirementId);
        const r = compareRequirement({
          facets,
          sourceAnswers: answersFnFor(A.answers, A.lawId),
          targetAnswers: answersFnFor(B.answers, B.lawId),
          sourceStrictness: strictness[A.lawId][requirementId] ?? 0,
          targetStrictness: strictness[B.lawId][requirementId] ?? 0,
        });
        if ((r.verdict === "more" || r.verdict === "mixed") && !r.points.some((p) => p.relation === "more")) {
          violations.push(`${A.lawId} -> ${B.lawId} / ${requirementId} (${r.verdict})`);
        }
      }
    }
  }
  check(
    `no cell among ${cells} ordered law pairs x requirements reads "more" or "mixed" without a "more" point`,
    violations.length === 0,
    violations.slice(0, 10).join("; "),
  );
}

// ---- report ----------------------------------------------------------------
const lines = ["# Comparison engine check\n"];
for (const r of results) {
  lines.push(`- ${r.ok ? "✓" : "✗"} ${r.name}${r.ok ? "" : ` — ${r.detail}`}`);
}
for (const s of skipped) lines.push(s);
lines.push(
  `\n${results.length - failures}/${results.length} passed.` + (failures ? ` **${failures} FAILED.**` : ""),
);
console.log(lines.join("\n"));
process.exit(failures ? 1 : 0);
