import type {
  ExampleId,
  PlaygroundLocale,
} from "../../routing/models/playground-routes.js";
import type { PlaygroundExampleDefinition } from "../../examples-catalog/models/example-catalog.js";
import type { PlaygroundCategoryId } from "../../examples-catalog/models/example-categories.js";
import type { PlaygroundNavigationGroup } from "../../examples-catalog/services/example-catalog.service.js";
import type { PlaygroundLanguagePaths } from "../../navigation/services/playground-language.service.js";
import type {
  PlaygroundThemeVariant,
  PlaygroundThemeViewState,
} from "../../navigation/models/playground-theme.js";

export interface PlaygroundShellSessionState {
  locale: PlaygroundLocale;
  currentPath: string;
  canonicalPath: string;
  needsCanonicalRedirect: boolean;
  activeExampleId: ExampleId;
  activeCategoryId: PlaygroundCategoryId;
  activeExample: PlaygroundExampleDefinition;
  activeExampleSrc: string;
  activeThemeVariant: PlaygroundThemeVariant;
  navigationGroups: PlaygroundNavigationGroup[];
  languagePaths: PlaygroundLanguagePaths;
  theme: PlaygroundThemeViewState;
}
