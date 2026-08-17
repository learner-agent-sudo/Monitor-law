// ---------------------------------------------------------------------------
// Shared rules for policy analysis — ONE source for both consumers.
//
// This is .mjs rather than .ts so that scripts/analyze-policy.mjs and the
// browser page can import the same regex literals. An earlier version kept the
// probes in TypeScript and had the Node script parse them out as text, which
// truncated every pattern at the first "]" inside a character class. Sharing a
// real module removes that whole class of bug.
// ---------------------------------------------------------------------------

import { remediationFor } from "./policy-remediation.mjs";

/**
 * What a privacy policy can and cannot evidence.
 *
 * A published policy is ONE artifact. It shows what an organization tells
 * people — decent evidence of transparency and rights mechanics, poor evidence
 * of what happens internally. Security controls, processor contracts, records
 * of processing and impact assessments live in documents the public never sees.
 *
 * Scoring a policy against obligations it structurally cannot evidence would
 * manufacture failures that mean nothing, so those are reported separately.
 */
export const policyScope = {
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
      "The policy can describe the consent model, but whether consent is actually freely given and withdrawable depends on the live interface, not the text.",
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
      "A policy can name a DPO or representative and give contact details, but cannot prove the appointment meets statutory criteria.",
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

/**
 * Patterns locating candidate clauses. Deliberately generous: a missed clause
 * shows up as a false "not evidenced", which reads as a real deficiency, so
 * under-matching is the more damaging direction. Several patterns below exist
 * because a real policy phrased a right differently than expected.
 */
export const probes = {
  "notice-transparency": [
    /personal (information|data) (we|that we) collect/i,
    /categories of personal/i,
    /this (privacy )?(policy|notice)/i,
  ],
  "lawful-basis": [/legal basis|lawful basis|legitimate interest|contractual necessity/i],
  consent: [/\bconsent\b/i, /withdraw (your )?consent/i, /opt[- ]in/i],
  "rights-access": [
    /right to (request )?(access|know)/i,
    /request a copy of/i,
    /access to the personal/i,
    /right to access/i,
  ],
  "rights-deletion": [
    /right to (request )?(delete|deletion|erasure)/i,
    /right to be forgotten/i,
    /seeks? to .{0,40}delete/i,
    /(remove|delet\w+) (your |such |the )?(personal )?(data|information)/i,
  ],
  "rights-correction": [
    /right to (request )?(correct|rectif)/i,
    /correct\W{0,3}.{0,40}inaccurate/i,
    /seeks? to correct/i,
    /(correct|amend|rectify) (inaccurate|incomplete|your)/i,
  ],
  "rights-portability": [/data portability|portable format|machine[- ]readable/i, /transmit .{0,30}to another/i],
  "rights-optout-sale": [
    /opt[- ]out/i,
    /do not sell/i,
    /sale of personal/i,
    /global privacy control/i,
    /unsubscribe/i,
    /will not (share|sell|trade)/i,
  ],
  "rights-automated-decision": [/automated (decision|processing)/i, /\bprofiling\b/i],
  "sensitive-data": [/sensitive (personal )?(information|data)/i, /special categor/i, /biometric/i],
  "childrens-data": [/\bchild(ren)?\b|\bminors?\b|under the age of|parental consent|COPPA|FERPA/i],
  "cross-border-transfer": [
    /transfer.{0,40}(outside|international|cross[- ]border)/i,
    /standard contractual clauses|adequacy decision/i,
    /data privacy framework|\bDPF\b|privacy shield/i,
    /transferred to the united states|received from the european union/i,
  ],
  // A generic legal/contact address is NOT a DPO or an Art. 27 representative.
  // Matching one produced a false POSITIVE on the first real policy — evidence
  // of compliance where none was shown, which is worse than a missed clause.
  "dpo-representative": [/data protection officer|EU representative|privacy officer/i],
  "data-localization": [/stored? (in|within)|data cent(er|re)s? (located|in)/i, /servers that are located/i],
};


/**
 * What each verdict means and what a reviewer should DO about it.
 *
 * The single most important line here is under NOT EVIDENCED. The obvious
 * response to a gap is "add a clause" — but a clause describing a practice the
 * organization does not actually follow is a misrepresentation, and a worse
 * problem than the gap it papers over. The policy must follow the practice,
 * never the reverse.
 */
export const VERDICT_GUIDE = {
  "NOT EVIDENCED": {
    meaning:
      "The law imposes this obligation, and no clause addressing it was found in the policy text.",
    action:
      "First establish whether the organization actually does this. If it does, the policy is simply silent — add a clause describing the real practice. If it does not, you have found a substantive gap: fix the practice, then describe it. Never add a clause to close the finding without the practice behind it.",
  },
  PARTIAL: {
    meaning:
      "The policy addresses this, but a policy alone cannot settle it — the obligation depends on something outside the document.",
    action:
      "Read the quoted clause, then verify the thing it depends on: the live consent interface, the actual appointment, where data really sits. No policy edit will resolve this on its own.",
  },
  EVIDENCED: {
    meaning:
      "A clause addressing this obligation was found. This is location, not assessment — the tool has not judged whether it goes far enough.",
    action:
      "Read the policy clause against the statutory quote beside it. Ask whether it carries the specifics the law demands (timeframes, categories, named mechanisms). Vague wording can be 'evidenced' and still fall short.",
  },
  "NOT ASSESSABLE": {
    meaning:
      "A real obligation, but one discharged through documents a public policy never contains — contracts, records, internal assessments, incident procedures.",
    action:
      "Do not edit the policy for these. Go and check the other artifact: the processor contract, the record of processing, the DPIA, the breach procedure. A policy sentence claiming these exist proves nothing.",
  },
  "NO OBLIGATION": {
    meaning: "This law imposes nothing here, so there is nothing for the policy to satisfy.",
    action:
      "No action. Shown only so the taxonomy stays comparable across laws — another law may well require it.",
  },
};

/**
 * How firmly the law imposes the obligation, carried through from the catalog's
 * 0–3 strictness. Without this, a duty the statute merely RECOMMENDS reads
 * exactly like one it mandates — the Hong Kong PDPO's DPO guidance, for
 * instance, is best practice rather than law, and should not sit in a
 * reviewer's queue beside a hard requirement.
 */
export const SEVERITY = {
  3: { label: "Mandatory", note: "The law imposes this comprehensively." },
  2: { label: "Required", note: "The law imposes this, with narrower scope or exceptions." },
  1: { label: "Advisory", note: "Addressed only weakly, or via regulator guidance rather than statute — treat as good practice, not a hard requirement." },
};

/** Split a policy into quotable sentences. */
export function toSentences(text) {
  return text
    .replace(/\r/g, "")
    .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z“"])/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 25 && s.length < 700);
}

/**
 * Core analysis. Given a law's obligations and a policy text, return findings.
 * Pure and deterministic — identical in Node and in the browser.
 */
/**
 * Which queue a finding belongs in. The split is by WHO acts and WHERE, because
 * "add a paragraph" and "build a register" are different jobs for different
 * people, and mixing them produces a list nobody can work through.
 */
export const LANES = {
  ACT: {
    id: "ACT",
    title: "Fix this",
    blurb:
      "The law requires it and your policy does not show it. Confirm the practice first, then publish wording that describes what is actually true.",
  },
  REVIEW: {
    id: "REVIEW",
    title: "Review the wording",
    blurb:
      "Something addressing this was found. Read it against the statutory text — presence is not adequacy, and vague wording can still fall short.",
  },
  ELSEWHERE: {
    id: "ELSEWHERE",
    title: "Check outside the policy",
    blurb:
      "A real obligation that lives in contracts, registers or internal procedures. Do not add policy wording for these — go and check the actual artefact.",
  },
  NONE: {
    id: "NONE",
    title: "Nothing required",
    blurb: "This law imposes no such obligation. Listed only so the taxonomy stays comparable across laws.",
  },
};

function laneFor(verdict) {
  if (verdict === "NOT EVIDENCED") return "ACT";
  if (verdict === "PARTIAL" || verdict === "EVIDENCED") return "REVIEW";
  if (verdict === "NOT ASSESSABLE") return "ELSEWHERE";
  return "NONE";
}

/** Sort key so the most urgent work surfaces first. */
function priority(verdict, strictness) {
  const laneRank = { ACT: 0, REVIEW: 1, ELSEWHERE: 2, NONE: 3 }[laneFor(verdict)];
  return laneRank * 10 + (3 - (strictness ?? 0));
}

export function analyzePolicy(obligations, policyText, lawId) {
  const sentences = toSentences(policyText);
  const findings = obligations.map((o) => {
    // If the law imposes nothing here, there is nothing for a policy to
    // evidence. Reporting it as a gap invents a failure out of the law's
    // own silence.
    if (!o.strictness) {
      return {
        ...o,
        verdict: "NO OBLIGATION",
        lane: "NONE",
        priority: priority("NO OBLIGATION", 0),
        scopeReason: "This law imposes no such obligation, so there is nothing for a policy to address.",
        evidence: [],
        remediation: null,
      };
    }
    const sc = policyScope[o.id] ?? { scope: "assessable", reason: "" };
    if (sc.scope === "not-assessable") {
      return {
        ...o,
        verdict: "NOT ASSESSABLE",
        lane: "ELSEWHERE",
        priority: priority("NOT ASSESSABLE", o.strictness),
        scopeReason: sc.reason,
        evidence: [],
        // Strictness still matters here: Hong Kong's breach notification is
        // voluntary guidance while the GDPR's is a hard 72-hour duty, and a
        // reviewer working through contracts and registers needs to know which.
        severity: SEVERITY[o.strictness] ?? null,
        remediation: remediationFor(o.id, lawId),
      };
    }
    const pats = probes[o.id] ?? [];
    const evidence = [];
    for (const s of sentences) {
      if (pats.some((p) => p.test(s))) {
        evidence.push(s);
        if (evidence.length >= 3) break;
      }
    }
    const verdict =
      evidence.length === 0 ? "NOT EVIDENCED" : sc.scope === "partial" ? "PARTIAL" : "EVIDENCED";
    return {
      ...o,
      verdict,
      lane: laneFor(verdict),
      priority: priority(verdict, o.strictness),
      scopeReason: sc.reason,
      evidence,
      severity: SEVERITY[o.strictness] ?? null,
      remediation: remediationFor(o.id, lawId),
    };
  });
  return findings.sort((a, b) => a.priority - b.priority);
}

export const VERDICT_ORDER = ["NOT EVIDENCED", "PARTIAL", "EVIDENCED", "NOT ASSESSABLE", "NO OBLIGATION"];
export const LANE_ORDER = ["ACT", "REVIEW", "ELSEWHERE", "NONE"];
