# Policy analysis inputs

Save a privacy policy here as plain text or Markdown, then run:

```bash
node scripts/analyze-policy.mjs policies/<file>.md <lawId>
# lawIds: gdpr · uk-gdpr · ccpa · pipeda · quebec-law25 · pipl · pdpo
```

The report quotes **both sides** of every finding — the statutory words from
`corpus/<lawId>.md` and the policy's own sentence — so each one can be checked
rather than taken on trust.

## What the verdicts mean

| Verdict | Meaning |
|---|---|
| **EVIDENCED** | The policy contains language addressing this obligation. Not proof it is *adequate*. |
| **PARTIAL** | Addressed, but the policy alone cannot establish it (e.g. consent quality depends on the live UI). |
| **NOT EVIDENCED** | No matching clause found. **This is not a finding of non-compliance** — the practice may exist and simply not be described. |
| **NOT ASSESSABLE** | The obligation is discharged through contracts, records or internal assessments that a public policy never contains. |

Roughly half the taxonomy falls in the last bucket. That is a property of
privacy policies, not a defect of the document being analysed — and it is why
this tool produces no compliance percentage.
