// ---------------------------------------------------------------------------
// Control 4 — version metadata, one entry per ingested instrument.
//
// Every field here is a claim that can be checked against the corpus file or
// the official register, and scripts/check-temporal.mjs asserts the shape.
//
// A NOTE ON WHAT THESE DATES MEAN. `inForceDate` is when the instrument's
// obligations began applying, not when it was adopted or published — those are
// routinely years apart and conflating them is the single most common dating
// error in trackers. `consolidationDate` is the "text as at" date of the
// document actually sitting in corpus/: it is the honest limit of what this
// repository knows, because an amendment made after that date is invisible here
// no matter how correct everything else is.
// ---------------------------------------------------------------------------

export type AuthorityId = "primary" | "guidance" | "secondary";

export type LifecycleId =
  | "proposed"
  | "adopted"
  | "partial"
  | "in-force"
  | "amended"
  | "repealed"
  | "lapsed";

/** One tranche of obligations switching on, for instruments that phase in. */
export interface Phase {
  /** ISO date this tranche starts applying. */
  from: string;
  /** Requirement ids switched on. Empty means "the instrument as a whole". */
  applies: string[];
  note?: string;
}

export interface Version {
  lawId: string;
  authority: AuthorityId;
  status: LifecycleId;
  /** When obligations began applying. */
  inForceDate: string;
  /** "Text as at" date of the file in corpus/ — the limit of what we know. */
  consolidationDate: string;
  /** What this replaced, where relevant. */
  supersedes?: string;
  phases?: Phase[];
  /** Anything a reader must know to date an answer correctly. */
  note?: string;
}

export const versions: Version[] = [
  {
    lawId: "gdpr",
    authority: "primary",
    status: "in-force",
    inForceDate: "2018-05-25",
    consolidationDate: "2016-05-04",
    note: "The corpus holds the original OJ text (CELEX 32016R0679). Corrigenda published since are not reflected.",
  },
  {
    lawId: "uk-gdpr",
    authority: "primary",
    status: "amended",
    inForceDate: "2021-01-01",
    consolidationDate: "2024-01-01",
    supersedes: "EU GDPR as it applied in the UK before IP completion day",
    note: "Retained EU law as amended by the Data Protection, Privacy and Electronic Communications (Amendments etc.) (EU Exit) Regulations. Arts. 61, 63-66, 68-73, 75 and 92 are omitted from the retained text, which is why the provision index holds 86 articles rather than 99.",
  },
  {
    lawId: "ccpa",
    authority: "primary",
    status: "amended",
    inForceDate: "2020-01-01",
    consolidationDate: "2023-01-01",
    supersedes: "CCPA 2018 as enacted, before the CPRA amendments",
    note: "Text as amended by the CPRA (Prop 24). CPPA regulations made under it are NOT in the corpus and are a separate, substantial body of obligation.",
  },
  {
    lawId: "pipeda",
    authority: "primary",
    status: "in-force",
    inForceDate: "2001-01-01",
    consolidationDate: "2024-01-01",
    note: "Bill C-27 would have replaced this with the CPPA; it died on the order paper in January 2025, so PIPEDA remains the operative federal statute.",
  },
  {
    lawId: "quebec-law25",
    authority: "primary",
    status: "in-force",
    inForceDate: "2023-09-22",
    consolidationDate: "2026-04-01",
    supersedes: "Private Sector Act as it stood before the Law 25 amendments",
    note: "The operative instrument is P-39.1 (the Act), not Law 25 (the amending statute). Portability under s.27 applied later, from 22 September 2024.",
  },
  {
    lawId: "pipl",
    authority: "primary",
    status: "in-force",
    inForceDate: "2021-11-01",
    consolidationDate: "2021-08-20",
    note: "Chinese text as adopted. Subsequent CAC measures on cross-border transfer are separate instruments and are not in the corpus.",
  },
  {
    lawId: "pdpo",
    authority: "primary",
    status: "amended",
    inForceDate: "1996-12-20",
    consolidationDate: "2018-04-20",
    supersedes: "PDPO as enacted, before the 2012 direct-marketing amendments",
    note: "Verified copy as at 20 April 2018. The 2021 doxxing amendments (Part 6A) are LATER than this consolidation and are therefore not fully reflected in the ingested text — a known gap, not a claim that they do not exist.",
  },
];

export const versionsById: Record<string, Version> = Object.fromEntries(
  versions.map((v) => [v.lawId, v]),
);
