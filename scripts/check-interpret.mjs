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
} from "../lib/policy-interpret.mjs";

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
