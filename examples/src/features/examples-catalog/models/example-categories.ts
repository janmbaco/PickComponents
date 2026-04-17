import type { PlaygroundLocale } from "../../routing/models/playground-routes.js";

export const PLAYGROUND_CATEGORY_IDS = [
  "basics",
  "primitives",
  "architecture",
] as const;

export type PlaygroundCategoryId = (typeof PLAYGROUND_CATEGORY_IDS)[number];

export const PLAYGROUND_CATEGORY_LABELS: Record<
  PlaygroundLocale,
  Record<PlaygroundCategoryId, string>
> = {
  es: {
    basics: "BÁSICOS",
    primitives: "COMPONENTES DEL FRAMEWORK",
    architecture: "ARQUITECTURA",
  },
  en: {
    basics: "BASICS",
    primitives: "FRAMEWORK COMPONENTS",
    architecture: "ARCHITECTURE",
  },
};
