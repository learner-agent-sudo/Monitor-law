// ---------------------------------------------------------------------------
// Remediation — what to actually DO about each gap.
//
// Every entry answers two questions in a fixed order:
//
//   practice   What to change in the organisation. ALWAYS comes first.
//   clause     Draft wording for the policy, to be published only AFTER the
//              practice is true.
//
// Draft clauses are written with [SQUARE BRACKET] blanks for every fact the
// organisation must supply — a name, an address, a retention period, a
// mechanism. That is deliberate: a clause that reads cleanly without being
// filled in is a clause someone can paste while the underlying practice does
// not exist, which converts a documentation gap into a false statement to
// regulators and users. The blanks force a decision.
//
// These are drafting starting points, not legal advice. Wording that satisfies
// one regulator may not satisfy another, and none of it has been reviewed by a
// lawyer.
// ---------------------------------------------------------------------------

/**
 * Law-specific notes, keyed by lawId.
 *
 * These are written as COMPLETE sentences that tell the reader which blank to
 * fill and with what. An earlier version stored bare values ("your lead
 * supervisory authority"), which rendered as a fragment under a heading and
 * told the reader nothing about where it went.
 */
const CHILD_AGE = {
  gdpr:
    "Where you offer an online service directly to a child, consent below 16 must come from the holder of parental responsibility — but a member state may lower that to a floor of 13. Check every member state you operate in and write the lowest applicable age into the clause.",
  "uk-gdpr": "The UK set the threshold at 13, so the clause should say 13 rather than 16.",
  ccpa:
    "Two thresholds, not one: selling or sharing the data of anyone under 16 needs opt-in consent, and under 13 that consent must come from a parent or guardian. Say both.",
  pipl:
    "Data of children under 14 is sensitive personal information under the PIPL. It needs separate parental consent and its own handling rules — not just a line in the general consent flow.",
  "quebec-law25":
    "Consent for a child under 14 must be given by the person having parental authority. Above 14 the minor can consent for themselves.",
  pipeda:
    "No statutory age. The OPC's position is that minors' data is sensitive and that meaningful consent from a young child is rarely achievable — set your own threshold and be able to justify how you arrived at it.",
  pdpo:
    "No statutory age. The PCPD issues guidance on children's data rather than a hard rule, so the threshold is a governance decision you should document.",
};

const BREACH = {
  gdpr:
    "Fill [AUTHORITY] with your lead supervisory authority and [DEADLINE] with 72 hours of becoming aware. Individuals are told directly only where the risk to them is high.",
  "uk-gdpr":
    "[AUTHORITY] is the Information Commissioner; [DEADLINE] is 72 hours of becoming aware. Same high-risk test as the GDPR for telling individuals.",
  pipeda:
    "[AUTHORITY] is the Office of the Privacy Commissioner of Canada. The trigger is a real risk of significant harm — and note that records of every breach must be kept, including the ones you decide not to report.",
  "quebec-law25":
    "[AUTHORITY] is the Commission d'accès à l'information. Québec calls these 'confidentiality incidents', the trigger is a risk of serious injury, and an incident register is mandatory.",
  ccpa:
    "California's breach-notification duty sits in a separate statute (§1798.82) that is not held in this repository — check it directly. The CCPA itself adds a private right of action for certain breaches rather than a notification deadline.",
  pipl:
    "Remedial measures come first, then notification. You may be excused from notifying individuals where those measures effectively avoid harm, but the authorities are told either way.",
  pdpo:
    "Hong Kong has no mandatory breach notification: the PCPD recommends it and reform is under discussion. Treat this as good practice — and remember another law may still impose a hard deadline on the same incident.",
};

export const remediation = {
  "dpo-representative": {
    practice: [
      "Decide whether appointment is actually mandatory for you: broadly, if you are a public body, or your core activities involve large-scale systematic monitoring or large-scale special-category data. If you are outside the jurisdiction but target people inside it, a local representative is a separate and often overlooked requirement.",
      "Appoint a NAMED person or a defined role — not a shared inbox. Give them the independence and reporting line the law expects, and make sure they have the time to do it.",
      "Publish their contact details and, where the law requires it, notify the regulator of the appointment.",
    ],
    clause: `**Data Protection Officer / Privacy Contact**

We have appointed [NAME OR ROLE TITLE] as our [Data Protection Officer / person responsible for the protection of personal information].

You can contact them about anything in this policy, or to exercise any of your rights, at:
[EMAIL ADDRESS]
[POSTAL ADDRESS]

[If applicable:] For individuals in [JURISDICTION], our representative is [REPRESENTATIVE NAME AND ADDRESS].`,
    warning:
      "Do not publish this naming a generic legal or support inbox. A shared address is not an appointment, and stating one where no appointment exists is worse than saying nothing.",
    lawNotes: {
      pdpo: "Hong Kong does not require a DPO — the PCPD recommends one as best practice. Treat this as good governance, not a legal obligation.",
      pipeda: "PIPEDA requires a designated accountable individual (Principle 4.1), which is a lighter obligation than a GDPR DPO.",
      ccpa: "California does not require a DPO at all.",
      gdpr: "Non-EU controllers targeting EU individuals usually need an Art. 27 representative in addition to any DPO.",
    },
  },

  "lawful-basis": {
    practice: [
      "List every distinct purpose you process personal data for — not broad categories like 'to run our business', but real activities.",
      "Assign exactly one lawful basis to each purpose, and write down why. If you rely on legitimate interests, do the balancing assessment and keep it.",
      "Check the basis actually fits: consent that people cannot refuse without losing the service is not consent, and 'contract' does not cover analytics.",
    ],
    clause: `**Why we process your personal data**

| What we do | Why | Our lawful basis |
| --- | --- | --- |
| [PURPOSE, e.g. providing the service to you] | [PLAIN-LANGUAGE REASON] | [Performance of a contract] |
| [PURPOSE, e.g. service emails] | [REASON] | [Legitimate interests — see below] |
| [PURPOSE, e.g. marketing] | [REASON] | [Consent] |
| [PURPOSE, e.g. tax records] | [REASON] | [Legal obligation] |

Where we rely on legitimate interests, those interests are [DESCRIBE], and we have assessed that this does not override your rights.`,
    warning:
      "This table is the single most common thing missing from policies of this kind. Fill in real purposes — a copied example table is worse than none.",
  },

  "rights-access": {
    practice: [
      "Build an intake route that a member of the public can actually find and use, and make sure it reaches someone who will action it.",
      "Decide how you verify identity without collecting more data than necessary.",
      "Set an internal deadline earlier than the statutory one, and track it.",
    ],
    clause: `**Your right to access your data**

You can ask us whether we hold personal data about you and request a copy of it, together with information about how and why we use it.

To make a request, contact [EMAIL / LINK TO REQUEST FORM]. We will respond within [STATUTORY PERIOD — e.g. one month / 30 days / 40 days], and will tell you if we need longer and why. We may ask you for information to confirm your identity.`,
  },

  "rights-deletion": {
    practice: [
      "Work out whether you can actually delete on request — including from backups, logs, analytics and every processor you use.",
      "Write down the grounds on which you would refuse (legal retention, defence of claims) so refusals are consistent.",
      "Make sure a deletion request propagates to processors rather than stopping at your own database.",
    ],
    clause: `**Your right to deletion**

You can ask us to delete personal data we hold about you. We will do so unless we are required or permitted to keep it — for example [LEGAL RETENTION OBLIGATION, e.g. tax or accounting records] or to establish or defend legal claims.

Where we cannot delete everything, we will tell you what we are keeping and why. To make a request, contact [EMAIL / LINK].`,
  },

  "rights-correction": {
    practice: [
      "Give people a route to correct data, and decide who resolves disputes about accuracy.",
      "Where you have shared the incorrect data onward, plan how you tell those recipients about the correction.",
    ],
    clause: `**Your right to correct your data**

If personal data we hold about you is inaccurate or incomplete, you can ask us to correct or complete it. Contact [EMAIL / LINK] and tell us what is wrong.

We will correct it within [PERIOD], and where we have shared that data with others, we will notify them of the correction where practicable.`,
  },

  "rights-portability": {
    practice: [
      "Confirm you can actually export the relevant data in a structured, machine-readable format — CSV or JSON, not a PDF screenshot.",
      "Scope it correctly: portability generally covers data the person gave you, processed by consent or contract, and not your own inferences.",
    ],
    clause: `**Your right to data portability**

For personal data you provided to us that we process by consent or under our contract with you, you can ask to receive a copy in a structured, commonly used, machine-readable format, and to have it sent directly to another provider where technically feasible.

Contact [EMAIL / LINK]. We provide exports in [FORMAT, e.g. JSON / CSV].`,
  },

  "rights-optout-sale": {
    practice: [
      "Establish whether you sell or share personal data as those terms are defined — many advertising and analytics integrations count even where no money changes hands.",
      "Build the opt-out mechanism and honour browser signals such as Global Privacy Control where required.",
      "Keep a suppression list so an opt-out is not silently undone by the next upload.",
    ],
    clause: `**Your choices about sharing and marketing**

[Choose the accurate statement:]
[We do not sell or share your personal data.]
[We share personal data with [CATEGORIES OF RECIPIENT] for [PURPOSE]. You can opt out at any time at [LINK], and we honour Global Privacy Control signals.]

You can opt out of marketing at any time using the unsubscribe link in any message, or by contacting [EMAIL].`,
    warning:
      "'We do not sell your data' is a factual claim regulators do test. Confirm what your advertising and analytics tags actually transmit before publishing it.",
  },

  "rights-automated-decision": {
    practice: [
      "Identify any decision made about people with no meaningful human involvement that has a legal or similarly significant effect — pricing, eligibility, moderation, fraud scoring.",
      "If you have any, build a route to human review and a way to explain the logic in plain terms.",
      "If you have none, say so — silence reads as concealment.",
    ],
    clause: `**Automated decision-making**

[If you do not do this:]
We do not make decisions about you based solely on automated processing that produce legal or similarly significant effects.

[If you do:]
We use automated processing to [DESCRIBE DECISION]. The logic involved is [PLAIN-LANGUAGE EXPLANATION], and the likely consequences are [DESCRIBE]. You can ask for a human to review any such decision, express your point of view, and contest it, by contacting [EMAIL].`,
  },

  "sensitive-data": {
    practice: [
      "Audit whether you hold special-category data — health, biometrics, race, religion, sexual orientation, trade-union membership, and in some laws precise location or financial account data.",
      "If you do, identify the specific condition that permits it, which is usually explicit consent, and make sure that consent is separate rather than bundled.",
      "If you do not need it, stop collecting it. This is the cheapest fix available.",
    ],
    clause: `**Sensitive personal data**

[If applicable:]
We collect [CATEGORIES, e.g. health information] in order to [PURPOSE]. We rely on [your explicit consent / OTHER CONDITION] to do so, and we ask for that separately from any other permission. You can withdraw it at any time at [EMAIL / LINK].

[If not:]
We do not collect special categories of personal data such as health, biometric or racial or ethnic origin data.`,
  },

  "childrens-data": {
    practice: [
      "Determine whether children realistically use your service, including through a school or employer rather than directly.",
      "Implement an age-assurance step proportionate to the risk, and a workable parental-consent route.",
      "In education, check the sector rules that sit alongside privacy law — in the US that means FERPA and COPPA, which are not covered by this tool.",
    ],
    clause: `**Children's personal data**

Our service is intended for users aged [AGE] and over.

Where we process the personal data of a child under [THRESHOLD], we obtain the consent of a parent or guardian [or, where we act for a school, rely on the school's authority under [FRAMEWORK]].

If you believe we hold a child's data without proper consent, contact [EMAIL] and we will delete it.`,
    lawNotes: CHILD_AGE,
  },

  "notice-transparency": {
    practice: [
      "Build a data inventory first — you cannot describe accurately what you have not mapped.",
      "Write for the reader, not the regulator: short sections, plain words, no defined-term thickets.",
      "Give the policy a version and a last-updated date, and keep the old versions.",
    ],
    clause: `**What we collect and why**

| Category of data | Examples | Why we collect it | How long we keep it |
| --- | --- | --- | --- |
| [Account data] | [name, email] | [to provide the service] | [RETENTION PERIOD] |
| [Usage data] | [pages viewed] | [to improve the service] | [RETENTION PERIOD] |

We share this with [CATEGORIES OF RECIPIENT] for [PURPOSES]. We do not use it for anything else without telling you first.

This policy was last updated on [DATE]. Previous versions are available at [LINK].`,
  },

  consent: {
    practice: [
      "Look at the live interface, not the policy: no pre-ticked boxes, no consent bundled into terms acceptance, no cookie wall where consent is supposed to be free.",
      "Make withdrawal exactly as easy as giving — if consent took one click, withdrawal must too.",
      "Keep a record of what each person consented to and when.",
    ],
    clause: `**Consent and how to withdraw it**

Where we rely on your consent, we ask for it separately and in plain terms, and we record what you agreed to.

You can withdraw consent at any time at [LINK / EMAIL], and it is as easy to withdraw as it was to give. Withdrawing does not affect processing carried out before you withdrew.`,
    warning:
      "This is the obligation least provable from a policy. The wording is easy; the interface is what a regulator will look at.",
  },

  "cross-border-transfer": {
    practice: [
      "Map where data actually goes — include processors, sub-processors, support teams and backups, which is where transfers usually hide.",
      "Choose and put in place a real mechanism for each route: adequacy, standard contractual clauses, a certification such as the EU-U.S. Data Privacy Framework, or a derogation.",
      "Where required, complete a transfer impact assessment for the destination country.",
    ],
    clause: `**International transfers**

We transfer personal data to [COUNTRIES]. Where we do, we rely on [MECHANISM — e.g. an adequacy decision / standard contractual clauses / our certification under [FRAMEWORK]].

You can request a copy of the safeguards we use by contacting [EMAIL].`,
    warning:
      "Naming a mechanism you have not implemented is a specific and easily checked misstatement. Confirm the contracts or certification exist first.",
  },

  "data-localization": {
    practice: [
      "Confirm with your infrastructure team where data is physically stored, including backups and disaster-recovery copies.",
      "Where the law requires local storage, verify it rather than assuming your cloud region setting is enough.",
    ],
    clause: `**Where your data is stored**

Personal data is stored in [COUNTRY / REGION], including backups. [Where required:] Data relating to individuals in [JURISDICTION] is stored within [JURISDICTION].`,
  },

  security: {
    practice: [
      "Implement and document the controls: encryption in transit and at rest, access control and review, logging, patching, backup testing.",
      "Assign an owner and a review cycle. Undocumented controls are hard to evidence when a regulator asks.",
      "Consider an external assessment or certification if you sell to enterprises or the public sector.",
    ],
    clause: `**How we protect your data**

We use [SPECIFIC MEASURES — e.g. encryption in transit (TLS 1.2+) and at rest (AES-256), role-based access control with periodic review, logging and monitoring, and regular backup testing].

[If applicable:] We hold [CERTIFICATION, e.g. ISO 27001 / SOC 2 Type II], last assessed [DATE].`,
    warning:
      "Replace vague assurances. 'We take security seriously' and 'we use appropriate measures' satisfy no one and signal that nothing specific is in place.",
  },

  "breach-notification": {
    practice: [
      "Write an incident-response plan naming who decides, who notifies, and within what deadline.",
      "Start the clock at awareness, not at conclusion of the investigation. Under the GDPR that gives you 72 hours.",
      "Keep a breach register covering every incident, including those you decide not to report.",
      "Rehearse it once. An untested plan fails on the day.",
    ],
    clause: `**Data breaches**

[Optional in a public policy, but reassuring:]
If a breach of personal data occurs that is likely to result in a risk to you, we will notify [AUTHORITY] within [DEADLINE] and will tell you directly where the risk to you is high.`,
    lawNotes: BREACH,
  },

  "records-processing": {
    practice: [
      "Build a record of processing activities: purposes, categories of data and people, recipients, transfers, retention, security measures.",
      "Make it a living document owned by someone, reviewed on a schedule.",
      "This is usually the first thing a regulator asks for, and it makes every other obligation easier to answer.",
    ],
    clause: null,
    clauseNote:
      "Nothing goes in the policy for this one. It is an internal register — build the document, do not describe it publicly.",
  },

  dpia: {
    practice: [
      "Define what triggers an assessment: new technology, large-scale monitoring, special-category data at scale, automated decisions with significant effects.",
      "Use a consistent template and complete it BEFORE the processing starts, which is the part most often missed.",
      "Keep completed assessments; some laws require retention for a set period.",
    ],
    clause: null,
    clauseNote:
      "Internal documentation. Do not add a policy clause claiming you conduct assessments unless you have a completed one to show.",
  },

  "vendor-processor": {
    practice: [
      "List every vendor that touches personal data — including analytics, support tooling and anything embedded in your product.",
      "Put a data processing agreement in place with each, containing the terms the law prescribes.",
      "Check onward sub-processing is controlled, and keep the list current.",
    ],
    clause: `**Service providers**

We use third parties to help deliver our service, including [CATEGORIES, e.g. hosting, analytics, payment processing]. Each is bound by a written agreement that permits them to process personal data only on our instructions and requires them to protect it.

[If you maintain one:] Our current list of sub-processors is at [LINK].`,
    warning:
      "The contracts are the obligation; the clause only describes them. Do not publish this until the agreements are signed.",
  },

  "enforcement-penalties": {
    practice: [
      "Nothing to do. This describes what a regulator may do to you, not an obligation you can discharge.",
    ],
    clause: null,
    clauseNote: "Not an obligation on your organisation. No action.",
  },
};

/** Merge in any law-specific note for a requirement. */
export function remediationFor(requirementId, lawId) {
  const r = remediation[requirementId];
  if (!r) return null;
  const note = r.lawNotes?.[lawId] ?? null;
  return { ...r, lawNote: note };
}
