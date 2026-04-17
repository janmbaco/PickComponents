export const PLAYGROUND_PREVIEW_PORT_TOKEN = "PlaygroundPreviewPort";

export interface IPlaygroundPreviewPort {
  buildPlaceholderSrcdoc(theme: "light" | "dark"): string;
  buildMultiSrcdoc(
    modules: Map<string, string>,
    stylesheets: Map<string, string>,
    entryFile: string,
    htmlContent: string,
    htmlHeadContent: string,
    locale: string,
    theme: "light" | "dark",
    autoBootstrap: boolean,
  ): string;
}

export class BrowserPlaygroundPreviewPort implements IPlaygroundPreviewPort {
  buildPlaceholderSrcdoc(theme: "light" | "dark"): string {
    return buildPlaceholderSrcdoc(theme);
  }

  buildMultiSrcdoc(
    modules: Map<string, string>,
    stylesheets: Map<string, string>,
    entryFile: string,
    htmlContent: string,
    htmlHeadContent: string,
    locale: string,
    theme: "light" | "dark",
    autoBootstrap: boolean,
  ): string {
    return buildSrcdocMulti(
      modules,
      stylesheets,
      entryFile,
      htmlContent,
      htmlHeadContent,
      locale,
      theme,
      autoBootstrap,
    );
  }
}

function injectLocale(html: string, locale: string): string {
  return html.replace(
    /<([a-z][a-z0-9]*-[a-z0-9-]*)([^>]*?)(\/?>)/gi,
    (match, tag, attrs, close) => {
      if (/\blocale\s*=/.test(attrs)) {
        return match;
      }
      return `<${tag}${attrs} locale="${locale}"${close}`;
    },
  );
}

function buildPlaceholderSrcdoc(theme: "light" | "dark"): string {
  return `<!DOCTYPE html>
<html data-theme="${theme}">
<head>
<meta charset="UTF-8">
<style>
  :root {
    color-scheme: ${theme};
  }
  html, body {
    margin: 0;
    min-height: 100%;
    background: ${theme === "light" ? "#f4f7fb" : "#1b2430"};
    color: ${theme === "light" ? "#1f2937" : "#d8e0eb"};
  }
</style>
</head>
<body></body>
</html>`;
}

function buildSrcdocMulti(
  modules: Map<string, string>,
  stylesheets: Map<string, string>,
  entryFile: string,
  htmlContent: string,
  htmlHeadContent: string,
  locale: string,
  theme: "light" | "dark",
  autoBootstrap: boolean,
): string {
  const injectedHtml = injectLocale(htmlContent, locale);
  const injectedHead = sanitizePreviewHeadContent(htmlHeadContent);
  const injectedStyles = [...stylesheets.entries()]
    .map(
      ([fileName, css]) =>
        `<style data-playground-file="${fileName}">\n${css.replace(/<\/style/giu, "<\\/style")}\n</style>`,
    )
    .join("\n");

  const importMap: Record<string, string> = {
    "pick-components": "/vendor/pick-components.js",
    "pick-components/bootstrap": "/vendor/pick-components-bootstrap.js",
    injectkit: "/vendor/injectkit.js",
  };

  const localFiles = new Set([...modules.keys(), ...stylesheets.keys()]);

  function rewriteLocalImports(code: string): string {
    for (const localFile of localFiles) {
      const escaped = localFile.replace(/\./g, "\\.");
      code = code.replace(
        new RegExp(`(['"])\\.\\/` + escaped + `(['"])`, "g"),
        `$1__pg__/${localFile}$2`,
      );
    }
    return code;
  }

  for (const [filename, code] of modules.entries()) {
    if (filename !== entryFile) {
      const rewritten = rewriteLocalImports(code);
      importMap[`__pg__/${filename}`] =
        `data:text/javascript;charset=utf-8,${encodeURIComponent(rewritten)}`;
    }
  }

  for (const [filename, css] of stylesheets.entries()) {
    importMap[`__pg__/${filename}`] =
      `data:text/javascript;charset=utf-8,${encodeURIComponent(
        `const stylesheet = ${JSON.stringify(css)};\nexport default stylesheet;\n`,
      )}`;
  }

  const entryCode = rewriteLocalImports(modules.get(entryFile) ?? "");

  let scriptBody: string;
  if (autoBootstrap) {
    const lines = entryCode.split("\n");
    const imports: string[] = [];
    const body: string[] = [];
    const frameworkSpecifiers = new Set<string>([
      "bootstrapFramework",
      "Services",
    ]);

    for (const line of lines) {
      if (/^\s*import\s/.test(line)) {
        const fromFrameworkImport = line.match(
          /import\s*\{([^}]+)\}\s*from\s*['"]pick-components['"]/,
        );
        if (fromFrameworkImport) {
          for (const specifier of fromFrameworkImport[1].split(",")) {
            const name = specifier.trim();
            if (name) {
              frameworkSpecifiers.add(name);
            }
          }
        } else {
          imports.push(line);
        }
      } else {
        body.push(line);
      }
    }

    const mergedImport = `import { ${[...frameworkSpecifiers].join(", ")} } from 'pick-components';`;
    const importBlock = [mergedImport, ...imports].join("\n");

    scriptBody = `${importBlock}
await bootstrapFramework(Services);

try {
${body.join("\n")}
} catch (e) {
  const pre = document.createElement('pre');
  pre.style.cssText = 'color:#e06c75;padding:1rem;font-size:0.8rem;white-space:pre-wrap;';
  pre.textContent = e.message + '\\n' + (e.stack || '');
  document.querySelector('main').appendChild(pre);
}`;
  } else {
    const lines = entryCode.split("\n");
    const imports: string[] = [];
    const body: string[] = [];

    for (const line of lines) {
      if (/^\s*import\s/.test(line)) {
        imports.push(line);
      } else {
        body.push(line);
      }
    }

    scriptBody = `${imports.join("\n")}

try {
${body.join("\n")}
} catch (e) {
  const pre = document.createElement('pre');
  pre.style.cssText = 'color:#e06c75;padding:1rem;font-size:0.8rem;white-space:pre-wrap;';
  pre.textContent = e.message + '\\n' + (e.stack || '');
  document.querySelector('main').appendChild(pre);
}`;
  }

  return `<!DOCTYPE html>
<html lang="${locale}" data-theme="${theme}">
<head>
<meta charset="UTF-8">
<script type="importmap">
${JSON.stringify({ imports: importMap }, null, 2)}
</script>
<style>
  :root {
    color-scheme: ${theme};
  }
  html {
    background: ${theme === "light" ? "#f4f7fb" : "#1b2430"};
    color: ${theme === "light" ? "#1f2937" : "#d8e0eb"};
  }
  body { margin: 0; padding: 1rem; font-family: system-ui, sans-serif; font-size: 0.9rem; background: transparent; color: inherit; }
  main { max-width: 100%; }
</style>
${injectedHead}
${injectedStyles}
</head>
<body>
<main>
${injectedHtml}
</main>
<script type="module">
${scriptBody}
</script>
</body>
</html>`;
}

function sanitizePreviewHeadContent(headContent: string): string {
  return headContent
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/>/gi, "")
    .replace(/<meta\s+charset=(?:"[^"]*"|'[^']*'|[^\s/>]+)\s*\/?>/gi, "")
    .trim();
}
