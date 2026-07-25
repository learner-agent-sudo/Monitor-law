import type { Requirement } from "@/lib/types";

// ---------------------------------------------------------------------------
// The normalized privacy-obligation taxonomy.
//
// Every law in the catalog is mapped against this shared list. This is what
// makes cross-jurisdiction gap analysis possible: comparing two laws becomes a
// comparison of how each one scores against the same set of requirements.
// ---------------------------------------------------------------------------

export const requirements: Requirement[] = [
  {
    id: "lawful-basis",
    category: "Grounds for Processing",
    name: "Lawful basis",
    description:
      "Whether processing must rest on an enumerated legal basis (consent, contract, legitimate interest, etc.).",
    domain: "privacy",
  },
  {
    id: "consent",
    category: "Grounds for Processing",
    name: "Consent standard",
    description:
      "Requirements for valid consent — form, granularity, withdrawal, and separate consent for sensitive uses.",
    domain: "privacy",
  },
  {
    id: "notice-transparency",
    category: "Grounds for Processing",
    name: "Notice & transparency",
    description:
      "Obligation to inform individuals about what data is collected, why, and with whom it is shared.",
    domain: "privacy",
  },
  {
    id: "rights-access",
    category: "Individual Rights",
    name: "Right of access",
    description: "Individuals can obtain confirmation and a copy of their personal data.",
    domain: "privacy",
  },
  {
    id: "rights-deletion",
    category: "Individual Rights",
    name: "Right to deletion",
    description: "Individuals can require erasure of their personal data.",
    domain: "privacy",
  },
  {
    id: "rights-correction",
    category: "Individual Rights",
    name: "Right to correction",
    description: "Individuals can require inaccurate personal data to be rectified.",
    domain: "privacy",
  },
  {
    id: "rights-portability",
    category: "Individual Rights",
    name: "Data portability",
    description: "Individuals can receive/transfer their data in a structured, machine-readable form.",
    domain: "privacy",
  },
  {
    id: "rights-optout-sale",
    category: "Individual Rights",
    name: "Opt-out of sale / marketing",
    description:
      "Right to opt out of the sale or sharing of personal data and of targeted advertising / direct marketing.",
    domain: "privacy",
  },
  {
    id: "rights-automated-decision",
    category: "Individual Rights",
    name: "Automated decisions",
    description:
      "Rights regarding solely automated decision-making and profiling (explanation, objection, human review).",
    domain: "privacy",
  },
  {
    id: "sensitive-data",
    category: "Data Categories",
    name: "Sensitive data",
    description: "Heightened protections for sensitive / special-category personal data.",
    domain: "privacy",
  },
  {
    id: "childrens-data",
    category: "Data Categories",
    name: "Children's data",
    description: "Special rules and consent thresholds for the personal data of minors.",
    domain: "privacy",
  },
  {
    id: "breach-notification",
    category: "Accountability & Security",
    name: "Breach notification",
    description: "Obligation to notify regulators and/or affected individuals of a data breach.",
    domain: "privacy",
  },
  {
    id: "dpo-representative",
    category: "Accountability & Security",
    name: "DPO / representative",
    description:
      "Requirement to appoint a data protection officer, privacy lead, or local representative.",
    domain: "privacy",
  },
  {
    id: "dpia",
    category: "Accountability & Security",
    name: "Impact assessment (DPIA)",
    description: "Requirement to conduct risk / privacy impact assessments for high-risk processing.",
    domain: "privacy",
  },
  {
    id: "cross-border-transfer",
    category: "Data Flows",
    name: "Cross-border transfer",
    description: "Conditions and safeguards required to transfer personal data outside the jurisdiction.",
    domain: "privacy",
  },
  {
    id: "data-localization",
    category: "Data Flows",
    name: "Data localization",
    description: "Requirement to store certain personal data within the jurisdiction.",
    domain: "privacy",
  },
  {
    id: "records-processing",
    category: "Accountability & Security",
    name: "Records & governance",
    description:
      "Obligation to maintain records of processing, governance policies, and demonstrate accountability.",
    domain: "privacy",
  },
  {
    id: "vendor-processor",
    category: "Accountability & Security",
    name: "Vendor / processor terms",
    description: "Mandatory contractual terms with processors and other third parties handling data.",
    domain: "privacy",
  },
  {
    id: "security",
    category: "Accountability & Security",
    name: "Security safeguards",
    description: "Obligation to implement appropriate technical and organizational security measures.",
    domain: "privacy",
  },
  {
    id: "enforcement-penalties",
    category: "Enforcement",
    name: "Enforcement & penalties",
    description: "The enforcement model and the maximum financial penalties available.",
    domain: "privacy",
  },
];

export const requirementsById: Record<string, Requirement> = Object.fromEntries(
  requirements.map((r) => [r.id, r]),
);

/** Requirement categories in display order. */
export const requirementCategories: string[] = requirements.reduce<string[]>((acc, r) => {
  if (!acc.includes(r.category)) acc.push(r.category);
  return acc;
}, []);
