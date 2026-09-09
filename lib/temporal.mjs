// ---------------------------------------------------------------------------
// Control 4 — temporal and version gating.
//
// "Is this required?" has a different correct answer depending on the date, and
// that is a bigger real-world error source than hallucination. A model that
// quotes the right article of the right instrument can still be wrong because
// the provision was not applicable yet, or was superseded last year.
//
// It matters far more for AI law than for privacy law. Every privacy instrument
// in this corpus is simply in force; the EU AI Act is in force but applies in
// tranches through 2026-2027, so a single instrument has several different
// correct answers at once depending on which obligation is asked about and
// when. Answering "does the AI Act require this?" without a date is not a
// slightly imprecise answer — it is unanswerable.
//
// Two separate axes, deliberately not collapsed:
//
//   AUTHORITY   what kind of thing is this? Binding text, regulator guidance,
//               or someone's commentary. Only "primary" may be the basis of a
//               stated requirement (Control 1).
//   LIFECYCLE   where is it in time? Proposed, adopted, applicable, amended,
//               repealed. Independent of authority: a proposed regulation is
//               primary-authority text that binds nobody yet.
//
// Conflating them is how trackers end up reporting a draft bill as a
// requirement.
// ---------------------------------------------------------------------------

/** What kind of source this is. Control 1's tagging, made explicit. */
export const AUTHORITY = {
  primary: {
    id: "primary",
    label: "Primary law",
    blurb: "The binding text itself, as published by the legislature or in the official gazette.",
    mayGroundRequirement: true,
  },
  guidance: {
    id: "guidance",
    label: "Regulator guidance",
    blurb:
      "Issued by the supervisory authority. Persuasive and often decisive in practice, but not the statute — and a regulator can change its own guidance without any law changing.",
    mayGroundRequirement: false,
  },
  secondary: {
    id: "secondary",
    label: "Commentary",
    blurb:
      "Law-firm alerts, trackers, press. Useful for spotting that something happened; never a basis for stating what the law requires.",
    mayGroundRequirement: false,
  },
};

/**
 * Where an instrument sits in time.
 *
 * "adopted" is the state that catches people out and the one AI law is full of:
 * the text is final, published and citable, and it requires nothing of anyone
 * yet. A tracker that shows adopted text next to in-force text without marking
 * the difference is actively misleading.
 */
export const LIFECYCLE = {
  proposed: {
    id: "proposed",
    label: "Proposed",
    binding: false,
    blurb: "A bill or draft. May change beyond recognition, or never pass. Binds nobody.",
  },
  adopted: {
    id: "adopted",
    label: "Adopted — not yet applicable",
    binding: false,
    blurb:
      "Final text, formally adopted, but its obligations have not started applying. Citable and worth preparing for; not yet enforceable.",
  },
  partial: {
    id: "partial",
    label: "Partly applicable",
    binding: true,
    blurb:
      "Some obligations apply and others do not, on staggered dates. Which ones depends entirely on today's date — see the phase table.",
  },
  "in-force": {
    id: "in-force",
    label: "In force",
    binding: true,
    blurb: "Fully applicable.",
  },
  amended: {
    id: "amended",
    label: "Amended",
    binding: true,
    blurb: "In force in a form different from the text ingested here. The consolidation date matters.",
  },
  repealed: {
    id: "repealed",
    label: "Repealed",
    binding: false,
    blurb: "No longer in force. Kept so historical answers remain explicable.",
  },
  lapsed: {
    id: "lapsed",
    label: "Lapsed",
    binding: false,
    blurb: "A bill that died — prorogation, dissolution, or simply never progressed.",
  },
};

const day = (d) => (d ? String(d).slice(0, 10) : null);

/**
 * The instrument's status on a given date, and which phase obligations have
 * started applying.
 *
 * `asOf` defaults to today. Every answer that uses this must PRINT the date it
 * used — an as-of answer without its as-of date is just an undated claim
 * wearing a mechanism.
 */
export function statusAsOf(version, asOf = new Date().toISOString().slice(0, 10)) {
  const on = day(asOf);

  if (!version) {
    return {
      asOf: on,
      status: null,
      binding: false,
      note: "No version metadata recorded for this instrument, so nothing can be said about whether it applied on this date.",
      applicablePhases: [],
      pendingPhases: [],
    };
  }

  // Terminal states ignore dates.
  if (version.status === "repealed" || version.status === "lapsed") {
    return {
      asOf: on,
      status: version.status,
      binding: false,
      note: LIFECYCLE[version.status].blurb,
      applicablePhases: [],
      pendingPhases: [],
    };
  }

  const phases = [...(version.phases ?? [])].sort((a, b) => day(a.from).localeCompare(day(b.from)));
  const applicable = phases.filter((p) => day(p.from) <= on);
  const pending = phases.filter((p) => day(p.from) > on);

  // Not yet applicable at all.
  const inForce = day(version.inForceDate);
  if (inForce && inForce > on) {
    return {
      asOf: on,
      status: "adopted",
      binding: false,
      note: `Adopted, but nothing applies until ${inForce}.`,
      applicablePhases: [],
      pendingPhases: phases,
    };
  }

  if (phases.length) {
    const status = pending.length ? "partial" : "in-force";
    return {
      asOf: on,
      status,
      binding: true,
      note: pending.length
        ? `${applicable.length} of ${phases.length} phases apply as at ${on}; the next starts ${day(pending[0].from)}.`
        : `All phases apply as at ${on}.`,
      applicablePhases: applicable,
      pendingPhases: pending,
    };
  }

  return {
    asOf: on,
    status: version.status ?? "in-force",
    binding: LIFECYCLE[version.status ?? "in-force"]?.binding ?? true,
    note: inForce ? `In force since ${inForce}.` : "In force.",
    applicablePhases: [],
    pendingPhases: [],
  };
}

/**
 * Does a given requirement apply on this date?
 *
 * Phases name the requirement ids they switch on. A requirement that no phase
 * mentions is treated as applying with the instrument as a whole — the common
 * case, and the right default for every privacy law in this corpus.
 */
export function requirementAppliesAsOf(version, requirementId, asOf) {
  const s = statusAsOf(version, asOf);
  if (!s.binding) return { applies: false, asOf: s.asOf, reason: s.note };

  const phases = version?.phases ?? [];
  const owning = phases.find((p) => (p.applies ?? []).includes(requirementId));
  if (!owning) return { applies: true, asOf: s.asOf, reason: s.note };

  const started = day(owning.from) <= s.asOf;
  return {
    applies: started,
    asOf: s.asOf,
    reason: started
      ? `Applies since ${day(owning.from)}${owning.note ? ` — ${owning.note}` : ""}.`
      : `Not yet: this obligation starts applying on ${day(owning.from)}${owning.note ? ` — ${owning.note}` : ""}.`,
  };
}

/** Whether a source may be cited as the basis of a stated requirement. */
export function mayGroundRequirement(authorityId) {
  return AUTHORITY[authorityId]?.mayGroundRequirement === true;
}
