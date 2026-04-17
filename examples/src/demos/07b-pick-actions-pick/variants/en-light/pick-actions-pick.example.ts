import pickActionsStyles from "./pick-actions-pick.styles.css";
import { Pick } from "pick-components";
import type { InlineContext } from "pick-components";

type ActionName = "deploy" | "review" | "archive";
type Priority = "low" | "normal" | "high";

const ACTION_LABELS: Record<ActionName, string> = {
  deploy: "Deploy",
  review: "Review",
  archive: "Archive",
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
        return `${ACTION_LABELS[this.selectedAction]} with ${this.priority} priority`;
      },
    });

    // ctx.on(...) becomes the component view-action map used by <pick-action action="...">.
    ctx.on({
      selectAction(value) {
        this.selectedAction =
          value === "review" || value === "archive" ? value : "deploy";
      },
      setPriority(value) {
        this.priority = value === "low" || value === "high" ? value : "normal";
      },
    });

    ctx.css(pickActionsStyles);

    ctx.html(`
      <section class="panel">
        <header>
          <p class="eyebrow">@Pick + Pick Actions</p>
          <h2>Actions in ctx.on</h2>
          <p><code>ctx.on(...)</code> groups the actions available to the template.</p>
        </header>

        <div class="actions">
          <pick-action action="selectAction" value="deploy">
            <button type="button">Deploy</button>
          </pick-action>

          <pick-action action="selectAction" value="review">
            <article class="action-card">
              <strong>Review</strong>
              <span>Article trigger, same action map.</span>
            </article>
          </pick-action>

          <pick-action action="selectAction" value="archive">
            <span class="pill">Archive</span>
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
    `);
  },
)
class PickActionsPickExample {}
