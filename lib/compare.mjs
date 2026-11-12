// ---------------------------------------------------------------------------
// Point-by-point comparison of two laws.
//
// Pure functions with no file access, so the Node checks and the TypeScript
// app can both import this module (as "@/lib/compare.mjs").
//
// Each requirement is split into facets (lib/data/facets.json). Every law is
// placed on each facet by choosing one option. Two jurisdictions are compared
// by their chosen options, not by the words of the law, and a verdict says
// whether the target asks for more, less, the same, or something different.
// ---------------------------------------------------------------------------

/**
 * @typedef {{ id: string, label: string, silent?: boolean }} FacetOption
 * @typedef {{
 *   id: string,
 *   requirementId: string,
 *   label: string,
 *   question: string,
 *   ordered: boolean,
 *   options: FacetOption[]
 * }} Facet
 * @typedef {{
 *   option: string,
 *   says: string,
 *   ownTerm?: string,
 *   citation?: string,
 *   quote?: string
 * }} FacetAnswer
 * @typedef {{ lawId: string, lawShortName: string, answer?: FacetAnswer }} LawAnswer
 * @typedef {{
 *   lawId: string,
 *   lawShortName: string,
 *   optionId: string,
 *   optionLabel: string,
 *   says: string,
 *   ownTerm?: string,
 *   citation?: string,
 *   quote?: string
 * }} PointSide
 * @typedef {"unknown" | "same" | "more" | "less" | "different"} PointRelation
 * @typedef {{
 *   facetId: string,
 *   label: string,
 *   question: string,
 *   ordered: boolean,
 *   relation: PointRelation,
 *   bothSilent: boolean,
 *   source: PointSide | null,
 *   target: PointSide | null
 * }} Point
 * @typedef {"same" | "more" | "less" | "mixed" | "different" | "neither"} Verdict
 */

/**
 * Index of an option within its facet, in facet order (least to most demanding
 * for an ordered facet). -1 if the option is not in the facet.
 * @param {Facet} facet
 * @param {string} optionId
 * @returns {number}
 */
export function optionRank(facet, optionId) {
  return facet.options.findIndex((o) => o.id === optionId);
}

/**
 * Whether the option means "the law does not deal with this point".
 * An option that is not in the facet is not silent.
 * @param {Facet} facet
 * @param {string} optionId
 * @returns {boolean}
 */
export function isSilent(facet, optionId) {
  const option = facet.options.find((o) => o.id === optionId);
  return option?.silent === true;
}

/**
 * Choose the one law that speaks for a jurisdiction on one facet.
 *
 * Ordered facets: the entry with the highest-ranked option, so the stricter
 * law of a jurisdiction stands for it. Unordered facets have no "stricter", so
 * the first law that actually takes a position (not silent) is used, and only
 * if none does is a silent answer returned.
 *
 * @param {Facet} facet
 * @param {LawAnswer[]} answersByLaw  the laws of ONE jurisdiction
 * @returns {LawAnswer | null}  null when no law in the jurisdiction answers
 */
export function pickAnswer(facet, answersByLaw) {
  const answered = (answersByLaw ?? []).filter((e) => e && e.answer);
  if (!answered.length) return null;

  if (facet.ordered) {
    let best = answered[0];
    for (const entry of answered.slice(1)) {
      if (optionRank(facet, entry.answer.option) > optionRank(facet, best.answer.option)) best = entry;
    }
    return best;
  }

  return (
    answered.find((e) => !isSilent(facet, e.answer.option)) ?? answered[0]
  );
}

/**
 * @param {Facet} facet
 * @param {LawAnswer | null} pick
 * @returns {PointSide | null}
 */
function side(facet, pick) {
  if (!pick || !pick.answer) return null;
  const a = pick.answer;
  const option = facet.options.find((o) => o.id === a.option);
  return {
    lawId: pick.lawId,
    lawShortName: pick.lawShortName,
    optionId: a.option,
    optionLabel: option?.label ?? a.option,
    says: a.says,
    ownTerm: a.ownTerm,
    citation: a.citation,
    quote: a.quote,
  };
}

/**
 * Compare one facet between a source law and a target law.
 *
 * relation:
 *   "unknown"    either side has no answer
 *   "same"       both chose the same option
 *   "more"       ordered facet, the target's option is higher than the source's
 *   "less"       ordered facet, the target's option is lower
 *   "different"  unordered facet, different options
 *
 * @param {Facet} facet
 * @param {LawAnswer | null} sourcePick
 * @param {LawAnswer | null} targetPick
 * @returns {Point}
 */
export function comparePoint(facet, sourcePick, targetPick) {
  const source = side(facet, sourcePick);
  const target = side(facet, targetPick);

  /** @type {PointRelation} */
  let relation;
  if (!source || !target) {
    relation = "unknown";
  } else if (source.optionId === target.optionId) {
    relation = "same";
  } else if (facet.ordered) {
    const rs = optionRank(facet, source.optionId);
    const rt = optionRank(facet, target.optionId);
    relation = rt > rs ? "more" : rt < rs ? "less" : "same";
  } else {
    relation = "different";
  }

  const bothSilent =
    Boolean(source && target) &&
    isSilent(facet, source.optionId) &&
    isSilent(facet, target.optionId);

  return {
    facetId: facet.id,
    label: facet.label,
    question: facet.question,
    ordered: facet.ordered,
    relation,
    bothSilent,
    source,
    target,
  };
}

/**
 * Compare one requirement, facet by facet, and reach a verdict.
 *
 * sourceAnswers / targetAnswers give the answersByLaw array for a facet id.
 * They may be a function (facetId -> LawAnswer[]) or a map keyed by facet id.
 *
 * THE POINTS DECIDE. The 0-3 strictness scores never change a verdict. In plain words:
 * the points say what the verdict is; the score can only flag a row for a second look.
 *
 * Verdict rules, in order:
 *  - No point can be compared: the verdict comes from the 0-3 scores alone
 *    (both 0 -> neither; target higher -> more; lower -> less; else same).
 *  - Every comparable point is silent on both sides and both scores are 0 -> neither.
 *  - Otherwise the verdict is read from the points alone:
 *      more AND less -> mixed; more -> more; different -> different;
 *      less -> less; otherwise -> same.
 *  - scoreDisagrees is a flag, not a verdict. It is set when the points' verdict
 *    is same, less or different but the target's score is higher than the
 *    source's: the row may deserve a second look. It never changes the verdict.
 *    Read it with needsSecondLook().
 *
 * @param {{
 *   facets: Facet[],
 *   sourceAnswers: ((facetId: string) => LawAnswer[]) | Record<string, LawAnswer[]>,
 *   targetAnswers: ((facetId: string) => LawAnswer[]) | Record<string, LawAnswer[]>,
 *   sourceStrictness: number,
 *   targetStrictness: number
 * }} args
 * @returns {{ points: Point[], verdict: Verdict, byScoreOnly: boolean, scoreDisagrees: boolean }}
 */
export function compareRequirement({ facets, sourceAnswers, targetAnswers, sourceStrictness, targetStrictness }) {
  const lookup = (m, facetId) => {
    const list = typeof m === "function" ? m(facetId) : m?.[facetId];
    return list ?? [];
  };

  const points = facets.map((facet) =>
    comparePoint(
      facet,
      pickAnswer(facet, lookup(sourceAnswers, facet.id)),
      pickAnswer(facet, lookup(targetAnswers, facet.id)),
    ),
  );

  const known = points.filter((p) => p.relation !== "unknown");

  if (known.length === 0) {
    let verdict;
    if (sourceStrictness === 0 && targetStrictness === 0) verdict = "neither";
    else if (targetStrictness > sourceStrictness) verdict = "more";
    else if (targetStrictness < sourceStrictness) verdict = "less";
    else verdict = "same";
    return { points, verdict, byScoreOnly: true, scoreDisagrees: false };
  }

  if (known.every((p) => p.bothSilent) && sourceStrictness === 0 && targetStrictness === 0) {
    return { points, verdict: "neither", byScoreOnly: false, scoreDisagrees: false };
  }

  const more = known.some((p) => p.relation === "more");
  const less = known.some((p) => p.relation === "less");
  const diff = known.some((p) => p.relation === "different");

  /** @type {Verdict} */
  let verdict;
  if (more && less) verdict = "mixed";
  else if (more) verdict = "more";
  else if (diff) verdict = "different";
  else if (less) verdict = "less";
  else verdict = "same";

  // The flag only. The points' verdict above is final.
  const scoreDisagrees = verdict !== "more" && verdict !== "mixed" && targetStrictness > sourceStrictness;
  return { points, verdict, byScoreOnly: false, scoreDisagrees };
}

/**
 * Whether a row needs a second look: the points say the target asks for the
 * same or less, but the target's 0-3 score is higher. The verdict stays where
 * the points put it; the page only adds a note.
 * @param {{ verdict: Verdict, scoreDisagrees: boolean }} result
 * @returns {boolean}
 */
export function needsSecondLook(result) {
  return result.scoreDisagrees === true && (result.verdict === "same" || result.verdict === "less");
}

/**
 * A gap is where the target asks for something the source does not.
 * @param {Verdict} verdict
 * @returns {boolean}
 */
export function isGap(verdict) {
  return verdict === "more" || verdict === "mixed";
}

/** Plain-English verdict labels. {target} and {source} are filled by verdictLabel. */
export const VERDICT_LABELS = {
  more: "{target} asks for more",
  less: "{target} asks for less",
  same: "Same in substance",
  different: "Different approach",
  mixed: "{target} asks for more on some points and less on others",
  neither: "Neither law deals with this",
};

/**
 * @param {Verdict} verdict
 * @param {string} sourceName
 * @param {string} targetName
 * @returns {string}
 */
export function verdictLabel(verdict, sourceName, targetName) {
  const template = VERDICT_LABELS[verdict] ?? String(verdict);
  return template.replaceAll("{source}", sourceName).replaceAll("{target}", targetName);
}

/**
 * True when the two laws mean the same thing but use different names for it,
 * e.g. "prescribed consent" against "express consent". The UI says "same rule,
 * different name" for these.
 * @param {Point} point
 * @returns {boolean}
 */
export function sameMeaningDifferentWords(point) {
  if (point.relation !== "same") return false;
  const a = point.source?.ownTerm;
  const b = point.target?.ownTerm;
  if (typeof a !== "string" || typeof b !== "string" || !a.trim() || !b.trim()) return false;
  return a.trim().toLowerCase() !== b.trim().toLowerCase();
}
