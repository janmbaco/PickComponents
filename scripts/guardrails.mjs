#!/usr/bin/env node

/**
 * Guardrails script: Detects architectural violations
 * - DOM in src/core/**
 * - Unallowed tags in docs/README
 * - console/debugger in src/**
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const ALLOWED_TAGS = [
  "pick-action",
  "pick-for",
  "pick-if",
  "pick-link",
  "pick-router",
  "pick-select",
];
const VIOLATIONS = [];

// Helper: read file safely
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

// Helper: get line number
function getLineNumber(content, substring) {
  const index = content.indexOf(substring);
  if (index === -1) return -1;
  return content.substring(0, index).split("\n").length;
}

// 1. Check DOM in src/core/**
function checkDomInCore() {
  const coreDir = path.join(REPO_ROOT, "src", "core");
  if (!fs.existsSync(coreDir)) return;

  const files = fs.readdirSync(coreDir).filter((f) => f.endsWith(".ts"));

  const domPatterns = [
    "HTMLElement",
    "querySelector",
    "Document",
    "DomContext",
  ];
  files.forEach((file) => {
    const content = readFile(path.join(coreDir, file));
    if (!content) return;

    domPatterns.forEach((pattern) => {
      if (new RegExp(`\\b${pattern}\\b`).test(content)) {
        const line = getLineNumber(content, pattern);
        VIOLATIONS.push(
          `src/core/${file}:${line} - DOM type "${pattern}" found in core`,
        );
      }
    });
  });
}

// 2. Check unallowed tags in docs
function checkTags() {
  const files = ["README.md", "docs/QUICKSTART.md", "docs/PATTERNS.md"];

  files.forEach((file) => {
    const fullPath = path.join(REPO_ROOT, file);
    const content = readFile(fullPath);
    if (!content) return;

    // Check for <pick-outlet> and other invented tags
    const inventedTags =
      /<pick-(?!action|for|if|link|router|select|host)[a-z-]*>/g;
    const matches = content.match(inventedTags);
    if (matches) {
      matches.forEach((tag) => {
        const line = getLineNumber(content, tag);
        VIOLATIONS.push(
          `${file}:${line} - Invented tag "${tag}" (allowed: ${ALLOWED_TAGS.join(", ")})`,
        );
      });
    }

    // Check for <pick-host> tag (legacy, use <slot> instead)
    if (/\<\s*pick-host\b/.test(content)) {
      const line = getLineNumber(content, "<pick-host");
      VIOLATIONS.push(
        `${file}:${line} - <pick-host> tag found (use native <slot> instead)`,
      );
    }
  });
}

// 3. Check debugger in src/**
function checkDebugger() {
  const srcDir = path.join(REPO_ROOT, "src");

  function scan(dir) {
    if (!fs.existsSync(dir)) return;

    fs.readdirSync(dir).forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (file.endsWith(".ts")) {
        const content = readFile(fullPath);
        if (!content) return;

        if (/\bdebugger\b/.test(content)) {
          const line = getLineNumber(content, "debugger");
          const rel = path.relative(REPO_ROOT, fullPath);
          VIOLATIONS.push(`${rel}:${line} - "debugger" statement found`);
        }
      }
    });
  }

  scan(srcDir);
}

// 4. Check console usage in src/**
function checkConsole() {
  const srcDir = path.join(REPO_ROOT, "src");
  const allowlist = new Set([
    "src/behaviors/initializer.base.ts",
    "src/cli/index.ts",
    "src/components/pick-router.ts",
    "src/core/component-metadata-registry.ts",
    "src/decorators/index.ts",
    "src/decorators/listen.decorator.ts",
    "src/decorators/pick.decorator.ts",
    "src/registration/pick-element-factory.ts",

    "src/html/register-pick-element.ts",
    "src/providers/default-service-provider.ts",
    "src/rendering/bindings/expression-resolver.ts",
    "src/rendering/bindings/rules-resolver.ts",
    "src/rendering/bindings/static-binding-resolver.ts",
    "src/rendering/dom-context/dom-context.interface.ts",
    "src/rendering/dom-context/dom-context.ts",
    "src/rendering/inputs/pick-input-store.interface.ts",
    "src/rendering/pipeline/render-pipeline.ts",
    "src/rendering/skeleton/skeleton-renderer.ts",
    "src/rendering/templates/template-compilation-cache.ts",
    "src/rendering/templates/template-provider.ts",
    "src/utils/object-registry.ts",
  ]);

  function scan(dir) {
    if (!fs.existsSync(dir)) return;

    fs.readdirSync(dir).forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (file.endsWith(".ts")) {
        const content = readFile(fullPath);
        if (!content) return;

        const match = /\bconsole\./.exec(content);
        if (match) {
          const line = getLineNumber(content, match[0]);
          const rel = path.relative(REPO_ROOT, fullPath).replace(/\\/g, "/");
          if (allowlist.has(rel)) {
            return;
          }
          VIOLATIONS.push(
            `${rel}:${line} - "console" usage found (use logger or remove)`,
          );
        }
      }
    });
  }

  scan(srcDir);
}

// 5. Check disallowed inline event bindings (@click, v-on, (click))
function checkEventBindings() {
  const scanFiles = ["README.md", "docs/QUICKSTART.md", "docs/PATTERNS.md"];
  const bindingPatterns = [
    /@click\b/,
    /v-on:click\b/,
    /\(click\)\s*=\s*/,
    /\bonclick\s*=\s*/i,
  ];

  scanFiles.forEach((file) => {
    const fullPath = path.join(REPO_ROOT, file);
    const content = readFile(fullPath);
    if (!content) return;

    bindingPatterns.forEach((pattern) => {
      const match = pattern.exec(content);
      if (match) {
        const line = getLineNumber(content, match[0]);
        VIOLATIONS.push(
          `${file}:${line} - Disallowed inline event binding "${match[0]}" found (use pick-action)`,
        );
      }
    });
  });
}

// Run all checks
checkDomInCore();
checkTags();
checkDebugger();
checkConsole();
checkEventBindings();

// Report
if (VIOLATIONS.length > 0) {
  console.error("❌ Guardrails violations found:");
  VIOLATIONS.forEach((v) => console.error(`  ${v}`));
  process.exit(1);
} else {
  console.log("✅ Guardrails passed");
  process.exit(0);
}
