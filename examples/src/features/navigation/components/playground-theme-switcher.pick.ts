import {
  PickComponent,
  PickRender,
  Reactive,
} from "pick-components";
import type { ThemeMode } from "../models/playground-theme.js";

@PickRender({
  selector: "theme-switcher",
  styles: `
    :host {
      display: inline-flex;
      flex: 0 0 auto;
    }

    .theme-switcher-root {
      display: inline-flex;
    }

    .theme-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: center;
      min-width: 7rem;
      height: 2rem;
      padding: 0 0.8rem;
      border: 1px solid var(--pg-shell-control-border, #2b3645);
      border-radius: 999px;
      background: var(--pg-shell-control-bg, #111827);
      color: var(--pg-shell-control-color, #d8e0eb);
      cursor: pointer;
      box-shadow: var(--pg-shell-control-shadow, none);
      font-family: inherit;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      line-height: 1;
      outline: none;
      user-select: none;
      white-space: nowrap;
      transition:
        background 0.15s,
        border-color 0.15s,
        color 0.15s,
        box-shadow 0.15s,
        transform 0.12s;
    }

    .theme-toggle:hover {
      background: var(--pg-shell-control-hover-bg, #182233);
      border-color: var(--pg-shell-control-border, #2b3645);
      color: var(--pg-shell-control-color, #d8e0eb);
    }

    .theme-toggle:focus-visible {
      box-shadow:
        var(--pg-shell-control-shadow, none),
        0 0 0 3px var(--pg-shell-control-focus, rgba(97, 175, 239, 0.28));
    }

    .theme-icon {
      font-size: 1rem;
      line-height: 1;
      color: var(--pg-shell-control-active-color, #8ac6f5);
    }

    .theme-label {
      font-size: 0.8rem;
      font-weight: 700;
      line-height: 1;
    }
  `,
  template: `
    <div class="theme-switcher-root">
      <div
        class="theme-toggle"
        data-mode="{{mode}}"
        title="{{buttontitle}}"
        aria-label="{{buttontitle}}"
        tabindex="0"
      >
        <span class="theme-icon">{{icon}}</span>
        <span class="theme-label">{{label}}</span>
      </div>
    </div>
  `,
})
export class PlaygroundThemeSwitcher extends PickComponent {
  @Reactive mode: ThemeMode = "auto";
  @Reactive icon = "⊙";
  @Reactive label = "Auto";
  @Reactive buttontitle = "Theme: Auto";
}
