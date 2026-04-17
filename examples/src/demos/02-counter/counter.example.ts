// ── 1. Imports ───────────────────────────────────────
// PickRender: registers a custom element with declarative template.
// PickComponent: base class with reactivity and rendering pipeline.
// Reactive: makes a property observable — changes trigger re-render.
import { PickComponent, PickRender, Reactive } from "pick-components";

// ── 2. Bilingual Texts ──────────────────────────────
// User-visible strings organized by locale.
// Resolved reactively from the component locale.
const TEXTS: Record<string, Record<string, string>> = {
  es: { HEADING: "Contador", RESET: "Reiniciar" },
  en: { HEADING: "Counter", RESET: "Reset" },
};

// ── 3. Component Declaration ─────────────────────────
// `locale` is reactive and `t` derives the active dictionary.
// {{count}} is a reactive binding — it auto-updates when state changes.
// <pick-action action="X"> wraps a clickable element.
// When clicked, it calls the method named X on the component.
@PickRender({
  selector: "counter-example",
  template: `
    <h3>{{t.HEADING}}: {{count}}</h3>
    <pick-action action="decrement"><button>−</button></pick-action>
    <pick-action action="reset"><button>{{t.RESET}}</button></pick-action>
    <pick-action action="increment"><button>+</button></pick-action>
  `,
})
class CounterExample extends PickComponent {
  // ── 4. Reactive State ──────────────────────────────
  // Numeric — the template's {{count}} updates on every mutation.
  @Reactive locale = "en";
  @Reactive count = 0;

  get t(): Record<string, string> {
    return { ...TEXTS["en"], ...(TEXTS[this.locale] ?? {}) };
  }

  // ── 5. Action Handlers ─────────────────────────────
  // Each method name matches the `action` attribute on a <pick-action>.
  // The framework automatically binds them — no manual addEventListener needed.
  increment(): void {
    this.count++;
  }
  decrement(): void {
    this.count--;
  }
  reset(): void {
    this.count = 0;
  }
}
