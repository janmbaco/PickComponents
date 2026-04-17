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
  styles: `
    :host {
      display: block;
      height: 100vh;
      min-height: 0;
    }

    .pg-shell {
      display: grid;
      grid-template-rows: auto 1fr;
      grid-template-columns: 220px 1fr;
      height: 100%;
      min-height: 0;
      background: var(--pg-shell-panel-bg, #111822);
      color: var(--pg-shell-topbar-color, #eef2f7);
    }

    .pg-topbar {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0 1rem;
      min-height: 52px;
      background: var(--pg-shell-topbar-bg, #151b23);
      border-bottom: 1px solid var(--pg-shell-panel-border, #2a3443);
      color: var(--pg-shell-topbar-color, #eef2f7);
    }

    .brand {
      font-weight: 700;
      font-size: 1rem;
      white-space: nowrap;
      letter-spacing: -0.02em;
    }

    .brand span {
      color: var(--pg-shell-brand-accent, #98c379);
    }

    .spacer {
      flex: 1;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.35rem 0;
    }

    .pg-sidebar {
      background: var(--pg-shell-panel-bg, #111822);
      border-right: 1px solid var(--pg-shell-panel-border, #2a3443);
      overflow-y: auto;
      padding: 0.75rem 0;
      min-height: 0;
    }

    .pg-main {
      display: flex;
      overflow: hidden;
      min-width: 0;
      min-height: 0;
    }

    playground-route-view {
      display: flex;
      flex: 1;
      min-width: 0;
      min-height: 0;
    }

    @media (max-width: 768px) {
      .pg-shell {
        grid-template-columns: 1fr;
      }

      .pg-sidebar {
        display: none;
      }
    }
  `,
  template: `
    <div class="pg-shell">
      <div class="pg-topbar">
        <div class="brand"><span>Pick</span>Components</div>
        <div class="spacer"></div>
        <div class="controls">
          <language-switcher
            espath="{{esPath}}"
            enpath="{{enPath}}"
          ></language-switcher>
          <theme-switcher
            mode="{{themeMode}}"
            icon="{{themeIcon}}"
            label="{{themeLabel}}"
            buttontitle="{{themeTitle}}"
          ></theme-switcher>
        </div>
      </div>

      <aside class="pg-sidebar">
        <tab-nav groups="{{navigationGroups}}"></tab-nav>
      </aside>

      <div class="pg-main">
        <playground-route-view
          locale="{{locale}}"
          src="{{activeExampleSrc}}"
        ></playground-route-view>
      </div>
    </div>
  `,
})
export class PlaygroundShell extends PickComponent {
  @Reactive locale = "en";
  @Reactive currentPath = "/";
  @Reactive activeExampleSrc =
    "/playground-examples/01-hello/en-light/hello.example.ts";
  @Reactive esPath = "/es";
  @Reactive enPath = "/en";
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
