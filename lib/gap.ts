import type { Jurisdiction, Requirement, RequirementMapping, Strictness } from "@/lib/types";
import { jurisdictionsById, lawsByJurisdiction, requirements } from "@/lib/data";
import { answersFor, facetsByRequirement, type Facet, type FacetAnswer } from "@/lib/facets";
import {
  compareRequirement as compareRequirementJs,
  isGap as isGapJs,
  needsSecondLook as needsSecondLookJs,
  sameMeaningDifferentWords as sameMeaningDifferentWordsJs,
} from "@/lib/compare.mjs";

// ---------------------------------------------------------------------------
// Gap-analysis engine.
//
// Each requirement is split into the points of comparison that practitioners
// actually compare (lib/data/facets.json). Every law is placed on every point
// from its own text, and the two jurisdictions are compared point by point by
// what they require, not by the words they use (lib/compare.mjs). The result
// for a requirement is a verdict:
//   more       the target asks for more on at least one point, and less on none
//   mixed      the target asks for more on some points and less on others
//   different  the two take different approaches to the same point
//   same       the two line up on every point compared
//   less       the source asks for more on every point where they differ
//   neither    both laws are silent on every point and both scores are 0
// Where no point can be compared (no answers yet), the verdict falls back to
// the 0-3 strictness scores, and the comparison says so (byScoreOnly).
// Otherwise the points decide. When the points say same or less but the
// target's overall score is higher, the row is flagged for a second look
// (needsSecondLook) and kept out of "covered"; the verdict itself is unchanged.
//
// The strictness score is a simplified 0-3 heuristic for prioritization only.
// It is not legal advice. Always read the underlying obligations and citations.
// ---------------------------------------------------------------------------

export type PointRelation = "unknown" | "same" | "more" | "less" | "different";

export type Verdict = "same" | "more" | "less" | "mixed" | "different" | "neither";

/** One side of a point: what one law says on that point, and its option. */
export interface PointSide {
  lawId: string;
  lawShortName: string;
  optionId: string;
  optionLabel: string;
  says: string;
  ownTerm?: string;
  citation?: string;
  quote?: string;
}

/** One point of comparison within a requirement. */
export interface Point {
  facetId: string;
  label: string;
  question: string;
  ordered: boolean;
  relation: PointRelation;
  bothSilent: boolean;
  source: PointSide | null;
  target: PointSide | null;
}

interface EngineLawAnswer {
  lawId: string;
  lawShortName: string;
  answer?: FacetAnswer;
}

interface EngineArgs {
  facets: Facet[];
  sourceAnswers: (facetId: string) => EngineLawAnswer[];
  targetAnswers: (facetId: string) => EngineLawAnswer[];
  sourceStrictness: number;
  targetStrictness: number;
}

interface EngineResult {
  points: Point[];
  verdict: Verdict;
  byScoreOnly: boolean;
  scoreDisagrees: boolean;
}

// The engine is plain JavaScript with JSDoc types. The casts are made once,
// here, so every page gets the types above.
const compareRequirement = compareRequirementJs as unknown as (args: EngineArgs) => EngineResult;
const isGap = isGapJs as unknown as (verdict: Verdict) => boolean;
const needsSecondLook = needsSecondLookJs as unknown as (result: {
  verdict: Verdict;
  scoreDisagrees: boolean;
}) => boolean;
/** True when two laws mean the same thing under different names for it. */
export const sameMeaningDifferentWords = sameMeaningDifferentWordsJs as unknown as (
  point: Point,
) => boolean;

export interface RequirementComparison {
  requirement: Requirement;
  sourceStrictness: Strictness;
  targetStrictness: Strictness;
  sourceObligation: string;
  targetObligation: string;
  targetCitation: string;
  /** Target strictness minus source strictness. Positive means the target is stricter. */
  delta: number;
  /**
   * Whether the winning mapping on each side quotes the statute.
   *
   * This is what decides whether a cell needs its search trace shown. A gap is
   * asserted by comparing the two scores, and where the SOURCE score rests on
   * no quoted text it is the unevidenced half that is driving the conclusion —
   * so that is the half a reader has to be able to inspect.
   */
  sourceQuoted: boolean;
  targetQuoted: boolean;
  /** Every law in each jurisdiction, so all relevant traces can be pulled. */
  sourceLawIds: string[];
  targetLawIds: string[];
  /** Every point of comparison for this requirement, with both laws' placements. */
  points: Point[];
  /** What the two laws amount to on this requirement. See the header of this file. */
  verdict: Verdict;
  /** No point could be compared, so the verdict rests on the 0-3 scores alone. */
  byScoreOnly: boolean;
  /**
   * The points say same, less or different, but the target's overall score is
   * higher. A flag only: the verdict stays where the points put it.
   */
  scoreDisagrees: boolean;
  /** scoreDisagrees on a "same" or "less" row: the points may miss something the score records. */
  needsSecondLook: boolean;
  /**
   * Neither side addresses this requirement at all.
   *
   * Without this, such a row would read as reassurance, when what it actually
   * means is that two instruments are both silent. Absence of data is not
   * absence of law: a duty may sit in a sectoral statute, a regulator's
   * guidance or a contract, none of which this catalog holds.
   */
  neitherAddresses: boolean;
}

export interface GapResult {
  source: Jurisdiction;
  target: Jurisdiction;
  comparisons: RequirementComparison[];
  /**
   * Where the target asks for more than the source (verdict "more" or "mixed").
   * Most points first, then largest score difference.
   */
  gaps: RequirementComparison[];
  /**
   * Where the two take a different approach to the same ground (verdict "different").
   * A row here may still carry scoreDisagrees, which the page notes.
   */
  different: RequirementComparison[];
  /**
   * Where the points say the source already meets the target or asks for more,
   * but the target's overall score is higher (needsSecondLook). Read the target's rule.
   */
  secondLook: RequirementComparison[];
  /**
   * Where the source already meets the target, or asks for more, and nothing
   * calls for a second look (verdict "same" or "less", not needsSecondLook).
   */
  covered: RequirementComparison[];
  /** Where neither law deals with the requirement (verdict "neither"). */
  neither: RequirementComparison[];
}

export interface AggregatedMapping {
  strictness: Strictness;
  obligation: string;
  citation: string;
  /** Does the winning mapping quote the statute, or is it an unevidenced claim? */
  quoted: boolean;
  /** Every law in this jurisdiction, for pulling search traces. */
  lawIds: string[];
}

/** For one jurisdiction, take the strictest mapping across its laws per requirement. */
export function aggregateByJurisdiction(jurisdictionId: string): Record<string, AggregatedMapping> {
  const laws = lawsByJurisdiction(jurisdictionId);
  const lawIds = laws.map((l) => l.id);
  const out: Record<string, AggregatedMapping> = {};

  for (const requirement of requirements) {
    // Take the strictest mapping, INCLUDING one that scores 0. The old loop
    // only replaced the default when a mapping scored above it, so a law that
    // had considered a requirement and found nothing was shown the generic
    // "Not addressed." instead of its own sentence — discarding the most
    // useful thing about the cell. PIPEDA's localization entry, for instance,
    // says the federal Act imposes nothing and points at provincial
    // public-sector rules, which is a far better answer than a blank.
    let winner: { law: (typeof laws)[number]; mapping: RequirementMapping } | null = null;
    for (const law of laws) {
      const mapping = law.mappings[requirement.id];
      if (!mapping) continue;
      if (!winner || mapping.strictness > winner.mapping.strictness) winner = { law, mapping };
    }

    out[requirement.id] = winner
      ? {
          strictness: winner.mapping.strictness,
          obligation: winner.mapping.obligation,
          citation: `${winner.mapping.citation} · ${winner.law.shortName}`,
          quoted: Boolean(winner.mapping.quote),
          lawIds,
        }
      : {
          // No mapping at all, as opposed to a mapping that found nothing.
          // Named rather than left blank: an unexamined requirement and an
          // examined-and-absent one are different claims.
          strictness: 0,
          obligation: "Not yet mapped against this jurisdiction's laws.",
          citation: "—",
          quoted: false,
          lawIds,
        };
  }

  return out;
}

/** Every law in a jurisdiction, with its placement on one point (undefined when not yet placed). */
function answersByJurisdiction(jurisdictionId: string, facetId: string): EngineLawAnswer[] {
  return lawsByJurisdiction(jurisdictionId).map((law) => ({
    lawId: law.id,
    lawShortName: law.shortName,
    answer: answersFor(law.id)[facetId],
  }));
}

function countRelation(c: RequirementComparison, relation: PointRelation): number {
  return c.points.filter((p) => p.relation === relation).length;
}

export function analyzeGap(sourceJurisdictionId: string, targetJurisdictionId: string): GapResult {
  const source = jurisdictionsById[sourceJurisdictionId];
  const target = jurisdictionsById[targetJurisdictionId];
  if (!source || !target) {
    throw new Error("Unknown jurisdiction id supplied to analyzeGap");
  }

  const sourceAgg = aggregateByJurisdiction(sourceJurisdictionId);
  const targetAgg = aggregateByJurisdiction(targetJurisdictionId);

  const comparisons: RequirementComparison[] = requirements.map((requirement) => {
    const s = sourceAgg[requirement.id];
    const t = targetAgg[requirement.id];
    const outcome = compareRequirement({
      facets: facetsByRequirement(requirement.id),
      sourceAnswers: (facetId) => answersByJurisdiction(sourceJurisdictionId, facetId),
      targetAnswers: (facetId) => answersByJurisdiction(targetJurisdictionId, facetId),
      sourceStrictness: s.strictness,
      targetStrictness: t.strictness,
    });
    return {
      requirement,
      sourceStrictness: s.strictness,
      targetStrictness: t.strictness,
      sourceObligation: s.obligation,
      targetObligation: t.obligation,
      targetCitation: t.citation,
      delta: t.strictness - s.strictness,
      sourceQuoted: s.quoted,
      targetQuoted: t.quoted,
      sourceLawIds: s.lawIds,
      targetLawIds: t.lawIds,
      points: outcome.points,
      verdict: outcome.verdict,
      byScoreOnly: outcome.byScoreOnly,
      scoreDisagrees: outcome.scoreDisagrees,
      needsSecondLook: needsSecondLook(outcome),
      neitherAddresses: outcome.verdict === "neither",
    };
  });

  // Gaps: most points where the target asks for more first, then largest score difference.
  const gaps = comparisons
    .filter((c) => isGap(c.verdict))
    .sort(
      (a, b) =>
        countRelation(b, "more") - countRelation(a, "more") || b.delta - a.delta,
    );
  const different = comparisons.filter((c) => c.verdict === "different");
  const secondLook = comparisons.filter((c) => c.needsSecondLook);
  const covered = comparisons.filter(
    (c) => (c.verdict === "same" || c.verdict === "less") && !c.needsSecondLook,
  );
  const neither = comparisons.filter((c) => c.verdict === "neither");

  return { source, target, comparisons, gaps, different, secondLook, covered, neither };
}
