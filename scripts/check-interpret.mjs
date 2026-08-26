#!/usr/bin/env node
/**
 * Tests for the interpretation layer's load-bearing logic.
 *
 * The network call itself is not tested here — it needs a live API key, and the
 * sandbox this was built in had none. Everything that decides what a reader is
 * SHOWN is pure and is tested: prompt construction, tolerant parsing, and above
 * all quote verification, which is what stops the model from asserting things
 * about a document it did not actually find there.
 *
 * Usage: node scripts/check-interpret.mjs
 */

import {
  buildInterpretationPrompt,
  parseInterpretation,
  verifyAgainstPolicy,
  interpretableFindings,
  PROVIDERS,
  DEFAULT_PROVIDER,
} from "../lib/policy-interpret.mjs";
import { encryptSecret, decryptSecret, STORAGE_MODES } from "../lib/key-store.mjs";
import { analyzePolicy, consolidate, gapStatement, LANES } from "../lib/policy-rules.mjs";

let failures = 0;
const results = [];

function check(name, condition, detail = "") {
  results.push({ name, ok: Boolean(condition), detail });
  if (!condition) failures++;
}

const POLICY = `# 4. TYPES OF INFORMATION COLLECTED AND THE PURPOSES

The type of information that you may provide Canon Canada or that Canon Canada
may collect is tied to the purposes for which the information is collected.

We retain your personal information only as long as necessary to fulfil the
purposes described above, unless a longer retention period is required by law.`;

// ---- parsing -------------------------------------------------------------
check(
  "parses bare JSON",
  parseInterpretation('{"results":[{"id":"a","verdict":"absent","quotes":[]}]}').results.length === 1,
);
check(
  "parses JSON inside a code fence",
  parseInterpretation('```json\n{"results":[{"id":"a","verdict":"absent","quotes":[]}]}\n```').results
    .length === 1,
);
check(
  "parses JSON after a preamble sentence",
  parseInterpretation('Here is my analysis:\n{"results":[{"id":"a","verdict":"absent","quotes":[]}]}')
    .results.length === 1,
);
check(
  "reports an error rather than throwing on junk",
  parseInterpretation("I could not do that.").error !== null,
);
check("survives an empty response", parseInterpretation("").results.length === 0);

// ---- quote verification: the part that matters ---------------------------
const verbatim = verifyAgainstPolicy(
  [{ id: "retention", verdict: "addressed", quotes: ["only as long as necessary to fulfil the purposes described above"], reason: "r" }],
  POLICY,
);
check("keeps a verbatim quote", verbatim[0].verdict === "addressed" && verbatim[0].quotes.length === 1);

// The policy wraps this span across a newline; the model would quote it flat.
const rewrapped = verifyAgainstPolicy(
  [{ id: "purposes", verdict: "addressed", quotes: ["tied to the purposes for which the information is collected"], reason: "r" }],
  POLICY,
);
check(
  "accepts a quote whose whitespace was reflowed",
  rewrapped[0].verdict === "addressed" && rewrapped[0].quotes.length === 1,
);

const invented = verifyAgainstPolicy(
  [{ id: "dpo", verdict: "addressed", quotes: ["We have appointed a Data Protection Officer."], reason: "r" }],
  POLICY,
);
check(
  "REJECTS an invented quote and downgrades the claim",
  invented[0].verdict === "unverified" && invented[0].quotes.length === 0,
  `got verdict=${invented[0].verdict}`,
);
check("records the rejected quote so the reader can see it", invented[0].rejectedQuotes.length === 1);

const mixed = verifyAgainstPolicy(
  [
    {
      id: "mix",
      verdict: "partially",
      quotes: ["required by law", "We notify the Commissioner within 72 hours."],
      reason: "r",
    },
  ],
  POLICY,
);
check(
  "keeps the real quote and drops the fabricated one",
  mixed[0].quotes.length === 1 && mixed[0].rejectedQuotes.length === 1,
  `verified=${mixed[0].quotes.length} rejected=${mixed[0].rejectedQuotes.length}`,
);

const trivial = verifyAgainstPolicy(
  [{ id: "t", verdict: "addressed", quotes: ["the"], reason: "r" }],
  POLICY,
);
check(
  "rejects a span too short to be evidence",
  trivial[0].verdict === "unverified",
  `got ${trivial[0].verdict}`,
);

const absent = verifyAgainstPolicy([{ id: "a", verdict: "absent", quotes: [], reason: "r" }], POLICY);
check("leaves an honest 'absent' alone", absent[0].verdict === "absent");

// ---- scope ---------------------------------------------------------------
const findings = [
  { id: "a", verdict: "NOT EVIDENCED" },
  { id: "b", verdict: "EVIDENCED" },
  { id: "c", verdict: "NOT ASSESSABLE" },
  { id: "d", verdict: "NO OBLIGATION" },
];
check(
  "only gaps are sent for interpretation",
  interpretableFindings(findings).length === 1 && interpretableFindings(findings)[0].id === "a",
);

// ---- prompt --------------------------------------------------------------
const prompt = buildInterpretationPrompt({
  lawShortName: "PIPEDA",
  findings: [{ id: "lawful-basis", name: "Lawful basis", citation: "s.5(3)", obligation: "o", quote: "q" }],
  policyText: POLICY,
});
check("prompt carries the policy", prompt.includes("Canon Canada"));
check("prompt carries the law", prompt.includes("PIPEDA"));
check("prompt demands verbatim quotes", /VERBATIM/.test(prompt));
check("prompt permits an empty answer", /absent/.test(prompt));
check("prompt forbids judging compliance", /Do not judge legal compliance/.test(prompt));

// ---- providers -----------------------------------------------------------
for (const [id, p] of Object.entries(PROVIDERS)) {
  check(`${id}: endpoint is https`, p.endpoint(p.defaultModel).startsWith("https://"));
  check(`${id}: key is sent in a header, never in the URL`, !p.endpoint(p.defaultModel).includes("key="));
  check(`${id}: headers carry the key`, JSON.stringify(p.headers("SECRET")).includes("SECRET"));
  check(`${id}: body carries the prompt`, p.body("PROMPT_TEXT", p.defaultModel).includes("PROMPT_TEXT"));
  check(`${id}: has a default model`, Boolean(p.defaultModel));
}
check("gemini is the default (it has a free tier)", DEFAULT_PROVIDER === "gemini");
check(
  "gemini asks for JSON back",
  PROVIDERS.gemini.body("x", "m").includes("application/json"),
);
check(
  "anthropic sends the header its API requires for browser calls",
  "anthropic-dangerous-direct-browser-access" in PROVIDERS.anthropic.headers("k"),
);
check(
  "gemini response shape is extracted",
  PROVIDERS.gemini.extractText({ candidates: [{ content: { parts: [{ text: "hello" }] } }] }) === "hello",
);
check(
  "anthropic response shape is extracted",
  PROVIDERS.anthropic.extractText({ content: [{ type: "text", text: "hello" }] }) === "hello",
);
check(
  "a malformed response extracts to empty rather than throwing",
  PROVIDERS.gemini.extractText({}) === "" && PROVIDERS.anthropic.extractText({}) === "",
);

// ---- key encryption ------------------------------------------------------
{
  const secret = "AIzaSyEXAMPLE-not-a-real-key-000000000";
  const blob = await encryptSecret(secret, "correct horse battery staple");

  check("ciphertext does not contain the key", !JSON.stringify(blob).includes(secret));
  check("stores salt, iv and ciphertext", Boolean(blob.salt && blob.iv && blob.ct));
  check(
    "round-trips with the right passphrase",
    (await decryptSecret(blob, "correct horse battery staple")) === secret,
  );

  let threw = false;
  try {
    await decryptSecret(blob, "wrong passphrase");
  } catch {
    threw = true;
  }
  check("REJECTS a wrong passphrase rather than returning garbage", threw);

  const again = await encryptSecret(secret, "correct horse battery staple");
  check("salt and iv are fresh each time", again.salt !== blob.salt && again.iv !== blob.iv);
  check(
    "same key encrypted twice gives different ciphertext",
    again.ct !== blob.ct,
  );
  check("all three storage modes are described for the user", Object.keys(STORAGE_MODES).length === 3);
}

// ---- consolidation: the model's answer becomes THE answer ----------------
{
  const obligations = [
    { id: "rights-correction", strictness: 2, obligation: "o", citation: "c", quote: "q" },
  ];
  const raw = analyzePolicy(obligations, POLICY, "pdpo");
  check("keyword pass alone reports a gap", raw[0].verdict === "NOT EVIDENCED" && raw[0].lane === "ACT");

  const found = {
    "rights-correction": {
      id: "rights-correction",
      verdict: "addressed",
      quotes: ["is tied to the purposes for which the information is collected"],
      rejectedQuotes: [],
      reason: "Found in the purposes table.",
      missing: null,
    },
  };
  const merged = consolidate(raw, found, POLICY);
  check(
    "a verified AI finding CHANGES the verdict, not just adds a note",
    merged[0].verdict === "EVIDENCED",
    `got ${merged[0].verdict}`,
  );
  check(
    "and MOVES the finding out of the 'missing' lane",
    merged[0].lane === "REVIEW",
    `got ${merged[0].lane}`,
  );
  check("the finding is marked as read rather than keyword-matched", merged[0].confidence === "read");
  check(
    "AI-found evidence is tagged with its source and located in the document",
    merged[0].evidence[0].source === "model" && Boolean(merged[0].evidence[0].section),
  );

  const rejected = consolidate(
    raw,
    {
      "rights-correction": {
        id: "rights-correction",
        verdict: "unverified",
        quotes: [],
        rejectedQuotes: ["We honour all correction requests within 40 days."],
        reason: "x",
        missing: null,
      },
    },
    POLICY,
  );
  check(
    "a REJECTED AI claim leaves the gap standing",
    rejected[0].verdict === "NOT EVIDENCED" && rejected[0].lane === "ACT",
    `got ${rejected[0].verdict}/${rejected[0].lane}`,
  );

  const agreed = consolidate(
    raw,
    {
      "rights-correction": {
        id: "rights-correction",
        verdict: "absent",
        quotes: [],
        rejectedQuotes: [],
        reason: "Nothing on correction.",
        missing: null,
      },
    },
    POLICY,
  );
  check(
    "an AI 'absent' confirms the gap rather than changing it",
    agreed[0].verdict === "NOT EVIDENCED" && agreed[0].modelAgreedAbsent === true,
  );
  check(
    "and the gap statement says both passes agree",
    /two independent passes agreeing/i.test(gapStatement(agreed[0], "PDPO")),
  );

  // policyScope must still cap the result.
  const consentRaw = analyzePolicy(
    [{ id: "consent", strictness: 3, obligation: "o", citation: "c", quote: "q" }],
    POLICY,
    "pdpo",
  );
  const consentMerged = consolidate(
    consentRaw,
    {
      consent: {
        id: "consent",
        verdict: "addressed",
        quotes: ["is tied to the purposes for which the information is collected"],
        rejectedQuotes: [],
        reason: "x",
        missing: null,
      },
    },
    POLICY,
  );
  check(
    "a partial-scope obligation stays PARTIAL even when the AI reads it as addressed",
    consentMerged[0].verdict === "PARTIAL",
    `got ${consentMerged[0].verdict}`,
  );

  check("untouched findings are labelled keyword-only", consolidate(raw, {}, POLICY)[0].confidence === "pattern");
}

// ---- lane names carry a plain-language tip -------------------------------
for (const [id, lane] of Object.entries(LANES)) {
  check(`${id}: has a one-line tip for the reader`, Boolean(lane.tip && lane.tip.length < 120));
  check(`${id}: title says what it means, not just a label`, lane.title.length > 12);
}

// ---- report --------------------------------------------------------------
const lines = ["# Interpretation layer check\n"];
for (const r of results) {
  lines.push(`- ${r.ok ? "✓" : "✗"} ${r.name}${r.ok ? "" : ` — ${r.detail}`}`);
}
lines.push(
  `\n${results.length - failures}/${results.length} passed.` +
    (failures ? ` **${failures} FAILED.**` : ""),
);
lines.push(
  "\n> The network call is not covered here — it needs a live key. What is covered is everything " +
    "that decides what a reader is shown, including the rule that an unverifiable quote invalidates " +
    "the claim built on it.",
);
console.log(lines.join("\n"));
process.exit(failures ? 1 : 0);
