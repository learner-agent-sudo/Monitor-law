// ---------------------------------------------------------------------------
// What the 0-3 scores actually mean.
//
// WHY THIS EXISTS
//
// Every gap in this catalog is produced by subtracting one score from another,
// and until now the scale was four adjectives — Not addressed, Limited,
// Moderate, Comprehensive — with nothing saying what separates Moderate from
// Comprehensive. A reader could disagree with a number only by feel, which is
// not disagreement, and the scores were doing more work than any other data in
// the system while being the least defined.
//
// The rule that exposed it was one of mine. scripts/check-gap-traces.mjs lets a
// cell say "the constraint is really in that row instead" only where that row
// scores 2 or more — a claim about where a duty becomes real, hard-coded in a
// check while the scale it referred to was undefined anywhere. BINDING_FLOOR
// below is now that threshold, exported once and imported by the check, so the
// rule and its published meaning cannot drift apart.
//
// HOW THE LEVELS ARE DRAWN
//
// Each level is a QUESTION about the text, not a judgement about the law. The
// 1/2 boundary asks whether the instrument imposes the duty at all; the 2/3
// boundary asks whether it attaches the machinery that makes a duty operational
// — triggers, deadlines, prescribed mechanisms, consequences. Both are things a
// reader can check against a provision and argue with.
// ---------------------------------------------------------------------------

/**
 * The level at which an instrument genuinely constrains conduct.
 *
 * Below this a duty is indirect, non-binding, or dormant. At or above it the
 * text imposes something. Used by scripts/check-gap-traces.mjs to police the
 * strong form of a cross-reference.
 */
export const BINDING_FLOOR = 2;

export const LEVELS = [
  {
    level: 0,
    label: "Not addressed",
    question: "Does any provision in the ingested text impose this?",
    means:
      "No provision was found. Every cell at this level carries a search trace recording how many provisions were read, which terms were tried, and which of them appear nowhere in the instrument.",
    notMeans:
      "It does NOT mean the reader is free of the obligation. It may sit in a sectoral statute, in another jurisdiction's law, in regulator guidance or in a contract — none of which this catalog holds. The instrument may also constrain the same ground through a different requirement, and where it does the row says which one to read.",
    example: {
      lawId: "ccpa",
      requirementId: "cross-border-transfer",
      why: "Every specific term was absent across all 27 ingested sections — no adequacy concept, no contractual-safeguard mechanism, no 'cross-border'. California regulates what a business may do with personal information, not where it goes.",
    },
  },
  {
    level: 1,
    label: "Limited",
    question: "Is the ground touched, but not imposed by the text?",
    means:
      "The obligation arrives indirectly, or not as law at all: through a general principle rather than a specific duty, through an exemption rather than a rule, through a regulator's published view, or through a provision that was enacted and never brought into force.",
    notMeans:
      "It does NOT mean the obligation can be ignored. A regulator's expectation is often decisive in practice. It is simply not the statute, and a regulator can revise its own view without any law changing — which is why these mappings are tagged as guidance and carry no statutory quote.",
    example: {
      lawId: "pdpo",
      requirementId: "breach-notification",
      why: "The PCPD recommends notifying it of a breach and the Ordinance requires nothing: no provision names a trigger, a deadline or a recipient. DPP4's duty to prevent a breach is binding; reporting one is not.",
    },
  },
  {
    level: 2,
    label: "Moderate",
    question:
      "Does the text impose a duty with real content — while stopping short of the fullest form?",
    means:
      "A binding obligation that reaches actual conduct, but narrower than the strictest version in the catalog: fewer actors caught, fewer conditions attached, or the method left to the organisation. This is the first level at which an instrument genuinely constrains, which is why a cell may claim the ground is covered by a neighbouring requirement only when that requirement scores here or above.",
    notMeans:
      "It does NOT mean weaker enforcement. A duty scored 2 can carry the same penalties as one scored 3; the scale measures what the text specifies, not what it costs to breach.",
    example: {
      lawId: "pipeda",
      requirementId: "breach-notification",
      why: "Binding and specific — an organisation 'shall report to the Commissioner' where a breach creates a real risk of significant harm, and must keep records of every breach. What it lacks against the strictest form is a fixed deadline: the report is due as soon as feasible rather than within a stated number of hours.",
    },
  },
  {
    level: 3,
    label: "Comprehensive",
    question: "Does the duty arrive with the machinery that makes it operational?",
    means:
      "A binding obligation plus its apparatus: a defined trigger and threshold, a deadline, a prescribed mechanism or recipient, and specific consequences. Everything needed to tell an organisation not just what to do but when, how, and to whom.",
    notMeans:
      "It does NOT mean the instrument is the best, and it is the ceiling of this scale rather than of the law. The requirement list is largely the GDPR's own obligation set, so the GDPR reaches 3 almost everywhere by construction — a 3 is a statement about how much the text specifies, never a verdict on the regime.",
    example: {
      lawId: "gdpr",
      requirementId: "breach-notification",
      why: "The same duty as PIPEDA's with the apparatus attached: notification to the supervisory authority 'not later than 72 hours after having become aware of it', a risk threshold deciding when individuals must be told as well, and prescribed content for the notification.",
    },
  },
];

export const LEVEL_BY_N = Object.fromEntries(LEVELS.map((l) => [l.level, l]));

/**
 * The ladder worth reading first.
 *
 * Three levels of the SAME obligation across three instruments teaches the
 * scale in a way four abstract definitions cannot: Hong Kong recommends
 * notifying, Canada requires it, the EU requires it within 72 hours.
 */
export const WORKED_LADDER = {
  requirementId: "breach-notification",
  levels: [1, 2, 3],
  note: "No instrument in the catalog scores 0 on breach notification, so the nil example is drawn from elsewhere.",
};
