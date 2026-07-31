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

/** How one law addresses one requirement. */
export interface RequirementMapping {
  strictness: Strictness;
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
