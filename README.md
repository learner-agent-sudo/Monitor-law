# Privacy Law Monitor

A website to monitor privacy & data-protection laws across jurisdictions — the current law, how it's developing, and where the gaps are between one regime and another.

Built with **Next.js (App Router)** + TypeScript, deployable to **Vercel** with zero external services.

## What's in this MVP

The app is organized around the project's three stages:

| Stage | Page | Status |
|-------|------|--------|
| **1 — Current laws** | `/` catalog + `/laws/[id]` detail | ✅ Built (5 laws) |
| **2 — Developments** | `/developments` | 🔎 Preview / data-model demo |
| **3 — Gap analysis** | `/gap-analysis` | ✅ Built (interactive crosswalk) |

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

Because every law maps onto the *same* requirement list, **gap analysis is a database query, not an essay** (`lib/gap.ts`): comparing two jurisdictions means diffing their strictness scores per requirement and surfacing where the target demands more.

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Roadmap

- **Phase 2** — expand coverage to all US states / Canadian provinces, EU member states, UK, Hong Kong, Singapore, Australia, Japan; add the AI-law domain (EU AI Act, Colorado AI Act, China gen-AI rules, …).
- **Phase 3** — wire the Stage-2 developments feed to live legislative sources (Congress.gov API, LEGISinfo, EUR-Lex, EU Legislative Observatory) with AI summarization + change detection.
- **Phase 4** — migrate the file-based content to **Supabase (Postgres)**; add user accounts, saved compliance profiles, self-assessment gap reports, and email alerts on law changes.

## Important

This is **AI-curated legal information for monitoring purposes — not legal advice.** Summaries may be incomplete or out of date. Always verify against the linked primary sources.
