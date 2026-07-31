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
      quote:
        "Processing shall be lawful only if and to the extent that at least one of the following applies",
    },
    consent: {
      strictness: 3,
      obligation:
        "Consent must be freely given, specific, informed and unambiguous, as easy to withdraw as to give; explicit consent required for special-category data.",
      citation: "Arts. 4(11), 7, 9 GDPR",
      quote:
        "Where processing is based on consent, the controller shall be able to demonstrate that the data subject has consented to processing of his or her personal data",
    },
    "notice-transparency": {
      strictness: 3,
      obligation:
        "Detailed information must be provided at collection whether data is obtained from the individual or a third party.",
      citation: "Arts. 12–14 GDPR",
      quote:
        "in a concise, transparent, intelligible and easily accessible form, using clear and plain language",
    },
    "rights-access": {
      strictness: 3,
      obligation: "Individuals may obtain confirmation, a copy of their data, and extensive supporting information.",
      citation: "Art. 15 GDPR",
      quote:
        "The data subject shall have the right to obtain from the controller confirmation as to whether or not personal data concerning him or her are being processed",
    },
    "rights-deletion": {
      strictness: 3,
      obligation: "Broad 'right to erasure' (right to be forgotten) subject to enumerated exceptions.",
      citation: "Art. 17 GDPR",
      quote:
        "The data subject shall have the right to obtain from the controller the erasure of personal data concerning him or her without undue delay",
    },
    "rights-correction": {
      strictness: 3,
      obligation: "Right to rectification of inaccurate or incomplete personal data without undue delay.",
      citation: "Art. 16 GDPR",
      quote:
        "The data subject shall have the right to obtain from the controller without undue delay the rectification of inaccurate personal data concerning him or her",
    },
    "rights-portability": {
      strictness: 3,
      obligation:
        "Right to receive data in a structured, commonly used, machine-readable format and to transmit it to another controller.",
      citation: "Art. 20 GDPR",
      quote:
        "in a structured, commonly used and machine-readable format and have the right to transmit those data to another controller without hindrance",
    },
    "rights-optout-sale": {
      strictness: 3,
      obligation:
        "Absolute right to object to direct marketing; general right to object to processing based on legitimate interests / public task.",
      citation: "Art. 21 GDPR",
      quote:
        "Where personal data are processed for direct marketing purposes, the data subject shall have the right to object at any time to processing of personal data concerning him or her for such marketing",
    },
    "rights-automated-decision": {
      strictness: 3,
      obligation:
        "Right not to be subject to solely automated decisions with legal/similar effects, with safeguards including human intervention.",
      citation: "Art. 22 GDPR",
      quote:
        "The data subject shall have the right not to be subject to a decision based solely on automated processing, including profiling, which produces legal effects concerning him or her or similarly significantly affects him or her",
    },
    "sensitive-data": {
      strictness: 3,
      obligation:
        "Processing of special-category data is prohibited unless a specific exception (e.g. explicit consent) applies.",
      citation: "Art. 9 GDPR",
      quote:
        "Processing of personal data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, or trade union membership",
    },
    "childrens-data": {
      strictness: 3,
      obligation:
        "Parental consent required for information-society services offered to children under 16 (member states may lower to 13).",
      citation: "Art. 8 GDPR",
      quote:
        "the processing of the personal data of a child shall be lawful where the child is at least 16 years old",
    },
    "breach-notification": {
      strictness: 3,
      obligation:
        "Notify the supervisory authority within 72 hours; notify individuals without undue delay where there is a high risk.",
      citation: "Arts. 33–34 GDPR",
      quote:
        "not later than 72 hours after having become aware of it, notify the personal data breach to the supervisory authority",
    },
    "dpo-representative": {
      strictness: 3,
      obligation:
        "Mandatory DPO for public bodies and large-scale/systematic processing; non-EU controllers must appoint an EU representative.",
      citation: "Arts. 27, 37–39 GDPR",
      quote:
        "The controller and the processor shall designate a data protection officer in any case where",
    },
    dpia: {
      strictness: 3,
      obligation: "Data Protection Impact Assessment required for processing likely to result in high risk.",
      citation: "Art. 35 GDPR",
      quote:
        "the controller shall, prior to the processing, carry out an assessment of the impact of the envisaged processing operations on the protection of personal data",
    },
    "cross-border-transfer": {
      strictness: 3,
      obligation:
        "Transfers outside the EEA require an adequacy decision or appropriate safeguards (SCCs, BCRs) or a derogation.",
      citation: "Chapter V (Arts. 44–49) GDPR",
      quote:
        "Any transfer of personal data which are undergoing processing or are intended for processing after transfer to a third country or to an international organisation shall take place only if",
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
      quote:
        "shall maintain a record of processing activities under its responsibility",
    },
    "vendor-processor": {
      strictness: 3,
      obligation: "Processing by a processor must be governed by a contract meeting prescribed mandatory terms.",
      citation: "Art. 28 GDPR",
      quote:
        "the controller shall use only processors providing sufficient guarantees to implement appropriate technical and organisational measures",
    },
    security: {
      strictness: 3,
      obligation: "Appropriate technical and organizational measures required, taking account of risk and state of the art.",
      citation: "Art. 32 GDPR",
      quote:
        "the controller and the processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk",
    },
    "enforcement-penalties": {
      strictness: 3,
      obligation:
        "Administrative fines up to €20 million or 4% of total worldwide annual turnover, whichever is higher.",
      citation: "Art. 83 GDPR",
      quote:
        "up to 20 000 000 EUR, or in the case of an undertaking, up to 4 % of the total worldwide annual turnover of the preceding financial year, whichever is higher",
    },
  },
};
