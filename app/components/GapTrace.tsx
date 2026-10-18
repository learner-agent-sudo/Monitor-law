import { lawsById } from "@/lib/data";
import type { GapTrace, HandledBy } from "@/lib/gap-traces";

// ---------------------------------------------------------------------------
// The evidence behind an empty cell.
//
// Two blocks, deliberately not blended:
//
//   SEARCHED   what the machine did — how many provisions, which terms, which
//              terms appear nowhere, and the nearest provisions in their own
//              words. Reproducible; re-derived on every build.
//   READING    why the author says those provisions fall short. Dated, labelled,
//              and the thing a reviewer is invited to attack.
//
// Keeping them apart is the point. A reader who distrusts the reading can work
// from the same excerpts and reach their own; what nobody has to do any more is
// accept a bare "0" on faith, or re-read a whole statute to disagree with one.
// ---------------------------------------------------------------------------

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

function CrossRef({ handled, shortName }: { handled: HandledBy; shortName: string }) {
  return (
    <div className="trace-cross">
      <div className="trace-cross-head">
        <span className="trace-cand-label">{handled.name}</span>
        <span className={`pill pill-${handled.strictness}`}>
          {shortName} scores {handled.strictness}
        </span>
        <span className="trace-cand-terms">{handled.citation}</span>
      </div>
      <p className="trace-mech">{handled.note}</p>
    </div>
  );
}

export function GapTraceDetails({ trace, showLaw = false }: { trace: GapTrace; showLaw?: boolean }) {
  const law = lawsById[trace.lawId];
  const shortName = law?.shortName ?? trace.lawId;
  // Two kinds of neighbour, and conflating them was the first thing this got
  // wrong: "the constraint is really there, under another name" and "this is
  // how the regime works instead, and it constrains nothing equivalent" cannot
  // wear the same label without telling the reader California limits where
  // data may live.
  const insteadOf = trace.handledBy.filter((h) => h.kind === "instead-of");
  const related = trace.handledBy.filter((h) => h.kind !== "instead-of");

  return (
    <details className="trace">
      <summary className="trace-summary">
        {showLaw && <span className="trace-law">{shortName}</span>}
        {trace.noNearest ? "No provision matched any search term" : "No provision imposes this"}
        {/* Say it before the disclosure is opened. A reader who never clicks
            should still not walk away thinking the instrument is indifferent
            to ground it covers from another direction. */}
        {insteadOf.length > 0 && (
          <span className="trace-elsewhere-flag">
            → constrained under {insteadOf.map((h) => h.name).join(" and ")}
          </span>
        )}
        <span className="trace-cta">show what was searched</span>
      </summary>

      <div className="trace-body">
        <div className="trace-step">
          <span className="trace-step-tag">Searched</span>
          <p className="trace-mech">
            All {plural(trace.provisionsSearched, "indexed provision")} of {shortName}, for{" "}
            {plural(trace.termsTried.length, "term")}.
            {trace.termsAbsent.length > 0 && (
              <>
                {" "}
                {trace.termsAbsent.length === trace.termsTried.length
                  ? "Every one of them appears nowhere in the instrument"
                  : `${trace.termsAbsent.length} of them appear nowhere in the instrument`}
                : <span className="trace-absent">{trace.termsAbsent.join(" · ")}</span>.
              </>
            )}
            {trace.weakOnly > 0 && (
              <>
                {" "}
                {plural(trace.weakOnly, "further provision")} matched only a word too general to
                carry a near-miss and {trace.weakOnly === 1 ? "is" : "are"} not shown.
              </>
            )}
          </p>
          <details className="trace-terms">
            <summary>All {trace.termsTried.length} terms tried</summary>
            <p>{trace.termsTried.join(" · ")}</p>
          </details>
        </div>

        <div className="trace-step">
          <span className="trace-step-tag">Closest provisions</span>
          {trace.candidates.length === 0 ? (
            <p className="trace-mech trace-none">
              None. No provision of {shortName} contains any of these terms — this is absence of
              the vocabulary itself, not a near-miss judged insufficient.
            </p>
          ) : (
            trace.candidates.map((c) => (
              <div key={c.key} className="trace-cand">
                <div className="trace-cand-head">
                  <span className="trace-cand-label">{c.label}</span>
                  {c.named && <span className="trace-cand-named">named as closest</span>}
                  <span className="trace-cand-terms">matched: {c.matched.join(", ")}</span>
                </div>
                <blockquote className="statute-quote">
                  {c.truncatedStart && "… "}
                  {c.excerpt}
                  {c.truncatedEnd && " …"}
                  <span className="statute-quote-tag">
                    verbatim from {c.label}, {shortName}
                  </span>
                </blockquote>
              </div>
            ))
          )}
        </div>

        {insteadOf.length > 0 && (
          <div className="trace-step">
            <span className="trace-step-tag trace-step-tag-cross">
              The constraint is in another row
            </span>
            {insteadOf.map((h) => (
              <CrossRef key={h.requirementId} handled={h} shortName={shortName} />
            ))}
          </div>
        )}

        {related.length > 0 && (
          <div className="trace-step">
            <span className="trace-step-tag">Related, but not equivalent</span>
            {related.map((h) => (
              <CrossRef key={h.requirementId} handled={h} shortName={shortName} />
            ))}
          </div>
        )}

        <div className="trace-step">
          <span className="trace-step-tag trace-step-tag-read">Reading</span>
          <p className="trace-verdict">{trace.verdict}</p>
          {trace.practicalEffect && (
            <p className="trace-practical">
              <span className="trace-practical-tag">In practice</span>
              {trace.practicalEffect}
            </p>
          )}
          <p className="trace-reviewed">
            An interpretation of the provisions above, not a result of the search. Reviewed{" "}
            {trace.reviewed} — disagree with it by pointing at a provision it missed.
          </p>
        </div>

        {trace.elsewhere && (
          <div className="trace-step">
            <span className="trace-step-tag">Where it comes from instead</span>
            <p className="trace-mech">{trace.elsewhere}</p>
          </div>
        )}

        {trace.degraded && (
          <p className="src-warn">
            <strong>Provision-level scoping unavailable for {shortName}.</strong> {trace.degraded}{" "}
            The excerpts above are verbatim from the ingested file, but a citation cannot be tied
            to a provision with confidence.
          </p>
        )}

        <p className="trace-foot">
          Absence from {shortName} is not absence from the law. Sectoral statutes, other
          jurisdictions, regulator guidance and contract all survive a nil finding here.
        </p>
      </div>
    </details>
  );
}
