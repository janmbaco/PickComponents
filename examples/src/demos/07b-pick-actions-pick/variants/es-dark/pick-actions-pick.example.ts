import pickActionsStyles from "./pick-actions-pick.styles.css";
import { Pick } from "pick-components";
import type { InlineContext } from "pick-components";

type ActionName = "deploy" | "review" | "archive";
type Priority = "baja" | "normal" | "alta";

const ACTION_LABELS: Record<ActionName, string> = {
  deploy: "Desplegar",
  review: "Revisar",
  archive: "Archivar",
};

interface PickActionsState {
  selectedAction: ActionName;
  priority: Priority;
}

@Pick<PickActionsState>(
  "pick-actions-pick-example",
  (ctx: InlineContext<PickActionsState>) => {
    ctx.state({ selectedAction: "deploy", priority: "normal" });

    ctx.computed({
      selectedActionLabel() {
        return ACTION_LABELS[this.selectedAction];
      },
      message() {
        return `${ACTION_LABELS[this.selectedAction]} con prioridad ${this.priority}`;
      },
    });

    // ctx.on(...) se convierte en el mapa de acciones de vista para <pick-action action="...">.
    ctx.on({
      selectAction(value) {
        this.selectedAction =
          value === "review" || value === "archive" ? value : "deploy";
      },
      setPriority(value) {
        this.priority = value === "baja" || value === "alta" ? value : "normal";
      },
    });

    ctx.css(pickActionsStyles);

    ctx.html(`
      <section class="panel">
        <header>
          <p class="eyebrow">@Pick + Pick Actions</p>
          <h2>Acciones en ctx.on</h2>
          <p><code>ctx.on(...)</code> agrupa las acciones disponibles para el template.</p>
        </header>

        <div class="actions">
          <pick-action action="selectAction" value="deploy">
            <button type="button">Desplegar</button>
          </pick-action>

          <pick-action action="selectAction" value="review">
            <article class="action-card">
              <strong>Revisar</strong>
              <span>Article como disparador, mismo mapa de acciones.</span>
            </article>
          </pick-action>

          <pick-action action="selectAction" value="archive">
            <span class="pill">Archivar</span>
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
    `);
  },
)
class PickActionsPickExample {}
