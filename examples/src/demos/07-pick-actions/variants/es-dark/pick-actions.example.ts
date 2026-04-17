import pickActionsStyles from "./pick-actions.styles.css";
import {
  PickComponent,
  PickRender,
  Reactive,
  type PickViewActions,
} from "pick-components";

type ActionName = "deploy" | "review" | "archive";
type Priority = "baja" | "normal" | "alta";

const ACTION_LABELS: Record<ActionName, string> = {
  deploy: "Desplegar",
  review: "Revisar",
  archive: "Archivar",
};

@PickRender({
  selector: "pick-actions-example",
  styles: pickActionsStyles,
  template: `
    <section class="panel">
      <header>
        <p class="eyebrow">Componente del framework</p>
        <h2>Pick Actions</h2>
        <p>
          <code>&lt;pick-action&gt;</code> convierte cualquier tag visual en una acción
          del componente: click, o foco y Enter/Espacio.
        </p>
      </header>

      <div class="actions">
        <pick-action action="selectAction" value="deploy">
          <button type="button">Button: desplegar</button>
        </pick-action>

        <pick-action action="selectAction" value="review">
          <article class="action-card">
            <strong>Article: revisar</strong>
            <span>No hace falta un button; pick-action añade activación por teclado.</span>
          </article>
        </pick-action>

        <pick-action action="selectAction" value="archive">
          <span class="pill">Span: archivar</span>
        </pick-action>
      </div>

      <div class="priorities" aria-label="Prioridad">
        <pick-action action="setPriority" value="baja"><button type="button">Baja</button></pick-action>
        <pick-action action="setPriority" value="normal"><button type="button">Normal</button></pick-action>
        <pick-action action="setPriority" value="alta"><button type="button">Alta</button></pick-action>
      </div>

      <footer>
        <p><span>Acción</span><strong>{{selectedActionLabel}}</strong></p>
        <p><span>Prioridad</span><strong>{{priority}}</strong></p>
        <p><span>Mensaje</span><strong>{{message}}</strong></p>
      </footer>
    </section>
  `,
})
class PickActionsExample extends PickComponent {
  @Reactive selectedAction: ActionName = "deploy";
  @Reactive priority: Priority = "normal";

  get selectedActionLabel(): string {
    return ACTION_LABELS[this.selectedAction];
  }

  get message(): string {
    return `${this.selectedActionLabel} con prioridad ${this.priority}`;
  }

  // Las acciones de vista son la superficie explícita que <pick-action action="..."> puede invocar.
  getViewActions(): PickViewActions {
    return {
      selectAction: (value) => {
        this.selectedAction =
          value === "review" || value === "archive" ? value : "deploy";
      },
      setPriority: (value) => {
        this.priority = value === "baja" || value === "alta" ? value : "normal";
      },
    };
  }
}
