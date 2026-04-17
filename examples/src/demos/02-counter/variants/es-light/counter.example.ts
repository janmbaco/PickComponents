import counterStyles from "./counter.styles.css";
import { PickComponent, PickRender, Reactive, Listen } from "pick-components";

// @PickRender declara el selector del elemento y su template con estilos encapsulados.
@PickRender({
  selector: "counter-example",
  styles: counterStyles,
  template: `
    <div class="counter">
      <p>Contador: {{count}}</p>
      <div class="actions">
        <button id="decrementButton" type="button">−</button>
        <button id="resetButton" type="button">Reiniciar</button>
        <button id="incrementButton" type="button">+</button>
      </div>
    </div>
  `,
})
class CounterExample extends PickComponent {
  // @Reactive vuelve a renderizar el componente para mantener {{count}} sincronizado.
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
