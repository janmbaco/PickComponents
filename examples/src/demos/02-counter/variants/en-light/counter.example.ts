import counterStyles from "./counter.styles.css";
import { PickComponent, PickRender, Reactive, Listen } from "pick-components";

// @PickRender declares the element selector plus its template and scoped styles.
@PickRender({
  selector: "counter-example",
  styles: counterStyles,
  template: `
    <div class="counter">
      <p>Counter: {{count}}</p>
      <div class="actions">
        <button id="decrementButton" type="button">−</button>
        <button id="resetButton" type="button">Reset</button>
        <button id="incrementButton" type="button">+</button>
      </div>
    </div>
  `,
})
class CounterExample extends PickComponent {
  // @Reactive state triggers a re-render, so {{count}} stays in sync.
  @Reactive count = 0;

  @Listen("#incrementButton", "click")
  increment(): void {
    this.count++;
  }

  @Listen("#decrementButton", "click")
  decrement(): void {
    this.count--;
  }

  @Listen("#resetButton", "click")
  reset(): void {
    this.count = 0;
  }
}
