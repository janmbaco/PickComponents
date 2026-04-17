import pickSelectStyles from "./pick-select.styles.css";
import { PickComponent, PickRender, Reactive, Listen } from "pick-components";

type PanelStatus = "none" | "ready" | "empty" | "error";

const STATUS_LABELS: Record<PanelStatus, string> = {
  none: "No branch",
  ready: "Ready",
  empty: "Empty",
  error: "Error",
};

@PickRender({
  selector: "pick-select-example",
  styles: pickSelectStyles,
  template: `
    <section class="panel">
      <header>
        <p class="eyebrow">Framework component</p>
        <h2>Pick Select</h2>
        <p>
          <code>&lt;pick-select&gt;</code> renders the matching <code>&lt;on&gt;</code>
          branch, and falls back to <code>&lt;otherwise&gt;</code> when none match.
        </p>
      </header>

      <label class="control">
        Panel state
        <select id="statusSelect" aria-label="Panel state">
          <option value="none">No matching branch</option>
          <option value="ready">Ready branch</option>
          <option value="empty">Empty branch</option>
          <option value="error">Error branch</option>
        </select>
      </label>

      <p class="state">Current state: <strong>{{statusLabel}}</strong></p>

      <pick-select>
        <on condition="{{status === 'ready'}}">
          <article class="branch success">
            <strong>Ready to publish</strong>
            <span>This branch is shown because the ready condition is true.</span>
          </article>
        </on>

        <on condition="{{status === 'empty'}}">
          <article class="branch neutral">
            <strong>No content yet</strong>
            <span>The component can render a valid empty state without extra code.</span>
          </article>
        </on>

        <on condition="{{status === 'error'}}">
          <article class="branch danger">
            <strong>Configuration error</strong>
            <span>Use a branch for states that need different markup.</span>
          </article>
        </on>

        <otherwise>
          <article class="branch idle">
            <strong>Choose a branch</strong>
            <span>This fallback appears because no <code>&lt;on&gt;</code> condition matches.</span>
          </article>
        </otherwise>
      </pick-select>
    </section>
  `,
})
class PickSelectExample extends PickComponent {
  @Reactive status: PanelStatus = "none";

  get statusLabel(): string {
    return STATUS_LABELS[this.status];
  }

  @Listen("#statusSelect", "change")
  changeStatus(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.status = this.toPanelStatus(value);
  }

  private toPanelStatus(value: string): PanelStatus {
    return value === "ready" || value === "empty" || value === "error"
      ? value
      : "none";
  }
}
