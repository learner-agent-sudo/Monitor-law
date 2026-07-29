import type { Jurisdiction } from "@/lib/types";

export const jurisdictions: Jurisdiction[] = [
  {
    id: "eu",
    name: "European Union",
    region: "Europe",
    flag: "🇪🇺",
  },
  {
    id: "us-ca",
    name: "California (USA)",
    region: "North America",
    flag: "🇺🇸",
  },
  {
    id: "ca",
    name: "Canada (Federal)",
    region: "North America",
    flag: "🇨🇦",
  },
  {
    id: "ca-qc",
    name: "Québec (Canada)",
    region: "North America",
    flag: "🇨🇦",
  },
  {
    id: "cn",
    name: "China",
    region: "Asia-Pacific",
    flag: "🇨🇳",
  },
  {
    id: "hk",
    name: "Hong Kong SAR",
    region: "Asia-Pacific",
    flag: "🇭🇰",
  },
];

export const jurisdictionsById: Record<string, Jurisdiction> = Object.fromEntries(
  jurisdictions.map((j) => [j.id, j]),
);
