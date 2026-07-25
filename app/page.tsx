import Link from "next/link";
import { laws, jurisdictionsById } from "@/lib/data";
import { Disclaimer } from "./components/Disclaimer";

const STATUS_LABEL: Record<string, string> = {
  "in-force": "In force",
  proposed: "Proposed",
  repealed: "Repealed",
};

export default function HomePage() {
  const grouped = laws.reduce<Record<string, typeof laws>>((acc, law) => {
    const j = jurisdictionsById[law.jurisdictionId];
    (acc[j.region] ||= []).push(law);
    return acc;
  }, {});

  return (
    <>
      <span className="stage-tag">STAGE 1 · CURRENT LAWS</span>
      <h1 className="page-title">Privacy Law Monitor</h1>
      <p className="page-lead">
        A browsable catalog of current privacy and data-protection laws. Each entry maps the law
        against a shared taxonomy of {20} obligations, so you can compare regimes and run
        cross-jurisdiction gap analysis.
      </p>

      <div className="stat-row">
        <div className="stat">
          <div className="num">{laws.length}</div>
          <div className="lbl">Laws tracked</div>
        </div>
        <div className="stat">
          <div className="num">{Object.keys(grouped).length}</div>
          <div className="lbl">Regions</div>
        </div>
        <div className="stat">
          <div className="num">20</div>
          <div className="lbl">Mapped requirements</div>
        </div>
      </div>

      {Object.entries(grouped).map(([region, regionLaws]) => (
        <section key={region}>
          <h2 className="section">{region}</h2>
          <div className="grid">
            {regionLaws.map((law) => {
              const j = jurisdictionsById[law.jurisdictionId];
              return (
                <Link key={law.id} href={`/laws/${law.id}`} className="card">
                  <div className="card-head">
                    <span className="card-flag">{j.flag}</span>
                    <div>
                      <div className="card-title">{law.shortName}</div>
                      <div className="card-sub">{j.name}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className={`badge badge-status-${law.status}`}>
                      {STATUS_LABEL[law.status]}
                    </span>
                    <span className="badge badge-region">Effective {law.effectiveDate}</span>
                  </div>
                  <p className="card-summary">{law.summary}</p>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <Disclaimer />
    </>
  );
}
