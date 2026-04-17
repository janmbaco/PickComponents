import {
  resolvePlaygroundThemeVariant,
  type PlaygroundThemeVariant,
  type ThemeMode,
} from "../models/playground-theme.js";

export const PLAYGROUND_THEME_PORT_TOKEN = "PlaygroundThemePort";

export interface IPlaygroundThemePort {
  readPreferredMode(): ThemeMode;
  resolveVariant(mode: ThemeMode): PlaygroundThemeVariant;
  applyMode(mode: ThemeMode): void;
  persistMode(mode: ThemeMode): void;
}

const STORAGE_KEY = "pc-theme";
const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

export class BrowserPlaygroundThemePort implements IPlaygroundThemePort {
  readPreferredMode(): ThemeMode {
    if (!isBrowser) {
      return "auto";
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "auto";
  }

  resolveVariant(mode: ThemeMode): PlaygroundThemeVariant {
    return resolvePlaygroundThemeVariant(mode, readSystemPrefersDark());
  }

  applyMode(mode: ThemeMode): void {
    if (!isBrowser) {
      return;
    }

    if (mode === "auto") {
      document.documentElement.removeAttribute("data-theme");
      return;
    }

    document.documentElement.setAttribute("data-theme", mode);
  }

  persistMode(mode: ThemeMode): void {
    if (!isBrowser) {
      return;
    }

    if (mode === "auto") {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, mode);
  }
}

function readSystemPrefersDark(): boolean {
  if (!isBrowser || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
