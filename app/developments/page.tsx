import { Disclaimer } from "@/app/components/Disclaimer";
import aiData from "@/lib/data/developments/ai.json";
import privacyData from "@/lib/data/developments/privacy.json";
import { DevelopmentsFeed, type TrackData } from "./DevelopmentsFeed";

// Both files are written once a day by the research agents (see docs/RESEARCH_AGENTS.md).
const ai = aiData as TrackData;
const privacy = privacyData as TrackData;

export default function DevelopmentsPage() {
  return (
    <>
      <span className="stage-tag">STAGE 2 · DEVELOPMENTS</span>
      <h1 className="page-title">Legal developments</h1>
      <p className="page-lead">
        Two research agents check official sources, law-firm analysis and news every day for changes
        in AI law and privacy law in the EU, the US and Asia. Summaries marked &ldquo;AI summary&rdquo;
        were written by a small AI model from the source&apos;s own headline and description, so open
        the source before relying on one.
      </p>

      <DevelopmentsFeed ai={ai} privacy={privacy} />

      <Disclaimer />
    </>
  );
}
