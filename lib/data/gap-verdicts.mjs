// ---------------------------------------------------------------------------
// The judgement half of a search trace.
//
// lib/gap-search.mjs produces the mechanical half — provisions searched, terms
// tried, terms absent, nearest candidates with verbatim excerpts. That part is
// reproducible and a machine can check it. It still cannot say whether the
// candidates it found impose the obligation, because that is a reading, and a
// reading is what this file holds.
//
// The split is deliberate and the UI keeps it visible. A reader who distrusts
// the author can take the mechanical trace and reach their own conclusion from
// the same excerpts; a reader who only wants the answer reads the verdict. What
// nobody has to do any more is take a bare "0" on faith.
//
// RULES THESE ENTRIES LIVE UNDER, all enforced by scripts/check-gap-traces.mjs
//
//  1. Every cell that asserts an obligation is weak or absent WITHOUT quoting
//     the statute needs an entry here. There is no way to leave a blank.
//  2. `nearest` names the provisions the author says are the closest real
//     thing. Each must exist in the ingested text (Control 2) AND must have
//     been reached by the mechanical search. Naming a provision the search
//     never scored fails the build — either the vocabulary is deficient or the
//     claim is, and both are worth stopping for.
//  3. `nearest: []` is allowed only with `noNearest: true`, and only when the
//     search genuinely found nothing. The author may not shrug off evidence
//     that exists.
//  4. Any provision cited in the prose must exist in THAT law's index. Prose
//     cites only the instrument the entry is about: a section number from
//     another statute would resolve against the wrong index and read as
//     verified when it is not.
//  5. An entry may not exist for a cell that does carry a quote, so the two
//     layers cannot drift apart.
//  6. `handledBy` names a NEIGHBOURING requirement related to this cell. The
//     requirement must exist, this law must be mapped against it, and it must
//     score HIGHER than the cell making the reference — a pointer to an
//     equally empty row is false comfort, so the build rejects it.
//
//     Each pointer declares which of two very different things it is:
//
//       instead-of          the same ground IS constrained, by another route.
//                           The GDPR mandates no storage location but lets data
//                           leave the EEA only on Chapter V's conditions, so the
//                           0 understates the position. Requires the other row
//                           to score 2 or more: a real constraint, not a trace
//                           of one. This is the only kind that puts a mark next
//                           to the score in the comparison tables.
//       different-approach  related, and NOT equivalent. California's contract
//                           terms bind a recipient wherever it sits, which is
//                           how that regime works instead of constraining
//                           geography — useful to read next, but it would be
//                           wrong to let it imply California limits where data
//                           may live.
//
//     The default is different-approach, because it is the weaker claim.
//
// WHY `handledBy` AND `practicalEffect` EXIST
//
// A 0 is a statement about one row of a taxonomy, and a taxonomy slices a
// legal regime in a particular way. The GDPR has no provision requiring
// personal data to be stored in the Union, so its data-localization cell is
// honestly 0 — but Art. 44 permits a transfer out "only if" Chapter V's
// conditions are met, so in practice storing in the EEA is the one route that
// avoids the whole apparatus. Rendering that as a bare 0, identical to
// California's genuine nil, tells the reader the opposite of the truth.
//
// So a cell may now say where the constraint really sits and what the position
// amounts to in practice. The taxonomy stays honest; the reader stops being
// misled by it.
//
// WHAT A VERDICT MAY NOT DO
//
// It may not conclude that the reader is therefore free of the obligation.
// Absence from one instrument is not absence from the law: sectoral statutes,
// provincial rules, regulator guidance and contract all survive a 0 in this
// catalog, and several of these entries say where to look next.
// ---------------------------------------------------------------------------

/**
 * When these readings were last reviewed against the corpus.
 *
 * Verdicts make present-tense claims — "Bill C-27 lapsed", "s.33 has never
 * been commenced" — and a present-tense claim with no date is the failure mode
 * Control 4 exists to prevent. Shown next to every verdict in the UI.
 */
export const VERDICTS_REVIEWED = "2026-10-18";

export const GAP_VERDICTS = {
  // --- EU / UK -----------------------------------------------------------
  "gdpr/data-localization": {
    nearest: ["art-44", "art-45", "art-46"],
    verdict:
      "No provision requires personal data to be stored in the Union, and Art. 1 points the other way: the Regulation's object includes the free movement of personal data. But Chapter V is a prohibition subject to exceptions, not a permission — Art. 44 allows a transfer to a third country 'only if, subject to the other provisions of this Regulation, the conditions laid down in this Chapter are complied with'. So the choice is not whether data may leave, but what it costs to send it.",
    practicalEffect:
      "Keeping personal data in the EEA is the only route that engages none of this. Sending it out requires an Art. 45 adequacy decision for the destination or, failing that, Art. 46 safeguards — in practice the Commission's 'standard data protection clauses', the transfer addendum most processors present — layered on top of the Art. 28(3) processor terms every processor needs wherever it sits. Pricing export rather than forbidding it still pulls hard towards EEA storage, and a reader who takes the 0 in this row as 'the GDPR does not care where data lives' has read it wrongly.",
    handledBy: [
      {
        requirementId: "cross-border-transfer",
        kind: "instead-of",
        note: "Chapter V — the conditions that make export expensive rather than impossible.",
      },
      {
        requirementId: "vendor-processor",
        note: "Art. 28 — the processor terms a transfer addendum is built on.",
      },
    ],
  },
  "uk-gdpr/data-localization": {
    nearest: ["art-44", "art-45", "art-46"],
    verdict:
      "The retained Regulation keeps Chapter V's structure and adds nothing about where data must sit: Art. 44 permits a transfer only on the Chapter's conditions, and Arts. 45-46 set them. No provision requires storage in the United Kingdom, and the same caution applies as under the EU text — an export priced on conditions is not the same as no constraint on location.",
    practicalEffect:
      "Data held in the UK engages none of Chapter V. Exporting it needs adequacy regulations covering the destination or Art. 46 safeguards, on top of the Art. 28 processor terms. The practical pull towards keeping data in the UK is real even though no provision requires it.",
    elsewhere:
      "The machinery that replaced the Commission's role — the Secretary of State's adequacy regulations — sits in the Data Protection Act 2018, which this repository does not hold. A reader checking UK transfer rules needs that Act as well as this one.",
    handledBy: [
      {
        requirementId: "cross-border-transfer",
        kind: "instead-of",
        note: "Chapter V, as retained — the conditions a transfer out has to meet.",
      },
      { requirementId: "vendor-processor", note: "Art. 28 processor terms." },
    ],
  },

  // --- California --------------------------------------------------------
  "ccpa/dpo-representative": {
    nearest: ["sec-1798.130", "sec-1798.185"],
    verdict:
      "Neither 'data protection officer' nor 'privacy officer' appears anywhere in the ingested text, and no provision requires a business to designate anyone. The nearest figure runs in the opposite direction: §1798.130 and §1798.185 both deal with a consumer's authorised agent — someone appointed by the consumer to make requests against the business, not someone inside the business accountable for compliance.",
  },
  "ccpa/cross-border-transfer": {
    nearest: [],
    noNearest: true,
    verdict:
      "Every specific term was absent across all 27 ingested sections: no adequacy concept, no contractual-safeguard mechanism, no 'cross-border', no 'outside the territory'. The one provision reached by a broad term is §1798.199, which lets the Agency cooperate with privacy authorities in other states and countries — regulator coordination, not a restriction on transfers. The statute governs what a business may do with personal information and says nothing about geography.",
    practicalEffect:
      "This is a genuine nil, not an obligation wearing another name. Unlike the European instruments, which price export through Chapter V, California constrains a recipient by what it may do with the information rather than by where it is. A business may host Californians' data anywhere without any transfer formality.",
    handledBy: [
      {
        requirementId: "vendor-processor",
        note: "What a recipient may do with the information — the constraint California uses instead of a geographic one.",
      },
    ],
  },
  "ccpa/data-localization": {
    nearest: ["sec-1798.140"],
    verdict:
      "The single hit is in the §1798.140 definitions, where a contractor is barred from 'retaining, using, or disclosing the information outside of the direct business relationship' — 'outside' in a contractual sense, not a geographic one. No provision addresses where personal information may be stored.",
    handledBy: [
      {
        requirementId: "vendor-processor",
        note: "Contractual limits on a recipient, which apply the same whether the recipient is in California or not.",
      },
    ],
  },
  "ccpa/records-processing": {
    nearest: ["sec-1798.105"],
    verdict:
      "The statute imposes no record-keeping duty. The nearest provision grants a permission rather than an obligation: §1798.105 allows a business to 'maintain a confidential record of deletion requests' for the purpose of honouring them, and it covers that one request type.",
    elsewhere:
      "The 24-month retention duty asserted in this cell comes from the Agency's regulations at 11 CCR §7101, not from the Act. Those regulations are not in this corpus, which is why the mapping is tagged outside-corpus — the duty is real and this repository cannot evidence it.",
  },

  // --- Canada (federal) --------------------------------------------------
  "pipeda/rights-portability": {
    nearest: ["sch1-4.9", "s-10"],
    verdict:
      "Principle 4.9 gives access — on request an individual 'shall be informed of the existence, use, and disclosure of his or her personal information and shall be given access to that information'. Access is not portability: nothing specifies a format, and nothing obliges an organisation to send the information anywhere. The Act's only format duty is s.10, and it is narrow — an alternative format for an individual with a sensory disability, where that version exists or converting it is reasonable and necessary.",
    elsewhere:
      "A portability right was proposed in Bill C-27, which died when Parliament was prorogued in January 2025. A 0 here is current law, not a drafting oversight.",
    handledBy: [
      {
        requirementId: "rights-access",
        note: "Access only — an individual can obtain their information, but not in any particular format and not sent anywhere.",
      },
    ],
  },
  "pipeda/rights-automated-decision": {
    nearest: [],
    noNearest: true,
    verdict:
      "Nothing to show, and that is the finding. Across 120 indexed provisions the Act does not contain the string 'automat' at all — nor 'profil', nor any of the seven terms searched. This is the strongest form of absence a trace can record: not a near-miss judged insufficient, but vocabulary that is simply not in the instrument.",
    elsewhere:
      "Automated decision-making rules were proposed in Bill C-27, alongside AIDA; both lapsed on prorogation in January 2025. Sector regulators and the Québec regime address automated decisions where PIPEDA does not.",
  },
  "pipeda/childrens-data": {
    nearest: ["sch1-4.3"],
    verdict:
      "The Act mentions minors once, and not as a protected class: Principle 4.3 observes that seeking consent 'may be impossible or inappropriate when the individual is a minor, seriously ill, or mentally incapacitated' — an exception to the consent requirement, not a heightened duty. There is no age threshold, no parental-consent gate and no children's regime.",
    elsewhere:
      "The strictness 1 recorded for this cell rests on OPC guidance treating minors' information as sensitive and requiring heightened care. That is the regulator's position and it can change without any amendment to the Act — which is why the mapping is tagged guidance rather than statute.",
    handledBy: [
      {
        requirementId: "consent",
        note: "Minors fall under the general consent standard, with no age threshold of their own.",
      },
    ],
  },
  "pipeda/dpia": {
    nearest: [],
    noNearest: true,
    verdict:
      "None of the six terms appears in the Act: no 'impact assessment', no 'privacy impact', no 'prior consultation', no 'high risk'. No provision requires an assessment before a new initiative.",
    elsewhere:
      "The strictness 1 rests on the OPC's expectation of assessments for higher-risk initiatives. Worth noting for anyone operating in both: the Québec regime makes a privacy impact assessment a statutory duty, so a Canadian organisation can face a real obligation that PIPEDA itself never imposes.",
    handledBy: [
      {
        requirementId: "dpo-representative",
        note: "The accountability principle requires policies and procedures, which is where assessment practice is usually anchored — without requiring an assessment.",
      },
    ],
  },
  "pipeda/data-localization": {
    nearest: ["s-30"],
    verdict:
      "The only provision reached is s.30, a transitional rule about when this Part began to apply to organisations within a province — its 'outside the province' is about the Act's own scope, not about where data may be held. PIPEDA imposes no localisation duty; under the accountability principle an organisation stays responsible for information it transfers to a third party for processing, wherever that processing happens.",
    elsewhere:
      "Several provincial public-sector statutes do impose localisation, and British Columbia's and Nova Scotia's are the usual examples. None is in this corpus, so this cell speaks only for the federal Act.",
    practicalEffect:
      "Unlike the European instruments, PIPEDA attaches no formality to sending data abroad: there is no adequacy test and no mandated clauses. What travels with the data is accountability — the organisation remains answerable for it — so the control is contractual and continuous rather than geographic and up-front.",
    handledBy: [
      {
        requirementId: "vendor-processor",
        note: "Accountability for information handed to a third party for processing, wherever that processing happens.",
      },
      { requirementId: "cross-border-transfer", note: "How transfers themselves are treated." },
    ],
  },

  // --- Québec ------------------------------------------------------------
  "quebec-law25/data-localization": {
    nearest: ["s-17", "s-8"],
    verdict:
      "Section 17 is an export gate, not a localisation rule: before communicating personal information outside Québec an enterprise must conduct a privacy impact assessment, and may proceed only if the assessment establishes that the information 'would receive adequate protection'. That restricts sending data out under conditions; it does not require data to stay. Section 8 goes only to disclosure — the person concerned must be informed of the possibility that their information could be communicated outside Québec.",
    practicalEffect:
      "The same caution as under the GDPR applies, and more sharply: s.17 makes an assessment a precondition of every export, so keeping information in Québec is the cheapest path by a wide margin. A 0 in this row means no storage mandate, not an absence of pressure on where data sits.",
    handledBy: [
      {
        requirementId: "cross-border-transfer",
        kind: "instead-of",
        note: "Section 17's assessment gate, which every export has to pass.",
      },
    ],
  },

  // --- Hong Kong ---------------------------------------------------------
  "pdpo/rights-portability": {
    nearest: ["s-18", "s-19"],
    verdict:
      "Sections 18 and 19 create a data access request and oblige the data user to supply 'a copy of the data'. That is access in a form the data user selects; nothing requires a structured or machine-readable format, and nothing obliges transmission to another data user. 'Portability' does not appear in the Ordinance.",
    handledBy: [
      {
        requirementId: "rights-access",
        note: "Access only — a copy, in a form the data user chooses, delivered to the requestor rather than onward.",
      },
    ],
  },
  "pdpo/rights-automated-decision": {
    nearest: ["dpp-4", "s-2"],
    verdict:
      "The Ordinance acknowledges automated processing only in passing, and only as a mechanism. Section 2 defines processing to include amending data 'whether by automated means or otherwise', and DPP4 asks about security measures incorporated 'whether by automated means or otherwise' into equipment. Neither attaches any right to a decision reached that way: no profiling rules, no right to human review, no duty to explain the logic. 'Profiling' and 'algorithm' appear nowhere in the ingested text.",
  },
  "pdpo/sensitive-data": {
    nearest: ["s-59"],
    verdict:
      "There is no special category of sensitive data, and the Ordinance's one engagement with health information runs the other way: s.59 exempts personal data about the data subject's physical or mental health from DPP6 and s.18(1)(b), and from DPP3, where applying them would be likely to cause serious harm. That withdraws protection in defined circumstances rather than adding it. 'Sensitive personal data', 'biometric', 'racial or ethnic origin', 'political opinions', 'trade union' and 'genetic data' appear nowhere.",
    elsewhere:
      "Hong Kong reaches some of this ground differently — identity card numbers are governed by a PCPD code of practice issued under the Ordinance rather than by a sensitive-data category in the text itself.",
    practicalEffect:
      "Sensitivity is not ignored, it is simply not a category. DPP4 scales the safeguards owed to 'the kind of data and the harm that could result', so more sensitive data attracts more protection through the security duty rather than through a special regime with its own consent and processing rules.",
    handledBy: [
      {
        requirementId: "security",
        note: "DPP4 scales safeguards to the kind of data and the harm that could result.",
      },
    ],
  },
  "pdpo/childrens-data": {
    nearest: ["dpp-3", "s-2"],
    verdict:
      "There is a minor-specific mechanism, and it is narrow. DPP3(2) lets a 'relevant person' give the prescribed consent for using a minor's data for a new purpose, but only where the minor 'is incapable of understanding the new purpose and deciding whether to give the prescribed consent' and the relevant person reasonably believes the use is clearly in the minor's interest; s.2 defines that person as someone with parental responsibility. This is substitute consent for one decision, not a children's regime — there is no age of consent, no general parental-consent gate, and no heightened protection for minors' data as a class.",
    elsewhere:
      "The strictness 1 rests on PCPD guidance about minors' data, which is the regulator's position rather than the Ordinance's text.",
    handledBy: [
      {
        requirementId: "consent",
        note: "Minors are handled through the general consent rules, with substitute consent available in the narrow case above.",
      },
    ],
  },
  "pdpo/breach-notification": {
    nearest: ["dpp-4"],
    verdict:
      "DPP4 requires all practicable steps to protect personal data 'against unauthorized or accidental access, processing, erasure, loss or use' — a duty to prevent a breach, with nothing about reporting one once it happens. No provision requires notifying the Commissioner or affected data subjects, and no timetable or harm threshold appears anywhere. The second provision the search reached, s.55, uses 'breach' in the sense of breach of employment terms.",
    elsewhere:
      "Notification in Hong Kong runs on the PCPD's voluntary arrangement, and mandatory notification has been under discussion in the reform of the Ordinance for some years. An organisation treating notification as optional is following the text and taking a risk on the guidance.",
    handledBy: [
      {
        requirementId: "security",
        note: "DPP4 — the duty to prevent a breach, which is binding even though reporting one is not.",
      },
    ],
  },
  "pdpo/dpo-representative": {
    nearest: [],
    noNearest: true,
    verdict:
      "'Data protection officer' and 'privacy officer' appear nowhere in the Ordinance, and no provision requires a data user to designate anyone responsible for compliance. The four provisions reached only by broad terms use 'representative' in an unrelated sense — 'bodies representative of data users', whom the Commissioner consults before issuing a code of practice.",
    elsewhere:
      "The strictness 1 rests on the PCPD's best-practice guidance recommending a data protection officer. Appointing one is sound practice and is not required by the text.",
  },
  "pdpo/dpia": {
    nearest: [],
    noNearest: true,
    verdict:
      "None of the six terms appears in the Ordinance: no 'impact assessment', no 'privacy impact', no 'prior consultation', no 'high risk'. No provision requires an assessment before a new or higher-risk use of personal data.",
    elsewhere:
      "The strictness 1 rests on PCPD guidance encouraging privacy impact assessments.",
  },
  "pdpo/data-localization": {
    nearest: ["s-33", "dpp-4"],
    verdict:
      "The nearest provision is not in force. Section 33 would prohibit transferring personal data 'to a place outside Hong Kong except in specified circumstances', and the ingested text carries its status in the heading: '(Not yet in operation)'. It was enacted in 1995 and has never been commenced. Even commenced it would restrict export rather than require local storage — and DPP4(2) runs the other way, expressly contemplating 'a data processor, whether within or outside Hong Kong'. So this cell is 0 twice over: the provision would not localise, and it does not apply.",
    practicalEffect:
      "Hong Kong is the opposite of the European position: data may be sent abroad with no transfer formality at all, because the provision that would have imposed one was never commenced. The duties that survive travel with the data — DPP4(2) requires contractual or other means to secure a processor wherever it sits.",
    handledBy: [
      {
        requirementId: "cross-border-transfer",
        note: "Where s.33 and its dormant status are recorded.",
      },
    ],
  },
};
