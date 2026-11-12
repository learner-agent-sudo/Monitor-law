# Research agents

The `/developments` page is filled by two agents. One watches AI law. The other watches privacy and data-protection law. Both look at the EU, the US and Asia.

## What they do, and when

Each agent runs once a day on GitHub Actions:

- AI law: about 21:17 UTC (`.github/workflows/research-ai-law.yml`)
- Privacy law: about 21:47 UTC (`.github/workflows/research-privacy-law.yml`)

Each run:

1. Reads a list of sources: official feeds (EU, UK, US, Hong Kong), law-firm and research blogs, and Google News searches for each region.
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

Recent changes to the list: the EU AI Act Newsletter was removed because its host refuses requests from GitHub's servers. The EDPB, EDPS and European Parliament feeds are kept for now; they failed on the first live run and may recover with the new User-Agent.

## The AI model

Summaries come from GitHub Models, GitHub's own free model service. The workflow uses its built-in `GITHUB_TOKEN`, so no key needs to be added.

- The agent reads the model catalog and tries the cheapest suitable model first, up to four in order. A model is used only if its first batch of replies can be read. A model that answers with no usable content is passed over for the next one.
- If a model rejects one of the request settings (`max_tokens`, `temperature` or `response_format`), the agent retries that same model once with that setting changed.
- Every model decision is written to the run log and to the GitHub step summary under "Model notes". This includes the catalog size, the models tried in order, why each was rejected (with a short excerpt of the reply), and any failed batch. Notes are not saved in the data files and never contain the token.

If a run shows keyword-only results, read "Model notes" in the run's summary first. It says what went wrong.

## When a source or the model is unavailable

- A source that fails (for example, an HTTP error or a timeout) is marked as failed in the run record and shown on the page. The other sources still run.
- If no model is available, the agent uses keyword rules only. Those items get the source's own description as the summary, marked as not AI-written.
- Keyword rules are strict, because nothing else checks them. An item is kept only if its title is on topic (or the source is on topic by definition), its title reads as a legal development, and its title is not market news, an advert, a webinar, an opinion or a how-to. The on-topic test reads the title and only the first 300 characters of the description, so a long press release that mentions "AI" in passing does not count.
- If every source fails, the stored items are left as they were. The page shows that the check ran and that no sources answered.
- If a run finds nothing new to check, the previous "how summaries were written" note is kept, so the page keeps describing the stored items truthfully.

## How candidates are chosen and capped

- Official sources are reviewed first, then law-firm analysis, then news. This order decides which items reach the model when there are more candidates than it can review in one run.
- A news story is labelled with the region named in its headline when there is one. A US story found by the Asia search is therefore shown as US. If the headline names no place, the search's region is used.
- When the model is in use, it reviews at most 120 candidates a run (12 batches of 10). Any candidate it never received is not added. It is left for the next run, which fetches it again while it is still inside the look-back window. The run log says how many were left.
- Items decided by keyword rules (when no model is available, or when the model returned no usable answer for an item) are capped at 40 additions per run, highest score first. The run log says how many were held back.

## Stored data is never overwritten blindly

- If a store file is missing, the agent starts an empty one.
- If a store file exists but cannot be read, is not valid JSON, or does not have an `items` list, the agent stops with an error and writes nothing. Fix or restore the file, then run again. The error names the file.

## Limits

- Summaries marked "AI summary" are written by a model from the headline and short description only. They can be wrong or incomplete.
- News items are secondary sources. A news story can misreport a development.
- Items are sorted by keyword rules and a model, not checked by a lawyer.
- Always open the source before relying on an item. This page is not legal advice.
