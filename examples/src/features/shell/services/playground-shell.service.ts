import {
  buildExamplePath,
  DEFAULT_EXAMPLE_ID,
  hasPlaygroundLocalePrefix,
} from "../../routing/models/playground-routes.js";
import { resolvePlaygroundRouteState } from "../../routing/services/playground-route-state.service.js";
import { type PlaygroundExampleDefinition } from "../../examples-catalog/models/example-catalog.data.js";
import {
  buildPlaygroundNavigation,
  findPlaygroundExample,
  resolvePlaygroundExampleSrc,
} from "../../examples-catalog/services/example-catalog.service.js";
import { resolvePlaygroundLanguagePaths } from "../../navigation/services/playground-language.service.js";
import {
  buildPlaygroundThemeViewState,
  type PlaygroundThemeVariant,
  type ThemeMode,
} from "../../navigation/models/playground-theme.js";
import type { PlaygroundShellSessionState } from "../models/playground-shell.state.js";

const FALLBACK_PLAYGROUND_EXAMPLE: PlaygroundExampleDefinition = {
  id: DEFAULT_EXAMPLE_ID,
  labels: {
    es: "Hola Mundo",
    en: "Hello World",
  },
  category: "basics",
  kind: "primitive",
  minTabs: 2,
  variantSrcs: {
    en: {
      light: "/playground-examples/01-hello/en-light/hello.example.ts",
      dark: "/playground-examples/01-hello/en-dark/hello.example.ts",
    },
    es: {
      light: "/playground-examples/01-hello/es-light/hello.example.ts",
      dark: "/playground-examples/01-hello/es-dark/hello.example.ts",
    },
  },
};

export function resolvePlaygroundShellSession(
  locale: string,
  currentPath: string,
  themeMode: ThemeMode,
  themeVariant: PlaygroundThemeVariant,
): PlaygroundShellSessionState {
  const route = resolvePlaygroundRouteState(currentPath, locale);
  const activeExampleId = route.exampleId;
  const activeExample =
    findPlaygroundExample(activeExampleId) ?? FALLBACK_PLAYGROUND_EXAMPLE;
  const canonicalPath = buildExamplePath(route.locale, activeExampleId);
  const needsCanonicalRedirect =
    hasPlaygroundLocalePrefix(currentPath) && currentPath !== canonicalPath;

  return {
    locale: route.locale,
    currentPath: canonicalPath,
    canonicalPath,
    needsCanonicalRedirect,
    activeExampleId,
    activeCategoryId: activeExample.category,
    activeExample,
    activeExampleSrc: resolvePlaygroundExampleSrc(
      activeExample,
      route.locale,
      themeVariant,
    ),
    activeThemeVariant: themeVariant,
    navigationGroups: buildPlaygroundNavigation(route.locale, themeVariant),
    languagePaths: resolvePlaygroundLanguagePaths(canonicalPath),
    theme: buildPlaygroundThemeViewState(route.locale, themeMode, themeVariant),
  };
}
