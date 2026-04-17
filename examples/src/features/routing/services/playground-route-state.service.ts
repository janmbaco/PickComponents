import type { PlaygroundRouteState } from "../models/playground-route.state.js";
import {
  DEFAULT_EXAMPLE_ID,
  exampleIdFromPlaygroundPath,
  hasPlaygroundLocalePrefix,
  localeFromPlaygroundPath,
  resolvePlaygroundLocale,
  translatePlaygroundPath,
  type PlaygroundLocale,
} from "../models/playground-routes.js";

export function resolvePlaygroundRouteState(
  currentPath: string,
  localeHint?: string,
): PlaygroundRouteState {
  const locale = hasPlaygroundLocalePrefix(currentPath)
    ? localeFromPlaygroundPath(currentPath)
    : resolvePlaygroundLocale(localeHint);

  return {
    locale,
    currentPath,
    exampleId: exampleIdFromPlaygroundPath(currentPath) ?? DEFAULT_EXAMPLE_ID,
  };
}

export function resolveTranslatedPlaygroundPath(
  currentPath: string,
  targetLocale: PlaygroundLocale,
): string {
  return translatePlaygroundPath(currentPath, targetLocale);
}
