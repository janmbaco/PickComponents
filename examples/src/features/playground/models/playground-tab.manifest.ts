export interface TabDescriptor {
  file: string;
  label: string;
  lang: "ts" | "html" | "css";
}

export interface TabManifest {
  tabs: Array<{ file: string; label: string }>;
  entry?: string;
  autoBootstrap?: boolean;
}

export interface LoadedPlaygroundTab {
  descriptor: TabDescriptor;
  initialCode: string;
  containerId: string;
}

export interface LoadedPlaygroundSource {
  fileName: string;
  tabs: LoadedPlaygroundTab[];
  entryFile: string;
  autoBootstrap: boolean;
}
