"use client";

import { useState } from "react";

export type TrackKey = "ai" | "privacy";
export type RegionKey = "eu" | "us" | "asia" | "other";

export interface SourceStatus {
  id: string;
  name: string;
  type: string;
  ok: boolean;
  /** Items kept after the look-back, exclude and link filters. */
  found: number;
  /** Items parsed before any filter. Optional: older data files do not have it. */
  read?: number;
  error: string | null;
}

/** `provider` is optional so that data written before it existed still reads. */
export type Analysis =
  | { mode: "model"; model: string; provider?: string }
  | { mode: "keywords"; reason: string };

/** What a source's status line says. A source that parsed nothing is told apart from one that parsed items and kept none. */
export function sourceStatusText(s: SourceStatus): string {
  if (!s.ok) return "did not answer";
  if (s.found > 0) return `answered, ${s.found} item${s.found === 1 ? "" : "s"}`;
  if (s.read === 0) return "answered, but no items could be read";
  return "answered, nothing new";
}

export interface FeedItem {
  id: string;
  track: string;
  title: string;
  url: string;
  source: string;
  sourceType: string;
  published: string | null;
  found: string;
  region: RegionKey;
  jurisdiction: string;
  kind: string;
  summary: string;
  summaryBy: "model" | "source";
}

export interface TrackData {
  track: string;
  checked: string | null;
  analysis: Analysis | null;
  sources: SourceStatus[];
  items: FeedItem[];
}

const TRACKS: { key: TrackKey; label: string }[] = [
  { key: "ai", label: "AI law" },
  { key: "privacy", label: "Privacy law" },
];

const REGIONS: { key: "all" | RegionKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "eu", label: "EU" },
  { key: "us", label: "US" },
  { key: "asia", label: "Asia" },
  { key: "other", label: "Other" },
];

const SOURCE_TYPE_LABEL: Record<string, string> = {
  official: "Official",
  analysis: "Analysis",
  news: "News",
};

const KIND_LABEL: Record<string, string> = {
  legislation: "Legislation",
  regulation: "Regulation",
  guidance: "Guidance",
  enforcement: "Enforcement",
  court: "Court",
  consultation: "Consultation",
  standard: "Standard",
  other: "Other",
};

/** Formats a stored date in UTC so the server and the browser print the same text. */
function formatDay(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function isHttpLink(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function SourceReport({ data }: { data: TrackData }) {
  const answered = data.sources.filter((s) => s.ok).length;
  return (
    <div className="feed-status">
      {data.checked ? <div>Last checked {formatDay(data.checked)}</div> : null}
      <div>
        {answered} of {data.sources.length} sources answered
      </div>
      <details>
        <summary>Sources and how summaries were written</summary>
        <p style={{ margin: "8px 0 0" }}>
          {data.analysis?.mode === "model"
            ? `Summaries marked "AI summary" were written by the model ${data.analysis.model}${data.analysis.provider ? ` (${data.analysis.provider})` : ""}. Other summaries are the source's own description.`
            : `No AI model ran${data.analysis?.mode === "keywords" ? ` (${data.analysis.reason})` : ""}. Items were kept by keyword rules and summaries are the source's own description.`}
        </p>
        <ul>
          {data.sources.map((s) => (
            <li key={s.id}>
              {s.name}: {s.ok ? sourceStatusText(s) : <span className="feed-err">{sourceStatusText(s)}</span>}
              {!s.ok && s.error ? <span className="feed-err"> ({s.error})</span> : null}
              {s.ok && s.error ? <span style={{ color: "var(--text-faint)" }}> ({s.error})</span> : null}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function ItemCard({ item }: { item: FeedItem }) {
  const when = formatDay(item.published);
  return (
    <article className="card feed-item">
      <div className="feed-item-meta">
        <span className="badge badge-region">{item.jurisdiction}</span>
        <span className="badge feed-kind">{KIND_LABEL[item.kind] ?? "Other"}</span>
        <span className="badge feed-type">{SOURCE_TYPE_LABEL[item.sourceType] ?? item.sourceType}</span>
      </div>
      <h3 className="feed-title">
        {isHttpLink(item.url) ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        ) : (
          item.title
        )}
      </h3>
      <p className="feed-summary">{item.summary}</p>
      <div className="feed-foot">
        <span>{item.source}</span>
        <span>{when ? `Published ${when}` : `Found ${formatDay(item.found) ?? ""}`}</span>
        {item.summaryBy === "model" ? <span className="feed-ai">AI summary</span> : null}
      </div>
    </article>
  );
}

export function DevelopmentsFeed({ ai, privacy }: { ai: TrackData; privacy: TrackData }) {
  const [track, setTrack] = useState<TrackKey>("ai");
  const [region, setRegion] = useState<"all" | RegionKey>("all");
  const data = track === "ai" ? ai : privacy;
  const items = region === "all" ? data.items : data.items.filter((i) => i.region === region);

  return (
    <div>
      <div className="feed-tabs" role="group" aria-label="Choose a track">
        {TRACKS.map((t) => (
          <button
            key={t.key}
            type="button"
            className="feed-btn"
            aria-pressed={track === t.key}
            onClick={() => setTrack(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {data.checked === null ? (
        <p className="empty">The agents have not run yet. They run once a day on GitHub.</p>
      ) : (
        <>
          <SourceReport data={data} />
          <div className="feed-filter" role="group" aria-label="Filter by region">
            {REGIONS.map((r) => {
              const n = r.key === "all" ? data.items.length : data.items.filter((i) => i.region === r.key).length;
              return (
                <button
                  key={r.key}
                  type="button"
                  className="feed-btn"
                  aria-pressed={region === r.key}
                  onClick={() => setRegion(r.key)}
                >
                  {r.label}
                  <span className="feed-count">{n}</span>
                </button>
              );
            })}
          </div>
          {items.length === 0 ? (
            <p className="empty">No items for this filter yet.</p>
          ) : (
            <div className="grid">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
