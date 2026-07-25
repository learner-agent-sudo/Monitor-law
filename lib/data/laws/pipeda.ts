import type { Law } from "@/lib/types";

export const pipeda: Law = {
  id: "pipeda",
  jurisdictionId: "ca",
  name: "Personal Information Protection and Electronic Documents Act (S.C. 2000, c. 5)",
  shortName: "PIPEDA",
  domain: "privacy",
  status: "in-force",
  effectiveDate: "2001",
  authority: "Office of the Privacy Commissioner of Canada (OPC)",
  officialUrl: "https://laws-lois.justice.gc.ca/eng/acts/P-8.6/",
  summary:
    "PIPEDA is Canada's federal private-sector privacy law, built around ten fair-information principles and centered on meaningful consent. It applies to organizations engaged in commercial activity (outside provinces with 'substantially similar' laws). Enforcement follows an ombudsperson model with comparatively modest penalties — reform under Bill C-27 (which would have added the CPPA and AIDA) died on the order paper when Parliament was prorogued in early 2025.",
  mappings: {
    "lawful-basis": {
      strictness: 2,
      obligation:
        "Processing must be for purposes a reasonable person would consider appropriate; consent is generally required.",
      citation: "PIPEDA s.5(3); Sch.1 Principle 4.3",
    },
    consent: {
      strictness: 3,
      obligation:
        "Meaningful (express or implied) consent is the central requirement; individuals may withdraw consent at any time.",
      citation: "Sch.1 Principle 4.3 (Consent)",
    },
    "notice-transparency": {
      strictness: 2,
      obligation: "Openness principle requires organizations to make privacy practices readily available.",
      citation: "Sch.1 Principle 4.8 (Openness)",
    },
    "rights-access": {
      strictness: 2,
      obligation: "Individuals may access their personal information and be told how it has been used and disclosed.",
      citation: "Sch.1 Principle 4.9 (Individual Access)",
    },
    "rights-deletion": {
      strictness: 1,
      obligation:
        "No general erasure right; data must be destroyed when no longer needed, and withdrawal of consent can compel deletion.",
      citation: "Sch.1 Principle 4.5.3",
    },
    "rights-correction": {
      strictness: 2,
      obligation: "Individuals can challenge accuracy and have information amended as appropriate.",
      citation: "Sch.1 Principle 4.9.5",
    },
    "rights-portability": {
      strictness: 0,
      obligation: "No data-portability right (proposed under the lapsed Bill C-27).",
      citation: "—",
    },
    "rights-optout-sale": {
      strictness: 1,
      obligation: "No specific 'sale' opt-out; individuals rely on the general right to withdraw consent.",
      citation: "Sch.1 Principle 4.3.8",
    },
    "rights-automated-decision": {
      strictness: 0,
      obligation: "Automated decision-making is not specifically regulated (proposed under the lapsed Bill C-27).",
      citation: "—",
    },
    "sensitive-data": {
      strictness: 2,
      obligation: "Sensitivity of information raises the required form of consent and level of security.",
      citation: "Sch.1 Principle 4.3.4",
    },
    "childrens-data": {
      strictness: 1,
      obligation:
        "No statutory children's regime; OPC guidance treats minors' information as sensitive requiring heightened care.",
      citation: "OPC guidance",
    },
    "breach-notification": {
      strictness: 2,
      obligation:
        "Mandatory report to the OPC and affected individuals where a breach poses a real risk of significant harm; records of all breaches must be kept.",
      citation: "PIPEDA s.10.1",
    },
    "dpo-representative": {
      strictness: 2,
      obligation: "Organizations must designate an individual accountable for compliance.",
      citation: "Sch.1 Principle 4.1 (Accountability)",
    },
    dpia: {
      strictness: 1,
      obligation: "No statutory DPIA mandate; OPC expects assessments for higher-risk initiatives.",
      citation: "OPC guidance",
    },
    "cross-border-transfer": {
      strictness: 2,
      obligation:
        "Transfers for processing are permitted but the organization remains accountable and must ensure comparable protection.",
      citation: "OPC transfer guidelines; Principle 4.1.3",
    },
    "data-localization": {
      strictness: 0,
      obligation: "No federal data localization requirement (some provincial public-sector rules exist).",
      citation: "—",
    },
    "records-processing": {
      strictness: 1,
      obligation: "Accountability principle plus mandatory record-keeping of security breaches.",
      citation: "PIPEDA s.10.3",
    },
    "vendor-processor": {
      strictness: 2,
      obligation: "The transferring organization remains accountable and must use contractual means to ensure protection.",
      citation: "Sch.1 Principle 4.1.3",
    },
    security: {
      strictness: 2,
      obligation: "Safeguards appropriate to the sensitivity of the information are required.",
      citation: "Sch.1 Principle 4.7 (Safeguards)",
    },
    "enforcement-penalties": {
      strictness: 1,
      obligation:
        "Ombudsperson model: the OPC investigates and issues non-binding findings; the Federal Court may order damages. (Large fines were proposed under the lapsed Bill C-27.)",
      citation: "PIPEDA ss.14–16",
    },
  },
};
