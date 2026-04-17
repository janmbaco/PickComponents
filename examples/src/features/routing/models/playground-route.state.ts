import type { ExampleId, PlaygroundLocale } from "./playground-routes.js";

export interface PlaygroundRouteState {
  locale: PlaygroundLocale;
  currentPath: string;
  exampleId: ExampleId;
}
