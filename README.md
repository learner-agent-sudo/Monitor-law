# Privacy Law Monitor

A website to monitor privacy & data-protection laws across jurisdictions — the current law, how it's developing, and where the gaps are between one regime and another.

Built with **Next.js (App Router)** + TypeScript, deployable to **Vercel** with zero external services.

## What's in this MVP

The app is organized around the project's three stages:

| Stage | Page | Status |
|-------|------|--------|
| **1 — Current laws** | `/` catalog + `/laws/[id]` detail | ✅ Built (5 laws) |
| **2 — Developments** | `/developments` | ✅ Built (two daily research agents: AI law and privacy law) |
| **3 — Gap analysis** | `/gap-analysis` | ✅ Built (point-by-point comparison) |

Plus `/requirements` — the shared obligation taxonomy every law is mapped against.

### Jurisdictions covered (MVP slice)

- 🇪🇺 EU — **GDPR**
- 🇺🇸 California — **CCPA / CPRA**
- 🇨🇦 Canada (Federal) — **PIPEDA**
- 🇨🇦 Québec — **Law 25**
- 🇨🇳 China — **PIPL**

## How it works — the data model

Everything is built around three concepts that mirror the eventual database tables:

1. **Laws** (`lib/data/laws/*.ts`) — one file per law, with a plain-language summary and citations to the primary source.
2. **Requirements** (`lib/data/requirements.ts`) — a normalized taxonomy of 20 privacy obligations (lawful basis, consent, breach notification, cross-border transfer, …).
3. **Mappings** — each law scores itself against every requirement on a 0–3 strictness scale with the obligation text + citation.

Because every law maps onto the *same* requirement list, **gap analysis is a database query, not an essay** (`lib/gap.ts`).

### Comparing by meaning, not by wording

A single 0–3 score hides real differences: two laws can both score "Moderate" and require different things, and a law can look empty only because it uses different words. So each requirement is also split into **points of comparison** (`lib/data/facets.json`, 37 in all), such as "what counts as consent" or "how fast a breach must be reported".

- Every law is placed on every point from its own text (`lib/data/facet-answers/<law>.json`): the option it fits, a plain statement of what it requires, the provision, and a verbatim quote.
- `scripts/check-facets.mjs` fails the build unless every quote is found inside the provision cited.
- `lib/compare.mjs` compares two jurisdictions point by point. **The points decide** whether the target asks for more, less, the same, or takes a different approach. The 0–3 score can only flag a row as "worth a second look".
- Each answer file also records the law's own word for six shared ideas ("controller" / "data user" / "business" …), shown as "Same idea, different words".

Only the law's own text counts. Where a rule sits in another statute or in regulations that this repository does not hold, the entry says so.

### Daily research agents

Two GitHub Actions workflows (`research-ai-law.yml`, `research-privacy-law.yml`) run once a day and fill the Developments page with new legal developments in the EU, the US and Asia. See [`docs/RESEARCH_AGENTS.md`](docs/RESEARCH_AGENTS.md).

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Roadmap

- **Phase 2** — expand coverage to all US states / Canadian provinces, EU member states, UK, Hong Kong, Singapore, Australia, Japan; add the AI-law domain (EU AI Act, Colorado AI Act, China gen-AI rules, …).
- **Phase 3** — widen the research agents' sources (LEGISinfo, EUR-Lex, the EU Legislative Observatory, more Asian regulators) and link each development to the law it changes.
- **Phase 4** — migrate the file-based content to **Supabase (Postgres)**; add user accounts, saved compliance profiles, self-assessment gap reports, and email alerts on law changes.

## Important

This is **AI-curated legal information for monitoring purposes — not legal advice.** Summaries may be incomplete or out of date. Always verify against the linked primary sources.

## Verifying the content

All entries are **AI-drafted** and carry that status openly on `/verify`. Verification has two halves:

**Automated** (`scripts/verify-sources.mjs`, run weekly by `.github/workflows/verify-sources.yml`):
- link health — every primary-source URL is fetched
- **change detection** — the source text is hashed and compared to `verification/snapshots.json`; a diff means the law likely changed and the summary may now be wrong
- citation existence — confirms cited provisions actually appear in the source text
- staleness — flags entries not reviewed in 180 days

Run it locally with `node scripts/verify-sources.mjs` (`--update` accepts current text as the new baseline).

**Manual** — the only thing that establishes legal reliability. `/verify` links each law to its primary source plus independent trackers for cross-checking. No automated check can confirm a summary correctly *interprets* the law.
