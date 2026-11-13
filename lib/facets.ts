import facetsData from "./data/facets.json";
import gdprAnswers from "./data/facet-answers/gdpr.json";
import ukGdprAnswers from "./data/facet-answers/uk-gdpr.json";
import ccpaAnswers from "./data/facet-answers/ccpa.json";
import pipedaAnswers from "./data/facet-answers/pipeda.json";
import quebecLaw25Answers from "./data/facet-answers/quebec-law25.json";
import piplAnswers from "./data/facet-answers/pipl.json";
import pdpoAnswers from "./data/facet-answers/pdpo.json";
import popiaAnswers from "./data/facet-answers/popia.json";

// ---------------------------------------------------------------------------
// Typed access to the points of comparison.
//
// lib/data/facets.json defines the points. lib/data/facet-answers/<lawId>.json
// holds one law's placement on every point, checked by scripts/check-facets.mjs.
// The answer files are imported statically so the static export carries them.
// ---------------------------------------------------------------------------

export interface FacetOption {
  id: string;
  label: string;
  /** The law does not deal with this point. */
  silent?: boolean;
}

export interface Facet {
  id: string;
  requirementId: string;
  label: string;
  question: string;
  /** Options run from least to most demanding when true. */
  ordered: boolean;
  options: FacetOption[];
}

/** A cross-jurisdiction concept, e.g. "data user" is the organisation. */
export interface TermConcept {
  id: string;
  concept: string;
}

/** One law's placement on one facet. */
export interface FacetAnswer {
  option: string;
  says: string;
  ownTerm?: string;
  citation?: string;
  quote?: string;
}

/** How one law names one concept. `term` is null when the law has no such term. */
export interface TermEntry {
  term: string | null;
  citation?: string;
  quote?: string;
  note?: string;
}

export interface LawFacetAnswers {
  lawId: string;
  answers: Record<string, FacetAnswer>;
  terms: Record<string, TermEntry>;
}

const data = facetsData as unknown as { terms: TermConcept[]; facets: Facet[] };

/** The term concepts (organisation, vendor, person, ...). */
export const terms: TermConcept[] = data.terms;

/** Every facet, in the order defined in facets.json. */
export const facets: Facet[] = data.facets;

/** The facets that make up one requirement, in facets.json order. */
export function facetsByRequirement(requirementId: string): Facet[] {
  return facets.filter((f) => f.requirementId === requirementId);
}

// The JSON is loaded as unknown and asserted here: the answer files are edited
// by hand and their inferred JSON types would otherwise change with every edit.
function asAnswers(json: unknown): LawFacetAnswers {
  return json as LawFacetAnswers;
}

const answersByLaw: Record<string, LawFacetAnswers> = {
  gdpr: asAnswers(gdprAnswers),
  "uk-gdpr": asAnswers(ukGdprAnswers),
  ccpa: asAnswers(ccpaAnswers),
  pipeda: asAnswers(pipedaAnswers),
  "quebec-law25": asAnswers(quebecLaw25Answers),
  pipl: asAnswers(piplAnswers),
  pdpo: asAnswers(pdpoAnswers),
  popia: asAnswers(popiaAnswers),
};

/** A law's answers keyed by facet id. Empty for a law with no answers. */
export function answersFor(lawId: string): Record<string, FacetAnswer> {
  return answersByLaw[lawId]?.answers ?? {};
}

/** A law's own names for the term concepts, keyed by term id. Empty for an unknown law. */
export function termsFor(lawId: string): Record<string, TermEntry> {
  return answersByLaw[lawId]?.terms ?? {};
}
