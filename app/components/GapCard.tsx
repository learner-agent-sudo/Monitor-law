import { useId, type ReactNode } from "react";
import {
  sameMeaningDifferentWords,
  type Point,
  type PointSide,
  type RequirementComparison,
} from "@/lib/gap";
import { tracesFor, understatedBy } from "@/lib/gap-traces";
import { CoverageBadge } from "./CoverageBadge";
import { GapTraceDetails } from "./GapTrace";
import { LawCite } from "./LawCite";
import { PointTable } from "./PointTable";

// ---------------------------------------------------------------------------
// One requirement, as a card to read.
//
// The points decide the verdict, so each point gets its own block with the
// two laws side by side: the target first, the source beneath or beside it.
// The 0-3 scores are secondary and sit in the header. Every citation opens the
// law text through LawCite. The full point table stays one click away.
// ---------------------------------------------------------------------------

export type GapMode = "gap" | "different" | "second" | "covered" | "neither";

interface GapCardProps {
  c: RequirementComparison;
  mode: GapMode;
  sourceName: string;
  targetName: string;
}

const CHIP_CLASS = {
  more: "rel-more",
  less: "rel-less",
  same: "rel-same",
  different: "rel-different",
  second: "rel-second",
  unknown: "rel-unknown",
} as const;

function pointsWith(c: RequirementComparison, relation: Point["relation"]): Point[] {
  return c.points.filter((p) => p.relation === relation);
}

function comparedCount(c: RequirementComparison): number {
  return c.points.filter((p) => p.relation !== "unknown").length;
}

function pointsWord(n: number): string {
  return n === 1 ? "point" : "points";
}

function labels(points: Point[]): string {
  return points.map((p) => p.label).join("; ");
}

/** A score that is correct but reads as less than it is. */
function Understated({ lawIds, requirementId }: { lawIds: string[]; requirementId: string }) {
  const handled = understatedBy(lawIds, requirementId);
  if (!handled.length) return null;
  return (
    <span className="understated">
      constrained under {handled.map((h) => h.name).join(" and ")}
    </span>
  );
}

/** The requirement-level citation: opens the mapping's law text, or stays plain when unmapped. */
function RuleCite({ c }: { c: RequirementComparison }) {
  if (!c.targetLawId) return <span className="citation">{c.targetCitation}</span>;
  return (
    <LawCite
      lawId={c.targetLawId}
      citation={c.targetCitationRaw}
      ev={"m:" + c.requirement.id}
      finding={c.targetObligation}
    />
  );
}

/** The target's rule for the whole requirement, when the points do not carry it. */
function RuleRelied({ c }: { c: RequirementComparison }) {
  return (
    <div className="gap-side gap-rule">
      <div className="gap-side-head">Rule relied on</div>
      <div className="gap-side-says">{c.targetObligation}</div>
      <div className="gap-side-cite">
        <RuleCite c={c} />
      </div>
    </div>
  );
}

function SidePanel({
  name,
  side,
  facetId,
  isTarget,
}: {
  name: string;
  side: PointSide | null;
  facetId: string;
  isTarget: boolean;
}) {
  return (
    <div className={isTarget ? "gap-side gap-side-target" : "gap-side"}>
      <div className="gap-side-head">{name}</div>
      {side ? (
        <>
          <div className="gap-side-says">{side.says}</div>
          <div className="gap-side-cite">
            {side.citation ? (
              <LawCite
                lawId={side.lawId}
                citation={side.citation}
                ev={"f:" + facetId}
                finding={side.says}
              />
            ) : (
              <span className="gap-side-none">No provision imposes this</span>
            )}
          </div>
        </>
      ) : (
        <div className="gap-side-none">Not yet compared</div>
      )}
    </div>
  );
}

function PointBlock({
  p,
  sourceName,
  targetName,
}: {
  p: Point;
  sourceName: string;
  targetName: string;
}) {
  return (
    <div className="gap-point">
      <h4 className="gap-point-title">{p.label}</h4>
      <p className="gap-point-q">{p.question}</p>
      <div className="gap-sides">
        <SidePanel name={targetName} side={p.target} facetId={p.facetId} isTarget />
        <SidePanel name={sourceName} side={p.source} facetId={p.facetId} isTarget={false} />
      </div>
      {sameMeaningDifferentWords(p) && (
        <div className="gap-alias">
          Same rule, different name: “{p.source?.ownTerm}” / “{p.target?.ownTerm}”
        </div>
      )}
    </div>
  );
}

function Chip({ cls, children }: { cls: string; children: ReactNode }) {
  return <span className={`rel-chip ${cls}`}>{children}</span>;
}

function chipsFor(c: RequirementComparison, mode: GapMode, sourceName: string, targetName: string) {
  switch (mode) {
    case "gap": {
      const n = pointsWith(c, "more").length;
      const m = comparedCount(c);
      return (
        <>
          <Chip cls={CHIP_CLASS.more}>
            {targetName} asks for more · {n} of {m} {pointsWord(m)}
          </Chip>
          {c.verdict === "mixed" && (
            <Chip cls={CHIP_CLASS.less}>
              {sourceName} asks for more on {pointsWith(c, "less").length}
            </Chip>
          )}
        </>
      );
    }
    case "different": {
      const n = pointsWith(c, "different").length;
      return (
        <Chip cls={CHIP_CLASS.different}>
          Different approach · {n} {pointsWord(n)}
        </Chip>
      );
    }
    case "second":
      return <Chip cls={CHIP_CLASS.second}>Worth a second look</Chip>;
    case "covered":
      return c.verdict === "same" ? (
        <Chip cls={CHIP_CLASS.same}>Same in substance</Chip>
      ) : (
        <Chip cls={CHIP_CLASS.less}>{sourceName} already asks for more</Chip>
      );
    case "neither":
      return <Chip cls={CHIP_CLASS.unknown}>Neither law deals with this</Chip>;
  }
}

function Body({
  c,
  mode,
  sourceName,
  targetName,
}: {
  c: RequirementComparison;
  mode: GapMode;
  sourceName: string;
  targetName: string;
}) {
  const block = (p: Point) => (
    <PointBlock key={p.facetId} p={p} sourceName={sourceName} targetName={targetName} />
  );

  if (mode === "gap") {
    const more = pointsWith(c, "more");
    const less = pointsWith(c, "less");
    return (
      <>
        {more.length > 0 && <div className="gap-points">{more.map(block)}</div>}
        {c.verdict === "mixed" && less.length > 0 && (
          <>
            <p className="gap-subhead">Where {sourceName} already asks for more</p>
            <div className="gap-points">{less.map(block)}</div>
          </>
        )}
        {c.byScoreOnly && <RuleRelied c={c} />}
        {!c.sourceQuoted &&
          tracesFor(c.sourceLawIds, c.requirement.id).map((t) => (
            <GapTraceDetails key={t.lawId} trace={t} showLaw />
          ))}
      </>
    );
  }

  if (mode === "different") {
    return (
      <>
        <div className="gap-points">{pointsWith(c, "different").map(block)}</div>
        {c.scoreDisagrees && (
          <>
            <p className="gap-line">{targetName}&apos;s rule is also rated firmer overall.</p>
            <RuleRelied c={c} />
          </>
        )}
      </>
    );
  }

  if (mode === "second") {
    return (
      <>
        <p className="gap-line">
          {c.verdict === "same" ? (
            `Same on all ${comparedCount(c)} ${pointsWord(comparedCount(c))} compared.`
          ) : (
            <>
              {sourceName} already asks for more on: {labels(pointsWith(c, "less"))}
            </>
          )}
        </p>
        <RuleRelied c={c} />
      </>
    );
  }

  if (mode === "covered") {
    if (c.byScoreOnly) return <RuleRelied c={c} />;
    if (c.verdict === "same") {
      return (
        <>
          <p className="gap-line">
            Same on all {comparedCount(c)} {pointsWord(comparedCount(c))} compared.
          </p>
          {c.points
            .filter((p) => sameMeaningDifferentWords(p))
            .map((p) => (
              <div key={p.facetId} className="gap-alias">
                Same rule, different name: “{p.source?.ownTerm}” ({p.source?.lawShortName}) /{" "}
                “{p.target?.ownTerm}” ({p.target?.lawShortName})
              </div>
            ))}
        </>
      );
    }
    return (
      <p className="gap-line">
        {sourceName} already asks for more on: {labels(pointsWith(c, "less"))}
      </p>
    );
  }

  // neither: the search behind the empty result.
  return (
    <>
      {[
        ...tracesFor(c.sourceLawIds, c.requirement.id),
        ...tracesFor(c.targetLawIds, c.requirement.id),
      ].map((t) => (
        <GapTraceDetails key={t.lawId} trace={t} showLaw />
      ))}
    </>
  );
}

export function GapCard({ c, mode, sourceName, targetName }: GapCardProps) {
  const titleId = `gap-title${useId()}`;
  const compact = mode === "covered" || mode === "neither";
  const showFooter = mode !== "neither" && c.points.length > 0;

  return (
    <article
      className={`gap-card gap-card-${mode}${compact ? " gap-card-compact" : ""}`}
      data-mode={mode}
      aria-labelledby={titleId}
    >
      <header className="gap-card-head">
        <div className="gap-card-id">
          <h3 className="gap-card-title" id={titleId}>
            {c.requirement.name}
          </h3>
          <div className="gap-card-cat">{c.requirement.category}</div>
        </div>
        <div className="gap-card-verdict">
          <div className="gap-card-chips">{chipsFor(c, mode, sourceName, targetName)}</div>
          <div className="gap-card-score">
            Overall score:{" "}
            <span className="gap-score-side">
              <CoverageBadge level={c.sourceStrictness} />
              <Understated lawIds={c.sourceLawIds} requirementId={c.requirement.id} />
            </span>{" "}
            →{" "}
            <span className="gap-score-side">
              <CoverageBadge level={c.targetStrictness} />
              <Understated lawIds={c.targetLawIds} requirementId={c.requirement.id} />
            </span>
          </div>
        </div>
      </header>

      <div className="gap-card-body">
        <Body c={c} mode={mode} sourceName={sourceName} targetName={targetName} />
      </div>

      {showFooter && (
        <div className="gap-card-foot">
          <details className="cmp-disclosure">
            <summary>
              All {c.points.length} {pointsWord(c.points.length)} for this requirement
            </summary>
            <div className="cmp-detail-body">
              <PointTable points={c.points} sourceName={sourceName} targetName={targetName} />
            </div>
          </details>
        </div>
      )}
    </article>
  );
}
