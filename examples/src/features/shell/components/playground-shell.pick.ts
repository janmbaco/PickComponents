import {
  PickComponent,
  PickRender,
  Reactive,
  Services,
  Listen,
} from "pick-components";
import type { PlaygroundNavigationGroup } from "../../examples-catalog/services/example-catalog.service.js";
import { PlaygroundShellInitializer } from "../initializers/playground-shell.initializer.js";
import { PlaygroundShellLifecycle } from "../lifecycles/playground-shell.lifecycle.js";
import { PLAYGROUND_ROUTING_PORT_TOKEN } from "../../routing/services/playground-routing.port.js";
import type { PlaygroundShellSessionState } from "../models/playground-shell.state.js";
import { PLAYGROUND_THEME_PORT_TOKEN } from "../../navigation/services/playground-theme.port.js";
import type { ThemeMode } from "../../navigation/models/playground-theme.js";
import {
  PLAYGROUND_SHELL_STYLES,
  PLAYGROUND_SHELL_TEMPLATE,
} from "./playground-shell.view.js";
import { withPlaygroundBasePath } from "../../routing/models/playground-public-path.js";

@PickRender({
  selector: "playground-shell",
  initializer: () =>
    new PlaygroundShellInitializer(
      Services.get(PLAYGROUND_ROUTING_PORT_TOKEN),
      Services.get(PLAYGROUND_THEME_PORT_TOKEN),
    ),
  lifecycle: () =>
    new PlaygroundShellLifecycle(
      Services.get(PLAYGROUND_ROUTING_PORT_TOKEN),
      Services.get(PLAYGROUND_THEME_PORT_TOKEN),
    ),
  styles: PLAYGROUND_SHELL_STYLES,
  template: PLAYGROUND_SHELL_TEMPLATE,
})
export class PlaygroundShell extends PickComponent {
  @Reactive locale = "en";
  @Reactive currentPath = "/";
  @Reactive activeExampleSrc = withPlaygroundBasePath(
    "/playground-examples/01-hello/en-light/hello.example.ts",
  );
  @Reactive esPath = withPlaygroundBasePath("/es");
  @Reactive enPath = withPlaygroundBasePath("/en");
  @Reactive navigationGroups: PlaygroundNavigationGroup[] = [];
  @Reactive themeMode: ThemeMode = "auto";
  @Reactive themeIcon = "⊙";
  @Reactive themeLabel = "Auto";
  @Reactive themeTitle = "Theme: Auto";
  @Reactive themeCycleRequestVersion = 0;

  hydrate(session: PlaygroundShellSessionState): void {
    this.locale = session.locale;
    this.currentPath = session.currentPath;
    this.activeExampleSrc = session.activeExampleSrc;
    this.esPath = session.languagePaths.esPath;
    this.enPath = session.languagePaths.enPath;
    this.navigationGroups = session.navigationGroups;
    this.themeMode = session.theme.mode;
    this.themeIcon = session.theme.icon;
    this.themeLabel = session.theme.label;
    this.themeTitle = session.theme.title;
  }

  requestThemeCycle(): void {
    this.themeCycleRequestVersion += 1;
  }

  onRenderComplete(): void {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.removeAttribute("data-pick-enhancing");
    document.documentElement.setAttribute("data-pick-enhanced", "true");
  }

  @Listen("theme-switcher", "click")
  onThemeSwitcherClick(): void {
    this.requestThemeCycle();
  }

  @Listen("theme-switcher", "keydown")
  onThemeSwitcherKeydown(event: KeyboardEvent): void {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    this.requestThemeCycle();
  }
}
