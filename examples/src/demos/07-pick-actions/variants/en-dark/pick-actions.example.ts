import pickActionsStyles from "./pick-actions.styles.css";
import {
  PickComponent,
  PickRender,
  Reactive,
  type PickViewActions,
} from "pick-components";

type ActionName = "deploy" | "review" | "archive";
type Priority = "low" | "normal" | "high";

const ACTION_LABELS: Record<ActionName, string> = {
  deploy: "Deploy",
  review: "Review",
  archive: "Archive",
};

@PickRender({
  selector: "pick-actions-example",
  styles: pickActionsStyles,
  template: `
    <section class="panel">
      <header>
        <p class="eyebrow">Framework component</p>
        <h2>Pick Actions</h2>
        <p>
          <code>&lt;pick-action&gt;</code> turns any visual tag into a component action:
          click it, or focus it and press Enter or Space.
        </p>
      </header>

      <div class="actions">
        <pick-action action="selectAction" value="deploy">
          <button type="button">Button: deploy</button>
        </pick-action>

        <pick-action action="selectAction" value="review">
          <article class="action-card">
            <strong>Article: review</strong>
            <span>No button required; pick-action provides keyboard activation.</span>
          </article>
        </pick-action>

        <pick-action action="selectAction" value="archive">
          <span class="pill">Span: archive</span>
        </pick-action>
      </div>

      <div class="priorities" aria-label="Priority">
        <pick-action action="setPriority" value="low"><button type="button">Low</button></pick-action>
        <pick-action action="setPriority" value="normal"><button type="button">Normal</button></pick-action>
        <pick-action action="setPriority" value="high"><button type="button">High</button></pick-action>
      </div>

      <footer>
        <p><span>Action</span><strong>{{selectedActionLabel}}</strong></p>
        <p><span>Priority</span><strong>{{priority}}</strong></p>
        <p><span>Message</span><strong>{{message}}</strong></p>
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
    return `${this.selectedActionLabel} with ${this.priority} priority`;
  }

  // View actions are the explicit surface that <pick-action action="..."> can invoke.
  getViewActions(): PickViewActions {
    return {
      selectAction: (value) => {
        this.selectedAction =
          value === "review" || value === "archive" ? value : "deploy";
      },
      setPriority: (value) => {
        this.priority = value === "low" || value === "high" ? value : "normal";
      },
    };
  }
}
