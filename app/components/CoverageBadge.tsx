import type { Strictness } from "@/lib/types";

const LABELS: Record<Strictness, string> = {
  0: "Not addressed",
  1: "Limited",
  2: "Moderate",
  3: "Comprehensive",
};

export function CoverageBadge({ level }: { level: Strictness }) {
  return <span className={`pill pill-${level}`}>{LABELS[level]}</span>;
}
