import Link from "next/link";
import { notFound } from "next/navigation";
import { laws, lawsById, jurisdictionsById, requirements, requirementCategories } from "@/lib/data";
import { CoverageBadge } from "@/app/components/CoverageBadge";
import { Disclaimer } from "@/app/components/Disclaimer";
import { provenanceByLaw, STATUS_LABEL as VERIFY_LABEL } from "@/lib/data/verification";
import type { Strictness } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  "in-force": "In force",
  proposed: "Proposed",
  repealed: "Repealed",
};

export function generateStaticParams() {
  return laws.map((law) => ({ id: law.id }));
}

export default function LawDetailPage({ params }: { params: { id: string } }) {
  const law = lawsById[params.id];
  if (!law) notFound();
  const j = jurisdictionsById[law.jurisdictionId];

  return (
    <>
      <Link href="/" style={{ fontSize: 14 }}>
        ← All laws
      </Link>

      <div className="detail-head" style={{ marginTop: 16 }}>
        <span className="detail-flag">{j.flag}</span>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            {law.shortName}
          </h1>
          <div style={{ color: "var(--text-muted)", fontSize: 15 }}>{law.name}</div>
        </div>
      </div>

      <div className="meta-row">
        <div className="meta-item">
          <span className="label">Jurisdiction</span>
          {j.name}
        </div>
        <div className="meta-item">
          <span className="label">Status</span>
          {STATUS_LABEL[law.status]}
        </div>
        <div className="meta-item">
          <span className="label">Effective</span>
          {law.effectiveDate}
        </div>
        <div className="meta-item">
          <span className="label">Authority</span>
          {law.authority}
        </div>
        <div className="meta-item">
          <span className="label">Primary source</span>
          <a href={law.officialUrl} target="_blank" rel="noopener noreferrer">
            Official text ↗
          </a>
        </div>
      </div>

      <div className="summary-box">{law.summary}</div>

      <VerificationNotice lawId={law.id} />

      <h2 className="section">Obligation coverage</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: "22%" }}>Requirement</th>
              <th style={{ width: "13%" }}>Coverage</th>
              <th>What the law requires</th>
              <th style={{ width: "16%" }}>Citation</th>
            </tr>
          </thead>
          <tbody>
            {requirementCategories.map((category) => {
              const rows = requirements.filter((r) => r.category === category);
              return (
                <CategoryRows key={category} category={category} rows={rows} law={law} />
              );
            })}
          </tbody>
        </table>
      </div>

      <Disclaimer />
    </>
  );
}

function VerificationNotice({ lawId }: { lawId: string }) {
  const p = provenanceByLaw[lawId];
  if (!p) return null;
  return (
    <div className="verify-strip">
      <span className={`pill ${p.status === "human-verified" ? "pill-3" : p.status === "source-checked" ? "pill-2" : "pill-1"}`}>
        {VERIFY_LABEL[p.status]}
      </span>
      <span className="verify-strip-text">
        Reviewed {p.lastReviewed}. Check the citations below against{" "}
        <a href={p.checkUrl} target="_blank" rel="noopener noreferrer">
          {p.sourceRef} ↗
        </a>{" "}
        before relying on them — <Link href="/verify">how to verify</Link>.
      </span>
    </div>
  );
}

function CategoryRows({
  category,
  rows,
  law,
}: {
  category: string;
  rows: typeof requirements;
  law: (typeof laws)[number];
}) {
  return (
    <>
      <tr>
        <td
          colSpan={4}
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
      {rows.map((req) => {
        const m = law.mappings[req.id];
        const level: Strictness = m ? m.strictness : 0;
        return (
          <tr key={req.id}>
            <td>
              <div className="req-name">{req.name}</div>
            </td>
            <td>
              <CoverageBadge level={level} />
            </td>
            <td style={{ color: "var(--text-muted)" }}>
              {m ? m.obligation : "Not addressed by this law."}
            </td>
            <td className="citation">{m ? m.citation : "—"}</td>
          </tr>
        );
      })}
    </>
  );
}
