import {
  archiveBaseNameFromFileName,
  extractPlaygroundHtmlParts,
  type CodePlaygroundSessionState,
  type CodePlaygroundTabSnapshot,
} from "../models/code-playground.session.js";
import type {
  IPlaygroundDownloadPort,
  PlaygroundArchiveEntry,
} from "../ports/playground-download.port.js";
import { withPlaygroundBasePath } from "../../routing/models/playground-public-path.js";
import { escapeRegExp } from "../security/escape-reg-exp.js";
import {
  downloadHeadContentPolicy,
  sanitizeHeadContent,
} from "../security/head-content-sanitizer.js";

export async function downloadCodePlaygroundArchive(
  session: CodePlaygroundSessionState,
  tabs: CodePlaygroundTabSnapshot[],
  locale: string,
  downloadPort: IPlaygroundDownloadPort,
): Promise<void> {
  const entries: PlaygroundArchiveEntry[] = [];
  const baseName = archiveBaseNameFromFileName(session.fileName);
  const entryJs = session.entryFile.replace(/\.ts$/, ".js");
  const cacheKey = createDownloadCacheKey();
  const cacheSuffix = `?pc-download=${cacheKey}`;
  const htmlTabs = tabs.filter((tab) => tab.descriptor.lang === "html");
  const documentTab =
    htmlTabs.find((tab) => isIndexHtml(tab.descriptor.file)) ?? htmlTabs[0];
  const htmlTemplateFiles = htmlTabs
    .filter((tab) => tab !== documentTab)
    .map((tab) => tab.descriptor.file);
  const stylesheetFiles = tabs
    .filter((tab) => tab.descriptor.lang === "css")
    .map((tab) => tab.descriptor.file);
  const localTypeScriptFiles = tabs
    .filter((tab) => tab.descriptor.lang === "ts")
    .map((tab) => tab.descriptor.file);
  const needsInjectKit = tabs.some(
    (tab) =>
      tab.descriptor.lang === "ts" &&
      /\bfrom\s+["']injectkit["']/.test(tab.code),
  );
  const needsFrameworkRuntime =
    session.autoBootstrap ||
    tabs.some(
      (tab) =>
        tab.descriptor.lang === "ts" &&
        /\bfrom\s+["']pick-components(?:\/bootstrap)?["']/.test(tab.code),
    );
  const needsFrameworkBootstrap = tabs.some(
    (tab) =>
      tab.descriptor.lang === "ts" &&
      /\bfrom\s+["']pick-components\/bootstrap["']/.test(tab.code),
  );

  for (const tab of tabs) {
    if (tab.descriptor.lang === "ts") {
      entries.push({ name: tab.descriptor.file, content: tab.code });
      continue;
    }

    if (tab.descriptor.lang === "css") {
      entries.push({ name: tab.descriptor.file, content: tab.code });
      continue;
    }

    if (tab.descriptor.lang === "html" && tab !== documentTab) {
      entries.push({ name: tab.descriptor.file, content: tab.code });
      continue;
    }

    const htmlParts = extractPlaygroundHtmlParts(tab.code);
    const headContent = indentHtmlFragment(
      sanitizeDownloadHeadContent(htmlParts.head),
      "  ",
    );
    const importMap = buildDownloadImportMap({
      cacheSuffix,
      needsInjectKit,
      needsFrameworkRuntime,
      needsFrameworkBootstrap,
    });
    const stylesheetLinks = stylesheetFiles
      .map((file) => `  <link rel="stylesheet" href="./${file}${cacheSuffix}">`)
      .join("\n");
    const importMapScript =
      Object.keys(importMap.imports).length > 0
        ? `\n  <script type="importmap">\n${JSON.stringify(importMap, null, 2)}\n  </script>`
        : "";
    const indexHtml = session.autoBootstrap
      ? `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
${headContent}
  ${stylesheetLinks}
  ${importMapScript}
  <script type="module">
    import { bootstrapFramework, Services } from 'pick-components';
    await bootstrapFramework(Services);
    await import('./${entryJs}${cacheSuffix}');
  </script>
</head>
<body>
  ${htmlParts.body}
</body>
</html>`
      : `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
${headContent}
  ${stylesheetLinks}
  ${importMapScript}
  <script type="module" src="./${entryJs}${cacheSuffix}"></script>
</head>
<body>
  ${htmlParts.body}
</body>
</html>`;

    entries.push({ name: "index.html", content: indexHtml });
  }

  entries.push({
    name: "README.md",
    content: buildDownloadReadme({
      baseName,
      needsInjectKit,
      needsFrameworkBootstrap,
    }),
  });
  entries.push({
    name: "package.json",
    content: buildDownloadPackageJson(baseName),
  });
  entries.push({
    name: "scripts/build.mjs",
    content: buildDownloadBuildScript({
      localTypeScriptFiles,
      stylesheetFiles,
      htmlTemplateFiles,
    }),
  });

  const runtimeEntries = await loadRuntimeArchiveEntries({
    needsInjectKit,
    needsFrameworkRuntime,
    needsFrameworkBootstrap,
  });
  entries.push(...runtimeEntries);

  downloadPort.downloadArchive(baseName, entries);
}

function buildDownloadImportMap({
  cacheSuffix,
  needsInjectKit,
  needsFrameworkRuntime,
  needsFrameworkBootstrap,
}: {
  cacheSuffix: string;
  needsInjectKit: boolean;
  needsFrameworkRuntime: boolean;
  needsFrameworkBootstrap: boolean;
}): { imports: Record<string, string> } {
  const imports: Record<string, string> = {};

  if (needsFrameworkRuntime) {
    imports["pick-components"] = `./vendor/pick-components.js${cacheSuffix}`;
  }

  if (needsFrameworkBootstrap) {
    imports["pick-components/bootstrap"] =
      `./vendor/pick-components-bootstrap.js${cacheSuffix}`;
  }

  if (needsInjectKit) {
    imports.injectkit = `./vendor/injectkit.js${cacheSuffix}`;
  }

  return { imports };
}

function buildDownloadReadme({
  baseName,
  needsInjectKit,
  needsFrameworkBootstrap,
}: {
  baseName: string;
  needsInjectKit: boolean;
  needsFrameworkBootstrap: boolean;
}): string {
  const notes = [
    "# Running This Example",
    "",
    `This archive contains the TypeScript source for the "${baseName}" example.`,
    "It includes the Pick Components runtime bundle under `vendor/`; it does not load framework code from the internet at runtime.",
    "It also includes a local TypeScript compiler used only by `npm run build`, so the generated JavaScript can be rebuilt without installing dependencies.",
    "",
    "Do not open `index.html` via `file://`.",
    "First transpile the TypeScript source, then serve this folder over HTTP.",
    "",
    "Option A: npm",
    "```bash",
    "npm start",
    "```",
    "",
    "`npm start` runs the local build script and then starts a Python HTTP server on port 4173.",
    "",
    "Option B: manual build + Python",
    "```bash",
    "npm run build",
    "python -m http.server 4173",
    "```",
    "",
    "If your system exposes Python as `python3`, use:",
    "```bash",
    "npm run build",
    "python3 -m http.server 4173",
    "```",
    "",
    "Then open:",
    "",
    "`http://localhost:4173`",
    "",
    "Archive contents:",
    "- `index.html`: runnable entry point",
    "- `package.json`: local scripts for building and serving the example",
    "- `scripts/build.mjs`: transpiles the TypeScript source and creates CSS/HTML text modules",
    "- `vendor/pick-components.js`: Pick Components runtime bundle included with the download",
    "- `vendor/typescript-standalone.js`: local TypeScript compiler used by the build script",
    "- `*.css`: local stylesheets referenced by the example",
    "- `*.template.html`: local templates imported by the example",
    "- `*.ts`: original source tabs from the playground",
    "- `*.js` and `*.js.map`: generated by `npm run build` for browser execution and debugging",
  ];

  if (needsFrameworkBootstrap) {
    notes.push(
      "- `vendor/pick-components-bootstrap.js`: bootstrap runtime for direct `pick-components/bootstrap` imports",
    );
  }

  if (needsInjectKit) {
    notes.push("- `vendor/injectkit.js`: InjectKit runtime");
  }

  return notes.join("\n");
}

async function loadRuntimeArchiveEntries({
  needsInjectKit,
  needsFrameworkRuntime,
  needsFrameworkBootstrap,
}: {
  needsInjectKit: boolean;
  needsFrameworkRuntime: boolean;
  needsFrameworkBootstrap: boolean;
}): Promise<PlaygroundArchiveEntry[]> {
  const entries: PlaygroundArchiveEntry[] = [];

  if (needsFrameworkRuntime) {
    entries.push({
      name: "vendor/pick-components.js",
      content: await fetchRequiredText(
        withPlaygroundBasePath("/vendor/pick-components.js"),
      ),
    });
  }

  entries.push({
    name: "vendor/typescript-standalone.js",
    content: await fetchRequiredText(
      withPlaygroundBasePath("/vendor/typescript-standalone.js"),
    ),
  });

  if (needsFrameworkBootstrap) {
    entries.push({
      name: "vendor/pick-components-bootstrap.js",
      content: await fetchRequiredText(
        withPlaygroundBasePath("/vendor/pick-components-bootstrap.js"),
      ),
    });
  }

  if (needsInjectKit) {
    entries.push({
      name: "vendor/injectkit.js",
      content: await fetchRequiredText(
        withPlaygroundBasePath("/vendor/injectkit.js"),
      ),
    });
  }

  return entries;
}

async function fetchRequiredText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch runtime asset ${url}: ${response.status}`);
  }

  return response.text();
}

function buildDownloadPackageJson(baseName: string): string {
  return `${JSON.stringify(
    {
      name: baseName,
      private: true,
      type: "module",
      scripts: {
        build: "node scripts/build.mjs",
        serve: "python -m http.server 4173",
        start: "npm run build && npm run serve",
      },
    },
    null,
    2,
  )}\n`;
}

function buildDownloadBuildScript({
  localTypeScriptFiles,
  stylesheetFiles,
  htmlTemplateFiles,
}: {
  localTypeScriptFiles: string[];
  stylesheetFiles: string[];
  htmlTemplateFiles: string[];
}): string {
  const escapedStylesheetFiles = stylesheetFiles.map((file) => ({
    file,
    escaped: escapeRegExp(file),
  }));
  const escapedHtmlTemplateFiles = htmlTemplateFiles.map((file) => ({
    file,
    escaped: escapeRegExp(file),
  }));
  const escapedLocalTypeScriptFiles = localTypeScriptFiles.map((file) => ({
    file,
    escaped: escapeRegExp(file),
    jsFile: file.replace(/\.ts$/, ".js"),
  }));

  return `import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localTypeScriptFiles = ${JSON.stringify(localTypeScriptFiles, null, 2)};
const stylesheetFiles = ${JSON.stringify(stylesheetFiles, null, 2)};
const htmlTemplateFiles = ${JSON.stringify(htmlTemplateFiles, null, 2)};
const escapedStylesheetFiles = ${JSON.stringify(escapedStylesheetFiles, null, 2)};
const escapedHtmlTemplateFiles = ${JSON.stringify(escapedHtmlTemplateFiles, null, 2)};
const escapedLocalTypeScriptFiles = ${JSON.stringify(escapedLocalTypeScriptFiles, null, 2)};

const ts = await loadTypeScriptCompiler();

for (const file of stylesheetFiles) {
  const css = await readFile(resolve(rootDirectory, file), "utf8");
  await writeGeneratedFile(
    \`\${file}.js\`,
    \`const stylesheet = \${JSON.stringify(css)};\\nexport default stylesheet;\\n\`,
  );
}

for (const file of htmlTemplateFiles) {
  const html = await readFile(resolve(rootDirectory, file), "utf8");
  await writeGeneratedFile(
    \`\${file}.js\`,
    \`const template = \${JSON.stringify(html)};\\nexport default template;\\n\`,
  );
}

for (const file of localTypeScriptFiles) {
  const source = await readFile(resolve(rootDirectory, file), "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      experimentalDecorators: false,
      sourceMap: true,
      inlineSources: true,
    },
    fileName: file,
  });

  if (result.diagnostics?.length) {
    throw new Error(
      result.diagnostics.map((diagnostic) => {
        const message = diagnostic.messageText;
        return typeof message === "string" ? message : JSON.stringify(message);
      }).join("\\n"),
    );
  }

  const outputFile = file.replace(/\\.ts$/, ".js");
  const sourceMapFile = \`\${outputFile}.map\`;
  await writeGeneratedFile(
    outputFile,
    ensureSourceMapReference(rewriteLocalImports(result.outputText), sourceMapFile),
  );

  if (result.sourceMapText) {
    await writeGeneratedFile(sourceMapFile, result.sourceMapText);
  }
}

console.log(\`Built \${localTypeScriptFiles.length} TypeScript file(s).\`);

async function loadTypeScriptCompiler() {
  const compilerSource = await readFile(
    resolve(rootDirectory, "vendor/typescript-standalone.js"),
    "utf8",
  );
  const sandbox = {};
  vm.runInNewContext(\`\${compilerSource}\\n;this.__ts = ts;\`, sandbox, {
    filename: "vendor/typescript-standalone.js",
  });

  if (!sandbox.__ts?.transpileModule) {
    throw new Error("The bundled TypeScript compiler could not be loaded.");
  }

  return sandbox.__ts;
}

async function writeGeneratedFile(file, content) {
  const absolutePath = resolve(rootDirectory, file);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content);
}

function rewriteLocalImports(code) {
  let rewritten = code;

  for (const { file, escaped } of escapedStylesheetFiles) {
    rewritten = rewritten.replace(
      new RegExp(\`(['"])\\\\./\${escaped}(['"])\`, "g"),
      (_match, openingQuote, closingQuote) =>
        \`\${openingQuote}./\${file}.js\${closingQuote}\`,
    );
  }

  for (const { file, escaped } of escapedHtmlTemplateFiles) {
    rewritten = rewritten.replace(
      new RegExp(\`(['"])\\\\./\${escaped}(['"])\`, "g"),
      (_match, openingQuote, closingQuote) =>
        \`\${openingQuote}./\${file}.js\${closingQuote}\`,
    );
  }

  for (const { escaped, jsFile } of escapedLocalTypeScriptFiles) {
    rewritten = rewritten.replace(
      new RegExp(\`(['"])\\\\./\${escaped}(['"])\`, "g"),
      (_match, openingQuote, closingQuote) =>
        \`\${openingQuote}./\${jsFile}\${closingQuote}\`,
    );
  }

  return rewritten;
}

function ensureSourceMapReference(code, sourceMapFile) {
  const sourceMapComment = \`//# sourceMappingURL=\${sourceMapFile}\`;
  if (/\\/\\/# sourceMappingURL=.*$/m.test(code)) {
    return code.replace(/\\/\\/# sourceMappingURL=.*$/m, sourceMapComment);
  }

  return \`\${code.trimEnd()}\\n\${sourceMapComment}\\n\`;
}
`;
}

function sanitizeDownloadHeadContent(headContent: string): string {
  return sanitizeHeadContent(headContent, downloadHeadContentPolicy);
}

function indentHtmlFragment(fragment: string, indentation: string): string {
  if (!fragment) {
    return "";
  }

  return fragment
    .split("\n")
    .map((line) => `${indentation}${line}`)
    .join("\n");
}

function createDownloadCacheKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function isIndexHtml(file: string): boolean {
  return file === "index.html";
}
