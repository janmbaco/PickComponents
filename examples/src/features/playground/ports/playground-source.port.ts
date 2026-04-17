import type {
  LoadedPlaygroundSource,
  TabDescriptor,
  TabManifest,
} from "../models/playground-tab.manifest.js";

export const PLAYGROUND_SOURCE_PORT_TOKEN = "PlaygroundSourcePort";

export interface IPlaygroundSourcePort {
  loadSource(src: string): Promise<LoadedPlaygroundSource>;
}

export class BrowserPlaygroundSourcePort implements IPlaygroundSourcePort {
  loadSource(src: string): Promise<LoadedPlaygroundSource> {
    return loadPlaygroundSource(src);
  }
}

async function loadPlaygroundSource(
  src: string,
): Promise<LoadedPlaygroundSource> {
  const prefix = src.replace(".example.ts", "");
  const tabsJsonUrl = `${prefix}.tabs.json`;

  const manifestResponse = await fetch(tabsJsonUrl);
  if (!manifestResponse.ok) {
    throw new Error(
      `Missing playground manifest ${tabsJsonUrl}: ${manifestResponse.status}`,
    );
  }

  const manifest = (await manifestResponse.json()) as TabManifest;
  return loadMultiTabPlaygroundSource(prefix, manifest);
}

async function loadMultiTabPlaygroundSource(
  prefix: string,
  manifest: TabManifest,
): Promise<LoadedPlaygroundSource> {
  const tabDescriptors: TabDescriptor[] = manifest.tabs.map((tab) => ({
    file: tab.file,
    label: tab.label,
    lang: tab.file.endsWith(".html")
      ? "html"
      : tab.file.endsWith(".css")
        ? "css"
        : "ts",
  }));

  const firstTsFile =
    tabDescriptors.find((tab) => tab.lang === "ts")?.file ??
    tabDescriptors[0]?.file ??
    "main.ts";

  const codes = await Promise.all(
    tabDescriptors.map((tab) => {
      const url = resolveManifestTabUrl(prefix, tab.file);
      return fetch(url).then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch ${url}: ${res.status}`);
        }
        return res.text();
      });
    }),
  );

  return {
    fileName: tabDescriptors[0]?.file ?? "example.ts",
    tabs: tabDescriptors.map((descriptor, index) => ({
      descriptor,
      initialCode: codes[index],
      containerId: `editor-${index}`,
    })),
    entryFile: manifest.entry ?? firstTsFile,
    autoBootstrap: manifest.autoBootstrap !== false,
  };
}

function resolveManifestTabUrl(prefix: string, file: string): string {
  const baseName = prefix.split("/").pop() ?? "";

  // Allow manifests to point directly at the canonical component file
  // (for example `hello.example.ts`) without requiring a duplicated
  // `hello.hello.example.ts` file on disk.
  if (file === `${baseName}.example.ts`) {
    const slashIndex = prefix.lastIndexOf("/");
    const directory = slashIndex >= 0 ? prefix.slice(0, slashIndex + 1) : "";
    return `${directory}${file}`;
  }

  return `${prefix}.${file}`;
}
