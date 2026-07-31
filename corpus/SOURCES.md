# Corpus download manifest

Where to obtain the authoritative text of each tracked law, to be saved into
`corpus/` as the project's **source of truth**. Once a law's text lives here,
its obligation mappings must quote it verbatim (enforced by
`scripts/check-quotes.mjs`), and the model's training data stops being the
basis for any claim.

> **These URLs came from an AI's training data.** The same source produced a
> dead link for PIPL that CI caught. Before downloading, confirm the page is on
> the official domain and is the current consolidated version. If a link is
> wrong, the fix is to correct it here — not to work around it.

## How to save a file

1. Download the text and convert it to Markdown.
2. Save as `corpus/<lawId>.md` using the law ids already in `lib/data/laws/`:
   `gdpr`, `ccpa`, `pipeda`, `quebec-law25`, `pipl`, `pdpo`.
3. Put a metadata block at the very top of the file, so provenance travels with
   the text:

```markdown
---
lawId: gdpr
sourceUrl: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02016R0679-20160504
retrieved: 2026-07-30
versionNote: Consolidated text of 04/05/2016 (includes corrigendum)
language: en
official: true
---
```

`official: false` marks an unofficial translation — legally significant for
China, where no official English text exists (see below).

---

## 🇪🇺 GDPR — Regulation (EU) 2016/679

Prefer the **consolidated** version; the original OJ text predates the 2018
corrigendum.

- **Consolidated (recommended)** — https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02016R0679-20160504
- Original OJ text — https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679
- ELI permalink — https://eur-lex.europa.eu/eli/reg/2016/679/oj

EUR-Lex offers HTML and PDF. The HTML converts to Markdown cleanly and keeps
the `Article N` headings we need for anchoring.

## 🇺🇸 CCPA / CPRA — California

The statute and the regulations are **two separate documents**; the CPPA
regulations carry much of the operative detail.

- **Statute** (Civil Code, Title 1.81.5) — https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5
- **CPPA regulations** — https://cppa.ca.gov/regulations/

If you want both, save the regulations as `corpus/ccpa-regs.md`.

## 🇨🇦 PIPEDA — Canada (federal)

- **Full text** — https://laws-lois.justice.gc.ca/eng/acts/P-8.6/FullText.html
- Act landing page — https://laws-lois.justice.gc.ca/eng/acts/P-8.6/

Note the fair-information principles live in **Schedule 1**, which many
obligations cite — make sure the schedule is included in what you save.

## 🇨🇦 Québec Law 25 — Private Sector Act

⚠️ **Common trap:** "Law 25" is the *amending* act. The operative law is the
**Act respecting the protection of personal information in the private sector
(CQLR c. P-39.1)**, as amended. Download P-39.1, not the amending bill.

- **P-39.1 (consolidated)** — https://www.legisquebec.gouv.qc.ca/en/document/cs/P-39.1
- Regulator — https://www.cai.gouv.qc.ca/

LégisQuébec blocks automated clients (CI reports HTTP 403), but a normal
browser works — which is why this one needs a human download.

## 🇨🇳 PIPL — China

⚠️ **There is no official English text.** Every English version is an
unofficial translation, and wording differences carry legal weight. Save with
`official: false` and record which translation you used.

- **Official Chinese (NPC)** — http://www.npc.gov.cn/npc/c2/c30834/202108/t20210820_313088.html
- Stanford DigiChina translation — https://digichina.stanford.edu/work/translation-personal-information-protection-law-of-the-peoples-republic-of-china-effective-nov-1-2021/
- China Law Translate — https://www.chinalawtranslate.com/en/personal-information-protection-law/

If you can save the Chinese original **and** a translation, do both
(`corpus/pipl.md` for the translation, `corpus/pipl.zh.md` for the original).

## 🇭🇰 PDPO — Hong Kong, Cap. 486

- **e-Legislation (official, bilingual)** — https://www.elegislation.gov.hk/hk/cap486
- Regulator — https://www.pcpd.org.hk/

e-Legislation renders via JavaScript, so automated fetching returns an empty
shell — another one that needs a human download. Use its PDF/print export.

---

## Re-baselining

The corpus is **pinned, not permanent**. When
`.github/workflows/verify-sources.yml` reports `PRIMARY SOURCE CHANGED` for a
law, re-download it here, replace the file, bump `retrieved` in the metadata
block, and re-check the affected quotes. Laws change — that is the whole point
of the monitor.

---

## Text quality: what breaks quote anchoring

Anchoring needs contiguous English. Three failure modes seen in real downloads:

| Layout | Example | Anchorable? |
|---|---|---|
| Single-language | EU GDPR (EUR-Lex) | ✅ Yes |
| Bilingual, **alternating lines** | HK Cap. 486 (中文 / English) | ✅ Yes — CJK-dominant lines are stripped before matching |
| Bilingual, **same line** | Justice Canada EN/FR consolidations | ❌ No — English sentences are fragmented by French |
| PDF margin artifacts | Québec P-39.1 (stray `1`, `c`, `,` at line joins) | ⚠️ Partially — keep quotes within a single line |

**When downloading, prefer a single-language HTML source over a bilingual PDF.**
For Canada, `laws-lois.justice.gc.ca/eng/acts/P-8.6/` serves English-only HTML;
the consolidated PDF is side-by-side bilingual and cannot be anchored.

### Update after real downloads (2026-07-31)

| Layout | Seen in | Anchorable? |
|---|---|---|
| Bilingual, **two-column PDF** | HK Cap. 486 | ❌ Mostly no — the Data Protection Principles sit on lines carrying both languages, so removing Chinese also removes their English. Needs an **English-only** edition. |

Canada was fixed this way: the side-by-side EN/FR PDF was replaced with an
English-only export and went from unanchorable to 15/15. The same fix applies
to Hong Kong.
