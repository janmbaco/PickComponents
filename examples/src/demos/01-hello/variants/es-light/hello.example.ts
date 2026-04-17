import { PickComponent, PickRender, Reactive } from "pick-components";

@PickRender({
  selector: "hello-example",
  styles: `
    :host {
      display: block;
    }

    p {
      margin: 0;
      color: #2563eb;
      font-size: 1.1rem;
      font-weight: 600;
    }
  `,
  template: `<p>Hola, {{name}}!</p>`,
})
class HelloExample extends PickComponent {
  @Reactive name = "Alguien";
}
