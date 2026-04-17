import expressionsStyles from "./expressions.styles.css";
import { PickComponent, PickRender, Reactive, Listen } from "pick-components";

// Las expresiones dentro de {{...}} las evalúa el motor de templates, no JavaScript arbitrario.
@PickRender({
  selector: "template-expressions-example",
  styles: expressionsStyles,
  template: `
    <section class="panel">
      <label>
        Nombre
        <input id="nameInput" type="text" value="{{name}}" />
      </label>

      <label>
        Contador
        <input id="countInput" type="number" value="{{count}}" step="1" />
      </label>

      <div class="examples">
        <p><code>name.toUpperCase()</code> <strong>{{name.toUpperCase()}}</strong></p>
        <p><code>name.length</code> <strong>{{name.length}}</strong></p>
        <p><code>count + 1</code> <strong>{{count + 1}}</strong></p>
        <p><code>count % 2 === 0 ? "Par" : "Impar"</code> <strong>{{count % 2 === 0 ? "Par" : "Impar"}}</strong></p>
      </div>
    </section>
  `,
})
class TemplateExpressionsExample extends PickComponent {
  @Reactive name = "Ada";
  @Reactive count = 2;

  @Listen("#nameInput", "input")
  updateName(event: Event): void {
    this.name = (event.target as HTMLInputElement).value;
  }

  @Listen("#countInput", "input")
  updateCount(event: Event): void {
    this.count =
      Number.parseInt((event.target as HTMLInputElement).value, 10) || 0;
  }
}
