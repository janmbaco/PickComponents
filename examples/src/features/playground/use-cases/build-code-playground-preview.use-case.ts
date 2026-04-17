import {
  extractPlaygroundHtmlParts,
  type CodePlaygroundSessionState,
  type CodePlaygroundTabSnapshot,
} from "../models/code-playground.session.js";
import type { IPlaygroundPreviewPort } from "../ports/playground-preview.port.js";
import type { ITypeScriptTranspilerPort } from "../ports/typescript-transpiler.port.js";

export function buildCodePlaygroundPreviewDocument(
  session: CodePlaygroundSessionState,
  tabs: CodePlaygroundTabSnapshot[],
  locale: string,
  theme: "light" | "dark",
  transpilerPort: ITypeScriptTranspilerPort,
  previewPort: IPlaygroundPreviewPort,
): string {
  const modules = new Map<string, string>();
  const stylesheets = new Map<string, string>();
  const documentTab =
    tabs.find((tab) => tab.descriptor.lang === "html" && isIndexHtml(tab)) ??
    tabs.find((tab) => tab.descriptor.lang === "html");

  for (const tab of tabs) {
    if (tab.descriptor.lang === "ts") {
      const transpiled = transpilerPort.transpile(
        tab.code,
        tab.descriptor.file,
      );
      modules.set(tab.descriptor.file.replace(/\.ts$/, ".js"), transpiled);
      continue;
    }

    if (tab.descriptor.lang === "css") {
      stylesheets.set(tab.descriptor.file, tab.code);
      continue;
    }

    if (tab.descriptor.lang === "html" && tab !== documentTab) {
      modules.set(
        tab.descriptor.file,
        `const template = ${JSON.stringify(tab.code)};\nexport default template;\n`,
      );
    }
  }

  const htmlParts = extractPlaygroundHtmlParts(
    documentTab?.code ?? "",
  );
  const entryJs = session.entryFile.replace(/\.ts$/, ".js");

  return previewPort.buildMultiSrcdoc(
    modules,
    stylesheets,
    entryJs,
    htmlParts.body,
    htmlParts.head,
    locale,
    theme,
    session.autoBootstrap,
  );
}

function isIndexHtml(tab: CodePlaygroundTabSnapshot): boolean {
  return tab.descriptor.file === "index.html";
}
