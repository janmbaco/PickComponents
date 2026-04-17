import bindingsStyles from "./bindings.styles.css";
import { PickComponent, PickRender, Reactive, Listen } from "pick-components";

// Template expressions read component state with {{propertyName}}.
@PickRender({
  selector: "bindings-example",
  styles: bindingsStyles,
  template: `
    <section class="panel">
      <label>
        Name
        <input id="nameInput" type="text" value="{{userName}}" />
      </label>

      <label>
        Role
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
  @Reactive role = "Component author";

  @Listen("#nameInput", "input")
  updateName(event: Event): void {
    this.userName = (event.target as HTMLInputElement).value;
  }

  @Listen("#roleInput", "input")
  updateRole(event: Event): void {
    this.role = (event.target as HTMLInputElement).value;
  }
}
