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

Recent changes to the list: the EU AI Act Newsletter was removed because its host refuses requests from GitHub's servers. The European Parliament feed was removed because its address returns a web page rather than a feed. The EDPB and EDPS feeds are kept for now.

On the page, each source's status line says one of three things: "answered, N items" (items were kept), "answered, nothing new" (the feed was read, but every item was too old or filtered out), or "answered, but no items could be read" (the feed had nothing the agent could parse).

## The AI model

The agents use a small AI model to decide which items are real legal developments and to write their summaries. There are two options, tried in this order:

1. **Google Gemini**, if the repository has a secret named `GEMINI_API_KEY`. The owner can add one for free (see below).
2. **GitHub Models**, GitHub's own built-in model service. It uses the workflow's `GITHUB_TOKEN`, so no key needs to be added. It is used when no Gemini key is set, or when Gemini does not answer usefully.

If neither answers usefully, the agents still run on keyword rules (see below). Nothing breaks.

### Optionally, use Gemini

To use Google Gemini instead of GitHub's built-in model:

1. Get a free key from Google AI Studio (aistudio.google.com/apikey).
2. In GitHub, open the repository, then Settings, then Secrets and variables, then Actions, then New repository secret.
3. Name it `GEMINI_API_KEY` and paste the key. Save.

The key is never written to the data files and never appears in the logs. The next scheduled run uses it.

When an item is summarised by a model, the page says which model and which provider wrote it (for example, "written by the model gemini-2.5-flash-lite (Google Gemini)").

### How a model is chosen and used

- For each provider, the agent lists the models it offers and tries them in order, up to four for GitHub Models and three for Gemini. A model is used only if its first batch of replies can be read. A reply with no usable content is passed over for the next model.
- If a service answers with something that is not a reply at all (for example, a bare "OK"), the agent says so plainly in the notes and does not try its other models in that run.
- If a model rejects one of the request settings (`max_tokens`, `temperature` or `response_format`), the agent retries that same model once with that setting changed.
- Every decision is written to the run log and to the GitHub step summary under "Model notes". This includes the models tried in order, why each was rejected (with a short excerpt of the reply), and any failed batch. Notes are not saved in the data files. Keys and tokens are never written in notes or logs.

If a run shows keyword-only results, read "Model notes" in the run's summary first. It says what went wrong. The reason stored with the data is shorter, and the detail is only in the notes.

- The agent reads the model catalog and tries the cheapest suitable model first. A model that answers with no usable content is passed over for the next one.
- If a model rejects one of the request settings (`max_tokens`, `temperature` or `response_format`), the agent retries that same model once with that setting changed.
- Every model decision is written to the run log and to the GitHub step summary under "Model notes". This includes the catalog size, the models tried in order, why each was rejected (with a short excerpt of the reply), and any failed batch. Notes are not saved in the data files and never contain the token.

If a run shows keyword-only results, read "Model notes" in the run's summary first. It says what went wrong.

## When a source or the model is unavailable

- A source that fails (for example, an HTTP error or a timeout) is marked as failed in the run record and shown on the page. The other sources still run.
- If no model is available, the agent uses keyword rules only. Those items get the source's own description as the summary, marked as not AI-written.
- Keyword rules are strict, because nothing else checks them. An item is kept only if its title is on topic (or the source is on topic by definition), its title reads as a legal development, and its title is not market news, an advert, a webinar, an opinion or a how-to. The on-topic test reads the title and only the first 300 characters of the description, so a long press release that mentions "AI" in passing does not count.
- The same story from several outlets is kept once. Headlines dated within five days that share the key names, amounts and terms are treated as one story, whatever the wording, and the first one found is kept. Stored items are re-checked with these keyword rules at the start of every run, so an old mistake (for example, India's "CCPA" filed as California's privacy law) is corrected without editing the data.
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
