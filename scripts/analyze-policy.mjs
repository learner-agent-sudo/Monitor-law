#!/usr/bin/env node
/**
 * Gap analysis #2 — a privacy policy against a law.
 *
 * This is deliberately NOT a compliance score. It produces three things per
 * obligation:
 *   1. what the law requires, quoted verbatim from corpus/<lawId>.md
 *   2. what the policy says, quoted verbatim from the policy file
 *   3. whether (2) appears to address (1)
 *
 * Both sides are quoted so every finding is checkable rather than taken on
 * trust. The deterministic pass below locates candidate clauses; a human (or a
 * model) then judges sufficiency, and that judgement is recorded separately
 * from the evidence.
 *
 * Three things this cannot tell you:
 *   - Absence of a clause is NOT proof of non-compliance. The practice may
 *     exist and simply not be described. Findings say "not evidenced", never
 *     "non-compliant".
 *   - Presence of a clause is NOT proof of compliance. "We take security
 *     seriously" satisfies nothing.
 *   - A policy is one artifact. Obligations discharged through contracts,
 *     records or internal assessments are reported as NOT ASSESSABLE.
 *
 * Usage:
 *   node scripts/analyze-policy.mjs <policy-file> <lawId> [--json] [--interpret|--prompt]
 *   e.g. node scripts/analyze-policy.mjs policies/yuja.md gdpr
 *
 *   --interpret  after the deterministic pass, send the gaps and the policy to
 *                the Anthropic API to be read properly. Needs ANTHROPIC_API_KEY.
 *                Every quote returned is verified against the policy before it
 *                is printed; unverifiable claims are discarded.
 *   --prompt     print that prompt instead of sending it, to run elsewhere.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzePolicy, gapStatement, LANES, LANE_ORDER } from "../lib/policy-rules.mjs";
import { BASIS } from "../lib/policy-remediation.mjs";
import {
  buildInterpretationPrompt,
  interpretableFindings,
  parseInterpretation,
  requestInterpretation,
  verifyAgainstPolicy,
  INTERPRET_STATES,
} from "../lib/policy-interpret.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const [, , policyPath, lawId, ...rest] = process.argv;
const asJson = rest.includes("--json");
const wantInterpret = rest.includes("--interpret");
const wantPrompt = rest.includes("--prompt");

if (!policyPath || !lawId) {
  console.error(
    "usage: node scripts/analyze-policy.mjs <policy-file> <lawId> [--json] [--interpret|--prompt]",
  );
  process.exit(2);
}
if (!existsSync(policyPath)) {
  console.error(`policy file not found: ${policyPath}`);
  process.exit(2);
}

// ---- load the law's obligations (with their anchored quotes) --------------
const lawFile = join(ROOT, "lib", "data", "laws", `${lawId}.ts`);
if (!existsSync(lawFile)) {
  console.error(`no such law: ${lawId}`);
  process.exit(2);
}
const lawSrc = readFileSync(lawFile, "utf8");
const shortName = lawSrc.match(/shortName:\s*"([^"]*)"/)?.[1] ?? lawId;

const obligations = [];
{
  const re = /\n {4}(?:"([a-z0-9-]+)"|([a-zA-Z_$][\w$]*))\s*:\s*\{([\s\S]*?)\n {4}\}/g;
  let m;
  while ((m = re.exec(lawSrc))) {
    const id = m[1] ?? m[2];
    const body = m[3];
    obligations.push({
      id,
      strictness: Number(body.match(/strictness:\s*(\d)/)?.[1] ?? 0),
      obligation: body.match(/obligation:\s*\n?\s*"((?:[^"\\]|\\.)*)"/)?.[1] ?? "",
      citation: body.match(/citation:\s*"([^"]*)"/)?.[1] ?? "",
      quote: body.match(/quote:\s*\n?\s*"((?:[^"\\]|\\.)*)"/)?.[1] ?? null,
    });
  }
}


// ---- analyse (shared with the browser page — one implementation) ----------
// Fixtures in policies/ carry a YAML front-matter block recording where the
// text came from. That block is commentary about the policy, not the policy,
// and analysing it produces nonsense — a provenance note mentioning "lawful
// basis" was matched as though the policy itself had said it. Stripped here
// rather than in analyzePolicy(), because pasted text in the browser never has
// front matter and a leading "---" there is a horizontal rule.
const raw = readFileSync(policyPath, "utf8");
const policyText = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
const findings = analyzePolicy(obligations, policyText, lawId);

// ---- layer 2: interpretation over the gaps only ---------------------------
// The deterministic pass above is free, instant and reproducible. This is none
// of those, so it runs only where patterns found nothing, and only when asked.
const interpretations = {};
if (wantInterpret || wantPrompt) {
  const gaps = interpretableFindings(findings);
  if (!gaps.length) {
    if (wantPrompt) {
      console.error("nothing to interpret: the deterministic pass found evidence for every obligation");
      process.exit(0);
    }
  } else {
    const prompt = buildInterpretationPrompt({
      lawShortName: shortName,
      findings: gaps,
      policyText,
    });

    if (wantPrompt) {
      console.log(prompt);
      process.exit(0);
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error(
        "--interpret needs ANTHROPIC_API_KEY. Use --prompt to print the prompt and run it elsewhere.",
      );
      process.exit(2);
    }

    try {
      const raw = await requestInterpretation({ apiKey, prompt });
      const { results, error } = parseInterpretation(raw);
      if (error) throw new Error(error);
      // Verified against the policy before anything is printed.
      for (const r of verifyAgainstPolicy(results, policyText)) interpretations[r.id] = r;
    } catch (e) {
      console.error(`interpretation failed: ${e.message}`);
      console.error("the deterministic findings below are unaffected.");
    }
  }
}

if (asJson) {
  console.log(JSON.stringify({ lawId, shortName, policyPath, findings }, null, 2));
  process.exit(0);
}

const inLane = (l) => findings.filter((f) => f.lane === l);

// Practice first, paper second — but the instruction differs by lane. Telling
// someone to change a practice their policy already describes would be wrong,
// and so would offering publishable wording for a duty that lives in a
// contract. Kept in step with app/policy-check/PolicyChecker.tsx.
const STEP_LABELS = {
  ACT: { practice: "Change the practice", clause: "Then publish wording along these lines" },
  REVIEW: { practice: "Confirm the practice behind the wording", clause: "Compare your wording against this" },
  CONSIDER: { practice: "What you could do", clause: "Optional wording" },
  ELSEWHERE: { practice: "Build or check this artefact", clause: "Policy wording" },
};

/** "[required by law — Art. 6]" / "[our recommendation]" */
const tag = (item) => {
  const b = BASIS[item.basis] ?? BASIS.practice;
  return item.cite ? `_[${b.label.toLowerCase()} — ${item.cite}]_` : `_[${b.label.toLowerCase()}]_`;
};
const out = [];
out.push(`# Action plan — ${policyPath} vs ${shortName}\n`);
out.push(
  `**${inLane("ACT").length}** to fix · **${inLane("REVIEW").length}** to review · ` +
    `**${inLane("CONSIDER").length}** to consider · ` +
    `**${inLane("ELSEWHERE").length}** to check outside the policy · ` +
    `**${inLane("NONE").length}** not required by this law\n`,
);
out.push(
  "> Absence of a clause is not proof of non-compliance, and presence of one is not proof of compliance. " +
    "This locates evidence; it does not reach a legal conclusion. Every draft clause below is a starting " +
    "point with blanks to fill — publish it only once the practice it describes is actually true.\n",
);
out.push(
  "> Every step below is tagged with its basis, so you can tell what the statute demands from what is " +
    "merely recommended: " +
    Object.values(BASIS)
      .map((b) => `**${b.label}** — ${b.blurb}`)
      .join(" · ") +
    "\n",
);

for (const lane of LANE_ORDER) {
  const rows = inLane(lane);
  if (!rows.length) continue;
  out.push(`\n## ${LANES[lane].title} (${rows.length})\n`);
  out.push(`_${LANES[lane].blurb}_\n`);

  // "Nothing required" needs no detail — one line each keeps the taxonomy
  // visible without burying the work that does need doing.
  if (lane === "NONE") {
    for (const f of rows) out.push(`- **${f.id}** — ${f.scopeReason}`);
    out.push("");
    continue;
  }

  for (const f of rows) {
    out.push(`### ${f.id} — ${f.citation}${f.severity ? ` _(${f.severity.label})_` : ""}`);

    // ① what the policy says, and where. ② what the law says. ③ the gap.
    // ④ how to close it. Same order every time, so the reader can follow the
    // reasoning from their own document to the statute and back.
    out.push(`\n**① Your policy**`);
    if (f.evidence.length) {
      for (const e of f.evidence) {
        out.push(`- ${e.section ? `**${e.section}:** ` : ""}“${e.text}”`);
      }
    } else {
      out.push(`- _No wording matching this obligation's search terms was located._`);
    }
    // Show the search terms themselves. A reader who can see that the tool
    // looked for "lawful basis" can tell at a glance that their policy uses
    // different words for the same thing — which is a fact about the probe,
    // not a fact about their policy.
    if (f.searched?.length) {
      out.push(
        `\n<sub>Matched by text search — looked for: ` +
          f.searched.map((s) => `${s.found ? "✓" : "✗"} ${s.label}`).join(" · ") +
          `</sub>`,
      );
    }

    out.push(`\n**② ${shortName} — ${f.citation}**`);
    out.push(f.obligation);
    if (f.quote) out.push(`> ${f.quote}`);

    out.push(`\n**③ The gap**`);
    out.push(gapStatement(f, shortName));
    if (f.elements?.length) {
      for (const e of f.elements) {
        out.push(
          `- ${e.found ? "✓" : "✗"} ${e.label}` +
            (e.found && e.section ? ` — located in ${e.section}` : "") +
            (e.found ? "" : " — _not located_"),
        );
      }
    }
    if (lane === "ELSEWHERE") out.push(`\n_${f.scopeReason}_`);

    // Second opinion, if one was requested and survived quote verification.
    const ip = interpretations[f.id];
    if (ip) {
      const state = INTERPRET_STATES[ip.verdict] ?? INTERPRET_STATES.absent;
      out.push(`\n**Second opinion — read by a model: ${state.label}**`);
      out.push(`_${state.blurb}_`);
      if (ip.reason) out.push(ip.reason);
      for (const q of ip.quotes) out.push(`> “${q}” _(verified present in the policy)_`);
      if (ip.missing) out.push(`**Still not covered:** ${ip.missing}`);
      if (ip.rejectedQuotes.length) {
        out.push(
          `⚠️ ${ip.rejectedQuotes.length} quote(s) discarded — not found in the document, so any ` +
            `claim resting on them was dropped.`,
        );
      }
    }

    out.push(
      `\n**④ How to close it**` +
        (f.editTarget ? ` — amend ${f.editTarget}` : f.evidence.length ? "" : " — insert new wording"),
    );

    const r = f.remediation;
    if (r) {
      const labels = STEP_LABELS[lane];
      if (r.lawNote) out.push(`\n**Under ${shortName}:** ${r.lawNote}`);
      if (r.requiredCount === 0 && r.totalCount > 0) {
        out.push(
          `\n> **Nothing below is required by ${shortName}.** Every step here is our recommendation ` +
            `for how to discharge the duty, not a rule the statute imposes. Disagree freely.`,
        );
      }
      if (r.steps?.length) {
        out.push(`\n**1 · ${labels.practice}**`);
        r.steps.forEach((s, i) => out.push(`${i + 1}. ${s.text} ${tag(s)}`));
      }
      if (r.clause) {
        const where = f.editTarget
          ? `2 · Amend ${f.editTarget} — suggested wording`
          : `2 · ${labels.clause}`;
        out.push(`\n**${where}** ${tag(r.clause)}`);
        if (r.clauseNote) out.push(`\n${r.clauseNote}`);
        out.push("```markdown");
        out.push(r.clause.text);
        out.push("```");
      } else if (r.clauseNote) {
        out.push(`\n**2 · Policy wording:** ${r.clauseNote}`);
      }
      if (r.warning) out.push(`\n⚠️ ${r.warning}`);
    }
    out.push("");
  }
}
console.log(out.join("\n"));
