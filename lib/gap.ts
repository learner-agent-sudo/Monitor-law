import type { Jurisdiction, Requirement, RequirementMapping, Strictness } from "@/lib/types";
import { jurisdictionsById, lawsByJurisdiction, requirements } from "@/lib/data";

// ---------------------------------------------------------------------------
// Gap-analysis engine.
//
// The comparison is deliberately transparent: for each requirement we take the
// STRICTEST obligation across all of a jurisdiction's laws, then compare the
// "source" jurisdiction (what you already comply with) against the "target"
// jurisdiction (what you want to comply with). A gap exists wherever the target
// demands more than the source provides.
//
// The strictness score is a simplified 0–3 heuristic for prioritization only —
// it is not legal advice. Always read the underlying obligations and citations.
// ---------------------------------------------------------------------------

export interface RequirementComparison {
  requirement: Requirement;
  sourceStrictness: Strictness;
  targetStrictness: Strictness;
  sourceObligation: string;
  targetObligation: string;
  targetCitation: string;
  /** Positive means the target is stricter than the source (a gap to close). */
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
  /**
   * Neither side addresses this requirement at all.
   *
   * Without this, such a row lands in "already covered" and reads as
   * reassurance, when what it actually means is that two instruments are both
   * silent. Absence of data is not absence of law: a duty may sit in a
   * sectoral statute, a regulator's guidance or a contract, none of which this
   * catalog holds.
   */
  neitherAddresses: boolean;
}

export interface GapResult {
  source: Jurisdiction;
  target: Jurisdiction;
  comparisons: RequirementComparison[];
  /** Only the requirements where the target demands more than the source. */
  gaps: RequirementComparison[];
  /** Requirements the source already meets or exceeds. */
  covered: RequirementComparison[];
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
      neitherAddresses: s.strictness === 0 && t.strictness === 0,
    };
  });

  const gaps = comparisons
    .filter((c) => c.delta > 0)
    .sort((a, b) => b.delta - a.delta);
  const covered = comparisons.filter((c) => c.delta <= 0);

  return { source, target, comparisons, gaps, covered };
}
