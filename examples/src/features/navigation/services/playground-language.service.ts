import {
  resolveTranslatedPlaygroundPath,
} from "../../routing/services/playground-route-state.service.js";

export interface PlaygroundLanguagePaths {
  esPath: string;
  enPath: string;
}

export function resolvePlaygroundLanguagePaths(
  currentPath: string,
): PlaygroundLanguagePaths {
  return {
    esPath: resolveTranslatedPlaygroundPath(currentPath, "es"),
    enPath: resolveTranslatedPlaygroundPath(currentPath, "en"),
  };
}
