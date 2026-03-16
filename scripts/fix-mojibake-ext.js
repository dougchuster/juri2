/* eslint-disable no-console */
// Aggressive but still targeted mojibake fixer for PT-BR UI strings.
// Covers both double-pass sequences (ÃƒÂ£ -> ã) and single-pass sequences (Ã£ -> ã).
//
// Usage:
//   node scripts/fix-mojibake-ext.js
//
// It edits .ts/.tsx/.md/.prisma under src/, docs/ and prisma/ (excluding src/generated/).

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ROOTS = ["src", "docs", "prisma"].map((p) => path.join(ROOT, p)).filter((p) => fs.existsSync(p));

/** @type {Array<[string, string]>} */
const REPLACEMENTS = [
  // Quotes/dashes/bullets
  ["Ã¢â‚¬â€", "—"],
  ["Ã¢â‚¬â€œ", "–"],
  ["Ã¢â‚¬Ëœ", "‘"],
  ["Ã¢â‚¬â„¢", "’"],
  ["Ã¢â‚¬Å“", "“"],
  ["Ã¢â‚¬Â", "”"],
  ["Ã¢â‚¬Â¢", "•"],
  ["Ã¢â‚¬Â¦", "…"],

  // Common Portuguese mojibake (double-pass)
  ["ÃƒÂ¡", "á"],
  ["ÃƒÂ ", "à"],
  ["ÃƒÂ¢", "â"],
  ["ÃƒÂ£", "ã"],
  ["ÃƒÂ¤", "ä"],
  ["ÃƒÂ", "Á"],
  ["Ãƒâ‚¬", "À"],
  ["Ãƒâ€š", "Â"],
  ["ÃƒÆ’", "Ã"],
  ["Ãƒâ€ž", "Ä"],
  ["ÃƒÂ©", "é"],
  ["ÃƒÂ¨", "è"],
  ["ÃƒÂª", "ê"],
  ["ÃƒÂ«", "ë"],
  ["Ãƒâ€°", "É"],
  ["ÃƒË†", "È"],
  ["ÃƒÅ ", "Ê"],
  ["Ãƒâ€¹", "Ë"],
  ["ÃƒÂ­", "í"],
  ["ÃƒÂ¬", "ì"],
  ["ÃƒÂ®", "î"],
  ["ÃƒÂ¯", "ï"],
  ["ÃƒÂ", "Í"],
  ["ÃƒÅ’", "Ì"],
  ["ÃƒÅ½", "Î"],
  ["ÃƒÂ", "Ï"],
  ["ÃƒÂ³", "ó"],
  ["ÃƒÂ²", "ò"],
  ["ÃƒÂ´", "ô"],
  ["ÃƒÂµ", "õ"],
  ["ÃƒÂ¶", "ö"],
  ["Ãƒâ€œ", "Ó"],
  ["Ãƒâ€™", "Ò"],
  ["Ãƒâ€", "Ô"],
  ["Ãƒâ€¢", "Õ"],
  ["Ãƒâ€“", "Ö"],
  ["ÃƒÂº", "ú"],
  ["ÃƒÂ¹", "ù"],
  ["ÃƒÂ»", "û"],
  ["ÃƒÂ¼", "ü"],
  ["ÃƒÅ¡", "Ú"],
  ["Ãƒâ„¢", "Ù"],
  ["Ãƒâ€º", "Û"],
  ["ÃƒÅ“", "Ü"],
  ["ÃƒÂ§", "ç"],
  ["Ãƒâ€¡", "Ç"],

  // Ordinals/nbsp artifacts (double-pass + single-pass)
  ["Ã‚Âº", "º"],
  ["Ã‚Âª", "ª"],
  ["Ã‚Â ", " "],
  ["Âº", "º"],
  ["Âª", "ª"],
  ["Â ", " "],

  // Single-pass UTF-8->Latin1 mojibake (common in PT-BR strings)
  ["Ã¡", "á"],
  ["Ã ", "à"],
  ["Ã¢", "â"],
  ["Ã£", "ã"],
  ["Ã¤", "ä"],
  ["Ã", "Á"],
  ["Ã", "À"],
  ["Ã", "Â"],
  ["Ã", "Ã"],
  ["Ã", "Ä"],
  ["Ã©", "é"],
  ["Ã¨", "è"],
  ["Ãª", "ê"],
  ["Ã«", "ë"],
  ["Ã", "É"],
  ["Ã", "È"],
  ["Ã", "Ê"],
  ["Ã", "Ë"],
  ["Ã­", "í"],
  ["Ã¬", "ì"],
  ["Ã®", "î"],
  ["Ã¯", "ï"],
  ["Ã", "Í"],
  ["Ã", "Ì"],
  ["Ã", "Î"],
  ["Ã", "Ï"],
  ["Ã³", "ó"],
  ["Ã²", "ò"],
  ["Ã´", "ô"],
  ["Ãµ", "õ"],
  ["Ã¶", "ö"],
  ["Ã", "Ó"],
  ["Ã", "Ò"],
  ["Ã", "Ô"],
  ["Ã", "Õ"],
  ["Ã", "Ö"],
  ["Ãº", "ú"],
  ["Ã¹", "ù"],
  ["Ã»", "û"],
  ["Ã¼", "ü"],
  ["Ã", "Ú"],
  ["Ã", "Ù"],
  ["Ã", "Û"],
  ["Ã", "Ü"],
  ["Ã§", "ç"],
  ["Ã", "Ç"],
];

function shouldProcessFile(filePath) {
  const okExt =
    filePath.endsWith(".ts") ||
    filePath.endsWith(".tsx") ||
    filePath.endsWith(".md") ||
    filePath.endsWith(".prisma");
  if (!okExt) return false;
  if (filePath.includes(`${path.sep}src${path.sep}generated${path.sep}`)) return false;
  if (filePath.includes(`${path.sep}.next${path.sep}`)) return false;
  if (filePath.includes(`${path.sep}node_modules${path.sep}`)) return false;
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

function fixText(text) {
  let next = text;
  for (const [from, to] of REPLACEMENTS) {
    if (next.includes(from)) next = next.split(from).join(to);
  }
  return next;
}

function main() {
  const files = [];
  for (const root of ROOTS) walk(root, files);

  let changedFiles = 0;
  let totalReplacements = 0;

  for (const file of files) {
    const original = fs.readFileSync(file, "utf8");
    let text = original;
    for (const [from, to] of REPLACEMENTS) {
      const before = text;
      if (before.includes(from)) {
        const parts = before.split(from);
        totalReplacements += parts.length - 1;
        text = parts.join(to);
      }
    }
    if (text !== original) {
      fs.writeFileSync(file, text, "utf8");
      changedFiles += 1;
    }
  }

  console.log(`[fix-mojibake-ext] Done. Files changed: ${changedFiles}. Replacements: ${totalReplacements}.`);
}

main();

