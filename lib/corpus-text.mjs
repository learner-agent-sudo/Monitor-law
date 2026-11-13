// ---------------------------------------------------------------------------
// Corpus text helpers shared by the build and check scripts.
//
// A corpus file is a markdown file with YAML-style front matter. These helpers
// give the body text the way the checks and the evidence builder need it: the
// front matter removed, and (for bilingual zh+en files) the CJK-dominant lines
// dropped so the English can be matched contiguously.
// ---------------------------------------------------------------------------

export function readFrontMatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return {};
  return Object.fromEntries(
    m[1]
      .split("\n")
      .map((l) => l.match(/^(\w+):\s*(.*)$/))
      .filter(Boolean)
      .map((x) => [x[1], x[2].trim()]),
  );
}

export function stripFrontMatter(md) {
  const m = md.match(/^---\n[\s\S]*?\n---\n/);
  return m ? md.slice(m[0].length) : md;
}

/**
 * Same filter as scripts/check-quotes.mjs: for a bilingual CJK+Latin text only,
 * drop the CJK-dominant lines so the English can be matched contiguously.
 */
export function stripCjkLines(text, language = "") {
  const bilingual = /zh/.test(language) && /en/.test(language);
  if (!bilingual) return text;
  const cjk = /[　-〿㐀-䶿一-鿿豈-﫿＀-￯]/g;
  return text
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      return (t.match(cjk) || []).length / t.length < 0.2;
    })
    .join("\n");
}

