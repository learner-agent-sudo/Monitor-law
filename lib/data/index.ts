import type { Law } from "@/lib/types";
import { gdpr } from "./laws/gdpr";
import { ccpa } from "./laws/ccpa";
import { pipeda } from "./laws/pipeda";
import { quebecLaw25 } from "./laws/quebec-law25";
import { pipl } from "./laws/pipl";

export { jurisdictions, jurisdictionsById } from "./jurisdictions";
export { requirements, requirementsById, requirementCategories } from "./requirements";

export const laws: Law[] = [gdpr, ccpa, pipeda, quebecLaw25, pipl];

export const lawsById: Record<string, Law> = Object.fromEntries(laws.map((l) => [l.id, l]));

export function lawsByJurisdiction(jurisdictionId: string): Law[] {
  return laws.filter((l) => l.jurisdictionId === jurisdictionId);
}
