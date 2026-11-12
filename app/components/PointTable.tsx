import { sameMeaningDifferentWords, type Point, type PointRelation, type PointSide } from "@/lib/gap";

// ---------------------------------------------------------------------------
// Every point of comparison for one requirement, side by side.
//
// Each cell shows what that law says on the point, in its own quoted words
// where the text is available. The last column says how the two compare. A
// reader can check any placement against the passage it rests on.
// ---------------------------------------------------------------------------

const CHIP: Record<PointRelation, { cls: string; text: (targetName: string) => string }> = {
  same: { cls: "rel-same", text: () => "Same" },
  more: { cls: "rel-more", text: (t) => `${t} asks for more` },
  less: { cls: "rel-less", text: (t) => `${t} asks for less` },
  different: { cls: "rel-different", text: () => "Different approach" },
  unknown: { cls: "rel-unknown", text: () => "Not yet compared" },
};

export function RelationChip({ relation, targetName }: { relation: PointRelation; targetName: string }) {
  const chip = CHIP[relation];
  return <span className={`rel-chip ${chip.cls}`}>{chip.text(targetName)}</span>;
}

function SideCell({ side }: { side: PointSide | null }) {
  if (!side) return <td className="cmp-muted">Not yet compared</td>;
  return (
    <td>
      <div>
        <strong>{side.optionLabel}</strong>
      </div>
      <div className="point-says">{side.says}</div>
      {side.citation && <div className="citation">{side.citation}</div>}
      {side.quote && (
        <details className="cmp-disclosure">
          <summary>Wording relied on</summary>
          <blockquote className="cmp-quote">{side.quote}</blockquote>
        </details>
      )}
    </td>
  );
}

function PointRow({ point, targetName }: { point: Point; targetName: string }) {
  return (
    <tr>
      <td>
        <strong>{point.label}</strong>
        <div className="point-q">{point.question}</div>
      </td>
      <SideCell side={point.source} />
      <SideCell side={point.target} />
      <td>
        <RelationChip relation={point.relation} targetName={targetName} />
        {sameMeaningDifferentWords(point) && (
          <div className="point-alias">
            Same rule, different name: “{point.source?.ownTerm}” / “{point.target?.ownTerm}”
          </div>
        )}
      </td>
    </tr>
  );
}

export function PointTable({
  points,
  sourceName,
  targetName,
}: {
  points: Point[];
  sourceName: string;
  targetName: string;
}) {
  return (
    <div className="table-wrap">
      <table className="point-table">
        <thead>
          <tr>
            <th>Point</th>
            <th>{sourceName}</th>
            <th>{targetName}</th>
            <th>Compared</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <PointRow key={p.facetId} point={p} targetName={targetName} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
