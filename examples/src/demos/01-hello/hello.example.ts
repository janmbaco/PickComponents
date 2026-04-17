// ── 1. Imports ───────────────────────────────────────
// PickRender: class decorator that registers a custom element with its template.
// PickComponent: base class providing reactivity and rendering pipeline.
// Reactive: property decorator that makes an observable — any change triggers a re-render.
// Listen: method decorator that binds a method to a DOM event on a CSS-selected element.
import { PickComponent, PickRender, Reactive, Listen } from "pick-components";

// ── 2. Bilingual Texts ──────────────────────────────
// User-visible strings organized by locale.
// The component exposes `locale` as reactive state, so changing the attribute
// updates labels in place without remounting.
const TEXTS: Record<string, Record<string, string>> = {
  es: {
    HEADING: "¡Hola Mundo!",
    PLACEHOLDER: "Escribe tu nombre y pulsa Enter…",
    GREETING: "¡Hola",
    WORLD: "Mundo",
  },
  en: {
    HEADING: "Hello World",
    PLACEHOLDER: "Type your name and press Enter…",
    GREETING: "Hello",
    WORLD: "World",
  },
};

// ── 3. Component Declaration ─────────────────────────
// @PickRender registers <hello-example> as a custom element.
// The `selector` maps to the HTML tag name; the class MUST extend PickComponent.
// `locale` is reactive, and `t` derives the current dictionary from it.
// {{expression}} bindings auto-update when state changes.
@PickRender({
  selector: "hello-example",
  template: `
    <h3>{{t.HEADING}}</h3>
    <input id="nameInput" type="text" placeholder="{{t.PLACEHOLDER}}" />
    <p>{{t.GREETING}}, {{name ? name : t.WORLD}}!</p>
  `,
})
class HelloExample extends PickComponent {
  // ── 4. Reactive State ──────────────────────────────
  // @Reactive creates an observable property.
  // When `name` changes, the template re-renders automatically.
  @Reactive locale = "en";
  @Reactive name = "";

  get t(): Record<string, string> {
    return { ...TEXTS["en"], ...(TEXTS[this.locale] ?? {}) };
  }

  // ── 5. Event Handler ───────────────────────────────
  // @Listen binds this method to the 'keydown' event on the element matching '#nameInput'.
  // The framework finds the element inside the component's rendered DOM and attaches the listener.
  @Listen("#nameInput", "keydown")
  onKeydown(event: Event): void {
    if ((event as KeyboardEvent).key === "Enter") {
      this.name = (event.target as HTMLInputElement).value.trim();
    }
  }
}
