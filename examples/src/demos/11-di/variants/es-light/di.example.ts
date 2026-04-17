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
      <p class="eyebrow">Arquitectura</p>
      <h3>Inyección de Dependencias</h3>
      <p aria-busy="true">Cargando usuarios...</p>
    </section>
  `,
  errorTemplate: '<p role="alert">Error al cargar usuarios.</p>',
  styles: diStyles,
  template: diTemplate,
})
export class DiExample extends PickComponent {
  @Reactive users: User[] = [];
  @Reactive userCount = 0;
}
