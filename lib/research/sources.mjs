/**
 * The sources the research agents read. To add or remove a source, edit this
 * list. See docs/RESEARCH_AGENTS.md.
 *
 * Fields
 *   id, name        identifiers shown in the run log and on the site
 *   type            "official" | "analysis" | "news"  (shown as a badge)
 *   kind            how to fetch it: "rss" | "federal-register" | "google-news"
 *   tracks          which agents read it: "ai", "privacy"
 *   presumed        tracks for which EVERY item is on topic (skips the keyword topic test)
 *   region          "eu" | "us" | "asia" | "other", or null to work it out from the text
 *   jurisdiction    fixed jurisdiction label, or null to work it out from the text
 *   url             feed address (rss)
 *   queries         { ai: [...], privacy: [...] } search strings (search kinds)
 *   exclude         optional RegExp tested against the title (do not use the g flag)
 *
 * The URLs here could not be checked from the environment they were written in.
 * A dead source is recorded as failed on the run and never stops the others.
 */

const EU_AI = '"AI Act" OR "artificial intelligence act" OR "AI regulation" EU';
const EU_PRIVACY = 'GDPR OR "data protection" (fine OR ruling OR regulation OR amendment OR EDPB OR "Court of Justice")';
const US_AI =
  '("artificial intelligence" OR "AI") (bill OR law OR regulation OR "executive order") (Congress OR Senate OR state OR FTC OR California OR Colorado OR Texas OR "New York")';
const US_PRIVACY =
  '("privacy law" OR "privacy bill" OR "data privacy" OR CCPA) (state OR Congress OR FTC OR "attorney general" OR legislature)';
const ASIA_AI_1 =
  '("artificial intelligence" OR "AI") (law OR bill OR act OR regulation OR rules OR guidelines) (China OR Japan OR "South Korea" OR Taiwan)';
const ASIA_AI_2 =
  '("artificial intelligence" OR "AI") (law OR bill OR act OR regulation OR rules OR guidelines) (Singapore OR "Hong Kong" OR India OR Vietnam OR Thailand OR Indonesia OR Malaysia OR Philippines)';
const ASIA_PRIVACY_1 =
  '("data protection" OR "personal data" OR "personal information" OR "privacy law" OR PIPL) (China OR Japan OR "South Korea" OR Taiwan)';
const ASIA_PRIVACY_2 =
  '("data protection" OR "personal data" OR "privacy law" OR PDPA OR PDPO OR DPDP) (Singapore OR "Hong Kong" OR India OR Vietnam OR Thailand OR Indonesia OR Malaysia OR Philippines)';

/** Google News search for one region. Region is known from the query. */
function googleNews(id, region, queries) {
  return { id, name: "Google News search", type: "news", kind: "google-news", tracks: ["ai", "privacy"], presumed: [], region, jurisdiction: null, queries };
}

export const SOURCES = [
  // ---- Official: EU --------------------------------------------------------
  { id: "ec-digital", name: "European Commission (Digital Strategy)", type: "official", kind: "rss", tracks: ["ai", "privacy"], presumed: [], region: "eu", jurisdiction: "European Union", url: "https://digital-strategy.ec.europa.eu/en/rss.xml" },
  { id: "edpb", name: "European Data Protection Board", type: "official", kind: "rss", tracks: ["privacy", "ai"], presumed: ["privacy"], region: "eu", jurisdiction: "European Union", url: "https://www.edpb.europa.eu/feed/news_en" },
  { id: "edps", name: "European Data Protection Supervisor", type: "official", kind: "rss", tracks: ["privacy", "ai"], presumed: ["privacy"], region: "eu", jurisdiction: "European Union", url: "https://www.edps.europa.eu/feed/news_en" },
  { id: "europarl", name: "European Parliament press", type: "official", kind: "rss", tracks: ["ai", "privacy"], presumed: [], region: "eu", jurisdiction: "European Union", url: "https://www.europarl.europa.eu/rss/doc/press-releases/en.xml" },
  { id: "cnil", name: "CNIL (France)", type: "official", kind: "rss", tracks: ["privacy", "ai"], presumed: ["privacy"], region: "eu", jurisdiction: "France", url: "https://www.cnil.fr/en/rss.xml" },

  // ---- Official: UK --------------------------------------------------------
  { id: "govuk-ai", name: "GOV.UK news", type: "official", kind: "rss", tracks: ["ai"], presumed: [], region: "other", jurisdiction: "United Kingdom", url: "https://www.gov.uk/search/news-and-communications.atom?keywords=artificial+intelligence+regulation" },
  { id: "govuk-privacy", name: "GOV.UK news", type: "official", kind: "rss", tracks: ["privacy"], presumed: [], region: "other", jurisdiction: "United Kingdom", url: "https://www.gov.uk/search/news-and-communications.atom?keywords=data+protection" },

  // ---- Official: US --------------------------------------------------------
  {
    id: "federal-register", name: "Federal Register", type: "official", kind: "federal-register", tracks: ["ai", "privacy"], presumed: [], region: "us", jurisdiction: "United States",
    queries: {
      ai: ['"artificial intelligence"'],
      privacy: ['"data privacy"', '"consumer privacy"', '"personal data" privacy'],
    },
    exclude: /Privacy Act of 1974|System of Records|Matching Program/i,
  },
  { id: "ftc", name: "Federal Trade Commission", type: "official", kind: "rss", tracks: ["ai", "privacy"], presumed: [], region: "us", jurisdiction: "United States", url: "https://www.ftc.gov/feeds/press-release.xml" },
  { id: "nist", name: "NIST", type: "official", kind: "rss", tracks: ["ai", "privacy"], presumed: [], region: "us", jurisdiction: "United States", url: "https://www.nist.gov/news-events/news/rss.xml" },
  { id: "govinfo-bills", name: "Congress bills (GovInfo)", type: "official", kind: "rss", tracks: ["ai", "privacy"], presumed: [], region: "us", jurisdiction: "United States", url: "https://www.govinfo.gov/rss/bills.xml" },
  { id: "ca-ag", name: "California Attorney General", type: "official", kind: "rss", tracks: ["privacy", "ai"], presumed: [], region: "us", jurisdiction: "California", url: "https://oag.ca.gov/news/feed" },

  // ---- Official: Asia ------------------------------------------------------
  { id: "hk-gov", name: "Hong Kong Government press releases", type: "official", kind: "rss", tracks: ["ai", "privacy"], presumed: [], region: "asia", jurisdiction: "Hong Kong", url: "https://www.info.gov.hk/gia/rss/general_en.xml" },

  // ---- Analysis (law firms, research centres, specialist newsletters) ------
  { id: "china-law-translate", name: "China Law Translate", type: "analysis", kind: "rss", tracks: ["ai", "privacy"], presumed: [], region: "asia", jurisdiction: "China", url: "https://www.chinalawtranslate.com/feed/" },
  { id: "fpf", name: "Future of Privacy Forum", type: "analysis", kind: "rss", tracks: ["privacy", "ai"], presumed: [], region: null, jurisdiction: null, url: "https://fpf.org/feed/" },
  { id: "inside-privacy", name: "Inside Privacy (Covington)", type: "analysis", kind: "rss", tracks: ["privacy", "ai"], presumed: ["privacy"], region: null, jurisdiction: null, url: "https://www.insideprivacy.com/feed/" },
  { id: "inside-global-tech", name: "Inside Global Tech (Covington)", type: "analysis", kind: "rss", tracks: ["ai", "privacy"], presumed: [], region: null, jurisdiction: null, url: "https://www.insideglobaltech.com/feed/" },
  { id: "data-protection-report", name: "Data Protection Report (Norton Rose Fulbright)", type: "analysis", kind: "rss", tracks: ["privacy", "ai"], presumed: ["privacy"], region: null, jurisdiction: null, url: "https://www.dataprotectionreport.com/feed/" },
  { id: "privacy-matters", name: "Privacy Matters (DLA Piper)", type: "analysis", kind: "rss", tracks: ["privacy", "ai"], presumed: ["privacy"], region: null, jurisdiction: null, url: "https://privacymatters.dlapiper.com/feed/" },
  { id: "hunton", name: "Hunton Privacy & Information Security Law", type: "analysis", kind: "rss", tracks: ["privacy", "ai"], presumed: ["privacy"], region: null, jurisdiction: null, url: "https://www.hunton.com/privacy-and-information-security-law/feed" },

  // ---- News searches (Google News), one source per region -----------------
  googleNews("gnews-eu", "eu", { ai: [EU_AI], privacy: [EU_PRIVACY] }),
  googleNews("gnews-us", "us", { ai: [US_AI], privacy: [US_PRIVACY] }),
  googleNews("gnews-asia", "asia", { ai: [ASIA_AI_1, ASIA_AI_2], privacy: [ASIA_PRIVACY_1, ASIA_PRIVACY_2] }),
];
