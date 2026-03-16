/* eslint-disable no-console */
// Fix common UTF-8->Latin1 mojibake sequences that ended up committed as source text.
// This is intentionally conservative: only replaces well-known multi-char sequences.
//
// Usage:
//   node scripts/fix-mojibake.js
//
// It edits common text source files under src/, docs/ and prisma/ (excluding src/generated/).

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const DOCS_DIR = path.join(ROOT, "docs");
const PRISMA_DIR = path.join(ROOT, "prisma");

/** @type {Array<[string, string]>} */
const REPLACEMENTS = [
  // Quotes/dashes/bullets
  ["â€”", "—"],
  ["â€“", "–"],
  ["â€˜", "‘"],
  ["â€™", "’"],
  ["â€œ", "“"],
  ["â€", "”"],
  ["â€¢", "•"],
  ["â€¦", "…"],
  // Common Portuguese mojibake
  ["Ã¡", "á"],
  ["Ã ", "à"],
  ["Ã¢", "â"],
  ["Ã£", "ã"],
  ["Ã¤", "ä"],
  ["Ã", "Á"],
  ["Ã€", "À"],
  ["Ã‚", "Â"],
  ["Ãƒ", "Ã"],
  ["Ã„", "Ä"],
  ["Ã©", "é"],
  ["Ã¨", "è"],
  ["Ãª", "ê"],
  ["Ã«", "ë"],
  ["Ã‰", "É"],
  ["Ãˆ", "È"],
  ["ÃŠ", "Ê"],
  ["Ã‹", "Ë"],
  ["Ã­", "í"],
  ["Ã¬", "ì"],
  ["Ã®", "î"],
  ["Ã¯", "ï"],
  ["Ã", "Í"],
  ["ÃŒ", "Ì"],
  ["ÃŽ", "Î"],
  ["Ã", "Ï"],
  ["Ã³", "ó"],
  ["Ã²", "ò"],
  ["Ã´", "ô"],
  ["Ãµ", "õ"],
  ["Ã¶", "ö"],
  ["Ã“", "Ó"],
  ["Ã’", "Ò"],
  ["Ã”", "Ô"],
  ["Ã•", "Õ"],
  ["Ã–", "Ö"],
  ["Ãº", "ú"],
  ["Ã¹", "ù"],
  ["Ã»", "û"],
  ["Ã¼", "ü"],
  ["Ãš", "Ú"],
  ["Ã™", "Ù"],
  ["Ã›", "Û"],
  ["Ãœ", "Ü"],
  ["Ã§", "ç"],
  ["Ã‡", "Ç"],
  // Ordinals/nbsp artifacts
  ["Âº", "º"],
  ["Âª", "ª"],
  ["Â ", " "], // NBSP -> normal space
];

function shouldProcessFile(filePath) {
  if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) return false;
  const rel = path.relative(SRC_DIR, filePath);
  if (rel.startsWith("generated" + path.sep)) return false;
  if (rel.startsWith("generated/")) return false;
  return true;
}

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      walk(p, out);
    } else if (e.isFile()) {
      if (shouldProcessFile(p)) out.push(p);
    }
  }
}

function applyReplacements(text) {
  let changed = false;
  let next = text;
  for (const [from, to] of REPLACEMENTS) {
    if (next.includes(from)) {
      next = next.split(from).join(to);
      changed = true;
    }
  }
  return { changed, text: next };
}

function main() {
  const files = [];
  walk(SRC_DIR, files);

  let changedFiles = 0;
  let totalReplacements = 0;

  for (const file of files) {
    const original = fs.readFileSync(file, "utf8");
    let text = original;
    let fileRepl = 0;
    for (const [from, to] of REPLACEMENTS) {
      const before = text;
      if (before.includes(from)) {
        const parts = before.split(from);
        fileRepl += parts.length - 1;
        text = parts.join(to);
      }
    }
    if (text !== original) {
      fs.writeFileSync(file, text, "utf8");
      changedFiles += 1;
      totalReplacements += fileRepl;
    }
  }

  console.log(
    `[fix-mojibake] Done. Files changed: ${changedFiles}. Replacements: ${totalReplacements}.`
  );
}

main();
