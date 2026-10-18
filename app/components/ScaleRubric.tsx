import Link from "next/link";
import { lawsById, requirementsById } from "@/lib/data";
import { CoverageBadge } from "@/app/components/CoverageBadge";
import { LEVELS, LEVEL_BY_N, BINDING_FLOOR, WORKED_LADDER } from "@/lib/strictness.mjs";
import type { Strictness } from "@/lib/types";

// ---------------------------------------------------------------------------
// What the scores mean, where a reader meets them.
//
// Every gap this catalog reports is one score minus another, so the scale is
// the most load-bearing data in the system. Shown as four adjectives it could
// be disagreed with only by feel — which is not disagreement. Each level is
// therefore a question about the text, with a worked example the build checks
// really does score what it illustrates.
// ---------------------------------------------------------------------------

interface Level {
  level: Strictness;
  label: string;
  question: string;
  means: string;
  notMeans: string;
  example: { lawId: string; requirementId: string; why: string };
}

function ExampleLink({ lawId, requirementId }: { lawId: string; requirementId: string }) {
  const law = lawsById[lawId];
  const req = requirementsById[requirementId];
  return (
    <Link href={`/laws/${lawId}`} className="rubric-ex-link">
      {law?.shortName ?? lawId} · {req?.name ?? requirementId}
    </Link>
  );
}

export function ScaleRubric() {
  const levels = LEVELS as Level[];
  const ladderRequirement = requirementsById[WORKED_LADDER.requirementId];

  return (
    <section className="rubric">
      <h2 className="section">What the scores mean</h2>
      <p className="page-lead" style={{ marginBottom: 18 }}>
        Each level is a <em>question about the text</em>, not a judgement about the law. The step
        from 1 to 2 asks whether the instrument imposes the duty at all; the step from 2 to 3 asks
        whether it attaches the machinery that makes a duty operational — triggers, deadlines,
        prescribed mechanisms, consequences. Both are things you can check against a provision and
        argue with.
      </p>

      <div className="rubric-grid">
        {levels.map((l) => (
          <div key={l.level} className="rubric-card">
            <div className="rubric-head">
              <CoverageBadge level={l.level} />
              {l.level === BINDING_FLOOR && (
                <span className="rubric-floor">binding floor</span>
              )}
            </div>
            <p className="rubric-q">{l.question}</p>
            <p className="rubric-means">{l.means}</p>
            <p className="rubric-not">
              <span className="rubric-not-tag">Does not mean</span>
              {l.notMeans}
            </p>
            <div className="rubric-ex">
              <ExampleLink lawId={l.example.lawId} requirementId={l.example.requirementId} />
              <span>{l.example.why}</span>
            </div>
          </div>
        ))}
      </div>

      {ladderRequirement && (
        <div className="rubric-ladder">
          <div className="rubric-ladder-tag">
            The same obligation at three levels — {ladderRequirement.name}
          </div>
          <div className="rubric-ladder-rows">
            {(WORKED_LADDER.levels as Strictness[]).map((n) => {
              const ex = LEVEL_BY_N[n].example;
              return (
                <div key={n} className="rubric-ladder-row">
                  <CoverageBadge level={n} />
                  <ExampleLink lawId={ex.lawId} requirementId={ex.requirementId} />
                  <span className="rubric-ladder-why">{ex.why}</span>
                </div>
              );
            })}
          </div>
          <p className="rubric-ladder-note">{WORKED_LADDER.note}</p>
        </div>
      )}

      <div className="disclaimer" style={{ marginTop: 20 }}>
        <strong>What the top of the scale is not.</strong> A 3 says the text specifies a great deal
        — not that the regime is the best one, and not that an organisation complying with it is
        safer. The requirement list below is largely the GDPR&apos;s own obligation set, so the
        GDPR reaches 3 on nineteen of twenty rows by construction, and every other instrument is
        measured by how closely it resembles it. That is a property of the ruler, and reading these
        scores as a league table reads the ruler as the world.
      </div>
    </section>
  );
}
