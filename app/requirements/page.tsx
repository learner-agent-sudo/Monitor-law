import { requirements, requirementCategories, laws, lawsById } from "@/lib/data";
import { CoverageBadge } from "@/app/components/CoverageBadge";
import { Disclaimer } from "@/app/components/Disclaimer";
import type { Strictness } from "@/lib/types";

export default function RequirementsPage() {
  return (
    <>
      <span className="stage-tag">SHARED TAXONOMY</span>
      <h1 className="page-title">Requirement taxonomy</h1>
      <p className="page-lead">
        Every law is mapped against this normalized list of {requirements.length} privacy
        obligations. This shared vocabulary is what makes side-by-side comparison and gap analysis
        possible. Below, each requirement shows how the tracked laws score against it.
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: "24%" }}>Requirement</th>
              {laws.map((law) => (
                <th key={law.id}>{law.shortName}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requirementCategories.map((category) => (
              <RequirementCategory key={category} category={category} />
            ))}
          </tbody>
        </table>
      </div>

      <Disclaimer />
    </>
  );
}

function RequirementCategory({ category }: { category: string }) {
  const rows = requirements.filter((r) => r.category === category);
  return (
    <>
      <tr>
        <td
          colSpan={1 + laws.length}
          style={{
            background: "var(--bg)",
            color: "var(--text-faint)",
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {category}
        </td>
      </tr>
      {rows.map((req) => (
        <tr key={req.id}>
          <td>
            <div className="req-name">{req.name}</div>
            <div className="req-cat">{req.description}</div>
          </td>
          {laws.map((law) => {
            const m = lawsById[law.id].mappings[req.id];
            const level: Strictness = m ? m.strictness : 0;
            return (
              <td key={law.id}>
                <CoverageBadge level={level} />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
