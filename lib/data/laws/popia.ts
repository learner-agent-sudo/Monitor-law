import type { Law } from "@/lib/types";

export const popia: Law = {
  id: "popia",
  jurisdictionId: "za",
  name: "Protection of Personal Information Act 4 of 2013 (POPIA)",
  shortName: "POPIA",
  domain: "privacy",
  status: "in-force",
  effectiveDate: "2020-07",
  authority: "Information Regulator (South Africa)",
  officialUrl: "https://www.gov.za/documents/protection-personal-information-act",
  summary:
    "South Africa's POPIA is a comprehensive privacy law that applies to any responsible party domiciled in the Republic, and to foreign parties that process personal information there by automated or non-automated means. It protects juristic persons as well as natural persons, and it is enforced by an Information Regulator, which receives notice of security compromises and before whom responsible parties must obtain prior authorisation for certain high-risk processing. Its penalties combine administrative fines of up to R10 million with offences, enforcement notices and civil damages that do not require intent or negligence.",
  mappings: {
    "lawful-basis": {
      strictness: 3,
      obligation:
        "Processing is lawful only on one of six enumerated grounds: consent, contract, legal obligation, protection of the data subject's legitimate interest, a public-law duty of a public body, or the legitimate interests of the responsible party or a third party.",
      citation: "s.11(1)(a)-(f)",
      quote: "Personal information may only be processed if",
    },
    consent: {
      strictness: 3,
      obligation:
        "Consent must be a voluntary, specific and informed expression of will; the responsible party bears the burden of proving it, and the data subject may withdraw it at any time.",
      citation: "s.1 (definition of consent); s.11(2)",
      quote:
        "any voluntary, specific and informed expression of will in terms of which permission is given for the processing of personal information",
    },
    "notice-transparency": {
      strictness: 3,
      obligation:
        "Before collection (or as soon as reasonably practicable after collection from a third party), the responsible party must make the data subject aware of the information collected, the purpose, its own name and address, any transfer abroad, the right to object and access and correction, and the right to complain to the Regulator.",
      citation: "s.18(1)-(2)",
      quote:
        "the responsible party must take reasonably practicable steps to ensure that the data subject is aware of",
    },
    "rights-access": {
      strictness: 2,
      obligation:
        "On proof of identity, a data subject may ask free of charge whether the responsible party holds their information, and may receive a record or description of it, with the third parties who have had access, within a reasonable time and at a prescribed fee, if any.",
      citation: "s.23(1)",
      quote:
        "request a responsible party to confirm, free of charge, whether or not the responsible party holds personal information about the data subject",
    },
    "rights-deletion": {
      strictness: 2,
      obligation:
        "On request, personal information that is inaccurate, irrelevant, excessive, out of date, incomplete, misleading or obtained unlawfully must be corrected or deleted, as soon as reasonably practicable; there is no general erasure right on any other ground.",
      citation: "s.24(1)(a)-(b), s.24(2)(b)",
      quote:
        "inaccurate, irrelevant, excessive, out of date, incomplete, misleading or obtained unlawfully",
    },
    "rights-correction": {
      strictness: 2,
      obligation:
        "On request, the responsible party must correct inaccurate information as soon as reasonably practicable, or otherwise attach a note that a correction was requested, and must notify the action taken.",
      citation: "s.24(2)-(4)",
      quote:
        "On receipt of a request in terms of subsection (1) a responsible party must, as soon as reasonably practicable",
    },
    "rights-portability": {
      strictness: 0,
      obligation:
        "No data-portability right: the access right in s.23 gives a record or description in a generally understandable form, not a right to receive or transfer data in a structured, machine-readable format.",
      citation: "—",
    },
    "rights-optout-sale": {
      strictness: 3,
      obligation:
        "Data subjects may object at any time to processing for direct marketing (other than unsolicited electronic marketing, which s.69 prohibits without consent or an existing customer relationship), and processing must then stop.",
      citation: "s.11(3)(b)-(4); s.69(1)",
      quote:
        "for purposes of direct marketing other than direct marketing by means of unsolicited electronic communications",
    },
    "rights-automated-decision": {
      strictness: 3,
      obligation:
        "A decision with legal consequences or a substantial effect, based solely on automated processing that profiles the person, is prohibited unless an s.71(2) exception applies; where one applies, the data subject may make representations and must receive sufficient information about the underlying logic.",
      citation: "s.71(1)-(3)",
      quote:
        "a data subject may not be subject to a decision which results in legal consequences for him, her or it",
    },
    "sensitive-data": {
      strictness: 3,
      obligation:
        "Processing of religious or philosophical beliefs, race or ethnic origin, trade union membership, political persuasion, health or sex life, biometric information, or criminal behaviour is prohibited unless one of the authorisations in ss.27-33 applies.",
      citation: "ss.26-33",
      quote:
        "the religious or philosophical beliefs, race or ethnic origin, trade union membership, political persuasion, health or sex life or biometric information of a data subject",
    },
    "childrens-data": {
      strictness: 3,
      obligation:
        "Processing personal information of a child (a person under 18) is prohibited unless a competent person has given prior consent, or another s.35 authorisation applies.",
      citation: "ss.34-35",
      quote:
        "A responsible party may, subject to section 35, not process personal information concerning a child",
    },
    "breach-notification": {
      strictness: 2,
      obligation:
        "Where there are reasonable grounds to believe personal information was accessed or acquired by an unauthorised person, the Regulator and the data subject must be notified as soon as reasonably possible, in writing and with prescribed content; no fixed deadline applies.",
      citation: "s.22(1)-(2), s.22(4)-(5)",
      quote:
        "Where there are reasonable grounds to believe that the personal information of a data subject has been accessed or acquired by any unauthorised person",
    },
    "dpo-representative": {
      strictness: 2,
      obligation:
        "Every public and private body must designate an information officer (and deputies as needed), who must be registered with the Regulator before taking up duties and who must encourage compliance and deal with requests.",
      citation: "ss.55-56",
      quote: "Each public and private body must make provision, in the manner prescribed",
    },
    dpia: {
      strictness: 2,
      obligation:
        "Certain high-risk processing (for example criminal-behaviour information processed for third parties, credit reporting, or special or children's information sent to a foreign country without adequate protection) needs the Regulator's prior authorisation before it starts. There is no general duty on the responsible party to run an impact assessment.",
      citation: "s.57(1)",
      quote:
        "The responsible party must obtain prior authorisation from the Regulator, in terms of section 58, prior to any processing",
    },
    "cross-border-transfer": {
      strictness: 3,
      obligation:
        "A transfer to a third party in a foreign country is prohibited unless the recipient is bound by adequate-protection law, binding corporate rules or a binding agreement, or the data subject consents, or a contract or benefit-of-the-data-subject exception applies.",
      citation: "s.72(1)",
      quote: "A responsible party in the Republic may not transfer personal information",
    },
    "data-localization": {
      strictness: 0,
      obligation:
        "No requirement to store personal information in South Africa. Section 72 restricts transfers abroad but does not require data to be kept in the Republic.",
      citation: "— no provision; see Cross-border transfer",
    },
    "records-processing": {
      strictness: 2,
      obligation:
        "The responsible party must maintain documentation of all processing operations, with its content set by reference to the Promotion of Access to Information Act.",
      citation: "s.17",
      quote: "A responsible party must maintain the documentation of all processing operations",
    },
    "vendor-processor": {
      strictness: 2,
      obligation:
        "An operator must be engaged under a written contract requiring it to keep the s.19 security measures; the operator must process only with authorisation, keep information confidential, and notify the responsible party immediately of a suspected compromise.",
      citation: "ss.20-21",
      quote: "in terms of a written contract between the responsible party and the operator",
    },
    security: {
      strictness: 2,
      obligation:
        "The responsible party must take appropriate, reasonable technical and organisational measures, identify foreseeable risks, establish and regularly verify safeguards, keep them updated, and have due regard to generally accepted information security practices.",
      citation: "s.19(1)-(3)",
      quote: "by taking appropriate, reasonable technical and organisational measures to prevent",
    },
    "enforcement-penalties": {
      strictness: 3,
      obligation:
        "The Regulator may issue enforcement notices and infringement notices with administrative fines of up to R10 million. Offences carry fines or imprisonment (up to 10 years for some), and data subjects may claim civil damages whether or not there was intent or negligence.",
      citation: "s.109(2)(c); ss.95, 99(1), 107",
      quote: "which amount may, subject to subsection (10), not exceed R10 million",
    },
  },
};
