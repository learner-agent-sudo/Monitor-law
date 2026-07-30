import type { Jurisdiction, Requirement, Strictness } from "@/lib/types";
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
}

/** For one jurisdiction, take the strictest mapping across its laws per requirement. */
export function aggregateByJurisdiction(jurisdictionId: string): Record<string, AggregatedMapping> {
  const laws = lawsByJurisdiction(jurisdictionId);
  const out: Record<string, AggregatedMapping> = {};

  for (const requirement of requirements) {
    let best: AggregatedMapping = { strictness: 0, obligation: "Not addressed.", citation: "—" };
    for (const law of laws) {
      const mapping = law.mappings[requirement.id];
      if (mapping && mapping.strictness > best.strictness) {
        best = {
          strictness: mapping.strictness,
          obligation: mapping.obligation,
          citation: `${mapping.citation} · ${law.shortName}`,
        };
      }
    }
    out[requirement.id] = best;
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
    };
  });

  const gaps = comparisons
    .filter((c) => c.delta > 0)
    .sort((a, b) => b.delta - a.delta);
  const covered = comparisons.filter((c) => c.delta <= 0);

  return { source, target, comparisons, gaps, covered };
}
