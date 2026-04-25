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

    const explicitTheme = document.documentElement.getAttribute("data-theme");
    if (explicitTheme === "light" || explicitTheme === "dark") {
      return explicitTheme;
    }

    if (typeof window.matchMedia === "function") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    return "dark";
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

    const mediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;
    const handleSystemThemeChange = (): void => {
      if (!document.documentElement.hasAttribute("data-theme")) {
        listener();
      }
    };
    mediaQuery?.addEventListener("change", handleSystemThemeChange);

    return () => {
      observer.disconnect();
      mediaQuery?.removeEventListener("change", handleSystemThemeChange);
    };
  }
}
