import { Disclaimer } from "@/app/components/Disclaimer";

interface Development {
  jurisdiction: string;
  flag: string;
  title: string;
  type: string;
  stage: string;
  note: string;
  source: string;
  sourceUrl: string;
}

// Seed examples illustrating the Stage-2 data shape. In the full build these
// are populated automatically from official legislative feeds and trackers.
const developments: Development[] = [
  {
    jurisdiction: "Canada (Federal)",
    flag: "🇨🇦",
    title: "Bill C-27 (CPPA + AIDA)",
    type: "Reform bill",
    stage: "Died on order paper (Parliament prorogued, Jan 2025)",
    note: "Would have replaced PIPEDA with the Consumer Privacy Protection Act and introduced the Artificial Intelligence and Data Act. Expected to be reintroduced in some form.",
    source: "LEGISinfo",
    sourceUrl: "https://www.parl.ca/legisinfo/",
  },
  {
    jurisdiction: "United States (Federal)",
    flag: "🇺🇸",
    title: "American Privacy Rights Act (APRA)",
    type: "Draft bill",
    stage: "Discussion draft / committee",
    note: "Proposed comprehensive federal privacy framework with preemption of state laws. Status has repeatedly stalled.",
    source: "Congress.gov",
    sourceUrl: "https://www.congress.gov/",
  },
  {
    jurisdiction: "European Union",
    flag: "🇪🇺",
    title: "EU AI Act — phased application",
    type: "Regulation (in force)",
    stage: "Obligations phasing in through 2026–2027",
    note: "Prohibited-practice rules applied first; obligations for general-purpose and high-risk AI systems follow on staggered dates.",
    source: "EUR-Lex",
    sourceUrl: "https://eur-lex.europa.eu/",
  },
  {
    jurisdiction: "Australia",
    flag: "🇦🇺",
    title: "Privacy Act 1988 reform",
    type: "Reform package",
    stage: "First tranche passed 2024; further tranches pending",
    note: "Implements recommendations of the Privacy Act Review, including a statutory tort for serious invasions of privacy and children's privacy code.",
    source: "OAIC",
    sourceUrl: "https://www.oaic.gov.au/",
  },
];

export default function DevelopmentsPage() {
  return (
    <>
      <span className="stage-tag">STAGE 2 · DEVELOPMENTS</span>
      <h1 className="page-title">Legislative developments</h1>
      <p className="page-lead">
        A feed of bills, drafts, consultations, and phased rollouts — the laws that are not yet
        settled. This is a preview of the Stage-2 tracker; the entries below illustrate the data
        model. In the full build these are refreshed automatically from official legislative feeds
        (Congress.gov, LEGISinfo, EUR-Lex, the EU Legislative Observatory) and policy trackers.
      </p>

      <div className="grid">
        {developments.map((d) => (
          <div key={d.title} className="card">
            <div className="card-head">
              <span className="card-flag">{d.flag}</span>
              <div>
                <div className="card-title">{d.title}</div>
                <div className="card-sub">{d.jurisdiction}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <span className="badge badge-region">{d.type}</span>
              <span className="badge badge-status-proposed">{d.stage}</span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 10px" }}>{d.note}</p>
            <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
              {d.source} ↗
            </a>
          </div>
        ))}
      </div>

      <Disclaimer />
    </>
  );
}
