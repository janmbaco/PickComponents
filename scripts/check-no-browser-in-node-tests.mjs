import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const TARGET_DIRS = [
  path.join(ROOT, "tests", "unit"),
  path.join(ROOT, "tests", "integration"),
];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const PATTERNS = [
  "\\bpage\\b",
  "\\bbrowser\\b",
  "\\bBrowserContext\\b",
  "\\bchromium\\b",
  "\\bfirefox\\b",
  "\\bwebkit\\b",
  "\\blaunch\\b",
  "\\bwebServer\\b",
  "\\bgoto\\b",
  "storageState",
];

const regex = new RegExp(PATTERNS.join("|"), "i");

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full)));
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const violations = [];
  for (const dir of TARGET_DIRS) {
    let files = [];
    try {
      files = await collectFiles(dir);
    } catch {
      // Missing directory is fine (e.g., integration may not exist).
      continue;
    }

    for (const file of files) {
      const content = await fs.readFile(file, "utf8");
      const contentWithoutStrings = content
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "")
        .replace(/`[^`]*`|'[^']*'|"[^"]*"/g, '""');
      if (regex.test(contentWithoutStrings)) {
        const first = contentWithoutStrings.match(regex)?.[0] ?? "";
        violations.push({ file, match: first });
      }
    }
  }

  if (violations.length > 0) {
    console.error(
      "❌ Browser APIs are forbidden in unit/integration tests (Node + DOM sim only).",
    );
    violations.forEach((v) =>
      console.error(` - ${v.file}: found '${v.match}'`),
    );
    process.exit(1);
  }

  console.log(
    "✅ Node-only tests guardrail: no browser APIs detected in unit/integration suites.",
  );
}

main().catch((error) => {
  console.error("Guardrail check failed:", error);
  process.exit(1);
});
