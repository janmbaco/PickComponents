import bindingsStyles from "./bindings.styles.css";
import { PickComponent, PickRender, Reactive, Listen } from "pick-components";

// Las expresiones del template leen estado del componente con {{propiedad}}.
@PickRender({
  selector: "bindings-example",
  styles: bindingsStyles,
  template: `
    <section class="panel">
      <label>
        Nombre
        <input id="nameInput" type="text" value="{{userName}}" />
      </label>

      <label>
        Rol
        <input id="roleInput" type="text" value="{{role}}" />
      </label>

      <div class="output">
        <p><strong>{{userName}}</strong></p>
        <p>{{role}}</p>
      </div>
    </section>
  `,
})
class BindingsExample extends PickComponent {
  @Reactive userName = "Ada";
  @Reactive role = "Autora de componentes";

  @Listen("#nameInput", "input")
  updateName(event: Event): void {
    this.userName = (event.target as HTMLInputElement).value;
  }

  @Listen("#roleInput", "input")
  updateRole(event: Event): void {
    this.role = (event.target as HTMLInputElement).value;
  }
}
