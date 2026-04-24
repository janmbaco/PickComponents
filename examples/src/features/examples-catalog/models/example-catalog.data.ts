import type {
  ExampleId,
  PlaygroundLocale,
} from "../../routing/models/playground-routes.js";
import { withPlaygroundBasePath } from "../../routing/models/playground-public-path.js";
import type { PlaygroundThemeVariant } from "../../navigation/models/playground-theme.js";
import type { PlaygroundCategoryId } from "./example-categories.js";

export type PlaygroundExampleKind =
  | "primitive"
  | "prepared-session"
  | "feature";

export interface PlaygroundExampleDefinition {
  id: ExampleId;
  labels: Record<PlaygroundLocale, string>;
  category: PlaygroundCategoryId;
  kind: PlaygroundExampleKind;
  minTabs: number;
  variantSrcs: Record<PlaygroundLocale, Record<PlaygroundThemeVariant, string>>;
}

function buildVariantSrcs(
  exampleId: ExampleId,
  entryBaseName: string,
): Record<PlaygroundLocale, Record<PlaygroundThemeVariant, string>> {
  return {
    en: {
      light: withPlaygroundBasePath(
        `/playground-examples/${exampleId}/en-light/${entryBaseName}.example.ts`,
      ),
      dark: withPlaygroundBasePath(
        `/playground-examples/${exampleId}/en-dark/${entryBaseName}.example.ts`,
      ),
    },
    es: {
      light: withPlaygroundBasePath(
        `/playground-examples/${exampleId}/es-light/${entryBaseName}.example.ts`,
      ),
      dark: withPlaygroundBasePath(
        `/playground-examples/${exampleId}/es-dark/${entryBaseName}.example.ts`,
      ),
    },
  };
}

export const PLAYGROUND_EXAMPLES: PlaygroundExampleDefinition[] = [
  {
    id: "01-hello",
    labels: { es: "Hola Mundo", en: "Hello World" },
    category: "basics",
    kind: "primitive",
    minTabs: 2,
    variantSrcs: buildVariantSrcs("01-hello", "hello"),
  },
  {
    id: "02-counter",
    labels: { es: "Estado Reactivo", en: "Reactive State" },
    category: "basics",
    kind: "primitive",
    minTabs: 2,
    variantSrcs: buildVariantSrcs("02-counter", "counter"),
  },
  {
    id: "03-bindings",
    labels: { es: "Bindings Simples", en: "Template Bindings" },
    category: "basics",
    kind: "primitive",
    minTabs: 2,
    variantSrcs: buildVariantSrcs("03-bindings", "bindings"),
  },
  {
    id: "04-template-expressions",
    labels: { es: "Expresiones en Template", en: "Template Expressions" },
    category: "basics",
    kind: "primitive",
    minTabs: 2,
    variantSrcs: buildVariantSrcs("04-template-expressions", "expressions"),
  },
  {
    id: "05-computed-bindings",
    labels: { es: "Bindings Computados", en: "Computed Bindings" },
    category: "basics",
    kind: "primitive",
    minTabs: 2,
    variantSrcs: buildVariantSrcs("05-computed-bindings", "computed"),
  },
  {
    id: "06-pick-component",
    labels: { es: "Componente @Pick", en: "@Pick Component" },
    category: "basics",
    kind: "primitive",
    minTabs: 2,
    variantSrcs: buildVariantSrcs("06-pick-component", "pick-component"),
  },
  {
    id: "07-pick-actions",
    labels: { es: "Pick Actions", en: "Pick Actions" },
    category: "primitives",
    kind: "primitive",
    minTabs: 2,
    variantSrcs: buildVariantSrcs("07-pick-actions", "pick-actions"),
  },
  {
    id: "07b-pick-actions-pick",
    labels: { es: "Pick Actions con @Pick", en: "Pick Actions with @Pick" },
    category: "primitives",
    kind: "primitive",
    minTabs: 2,
    variantSrcs: buildVariantSrcs(
      "07b-pick-actions-pick",
      "pick-actions-pick",
    ),
  },
  {
    id: "08-pick-select",
    labels: { es: "Pick Select", en: "Pick Select" },
    category: "primitives",
    kind: "primitive",
    minTabs: 2,
    variantSrcs: buildVariantSrcs("08-pick-select", "pick-select"),
  },
  {
    id: "09-pick-for",
    labels: { es: "Pick For", en: "Pick For" },
    category: "primitives",
    kind: "primitive",
    minTabs: 2,
    variantSrcs: buildVariantSrcs("09-pick-for", "pick-for"),
  },
  {
    id: "10-forms",
    labels: { es: "Formularios y Reglas", en: "Forms & Rules" },
    category: "primitives",
    kind: "prepared-session",
    minTabs: 6,
    variantSrcs: buildVariantSrcs("10-forms", "forms"),
  },
  {
    id: "11-di",
    labels: { es: "Inyección DI", en: "DI Injection" },
    category: "architecture",
    kind: "feature",
    minTabs: 8,
    variantSrcs: buildVariantSrcs("11-di", "di"),
  },
  {
    id: "12-api",
    labels: { es: "API Real", en: "Real API" },
    category: "architecture",
    kind: "feature",
    minTabs: 8,
    variantSrcs: buildVariantSrcs("12-api", "api"),
  },
  {
    id: "13-dashboard",
    labels: { es: "Dashboard", en: "Dashboard" },
    category: "architecture",
    kind: "feature",
    minTabs: 8,
    variantSrcs: buildVariantSrcs("13-dashboard", "dashboard"),
  },
  {
    id: "14-pick",
    labels: { es: "@Pick Avanzado", en: "@Pick Advanced" },
    category: "architecture",
    kind: "feature",
    minTabs: 6,
    variantSrcs: buildVariantSrcs("14-pick", "pick"),
  },
  {
    id: "15-slots",
    labels: { es: "Slots Nativos", en: "Native Slots" },
    category: "basics",
    kind: "primitive",
    minTabs: 3,
    variantSrcs: buildVariantSrcs("15-slots", "slots"),
  },
];
