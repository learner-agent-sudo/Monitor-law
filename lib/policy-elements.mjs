// ---------------------------------------------------------------------------
// Element checks — what a clause has to actually CARRY.
//
// Locating a clause about deletion tells a reviewer almost nothing. "You can
// ask us to delete your data" and a clause that also states the exceptions and
// how to make the request are both "evidenced", and only one of them is any
// use. This file breaks each obligation into the specific elements a reader
// should be able to find, and reports which are located and which are not.
//
// That converts a vague finding into the concrete statement a reviewer needs:
//   your Section 4.1 covers the right and how to request it, but the response
//   deadline is not located anywhere in the policy.
//
// TWO RULES OF HONESTY HERE.
//
// 1. Elements are searched across the WHOLE policy, not just the matched
//    section, and the section where each was located is reported. A deadline
//    stated under "Contact us" is stated. Searching only the matched section
//    would manufacture gaps out of a document's layout.
//
// 2. The result is "not located", never "missing". These are regex probes over
//    prose: they find a phrasing, not a meaning. A policy can express something
//    in words no pattern anticipated, so every negative is a prompt to look,
//    not a finding.
//
// Elements carry the same basis vocabulary as remediation steps: "law" where
// the obligation itself calls for the element, "practice" where it is our view
// of what makes a clause usable. Tagged conservatively — when in doubt it is
// "practice", because overstating what the law demands is the failure mode that
// matters.
// ---------------------------------------------------------------------------

export const elements = {
  "notice-transparency": [
    { id: "categories", label: "the categories of data collected", basis: "law", probe: /categor(y|ies) of|types? of (personal )?(data|information)|information we collect|data we collect/i },
    { id: "purposes", label: "why each category is collected", basis: "law", probe: /purpose|in order to|we use (it|this|your|the)|so that we can/i },
    { id: "recipients", label: "who the data is shared with", basis: "law", probe: /shar(e|ed|ing)|disclos|third part|service provider|vendor|sub-?processor|affiliate/i },
    { id: "retention", label: "how long it is kept", basis: "law", probe: /retain|retention|how long|no longer than|delete .{0,30}(after|once)|keep .{0,30}(for|until)/i },
    { id: "updated", label: "a last-updated date, so a reader knows the version", basis: "practice", probe: /last updated|last revised|effective (as of|date)|this (policy|document) was updated/i },
  ],

  // The "permission" element is deliberately written to accept BOTH
  // vocabularies. A European policy names a basis; a Canadian one identifies
  // purposes and points at consent or a statutory exception. Requiring the
  // European phrasing everywhere is the same mistake that made this file
  // necessary — see the probesByLaw note in policy-rules.mjs.
  "lawful-basis": [
    { id: "purposes", label: "the specific purposes you process for", basis: "law", probe: /purpose|in order to|we use (it|this|your|the)|tied to the/i },
    {
      id: "permission",
      label: "what permits each purpose — a named basis, consent, or the exception relied on",
      basis: "law",
      probe: /legal basis|lawful basis|legitimate interest|performance of (a |the )?contract|legal (and regulatory )?obligation|with your consent|you consent|your consent|required by law|comply with legal|permitted by law|necessary (for|to)/i,
    },
  ],

  consent: [
    { id: "how", label: "how consent is obtained", basis: "law", probe: /consent|opt[- ]in|you agree|by (using|submitting|providing)/i },
    { id: "withdraw", label: "how to withdraw it", basis: "law", probe: /withdraw|revoke|change your mind|opt[- ]out|unsubscribe/i },
    { id: "granular", label: "that consent is asked for separately, not bundled into the terms", basis: "practice", probe: /separate(ly)? consent|specific consent|granular|each purpose|where we rely on (your )?consent/i },
  ],

  "rights-access": [
    { id: "right", label: "that you can obtain a copy of your data", basis: "law", probe: /right to (request )?(access|know)|request a copy|obtain a copy|access to (the |your )?(personal )?(data|information)/i },
    { id: "how", label: "how to make the request", basis: "law", probe: /contact|email|@|request form|submit a request|write to us/i },
    { id: "deadline", label: "the deadline for responding", basis: "practice", probe: /within (\d+|one|two|thirty|forty|forty-five|sixty)[- ]?(business |calendar )?(days?|months?)|\b(30|40|45|60|90) days\b|one month/i },
    { id: "identity", label: "what you may be asked for to verify identity", basis: "practice", probe: /verif(y|ication)|confirm your identity|proof of identity|identify yourself/i },
  ],

  "rights-deletion": [
    { id: "right", label: "that you can ask for deletion", basis: "law", probe: /right to (request )?(delete|deletion|erasure)|right to be forgotten|ask us to delete|request .{0,30}(deletion|erasure)|(remove|delete) (your |such |the )?(personal )?(data|information)/i },
    { id: "exceptions", label: "when you would refuse, and why", basis: "law", probe: /unless|except|we (may|are) (required|permitted) to (retain|keep)|legal (obligation|retention)|to (establish|defend)/i },
    { id: "how", label: "how to make the request", basis: "law", probe: /contact|email|@|request form|submit a request/i },
  ],

  "rights-correction": [
    { id: "right", label: "that you can have inaccurate data corrected", basis: "law", probe: /right to (request )?(correct|rectif)|correct .{0,40}inaccurate|(correct|amend|rectify|update) (inaccurate|incomplete|your)/i },
    { id: "how", label: "how to make the request", basis: "law", probe: /contact|email|@|request form|submit a request/i },
    { id: "downstream", label: "whether recipients of the wrong data are told about the correction", basis: "practice", probe: /notify .{0,40}(third|recipient|those)|inform .{0,40}(third|recipient)|pass(ed)? on the correction/i },
  ],

  "rights-portability": [
    { id: "right", label: "that you can receive your data in a portable format", basis: "law", probe: /portab|machine[- ]readable|structured.{0,25}format|commonly used.{0,25}format/i },
    { id: "format", label: "which format you would actually get", basis: "practice", probe: /\bcsv\b|\bjson\b|\bxml\b|machine[- ]readable|commonly used/i },
    { id: "transmit", label: "whether it can be sent directly to another provider", basis: "law", probe: /transmit .{0,30}(to )?another|send .{0,30}to another (provider|controller|service)|directly to another/i },
  ],

  "rights-optout-sale": [
    { id: "statement", label: "a clear statement of whether data is sold or shared", basis: "law", probe: /do not sell|does not sell|we sell|sale of personal|shar(e|ing) .{0,40}(personal|data)|will not (share|sell|trade)/i },
    { id: "mechanism", label: "the mechanism for opting out", basis: "law", probe: /opt[- ]out|unsubscribe|preference cent|do not sell.{0,30}link|privacy choices/i },
    { id: "signals", label: "whether browser signals such as Global Privacy Control are honoured", basis: "practice", probe: /global privacy control|\bGPC\b|browser (signal|setting)|do not track/i },
  ],

  "rights-automated-decision": [
    { id: "statement", label: "whether solely-automated decisions are made at all", basis: "law", probe: /automated (decision|processing)|\bprofiling\b|solely automated|algorithmic decision/i },
    { id: "logic", label: "the logic involved and what it means for you", basis: "law", probe: /logic|how (the|this) (decision|system|algorithm)|significance|consequences (for|of)/i },
    { id: "human", label: "how to get a human to review it", basis: "law", probe: /human (review|intervention|involvement)|reviewed by a person|contest|challenge (the|a) decision/i },
  ],

  "sensitive-data": [
    { id: "categories", label: "which sensitive categories you hold, or a statement that you hold none", basis: "law", probe: /sensitive (personal )?(data|information)|special categor|biometric|health (data|information)|racial|religio|sexual orientation|do not collect .{0,40}sensitive/i },
    { id: "condition", label: "what permits you to process them", basis: "law", probe: /explicit consent|separate consent|your consent|necessary for|we rely on/i },
  ],

  "childrens-data": [
    { id: "threshold", label: "the age threshold you apply", basis: "law", probe: /under the age of \d+|under \d+ years|aged? \d+ (and|or) (over|above)|minors? under|\bunder 1[3-8]\b/i },
    { id: "parental", label: "how parental consent or school authority is handled", basis: "law", probe: /parent|guardian|school|educational institution|COPPA|FERPA/i },
    { id: "route", label: "what a parent should do if you hold a child's data wrongly", basis: "practice", probe: /contact us .{0,60}(child|delete)|we will delete|believe .{0,40}(child|minor)/i },
  ],

  "cross-border-transfer": [
    { id: "disclosed", label: "that data leaves the jurisdiction, and roughly where it goes", basis: "law", probe: /transfer|outside (the|your)|international|other countr|united states|stored .{0,30}(in|outside)|servers? (in|located)/i },
    { id: "mechanism", label: "the safeguard relied on for the transfer", basis: "law", probe: /standard contractual clauses|\bSCCs?\b|adequacy|data privacy framework|\bDPF\b|privacy shield|binding corporate rules|your consent|derogation/i },
    { id: "copy", label: "how to obtain a copy of the safeguards", basis: "practice", probe: /request a copy|copy of (the|our|these) (safeguard|clause|mechanism)|available on request/i },
  ],

  "dpo-representative": [
    { id: "named", label: "a named person or defined role", basis: "law", probe: /data protection officer|privacy officer|chief privacy|\bDPO\b|person responsible for/i },
    { id: "contact", label: "their contact details", basis: "law", probe: /@|postal address|write to us at|contact (them|us) at/i },
    { id: "representative", label: "a local representative, where you operate from outside the jurisdiction", basis: "law", probe: /representative|article 27|art\.? ?27/i },
  ],

  "data-localization": [
    { id: "where", label: "where data is physically stored", basis: "practice", probe: /stored? (in|within|on)|data cent(er|re)|servers? (in|located|that are)|hosted (in|by)/i },
  ],
};

/**
 * Check a policy for each element of a requirement.
 *
 * `located` sentences carry their section, so a hit can say WHERE it was found
 * and a miss can be honest that it was not found anywhere.
 */
export function checkElements(requirementId, locatedSentences) {
  const defs = elements[requirementId];
  if (!defs) return [];

  return defs.map((el) => {
    const hit = locatedSentences.find((s) => el.probe.test(s.text));
    return {
      id: el.id,
      label: el.label,
      basis: el.basis ?? "practice",
      found: Boolean(hit),
      section: hit?.section ?? null,
    };
  });
}
