import { expect, test } from "@playwright/test";
import { downloadCodePlaygroundArchive } from "../../../examples/src/features/playground/use-cases/download-code-playground-archive.use-case.js";
import type { CodePlaygroundSessionState } from "../../../examples/src/features/playground/models/code-playground.session.js";
import type { CodePlaygroundTabSnapshot } from "../../../examples/src/features/playground/models/code-playground.session.js";
import type {
  IPlaygroundDownloadPort,
  PlaygroundArchiveEntry,
} from "../../../examples/src/features/playground/ports/playground-download.port.js";

class CapturingDownloadPort implements IPlaygroundDownloadPort {
  baseName = "";
  entries: PlaygroundArchiveEntry[] = [];

  downloadArchive(baseName: string, entries: PlaygroundArchiveEntry[]): void {
    this.baseName = baseName;
    this.entries = entries;
  }
}

test.describe("downloadCodePlaygroundArchive", () => {
  const originalFetch = globalThis.fetch;

  test.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("should bootstrap the framework before importing auto-bootstrapped component modules", async () => {
    globalThis.fetch = async () =>
      ({
        ok: true,
        text: async () => "export {};",
      }) as Response;

    const session: CodePlaygroundSessionState = {
      src: "/playground-examples/02-counter/en-dark/counter.example.ts",
      fileName: "counter.example.ts",
      entryFile: "counter.example.ts",
      autoBootstrap: true,
      tabs: [],
    };
    const tabs: CodePlaygroundTabSnapshot[] = [
      {
        descriptor: {
          file: "counter.example.ts",
          label: "Component",
          lang: "ts",
        },
        initialCode: "",
        code: [
          'import counterTemplate from "./counter.template.html";',
          'import counterStyles from "./counter.styles.css";',
          'import { PickRender } from "pick-components";',
          "@PickRender({ selector: 'counter-example', template: counterTemplate, styles: counterStyles })",
          "class CounterExample {}",
        ].join("\n"),
      },
      {
        descriptor: {
          file: "counter.template.html",
          label: "Template",
          lang: "html",
        },
        initialCode: "",
        code: "<p>Count: {{ count }}</p>",
      },
      {
        descriptor: {
          file: "counter.styles.css",
          label: "Styles",
          lang: "css",
        },
        initialCode: "",
        code: ":host { display: block; }",
      },
      {
        descriptor: {
          file: "index.html",
          label: "HTML",
          lang: "html",
        },
        initialCode: "",
        code: [
          "<!doctype html>",
          '<html lang="en">',
          "<head>",
          '  <meta charset="UTF-8" />',
          "  <style>",
          "    body { background: #111827; }",
          "    counter-example { --counter-fg: #e5eefb; }",
          "  </style>",
          '  <script type="module">',
          '    import "./counter.example.js";',
          "  </script>",
          "</head>",
          "<body>",
          "  <counter-example></counter-example>",
          "</body>",
          "</html>",
        ].join("\n"),
      },
    ];
    const downloadPort = new CapturingDownloadPort();

    await downloadCodePlaygroundArchive(session, tabs, "en", downloadPort);

    const indexHtml = requireEntry(downloadPort.entries, "index.html");
    const readme = requireEntry(downloadPort.entries, "README.md");
    const packageJson = requireEntry(downloadPort.entries, "package.json");
    const buildScript = requireEntry(downloadPort.entries, "scripts/build.mjs");

    expect(indexHtml).toContain("await bootstrapFramework");
    expect(indexHtml).toMatch(
      /await import\('\.\/counter\.example\.js\?pc-download=[^']+'\);/,
    );
    expect(indexHtml).not.toContain("import './counter.example.js';");
    expect(indexHtml).toMatch(
      /"pick-components": "\.\/vendor\/pick-components\.js\?pc-download=[^"]+"/,
    );
    expect(indexHtml).not.toContain("pick-components/bootstrap");
    expect(indexHtml).toMatch(
      /<link rel="stylesheet" href="\.\/counter\.styles\.css\?pc-download=[^"]+">/,
    );
    expect(indexHtml).toContain("body { background: #111827; }");
    expect(indexHtml).toContain("counter-example { --counter-fg: #e5eefb; }");
    expect(indexHtml).not.toContain('import "./counter.example.js";');
    expect(indexHtml).not.toContain("https://");
    expect(indexHtml).not.toContain("http://");
    expect(indexHtml.indexOf("await bootstrapFramework")).toBeLessThan(
      indexHtml.indexOf("await import('./counter.example.js?pc-download="),
    );
    expect(hasEntry(downloadPort.entries, "counter.example.js")).toBe(false);
    expect(hasEntry(downloadPort.entries, "counter.styles.css.js")).toBe(false);
    expect(hasEntry(downloadPort.entries, "counter.template.html")).toBe(true);
    expect(hasEntry(downloadPort.entries, "counter.template.html.js")).toBe(
      false,
    );
    expect(buildScript).toContain('"counter.example.ts"');
    expect(buildScript).toContain('"counter.styles.css"');
    expect(buildScript).toContain('"counter.template.html"');
    expect(buildScript).toContain("target: ts.ScriptTarget.ES2022");
    expect(buildScript).toContain("sourceMap: true");
    expect(buildScript).toContain("inlineSources: true");
    expect(buildScript).toContain("result.sourceMapText");
    expect(buildScript).toContain("ensureSourceMapReference");
    expect(buildScript).toContain("const sourceMapFile = `${outputFile}.map`");
    expect(packageJson).toContain('"build": "node scripts/build.mjs"');
    expect(
      requireEntry(downloadPort.entries, "vendor/pick-components.js"),
    ).toBe("export {};");
    expect(
      requireEntry(downloadPort.entries, "vendor/typescript-standalone.js"),
    ).toBe("export {};");
    expect(
      hasEntry(downloadPort.entries, "vendor/pick-components-bootstrap.js"),
    ).toBe(false);
    expect(readme).toContain(
      "It includes the Pick Components runtime bundle under `vendor/`",
    );
    expect(readme).toContain("does not load framework code from the internet");
    expect(readme).toContain("npm start");
    expect(readme).toContain("debugging");
    expect(readme).toContain("CSS/HTML text modules");
  });
});

function requireEntry(entries: PlaygroundArchiveEntry[], name: string): string {
  const entry = entries.find((candidate) => candidate.name === name);
  if (!entry) {
    throw new Error(`Missing archive entry ${name}`);
  }

  return entry.content;
}

function hasEntry(entries: PlaygroundArchiveEntry[], name: string): boolean {
  return entries.some((candidate) => candidate.name === name);
}
