import Link from "next/link";
import { laws, lawsById, jurisdictionsById } from "@/lib/data";
import { provenance, provenanceByLaw, STATUS_LABEL, STALE_AFTER_DAYS } from "@/lib/data/verification";

export const metadata = {
  title: "How to verify this content · Privacy Law Monitor",
};

export default function VerifyPage() {
  return (
    <>
      <span className="stage-tag">TRUST &amp; PROVENANCE</span>
      <h1 className="page-title">How to check this content</h1>
      <p className="page-lead">
        Everything in this catalog is <strong>AI-drafted</strong>. That makes it useful for
        orientation and fast comparison — and unsuitable as the basis for a compliance decision
        until you have checked it against the primary source. This page tells you exactly how far
        each entry has been checked, and how to check it yourself.
      </p>

      <div className="disclaimer" style={{ marginTop: 0, marginBottom: 32 }}>
        <strong>The honest limit.</strong> No tool can automatically confirm that a legal summary is
        correct — that is a judgment call requiring someone to read the statute. What automation{" "}
        <em>can</em> do is make checking cheap and tell you when something has changed. That is what
        the checks below do.
      </div>

      <h2 className="section">Verification status by law</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Law</th>
              <th>Status</th>
              <th>Primary source</th>
              <th>Cross-check against</th>
            </tr>
          </thead>
          <tbody>
            {provenance.map((p) => {
              const law = lawsById[p.lawId];
              if (!law) return null;
              const j = jurisdictionsById[law.jurisdictionId];
              return (
                <tr key={p.lawId}>
                  <td>
                    <Link href={`/laws/${p.lawId}`} className="req-name">
                      {j.flag} {law.shortName}
                    </Link>
                    <div className="req-cat">Reviewed {p.lastReviewed}</div>
                  </td>
                  <td>
                    <span className={`pill ${p.status === "human-verified" ? "pill-3" : p.status === "source-checked" ? "pill-2" : "pill-1"}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td>
                    <a href={p.checkUrl} target="_blank" rel="noopener noreferrer">
                      {p.sourceRef} ↗
                    </a>
                  </td>
                  <td>
                    {p.corroboration.map((c) => (
                      <div key={c.url}>
                        <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
                          {c.name} ↗
                        </a>
                      </div>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="section">How to verify an entry yourself</h2>
      <ol className="verify-steps">
        <li>
          <strong>Open the law&apos;s page</strong> and pick the obligation you care about. Every row
          carries a citation (e.g. <code>Art. 33 GDPR</code>).
        </li>
        <li>
          <strong>Follow the primary-source link</strong> in the table above and find that article.
          The citation is the address — you should be reading the actual statute, not our summary.
        </li>
        <li>
          <strong>Confirm the specifics</strong> — deadlines, thresholds, and penalty figures are
          where AI-drafted text is most likely to be subtly wrong. Check the numbers first.
        </li>
        <li>
          <strong>Cross-check with an independent tracker</strong> (right-hand column). If our
          summary and the tracker disagree, trust neither until the statute settles it.
        </li>
      </ol>

      <h2 className="section">What is checked automatically</h2>
      <p className="page-lead" style={{ marginBottom: 16 }}>
        A scheduled job (<code>.github/workflows/verify-sources.yml</code>) runs weekly against the
        primary sources and reports:
      </p>
      <div className="grid">
        <div className="card">
          <div className="card-title">🔗 Link health</div>
          <p className="card-summary">
            Every primary-source URL is fetched. Statutes get moved and renumbered; a dead link
            means the citation needs updating.
          </p>
        </div>
        <div className="card">
          <div className="card-title">🔄 Change detection</div>
          <p className="card-summary">
            The source text is hashed and compared to the last run. If the text changes, the law was
            likely amended — and our summary may now be wrong. This is the highest-value signal.
          </p>
        </div>
        <div className="card">
          <div className="card-title">🔍 Citation existence</div>
          <p className="card-summary">
            Confirms the provisions we cite actually appear in the source text. Catches invented or
            mistyped citations — a known failure mode of AI-generated legal content.
          </p>
        </div>
        <div className="card">
          <div className="card-title">⏳ Staleness</div>
          <p className="card-summary">
            Entries not reviewed in {STALE_AFTER_DAYS} days are flagged for re-review, so nothing
            silently rots.
          </p>
        </div>
      </div>

      <div className="disclaimer">
        <strong>What none of this proves.</strong> A green check means the link works, the citation
        exists, and the text has not changed. It does <em>not</em> mean the summary correctly states
        the law. Only the <em>human-verified</em> status means that — and right now, no entry has it.
      </div>
    </>
  );
}
