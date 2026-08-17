// ---------------------------------------------------------------------------
// Remediation — what to actually DO about each gap, and on what basis.
//
// Every entry answers two questions in a fixed order:
//
//   steps      What to change in the organisation. ALWAYS comes first.
//   clause     Draft wording for the policy, to be published only AFTER the
//              practice is true.
//
// THE BASIS TAG IS THE POINT OF THIS FILE.
//
// An earlier version presented all of this as one undifferentiated list of
// things to fix. That silently mixed three very different claims: what the
// statute demands, what a regulator recommends, and what I think is a good
// idea. A reader cannot agree or disagree with advice whose source is hidden,
// and telling someone the law requires a purposes-and-legal-basis table when
// their law has no concept of a legal basis is simply wrong. So every step and
// every draft clause carries one of:
//
//   "law"       This law imposes it. `cite` names the provision — and where it
//               is a DIFFERENT provision from the one quoted in the finding,
//               naming it is the whole value, because that is exactly the link
//               the reader cannot otherwise see.
//   "guidance"  A regulator recommends it. Not binding. `cite` names the source.
//   "practice"  My recommendation. The law is silent. Decline it freely.
//
// Tags are assigned conservatively: "law" only where the duty is the statute's
// own, never for my choice of HOW to discharge it. A form design, an internal
// deadline, a table layout — those are "practice" even when the underlying duty
// is mandatory. The obligation itself is shown separately at the top of each
// finding, with its own citation and quote.
//
// Where the shape of a duty genuinely differs between laws, `byLaw` replaces
// the generic entry rather than relabelling it. See "lawful-basis": three of
// the seven laws in this catalog have no enumerated-basis regime at all.
//
// Every citation below was checked against the text in corpus/ before being
// written down. Draft clauses use [SQUARE BRACKET] blanks for every fact the
// organisation must supply — a clause that reads cleanly without being filled
// in is one someone can paste while the underlying practice does not exist.
//
// These are drafting starting points, not legal advice.
// ---------------------------------------------------------------------------

/** Basis vocabulary, exported so the UI and the CLI label things identically. */
export const BASIS = {
  law: {
    id: "law",
    label: "Required by law",
    blurb: "This law imposes it. The provision is named so you can go and read it.",
  },
  guidance: {
    id: "guidance",
    label: "Regulator guidance",
    blurb: "A regulator recommends it. Persuasive, not binding — you may decline it with reasons.",
  },
  practice: {
    id: "practice",
    label: "Our recommendation",
    blurb: "Not required by this law. Our suggestion for how to discharge the duty — disagree freely.",
  },
};

/**
 * Law-specific notes, keyed by lawId. Complete sentences that say which blank
 * to fill and with what.
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

// ---------------------------------------------------------------------------
// "lawful-basis" diverges more than any other requirement in the taxonomy, so
// it is written per law rather than generically. Only three of the seven laws
// have an enumerated menu of bases at all; presenting the GDPR's Art. 6 table
// to a PIPEDA reader states a rule that does not exist in their law.
//
// Verified in corpus/:
//   GDPR/UK   Art. 6 enumerated bases; Art. 13(1)(c) requires disclosing "the
//             purposes of the processing ... as well as the legal basis".
//   PIPL      Art. 13 enumerated conditions; Art. 6 purpose must be explicit
//             and reasonable; Art. 17 tells you what to disclose — and the
//             legal basis is NOT on that list.
//   PIPEDA    Sch.1 4.2 purposes identified at or before collection, 4.2.1
//             documented; 4.3 consent; s.5(3) reasonable person. No basis menu.
//   Québec    s.4 "must determine the purposes for collecting the information
//             before doing so." No basis menu.
//   PDPO      DPP1(1)(a) lawful purpose directly related to a function or
//             activity; DPP1(3) what to tell the data subject. No basis menu.
//   CCPA      §1798.100(a) notice at or before collection of categories,
//             purposes, sale/sharing and retention. No basis regime at all.
// ---------------------------------------------------------------------------

const BASIS_TABLE_CLAUSE = `**Why we process your personal data**

| What we do | Why | Our lawful basis |
| --- | --- | --- |
| [PURPOSE, e.g. providing the service to you] | [PLAIN-LANGUAGE REASON] | [Performance of a contract] |
| [PURPOSE, e.g. service emails] | [REASON] | [Legitimate interests — see below] |
| [PURPOSE, e.g. marketing] | [REASON] | [Consent] |
| [PURPOSE, e.g. tax records] | [REASON] | [Legal obligation] |

Where we rely on legitimate interests, those interests are [DESCRIBE], and we have assessed that this does not override your rights.`;

const PURPOSE_TABLE_CLAUSE = `**What we collect, why, and how long we keep it**

| What we collect | Why we need it | How we are permitted to | How long we keep it |
| --- | --- | --- | --- |
| [CATEGORY] | [PLAIN-LANGUAGE PURPOSE] | [Your consent / EXCEPTION RELIED ON] | [RETENTION PERIOD] |
| [CATEGORY] | [PURPOSE] | [Your consent / EXCEPTION] | [RETENTION PERIOD] |

We do not use your information for any other purpose without identifying that purpose to you first.`;

const LAWFUL_BASIS_BY_LAW = {
  gdpr: {
    steps: [
      {
        text: "List every distinct purpose you process personal data for — not broad categories like 'to run our business', but real activities.",
        basis: "law",
        cite: "Art. 5(1)(b) — purposes must be specified and explicit",
      },
      {
        text: "Assign one of the six lawful bases to each purpose and record why it fits. Where you rely on legitimate interests, carry out the balancing assessment and keep it.",
        basis: "law",
        cite: "Art. 6(1)",
      },
      {
        text: "Sense-check each basis: consent people cannot refuse without losing the service is not freely given, and 'necessary for a contract' does not stretch to analytics.",
        basis: "practice",
      },
    ],
    clause: {
      text: BASIS_TABLE_CLAUSE,
      basis: "law",
      cite: "Art. 13(1)(c) — the legal basis must be disclosed, not just the purpose",
    },
    warning:
      "Fill in real purposes. A copied example table is worse than none — under Art. 13(1)(c) the disclosed basis is a representation, and a wrong one is a misstatement rather than a gap.",
  },

  "uk-gdpr": {
    steps: [
      {
        text: "List every distinct purpose you process personal data for — not broad categories like 'to run our business', but real activities.",
        basis: "law",
        cite: "Art. 5(1)(b) UK GDPR",
      },
      {
        text: "Assign one of the six lawful bases to each purpose and record why it fits. Where you rely on legitimate interests, carry out the balancing assessment and keep it.",
        basis: "law",
        cite: "Art. 6(1) UK GDPR",
      },
      {
        text: "Sense-check each basis: consent people cannot refuse without losing the service is not freely given, and 'necessary for a contract' does not stretch to analytics.",
        basis: "practice",
      },
    ],
    clause: {
      text: BASIS_TABLE_CLAUSE,
      basis: "law",
      cite: "Art. 13(1)(c) UK GDPR",
    },
    warning:
      "Fill in real purposes. A copied example table is worse than none — the disclosed basis is a representation, and a wrong one is a misstatement rather than a gap.",
  },

  pipl: {
    steps: [
      {
        text: "Give each processing activity an explicit and reasonable purpose, and limit collection to the minimum needed for it.",
        basis: "law",
        cite: "Art. 6",
      },
      {
        text: "Confirm one of the Art. 13 conditions actually applies to each activity — consent, contract necessity, a statutory duty, an emergency, news reporting in the public interest, or information the person made public themselves.",
        basis: "law",
        cite: "Art. 13",
      },
      {
        text: "Before you process, tell people the purpose, the method, the categories involved and the retention period, in clear and accurate language.",
        basis: "law",
        cite: "Art. 17",
      },
    ],
    clause: {
      text: PURPOSE_TABLE_CLAUSE,
      basis: "law",
      cite: "Art. 17 — purpose, method, categories and retention must be disclosed",
    },
    warning:
      "Do not copy a GDPR-style 'legal basis' column into a PIPL notice. Art. 17 asks for purpose, method, categories and retention; the Art. 13 condition is something you must have, not something the article requires you to publish.",
  },

  pipeda: {
    steps: [
      {
        text: "Identify the purposes for collecting personal information at or before the point of collection, and document them.",
        basis: "law",
        cite: "Sch.1 4.2 and 4.2.1 — not the s.5(3) text quoted above",
      },
      {
        text: "Obtain consent for each identified purpose, or establish which s.7 exception you are relying on. A new purpose needs a new identification, and consent, before you use the data for it.",
        basis: "law",
        cite: "Sch.1 4.3; 4.2.4; s.7",
      },
      {
        text: "Sense-check the whole set against the reasonable-person test: purposes a reasonable person would not consider appropriate are not saved by consent.",
        basis: "law",
        cite: "s.5(3) — the provision quoted above",
      },
      {
        text: "Do not publish a GDPR-style table of 'lawful bases'. PIPEDA has no enumerated menu of bases — consent is the general rule, with statutory exceptions — and importing that vocabulary misdescribes your own compliance position.",
        basis: "practice",
      },
    ],
    clause: {
      text: PURPOSE_TABLE_CLAUSE,
      basis: "practice",
      cite: null,
    },
    clauseNote:
      "Identifying and documenting your purposes is required (Sch.1 4.2, 4.2.1), and making your practices readily available is required (Sch.1 4.8 — Openness). The table below is only one way to do that; the format is our suggestion, not the statute's.",
  },

  "quebec-law25": {
    steps: [
      {
        text: "Determine the purposes for collecting the information BEFORE you collect it, and make sure the reason is serious and legitimate.",
        basis: "law",
        cite: "s.4 — determination must precede collection",
      },
      {
        text: "Obtain consent for each purpose, or identify the statutory exception you rely on. Consent must be clear, free and informed, and given for specific purposes.",
        basis: "law",
        cite: "s.12–14 — the provisions quoted above",
      },
      {
        text: "Do not import the GDPR's menu of six lawful bases. Québec works on determined purposes plus consent or a statutory exception, and borrowing the wrong vocabulary obscures which exception you are actually relying on.",
        basis: "practice",
      },
    ],
    clause: { text: PURPOSE_TABLE_CLAUSE, basis: "practice", cite: null },
    clauseNote:
      "Determining purposes before collection is required (s.4). Publishing them as a table is our suggestion for how to show it.",
  },

  pdpo: {
    steps: [
      {
        text: "Check that each purpose is lawful AND directly related to a function or activity you actually carry on. A purpose that is lawful but unrelated to your business fails DPP1.",
        basis: "law",
        cite: "DPP1(1)(a)",
      },
      {
        text: "Confirm the data you collect is necessary for that purpose and not excessive.",
        basis: "law",
        cite: "DPP1(1)(b)–(c)",
      },
      {
        text: "On or before collection, tell the data subject the purpose and the classes of person the data may be transferred to — this is the Personal Information Collection Statement, and it is separate from your privacy policy.",
        basis: "law",
        cite: "DPP1(3)",
      },
      {
        text: "Do not publish a menu of 'lawful bases'. The PDPO has no such concept — the test is lawful-and-directly-related, not selection from a list.",
        basis: "practice",
      },
    ],
    clause: { text: PURPOSE_TABLE_CLAUSE, basis: "practice", cite: null },
    clauseNote:
      "What the PDPO actually requires here is a Personal Information Collection Statement at the point of collection (DPP1(3)), not a section of your general privacy policy. The table below helps you work out what belongs in the PICS.",
  },

  ccpa: {
    steps: [
      {
        text: "At or before the point of collection, tell consumers the categories of personal information you collect, the purposes for each, and whether it is sold or shared.",
        basis: "law",
        cite: "§1798.100(a)(1)",
      },
      {
        text: "State how long you keep each category, or the criteria you use to decide — and do not keep it longer than reasonably necessary for the disclosed purpose.",
        basis: "law",
        cite: "§1798.100(a)(3)",
      },
      {
        text: "Do not add a 'lawful basis' section. California has no such requirement — the CCPA controls purposes, notice and retention, not grounds for processing. Adding one imports a European framework you are not being measured against.",
        basis: "practice",
      },
    ],
    clause: {
      text: `**What we collect, why, and how long we keep it**

| Category of personal information | Purpose we use it for | Sold or shared? | How long we keep it |
| --- | --- | --- | --- |
| [CATEGORY] | [PURPOSE] | [Yes / No] | [RETENTION PERIOD OR CRITERIA] |
| [CATEGORY] | [PURPOSE] | [Yes / No] | [RETENTION PERIOD OR CRITERIA] |

We do not collect additional categories, or use what we have collected for incompatible purposes, without giving you notice first.`,
      basis: "law",
      cite: "§1798.100(a)(1) and (a)(3)",
    },
  },
};

export const remediation = {
  "dpo-representative": {
    steps: [
      {
        text: "Decide whether appointment is actually mandatory for you: broadly, if you are a public body, or your core activities involve large-scale systematic monitoring or large-scale special-category data. If you are outside the jurisdiction but target people inside it, a local representative is a separate and often overlooked requirement.",
        basis: "law",
      },
      {
        text: "Appoint a named individual, and give them the independence and reporting line the law expects along with the time to do the job. A shared inbox may serve as the contact route, but it cannot be the appointee.",
        basis: "law",
      },
      {
        text: "Publish their contact details and, where the law requires it, notify the regulator of the appointment.",
        basis: "law",
      },
    ],
    clause: {
      text: `**Data Protection Officer / Privacy Contact**

We have appointed [NAME OR ROLE TITLE] as our [Data Protection Officer / person responsible for the protection of personal information].

You can contact them about anything in this policy, or to exercise any of your rights, at:
[EMAIL ADDRESS]
[POSTAL ADDRESS]

[If applicable:] For individuals in [JURISDICTION], our representative is [REPRESENTATIVE NAME AND ADDRESS].`,
      basis: "law",
    },
    warning:
      "Do not publish this naming a generic legal or support inbox. A shared address is not an appointment, and stating one where no appointment exists is worse than saying nothing.",
    lawNotes: {
      gdpr: "Non-EU controllers targeting EU individuals usually need an Art. 27 representative in addition to any DPO.",
      pipeda: "PIPEDA requires a designated accountable individual (Sch.1 4.1), which is a lighter obligation than a GDPR DPO.",
    },
    byLaw: {
      pdpo: {
        steps: [
          {
            text: "Hong Kong does not require a data protection officer. The PCPD recommends appointing one as part of a Privacy Management Programme, and most organisations of any size should — but you can decline this with reasons.",
            basis: "guidance",
            cite: "PCPD, Privacy Management Programme: A Best Practice Guide",
          },
          {
            text: "If you do appoint one, name a person rather than an inbox and give them a reporting line to senior management, so the appointment means something operationally.",
            basis: "practice",
          },
        ],
        clause: {
          text: `**Privacy contact**

[NAME OR ROLE TITLE] is responsible for personal data protection at our organisation. You can contact them about anything in this policy, or to exercise your rights, at [EMAIL ADDRESS] / [POSTAL ADDRESS].`,
          basis: "practice",
        },
      },
      ccpa: {
        steps: [
          {
            text: "California imposes no privacy-officer requirement at all. Nothing needs to change for CCPA purposes.",
            basis: "practice",
          },
          {
            text: "You still need a working route for consumers to submit rights requests, and that is a separate CCPA obligation — check it under the rights findings rather than here.",
            basis: "practice",
          },
        ],
        clause: null,
        clauseNote:
          "No wording is required. Appointing and naming a privacy contact is good governance, but the CCPA does not ask for it and this tool will not report its absence as a gap.",
      },
    },
  },

  "lawful-basis": {
    // Every law gets its own entry; see LAWFUL_BASIS_BY_LAW above for why.
    steps: [
      {
        text: "List every distinct purpose you process personal data for — not broad categories like 'to run our business', but real activities.",
        basis: "law",
      },
      {
        text: "Establish what permits each purpose under the law that applies to you, and write down the reasoning.",
        basis: "law",
      },
    ],
    clause: { text: PURPOSE_TABLE_CLAUSE, basis: "practice" },
    byLaw: LAWFUL_BASIS_BY_LAW,
  },

  "rights-access": {
    steps: [
      {
        text: "Be able to produce the data itself, not just acknowledge the request — confirmation that you hold it, a copy, and information about how and why you use it.",
        basis: "law",
      },
      {
        text: "Build an intake route a member of the public can actually find and use, and make sure it reaches someone who will action it.",
        basis: "practice",
      },
      {
        text: "Decide how you verify identity without collecting more data than necessary, and write the rule down so it is applied consistently.",
        basis: "practice",
      },
      {
        text: "Set an internal deadline earlier than the statutory one, and track it. Statutory clocks run from receipt, not from when the request reaches the right team.",
        basis: "practice",
      },
    ],
    clause: {
      text: `**Your right to access your data**

You can ask us whether we hold personal data about you and request a copy of it, together with information about how and why we use it.

To make a request, contact [EMAIL / LINK TO REQUEST FORM]. We will respond within [STATUTORY PERIOD — e.g. one month / 30 days / 40 days], and will tell you if we need longer and why. We may ask you for information to confirm your identity.`,
      basis: "practice",
    },
    clauseNote:
      "The right itself is statutory, but no law in this catalog prescribes this wording. Publishing how to exercise it is what turns the right into something people can actually use.",
  },

  "rights-deletion": {
    steps: [
      {
        text: "Be able to actually delete on request — including from backups, logs, analytics and every processor you use.",
        basis: "law",
      },
      {
        text: "Write down the grounds on which you would refuse (legal retention, defence of claims) so refusals are consistent and explainable.",
        basis: "practice",
      },
      {
        text: "Make sure a deletion request propagates to processors rather than stopping at your own database.",
        basis: "practice",
      },
    ],
    clause: {
      text: `**Your right to deletion**

You can ask us to delete personal data we hold about you. We will do so unless we are required or permitted to keep it — for example [LEGAL RETENTION OBLIGATION, e.g. tax or accounting records] or to establish or defend legal claims.

Where we cannot delete everything, we will tell you what we are keeping and why. To make a request, contact [EMAIL / LINK].`,
      basis: "practice",
    },
  },

  "rights-correction": {
    steps: [
      {
        text: "Give people a route to have inaccurate or incomplete data corrected.",
        basis: "law",
      },
      {
        text: "Decide who resolves disputes about accuracy, and what happens when you disagree with the person.",
        basis: "practice",
      },
      {
        text: "Where you have shared the incorrect data onward, plan how you tell those recipients about the correction.",
        basis: "practice",
      },
    ],
    clause: {
      text: `**Your right to correct your data**

If personal data we hold about you is inaccurate or incomplete, you can ask us to correct or complete it. Contact [EMAIL / LINK] and tell us what is wrong.

We will correct it within [PERIOD], and where we have shared that data with others, we will notify them of the correction where practicable.`,
      basis: "practice",
    },
  },

  "rights-portability": {
    steps: [
      {
        text: "Be able to export the relevant data in a structured, commonly used, machine-readable format — CSV or JSON, not a PDF screenshot.",
        basis: "law",
      },
      {
        text: "Scope it correctly: portability generally covers data the person gave you, processed by consent or contract, and not your own inferences.",
        basis: "law",
      },
      {
        text: "Decide in advance whether direct transmission to another provider is technically feasible for you, so the answer is consistent.",
        basis: "practice",
      },
    ],
    clause: {
      text: `**Your right to data portability**

For personal data you provided to us that we process by consent or under our contract with you, you can ask to receive a copy in a structured, commonly used, machine-readable format, and to have it sent directly to another provider where technically feasible.

Contact [EMAIL / LINK]. We provide exports in [FORMAT, e.g. JSON / CSV].`,
      basis: "practice",
    },
  },

  "rights-optout-sale": {
    steps: [
      {
        text: "Establish whether you sell or share personal data as those terms are defined in the law — many advertising and analytics integrations count even where no money changes hands.",
        basis: "law",
      },
      {
        text: "Build the opt-out mechanism and honour browser signals such as Global Privacy Control where the law requires it.",
        basis: "law",
      },
      {
        text: "Keep a suppression list so an opt-out is not silently undone by the next upload.",
        basis: "practice",
      },
    ],
    clause: {
      text: `**Your choices about sharing and marketing**

[Choose the accurate statement:]
[We do not sell or share your personal data.]
[We share personal data with [CATEGORIES OF RECIPIENT] for [PURPOSE]. You can opt out at any time at [LINK], and we honour Global Privacy Control signals.]

You can opt out of marketing at any time using the unsubscribe link in any message, or by contacting [EMAIL].`,
      basis: "law",
    },
    warning:
      "'We do not sell your data' is a factual claim regulators do test. Confirm what your advertising and analytics tags actually transmit before publishing it.",
  },

  "rights-automated-decision": {
    steps: [
      {
        text: "Identify any decision made about people with no meaningful human involvement that has a legal or similarly significant effect — pricing, eligibility, moderation, fraud scoring.",
        basis: "law",
      },
      {
        text: "If you have any, build a route to human review and a way to explain the logic in plain terms.",
        basis: "law",
      },
      {
        text: "If you have none, say so anyway. Silence reads as concealment, and a one-line denial costs nothing.",
        basis: "practice",
      },
    ],
    clause: {
      text: `**Automated decision-making**

[If you do not do this:]
We do not make decisions about you based solely on automated processing that produce legal or similarly significant effects.

[If you do:]
We use automated processing to [DESCRIBE DECISION]. The logic involved is [PLAIN-LANGUAGE EXPLANATION], and the likely consequences are [DESCRIBE]. You can ask for a human to review any such decision, express your point of view, and contest it, by contacting [EMAIL].`,
      basis: "practice",
    },
  },

  "sensitive-data": {
    steps: [
      {
        text: "Audit whether you hold special-category data — health, biometrics, race, religion, sexual orientation, trade-union membership, and in some laws precise location or financial account data.",
        basis: "law",
      },
      {
        text: "If you do, identify the specific condition that permits it, which is usually explicit and separately-obtained consent rather than the consent bundled into your general terms.",
        basis: "law",
      },
      {
        text: "If you do not need it, stop collecting it. This is the cheapest fix available and it removes the obligation rather than discharging it.",
        basis: "practice",
      },
    ],
    clause: {
      text: `**Sensitive personal data**

[If applicable:]
We collect [CATEGORIES, e.g. health information] in order to [PURPOSE]. We rely on [your explicit consent / OTHER CONDITION] to do so, and we ask for that separately from any other permission. You can withdraw it at any time at [EMAIL / LINK].

[If not:]
We do not collect special categories of personal data such as health, biometric or racial or ethnic origin data.`,
      basis: "practice",
    },
  },

  "childrens-data": {
    steps: [
      {
        text: "Determine whether children realistically use your service, including through a school or employer rather than directly.",
        basis: "law",
      },
      {
        text: "Implement an age-assurance step proportionate to the risk, and a workable parental-consent route.",
        basis: "practice",
      },
      {
        text: "In education, check the sector rules that sit alongside privacy law — in the US that means FERPA and COPPA, which are not covered by this tool.",
        basis: "practice",
      },
    ],
    clause: {
      text: `**Children's personal data**

Our service is intended for users aged [AGE] and over.

Where we process the personal data of a child under [THRESHOLD], we obtain the consent of a parent or guardian [or, where we act for a school, rely on the school's authority under [FRAMEWORK]].

If you believe we hold a child's data without proper consent, contact [EMAIL] and we will delete it.`,
      basis: "practice",
    },
    lawNotes: CHILD_AGE,
  },

  "notice-transparency": {
    steps: [
      {
        text: "Tell people what you collect, why, who you share it with and how long you keep it. This is the one obligation a privacy policy exists to discharge.",
        basis: "law",
      },
      {
        text: "Build a data inventory first — you cannot describe accurately what you have not mapped.",
        basis: "practice",
      },
      {
        text: "Write for the reader, not the regulator: short sections, plain words, no defined-term thickets.",
        basis: "practice",
      },
      {
        text: "Give the policy a version and a last-updated date, and keep the old versions.",
        basis: "practice",
      },
    ],
    clause: {
      text: `**What we collect and why**

| Category of data | Examples | Why we collect it | How long we keep it |
| --- | --- | --- | --- |
| [Account data] | [name, email] | [to provide the service] | [RETENTION PERIOD] |
| [Usage data] | [pages viewed] | [to improve the service] | [RETENTION PERIOD] |

We share this with [CATEGORIES OF RECIPIENT] for [PURPOSES]. We do not use it for anything else without telling you first.

This policy was last updated on [DATE]. Previous versions are available at [LINK].`,
      basis: "practice",
    },
    clauseNote:
      "Disclosing this is required; presenting it as a table is our suggestion. Regulators care that a reader can find and understand it, not about the layout.",
  },

  consent: {
    steps: [
      {
        text: "Make consent freely given, specific and informed, and as easy to withdraw as it was to give.",
        basis: "law",
      },
      {
        text: "Look at the live interface, not the policy: no pre-ticked boxes, no consent bundled into terms acceptance, no cookie wall where consent is supposed to be free.",
        basis: "practice",
      },
      {
        text: "Keep a record of what each person consented to and when.",
        basis: "practice",
      },
    ],
    clause: {
      text: `**Consent and how to withdraw it**

Where we rely on your consent, we ask for it separately and in plain terms, and we record what you agreed to.

You can withdraw consent at any time at [LINK / EMAIL], and it is as easy to withdraw as it was to give. Withdrawing does not affect processing carried out before you withdrew.`,
      basis: "practice",
    },
    warning:
      "This is the obligation least provable from a policy. The wording is easy; the interface is what a regulator will look at.",
  },

  "cross-border-transfer": {
    steps: [
      {
        text: "Put a valid transfer mechanism in place for each route out of the jurisdiction: adequacy, standard contractual clauses, a certification such as the EU-U.S. Data Privacy Framework, or a derogation.",
        basis: "law",
      },
      {
        text: "Map where data actually goes — include processors, sub-processors, support teams and backups, which is where transfers usually hide.",
        basis: "practice",
      },
      {
        text: "Where required, complete a transfer impact assessment for the destination country.",
        basis: "law",
      },
    ],
    clause: {
      text: `**International transfers**

We transfer personal data to [COUNTRIES]. Where we do, we rely on [MECHANISM — e.g. an adequacy decision / standard contractual clauses / our certification under [FRAMEWORK]].

You can request a copy of the safeguards we use by contacting [EMAIL].`,
      basis: "law",
    },
    warning:
      "Naming a mechanism you have not implemented is a specific and easily checked misstatement. Confirm the contracts or certification exist first.",
  },

  "data-localization": {
    steps: [
      {
        text: "Confirm with your infrastructure team where data is physically stored, including backups and disaster-recovery copies.",
        basis: "practice",
      },
      {
        text: "Where the law requires local storage, verify it rather than assuming your cloud region setting is enough.",
        basis: "law",
      },
    ],
    clause: {
      text: `**Where your data is stored**

Personal data is stored in [COUNTRY / REGION], including backups. [Where required:] Data relating to individuals in [JURISDICTION] is stored within [JURISDICTION].`,
      basis: "practice",
    },
  },

  security: {
    steps: [
      {
        text: "Implement technical and organisational measures appropriate to the risk. The duty is to have the controls, not to describe them.",
        basis: "law",
      },
      {
        text: "Document them: encryption in transit and at rest, access control and review, logging, patching, backup testing. Undocumented controls are hard to evidence when a regulator asks.",
        basis: "practice",
      },
      {
        text: "Assign an owner and a review cycle.",
        basis: "practice",
      },
      {
        text: "Consider an external assessment or certification if you sell to enterprises or the public sector.",
        basis: "practice",
      },
    ],
    clause: {
      text: `**How we protect your data**

We use [SPECIFIC MEASURES — e.g. encryption in transit (TLS 1.2+) and at rest (AES-256), role-based access control with periodic review, logging and monitoring, and regular backup testing].

[If applicable:] We hold [CERTIFICATION, e.g. ISO 27001 / SOC 2 Type II], last assessed [DATE].`,
      basis: "practice",
    },
    warning:
      "Replace vague assurances. 'We take security seriously' and 'we use appropriate measures' satisfy no one and signal that nothing specific is in place.",
  },

  "breach-notification": {
    steps: [
      {
        text: "Write an incident-response plan naming who decides, who notifies, and within what deadline.",
        basis: "practice",
      },
      {
        text: "Start the clock at awareness, not at conclusion of the investigation.",
        basis: "law",
      },
      {
        text: "Keep a breach register covering every incident, including those you decide not to report.",
        basis: "law",
      },
      {
        text: "Rehearse it once. An untested plan fails on the day.",
        basis: "practice",
      },
    ],
    clause: {
      text: `**Data breaches**

[Optional in a public policy, but reassuring:]
If a breach of personal data occurs that is likely to result in a risk to you, we will notify [AUTHORITY] within [DEADLINE] and will tell you directly where the risk to you is high.`,
      basis: "practice",
    },
    clauseNote:
      "No law in this catalog requires you to describe your breach procedure in a public policy. The duty is to notify when it happens. This wording is optional.",
    lawNotes: BREACH,
  },

  "records-processing": {
    steps: [
      {
        text: "Build a record of processing activities: purposes, categories of data and people, recipients, transfers, retention, security measures.",
        basis: "law",
      },
      {
        text: "Make it a living document owned by someone, reviewed on a schedule.",
        basis: "practice",
      },
      {
        text: "Expect it to be the first thing a regulator asks for — and note that having it makes every other obligation easier to answer.",
        basis: "practice",
      },
    ],
    clause: null,
    clauseNote:
      "Nothing goes in the policy for this one. It is an internal register — build the document, do not describe it publicly.",
  },

  dpia: {
    steps: [
      {
        text: "Carry out an assessment before beginning processing likely to result in high risk. Doing it afterwards does not discharge the duty.",
        basis: "law",
      },
      {
        text: "Define what triggers one: new technology, large-scale monitoring, special-category data at scale, automated decisions with significant effects.",
        basis: "practice",
      },
      {
        text: "Use a consistent template, and keep completed assessments — some laws require retention for a set period.",
        basis: "practice",
      },
    ],
    clause: null,
    clauseNote:
      "Internal documentation. Do not add a policy clause claiming you conduct assessments unless you have a completed one to show.",
  },

  "vendor-processor": {
    steps: [
      {
        text: "Put a written agreement in place with every processor, containing the terms the law prescribes. The contract is the obligation.",
        basis: "law",
      },
      {
        text: "List every vendor that touches personal data — including analytics, support tooling and anything embedded in your product.",
        basis: "practice",
      },
      {
        text: "Check onward sub-processing is controlled, and keep the list current.",
        basis: "law",
      },
    ],
    clause: {
      text: `**Service providers**

We use third parties to help deliver our service, including [CATEGORIES, e.g. hosting, analytics, payment processing]. Each is bound by a written agreement that permits them to process personal data only on our instructions and requires them to protect it.

[If you maintain one:] Our current list of sub-processors is at [LINK].`,
      basis: "practice",
    },
    warning:
      "The contracts are the obligation; the clause only describes them. Do not publish this until the agreements are signed.",
  },

  "enforcement-penalties": {
    steps: [
      {
        text: "Nothing to do. This describes what a regulator may do to you, not an obligation you can discharge.",
        basis: "practice",
      },
    ],
    clause: null,
    clauseNote: "Not an obligation on your organisation. No action.",
  },
};

/**
 * Resolve a requirement's remediation for a specific law.
 *
 * `byLaw[lawId]` REPLACES the fields it defines rather than merging into them.
 * Merging step arrays would interleave generic advice with the law-specific
 * correction that exists precisely to contradict it.
 */
export function remediationFor(requirementId, lawId) {
  const base = remediation[requirementId];
  if (!base) return null;

  const override = base.byLaw?.[lawId] ?? {};
  const { byLaw, lawNotes, ...rest } = base;
  const merged = { ...rest, ...override };

  const steps = merged.steps ?? [];
  return {
    ...merged,
    steps,
    lawNote: lawNotes?.[lawId] ?? null,
    // Does anything here actually come from the statute? The UI says so plainly
    // when the answer is no, so a reader is never left to assume that a screen
    // full of imperatives carries legal force.
    requiredCount:
      steps.filter((s) => s.basis === "law").length + (merged.clause?.basis === "law" ? 1 : 0),
    totalCount: steps.length + (merged.clause ? 1 : 0),
  };
}
