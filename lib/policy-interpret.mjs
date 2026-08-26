// ---------------------------------------------------------------------------
// Layer 2 — interpretation, for what pattern matching cannot see.
//
// The deterministic pass is Ctrl-F with synonyms. It misses any clause phrased
// in words nobody wrote a probe for, and that failure mode is not hypothetical:
// a Canadian policy that identified its purposes exhaustively was reported as
// silent on "lawful basis" because the probe only knew the European phrase.
// Widening probes fixes the cases you have already found. It cannot fix the
// ones you have not.
//
// So: patterns first, interpretation second, and ONLY where patterns found
// nothing. That ordering matters. The deterministic pass is free, instant,
// private and reproducible; the model is none of those. Running it only on the
// gaps keeps the cost proportional and keeps every positive finding on the
// cheap, checkable path.
//
// THE MODEL IS HELD TO THE SAME EVIDENCE STANDARD AS EVERYTHING ELSE HERE.
//
// Every claim it makes must be anchored to a verbatim quote from the policy,
// and every quote is verified as an exact substring before it is shown. That is
// the same discipline this repository applies to statutory quotes, turned
// around to face the model. A quote that cannot be found in the document is
// dropped; a claim left with no surviving quote is downgraded to "unverified"
// and reported as such. The model gets to point at text. It does not get to
// assert.
//
// What interpretation may and may not do:
//   MAY   re-open a "not evidenced" finding as "possibly addressed", with
//         quotes, so a human can go and look.
//   MAY   say it found nothing, which raises confidence in the original gap.
//   NEVER declare compliance, and never overwrite the deterministic verdict.
//         Its output sits alongside as a clearly-labelled second opinion.
// ---------------------------------------------------------------------------

/**
 * Providers. The task is bounded reading comprehension over a few thousand
 * tokens, not reasoning, so the cheap fast tier of either family is the right
 * choice — and Gemini's free tier makes this usable with no spend at all.
 *
 * Both are called directly from the browser, which is only possible because
 * both allow it: Anthropic behind an explicit opt-in header, Google by serving
 * CORS headers for the calling origin. Verified for Google against this site's
 * own origin; the Anthropic path is documented but was never exercised with a
 * live key during development.
 *
 * `model` is editable in the UI on purpose. Model names change faster than this
 * repository will, and a hardcoded name that has been retired turns a working
 * feature into a mystery 404.
 */
export const PROVIDERS = {
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    note: "Has a free tier. Get a key at aistudio.google.com/apikey.",
    defaultModel: "gemini-2.5-flash",
    keyPlaceholder: "AIza… (your Google AI Studio key)",
    endpoint: (model) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    headers: (apiKey) => ({ "content-type": "application/json", "x-goog-api-key": apiKey }),
    body: (prompt) =>
      JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // Ask for JSON directly and pin the temperature: this is extraction,
        // and there is nothing to be gained from variety.
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    extractText: (body) =>
      (body?.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join(""),
    errorMessage: (body) => body?.error?.message ?? null,
  },

  anthropic: {
    id: "anthropic",
    label: "Anthropic Claude",
    note: "Paid API credit required — a Claude.ai subscription is not the same thing.",
    defaultModel: "claude-sonnet-5",
    keyPlaceholder: "sk-ant-… (your Anthropic API key)",
    endpoint: () => "https://api.anthropic.com/v1/messages",
    headers: (apiKey) => ({
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // Without this, the browser call is refused by design.
      "anthropic-dangerous-direct-browser-access": "true",
    }),
    body: (prompt, model) =>
      JSON.stringify({ model, max_tokens: 4096, messages: [{ role: "user", content: prompt }] }),
    extractText: (body) =>
      (body?.content ?? [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join(""),
    errorMessage: (body) => body?.error?.message ?? null,
  },
};

export const DEFAULT_PROVIDER = "gemini";

/** Back-compat for callers that only ever knew about one model. */
export const INTERPRET_MODEL = PROVIDERS.anthropic.defaultModel;

export const INTERPRET_STATES = {
  addressed: {
    id: "addressed",
    label: "Possibly addressed",
    blurb:
      "The model found wording it reads as addressing this, quoted below and verified as present in your text. Pattern matching missed it — read the quote and judge for yourself.",
  },
  partially: {
    id: "partially",
    label: "Partly addressed",
    blurb:
      "The model found related wording but considers it incomplete. Both the quote and what it says is missing are below.",
  },
  absent: {
    id: "absent",
    label: "Nothing found",
    blurb:
      "The model also found nothing addressing this. Two independent passes agreeing raises confidence in the gap — it does not prove it.",
  },
  unverified: {
    id: "unverified",
    label: "Claim rejected — quote not in your policy",
    blurb:
      "The model claimed this was addressed but the wording it quoted does not appear in your document. The claim has been discarded. Treat the original finding as standing.",
  },
};

/**
 * Same normalisation as scripts/check-quotes.mjs, for the same reason: a quote
 * should survive whitespace, smart quotes and dashes without those differences
 * being mistaken for invention.
 */
function normalize(text) {
  return String(text)
    .replace(/­/g, "")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/[    ]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

/**
 * Build the batched prompt. One call carries the whole policy and every gap,
 * rather than one call per finding: cheaper, and the model reads the document
 * once as a coherent whole instead of twenty times out of context.
 */
export function buildInterpretationPrompt({ lawShortName, findings, policyText }) {
  const items = findings.map((f) => ({
    id: f.id,
    requirement: f.name ?? f.id,
    citation: f.citation,
    requires: f.obligation,
    statute_quote: f.quote ?? null,
  }));

  return `You are checking whether a privacy policy contains wording that addresses specific legal obligations. A keyword search already ran and found nothing for the obligations below, but keyword search misses anything phrased in unexpected words. Your job is to read the policy properly and say whether it in fact addresses each one.

RULES — these are strict:
1. Quote VERBATIM. Every quote must be an exact, contiguous span copied from the policy text. Do not paraphrase, do not join fragments, do not tidy the wording. Quotes are checked against the document and any that do not match exactly are discarded.
2. If you cannot find wording that addresses an obligation, answer "absent" with an empty quotes array. Finding nothing is a useful and correct answer. Never invent or infer wording that is not there.
3. Judge only whether the POLICY TEXT ADDRESSES THE OBLIGATION. Do not judge legal compliance, adequacy, or whether the organisation actually does what it says. That is not your call.
4. Wording that addresses the obligation in different vocabulary still counts. A Canadian policy identifying its purposes addresses a purposes obligation even though it never says "lawful basis".

LAW: ${lawShortName}

OBLIGATIONS TO CHECK:
${JSON.stringify(items, null, 2)}

PRIVACY POLICY:
<policy>
${policyText}
</policy>

Reply with JSON only — no preamble, no code fence, no commentary:
{"results":[{"id":"<obligation id>","verdict":"addressed|partially|absent","quotes":["verbatim span from the policy"],"reason":"one or two plain sentences","missing":"what is still not covered, or null"}]}`;
}

/**
 * Pull the JSON payload out of a model reply. Tolerant of a stray code fence or
 * a sentence of preamble, because a hard parse failure would throw away a
 * usable answer over formatting.
 */
export function parseInterpretation(raw) {
  if (!raw || typeof raw !== "string") return { results: [], error: "empty response" };

  let body = raw.trim();
  const fence = body.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) body = fence[1].trim();
  else {
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start !== -1 && end > start) body = body.slice(start, end + 1);
  }

  try {
    const parsed = JSON.parse(body);
    const results = Array.isArray(parsed) ? parsed : parsed.results;
    if (!Array.isArray(results)) return { results: [], error: "no results array in response" };
    return { results, error: null };
  } catch (e) {
    return { results: [], error: `could not parse response as JSON (${e.message})` };
  }
}

/**
 * Verify every quote against the policy and downgrade anything unsupported.
 *
 * This is the load-bearing function of the whole feature. Without it the model
 * is simply asserting, and an asserted "your policy covers this" is worse than
 * the false gap it replaces — a false gap sends someone to look, a false
 * clearance stops them looking.
 */
export function verifyAgainstPolicy(results, policyText) {
  const haystack = normalize(policyText);

  return results.map((r) => {
    const claimed = Array.isArray(r.quotes) ? r.quotes.filter((q) => typeof q === "string" && q.trim()) : [];
    const verified = [];
    const rejected = [];

    for (const q of claimed) {
      // Very short spans match by accident; they are not evidence of anything.
      if (normalize(q).length < 12) {
        rejected.push(q);
        continue;
      }
      (haystack.includes(normalize(q)) ? verified : rejected).push(q);
    }

    const claimsSomething = r.verdict === "addressed" || r.verdict === "partially";

    return {
      id: r.id,
      // A claim that survives no quote is not a finding, it is a guess.
      verdict: claimsSomething && verified.length === 0 ? "unverified" : r.verdict === "absent" ? "absent" : r.verdict,
      quotes: verified,
      rejectedQuotes: rejected,
      reason: typeof r.reason === "string" ? r.reason : "",
      missing: typeof r.missing === "string" && r.missing.trim() ? r.missing : null,
    };
  });
}

/** Which findings are worth spending a call on: the gaps, not the whole list. */
export function interpretableFindings(findings) {
  return findings.filter((f) => f.verdict === "NOT EVIDENCED");
}

/**
 * Call the chosen provider directly from the browser.
 *
 * The key belongs to the person using the page. This site is a static export
 * with no backend, so there is nowhere to put a server-side key and nowhere to
 * hide one — and equally, nowhere for the operator of this site to see the
 * text. The trade is stated in the UI rather than buried: pattern matching
 * stays on your machine, interpretation does not.
 */
export async function requestInterpretation({
  apiKey,
  prompt,
  provider = DEFAULT_PROVIDER,
  model,
  signal = undefined,
}) {
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`unknown provider "${provider}"`);
  const useModel = model || p.defaultModel;

  const res = await fetch(p.endpoint(useModel), {
    method: "POST",
    signal,
    headers: p.headers(apiKey),
    body: p.body(prompt, useModel),
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = p.errorMessage(await res.json());
    } catch {
      /* response was not JSON; the status alone is the message */
    }
    throw new Error(`${p.label} returned HTTP ${res.status}${detail ? ` — ${detail}` : ""}`);
  }

  const text = p.extractText(await res.json());
  if (!text) throw new Error(`${p.label} returned an empty response`);
  return text;
}
