import Link from "next/link";
import { laws, jurisdictionsById } from "@/lib/data";
import { Disclaimer } from "./components/Disclaimer";
import HomeExplorer from "./components/HomeExplorer";

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
      <HomeExplorer />

      <h2 className="section">All tracked laws</h2>
      {Object.entries(grouped).map(([region, regionLaws]) => (
        <section key={region} style={{ marginBottom: 8 }}>
          <h3 className="region-heading">{region}</h3>
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
