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
//   source-checked Every mapping quotes the statute text held in corpus/, and
//                  scripts/check-quotes.mjs verifies each quote verbatim on
//                  every build. Confirms the words are really the statute's —
//                  NOT that the surrounding interpretation is correct.
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
  /**
   * Path to the statute text held in-repo, when one has been supplied. Once
   * present, this file — not the model's training data — is the source of
   * truth, and mappings must quote it verbatim.
   */
  corpusFile?: string;
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
    status: "source-checked",
    sourceRef: "CELEX:32016R0679",
    checkUrl: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679",
    corpusFile: "corpus/gdpr.md",
    expectedMarkers: ["72 hours", "Article 33", "supervisory authority"],
    lastReviewed: "2026-07-31",
    corroboration: [
      { name: "EDPB guidelines", url: "https://www.edpb.europa.eu/our-work-tools/general-guidance/guidelines-recommendations-best-practices_en" },
      { name: "DLA Piper — EU", url: "https://www.dlapiperdataprotection.com/" },
      { name: "IAPP resource centre", url: "https://iapp.org/resources/" },
    ],
  },
  {
    lawId: "uk-gdpr",
    status: "source-checked",
    sourceRef: "Regulation (EU) 2016/679 as retained in UK law",
    checkUrl: "https://www.legislation.gov.uk/eur/2016/679/contents",
    corpusFile: "corpus/uk-gdpr.md",
    expectedMarkers: ["United Kingdom General Data Protection Regulation", "the Commissioner"],
    lastReviewed: "2026-07-31",
    corroboration: [
      { name: "ICO guidance", url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/" },
      { name: "DLA Piper — UK", url: "https://www.dlapiperdataprotection.com/" },
    ],
  },
  {
    lawId: "ccpa",
    status: "ai-drafted",
    corpusFile: "corpus/ccpa.md",
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
    status: "source-checked",
    corpusFile: "corpus/pipeda.md",
    sourceRef: "S.C. 2000, c. 5",
    checkUrl: "https://laws-lois.justice.gc.ca/eng/acts/P-8.6/FullText.html",
    expectedMarkers: ["Personal Information Protection and Electronic Documents Act", "10.1"],
    lastReviewed: "2026-07-31",
    corroboration: [
      { name: "OPC guidance", url: "https://www.priv.gc.ca/en/privacy-topics/" },
      { name: "DLA Piper — Canada", url: "https://www.dlapiperdataprotection.com/" },
    ],
  },
  {
    lawId: "quebec-law25",
    status: "ai-drafted",
    corpusFile: "corpus/quebec-law25.md",
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
    status: "source-checked",
    sourceRef: "PIPL (2021)",
    // Now anchored to the authoritative Chinese text from the NPC, not a translation.
    checkUrl: "http://www.npc.gov.cn/npc/c2/c30834/202108/t20210820_313088.html",
    corpusFile: "corpus/pipl.md",
    expectedMarkers: ["个人信息保护法", "第六十六条"],
    lastReviewed: "2026-07-31",
    corroboration: [
      { name: "China Law Translate", url: "https://www.chinalawtranslate.com/" },
      { name: "Stanford DigiChina", url: "https://digichina.stanford.edu/" },
    ],
  },
  {
    lawId: "pdpo",
    status: "ai-drafted",
    corpusFile: "corpus/pdpo.md",
    sourceRef: "Cap. 486",
    // e-Legislation renders via JS, so text extraction found nothing to check
    // against. The PCPD's own page serves the ordinance as plain HTML.
    checkUrl:
      "https://www.pcpd.org.hk/english/data_privacy_law/ordinance_at_a_Glance/ordinance.html",
    expectedMarkers: ["personal data"],
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
  "source-checked": "Quote-anchored to statute text",
  "human-verified": "Human-verified",
};
