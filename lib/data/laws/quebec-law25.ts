import type { Law } from "@/lib/types";

export const quebecLaw25: Law = {
  id: "quebec-law25",
  jurisdictionId: "ca-qc",
  name: "Act respecting the protection of personal information in the private sector (CQLR c. P-39.1), as amended by Law 25",
  shortName: "Québec Law 25",
  domain: "privacy",
  status: "in-force",
  effectiveDate: "2022-09",
  authority: "Commission d'accès à l'information (CAI)",
  officialUrl: "https://www.legisquebec.gouv.qc.ca/en/document/cs/P-39.1",
  summary:
    "Québec's Law 25 (phased in 2022–2024) overhauled the province's private-sector privacy regime and is the most GDPR-like law in North America. It introduced mandatory privacy officers, breach reporting, privacy impact assessments (including before any transfer outside Québec), data portability, transparency around automated decisions, and steep administrative and penal penalties.",
  mappings: {
    "lawful-basis": {
      strictness: 2,
      obligation: "Consent-based with a necessity/proportionality test; new statutory exceptions for defined purposes.",
      citation: "Private Sector Act s.12–14",
      quote:
        "Any person collecting personal information on another person may collect only the information",
    },
    consent: {
      strictness: 3,
      obligation:
        "Consent must be clear, free, informed and given for specific purposes; separate express consent for sensitive information.",
      citation: "Private Sector Act s.14",
      quote:
        "Unless the person concerned gives his consent, personal information may not be used within the",
    },
    "notice-transparency": {
      strictness: 3,
      obligation:
        "Enhanced transparency: inform individuals of purposes, third parties, rights, and any transfer outside Québec; publish governance policies.",
      citation: "Private Sector Act s.8, s.8.1",
      quote:
        "The title and contact information of the person in charge of the protection of personal information must be",
    },
    "rights-access": {
      strictness: 2,
      obligation: "Right to access personal information held about the individual.",
      citation: "Private Sector Act s.27",
      quote:
        "Every person carrying on an enterprise who holds personal information on another person must, at the",
    },
    "rights-deletion": {
      strictness: 2,
      obligation: "Right to have information de-indexed / ceased to be disseminated and, in cases, deleted.",
      citation: "Private Sector Act s.28.1",
    },
    "rights-correction": {
      strictness: 2,
      obligation: "Right to rectify inaccurate, incomplete, or ambiguous information.",
      citation: "Private Sector Act s.28",
    },
    "rights-portability": {
      strictness: 2,
      obligation: "Right to receive computerized personal information in a structured, commonly used format (in force Sept 2024).",
      citation: "Private Sector Act s.27 para.3",
    },
    "rights-optout-sale": {
      strictness: 1,
      obligation: "No 'sale' concept; control is exercised through consent and withdrawal.",
      citation: "Private Sector Act s.14",
    },
    "rights-automated-decision": {
      strictness: 2,
      obligation:
        "Individuals must be informed when a decision is based exclusively on automated processing and may submit observations.",
      citation: "Private Sector Act s.12.1",
      quote:
        "exclusively on an automated processing of such information must inform the person concerned accordingly",
    },
    "sensitive-data": {
      strictness: 3,
      obligation: "Sensitive personal information requires express consent and heightened handling.",
      citation: "Private Sector Act s.12, s.14",
      quote:
        "enterprise except for the purposes for which it was collected. Such consent must be given expressly when it",
    },
    "childrens-data": {
      strictness: 2,
      obligation: "Consent for a minor under 14 must be given by the person having parental authority.",
      citation: "Private Sector Act s.4.1",
      quote:
        "The personal information concerning a minor under 14 years of age may not be collected from him",
    },
    "breach-notification": {
      strictness: 2,
      obligation:
        "Report 'confidentiality incidents' to the CAI and affected individuals where there is a risk of serious injury; maintain an incident register.",
      citation: "Private Sector Act s.3.5–3.8",
      quote:
        "Any person carrying on an enterprise who has cause to believe that a confidentiality incident involving",
    },
    "dpo-representative": {
      strictness: 2,
      obligation: "Must designate a person in charge of personal-information protection (the highest authority by default).",
      citation: "Private Sector Act s.3.1",
      quote:
        "implemented and complied with. That person shall exercise the function of person in charge of the protection",
    },
    dpia: {
      strictness: 3,
      obligation:
        "Privacy Impact Assessment required for information-system projects and before any transfer of data outside Québec.",
      citation: "Private Sector Act s.3.3, s.17",
      quote:
        "Any person carrying on an enterprise must conduct a privacy impact assessment for any project to",
    },
    "cross-border-transfer": {
      strictness: 3,
      obligation:
        "Before transferring data outside Québec an assessment must confirm it will receive adequate protection.",
      citation: "Private Sector Act s.17",
      quote:
        "Before communicating personal information outside Québec, a person carrying on an enterprise must",
    },
    "data-localization": {
      strictness: 0,
      obligation: "No hard localization mandate; instead a transfer-adequacy assessment is required.",
      citation: "Private Sector Act s.17",
    },
    "records-processing": {
      strictness: 2,
      obligation: "Must establish and publish governance policies and maintain a register of confidentiality incidents.",
      citation: "Private Sector Act s.3.2, s.3.8",
      quote:
        "Any person carrying on an enterprise must establish and implement governance policies and practices",
    },
    "vendor-processor": {
      strictness: 2,
      obligation: "Mandates for service providers must be governed by a written contract with prescribed protective terms.",
      citation: "Private Sector Act s.18.3, s.20",
    },
    security: {
      strictness: 2,
      obligation: "Security measures appropriate to the sensitivity, purpose, quantity, and medium of the information.",
      citation: "Private Sector Act s.10",
      quote:
        "A person carrying on an enterprise must take the security measures necessary to ensure the protection",
    },
    "enforcement-penalties": {
      strictness: 3,
      obligation:
        "Administrative monetary penalties up to CA$10M or 2% of worldwide turnover; penal fines up to CA$25M or 4%; private right of action.",
      citation: "Private Sector Act s.90.1, s.91",
    },
  },
};
