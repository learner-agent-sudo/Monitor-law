/**
 * Keyword rules: is an item on topic, does it read like a legal development,
 * what kind is it, and where is it. These run for every item, and they are the
 * whole decision when no model is available.
 */

export const TRACKS = ["ai", "privacy"];
export const KINDS = ["legislation", "regulation", "guidance", "enforcement", "court", "consultation", "standard", "other"];
export const LABEL = { eu: "European Union", us: "United States", asia: "Asia", other: "Other" };

const CI = (src) => new RegExp(src, "i");

/**
 * "CCPA" is also India's Central Consumer Protection Authority. Where the title has
 * India context, CCPA is not California's privacy law: it is not privacy evidence
 * and it places the item in India.
 */
const CCPA_TERM = CI(String.raw`\bCCPA\b`);
const CALIFORNIA_ACRONYMS = /\bCCPA\b|\bCPRA\b|\bCPPA\b|\bCalPrivacy\b/;
const INDIA_CONTEXT = /₹|\bRs\.?(?=\s|\d)|\bINR\b|\blakhs?\b|\bcrores?\b|\bindian?\b|\bNew Delhi\b|\bMeitY\b|\bDPDP\b/i;

/** True when the title has India context and CCPA, so CCPA means India's authority. */
export function indianCcpa(text) {
  const s = String(text ?? "");
  return CCPA_TERM.test(s) && INDIA_CONTEXT.test(s);
}

/** Topic terms per track. "AI" is matched case-sensitively as a whole word. */
export const TOPIC = {
  ai: [
    /\bAI\b/,
    CI(String.raw`artificial intelligence`),
    CI(String.raw`machine learning`),
    CI(String.raw`\balgorithm(?:s|ic)?\b`),
    CI(String.raw`automated decision`),
    CI(String.raw`\bgenerative\b`),
    CI(String.raw`deepfake`),
    CI(String.raw`foundation model`),
    CI(String.raw`large language model`),
    /\bLLMs?\b/,
    CI(String.raw`chatbot`),
    CI(String.raw`facial recognition`),
    /人工智能|生成式|인공지능|人工知能/,
  ],
  privacy: [
    CI(String.raw`privacy`),
    CI(String.raw`data protection`),
    CI(String.raw`personal data`),
    CI(String.raw`personal information`),
    CI(String.raw`\bGDPR\b`),
    CCPA_TERM,
    CI(String.raw`\bCPRA\b`),
    CI(String.raw`\bPIPL\b`),
    CI(String.raw`\bPDPA\b`),
    CI(String.raw`\bPDPO\b`),
    CI(String.raw`\bDPDP\b`),
    CI(String.raw`\bAPPI\b`),
    CI(String.raw`\bPIPEDA\b`),
    CI(String.raw`data breach`),
    CI(String.raw`cross-border (?:data )?transfers?`),
    CI(String.raw`data transfers?`),
    CI(String.raw`\bbiometric`),
    CI(String.raw`\bcookies?\b`),
    CI(String.raw`surveillance`),
    CI(String.raw`data brokers?`),
    CI(String.raw`children'?s (?:online )?(?:data|privacy|personal)`),
    CI(String.raw`\bCOPPA\b`),
    /个人信息|個人資料|개인정보|個人情報/,
  ],
};

/**
 * Phrases that contain a legal or topic word but are not a legal development or an
 * AI topic: "act now" (a verb), "Big Law" (the law-firm industry), and "Intelligence
 * Law" (China's state-security law, not AI regulation). They are removed before the
 * topic and legal tests.
 */
const NOT_THIS_TRACK = [/\bact(?=\W*now\b)/gi, /\bBig Law\b/g, /\bIntelligence Law\b/gi];
const withoutNonLegalPhrases = (s) => NOT_THIS_TRACK.reduce((t, re) => t.replace(re, " "), String(s ?? ""));

/** Signals that an item reports a legal development rather than commentary. */
export const LEGAL = CI(
  String.raw`\b(?:law|laws|act|acts|bills?|legislat\w*|regulat\w*|rules?|rulemaking|directive|ordinance|decree|statute|amend\w*|guidance|guidelines?|code of practice|standards?|consultation|comment period|enforc\w*|fined|fines|penalt\w*|sanction\w*|settle\w*|lawsuit|court|ruling|judgment|injunction|executive order|compliance deadline|enters into force|takes effect|adopted|enacted|signed into law|drafts?|proposal|proposed)\b` +
    String.raw`|法律|法规|条例|草案|判决|处罚|罚款|监管|立法|규정|과징금|판결|개정`,
);

const KIND_RULES = [
  ["enforcement", CI(String.raw`\b(?:fined|fines?|penalt(?:y|ies)|settlements?|settles|enforcement actions?|sanctions?)\b`)],
  ["court", CI(String.raw`\b(?:courts?|rulings?|judgment|judgement|lawsuit|judge|tribunal|injunction)\b`)],
  ["consultation", CI(String.raw`\b(?:consultations?|comment period|call for (?:evidence|input)|public comments?)\b`)],
  ["legislation", CI(String.raw`\b(?:bills?|acts?|laws?|legislature|legislative|parliament|congress|senate|statutes?)\b`)],
  ["regulation", CI(String.raw`\b(?:regulations?|regulators?|rules?|rulemaking|measures?|directives?|ordinances?|decrees?)\b`)],
  ["guidance", CI(String.raw`\b(?:guidance|guidelines?|code of practice|opinions?)\b`)],
  ["standard", CI(String.raw`\b(?:standards?|frameworks?)\b`)],
];

/**
 * Place names. Abbreviations such as US, UK and EU are matched case-sensitively
 * so ordinary words ("us", "eu") do not count.
 */
const PLACES = [
  [/\bEU\b|\bEuropean\b|\bEurope\b|\bBrussels\b|\bEDPB\b|\bEDPS\b/, "European Union", "eu"],
  [/\bFrance\b|\bFrench\b|\bCNIL\b/i, "France", "eu"],
  [/\bGermany\b|\bGerman\b/i, "Germany", "eu"],
  [/\bItaly\b|\bItalian\b/i, "Italy", "eu"],
  [/\bSpain\b|\bSpanish\b/i, "Spain", "eu"],
  [/\bIreland\b|\bIrish\b/i, "Ireland", "eu"],
  [/\bNetherlands\b|\bDutch\b/i, "Netherlands", "eu"],
  [/\bUK\b|\bUnited Kingdom\b|\bBritain\b|\bBritish\b|\bEngland\b/, "United Kingdom", "other"],
  [/\bUS\b|\bU\.S\.|\bUSA\b|\bUnited States\b|\b[Cc]ongress(?:ional)?\b|\b[Ss]enate\b|\bFTC\b|\b[Ff]ederal\b/, "United States", "us"],
  [/\bCalifornia\b/, "California", "us"],
  [/\bColorado\b/, "Colorado", "us"],
  [/\bTexas\b/, "Texas", "us"],
  [/\bNew York\b/, "New York", "us"],
  [/\bVirginia\b/, "Virginia", "us"],
  [/\bIllinois\b/, "Illinois", "us"],
  [/\bUtah\b/, "Utah", "us"],
  [/\bConnecticut\b/, "Connecticut", "us"],
  [/\bChina\b|\bChinese\b|\bBeijing\b|\bShanghai\b/i, "China", "asia"],
  [/\bJapan\b|\bJapanese\b/i, "Japan", "asia"],
  [/\bSouth Korea\b|\bKorea\b|\bKorean\b/i, "South Korea", "asia"],
  [/\bSingapore\b/i, "Singapore", "asia"],
  [/\bHong Kong\b/i, "Hong Kong", "asia"],
  [/\bTaiwan\b/i, "Taiwan", "asia"],
  [/\bIndia\b|\bIndian\b/i, "India", "asia"],
  [/\bVietnam\b/i, "Vietnam", "asia"],
  [/\bThailand\b/i, "Thailand", "asia"],
  [/\bIndonesia\b/i, "Indonesia", "asia"],
  [/\bMalaysia\b/i, "Malaysia", "asia"],
  [/\bPhilippines\b/i, "Philippines", "asia"],
  [/\bCanada\b|\bCanadian\b/i, "Canada", "other"],
  [/\bAustralia\b|\bAustralian\b/i, "Australia", "other"],
  [/\bBrazil\b|\bBrazilian\b/i, "Brazil", "other"],
  // Law acronyms name the jurisdiction even when the headline names no country.
  // Matched case-sensitively so ordinary words do not count.
  [/\bGDPR\b|\bCJEU\b|\bAI Act\b|\bDigital Omnibus\b/, "European Union", "eu"],
  [/\bDPDP\b/, "India", "asia"],
  [/\bPIPL\b/, "China", "asia"],
  [/\bPDPO\b|\bPCPD\b/, "Hong Kong", "asia"],
  [/\bAPPI\b/, "Japan", "asia"],
  [/\bPIPA\b|\bPIPC\b/, "South Korea", "asia"],
  [CALIFORNIA_ACRONYMS, "California", "us"],
  [/\bICO\b/, "United Kingdom", "other"],
  // Multistate actions brought by several state attorneys general are US stories.
  [/\bmulti-?state\b|\battorneys general\b/i, "United States", "us"],
  // US federal bodies and the White House. Used only when no more specific place matches.
  [/\bCommerce Department\b|\bDepartment of Commerce\b|\bBIS\b|\bBureau of Industry and Security\b|\bWhite House\b/, "United States", "us", true],
];

/**
 * Market news, adverts and how-to pieces. An item whose title matches is never kept
 * by keyword rules, whatever else it says.
 */
export const NOISE =
  /\b(?:stocks?|shares?|share price|markets?|index|investors?|KOSPI|Nikkei|Nasdaq|rally|plunge[sd]?|selloff|webinar|podcast|opinion|sponsored|how to|what (?:you|businesses|companies|employers|organi[sz]ations) need to know|guide)\b/i;

/**
 * Topic and legal signals for one item. For a source that is not presumed on topic,
 * the topic terms are tested on the title plus only the first 300 characters of the
 * description, because long bodies mention "AI" in passing.
 * topicInTitle and legalInTitle look at the title alone. They drive the keyword rule.
 */
export function scoreItem(item, track, source = {}) {
  const title = withoutNonLegalPhrases(item?.title);
  const description = withoutNonLegalPhrases(item?.description);
  const indiaCcpa = track === "privacy" && indianCcpa(title);
  const presumed = presumedOn(track, source, indiaCcpa);
  const topicTerms = (TOPIC[track] ?? []).filter((re) => !(indiaCcpa && re === CCPA_TERM));
  const topicInTitle = topicTerms.some((re) => re.test(title));
  const onTopic =
    presumed || topicInTitle || topicTerms.some((re) => re.test(`${title} ${description.slice(0, 300)}`));
  const legal = LEGAL.test(`${title} ${description}`);
  const legalInTitle = LEGAL.test(title);
  // Primary sources first: with a limited model budget, official items are reviewed
  // before law-firm analysis, and analysis before news.
  const sourceBonus = source.type === "official" ? 2 : source.type === "analysis" ? 1 : 0;
  const score = (onTopic ? 2 : 0) + (legal ? 2 : 0) + (legalInTitle ? 1 : 0) + sourceBonus;
  return { onTopic, legal, score, topicInTitle, legalInTitle };
}

/**
 * The strict keyword rule. Used whenever an item is decided without the model.
 * Keep only if (the source is presumed on topic OR the title is on topic) AND the
 * title reads as a legal development AND the title is not market news, an advert
 * or a how-to.
 */
export function keywordKeep(item, track, source = {}) {
  const sc = scoreItem(item, track, source);
  const title = withoutNonLegalPhrases(item?.title);
  const presumed = presumedOn(track, source, track === "privacy" && indianCcpa(title));
  return (presumed || sc.topicInTitle) && sc.legalInTitle && !NOISE.test(title);
}

/**
 * True when the source is presumed on topic for the track. An India CCPA item is
 * not rescued by its source: CCPA there is not privacy.
 */
function presumedOn(track, source, indiaCcpa) {
  return !indiaCcpa && Array.isArray(source.presumed) && source.presumed.includes(track);
}

/** One of KINDS, from the first matching rule in the order below. */
export function guessKind(text) {
  const s = String(text ?? "");
  for (const [kind, re] of KIND_RULES) if (re.test(s)) return kind;
  return "other";
}

/** The place name that appears earliest in the text, or null. */
export function matchPlace(text) {
  const s = String(text ?? "");
  const indiaCcpaHere = indianCcpa(s);
  let best = null;
  let fallback = null;
  for (const [re, jurisdiction, region, weak] of PLACES) {
    const m = re.exec(s);
    if (!m) continue;
    // With India context, CCPA is India's authority, not California's law.
    const india = indiaCcpaHere && re === CALIFORNIA_ACRONYMS;
    const at = india ? s.search(CCPA_TERM) : m.index;
    const place = india ? { jurisdiction: "India", region: "asia" } : { jurisdiction, region };
    if (weak) {
      if (fallback === null || at < fallback.index) fallback = { index: at, ...place };
    } else if (best === null || at < best.index) best = { index: at, ...place };
  }
  best = best ?? fallback;
  return best ? { region: best.region, jurisdiction: best.jurisdiction } : null;
}

/**
 * Region and jurisdiction for an item.
 * - Source fixes both: keep both.
 * - Source fixes the region only (the news searches): a place name in the TITLE gives
 *   that place's jurisdiction and region, so a US story found by the Asia search is
 *   labelled US. Otherwise the source's region with its generic label.
 * - Source fixes neither: the first place name in the text, else "other".
 * @param {{title?: string, description?: string}} item
 */
export function guessPlace(item, source = {}) {
  const title = String(item?.title ?? "");
  const text = `${title} ${item?.description ?? ""}`;
  if (source.region && source.jurisdiction) {
    return { region: source.region, jurisdiction: source.jurisdiction };
  }
  if (source.region) {
    const inTitle = matchPlace(title);
    if (inTitle) return { region: inTitle.region, jurisdiction: inTitle.jurisdiction };
    return { region: source.region, jurisdiction: LABEL[source.region] };
  }
  const hit = matchPlace(text);
  if (hit) return { region: hit.region, jurisdiction: source.jurisdiction ?? hit.jurisdiction };
  return { region: "other", jurisdiction: source.jurisdiction ?? LABEL.other };
}
