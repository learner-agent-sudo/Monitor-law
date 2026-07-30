// ---------------------------------------------------------------------------
// Provenance & verification status.
//
// The catalog is AI-drafted. This file records, per law, exactly how far each
// entry has been checked, so the site never implies more confidence than the
// content has actually earned.
//
//   ai-drafted     Written by AI from training knowledge. NOT checked against
//                  the primary text. Treat every figure and deadline as a lead
//                  to verify, not as a fact.
//   source-checked The automated checker fetched the primary source and
//                  confirmed the cited provisions exist in it (see
//                  scripts/verify-sources.mjs). Confirms the citation is real —
//                  NOT that the summary's interpretation is correct.
//   human-verified A person read the primary source and confirmed the summary.
//                  This is the only status that implies legal reliability.
// ---------------------------------------------------------------------------

export type VerificationStatus = "ai-drafted" | "source-checked" | "human-verified";

export interface Provenance {
  lawId: string;
  status: VerificationStatus;
  /** Stable identifier in the official register (CELEX number, chapter, code). */
  sourceRef: string;
  /** Machine-checkable URL of the primary text (pinged by CI for change detection). */
  checkUrl: string;
  /** Strings that must appear in the primary text — a cheap citation sanity check. */
  expectedMarkers: string[];
  /** ISO date this entry was last touched by a drafting or verification pass. */
  lastReviewed: string;
  /** Independent trackers, useful for cross-checking. These are NOT primary law. */
  corroboration: { name: string; url: string }[];
}

/** Entries older than this are flagged as stale for re-review. */
export const STALE_AFTER_DAYS = 180;

export const provenance: Provenance[] = [
  {
    lawId: "gdpr",
    status: "ai-drafted",
    sourceRef: "CELEX:32016R0679",
    checkUrl: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679",
    expectedMarkers: ["72 hours", "Article 33", "supervisory authority"],
    lastReviewed: "2026-07-30",
    corroboration: [
      { name: "EDPB guidelines", url: "https://www.edpb.europa.eu/our-work-tools/general-guidance/guidelines-recommendations-best-practices_en" },
      { name: "DLA Piper — EU", url: "https://www.dlapiperdataprotection.com/" },
      { name: "IAPP resource centre", url: "https://iapp.org/resources/" },
    ],
  },
  {
    lawId: "ccpa",
    status: "ai-drafted",
    sourceRef: "Cal. Civ. Code §1798.100 et seq.",
    checkUrl:
      "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5",
    expectedMarkers: ["1798.100", "1798.120", "personal information"],
    lastReviewed: "2026-07-30",
    corroboration: [
      { name: "CPPA regulations", url: "https://cppa.ca.gov/regulations/" },
      { name: "IAPP US State Privacy Tracker", url: "https://iapp.org/resources/article/us-state-privacy-legislation-tracker/" },
    ],
  },
  {
    lawId: "pipeda",
    status: "ai-drafted",
    sourceRef: "S.C. 2000, c. 5",
    checkUrl: "https://laws-lois.justice.gc.ca/eng/acts/P-8.6/FullText.html",
    expectedMarkers: ["Personal Information Protection and Electronic Documents Act", "10.1"],
    lastReviewed: "2026-07-30",
    corroboration: [
      { name: "OPC guidance", url: "https://www.priv.gc.ca/en/privacy-topics/" },
      { name: "DLA Piper — Canada", url: "https://www.dlapiperdataprotection.com/" },
    ],
  },
  {
    lawId: "quebec-law25",
    status: "ai-drafted",
    sourceRef: "CQLR c. P-39.1",
    checkUrl: "https://www.legisquebec.gouv.qc.ca/en/document/cs/p-39.1",
    expectedMarkers: ["personal information", "P-39.1"],
    lastReviewed: "2026-07-30",
    corroboration: [
      { name: "Commission d'accès à l'information", url: "https://www.cai.gouv.qc.ca/" },
    ],
  },
  {
    lawId: "pipl",
    status: "ai-drafted",
    sourceRef: "PIPL (2021)",
    checkUrl: "https://www.chinalawtranslate.com/en/personal-information-protection-law/",
    expectedMarkers: ["personal information", "Article 38", "Article 66"],
    lastReviewed: "2026-07-30",
    corroboration: [
      { name: "China Law Translate", url: "https://www.chinalawtranslate.com/" },
      { name: "Stanford DigiChina", url: "https://digichina.stanford.edu/" },
    ],
  },
  {
    lawId: "pdpo",
    status: "ai-drafted",
    sourceRef: "Cap. 486",
    checkUrl: "https://www.elegislation.gov.hk/hk/cap486",
    expectedMarkers: ["Personal Data", "486"],
    lastReviewed: "2026-07-30",
    corroboration: [
      { name: "PCPD Hong Kong", url: "https://www.pcpd.org.hk/" },
    ],
  },
];

export const provenanceByLaw: Record<string, Provenance> = Object.fromEntries(
  provenance.map((p) => [p.lawId, p]),
);

export function isStale(p: Provenance, now: Date = new Date()): boolean {
  const days = (now.getTime() - new Date(p.lastReviewed).getTime()) / 86_400_000;
  return days > STALE_AFTER_DAYS;
}

export const STATUS_LABEL: Record<VerificationStatus, string> = {
  "ai-drafted": "AI-drafted — unverified",
  "source-checked": "Citations checked against source",
  "human-verified": "Human-verified",
};
