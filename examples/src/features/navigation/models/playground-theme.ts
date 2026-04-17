import type { PlaygroundLocale } from "../../routing/models/playground-routes.js";

export type ThemeMode = "auto" | "light" | "dark";
export type PlaygroundThemeVariant = Exclude<ThemeMode, "auto">;

export interface PlaygroundThemeViewState {
  mode: ThemeMode;
  variant: PlaygroundThemeVariant;
  icon: string;
  label: string;
  title: string;
}

const THEME_ICON: Record<ThemeMode, string> = {
  auto: "⊙",
  light: "☀",
  dark: "☾",
};

const THEME_NEXT: Record<ThemeMode, ThemeMode> = {
  auto: "light",
  light: "dark",
  dark: "auto",
};

const THEME_LABELS: Record<PlaygroundLocale, Record<ThemeMode, string>> = {
  es: {
    auto: "Auto",
    light: "Claro",
    dark: "Oscuro",
  },
  en: {
    auto: "Auto",
    light: "Light",
    dark: "Dark",
  },
};

const THEME_TITLE_PREFIX: Record<PlaygroundLocale, string> = {
  es: "Tema",
  en: "Theme",
};

export function nextThemeMode(mode: ThemeMode): ThemeMode {
  return THEME_NEXT[mode];
}

export function resolvePlaygroundThemeVariant(
  mode: ThemeMode,
  systemPrefersDark: boolean,
): PlaygroundThemeVariant {
  if (mode === "dark") {
    return "dark";
  }

  if (mode === "light") {
    return "light";
  }

  return systemPrefersDark ? "dark" : "light";
}

export function buildPlaygroundThemeViewState(
  locale: PlaygroundLocale,
  mode: ThemeMode,
  variant: PlaygroundThemeVariant,
): PlaygroundThemeViewState {
  const label = THEME_LABELS[locale][mode];
  return {
    mode,
    variant,
    icon: THEME_ICON[mode],
    label,
    title: `${THEME_TITLE_PREFIX[locale]}: ${label}`,
  };
}
