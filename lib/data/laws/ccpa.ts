import type { Law } from "@/lib/types";

export const ccpa: Law = {
  id: "ccpa",
  jurisdictionId: "us-ca",
  name: "California Consumer Privacy Act, as amended by the CPRA (Cal. Civ. Code §1798.100 et seq.)",
  shortName: "CCPA / CPRA",
  domain: "privacy",
  status: "in-force",
  effectiveDate: "2020-01",
  authority: "California Privacy Protection Agency (CPPA) & California Attorney General",
  officialUrl: "https://cppa.ca.gov/regulations/",
  summary:
    "California's CCPA (amended and strengthened by the CPRA, effective 2023) is the leading US state privacy law. Unlike the GDPR it follows a notice-and-opt-out model rather than requiring a lawful basis, but it grants consumers rights to know, delete, correct, and opt out of the sale/sharing of their data, and created a dedicated regulator, the CPPA.",
  mappings: {
    "lawful-basis": {
      strictness: 1,
      obligation:
        "No lawful-basis requirement; the CPRA added purpose-limitation and data-minimization duties but processing is not gated on an enumerated basis.",
      citation: "Cal. Civ. Code §1798.100(c)",
    },
    consent: {
      strictness: 1,
      obligation:
        "Predominantly opt-out; opt-in consent required only in specific cases (e.g. sale of minors' data, secondary use after opting out).",
      citation: "§1798.120, §1798.135",
    },
    "notice-transparency": {
      strictness: 2,
      obligation: "Notice at collection and a detailed privacy policy describing categories, purposes, and consumer rights.",
      citation: "§1798.100, §1798.130",
    },
    "rights-access": {
      strictness: 2,
      obligation: "Right to know the categories and specific pieces of personal information collected.",
      citation: "§1798.110, §1798.115",
    },
    "rights-deletion": {
      strictness: 2,
      obligation: "Right to deletion of personal information, subject to enumerated exceptions.",
      citation: "§1798.105",
    },
    "rights-correction": {
      strictness: 2,
      obligation: "Right to correct inaccurate personal information (added by the CPRA).",
      citation: "§1798.106",
    },
    "rights-portability": {
      strictness: 2,
      obligation: "Right to receive collected data in a portable, readily usable format.",
      citation: "§1798.130(a)(2)",
    },
    "rights-optout-sale": {
      strictness: 3,
      obligation:
        "Signature right: opt out of the sale and sharing of personal information, honored via the Global Privacy Control signal.",
      citation: "§1798.120, §1798.135",
    },
    "rights-automated-decision": {
      strictness: 1,
      obligation:
        "CPRA directs the CPPA to issue automated decision-making / profiling rules (regulations adopted 2025, phased in).",
      citation: "§1798.185(a)(15)",
    },
    "sensitive-data": {
      strictness: 2,
      obligation:
        "Right to limit the use and disclosure of 'sensitive personal information' — an opt-out, not a prohibition.",
      citation: "§1798.121",
    },
    "childrens-data": {
      strictness: 2,
      obligation:
        "Opt-in consent required to sell/share data of consumers under 16; parental consent for under 13.",
      citation: "§1798.120(c)",
    },
    "breach-notification": {
      strictness: 2,
      obligation:
        "California's separate breach-notification statute requires notice; the CCPA adds a private right of action for certain breaches.",
      citation: "Cal. Civ. Code §1798.82; §1798.150",
    },
    "dpo-representative": {
      strictness: 0,
      obligation: "No requirement to appoint a data protection officer or representative.",
      citation: "—",
    },
    dpia: {
      strictness: 1,
      obligation:
        "CPRA authorizes risk-assessment and cybersecurity-audit regulations for high-risk processing (adopted 2025, phased in).",
      citation: "§1798.185(a)(15)",
    },
    "cross-border-transfer": {
      strictness: 0,
      obligation: "No restriction on cross-border transfers of personal information.",
      citation: "—",
    },
    "data-localization": {
      strictness: 0,
      obligation: "No data localization requirement.",
      citation: "—",
    },
    "records-processing": {
      strictness: 1,
      obligation: "Businesses must maintain records of consumer requests for at least 24 months.",
      citation: "11 CCR §7101",
    },
    "vendor-processor": {
      strictness: 2,
      obligation:
        "Contracts with service providers, contractors, and third parties must contain specific mandated terms.",
      citation: "§1798.100(d), §1798.140",
    },
    security: {
      strictness: 2,
      obligation:
        "Duty to implement reasonable security; failure enables the breach private right of action, plus CPRA cybersecurity audits.",
      citation: "§1798.150, §1798.185(a)(15)",
    },
    "enforcement-penalties": {
      strictness: 2,
      obligation:
        "CPPA and AG enforcement with civil penalties of $2,500 per violation ($7,500 if intentional or involving minors); limited private right of action.",
      citation: "§1798.155, §1798.199",
    },
  },
};
