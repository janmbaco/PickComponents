import {
  buildExamplePath,
  type ExampleId,
  type PlaygroundLocale,
} from "../../routing/models/playground-routes.js";
import type { PlaygroundThemeVariant } from "../../navigation/models/playground-theme.js";
import {
  PLAYGROUND_CATEGORY_IDS,
  PLAYGROUND_CATEGORY_LABELS,
} from "../models/example-categories.js";
import {
  PLAYGROUND_EXAMPLES,
  type PlaygroundExampleDefinition,
  type PlaygroundExampleKind,
} from "../models/example-catalog.data.js";

export interface PlaygroundNavigationItem {
  id: ExampleId;
  kind: PlaygroundExampleKind;
  label: string;
  minTabs: number;
  src: string;
  to: string;
}

export interface PlaygroundNavigationGroup {
  id: (typeof PLAYGROUND_CATEGORY_IDS)[number];
  label: string;
  items: PlaygroundNavigationItem[];
}

export function getPlaygroundExamples(): PlaygroundExampleDefinition[] {
  return PLAYGROUND_EXAMPLES;
}

export function findPlaygroundExample(
  exampleId: ExampleId,
): PlaygroundExampleDefinition | undefined {
  return PLAYGROUND_EXAMPLES.find((example) => example.id === exampleId);
}

export function resolvePlaygroundExampleSrc(
  example: PlaygroundExampleDefinition,
  locale: PlaygroundLocale,
  themeVariant: PlaygroundThemeVariant,
): string {
  return example.variantSrcs[locale][themeVariant];
}

export function buildPlaygroundNavigation(
  locale: PlaygroundLocale,
  themeVariant: PlaygroundThemeVariant,
): PlaygroundNavigationGroup[] {
  return PLAYGROUND_CATEGORY_IDS.map((categoryId) => ({
    id: categoryId,
    label: PLAYGROUND_CATEGORY_LABELS[locale][categoryId],
    items: PLAYGROUND_EXAMPLES.filter(
      (example) => example.category === categoryId,
    ).map((example) => ({
      id: example.id,
      kind: example.kind,
      label: example.labels[locale],
      minTabs: example.minTabs,
      src: resolvePlaygroundExampleSrc(example, locale, themeVariant),
      to: buildExamplePath(locale, example.id),
    })),
  })).filter((group) => group.items.length > 0);
}
