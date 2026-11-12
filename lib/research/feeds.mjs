/**
 * Fetching and parsing for the research agents.
 *
 * Parsing is regex-based on purpose: no dependencies, and it must never throw.
 * Feed content is untrusted: tags are stripped, entities decoded, and only
 * http(s) links are ever accepted.
 *
 * fetchSource() never throws. A dead source comes back as { items: [], error }.
 */

import { createHash } from "node:crypto";

// Feed servers accept the conventional "compatible" form. The name still says what this is.
const USER_AGENT = "Mozilla/5.0 (compatible; law-monitor-agent/1.0; feed reader)";
const ACCEPT = "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, */*";
const TIMEOUT_MS = 25_000;
const DAY_MS = 86_400_000;

const NAMED_ENTITIES = new Map([
  ["amp", "&"], ["lt", "<"], ["gt", ">"], ["quot", '"'], ["apos", "'"], ["nbsp", " "],
  ["mdash", "—"], ["ndash", "–"], ["lsquo", "‘"], ["rsquo", "’"],
  ["ldquo", "“"], ["rdquo", "”"], ["hellip", "…"], ["euro", "€"],
  ["pound", "£"], ["copy", "©"], ["reg", "®"], ["middot", "·"], ["sect", "§"],
]);

/** Decodes named and numeric HTML/XML entities in one pass. */
export function decodeEntities(text) {
  return String(text ?? "").replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, body) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return "";
      try {
        return String.fromCodePoint(code);
      } catch {
        return "";
      }
    }
    return NAMED_ENTITIES.has(body) ? NAMED_ENTITIES.get(body) : match;
  });
}

/** Removes tag-like markup. Text such as "a < b" is left alone. */
export function stripTags(text) {
  return String(text ?? "").replace(/<\/?[a-zA-Z!][^>]*>/g, " ");
}

function unwrapCdata(text) {
  return String(text ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

/** Plain text from a feed field: CDATA unwrapped, entities decoded, tags stripped. */
export function cleanText(raw) {
  if (raw == null) return "";
  let s = decodeEntities(unwrapCdata(raw));
  s = stripTags(s);
  s = decodeEntities(s); // catches HTML that was entity-escaped inside the feed
  return s.replace(/\s+/g, " ").trim();
}

/** A URL field: CDATA unwrapped and entities decoded, nothing else. */
function textOf(raw) {
  if (raw == null) return "";
  return decodeEntities(unwrapCdata(raw)).trim();
}

function getTag(block, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}\\s*>`, "i");
  const m = block.match(re);
  return m ? m[1] : null;
}

function parseAttrs(s) {
  const out = {};
  for (const m of String(s).matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    out[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? "");
  }
  return out;
}

function parseDate(raw) {
  const s = textOf(raw);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Builds one normalised item. Google News appends " - Publisher" to every
 * title; that suffix is removed when it equals the publisher.
 */
function record({ title, url, description, published, publisher }) {
  const pub = cleanText(publisher) || null;
  let t = cleanText(title);
  if (pub && t.endsWith(` - ${pub}`)) t = t.slice(0, -(pub.length + 3)).trim();
  let d = cleanText(description);
  if (t && d.startsWith(t)) d = d.slice(t.length).trim();
  if (pub && d === pub) d = "";
  return { title: t, url: textOf(url), description: d, published: parseDate(published), publisher: pub };
}

function rssEntries(xml) {
  const out = [];
  for (const m of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item\s*>/gi)) {
    const b = m[1];
    out.push(
      record({
        title: getTag(b, "title"),
        url: getTag(b, "link") ?? getTag(b, "guid"),
        description: getTag(b, "description") ?? getTag(b, "content:encoded") ?? getTag(b, "summary"),
        published: getTag(b, "pubDate") ?? getTag(b, "dc:date") ?? getTag(b, "published"),
        publisher: getTag(b, "source"),
      }),
    );
  }
  return out;
}

function pickAtomLink(block) {
  for (const m of block.matchAll(/<link\b([^>]*?)\/?>/gi)) {
    const attrs = parseAttrs(m[1]);
    if (!attrs.href) continue;
    const rel = (attrs.rel ?? "alternate").toLowerCase();
    if (rel === "alternate") return attrs.href;
  }
  return null;
}

function atomEntries(xml) {
  const out = [];
  for (const m of xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry\s*>/gi)) {
    const b = m[1];
    out.push(
      record({
        title: getTag(b, "title"),
        url: pickAtomLink(b),
        description: getTag(b, "summary") ?? getTag(b, "content"),
        published: getTag(b, "published") ?? getTag(b, "updated"),
        publisher: null,
      }),
    );
  }
  return out;
}

/**
 * Parses RSS 2.0, Atom and Google News RSS. Returns [] for anything it cannot
 * read; never throws.
 * @returns {{title:string, url:string, description:string, published:Date|null, publisher:string|null}[]}
 */
export function parseFeed(xml) {
  try {
    if (typeof xml !== "string" || xml.length === 0) return [];
    return [...rssEntries(xml), ...atomEntries(xml)];
  } catch {
    return [];
  }
}

/** True when the body is a feed document at all (an empty feed still counts). */
export function looksLikeFeed(xml) {
  return typeof xml === "string" && /<(?:rss|feed|rdf:RDF)\b/i.test(xml);
}

/** Only http:// and https:// links are ever accepted. */
export function isHttpUrl(url) {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url.trim())) return false;
  try {
    new URL(url.trim());
    return true;
  } catch {
    return false;
  }
}

/**
 * Canonical form of a URL for identity: lower-case host, no fragment, no
 * tracking parameters, no trailing slash on the path.
 */
export function canonicalUrl(url) {
  const raw = String(url ?? "").trim();
  let u;
  try {
    u = new URL(raw);
  } catch {
    return raw;
  }
  u.hash = "";
  for (const key of new Set([...u.searchParams.keys()])) {
    const k = key.toLowerCase();
    if (k.startsWith("utm_") || k === "fbclid" || k === "gclid") u.searchParams.delete(key);
  }
  const path = u.pathname.replace(/\/+$/, "");
  const search = u.searchParams.toString();
  return `${u.protocol}//${u.host.toLowerCase()}${path}${search ? `?${search}` : ""}`;
}

/** Stable 12-hex-character id for an item: first 12 characters of sha1(canonical URL). */
export function itemId(url) {
  return createHash("sha1").update(canonicalUrl(url)).digest("hex").slice(0, 12);
}

function shortError(e) {
  return String(e?.message ?? e ?? "error").replace(/\s+/g, " ").slice(0, 120);
}

function networkError(e) {
  if (e?.name === "TimeoutError" || e?.name === "AbortError") return "timed out";
  const code = e?.cause?.code ?? e?.code;
  return shortError(code || e?.message || "network error");
}

async function httpGet(url, o) {
  let res;
  try {
    res = await o.fetchImpl(url, {
      headers: { "User-Agent": USER_AGENT, Accept: ACCEPT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
    });
  } catch (e) {
    return { error: networkError(e) };
  }
  if (!res || !res.ok) return { error: `HTTP ${res ? res.status : "no response"}` };
  try {
    return { text: await res.text() };
  } catch (e) {
    return { error: networkError(e) };
  }
}

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function parseFederalRegister(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { error: "response was not JSON" };
  }
  if (!json || !Array.isArray(json.results)) return { error: "unexpected response shape" };
  return {
    items: json.results.map((r) => ({
      title: cleanText(r.title),
      url: textOf(r.html_url),
      description: cleanText(r.abstract),
      published: parseDate(r.publication_date),
      publisher: cleanText(r.agencies?.[0]?.name) || null,
    })),
  };
}

function parseGoogleNews(text) {
  if (!looksLikeFeed(text)) return { error: "response is not a feed" };
  return { items: parseFeed(text) };
}

/** Runs one request per query. Partial failure keeps the items that did arrive. */
async function runQueries(queries, o, { url, parse }) {
  if (!queries || queries.length === 0) return { items: [], error: "no queries for this track" };
  const items = [];
  const errors = [];
  for (let i = 0; i < queries.length; i++) {
    const r = await httpGet(url(queries[i]), o);
    if (r.error) {
      errors.push(r.error);
      continue;
    }
    const parsed = parse(r.text);
    if (parsed.error) {
      errors.push(parsed.error);
      continue;
    }
    items.push(...parsed.items);
  }
  if (errors.length === 0) return { items, error: null };
  if (errors.length === queries.length) return { items: [], error: errors[0] };
  return { items, error: `${errors.length} of ${queries.length} queries failed: ${errors[0]}` };
}

async function collect(source, track, o) {
  const queries = source.queries?.[track];
  switch (source.kind) {
    case "rss": {
      const r = await httpGet(source.url, o);
      if (r.error) return { items: [], error: r.error };
      if (!looksLikeFeed(r.text)) return { items: [], error: "response is not a feed" };
      return { items: parseFeed(r.text), error: null };
    }
    case "federal-register":
      return runQueries(queries, o, {
        url: (q) =>
          `https://www.federalregister.gov/api/v1/documents.json?per_page=40&order=newest` +
          `&conditions[term]=${encodeURIComponent(q)}` +
          `&conditions[publication_date][gte]=${ymd(new Date(o.now.getTime() - o.days * DAY_MS))}`,
        parse: parseFederalRegister,
      });
    case "google-news": {
      const days = Math.min(o.days, 30);
      return runQueries(queries, o, {
        url: (q) =>
          `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:${days}d`)}&hl=en-US&gl=US&ceid=US:en`,
        parse: parseGoogleNews,
      });
    }
    default:
      return { items: [], error: `unknown source kind: ${source.kind}` };
  }
}

/**
 * Fetches one source for one track. Never throws.
 * Items are filtered by the source's exclude rule, the lookback window and the
 * http(s) URL rule. `found` in the run record is the length of the returned items.
 * @returns {Promise<{items: object[], error: string|null}>}
 */
export async function fetchSource(source, track, options = {}) {
  const { fetchImpl = fetch, now = new Date(), lookbackDays = 4 } = options;
  try {
    const days = Math.max(1, Math.min(365, Math.floor(lookbackDays)));
    const o = { fetchImpl, now, days };
    const { items, error } = await collect(source, track, o);
    const cutoff = now.getTime() - days * DAY_MS;
    const kept = [];
    for (const it of items) {
      if (!it.title || !isHttpUrl(it.url)) continue;
      if (source.exclude && source.exclude.test(it.title)) continue;
      if (it.published && it.published.getTime() < cutoff) continue;
      const isNews = source.type === "news";
      kept.push({
        ...it,
        sourceId: source.id,
        source: isNews && it.publisher ? it.publisher : source.name,
        sourceType: source.type,
      });
    }
    return { items: kept, error: error ?? null };
  } catch (e) {
    return { items: [], error: shortError(e) };
  }
}
