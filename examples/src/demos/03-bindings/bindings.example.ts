// ── 1. Imports ───────────────────────────────────────
// Listen: binds a method to a DOM event on a CSS-selected element inside the component.
import { PickComponent, PickRender, Reactive, Listen } from "pick-components";

// ── 2. Bilingual Texts ──────────────────────────────
// Resolved reactively from the component locale.
const TEXTS: Record<string, Record<string, string>> = {
  es: {
    HEADING: "Bindings Reactivos",
    GREETING: "Hola",
    NAME: "Nombre",
    PRICE: "Precio",
    QTY: "Cant",
    TOTAL: "Total",
    EXPENSIVE: "Caro",
    AFFORDABLE: "Asequible",
  },
  en: {
    HEADING: "Reactive Bindings",
    GREETING: "Hello",
    NAME: "Name",
    PRICE: "Price",
    QTY: "Qty",
    TOTAL: "Total",
    EXPENSIVE: "Expensive",
    AFFORDABLE: "Affordable",
  },
};

// ── 3. Component Declaration ─────────────────────────
// {{t.KEY}} = reactive locale-aware text.
// {{expression}} = reactive binding, re-evaluated when state changes.
// Both are Pick Components-native — never use ${} in templates.
@PickRender({
  selector: "bindings-example",
  template: `
    <h3>{{t.HEADING}}</h3>

    <label>{{t.NAME}} <input id="nameInput" type="text" value="Alice" /></label>
    <label>{{t.PRICE}} <input id="priceInput" type="number" value="29" step="1" /></label>
    <label>{{t.QTY}} <input id="qtyInput" type="number" value="3" step="1" /></label>

    <p>{{t.GREETING}}, <strong>{{userName}}</strong>!</p>
    <p>{{t.TOTAL}}: <strong>{{total}}</strong></p>
    <p>{{priceLabel}}</p>
  `,
})
class BindingsExample extends PickComponent {
  // ── 4. Reactive State ──────────────────────────────
  // Multiple reactive fields, each independently observable.
  // Changing any one of them re-renders only the affected template expressions.
  @Reactive locale = "en";
  @Reactive userName = "Alice";
  @Reactive price = 29;
  @Reactive quantity = 3;

  get t(): Record<string, string> {
    return { ...TEXTS["en"], ...(TEXTS[this.locale] ?? {}) };
  }

  // ── 5. Computed Getters ────────────────────────────
  // A `get` method derives a value from reactive state.
  // It is re-evaluated on every render — no caching.
  // The template uses {{total}} which calls this getter.
  get total(): string {
    return "$" + (this.price * this.quantity).toFixed(2);
  }

  get priceLabel(): string {
    return this.price > 50
      ? `💰 ${this.t.EXPENSIVE}`
      : `✓ ${this.t.AFFORDABLE}`;
  }

  // ── 6. Event Handlers ─────────────────────────────
  // Each @Listen binds to a specific input's 'input' event.
  // Updating the reactive triggers a re-render.
  @Listen("#nameInput", "input")
  onName(e: Event): void {
    this.userName = (e.target as HTMLInputElement).value;
  }

  @Listen("#priceInput", "input")
  onPrice(e: Event): void {
    this.price = parseFloat((e.target as HTMLInputElement).value) || 0;
  }

  @Listen("#qtyInput", "input")
  onQty(e: Event): void {
    this.quantity = parseInt((e.target as HTMLInputElement).value, 10) || 0;
  }
}
