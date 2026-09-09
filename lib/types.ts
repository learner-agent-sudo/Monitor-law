// ---------------------------------------------------------------------------
// Core domain types for the Privacy & AI Law Monitor.
//
// These shapes intentionally mirror the eventual database tables (Jurisdiction,
// Law, Requirement, LawRequirementMap) so the file-based MVP can be migrated to
// Postgres/Supabase later without changing the application logic.
// ---------------------------------------------------------------------------

export type Domain = "privacy" | "ai";

export type LawStatus = "in-force" | "proposed" | "repealed";

/**
 * How strongly a given law addresses a given requirement.
 * Used both for display and as the comparison key for gap analysis.
 *   0 = not addressed
 *   1 = limited / indirect
 *   2 = moderate / partial
 *   3 = comprehensive / strict
 */
export type Strictness = 0 | 1 | 2 | 3;

export interface Jurisdiction {
  id: string; // e.g. "us-ca", "eu", "ca", "cn"
  name: string; // e.g. "California (USA)"
  region: string; // e.g. "North America", "Europe", "Asia-Pacific"
  flag: string; // emoji flag for quick visual scanning
}

/** A single normalized obligation that every privacy law is mapped against. */
export interface Requirement {
  id: string; // e.g. "breach-notification"
  category: string; // grouping for the UI, e.g. "Individual Rights"
  name: string; // short human label
  description: string; // one-line explanation of the obligation
  domain: Domain;
}

/**
 * What kind of source a mapping rests on.
 *
 * Control 1 says only primary text may be the basis of a stated requirement,
 * and until this field existed the catalog could not honour that: a mapping
 * resting on a regulator's best-practice guide looked exactly like one resting
 * on a statutory duty. Both carried a strictness score, and strictness measures
 * how firmly something is imposed — not whether it is law at all. Those are
 * different questions and the second one has to be answerable.
 *
 *   statute         The ingested primary text. Requires a verbatim quote,
 *                   verified inside the provision cited.
 *   guidance        A regulator's published view. Persuasive, often decisive in
 *                   practice, and NOT the statute — a regulator can change it
 *                   without any law changing. Cannot ground a stated
 *                   requirement, and is displayed as guidance.
 *   outside-corpus  Real binding law whose text this repository does not hold.
 *                   Named honestly so its absence is visible rather than read
 *                   as "no such rule".
 */
export type MappingSource = "statute" | "guidance" | "outside-corpus";

/** How one law addresses one requirement. */
export interface RequirementMapping {
  strictness: Strictness;
  /**
   * Defaults to "statute". Anything else must say so explicitly, because the
   * default is the one that carries the strongest guarantee.
   */
  sourceType?: MappingSource;
  /** One-sentence description of what the law actually requires here. */
  obligation: string;
  /** Primary-source citation (article / section reference). */
  citation: string;
  /**
   * Verbatim excerpt from corpus/<lawId>.md supporting this mapping.
   * Enforced by scripts/check-quotes.mjs — a quote that is not present in the
   * corpus fails the build.
   *
   * Omitted only where the claim is about the ABSENCE of an obligation, which
   * by definition cannot be quoted. Such mappings rest on argument, not text,
   * and should be treated as the weakest entries in the catalog.
   */
  quote?: string;
}

export interface Law {
  id: string; // e.g. "gdpr"
  jurisdictionId: string;
  name: string; // full official name
  shortName: string; // e.g. "GDPR"
  domain: Domain;
  status: LawStatus;
  /** Year (or "YYYY-MM") the law took effect. */
  effectiveDate: string;
  authority: string; // enforcing/supervisory body
  officialUrl: string; // link to primary source
  summary: string; // plain-language overview
  /** Requirement id -> mapping. Missing keys are treated as strictness 0. */
  mappings: Record<string, RequirementMapping>;
}
