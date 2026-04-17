import type {
  LoadedPlaygroundSource,
  TabDescriptor,
} from "./playground-tab.manifest.js";

export interface CodePlaygroundSessionState extends LoadedPlaygroundSource {
  src: string;
}

export interface CodePlaygroundTabSnapshot {
  descriptor: TabDescriptor;
  initialCode: string;
  code: string;
}

export function buildCodePlaygroundSessionState(
  src: string,
  source: LoadedPlaygroundSource,
): CodePlaygroundSessionState {
  return {
    src,
    fileName: source.fileName,
    tabs: source.tabs,
    entryFile: source.entryFile,
    autoBootstrap: source.autoBootstrap,
  };
}

export function fileNameFromPlaygroundSrc(src: string): string {
  return src.split("/").pop() ?? "example.ts";
}

export function archiveBaseNameFromFileName(fileName: string): string {
  return fileName.replace(".example.ts", "").replace(".ts", "");
}

export interface PlaygroundHtmlParts {
  head: string;
  body: string;
}

export function extractPlaygroundHtmlParts(
  rawHtml: string,
): PlaygroundHtmlParts {
  const headMatch = rawHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  return {
    head: headMatch ? headMatch[1].trim() : "",
    body: bodyMatch ? bodyMatch[1].trim() : rawHtml.trim(),
  };
}

export function extractPlaygroundHtmlBody(rawHtml: string): string {
  return extractPlaygroundHtmlParts(rawHtml).body;
}
