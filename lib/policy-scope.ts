// ---------------------------------------------------------------------------
// What a privacy policy can and cannot evidence.
//
// A published privacy policy is ONE artifact. It can show what an organization
// tells people, and it is decent evidence of transparency and rights mechanics.
// It is poor-to-useless evidence of what actually happens inside the business:
// security controls, processor contracts, records of processing, and impact
// assessments live in documents the public never sees.
//
// Scoring a policy against obligations it structurally cannot evidence would
// manufacture failures that mean nothing. So each requirement is classified up
// front, and the out-of-scope ones are reported as NOT ASSESSABLE rather than
// as gaps.
// ---------------------------------------------------------------------------

export type PolicyScope = "assessable" | "partial" | "not-assessable";

export interface ScopeEntry {
  scope: PolicyScope;
  /** Why this requirement sits in that bucket. Shown in the report. */
  reason: string;
}

export const policyScope: Record<string, ScopeEntry> = {
  "notice-transparency": {
    scope: "assessable",
    reason: "A privacy policy IS the transparency artifact — this is what it exists to do.",
  },
  "lawful-basis": {
    scope: "assessable",
    reason: "Policies are expected to state the basis relied on for each purpose.",
  },
  consent: {
    scope: "partial",
    reason:
      "The policy can describe the consent model, but whether consent is actually freely given and withdrawable depends on the live UI, not the text.",
  },
  "rights-access": { scope: "assessable", reason: "The policy should state the right and how to exercise it." },
  "rights-deletion": { scope: "assessable", reason: "The policy should state the right and how to exercise it." },
  "rights-correction": { scope: "assessable", reason: "The policy should state the right and how to exercise it." },
  "rights-portability": { scope: "assessable", reason: "The policy should state the right and how to exercise it." },
  "rights-optout-sale": {
    scope: "assessable",
    reason: "Opt-out of sale/sharing and direct marketing must be disclosed and a mechanism offered.",
  },
  "rights-automated-decision": {
    scope: "assessable",
    reason: "Existence of solely-automated decision-making must be disclosed where it occurs.",
  },
  "sensitive-data": {
    scope: "assessable",
    reason: "Categories of sensitive data and their handling should be disclosed.",
  },
  "childrens-data": {
    scope: "assessable",
    reason: "Age thresholds and parental-consent handling should be disclosed.",
  },
  "cross-border-transfer": {
    scope: "assessable",
    reason: "Transfers and their safeguards must be disclosed to data subjects.",
  },
  "dpo-representative": {
    scope: "partial",
    reason:
      "A policy can name a DPO or representative and give contact details, but not prove the appointment meets statutory criteria.",
  },
  "data-localization": {
    scope: "partial",
    reason: "A policy may state where data is stored, but storage location is an operational fact, not a disclosure.",
  },
  security: {
    scope: "not-assessable",
    reason:
      "Security is about implemented controls. A policy saying 'we use appropriate measures' is not evidence that they exist.",
  },
  "breach-notification": {
    scope: "not-assessable",
    reason:
      "This is an incident-response duty owed to regulators. Policies rarely state it and are not evidence of the procedure.",
  },
  "records-processing": {
    scope: "not-assessable",
    reason: "Records of processing are internal documents, never published in a policy.",
  },
  dpia: {
    scope: "not-assessable",
    reason: "Impact assessments are internal documents, never published in a policy.",
  },
  "vendor-processor": {
    scope: "not-assessable",
    reason:
      "Mandatory processor terms live in contracts. A policy naming sub-processors says nothing about the contract terms.",
  },
  "enforcement-penalties": {
    scope: "not-assessable",
    reason:
      "This describes what a regulator may do. It is not an obligation on the organization, so a policy cannot satisfy it.",
  },
};
