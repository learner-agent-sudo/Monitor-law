import type { Law } from "@/lib/types";

export const pipl: Law = {
  id: "pipl",
  jurisdictionId: "cn",
  name: "Personal Information Protection Law of the People's Republic of China (PIPL)",
  shortName: "PIPL",
  domain: "privacy",
  status: "in-force",
  effectiveDate: "2021-11",
  authority: "Cyberspace Administration of China (CAC)",
  officialUrl: "https://www.chinalawtranslate.com/en/personal-information-protection-law/",
  summary:
    "The PIPL is China's comprehensive personal-information law, effective November 2021, sitting alongside the Cybersecurity Law and Data Security Law. Structurally similar to the GDPR but with distinctly stricter cross-border-transfer controls and data-localization obligations, frequent 'separate consent' requirements, and penalties of up to RMB 50 million or 5% of prior-year turnover.",
  mappings: {
    "lawful-basis": {
      strictness: 3,
      obligation:
        "Processing requires one of the enumerated bases (consent, contract necessity, legal duty, public-health/emergency, public-interest news, etc.).",
      citation: "PIPL Art. 13",
    },
    consent: {
      strictness: 3,
      obligation:
        "Consent must be voluntary and informed; 'separate consent' is required for sensitive data, third-party provision, public disclosure, and cross-border transfer.",
      citation: "PIPL Arts. 14, 25, 29, 39",
    },
    "notice-transparency": {
      strictness: 3,
      obligation: "Detailed pre-processing notice of identity, purposes, methods, categories, and retention required.",
      citation: "PIPL Art. 17",
    },
    "rights-access": {
      strictness: 2,
      obligation: "Individuals may access and copy their personal information from handlers.",
      citation: "PIPL Art. 45",
    },
    "rights-deletion": {
      strictness: 2,
      obligation: "Right to deletion in enumerated circumstances (purpose fulfilled, consent withdrawn, etc.).",
      citation: "PIPL Art. 47",
    },
    "rights-correction": {
      strictness: 2,
      obligation: "Right to request correction or completion of inaccurate personal information.",
      citation: "PIPL Art. 46",
    },
    "rights-portability": {
      strictness: 2,
      obligation: "Right to have personal information transferred to a designated handler where CAC conditions are met.",
      citation: "PIPL Art. 45 para.3",
    },
    "rights-optout-sale": {
      strictness: 2,
      obligation:
        "For automated marketing/push, individuals must be offered a non-targeted option or an easy way to refuse.",
      citation: "PIPL Art. 24",
    },
    "rights-automated-decision": {
      strictness: 3,
      obligation:
        "Automated decision-making must be transparent and fair; individuals may demand an explanation and refuse decisions made solely by automation.",
      citation: "PIPL Art. 24",
    },
    "sensitive-data": {
      strictness: 3,
      obligation:
        "Sensitive PI needs a specific purpose, necessity, strict protection, separate consent, and a prior impact assessment.",
      citation: "PIPL Arts. 28–32",
    },
    "childrens-data": {
      strictness: 3,
      obligation:
        "Data of minors under 14 is sensitive; parental consent and a dedicated processing rule are required.",
      citation: "PIPL Art. 31",
    },
    "breach-notification": {
      strictness: 2,
      obligation:
        "On a breach, take remedial measures and notify the authorities and affected individuals (subject to a harm-based exception).",
      citation: "PIPL Art. 57",
    },
    "dpo-representative": {
      strictness: 2,
      obligation:
        "Handlers over a CAC threshold must appoint a person in charge; overseas handlers must establish a domestic representative.",
      citation: "PIPL Arts. 52, 53",
    },
    dpia: {
      strictness: 3,
      obligation:
        "A personal-information protection impact assessment is mandatory for sensitive data, automated decisions, sharing, and cross-border transfers.",
      citation: "PIPL Arts. 55–56",
    },
    "cross-border-transfer": {
      strictness: 3,
      obligation:
        "Transfers require a CAC security assessment, certification, or the CAC standard contract, plus separate consent — among the strictest regimes globally.",
      citation: "PIPL Arts. 38–40",
    },
    "data-localization": {
      strictness: 3,
      obligation:
        "Critical information infrastructure operators and high-volume handlers must store personal information within China.",
      citation: "PIPL Art. 40; CSL Art. 37",
    },
    "records-processing": {
      strictness: 2,
      obligation: "Compliance audits are required and records must be kept; large platforms face added governance duties.",
      citation: "PIPL Arts. 54, 58",
    },
    "vendor-processor": {
      strictness: 2,
      obligation: "Entrusted processing must be governed by a contract, with oversight of the entrusted party.",
      citation: "PIPL Art. 21",
    },
    security: {
      strictness: 2,
      obligation: "Security measures (encryption, de-identification, access control) required, layered on CSL/MLPS duties.",
      citation: "PIPL Art. 51",
    },
    "enforcement-penalties": {
      strictness: 3,
      obligation:
        "For serious violations: fines up to RMB 50 million or 5% of prior-year turnover, business suspension, and personal liability for responsible staff.",
      citation: "PIPL Art. 66",
    },
  },
};
