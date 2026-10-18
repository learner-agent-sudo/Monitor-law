// ---------------------------------------------------------------------------
// Search traces for empty cells.
//
// WHY THIS EXISTS
//
// Every positive claim in the catalog carries a verbatim quote, verified inside
// the provision it cites. Every NEGATIVE claim — "PIPEDA has no portability
// right", "PDPO has no sensitive-data category" — carried nothing at all. It
// rested on the author not having found anything, which is not evidence and
// cannot be checked.
//
// That asymmetry is exactly backwards for a gap-analysis product, because a gap
// is asserted by comparing a quoted 3 against an unbacked 0, so the unbacked
// side is the one driving the conclusion. The quote machinery verifies the half
// of the claim nobody disputes.
//
// A reader who doubts a 0 currently has no move except to re-read the whole
// instrument. This module gives them a smaller one: it records WHAT WAS
// SEARCHED, in how many provisions, and what the nearest surviving candidates
// actually say. Disagreeing then costs one line — "you missed section X" —
// instead of an afternoon.
//
// WHAT THIS IS AND IS NOT
//
// The search is mechanical and reproducible: terms in, ranked provisions out,
// excerpts sliced verbatim from the ingested text. It proves that a search
// happened and shows its reach.
//
// It does NOT prove absence. No keyword sweep can: a statute may impose an
// obligation in words nobody thought to search for, which is precisely how
// GDPR-shaped vocabulary makes non-GDPR laws look emptier than they are. So the
// trace is deliberately split in two, and the UI keeps them apart:
//
//   mechanical  provisions searched, terms tried, candidates found, excerpts
//   judgement   why those candidates do not impose the obligation
//
// The first is checkable by a machine. The second is the author's reading, is
// labelled as such, and is the thing a reviewer is being invited to attack.
// ---------------------------------------------------------------------------

/**
 * Statutory search vocabulary, per requirement.
 *
 * These terms describe how LEGISLATION phrases an obligation, which is not how
 * a privacy policy phrases it — lib/policy-rules.mjs holds that vocabulary and
 * the two must not be confused. "We may share your information" belongs there;
 * "the controller shall" belongs here.
 *
 * The vocabulary is deliberately WIDE. A trace exists to surface near-misses,
 * so a term that drags in loosely related provisions is doing its job; a term
 * so narrow it finds only the obligation it was written for is useless, because
 * it can never contradict the author.
 *
 * Every term is disclosed in the trace. That is the point: a reviewer who
 * thinks the search used the wrong words can see the words it used.
 *
 * A third element "broad" marks a term that cannot carry a near-miss on its
 * own. Statutes reuse ordinary words for unrelated things: "representative"
 * appears in PDPO only as "bodies representative of data users", "remain in"
 * as immigration status, "accountability" inside the title of the federal
 * Health Insurance Portability and Accountability Act. Those are not the
 * nearest thing to an obligation, and presenting them as such would overstate
 * how close the instrument comes. A provision matched ONLY by broad terms is
 * therefore counted and disclosed but not displayed as a candidate.
 */
export const SEARCH_TERMS = {
  "lawful-basis": [
    ["lawfulness of processing", /lawful(?:ness)?\s+(?:of\s+)?processing/i],
    ["legitimate interests", /legitimate\s+interests?/i],
    ["necessary for a contract", /necessary\s+for\s+(?:the\s+)?performance\s+of\s+a\s+contract/i],
    ["legal obligation", /compliance\s+with\s+a\s+legal\s+obligation|required\s+by\s+law/i],
    ["reasonable person standard", /reasonable\s+person\s+would\s+consider/i],
    ["appropriate in the circumstances", /appropriate\s+in\s+the\s+circumstances/i],
    ["lawful purpose / lawful means", /lawful\s+(?:purpose|means)/i],
    ["purpose limitation", /purposes?\s+(?:for\s+which|specified|identified)/i],
  ],
  consent: [
    ["consent", /consent/i],
    ["opt-in", /opt[-\s]?in/i],
    ["withdrawal of consent", /withdraw\w*[\s\S]{0,30}consent/i],
    ["freely given / express", /freely\s+given|express(?:ed)?\s+(?:consent|wish)/i],
    ["separate consent", /separate\s+consent|单独同意/i],
  ],
  "notice-transparency": [
    ["information to be provided", /information\s+to\s+be\s+(?:provided|given|made\s+available)/i],
    ["notice", /\bnotic(?:e|es|ing)\b/i],
    ["openness", /\bopenness\b/i],
    ["readily available", /readily\s+available/i],
    ["at or before collection", /(?:at\s+or\s+before|before)\s+the\s+time[\s\S]{0,30}collect/i],
    ["privacy policy / statement", /privacy\s+(?:policy|statement|notice)/i],
    ["transparent", /transparen\w+/i],
  ],
  "rights-access": [
    ["right of access", /right\s+of\s+access|right\s+to\s+access/i],
    ["access to personal data", /access\s+to[\s\S]{0,30}personal\s+(?:data|information)/i],
    ["data access request", /(?:data\s+)?access\s+request/i],
    ["individual access", /individual\s+access/i],
    ["informed of the existence", /informed\s+of\s+the\s+existence/i],
  ],
  "rights-deletion": [
    ["erasure", /eras(?:e|ed|ure)/i],
    ["deletion", /delet(?:e|ed|ion)/i],
    ["destruction", /destr(?:oy|oyed|uction)/i],
    ["right to be forgotten", /right\s+to\s+be\s+forgotten/i],
    ["no longer necessary", /no\s+longer[\s\S]{0,30}(?:necessary|required|needed)/i],
  ],
  "rights-correction": [
    ["rectification", /rectif(?:y|ied|ication)/i],
    ["correction", /correct(?:ion|ed)?/i],
    ["inaccurate", /inaccura\w+/i],
    ["amendment of a record", /amend\w*[\s\S]{0,25}(?:personal|record|data)/i],
  ],
  "rights-portability": [
    ["portability", /portab\w+/i],
    ["machine-readable", /machine[-\s]?readable/i],
    ["structured, commonly used format", /structured[\s\S]{0,40}commonly\s+used/i],
    [
      "transmit to another organisation",
      /transmit\w*[\s\S]{0,60}(?:another|other)\s+(?:controller|organization|organisation|business|person|handler)/i,
    ],
    ["receive the data provided", /receive[\s\S]{0,60}(?:provided|concerning)\s+(?:him|her|them|the\s+(?:data\s+)?subject)/i],
    ["direct transfer on request", /transfer\w*[\s\S]{0,40}(?:directly|to\s+another|at\s+the\s+request)/i],
    ["computerised form", /computeriz\w+|computeris\w+/i],
    ["copy of the data", /copy\s+of[\s\S]{0,30}(?:personal\s+)?(?:data|information)/i],
    // Portability's nearest neighbour is always the access right — it is access
    // plus a format and a destination. An instrument with access but no
    // portability is the normal case, and the trace should show which access
    // provision stops short rather than reporting nothing at all.
    ["access right (the usual near-miss)", /individual\s+access|right\s+(?:of|to)\s+access|given\s+access\s+to/i],
    ["supply a copy on request", /suppl\w+[\s\S]{0,40}copy/i],
  ],
  "rights-automated-decision": [
    ["automated decision-making", /automat(?:ed|ic)\s+(?:individual\s+)?(?:decision|processing|means)/i],
    ["profiling", /profil(?:e|ing)/i],
    ["solely automated", /(?:solely|exclusively)\s+(?:on\s+)?automat\w+/i],
    ["human intervention", /human\s+intervention/i],
    ["logic involved", /logic\s+involved/i],
    ["algorithm", /algorithm\w*|自动化决策/i],
    ["decision affecting the individual", /decision[\s\S]{0,40}(?:significantly\s+affect|legal\s+effect)/i],
  ],
  "sensitive-data": [
    ["special categories", /special\s+categor\w+/i],
    ["sensitive personal data", /sensitive\s+(?:personal\s+)?(?:data|information)|敏感个人信息/i],
    ["racial or ethnic origin", /racial\s+or\s+ethnic\s+origin/i],
    ["biometric", /biometric\w*/i],
    ["health data", /health[\s\S]{0,20}(?:data|information|record)/i],
    ["political opinions", /political\s+opinion\w*/i],
    ["trade-union membership", /trade[-\s]?union/i],
    ["sexual orientation / sex life", /sexual\s+(?:orientation|life)/i],
    ["religious beliefs", /religious\s+(?:or\s+philosophical\s+)?belief\w*/i],
    ["genetic data", /genetic\s+data/i],
  ],
  "childrens-data": [
    ["child", /\bchild(?:ren|'s|ren's)?\b/i],
    ["minor", /\bminors?\b/i],
    ["under the age of", /under\s+the\s+age\s+of/i],
    ["parental consent", /parent(?:al|'s)?\s+(?:consent|authority|authorisation|authorization)/i],
    ["guardian", /guardian\w*/i, "broad"],
    ["age threshold", /\b1[3-8]\s+years|\bage\s+of\s+1[3-8]\b|不满十四周岁/i],
  ],
  "breach-notification": [
    ["breach", /breach/i],
    ["notify the regulator", /notif\w+[\s\S]{0,60}(?:commissioner|authority|supervisory|regulator|department)/i],
    // "unauthorized or accidental access" is how PDPO's DPP4 puts it, and the
    // earlier form of this term — which required the noun to follow
    // "unauthorized" directly — reported the phrase ABSENT from an Ordinance
    // that contains it. A term wrongly listed as absent is worse than a term
    // that over-matches: it is the trace asserting silence where there is
    // speech.
    [
      "unauthorised access or disclosure",
      /unauthori[sz]\w+(?:\s+or\s+accidental)?\s+(?:access|disclosure|use|processing)/i,
    ],
    ["real risk of significant harm", /(?:real\s+risk\s+of\s+)?significant\s+harm/i],
    ["without undue delay / 72 hours", /without\s+undue\s+delay|72\s+hours/i],
    ["security incident", /security\s+(?:incident|event)|泄露/i],
    ["loss of data", /\bloss\b[\s\S]{0,30}(?:data|information)/i],
  ],
  "dpo-representative": [
    ["data protection officer", /data\s+protection\s+officer/i],
    ["privacy officer", /privacy\s+officer/i],
    ["representative", /representative/i, "broad"],
    ["designated individual", /designat\w+[\s\S]{0,40}(?:individual|person|officer|employee)/i],
    ["accountability", /accountab\w+/i, "broad"],
    ["responsible for compliance", /responsib\w+\s+for[\s\S]{0,40}complian\w+/i],
    ["contact person", /contact\s+(?:person|point|details)/i, "broad"],
  ],
  dpia: [
    ["impact assessment", /impact\s+assessment/i],
    ["privacy impact", /privacy\s+impact/i],
    ["risk assessment", /(?:assess\w*|evaluat\w*)[\s\S]{0,30}(?:risk|impact)/i],
    ["prior consultation", /prior\s+consultation/i],
    ["high risk", /high\s+risk/i],
    ["compliance audit", /compliance\s+(?:audit|review)|合规审计/i],
  ],
  "cross-border-transfer": [
    ["transfer outside the jurisdiction", /transfer\w*[\s\S]{0,60}(?:third\s+countr\w+|outside)/i],
    ["adequacy / comparable protection", /adequa\w+[\s\S]{0,30}(?:decision|level|protection)|comparable[\s\S]{0,30}protection/i],
    ["standard contractual clauses", /standard\s+(?:contractual\s+clauses|data\s+protection\s+clauses)/i],
    ["outside the territory", /outside\s+(?:the\s+)?(?:EU|EEA|Union|United\s+Kingdom|Canada|Hong\s+Kong|Qu[ée]bec|territory|jurisdiction)/i],
    ["another country or jurisdiction", /(?:another|other)\s+(?:countr\w+|jurisdiction|state)/i, "broad"],
    ["cross-border", /cross[-\s]?border|境外/i],
    ["place outside", /place\s+outside/i],
  ],
  "data-localization": [
    ["localisation", /locali[sz]\w+/i],
    ["stored within the territory", /stor\w+[\s\S]{0,50}(?:within|in\s+the\s+territory|locally|domestic|in\s+Canada|in\s+China)/i],
    ["shall be stored or retained", /shall\s+(?:be\s+)?(?:stor\w+|retain\w+|kept)/i, "broad"],
    ["within the territory", /within\s+the\s+(?:territory|borders)|境内/i],
    ["remain in the jurisdiction", /remain\w*\s+(?:in|within)/i, "broad"],
    ["free movement / free flow", /free\s+(?:movement|flow)\s+of[\s\S]{0,20}data/i, "broad"],
    ["free movement shall not be restricted", /shall\s+neither\s+be\s+restricted|shall\s+not\s+be\s+(?:restricted|prohibited)/i],
    ["critical information infrastructure", /critical\s+information\s+infrastructure|关键信息基础设施/i],
    // A localisation rule and an export restriction are different obligations,
    // and the second is almost always what an instrument has instead of the
    // first. Showing it is the whole value of the trace here: "this law
    // controls sending data out, but never requires it to stay" is a far more
    // useful answer than "nothing found".
    ["export restriction (the usual near-miss)", /(?:transfer\w*|communicat\w*|disclos\w*)[\s\S]{0,60}outside/i],
    ["transfer to a third country", /transfer\w*[\s\S]{0,60}third\s+countr\w+/i],
    ["place outside", /place\s+outside/i],
    // Express permission to process offshore is positive evidence AGAINST a
    // localisation duty, not merely an absence of one — PDPO's DPP4(2)
    // contemplates "a data processor, whether within or outside Hong Kong".
    ["processing within or outside the jurisdiction", /(?:within|inside)\s+or\s+outside/i],
  ],
  "records-processing": [
    ["records of processing", /record\w*\s+of\s+processing/i],
    ["maintain records", /(?:maintain|keep|retain)\w*[\s\S]{0,40}record\w*/i, "broad"],
    ["documentation of activities", /document\w*[\s\S]{0,40}(?:processing|activities)/i],
    ["register / log", /\bregister\b|\blogs?\b/i, "broad"],
    ["retention period for records", /(?:retain\w*|retention)[\s\S]{0,40}(?:months?|years?|period)/i, "broad"],
    ["data user return", /data\s+user\s+return/i],
    ["policies and practices", /polic(?:y|ies)\s+and\s+practices/i],
  ],
  "vendor-processor": [
    ["processor", /\bprocessors?\b/i],
    ["service provider / third party", /service\s+provider|third\s+part(?:y|ies)/i],
    ["on behalf of", /on\s+behalf\s+of/i],
    ["contractual means", /contract\w*[\s\S]{0,40}(?:means|terms|binding)/i],
    ["subcontract", /sub[-\s]?(?:contract|processor)\w*/i],
    ["agent", /\bagents?\b|受托/i],
  ],
  security: [
    ["security safeguards", /security\s+safeguard\w*|safeguard\w*/i],
    ["appropriate technical measures", /appropriate\s+(?:technical|organi[sz]ational|security)/i],
    ["protect against loss or unauthorised access", /protect\w*[\s\S]{0,50}(?:loss|unauthori[sz]\w+|theft)/i],
    ["encryption", /encrypt\w*|pseudonymi[sz]\w*/i],
    ["all practicable steps", /all\s+practicable\s+steps/i],
  ],
  "rights-optout-sale": [
    ["opt-out", /opt[-\s]?out/i],
    ["do not sell", /do\s+not\s+sell|sale\s+of\s+personal/i],
    ["direct marketing", /direct\s+marketing/i],
    ["cease to use", /ceas\w+[\s\S]{0,30}us\w+/i],
    ["right to object", /object(?:ion)?\s+to[\s\S]{0,30}processing|right\s+to\s+object/i],
    ["withdraw consent", /withdraw\w*[\s\S]{0,30}consent/i],
  ],
  "enforcement-penalties": [
    ["penalty", /penalt(?:y|ies)/i],
    ["fine", /\bfines?\b|administrative\s+fine/i],
    ["offence", /offen[cs]e/i],
    ["liable on conviction", /liable[\s\S]{0,40}conviction|guilty\s+of\s+an\s+offen[cs]e/i],
    ["damages / compensation", /damages|compensation/i],
    ["enforcement notice", /enforcement\s+notice|contravention/i],
  ],
};

/**
 * Terms some instruments need in their own words.
 *
 * Searching for GDPR vocabulary in a non-GDPR statute is the structural bias
 * this whole module is supposed to expose, so where an instrument words an idea
 * differently its own phrasing is added rather than left to chance. A term
 * present here is still disclosed in the trace alongside the shared ones.
 */
export const SEARCH_TERMS_BY_LAW = {
  pipeda: {
    "dpo-representative": [["designated accountability", /individual\s+or\s+individuals[\s\S]{0,60}accountab\w+/i]],
    "rights-portability": [["transfer of an account", /transfer\w*[\s\S]{0,40}account/i]],
  },
  pdpo: {
    "sensitive-data": [["identity card number", /identity\s+card\s+number/i]],
    // "section 33" as a term is useless here: the Ordinance's running page
    // headers repeat the section number of the NEXT page, so it matched ss.32
    // and 63 rather than s.33 itself. The provision's own heading words are
    // what finds it, which is what "place outside" in the shared vocabulary
    // now does.
    "records-processing": [["data user return", /data\s+user\s+return|register\s+of\s+data\s+users/i]],
  },
  ccpa: {
    "dpo-representative": [["authorised agent", /authori[sz]ed\s+agent/i]],
    "records-processing": [["record of requests", /record\w*[\s\S]{0,40}request\w*/i]],
  },
  // PIPL currently has no empty cell, so no Chinese vocabulary is exercised.
  // The shared terms above carry a few Chinese alternates anyway, and
  // scripts/check-gap-traces.mjs fails loudly if a trace is ever required for
  // an instrument whose vocabulary finds nothing, rather than letting a
  // vocabulary failure read as statutory silence.
};

/** Terms for one law and requirement — shared vocabulary plus any local additions. */
export function termsFor(lawId, requirementId) {
  const shared = SEARCH_TERMS[requirementId] ?? [];
  const extra = SEARCH_TERMS_BY_LAW[lawId]?.[requirementId] ?? [];
  return [...shared, ...extra].map(([label, re, flag]) => ({
    label,
    re,
    broad: flag === "broad",
  }));
}

/** Collapse whitespace for display without changing a single word. */
export function tidy(s) {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Keep a markdown link's label, drop its URL.
 *
 * The California source opens every section with "[**1798.100.**](https://...)"
 * and a URL in the middle of an excerpt teaches the reader nothing. Both halves
 * of what survives are still the source's own characters, and
 * scripts/check-gap-traces.mjs applies this same function to the provision
 * before checking an excerpt against it — so the verbatim guarantee holds
 * without the noise.
 */
export function flattenLinks(s) {
  return s.replace(/\[([^\]]*)\]\((?:[^)\s]*)\)/g, "$1");
}

/**
 * A readable window around a match, sliced verbatim out of the provision.
 *
 * Snapped to word boundaries so it does not start mid-word, and stripped of the
 * heading line's markdown link wrapper where one begins the chunk — the CCPA
 * source opens every section with "[**1798.100.**](https://...)" and a URL in
 * the middle of an excerpt teaches the reader nothing.
 *
 * Whatever this returns is still a verbatim slice: scripts/check-gap-traces.mjs
 * asserts the excerpt appears inside the provision text after normalisation, so
 * a generator bug that paraphrases cannot survive the build.
 */
function excerptAround(text, matchIndex, matchLength, width = 150) {
  let start = Math.max(0, matchIndex - Math.floor(width / 2));
  let end = Math.min(text.length, matchIndex + matchLength + Math.floor(width / 2));
  // Snap outward to whitespace so words stay whole.
  while (start > 0 && !/\s/.test(text[start - 1])) start--;
  while (end < text.length && !/\s/.test(text[end])) end++;
  const out = tidy(flattenLinks(tidy(text.slice(start, end))));
  return {
    excerpt: out,
    truncatedStart: start > 0,
    truncatedEnd: end < text.length,
  };
}

/**
 * Run the search for one (law, requirement) pair.
 *
 * Returns the mechanical half of a trace: how much text was searched, which
 * terms were tried, which of them hit anything, and the best few candidate
 * provisions with a verbatim excerpt each.
 *
 * Ranking is by DISTINCT SPECIFIC TERMS MATCHED, not total hits. A provision
 * that mentions one search word forty times is usually about something else;
 * one that touches four different facets of the requirement is the near-miss
 * worth showing. Ties break on total distinct terms, then total hits, then
 * provision key, so the output is byte-stable across runs and a diff means the
 * corpus or the vocabulary changed — never that the sort wobbled.
 *
 * The excerpt is cut around the first SPECIFIC match where there is one, so a
 * candidate is shown at the words that made it a candidate.
 */
export function searchProvisions(lawId, requirementId, index, { limit = 3 } = {}) {
  const terms = termsFor(lawId, requirementId);
  const scored = [];
  const termHits = new Map(terms.map((t) => [t.label, 0]));

  for (const [key, provision] of index) {
    const matched = [];
    const matchedSpecific = [];
    let hits = 0;
    let firstAt = Infinity;
    let firstLen = 0;
    let firstSpecificAt = Infinity;
    let firstSpecificLen = 0;
    for (const { label, re, broad } of terms) {
      const all = [...provision.text.matchAll(new RegExp(re.source, re.flags.replace("g", "") + "g"))];
      if (!all.length) continue;
      matched.push(label);
      if (!broad) matchedSpecific.push(label);
      hits += all.length;
      termHits.set(label, termHits.get(label) + all.length);
      if (all[0].index < firstAt) {
        firstAt = all[0].index;
        firstLen = all[0][0].length;
      }
      if (!broad && all[0].index < firstSpecificAt) {
        firstSpecificAt = all[0].index;
        firstSpecificLen = all[0][0].length;
      }
    }
    if (!matched.length) continue;
    scored.push({
      key,
      provision,
      matched,
      matchedSpecific,
      hits,
      at: matchedSpecific.length ? firstSpecificAt : firstAt,
      len: matchedSpecific.length ? firstSpecificLen : firstLen,
    });
  }

  // Provisions reached only by a broad term are counted, never shown. Calling
  // "bodies representative of data users" the nearest thing to a duty to
  // appoint a privacy officer would overstate how close the Ordinance comes.
  const specific = scored.filter((c) => c.matchedSpecific.length > 0);
  const weakOnly = scored.length - specific.length;

  // After distinct-term count, the tie-break is WHERE the first match sits. A
  // provision that matches in its opening line is about the topic; one that
  // matches three thousand characters in mentions it in passing. Without this,
  // ties fell to lexicographic key order, which put the UK GDPR's certification
  // articles ahead of Chapter V purely because "art-42" sorts before "art-44".
  specific.sort(
    (a, b) =>
      b.matchedSpecific.length - a.matchedSpecific.length ||
      a.at - b.at ||
      b.hits - a.hits ||
      a.key.localeCompare(b.key),
  );

  const toCandidate = (c) => {
    const { excerpt, truncatedStart, truncatedEnd } = excerptAround(c.provision.text, c.at, c.len);
    return {
      key: c.key,
      label: c.provision.label,
      matched: c.matchedSpecific.length ? c.matchedSpecific : c.matched,
      excerpt,
      truncatedStart,
      truncatedEnd,
    };
  };

  return {
    provisionsSearched: index.size,
    termsTried: terms.map((t) => t.label),
    termsMatched: [...termHits.entries()].filter(([, n]) => n > 0).map(([label]) => label),
    /** Terms that matched nothing anywhere in the instrument — evidence in itself. */
    termsAbsent: terms
      .filter((t) => !t.broad && termHits.get(t.label) === 0)
      .map((t) => t.label),
    candidatesFound: specific.length,
    weakOnly,
    candidates: specific.slice(0, limit).map(toCandidate),
    /** Every scoring provision, for the build check to verify declared near-misses against. */
    allKeys: specific.map((c) => c.key),
    candidateFor: (key) => {
      const hit = specific.find((c) => c.key === key);
      return hit ? toCandidate(hit) : null;
    },
  };
}
