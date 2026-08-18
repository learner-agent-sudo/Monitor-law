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
import { checkElements } from "./policy-elements.mjs";

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
 * Patterns locating candidate clauses.
 *
 * THIS IS TEXT MATCHING, NOT READING. Every probe is a regular expression run
 * over the policy's sentences — Ctrl-F with synonyms. It finds a phrasing, not
 * a meaning, and it cannot tell that "the purposes for which the information is
 * collected" and "our lawful basis" are addressing the same statutory idea
 * unless someone wrote both patterns down. Each probe therefore carries a plain
 * label, and the UI shows the reader exactly what was searched for, so a miss
 * can be recognised as a vocabulary gap rather than a deficiency in the policy.
 *
 * Deliberately generous: a missed clause shows up as a false "not evidenced",
 * which reads as a real deficiency, so under-matching is the more damaging
 * direction.
 */
export const probes = {
  "notice-transparency": [
    { label: "“personal information we collect”", re: /personal (information|data) (we|that we) collect/i },
    { label: "“categories of personal information”", re: /categor(y|ies) of personal/i },
    { label: "“this privacy policy / notice”", re: /this (privacy )?(policy|notice)/i },
  ],

  // Rewritten per law below. The default set is European vocabulary, which is
  // correct ONLY where the law actually has a lawful-basis regime.
  "lawful-basis": [
    { label: "“legal basis” or “lawful basis”", re: /leg(al|itimate) basis|lawful basis/i },
    { label: "“legitimate interests”", re: /legitimate interest/i },
    { label: "“necessary for the performance of a contract”", re: /contractual necessity|performance of (a|the|our) contract/i },
  ],

  consent: [
    { label: "“consent”", re: /\bconsent\b/i },
    { label: "“withdraw your consent”", re: /withdraw (your )?consent/i },
    { label: "“opt in”", re: /opt[- ]in/i },
  ],
  "rights-access": [
    { label: "“right to access” or “right to know”", re: /right to (request )?(access|know)/i },
    { label: "“request a copy of”", re: /request a copy of/i },
    { label: "“access to the personal information”", re: /access to (the |your )?personal/i },
  ],
  "rights-deletion": [
    { label: "“right to delete / deletion / erasure”", re: /right to (request )?(delete|deletion|erasure)/i },
    { label: "“right to be forgotten”", re: /right to be forgotten/i },
    { label: "“seeks to … delete”", re: /seeks? to .{0,40}delete/i },
    { label: "“remove / delete your data”", re: /(remove|delet\w+) (your |such |the )?(personal )?(data|information)/i },
  ],
  "rights-correction": [
    { label: "“right to correct / rectify”", re: /right to (request )?(correct|rectif)/i },
    { label: "“correct … inaccurate”", re: /correct\W{0,3}.{0,40}inaccurate/i },
    { label: "“seeks to correct”", re: /seeks? to correct/i },
    { label: "“correct / amend / rectify your information”", re: /(correct|amend|rectify|update) (inaccurate|incomplete|your)/i },
  ],
  "rights-portability": [
    { label: "“data portability” or “machine-readable”", re: /data portability|portable format|machine[- ]readable/i },
    { label: "“transmit … to another”", re: /transmit .{0,30}to another/i },
  ],
  "rights-optout-sale": [
    { label: "“opt out”", re: /opt[- ]out/i },
    { label: "“do not sell”", re: /do not sell/i },
    { label: "“sale of personal information”", re: /sale of personal/i },
    { label: "“Global Privacy Control”", re: /global privacy control/i },
    { label: "“unsubscribe”", re: /unsubscribe/i },
    { label: "“will not share / sell / trade”", re: /will not (share|sell|trade)/i },
  ],
  "rights-automated-decision": [
    { label: "“automated decision / processing”", re: /automated (decision|processing)/i },
    { label: "“profiling”", re: /\bprofiling\b/i },
  ],
  "sensitive-data": [
    { label: "“sensitive personal information”", re: /sensitive (personal )?(information|data)/i },
    { label: "“special categories”", re: /special categor/i },
    { label: "“biometric”", re: /biometric/i },
  ],
  "childrens-data": [
    { label: "“child / minor / under the age of / parental consent”", re: /\bchild(ren)?\b|\bminors?\b|under the age of|parental consent|COPPA|FERPA/i },
  ],
  "cross-border-transfer": [
    { label: "“transfer … outside / international / cross-border”", re: /transfer.{0,40}(outside|international|cross[- ]border)/i },
    { label: "“standard contractual clauses” or “adequacy decision”", re: /standard contractual clauses|adequacy decision/i },
    { label: "“Data Privacy Framework” or “Privacy Shield”", re: /data privacy framework|\bDPF\b|privacy shield/i },
    { label: "“transferred to the United States”", re: /transferred to the united states|received from the european union/i },
  ],
  // A generic legal/contact address is NOT a DPO or an Art. 27 representative.
  // Matching one produced a false POSITIVE on an early real policy — evidence
  // of compliance where none was shown, which is worse than a missed clause.
  "dpo-representative": [
    { label: "“data protection officer” / “privacy officer”", re: /data protection officer|privacy officer|\bDPO\b/i },
    { label: "“EU representative”", re: /EU representative|article 27|art\.? ?27/i },
  ],
  "data-localization": [
    { label: "“stored in / within”", re: /stored? (in|within)/i },
    { label: "“data centres located in”", re: /data cent(er|re)s? (located|in)|servers that are located/i },
  ],
};

/**
 * What counts as EVIDENCE of an obligation is not the same in every law, and
 * assuming it is produced a straightforwardly wrong finding: a Canadian policy
 * that identified its purposes exhaustively — categories, uses, the lot — was
 * reported as having no clause on "lawful basis", because the probe searched
 * only for the European phrase. PIPEDA has no concept of a lawful basis. The
 * policy was fine; the probe was looking for the wrong words.
 *
 * So laws whose vocabulary genuinely differs get their own probe set, mirroring
 * the byLaw overrides in policy-remediation.mjs. Where a law IS a lawful-basis
 * regime (GDPR, UK GDPR) the default set stands, because there a policy that
 * lists purposes but never names a basis really is missing something Art.
 * 13(1)(c) requires.
 */
const PURPOSES_STATED = [
  { label: "“the purposes for which … information is collected”", re: /purposes? (for|of) which .{0,60}(information|data)/i },
  { label: "“tied to the purposes”", re: /tied to the purposes?/i },
  { label: "“collected / used for the following purposes”", re: /(collect|use|process)\w*\s.{0,40}for (the )?(following )?purposes?/i },
  { label: "“for the following purposes:”", re: /for (the )?(following )?purposes?\s*[:—-]/i },
  { label: "a category-and-purpose table", re: /categor(y|ies) of personal (information|data)/i },
  { label: "“we identify the purposes”", re: /identif\w+ (the )?purposes?/i },
];

const CONSENT_OR_EXCEPTION = [
  { label: "“consent”", re: /\bconsent\b/i },
  { label: "“required by law” / “legal and regulatory obligations”", re: /required by law|legal (and regulatory )?obligation|permitted by law|comply with legal/i },
];

export const probesByLaw = {
  "lawful-basis": {
    // Consent-plus-identified-purposes regimes. Naming a "basis" is not a thing
    // these laws ask for, so requiring the phrase manufactures a gap.
    pipeda: [...PURPOSES_STATED, ...CONSENT_OR_EXCEPTION],
    "quebec-law25": [...PURPOSES_STATED, ...CONSENT_OR_EXCEPTION],
    pdpo: [
      ...PURPOSES_STATED,
      { label: "“lawful purpose directly related to”", re: /lawful purpose|directly related to (a|our) (function|activity)/i },
    ],
    // Notice-at-collection regime: purposes and retention, no grounds at all.
    ccpa: [
      ...PURPOSES_STATED,
      { label: "“purposes for which … collected or used”", re: /purposes? for which .{0,60}(collected|used)/i },
    ],
    // PIPL does have enumerated conditions (Art. 13), but Art. 17 asks you to
    // publish the purpose, not the condition.
    pipl: [...PURPOSES_STATED, ...CONSENT_OR_EXCEPTION],
  },
};

/** The probe set that applies to a requirement under a specific law. */
export function probesFor(requirementId, lawId) {
  return probesByLaw[requirementId]?.[lawId] ?? probes[requirementId] ?? [];
}


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
      "This law addresses the obligation — see the strength badge for how firmly — and no clause addressing it was found in the policy text.",
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
 * Recognise a heading so a finding can cite WHERE in the policy a clause sits.
 *
 * "Your policy says '...'" is far less useful to someone who has to go and edit
 * the document than "Section 4.1 'Your rights' says '...'". Policies arrive in
 * whatever shape the site used, so several conventions are supported. Anything
 * unrecognised simply yields no heading rather than a wrong one — a misattributed
 * section number would send a reader to edit the wrong paragraph.
 */
function parseHeading(line) {
  const l = line.trim();
  if (!l || l.length > 90) return null;

  // Numbered: "4.1 Your rights" / "4.1. Your rights" / "Section 4.1 — Your rights"
  const numbered = (s) => {
    const m = s.match(/^(?:section\s+)?(\d+(?:\.\d+)*)[.):]?\s*[—–-]?\s*(.{2,80})$/i);
    return m && !/[.!?]$/.test(m[2]) ? { number: m[1], title: m[2].replace(/\*\*/g, "").trim() } : null;
  };

  // Markdown: "## Access and Choice", or "# 4. TYPES OF INFORMATION" — where
  // the number belongs in the citation, not stranded inside the title.
  const md = l.match(/^#{1,6}\s+(.+?)\s*#*$/);
  if (md) {
    const inner = md[1].replace(/\*\*/g, "").trim();
    return numbered(inner) ?? { number: null, title: inner };
  }

  const num = numbered(l);
  if (num) return num;

  // A whole line in bold, with nothing else on it.
  const bold = l.match(/^\*\*(.{2,80}?)\*\*[:.]?$/);
  if (bold) return { number: null, title: bold[1].trim() };

  // ALL CAPS line, e.g. "INFORMATION WE COLLECT".
  if (/^[A-Z][A-Z0-9 \-&/,'()]{3,70}$/.test(l) && /[A-Z]{3}/.test(l)) {
    return { number: null, title: l.replace(/\s+/g, " ") };
  }

  return null;
}

/** A short, human label for citing a section: `Section 4.1 "Your rights"`. */
function sectionLabel(h) {
  if (!h) return null;
  if (h.number && h.title) return `Section ${h.number} — “${h.title}”`;
  if (h.number) return `Section ${h.number}`;
  return `“${h.title}”`;
}

/**
 * Split a policy into sections, each carrying its heading and its sentences.
 * Text before the first heading becomes an untitled opening section.
 */
export function toSections(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  const sections = [];
  let current = { heading: null, label: null, lines: [] };

  for (const line of lines) {
    const h = parseHeading(line);
    if (h) {
      if (current.lines.join("").trim()) sections.push(current);
      current = { heading: h, label: sectionLabel(h), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.join("").trim()) sections.push(current);

  return sections.map((s, i) => ({
    index: i,
    heading: s.heading,
    // Sections before any heading still need a citable name.
    label: s.label ?? (i === 0 ? "the opening text" : `the text following section ${i}`),
    text: s.lines.join("\n"),
    sentences: toSentences(s.lines.join("\n")),
  }));
}

/** Every sentence in the policy, each tagged with the section it came from. */
function locatedSentences(text) {
  const out = [];
  for (const sec of toSections(text)) {
    for (const sentence of sec.sentences) out.push({ text: sentence, section: sec.label });
  }
  return out;
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
      "The law imposes this squarely and your policy does not show it. Confirm the practice first, then publish wording that describes what is actually true.",
  },
  CONSIDER: {
    id: "CONSIDER",
    title: "Consider",
    blurb:
      "This law addresses the topic only weakly — leaving it to regulator guidance, or imposing something narrower than the requirement as this taxonomy defines it. That makes it a judgement call rather than a deficiency: usually worth doing, legitimate to decline with a recorded reason, and often mandatory under a different law in the catalog. Check the basis tag on each step, because a narrower sub-duty may still bind you even where the headline requirement does not.",
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

/**
 * Strictness decides between ACT and CONSIDER, and the distinction matters.
 * A strictness-1 requirement is one the law barely touches or leaves to
 * regulator guidance — Hong Kong's DPO recommendation, California's silence on
 * grounds for processing. Filing those under "Fix this" alongside a hard
 * statutory duty tells the reader the law demands something it does not, and
 * they have no way to see the overclaim without reading the statute themselves.
 */
function laneFor(verdict, strictness) {
  if (verdict === "NOT EVIDENCED") return (strictness ?? 0) >= 2 ? "ACT" : "CONSIDER";
  if (verdict === "PARTIAL" || verdict === "EVIDENCED") return "REVIEW";
  if (verdict === "NOT ASSESSABLE") return "ELSEWHERE";
  return "NONE";
}

/** Sort key so the most urgent work surfaces first. */
function priority(verdict, strictness) {
  const laneRank = { ACT: 0, REVIEW: 1, CONSIDER: 2, ELSEWHERE: 3, NONE: 4 }[
    laneFor(verdict, strictness)
  ];
  return laneRank * 10 + (3 - (strictness ?? 0));
}

export function analyzePolicy(obligations, policyText, lawId) {
  const sentences = locatedSentences(policyText);
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
    const pats = probesFor(o.id, lawId);
    const evidence = [];
    for (const s of sentences) {
      if (pats.some((p) => p.re.test(s.text))) {
        evidence.push(s);
        if (evidence.length >= 3) break;
      }
    }
    // Exactly which phrasings were looked for, and which hit. Shown to the
    // reader so a miss is legible as "it does not use these words" rather than
    // "the tool read your policy and the clause is not there".
    const searched = pats.map((p) => ({
      label: p.label,
      found: sentences.some((s) => p.re.test(s.text)),
    }));
    const verdict =
      evidence.length === 0 ? "NOT EVIDENCED" : sc.scope === "partial" ? "PARTIAL" : "EVIDENCED";

    // Which specific elements of the obligation the policy does and does not
    // appear to carry. This is what turns "there is a gap" into a sentence a
    // reviewer can act on without re-reading the whole document.
    const els = checkElements(o.id, sentences);
    const missing = els.filter((e) => !e.found);

    return {
      ...o,
      verdict,
      lane: laneFor(verdict, o.strictness),
      priority: priority(verdict, o.strictness),
      scopeReason: sc.reason,
      evidence,
      searched,
      // Where to make the edit: the section holding the closest existing clause.
      // Absent that, there is nothing to amend and the fix is an insertion.
      editTarget: evidence[0]?.section ?? null,
      elements: els,
      missingElements: missing,
      severity: SEVERITY[o.strictness] ?? null,
      remediation: remediationFor(o.id, lawId),
    };
  });
  return findings.sort((a, b) => a.priority - b.priority);
}

/**
 * The gap, in one sentence, for a finding that has elements to check.
 *
 * Deliberately phrased as "not located" rather than "missing": these are
 * pattern matches over prose, and a policy may say the thing in words no probe
 * anticipated. The reader is being pointed somewhere to look, not handed a
 * conclusion.
 */
export function gapStatement(f, shortName) {
  if (f.lane === "NONE") return `${shortName} imposes no such obligation, so there is no gap.`;
  if (f.lane === "ELSEWHERE") {
    return `This duty is not discharged through a privacy policy, so the policy's silence is not the gap — the contract, register or procedure is what to check.`;
  }
  if (!f.evidence.length) {
    const base =
      `No wording matching this obligation's search terms was located, so there is no existing ` +
      `clause to amend — ${shortName} addresses it and the policy appears silent.`;
    // Element probes search the whole document, so they can find related
    // material where the obligation's own probe found none. Saying so prevents
    // the contradiction of "nothing located" sitting directly above a tick, and
    // it points at the section where new wording would most naturally go.
    const found = f.elements.filter((e) => e.found);
    if (!found.length) return base;
    const where = [...new Set(found.map((e) => e.section).filter(Boolean))].join(", ");
    return (
      `${base} Related material does appear${where ? ` in ${where}` : " elsewhere"}, covering ` +
      `${found.map((e) => e.label).join("; ")} — likely the natural place to add the rest.`
    );
  }
  if (!f.elements.length) {
    return `The policy addresses this. Read the clause above against the statutory text to judge whether it goes far enough.`;
  }
  if (!f.missingElements.length) {
    return `Every element this tool checks for is present somewhere in the policy. That is not a finding of adequacy — a human still has to read the wording against the statute.`;
  }
  const found = f.elements.filter((e) => e.found);
  const missing = f.missingElements.map((e) => e.label).join("; ");
  return found.length
    ? `The clause above covers ${found.length} of ${f.elements.length} elements. Not located anywhere in the policy: ${missing}.`
    : `A related clause exists, but none of the elements this obligation needs were located: ${missing}.`;
}

export const VERDICT_ORDER = ["NOT EVIDENCED", "PARTIAL", "EVIDENCED", "NOT ASSESSABLE", "NO OBLIGATION"];
export const LANE_ORDER = ["ACT", "REVIEW", "CONSIDER", "ELSEWHERE", "NONE"];
