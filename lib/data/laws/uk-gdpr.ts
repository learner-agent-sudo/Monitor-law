import type { Law } from "@/lib/types";

/**
 * Every quote below is taken verbatim from corpus/uk-gdpr.md (legislation.gov.uk,
 * current to 16 July 2026) and verified on each build by scripts/check-quotes.mjs.
 *
 * Where the UK text is identical to the EU GDPR, the quote is identical too —
 * that is the point of retained law. The divergences are the interesting part,
 * and each one below was read out of the UK text rather than assumed.
 */
export const ukGdpr: Law = {
  id: "uk-gdpr",
  jurisdictionId: "uk",
  name: "United Kingdom General Data Protection Regulation (retained Regulation (EU) 2016/679)",
  shortName: "UK GDPR",
  domain: "privacy",
  status: "in-force",
  effectiveDate: "2021-01",
  authority: "Information Commissioner's Office (ICO)",
  officialUrl: "https://www.legislation.gov.uk/eur/2016/679/contents",
  summary:
    "The UK GDPR is the retained EU GDPR as amended for domestic law, sitting alongside the Data Protection Act 2018 and enforced by the Information Commissioner. Much of the text is word-for-word identical to the EU original, but the two regimes have now measurably diverged: the child-consent age is 13 rather than 16, maximum fines are expressed in sterling (£17.5m / 4%), and the Data (Use and Access) Act 2025 replaced Article 22 on automated decision-making and omitted Article 44 on international transfers with effect from 5 February 2026.",
  mappings: {
    "lawful-basis": {
      strictness: 3,
      obligation:
        "All processing requires one of six enumerated lawful bases, as under the EU GDPR.",
      citation: "Art. 6 UK GDPR",
      quote:
        "Processing shall be lawful only if and to the extent that at least one of the following applies",
    },
    consent: {
      strictness: 3,
      obligation:
        "Consent must be freely given, specific, informed and unambiguous, and the controller must be able to demonstrate it.",
      citation: "Arts. 4(11), 7 UK GDPR",
      quote:
        "Where processing is based on consent, the controller shall be able to demonstrate that the data subject has consented to processing of his or her personal data",
    },
    "notice-transparency": {
      strictness: 3,
      obligation:
        "Information must be provided in a concise, transparent and intelligible form using plain language.",
      citation: "Arts. 12–14 UK GDPR",
      quote:
        "in a concise, transparent, intelligible and easily accessible form, using clear and plain language",
    },
    "rights-access": {
      strictness: 3,
      obligation: "Individuals may obtain confirmation, a copy of their data, and supporting information.",
      citation: "Art. 15 UK GDPR",
      quote:
        "The data subject shall have the right to obtain from the controller confirmation as to",
    },
    "rights-deletion": {
      strictness: 3,
      obligation: "Right to erasure, subject to enumerated exceptions.",
      citation: "Art. 17 UK GDPR",
      quote:
        "The data subject shall have the right to obtain from the controller the erasure of personal data concerning him or her without undue delay",
    },
    "rights-correction": {
      strictness: 3,
      obligation: "Right to rectification of inaccurate or incomplete personal data without undue delay.",
      citation: "Art. 16 UK GDPR",
      quote:
        "The data subject shall have the right to obtain from the controller without undue delay the rectification of inaccurate personal data concerning him or her",
    },
    "rights-portability": {
      strictness: 3,
      obligation:
        "Right to receive data in a structured, commonly used, machine-readable format and transmit it to another controller.",
      citation: "Art. 20 UK GDPR",
      quote:
        "The data subject shall have the right to receive the personal data concerning him or",
    },
    "rights-optout-sale": {
      strictness: 3,
      obligation:
        "Right to object to direct marketing at any time; general right to object to legitimate-interests processing.",
      citation: "Art. 21 UK GDPR",
      quote:
        "Where personal data are processed for direct marketing purposes, the data subject shall have the right to object at any time to processing of personal data concerning him or her for such marketing",
    },
    "rights-automated-decision": {
      strictness: 2,
      obligation:
        "DIVERGENCE: the EU-style Article 22 right no longer applies. It was replaced by a new Chapter 3 Section 4A under the Data (Use and Access) Act 2025, in force 5 February 2026, which sets out a different (generally more permissive) framework for significant automated decisions.",
      citation: "Art. 22 UK GDPR (substituted); DUAA 2025 s.80(1)",
      quote:
        "Ch. 3 Section 4A substituted for Art. 22 (19.6.2025 for specified purposes, 5.2.2026 in so far as not",
    },
    "sensitive-data": {
      strictness: 3,
      obligation: "Processing of special-category data is prohibited unless an exception applies.",
      citation: "Art. 9 UK GDPR",
      quote:
        "Processing of personal data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, or trade union membership",
    },
    "childrens-data": {
      strictness: 3,
      obligation:
        "DIVERGENCE: the child-consent threshold for information-society services is 13, not the EU's 16.",
      citation: "Art. 8(1) UK GDPR",
      quote: "the child is at least [ 13 years old]",
    },
    "breach-notification": {
      strictness: 3,
      obligation:
        "Notify the Information Commissioner within 72 hours; notify individuals where there is a high risk. The 72-hour deadline is retained; the recipient is the Commissioner rather than an EU supervisory authority.",
      citation: "Arts. 33–34 UK GDPR",
      quote:
        "where feasible, not later than 72 hours after having become aware of it, notify the personal data",
    },
    "dpo-representative": {
      strictness: 3,
      obligation:
        "Mandatory DPO for public authorities and large-scale/systematic processing; non-UK controllers must appoint a UK representative.",
      citation: "Arts. 27, 37–39 UK GDPR",
      quote:
        "The controller and the processor shall designate a data protection officer in any case",
    },
    dpia: {
      strictness: 3,
      obligation: "Data Protection Impact Assessment required for high-risk processing.",
      citation: "Art. 35 UK GDPR",
      quote:
        "the controller shall, prior to the processing, carry out an assessment of the impact of the envisaged processing operations on the protection of personal data",
    },
    "cross-border-transfer": {
      strictness: 2,
      obligation:
        "DIVERGENCE: Article 44's general principle for transfers was OMITTED with effect from 5 February 2026 by the Data (Use and Access) Act 2025. Transfers are now governed by the UK's own data-protection-test framework rather than the retained EU wording.",
      citation: "Art. 44 UK GDPR (omitted); DUAA 2025 Sch. 7 para. 2(1)",
      quote: "Art. 44 omitted (5.2.2026) by virtue of Data (Use and Access) Act 2025",
    },
    "data-localization": {
      strictness: 0,
      obligation:
        "No data localization requirement. (Claims about the ABSENCE of an obligation cannot be quoted and are the weakest entries in this catalog.)",
      citation: "—",
    },
    "records-processing": {
      strictness: 3,
      obligation: "Controllers and processors must maintain records of processing activities.",
      citation: "Art. 30 UK GDPR",
      quote: "shall maintain a record of processing activities under its responsibility",
    },
    "vendor-processor": {
      strictness: 3,
      obligation: "Processors must give sufficient guarantees and be bound by a written contract.",
      citation: "Art. 28 UK GDPR",
      quote:
        "the controller shall use only processors providing sufficient guarantees to implement appropriate technical and organisational measures",
    },
    security: {
      strictness: 3,
      obligation: "Appropriate technical and organisational measures appropriate to the risk.",
      citation: "Art. 32 UK GDPR",
      quote:
        "the controller and the processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk",
    },
    "enforcement-penalties": {
      strictness: 3,
      obligation:
        "DIVERGENCE: maximum fines are expressed in sterling — £17.5 million or 4% of total worldwide annual turnover (higher tier), £8.7 million or 2% (lower tier).",
      citation: "Art. 83(5)–(6) UK GDPR",
      quote:
        "subject to administrative fines up to [ £17,500,000], or in the case of an undertaking, up to 4",
    },
  },
};
