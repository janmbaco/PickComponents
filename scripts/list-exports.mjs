#!/usr/bin/env node

/**
 * list-exports.mjs — Discovers all exported functions in src/ and lists them
 * with their file location, signature, and public API status.
 *
 * Usage:
 *   node scripts/list-exports.mjs
 *   node scripts/list-exports.mjs --public-only
 *   node scripts/list-exports.mjs --json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(REPO_ROOT, "src");
const INDEX_FILE = path.join(SRC_DIR, "index.ts");

const args = process.argv.slice(2);
const PUBLIC_ONLY = args.includes("--public-only");
const JSON_OUTPUT = args.includes("--json");

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Recursively collect all .ts files under a directory */
function collectTsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(full));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".d.ts")
    ) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Extract the JSDoc comment immediately preceding the given line index.
 * Returns plain text (first meaningful line of the comment, stripped of * prefix).
 */
function extractJsDocBefore(lines, lineIndex) {
  // Walk backwards from lineIndex - 1 to find enclosing /** ... */
  let end = lineIndex - 1;
  // Skip blank lines
  while (end >= 0 && lines[end].trim() === "") end--;
  if (end < 0 || !lines[end].trim().endsWith("*/")) return null;

  let start = end;
  while (start >= 0 && !lines[start].trim().startsWith("/**")) start--;
  if (start < 0) return null;

  const commentLines = lines.slice(start, end + 1);
  // Collect non-empty description lines (skip @tags)
  const description = commentLines
    .map((l) => l.replace(/^\s*\/?\*+\/?/, "").trim())
    .filter((l) => l && !l.startsWith("@"))
    .join(" ")
    .trim();

  return description || null;
}

/**
 * Extract the full signature of a function starting at lineIndex.
 * Reads until the opening `{` or `;` is found (handles multi-line params).
 */
function extractSignature(lines, lineIndex) {
  const MAX_LINES = 10;
  const collected = [];
  for (
    let i = lineIndex;
    i < Math.min(lineIndex + MAX_LINES, lines.length);
    i++
  ) {
    collected.push(lines[i].trim());
    if (lines[i].includes("{") || lines[i].endsWith(";")) break;
  }
  return collected
    .join(" ")
    .replace(/\s*\{.*$/, "")
    .replace(/;$/, "")
    .trim();
}

/** Read the public index to determine which function names are publicly exported */
function publicExportedNames() {
  if (!fs.existsSync(INDEX_FILE)) return new Set();
  const content = fs.readFileSync(INDEX_FILE, "utf-8");

  const names = new Set();
  // Match: export { foo, bar } from '...'  or  export { foo as bar } from '...'
  const braceRe = /export\s*\{([^}]+)\}/g;
  let m;
  while ((m = braceRe.exec(content)) !== null) {
    for (const part of m[1].split(",")) {
      const alias = part.trim().split(/\s+as\s+/);
      names.add(alias[alias.length - 1].trim());
    }
  }

  // Match: export function foo / export async function foo / export const foo =
  const directRe = /export\s+(?:async\s+)?(?:function|const)\s+(\w+)/g;
  while ((m = directRe.exec(content)) !== null) {
    names.add(m[1]);
  }

  return names;
}

// ── Patterns ──────────────────────────────────────────────────────────────────

// Matches lines like: export function foo / export async function foo
const EXPORT_FN_RE = /^export\s+(?:async\s+)?function\s+(\w+)/;

// ── Main ──────────────────────────────────────────────────────────────────────

const publicNames = publicExportedNames();
const tsFiles = collectTsFiles(SRC_DIR);

/** @type {Array<{name: string, signature: string, file: string, description: string|null, isPublic: boolean}>} */
const results = [];

for (const filePath of tsFiles) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const relFile = path.relative(REPO_ROOT, filePath);

  lines.forEach((line, idx) => {
    const match = EXPORT_FN_RE.exec(line);
    if (!match) return;

    const name = match[1];
    const description = extractJsDocBefore(lines, idx);
    const signature = extractSignature(lines, idx);

    results.push({
      name,
      signature,
      file: relFile,
      description,
      isPublic: publicNames.has(name),
    });
  });
}

// Sort: public first, then alphabetical by name
results.sort((a, b) => {
  if (a.isPublic !== b.isPublic) return a.isPublic ? -1 : 1;
  return a.name.localeCompare(b.name);
});

const filtered = PUBLIC_ONLY ? results.filter((r) => r.isPublic) : results;

// ── Output ────────────────────────────────────────────────────────────────────

if (JSON_OUTPUT) {
  console.log(JSON.stringify(filtered, null, 2));
  process.exit(0);
}

const publicGroup = filtered.filter((r) => r.isPublic);
const internalGroup = filtered.filter((r) => !r.isPublic);

function printGroup(label, items) {
  if (items.length === 0) return;
  console.log(`\n${"═".repeat(60)}`);
  console.log(` ${label} (${items.length})`);
  console.log("═".repeat(60));
  for (const fn of items) {
    console.log(`\n  ${fn.name}`);
    console.log(`  Signature : ${fn.signature}`);
    console.log(`  File      : ${fn.file}`);
    if (fn.description) {
      console.log(`  Summary   : ${fn.description}`);
    }
  }
}

console.log("\nPick Components — Exported Functions");
printGroup("PUBLIC API  (re-exported from src/index.ts)", publicGroup);

if (!PUBLIC_ONLY) {
  printGroup("INTERNAL    (exported but not in public API)", internalGroup);
}

console.log(`\n${"─".repeat(60)}`);
console.log(` Total: ${filtered.length} exported function(s)`);
if (!PUBLIC_ONLY) {
  console.log(
    ` Public: ${publicGroup.length}   Internal: ${internalGroup.length}`,
  );
}
console.log("─".repeat(60) + "\n");
