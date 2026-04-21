import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, relative, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const coverageDir = resolve(rootDir, process.argv[2] ?? ".coverage/v8");
const threshold = Number.parseFloat(process.env.COVERAGE_THRESHOLD ?? "80");

const sourceRoots = ["src", "deploy/cloudflare"];
const sourceExtensions = new Set([".ts", ".mjs"]);
const excludedSourcePatterns = [
  /\.d\.ts$/,
  /\.interface\.ts$/,
  /(^|\/)types\.ts$/,
  /(^|\/)types\//,
];

if (!existsSync(coverageDir)) {
  console.error(`Coverage directory not found: ${coverageDir}`);
  process.exit(1);
}

const coverageByFile = readCoverageFiles(coverageDir);
const sourceFiles = sourceRoots.flatMap((sourceRoot) =>
  listSourceFiles(resolve(rootDir, sourceRoot)),
);
const results = sourceFiles
  .map((filePath) => calculateFileCoverage(filePath, coverageByFile))
  .filter((result) => result.total > 0);

const covered = results.reduce((sum, result) => sum + result.covered, 0);
const total = results.reduce((sum, result) => sum + result.total, 0);
const percent = total === 0 ? 100 : (covered / total) * 100;

console.log(
  `Line coverage: ${formatPercent(percent)} (${covered}/${total}) across ${results.length} files`,
);

const uncovered = results
  .filter((result) => result.percent < 100)
  .sort((a, b) => a.percent - b.percent || b.total - a.total)
  .slice(0, 12);

if (uncovered.length > 0) {
  console.log("\nLowest covered files:");
  for (const result of uncovered) {
    console.log(
      `  ${formatPercent(result.percent).padStart(7)}  ${result.covered}/${result.total}  ${relative(rootDir, result.filePath)}`,
    );
  }
}

if (percent < threshold) {
  console.error(
    `\nCoverage threshold failed: ${formatPercent(percent)} < ${formatPercent(threshold)}`,
  );
  process.exit(1);
}

console.log(
  `\nCoverage threshold passed: ${formatPercent(percent)} >= ${formatPercent(threshold)}`,
);

function readCoverageFiles(dir) {
  const coverageByUrl = new Map();

  for (const fileName of readdirSync(dir)) {
    if (!fileName.endsWith(".json")) {
      continue;
    }

    const payload = JSON.parse(readFileSync(join(dir, fileName), "utf8"));
    for (const entry of payload.result ?? []) {
      const filePath = filePathFromCoverageUrl(entry.url);
      if (!filePath || !filePath.startsWith(rootDir)) {
        continue;
      }

      const entries = coverageByUrl.get(filePath) ?? [];
      entries.push(entry);
      coverageByUrl.set(filePath, entries);
    }
  }

  return coverageByUrl;
}

function listSourceFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const filePath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listSourceFiles(filePath));
      continue;
    }

    if (!sourceExtensions.has(extname(filePath))) {
      continue;
    }

    const relativePath = relative(rootDir, filePath).replaceAll("\\", "/");
    if (excludedSourcePatterns.some((pattern) => pattern.test(relativePath))) {
      continue;
    }

    files.push(filePath);
  }

  return files;
}

function calculateFileCoverage(filePath, coverageByFile) {
  const source = readFileSync(filePath, "utf8");
  const executableLines = collectExecutableLines(source);
  const entries = coverageByFile.get(filePath) ?? [];
  let covered = 0;

  for (const line of executableLines) {
    if (entries.some((entry) => isLineCovered(line.offset, entry))) {
      covered += 1;
    }
  }

  return {
    filePath,
    covered,
    total: executableLines.length,
    percent:
      executableLines.length === 0
        ? 100
        : (covered / executableLines.length) * 100,
  };
}

function collectExecutableLines(source) {
  const lines = [];
  const rawLines = source.split(/\r?\n/);
  let offset = 0;
  let insideBlockComment = false;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    const firstCodeColumn = rawLine.search(/\S/);

    if (!trimmed) {
      offset += rawLine.length + 1;
      continue;
    }

    if (insideBlockComment) {
      if (trimmed.includes("*/")) {
        insideBlockComment = false;
      }
      offset += rawLine.length + 1;
      continue;
    }

    if (trimmed.startsWith("/*")) {
      insideBlockComment = !trimmed.includes("*/");
      offset += rawLine.length + 1;
      continue;
    }

    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("import type ") ||
      trimmed.startsWith("export type ") ||
      trimmed.startsWith("type ") ||
      trimmed.startsWith("export interface ") ||
      trimmed.startsWith("interface ")
    ) {
      offset += rawLine.length + 1;
      continue;
    }

    lines.push({ offset: offset + Math.max(firstCodeColumn, 0) });
    offset += rawLine.length + 1;
  }

  return lines;
}

function isLineCovered(offset, entry) {
  for (const fn of entry.functions ?? []) {
    const range = findSmallestContainingRange(offset, fn.ranges ?? []);
    if (range?.count > 0) {
      return true;
    }
  }

  return false;
}

function findSmallestContainingRange(offset, ranges) {
  let selected = null;

  for (const range of ranges) {
    if (range.startOffset > offset || range.endOffset <= offset) {
      continue;
    }

    if (
      !selected ||
      range.endOffset - range.startOffset <
        selected.endOffset - selected.startOffset
    ) {
      selected = range;
    }
  }

  return selected;
}

function filePathFromCoverageUrl(url) {
  if (!url.startsWith("file://")) {
    return null;
  }

  return fileURLToPath(url);
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}
