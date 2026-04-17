import diStyles from "./di.styles.css";
import diTemplate from "./di.template.html";
import {
  PickComponent,
  PickRender,
  Reactive,
  Services,
} from "pick-components";
import type { User } from "./services.js";

@PickRender({
  selector: "di-example",
  initializer: () => Services.get("UsersInitializer"),
  skeleton: `
    <section class="panel" role="status" aria-live="polite">
      <p class="eyebrow">Architecture</p>
      <h3>Dependency Injection</h3>
      <p aria-busy="true">Loading users...</p>
    </section>
  `,
  errorTemplate: '<p role="alert">Failed to load users.</p>',
  styles: diStyles,
  template: diTemplate,
})
export class DiExample extends PickComponent {
  @Reactive users: User[] = [];
  @Reactive userCount = 0;
}
