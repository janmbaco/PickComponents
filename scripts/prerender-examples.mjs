import * as esbuild from "esbuild";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = fileURLToPath(new URL(".", import.meta.url));
const rootDir = join(scriptsDir, "..");
const examplesDir = join(rootDir, "examples");

const SITE_ORIGIN = "https://pickcomponents.com";
const LIGHT_THEME = "light";

const COPY = {
  en: {
    homeTitle: "Pick Components Playground",
    homeDescription:
      "Explore the public Pick Components examples with real links, readable source code, and HTML that works before JavaScript enhances the page.",
    homeHeading: "Pick Components examples",
    homeLead:
      "A public, crawlable catalog of Pick Components patterns, primitives, and architecture examples.",
    languageLabel: "Language",
    sourceHeading: "Source preview",
    previewHeading: "Example overview",
    openExample: "Open example",
    kinds: {
      primitive:
        "A focused primitive example showing the core behavior in a small component.",
      "prepared-session":
        "A guided example with multiple files and a prepared interactive session.",
      feature:
        "A larger feature example that combines services, lifecycle hooks, and component composition.",
    },
  },
  es: {
    homeTitle: "Playground de Pick Components",
    homeDescription:
      "Explora los ejemplos publicos de Pick Components con enlaces reales, codigo legible y HTML util antes de que JavaScript mejore la pagina.",
    homeHeading: "Ejemplos de Pick Components",
    homeLead:
      "Un catalogo publico e indexable de patrones, primitivas y ejemplos de arquitectura de Pick Components.",
    languageLabel: "Idioma",
    sourceHeading: "Vista previa del codigo",
    previewHeading: "Resumen del ejemplo",
    openExample: "Abrir ejemplo",
    kinds: {
      primitive:
        "Un ejemplo de primitiva enfocado en mostrar el comportamiento principal con un componente pequeno.",
      "prepared-session":
        "Un ejemplo guiado con multiples archivos y una sesion interactiva preparada.",
      feature:
        "Un ejemplo mas amplio que combina servicios, ciclos de vida y composicion de componentes.",
    },
  },
};

const {
  PLAYGROUND_LOCALES,
  PLAYGROUND_EXAMPLES,
  buildPlaygroundNavigation,
  buildPlaygroundThemeViewState,
  PLAYGROUND_SHELL_TEMPLATE,
  PICK_PRERENDER_CONTRACT_VERSION,
  computePickTemplateHash,
} = await loadPlaygroundData();
const PLAYGROUND_SHELL_TEMPLATE_HASH = computePickTemplateHash(
  PLAYGROUND_SHELL_TEMPLATE,
);

let pagesWritten = 0;

for (const locale of PLAYGROUND_LOCALES) {
  await writeRoutePage({
    locale,
    path: `/${locale}`,
    example: null,
  });

  for (const example of PLAYGROUND_EXAMPLES) {
    await writeRoutePage({
      locale,
      path: `/${locale}/${example.id}`,
      example,
    });
  }
}

console.log(`✅ SEO public routes prerendered (${pagesWritten} pages)`);

async function loadPlaygroundData() {
  const result = await esbuild.build({
    stdin: {
      contents: `
        export { PLAYGROUND_LOCALES } from "./examples/src/features/routing/models/playground-routes.ts";
        export { PLAYGROUND_EXAMPLES } from "./examples/src/features/examples-catalog/models/example-catalog.data.ts";
        export { buildPlaygroundNavigation } from "./examples/src/features/examples-catalog/services/example-catalog.service.ts";
        export { buildPlaygroundThemeViewState } from "./examples/src/features/navigation/models/playground-theme.ts";
        export { PLAYGROUND_SHELL_TEMPLATE } from "./examples/src/features/shell/components/playground-shell.view.ts";
        export { PICK_PRERENDER_CONTRACT_VERSION, computePickTemplateHash } from "./src/ssr/prerender-manifest.ts";
      `,
      loader: "ts",
      resolveDir: rootDir,
      sourcefile: "prerender-route-data.ts",
    },
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
    target: "node20",
  });

  const code = result.outputFiles[0].text;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(code).toString(
    "base64",
  )}`;
  return import(moduleUrl);
}

async function writeRoutePage({ locale, path, example }) {
  const outputDir = join(examplesDir, path.replace(/^\//u, ""));
  await mkdir(outputDir, { recursive: true });

  const html = await renderDocument({ locale, path, example });
  await writeFile(join(outputDir, "index.html"), html);
  pagesWritten++;
}

async function renderDocument({ locale, path, example }) {
  const copy = COPY[locale];
  const title = example
    ? `${example.labels[locale]} - Pick Components`
    : copy.homeTitle;
  const description = example
    ? `${example.labels[locale]}: ${copy.kinds[example.kind]}`
    : copy.homeDescription;
  const canonicalUrl = `${SITE_ORIGIN}${path}`;
  const alternateLocale = locale === "es" ? "en" : "es";
  const alternatePath = example
    ? `/${alternateLocale}/${example.id}`
    : `/${alternateLocale}`;
  const state = buildSerializedState({ locale, path, example });

  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <link rel="alternate" hreflang="${alternateLocale}" href="${SITE_ORIGIN}${alternatePath}" />
    <link rel="alternate" hreflang="${locale}" href="${canonicalUrl}" />
    <script>
      (function () {
        document.documentElement.setAttribute("data-pick-enhancing", "true");
        let t = localStorage.getItem("pc-theme");
        if (t === "light" || t === "dark") {
          document.documentElement.setAttribute("data-theme", t);
        }
      })();
    </script>
    <link rel="stylesheet" href="/pico.min.css" />
    <style>${renderPublicStyles()}</style>
  </head>
  <body>
    ${await renderBody({ locale, path, example })}
    <script type="application/json" data-pick-state data-pick-for="playground-shell">${escapeScriptJson(
      state,
    )}</script>
    <script type="module" src="/bundle.js"></script>
  </body>
</html>
`;
}

async function renderBody({ locale, path, example }) {
  const copy = COPY[locale];
  const currentPath = path;
  const activeExample = example ?? PLAYGROUND_EXAMPLES[0];
  const activeExampleSrc = activeExample.variantSrcs[locale][LIGHT_THEME];
  const navigationGroups = buildPlaygroundNavigation(locale, LIGHT_THEME);
  const theme = buildPlaygroundThemeViewState(locale, "auto", LIGHT_THEME);
  const esPath = example ? `/es/${activeExample.id}` : "/es";
  const enPath = example ? `/en/${activeExample.id}` : "/en";
  const languageLinks = renderLanguageLinks(locale, activeExample, example);
  const sidebar = renderSidebar({ locale, navigationGroups, currentPath });
  const main = example
    ? await renderExampleMain(locale, example)
    : renderHomeMain(locale);
  const hydrationPreview = renderHydrationPreview(locale, activeExampleSrc);

  return `<playground-shell
      locale="${locale}"
      data-pick-prerendered="true"
      data-pick-render-mode="light"
      data-pick-runtime-version="${PICK_PRERENDER_CONTRACT_VERSION}"
      data-pick-selector="playground-shell"
      data-pick-template-hash="${PLAYGROUND_SHELL_TEMPLATE_HASH}"
    >
      <div class="pg-shell" data-pick-prerender-root="true">
        <div class="pg-topbar">
          <div class="brand">
            <a href="/${locale}"><span>Pick</span>Components</a>
          </div>
          <div class="spacer"></div>
          <div class="controls">
            <language-switcher espath="${escapeHtml(esPath)}" enpath="${escapeHtml(enPath)}">
              <nav class="language-nav" aria-label="${escapeHtml(
                copy.languageLabel,
              )}">
                ${languageLinks}
              </nav>
            </language-switcher>
            <theme-switcher
              mode="${theme.mode}"
              icon="${escapeHtml(theme.icon)}"
              label="${escapeHtml(theme.label)}"
              buttontitle="${escapeHtml(theme.title)}"
            >
              <span class="theme-fallback">${escapeHtml(theme.label)}</span>
            </theme-switcher>
          </div>
        </div>
        <aside class="pg-sidebar">
          <tab-nav>
            ${sidebar}
          </tab-nav>
        </aside>
        <div class="pg-main">
          <playground-route-view locale="${locale}" src="${escapeHtml(activeExampleSrc)}">
            ${hydrationPreview}
            ${main}
          </playground-route-view>
        </div>
      </div>
    </playground-shell>`;
}

function renderLanguageLinks(locale, activeExample, example) {
  const esPath = example ? `/es/${activeExample.id}` : "/es";
  const enPath = example ? `/en/${activeExample.id}` : "/en";

  return `
    <a href="${esPath}"${locale === "es" ? ' aria-current="page"' : ""}>ES</a>
    <a href="${enPath}"${locale === "en" ? ' aria-current="page"' : ""}>EN</a>
  `;
}

function renderSidebar({ navigationGroups, currentPath }) {
  return `<nav class="sidebar-nav" aria-label="Examples">
    ${navigationGroups
      .map(
        (group) => `<section>
          <h2 class="cat-label">${escapeHtml(group.label)}</h2>
          <ul>
            ${group.items
              .map(
                (item) => `<li>
                  <a href="${item.to}"${
                    item.to === currentPath ? ' aria-current="page"' : ""
                  }>${escapeHtml(item.label)}</a>
                </li>`,
              )
              .join("")}
          </ul>
        </section>`,
      )
      .join("")}
  </nav>`;
}

function renderHydrationPreview(locale, activeExampleSrc) {
  const fileName = activeExampleSrc.split("/").at(-1) ?? "example.ts";
  const labels =
    locale === "es"
      ? {
          result: "Resultado",
          run: "Ejecutar",
        }
      : {
          result: "Result",
          run: "Run",
        };

  return `<div class="pg-hydration-preview" aria-hidden="true">
    <div class="hydration-tabs">
      <span class="hydration-tab active">${escapeHtml(fileName)}</span>
      <span class="hydration-tab">index.html</span>
      <span class="hydration-action">${escapeHtml(labels.run)}</span>
    </div>
    <div class="hydration-workspace">
      <div class="hydration-editor">
        <div class="hydration-code-row"><span></span><i></i></div>
        <div class="hydration-code-row"><span></span><i></i></div>
        <div class="hydration-code-row"><span></span><i></i></div>
        <div class="hydration-code-row"><span></span><i></i></div>
        <div class="hydration-code-row"><span></span><i></i></div>
        <div class="hydration-code-row"><span></span><i></i></div>
        <div class="hydration-code-row"><span></span><i></i></div>
        <div class="hydration-code-row"><span></span><i></i></div>
      </div>
      <div class="hydration-result">
        <div class="hydration-result-bar">${escapeHtml(labels.result)}</div>
        <div class="hydration-output">
          <div class="hydration-preview-card">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderHomeMain(locale) {
  const copy = COPY[locale];

  return `<section class="seo-page">
    <p class="eyebrow">Pick Components</p>
    <h1>${escapeHtml(copy.homeHeading)}</h1>
    <p class="lead">${escapeHtml(copy.homeLead)}</p>
    <div class="example-grid">
      ${PLAYGROUND_EXAMPLES.map(
        (example) => `<article>
          <h2>${escapeHtml(example.labels[locale])}</h2>
          <p>${escapeHtml(copy.kinds[example.kind])}</p>
          <a href="/${locale}/${example.id}">${escapeHtml(copy.openExample)}</a>
        </article>`,
      ).join("")}
    </div>
  </section>`;
}

async function renderExampleMain(locale, example) {
  const copy = COPY[locale];
  const source = await readExampleSource(example, locale);
  const excerpt =
    source.length > 3800 ? `${source.slice(0, 3800)}\n...` : source;

  return `<article class="seo-page seo-example">
    <p class="eyebrow">${escapeHtml(example.category)}</p>
    <h1>${escapeHtml(example.labels[locale])}</h1>
    <p class="lead">${escapeHtml(copy.kinds[example.kind])}</p>
    <section class="overview-panel" aria-labelledby="overview-heading">
      <h2 id="overview-heading">${escapeHtml(copy.previewHeading)}</h2>
      <p>${escapeHtml(exampleSummary(locale, example))}</p>
    </section>
    <section class="source-panel" aria-labelledby="source-heading">
      <h2 id="source-heading">${escapeHtml(copy.sourceHeading)}</h2>
      <pre><code>${escapeHtml(excerpt)}</code></pre>
    </section>
  </article>`;
}

async function readExampleSource(example, locale) {
  const publicSrc = example.variantSrcs[locale][LIGHT_THEME];
  const filePath = join(examplesDir, publicSrc.replace(/^\//u, ""));

  if (!existsSync(filePath)) {
    return "";
  }

  return readFile(filePath, "utf-8");
}

function buildSerializedState({ locale, path, example }) {
  return {
    version: 1,
    locale,
    currentPath: path,
    activeExampleId: example?.id ?? null,
    activeThemeVariant: LIGHT_THEME,
  };
}

function exampleSummary(locale, example) {
  if (locale === "es") {
    return `Este documento prerenderizado muestra ${example.labels[locale]} como contenido HTML navegable. La experiencia interactiva se activa despues con el bundle del playground.`;
  }

  return `This prerendered document exposes ${example.labels[locale]} as navigable HTML. The interactive playground experience is enhanced later by the client bundle.`;
}

function renderPublicStyles() {
  return `
    :root {
      color-scheme: light dark;
      --pg-shell-topbar-bg: #151b23;
      --pg-shell-topbar-color: #eef2f7;
      --pg-shell-panel-bg: #111822;
      --pg-shell-panel-border: #2a3443;
      --pg-shell-brand-accent: #98c379;
      --pg-shell-sidebar-heading: #7c8799;
      --pg-shell-sidebar-link: #e7edf7;
      --pg-shell-sidebar-hover-bg: #1a2331;
      --pg-shell-sidebar-active-bg: rgba(97, 175, 239, 0.16);
      --pg-shell-sidebar-active-border: #61afef;
      --pg-shell-sidebar-active-color: #8ac6f5;
      --pg-page-bg: #0f1622;
      --pg-page-panel: #151e2c;
      --pg-page-text: #e9eef7;
      --pg-page-muted: #a8b3c5;
      --pg-page-code: #0b111a;
    }

    :root[data-theme="light"] {
      --pg-shell-topbar-bg: #f4f7fb;
      --pg-shell-topbar-color: #1d2735;
      --pg-shell-panel-bg: #f7f9fc;
      --pg-shell-panel-border: #d7dee8;
      --pg-shell-brand-accent: #5c8f2d;
      --pg-shell-sidebar-heading: #6d7685;
      --pg-shell-sidebar-link: #243040;
      --pg-shell-sidebar-hover-bg: #edf3f8;
      --pg-shell-sidebar-active-bg: rgba(16, 149, 193, 0.1);
      --pg-shell-sidebar-active-border: #1095c1;
      --pg-shell-sidebar-active-color: #0b76a6;
      --pg-page-bg: #f7f9fc;
      --pg-page-panel: #ffffff;
      --pg-page-text: #243040;
      --pg-page-muted: #657289;
      --pg-page-code: #f2f5f9;
    }

    html,
    body {
      margin: 0;
      min-height: 100%;
      background: var(--pg-page-bg);
      color: var(--pg-page-text);
    }

    body {
      overflow: hidden;
    }

    playground-shell {
      display: block;
      min-height: 100vh;
    }

    language-switcher,
    theme-switcher {
      display: inline-flex;
      flex: 0 0 auto;
    }

    tab-nav,
    playground-route-view {
      display: block;
    }

    .pg-shell {
      display: grid;
      grid-template-rows: auto 1fr;
      grid-template-columns: 220px minmax(0, 1fr);
      min-height: 100vh;
      background: var(--pg-shell-panel-bg);
      color: var(--pg-shell-topbar-color);
    }

    .pg-topbar {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      gap: 1rem;
      min-height: 52px;
      padding: 0 1rem;
      background: var(--pg-shell-topbar-bg);
      border-bottom: 1px solid var(--pg-shell-panel-border);
    }

    .brand {
      color: inherit;
      font-weight: 700;
      white-space: nowrap;
    }

    .brand a {
      color: inherit;
      text-decoration: none;
      white-space: nowrap;
    }

    .brand span {
      color: var(--pg-shell-brand-accent);
    }

    .spacer {
      flex: 1;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.35rem 0;
    }

    .language-nav {
      display: flex;
      gap: 0.25rem;
    }

    .language-nav a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2.4rem;
      min-height: 2rem;
      border-radius: 999px;
      color: inherit;
      font-size: 0.8rem;
      font-weight: 800;
      text-decoration: none;
    }

    .language-nav a[aria-current="page"] {
      background: var(--pg-shell-sidebar-active-bg);
      color: var(--pg-shell-sidebar-active-color);
    }

    .theme-fallback {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 5rem;
      min-height: 2rem;
      padding: 0 0.8rem;
      border: 1px solid var(--pg-shell-panel-border);
      border-radius: 999px;
      color: inherit;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .pg-sidebar {
      min-height: 0;
      overflow-y: auto;
      padding: 0.75rem 0;
      border-right: 1px solid var(--pg-shell-panel-border);
      background: var(--pg-shell-panel-bg);
    }

    .sidebar-nav ul {
      margin: 0 0 0.5rem;
      padding: 0;
      list-style: none;
    }

    .sidebar-nav li {
      margin: 0;
      padding: 0;
    }

    .cat-label {
      margin: 0;
      padding: 0.5rem 1rem 0.35rem;
      color: var(--pg-shell-sidebar-heading);
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .sidebar-nav a {
      display: block;
      margin: 0 0.5rem 0.1rem 0;
      padding: 0.4rem 1rem 0.4rem 1.1rem;
      border-left: 3px solid transparent;
      border-radius: 0 0.7rem 0.7rem 0;
      color: var(--pg-shell-sidebar-link);
      font-size: 0.8rem;
      text-decoration: none;
    }

    .sidebar-nav a:hover {
      background: var(--pg-shell-sidebar-hover-bg);
      color: var(--pg-shell-sidebar-active-color);
    }

    .sidebar-nav a[aria-current="page"] {
      border-left-color: var(--pg-shell-sidebar-active-border);
      background: var(--pg-shell-sidebar-active-bg);
      color: var(--pg-shell-sidebar-active-color);
      font-weight: 600;
    }

    .pg-main {
      display: flex;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      background: var(--pg-page-bg);
    }

    playground-route-view {
      flex: 1;
      min-width: 0;
      min-height: 0;
      overflow: auto;
    }

    .pg-hydration-preview {
      display: none;
    }

    :root[data-pick-enhancing="true"] playground-route-view > .seo-page {
      display: none;
    }

    :root[data-pick-enhancing="true"] playground-route-view > .pg-hydration-preview {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      background: var(--pg-page-bg);
      color: var(--pg-page-text);
    }

    .hydration-tabs {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      min-height: 44px;
      padding: 0.45rem 0.75rem 0;
      border-bottom: 1px solid var(--pg-shell-panel-border);
      background: var(--pg-page-panel);
    }

    .hydration-tab,
    .hydration-action {
      display: inline-flex;
      align-items: center;
      min-height: 2rem;
      padding: 0 0.75rem;
      border: 1px solid var(--pg-shell-panel-border);
      border-bottom: 0;
      border-radius: 6px 6px 0 0;
      color: var(--pg-page-muted);
      font-size: 0.78rem;
      font-weight: 700;
      line-height: 1;
    }

    .hydration-tab.active {
      background: var(--pg-page-bg);
      color: var(--pg-page-text);
    }

    .hydration-action {
      margin-left: auto;
      border: 1px solid var(--pg-shell-panel-border);
      border-radius: 6px;
      background: var(--pg-shell-sidebar-active-bg);
      color: var(--pg-shell-sidebar-active-color);
    }

    .hydration-workspace {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(280px, 38%);
      flex: 1;
      min-height: 0;
    }

    .hydration-editor {
      display: flex;
      flex-direction: column;
      align-content: start;
      gap: 0.65rem;
      min-width: 0;
      min-height: 0;
      padding: 1.25rem;
      border-right: 1px solid var(--pg-shell-panel-border);
      background: var(--pg-page-code);
    }

    .hydration-code-row {
      display: grid;
      grid-template-columns: 2rem minmax(0, 1fr);
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    .hydration-code-row span {
      display: block;
      width: 1.1rem;
      height: 0.5rem;
      border-radius: 999px;
      background: var(--pg-shell-panel-border);
      opacity: 0.55;
    }

    .hydration-code-row i,
    .hydration-preview-card span {
      display: block;
      height: 0.7rem;
      border-radius: 999px;
      background: var(--pg-page-muted);
      opacity: 0.24;
    }

    .hydration-code-row:nth-child(1) i {
      width: 46%;
    }

    .hydration-code-row:nth-child(2) i {
      width: 72%;
    }

    .hydration-code-row:nth-child(3) i {
      width: 58%;
    }

    .hydration-code-row:nth-child(4) i {
      width: 84%;
    }

    .hydration-code-row:nth-child(5) i {
      width: 66%;
    }

    .hydration-code-row:nth-child(6) i {
      width: 76%;
    }

    .hydration-code-row:nth-child(7) i {
      width: 52%;
    }

    .hydration-code-row:nth-child(8) i {
      width: 64%;
    }

    .hydration-result {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      background: var(--pg-page-panel);
    }

    .hydration-result-bar {
      min-height: 40px;
      padding: 0.7rem 1rem;
      border-bottom: 1px solid var(--pg-shell-panel-border);
      color: var(--pg-page-muted);
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .hydration-output {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-height: 220px;
      padding: 1.5rem;
    }

    .hydration-preview-card {
      display: grid;
      gap: 0.8rem;
      width: min(24rem, 100%);
      min-height: 9rem;
      align-content: center;
      padding: 1.2rem;
      border: 1px solid var(--pg-shell-panel-border);
      border-radius: 8px;
      background: var(--pg-page-bg);
    }

    .hydration-preview-card span:nth-child(1) {
      width: 42%;
      height: 0.9rem;
      opacity: 0.34;
    }

    .hydration-preview-card span:nth-child(2) {
      width: 78%;
    }

    .hydration-preview-card span:nth-child(3) {
      width: 54%;
    }

    .seo-page {
      max-width: 960px;
      margin: 0 auto;
      padding: 2rem;
      color: var(--pg-page-text);
    }

    .eyebrow {
      margin: 0 0 0.4rem;
      color: var(--pg-page-muted);
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .seo-page h1 {
      margin: 0 0 0.75rem;
      font-size: 2rem;
      line-height: 1.15;
    }

    .lead {
      max-width: 68ch;
      color: var(--pg-page-muted);
      font-size: 1rem;
    }

    .example-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .example-grid article,
    .overview-panel,
    .source-panel {
      border: 1px solid var(--pg-shell-panel-border);
      border-radius: 8px;
      background: var(--pg-page-panel);
      padding: 1rem;
    }

    .example-grid h2,
    .overview-panel h2,
    .source-panel h2 {
      margin: 0 0 0.5rem;
      font-size: 1rem;
    }

    .example-grid p,
    .overview-panel p {
      color: var(--pg-page-muted);
      font-size: 0.92rem;
    }

    .source-panel {
      margin-top: 1rem;
    }

    pre {
      max-height: 28rem;
      margin: 0;
      overflow: auto;
      border-radius: 6px;
      background: var(--pg-page-code);
      padding: 1rem;
      white-space: pre;
    }

    code {
      font-size: 0.82rem;
    }

    @media (max-width: 768px) {
      body {
        overflow: auto;
      }

      .pg-shell {
        display: block;
      }

      .pg-sidebar {
        display: none;
      }

      .seo-page {
        padding: 1.25rem;
      }

      .hydration-workspace {
        display: block;
      }

      .hydration-editor {
        border-right: 0;
      }

      .hydration-result {
        display: none;
      }
    }
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

function escapeScriptJson(value) {
  return JSON.stringify(value).replace(/</gu, "\\u003c");
}
