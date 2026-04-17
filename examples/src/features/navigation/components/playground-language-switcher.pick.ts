import { PickComponent, PickRender, Reactive } from "pick-components";

@PickRender({
  selector: "language-switcher",
  styles: `
    :host {
      display: inline-flex;
      flex: 0 0 auto;
    }

    .lang-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.125rem;
      padding: 0.125rem;
      border: 1px solid var(--pg-shell-control-border, #2b3645);
      border-radius: 999px;
      background: var(--pg-shell-control-bg, #111827);
      box-shadow: var(--pg-shell-control-shadow, none);
      overflow: hidden;
    }

    .lang-option {
      display: inline-flex;
    }

    .lang-option a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2.6rem;
      height: 2rem;
      padding: 0 0.72rem;
      border-radius: 999px;
      color: var(--pg-shell-control-muted, #95a1b4);
      font-size: 0.8rem;
      font-weight: 800;
      line-height: 1;
      text-decoration: none;
      outline: none;
      box-shadow: none;
      transition: background 0.15s, color 0.15s;
    }

    .lang-option a:hover {
      background: var(--pg-shell-control-hover-bg, #182233);
      color: var(--pg-shell-control-color, #d8e0eb);
    }

    .lang-option a:focus-visible {
      box-shadow: 0 0 0 2px var(--pg-shell-control-focus, rgba(97, 175, 239, 0.28));
    }

    .lang-option.active a {
      background: var(--pg-shell-control-active-bg, rgba(97, 175, 239, 0.18));
      color: var(--pg-shell-control-active-color, #8ac6f5);
    }
  `,
  template: `
    <div class="lang-toggle" role="navigation" aria-label="Language switcher">
      <pick-link class="lang-option" to="{{espath}}" exact="true">ES</pick-link>
      <pick-link class="lang-option" to="{{enpath}}" exact="true">EN</pick-link>
    </div>
  `,
})
export class PlaygroundLanguageSwitcher extends PickComponent {
  @Reactive espath = "/es";
  @Reactive enpath = "/en";
}
