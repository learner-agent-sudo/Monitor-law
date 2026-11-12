/**
 * Keyword rules: is an item on topic, does it read like a legal development,
 * what kind is it, and where is it. These run for every item, and they are the
 * whole decision when no model is available.
 */

export const TRACKS = ["ai", "privacy"];
export const KINDS = ["legislation", "regulation", "guidance", "enforcement", "court", "consultation", "standard", "other"];
export const LABEL = { eu: "European Union", us: "United States", asia: "Asia", other: "Other" };

const CI = (src) => new RegExp(src, "i");

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
    CI(String.raw`\bCCPA\b`),
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
];

/** Sum of topic and legal signals. onTopic is true for presumed sources. */
export function scoreItem(item, track, source = {}) {
  const title = String(item?.title ?? "");
  const text = `${title} ${item?.description ?? ""}`;
  const presumed = Array.isArray(source.presumed) && source.presumed.includes(track);
  const onTopic = presumed || (TOPIC[track] ?? []).some((re) => re.test(text));
  const legal = LEGAL.test(text);
  const score = (onTopic ? 2 : 0) + (legal ? 2 : 0) + (LEGAL.test(title) ? 1 : 0);
  return { onTopic, legal, score };
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
  let best = null;
  for (const [re, jurisdiction, region] of PLACES) {
    const m = re.exec(s);
    if (m && (best === null || m.index < best.index)) best = { index: m.index, jurisdiction, region };
  }
  return best ? { region: best.region, jurisdiction: best.jurisdiction } : null;
}

/**
 * Region and jurisdiction for an item. A source that fixes the region keeps it;
 * the place in the text only supplies the jurisdiction label. A source that
 * fixes both keeps both. Otherwise the text decides, then the source's fallback.
 */
export function guessPlace(text, source = {}) {
  const hit = matchPlace(text);
  if (source.region && source.jurisdiction) {
    return { region: source.region, jurisdiction: source.jurisdiction };
  }
  if (source.region) {
    const jurisdiction = hit && hit.region === source.region ? hit.jurisdiction : LABEL[source.region];
    return { region: source.region, jurisdiction };
  }
  if (hit) return { region: hit.region, jurisdiction: source.jurisdiction ?? hit.jurisdiction };
  return { region: "other", jurisdiction: source.jurisdiction ?? LABEL.other };
}
