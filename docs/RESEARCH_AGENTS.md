# Research agents

The `/developments` page is filled by two agents. One watches AI law. The other watches privacy and data-protection law. Both look at the EU, the US and Asia.

## What they do, and when

Each agent runs once a day on GitHub Actions:

- AI law: about 21:17 UTC (`.github/workflows/research-ai-law.yml`)
- Privacy law: about 21:47 UTC (`.github/workflows/research-privacy-law.yml`)

Each run:

1. Reads a list of sources: official feeds (EU, UK, US, Hong Kong), law-firm and research blogs, and news searches.
2. Keeps items that are on topic and recent, and drops anything already stored.
3. Decides which items are real legal developments and writes a one-sentence summary. A small AI model does this when it is available. Otherwise keyword rules do it.
4. Saves the results to `lib/data/developments/ai.json` or `lib/data/developments/privacy.json`, commits them, and rebuilds the site.

## Where the results go

- `lib/data/developments/ai.json` and `lib/data/developments/privacy.json` hold the items, the time of the last check, which sources answered, and how summaries were written.
- The page reads those two files. Nothing is fetched by the browser.

## Running one by hand

On GitHub, go to Actions, pick "Research agent - AI law" or "Research agent - privacy law", then choose Run workflow. You can enter how many days back to look. Leave it empty for the default.

To run it on your own computer:

```bash
node scripts/research-agent.mjs --track ai --dry-run
```

`--dry-run` shows what would be added without writing anything. Run `node scripts/check-research.mjs` to run the offline tests.

## Adding or removing a source

Edit `lib/research/sources.mjs`. Each entry says what the source is, which agents read it, and how to fetch it. A new feed needs an `id`, a `name`, a `type`, `kind: "rss"`, the `tracks` it belongs to, and a `url`. Then run the offline tests.

## The AI model

Summaries come from GitHub Models, GitHub's own free model service. The workflow uses its built-in `GITHUB_TOKEN`, so no key needs to be added. The agent picks the smallest model that is available.

## When a source or the model is unavailable

- A source that fails (for example, an HTTP error or a timeout) is marked as failed in the run record and shown on the page. The other sources still run.
- If no model is available, the agent uses keyword rules only. Those items get the source's own description as the summary, marked as not AI-written.
- If every source fails, the stored items are left as they were. The page shows that the check ran and that no sources answered.

## Limits

- Summaries marked "AI summary" are written by a model from the headline and short description only. They can be wrong or incomplete.
- News items are secondary sources. A news story can misreport a development.
- Items are sorted by keyword rules and a model, not checked by a lawyer.
- Always open the source before relying on an item. This page is not legal advice.
