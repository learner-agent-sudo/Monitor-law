import type { Law } from "@/lib/types";

export const gdpr: Law = {
  id: "gdpr",
  jurisdictionId: "eu",
  name: "General Data Protection Regulation (Regulation (EU) 2016/679)",
  shortName: "GDPR",
  domain: "privacy",
  status: "in-force",
  effectiveDate: "2018-05",
  authority: "European Data Protection Board & national supervisory authorities (DPAs)",
  officialUrl: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
  summary:
    "The GDPR is the EU's comprehensive data protection regulation and the de facto global benchmark. It applies to any organization processing the personal data of people in the EU, requires a lawful basis for all processing, grants individuals a broad set of rights, and is backed by fines of up to €20 million or 4% of global annual turnover.",
  mappings: {
    "lawful-basis": {
      strictness: 3,
      obligation:
        "All processing requires one of six enumerated lawful bases (consent, contract, legal obligation, vital interests, public task, legitimate interests).",
      citation: "Art. 6 GDPR",
    },
    consent: {
      strictness: 3,
      obligation:
        "Consent must be freely given, specific, informed and unambiguous, as easy to withdraw as to give; explicit consent required for special-category data.",
      citation: "Arts. 4(11), 7, 9 GDPR",
    },
    "notice-transparency": {
      strictness: 3,
      obligation:
        "Detailed information must be provided at collection whether data is obtained from the individual or a third party.",
      citation: "Arts. 12–14 GDPR",
    },
    "rights-access": {
      strictness: 3,
      obligation: "Individuals may obtain confirmation, a copy of their data, and extensive supporting information.",
      citation: "Art. 15 GDPR",
    },
    "rights-deletion": {
      strictness: 3,
      obligation: "Broad 'right to erasure' (right to be forgotten) subject to enumerated exceptions.",
      citation: "Art. 17 GDPR",
    },
    "rights-correction": {
      strictness: 3,
      obligation: "Right to rectification of inaccurate or incomplete personal data without undue delay.",
      citation: "Art. 16 GDPR",
    },
    "rights-portability": {
      strictness: 3,
      obligation:
        "Right to receive data in a structured, commonly used, machine-readable format and to transmit it to another controller.",
      citation: "Art. 20 GDPR",
    },
    "rights-optout-sale": {
      strictness: 3,
      obligation:
        "Absolute right to object to direct marketing; general right to object to processing based on legitimate interests / public task.",
      citation: "Art. 21 GDPR",
    },
    "rights-automated-decision": {
      strictness: 3,
      obligation:
        "Right not to be subject to solely automated decisions with legal/similar effects, with safeguards including human intervention.",
      citation: "Art. 22 GDPR",
    },
    "sensitive-data": {
      strictness: 3,
      obligation:
        "Processing of special-category data is prohibited unless a specific exception (e.g. explicit consent) applies.",
      citation: "Art. 9 GDPR",
    },
    "childrens-data": {
      strictness: 3,
      obligation:
        "Parental consent required for information-society services offered to children under 16 (member states may lower to 13).",
      citation: "Art. 8 GDPR",
    },
    "breach-notification": {
      strictness: 3,
      obligation:
        "Notify the supervisory authority within 72 hours; notify individuals without undue delay where there is a high risk.",
      citation: "Arts. 33–34 GDPR",
    },
    "dpo-representative": {
      strictness: 3,
      obligation:
        "Mandatory DPO for public bodies and large-scale/systematic processing; non-EU controllers must appoint an EU representative.",
      citation: "Arts. 27, 37–39 GDPR",
    },
    dpia: {
      strictness: 3,
      obligation: "Data Protection Impact Assessment required for processing likely to result in high risk.",
      citation: "Art. 35 GDPR",
    },
    "cross-border-transfer": {
      strictness: 3,
      obligation:
        "Transfers outside the EEA require an adequacy decision or appropriate safeguards (SCCs, BCRs) or a derogation.",
      citation: "Chapter V (Arts. 44–49) GDPR",
    },
    "data-localization": {
      strictness: 0,
      obligation: "No general data localization requirement — the GDPR enables free flow of data within the EU.",
      citation: "Recital 13 GDPR",
    },
    "records-processing": {
      strictness: 3,
      obligation: "Controllers and processors must maintain records of processing activities (with limited SME exceptions).",
      citation: "Art. 30 GDPR",
    },
    "vendor-processor": {
      strictness: 3,
      obligation: "Processing by a processor must be governed by a contract meeting prescribed mandatory terms.",
      citation: "Art. 28 GDPR",
    },
    security: {
      strictness: 3,
      obligation: "Appropriate technical and organizational measures required, taking account of risk and state of the art.",
      citation: "Art. 32 GDPR",
    },
    "enforcement-penalties": {
      strictness: 3,
      obligation:
        "Administrative fines up to €20 million or 4% of total worldwide annual turnover, whichever is higher.",
      citation: "Art. 83 GDPR",
    },
  },
};
