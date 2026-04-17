import dashboardStyles from "./dashboard.styles.css";
import dashboardTemplate from "./dashboard.template.html";
import {
  PickComponent,
  PickRender,
  Reactive,
  Listen,
  Services,
} from "pick-components";
import type { UserSummary, Note } from "./services.js";

@PickRender({
  selector: "dashboard-example",
  initializer: () => Services.get("DashboardInitializer"),
  skeleton: `
    <section class="panel" role="status" aria-live="polite">
      <p class="eyebrow">Composición</p>
      <h3>Mini panel</h3>
      <p aria-busy="true">Cargando...</p>
    </section>
  `,
  errorTemplate: '<p role="alert">Error al cargar el panel.</p>',
  styles: dashboardStyles,
  template: dashboardTemplate,
})
export class DashboardExample extends PickComponent {
  @Reactive users: UserSummary[] = [];
  @Reactive userCount = 0;
  @Reactive postCount = 0;
  @Reactive notes: Note[] = [];

  @Listen("#noteForm", "submit")
  onAddNote(event: Event): void {
    event.preventDefault();
    const input = (
      event.currentTarget as HTMLFormElement
    ).querySelector<HTMLInputElement>("#noteInput");
    if (!input) return;

    const text = input.value.trim();
    if (text) {
      this.notes = [...this.notes, { id: Date.now(), text }];
      input.value = "";
    }
  }

  removeNote(value: unknown): void {
    this.notes = this.notes.filter((note) => note.id !== Number(value));
  }
}
