/**
 * Composition root — must be imported before any component module.
 *
 * 1. Bootstraps the Pick Components framework (services + built-in elements).
 * 2. Registers Pico CSS as a shared stylesheet for all Shadow Roots.
 * 3. Propagates theme changes to shadow host elements.
 *
 * All interactive demos live in `<code-playground>` iframe sandboxes with
 * their own bootstrap and (optionally) their own InjectKit container.
 * The main app only needs the framework for shared shell components
 * (tab-nav, theme-switcher, language-switcher, code-playground).
 *
 * Top-level await guarantees completion before any dependent module evaluates.
 */
import { bootstrapFramework, Services } from "pick-components/bootstrap";
import type { ISharedStylesRegistry } from "pick-components";

// ── 1. Bootstrap Pick Components framework ───────────────────────
await bootstrapFramework(Services);

// ── 2. Register Pico CSS as a shared stylesheet ──────────────────
const sharedStyles = Services.get<ISharedStylesRegistry>(
  "ISharedStylesRegistry",
);
const picoResponse = await fetch("/pico.min.css");
const picoCSS = await picoResponse.text();
const picoSheet = new CSSStyleSheet();
picoSheet.replaceSync(picoCSS);
sharedStyles.add(picoSheet);

// ── 5. Propagate data-theme to shadow host elements on theme change ──
function propagateThemeToShadowHosts(): void {
  const theme = document.documentElement.getAttribute("data-theme");
  document.querySelectorAll("*").forEach((el) => {
    if (el.shadowRoot) {
      if (theme) {
        (el as HTMLElement).setAttribute("data-theme", theme);
      } else {
        (el as HTMLElement).removeAttribute("data-theme");
      }
    }
  });
}

new MutationObserver(propagateThemeToShadowHosts).observe(
  document.documentElement,
  { attributes: true, attributeFilter: ["data-theme"] },
);
