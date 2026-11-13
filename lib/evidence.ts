import { useEffect } from "react";

// ---------------------------------------------------------------------------
// The law text behind each citation, loaded on demand.
//
// Each law's evidence file (lib/data/evidence/<lawId>.json, written by
// scripts/build-evidence.mjs) is imported dynamically, so every law becomes its
// own chunk and nothing ships until a page needs it. Loads are cached per law.
// A failed load resolves to no items and is not cached, so it can be retried.
// ---------------------------------------------------------------------------

export interface Evidence {
  citation: string;
  provision: string | null;
  scope: "provision" | "file" | "quote-only";
  before: string;
  match: string;
  after: string;
  cutStart: boolean;
  cutEnd: boolean;
}

interface EvidenceFile {
  lawId: string;
  items: Record<string, Evidence>;
}

const cache = new Map<string, Promise<Record<string, Evidence>>>();

async function importItems(lawId: string): Promise<Record<string, Evidence> | null> {
  try {
    const mod = await import(`@/lib/data/evidence/${lawId}.json`);
    const doc: EvidenceFile = mod.default ?? mod;
    return doc.items ?? {};
  } catch {
    return null;
  }
}

/** Every evidence item for one law, keyed "f:<facetId>", "t:<termId>" or "m:<requirementId>". */
export function loadEvidence(lawId: string): Promise<Record<string, Evidence>> {
  let pending = cache.get(lawId);
  if (!pending) {
    pending = importItems(lawId).then((items) => {
      if (items === null) {
        cache.delete(lawId);
        return {};
      }
      return items;
    });
    cache.set(lawId, pending);
  }
  return pending;
}

/** Start loading these laws now, so the text is ready before the first hover. */
export function usePreloadEvidence(lawIds: string[]): void {
  const key = [...new Set(lawIds)].sort().join(",");
  useEffect(() => {
    if (!key) return;
    for (const id of key.split(",")) void loadEvidence(id);
  }, [key]);
}
