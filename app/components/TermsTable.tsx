import { terms, termsFor, type TermEntry } from "@/lib/facets";

// ---------------------------------------------------------------------------
// The same concept under each law's own word for it.
//
// Laws often use different words for the same thing. Lining the words up here
// stops a difference in wording being mistaken for a difference in substance.
// ---------------------------------------------------------------------------

/** Chinese wording gets lang="zh" so screen readers and fonts treat it as such. */
const CJK = /[\u4E00-\u9FFF]/;

/** The law's English gloss, when the entry carries one (not yet typed on TermEntry). */
function englishOf(entry: TermEntry): string | undefined {
  return (entry as TermEntry & { english?: string }).english;
}

/** The first law in a jurisdiction that has an entry for this concept. */
function firstEntry(lawIds: string[], termId: string): TermEntry | null {
  for (const id of lawIds) {
    const entry: TermEntry | undefined = termsFor(id)[termId];
    if (entry) return entry;
  }
  return null;
}

function TermCell({ entry, label }: { entry: TermEntry | null; label: string }) {
  if (!entry) return <td className="cmp-muted" data-label={label}>Not yet filled in</td>;

  if (entry.term === null) {
    return (
      <td data-label={label}>
        <div className="cmp-muted">{entry.note ?? "No such term in this law."}</div>
        {entry.citation && <div className="citation">{entry.citation}</div>}
      </td>
    );
  }

  const english = englishOf(entry);
  return (
    <td data-label={label}>
      <div>
        <strong>{entry.term}</strong>
        {english && <span className="term-english"> [{english}]</span>}
      </div>
      {entry.citation && <div className="citation">{entry.citation}</div>}
      {entry.quote && (
        <details className="cmp-disclosure">
          <summary>Wording</summary>
          <blockquote className="cmp-quote" lang={CJK.test(entry.quote) ? "zh" : undefined}>
            {entry.quote}
          </blockquote>
        </details>
      )}
    </td>
  );
}

export function TermsTable({
  sourceLawIds,
  targetLawIds,
  sourceName,
  targetName,
}: {
  sourceLawIds: string[];
  targetLawIds: string[];
  sourceName: string;
  targetName: string;
}) {
  const anyEntries = [...sourceLawIds, ...targetLawIds].some(
    (id) => Object.keys(termsFor(id)).length > 0,
  );
  if (!anyEntries) return null;

  return (
    <>
      <h2 className="section">Same idea, different words</h2>
      <p className="cmp-intro">
        Laws often use different words for the same thing. This table lines them up, so that a
        difference in wording is not mistaken for a difference in substance.
      </p>
      <div className="table-wrap">
        <table className="point-table cmp-stack">
          <thead>
            <tr>
              <th>Idea</th>
              <th>{sourceName}</th>
              <th>{targetName}</th>
            </tr>
          </thead>
          <tbody>
            {terms.map((concept) => (
              <tr key={concept.id}>
                <td>
                  <strong>{concept.concept}</strong>
                </td>
                <TermCell entry={firstEntry(sourceLawIds, concept.id)} label={sourceName} />
                <TermCell entry={firstEntry(targetLawIds, concept.id)} label={targetName} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
