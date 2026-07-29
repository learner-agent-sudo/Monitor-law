import type { Law } from "@/lib/types";

export const pdpo: Law = {
  id: "pdpo",
  jurisdictionId: "hk",
  name: "Personal Data (Privacy) Ordinance (Cap. 486)",
  shortName: "PDPO",
  domain: "privacy",
  status: "in-force",
  effectiveDate: "1996",
  authority: "Office of the Privacy Commissioner for Personal Data (PCPD)",
  officialUrl: "https://www.pcpd.org.hk/english/data_privacy_law/ordinance_at_a_Glance/ordinance.html",
  summary:
    "Hong Kong's PDPO is a principle-based regime built on six Data Protection Principles. It was one of Asia's earliest data-protection laws (1996) and remains comparatively light-touch: there is no lawful-basis requirement, no statutory sensitive-data category, no mandatory breach notification, and the cross-border transfer provision (s.33) has never been brought into force. Its strongest teeth are the direct-marketing rules and the 2021 anti-doxxing amendments.",
  mappings: {
    "lawful-basis": {
      strictness: 1,
      obligation:
        "No enumerated lawful bases; collection must be for a lawful purpose directly related to a function/activity and by fair means.",
      citation: "DPP1 (Schedule 1)",
    },
    consent: {
      strictness: 2,
      obligation:
        "'Prescribed consent' (express, voluntary) is required to use data for a new purpose and to use/provide data for direct marketing.",
      citation: "s.2(3); DPP3; Part 6A",
    },
    "notice-transparency": {
      strictness: 2,
      obligation: "A Personal Information Collection Statement must be given at collection; practices must be made available.",
      citation: "DPP1(3); DPP5",
    },
    "rights-access": {
      strictness: 2,
      obligation: "Individuals may make a data access request for a copy of their personal data.",
      citation: "PDPO ss.18–19",
    },
    "rights-deletion": {
      strictness: 1,
      obligation: "Data users must erase data no longer required; there is no free-standing individual right to erasure.",
      citation: "DPP2(2)",
    },
    "rights-correction": {
      strictness: 2,
      obligation: "Individuals may make a data correction request for inaccurate data.",
      citation: "PDPO ss.22–23",
    },
    "rights-portability": {
      strictness: 0,
      obligation: "No data-portability right.",
      citation: "—",
    },
    "rights-optout-sale": {
      strictness: 2,
      obligation:
        "Strict direct-marketing regime: opt-in to use data for marketing and a mandatory opt-out that must be honoured; consent needed to provide data to others for marketing.",
      citation: "PDPO Part 6A (ss.35A–35M)",
    },
    "rights-automated-decision": {
      strictness: 0,
      obligation: "Automated decision-making and profiling are not specifically regulated.",
      citation: "—",
    },
    "sensitive-data": {
      strictness: 0,
      obligation: "No statutory category of sensitive personal data with heightened rules.",
      citation: "—",
    },
    "childrens-data": {
      strictness: 1,
      obligation: "No statutory children's regime; the PCPD issues guidance on minors' data.",
      citation: "PCPD guidance",
    },
    "breach-notification": {
      strictness: 1,
      obligation: "Breach notification is recommended by the PCPD but not legally mandatory (reform under discussion).",
      citation: "PCPD guidance (voluntary)",
    },
    "dpo-representative": {
      strictness: 1,
      obligation: "Appointing a data protection officer is recommended best practice, not a legal requirement.",
      citation: "PCPD best-practice guide",
    },
    dpia: {
      strictness: 1,
      obligation: "Privacy impact assessments are encouraged by the PCPD but not mandated.",
      citation: "PCPD guidance",
    },
    "cross-border-transfer": {
      strictness: 1,
      obligation:
        "The cross-border transfer restriction (s.33) has never been brought into force; the PCPD recommends voluntary model contractual clauses.",
      citation: "PDPO s.33 (not in operation)",
    },
    "data-localization": {
      strictness: 0,
      obligation: "No data localization requirement.",
      citation: "—",
    },
    "records-processing": {
      strictness: 1,
      obligation: "Retention and accountability duties under the principles; no records-of-processing mandate.",
      citation: "DPP2",
    },
    "vendor-processor": {
      strictness: 2,
      obligation: "A data user engaging a data processor must adopt contractual or other means to ensure protection and retention limits.",
      citation: "DPP2(3); DPP4(2)",
    },
    security: {
      strictness: 2,
      obligation: "All practicable steps must be taken to protect data against unauthorised access, use, or loss.",
      citation: "DPP4",
    },
    "enforcement-penalties": {
      strictness: 2,
      obligation:
        "PCPD issues enforcement notices (breach of which is an offence); direct-marketing and 2021 anti-doxxing offences carry fines up to HK$1M and imprisonment.",
      citation: "PDPO ss.50, 64; Part 6A",
    },
  },
};
