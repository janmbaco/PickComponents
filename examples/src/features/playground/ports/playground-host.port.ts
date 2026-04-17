export type PlaygroundEditorTheme = "light" | "dark";

export const PLAYGROUND_HOST_PORT_TOKEN = "PlaygroundHostPort";

export interface IPlaygroundHostPort {
  readEditorTheme(): PlaygroundEditorTheme;
  observeThemeChanges(listener: () => void): () => void;
}

const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

export class BrowserPlaygroundHostPort implements IPlaygroundHostPort {
  readEditorTheme(): PlaygroundEditorTheme {
    if (!isBrowser) {
      return "dark";
    }

    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";
  }

  observeThemeChanges(listener: () => void): () => void {
    if (!isBrowser) {
      return () => {};
    }

    const observer = new MutationObserver(() => listener());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }
}
