import computedStyles from "./computed.styles.css";
import { PickComponent, PickRender, Reactive, Listen } from "pick-components";

// Computed bindings are plain getters. They derive view data from reactive state.
@PickRender({
  selector: "computed-bindings-example",
  styles: computedStyles,
  template: `
    <section class="panel">
      <label>
        First name
        <input id="firstNameInput" type="text" value="{{firstName}}" />
      </label>

      <label>
        Last name
        <input id="lastNameInput" type="text" value="{{lastName}}" />
      </label>

      <label>
        Points
        <input id="pointsInput" type="number" value="{{points}}" min="0" step="1" />
      </label>

      <div class="summary">
        <p><span>Full name</span><strong>{{fullName}}</strong></p>
        <p><span>Initials</span><strong>{{initials}}</strong></p>
        <p><span>Level</span><strong>{{level}}</strong></p>
        <p><span>Next milestone</span><strong>{{nextMilestone}}</strong></p>
      </div>
    </section>
  `,
})
class ComputedBindingsExample extends PickComponent {
  @Reactive firstName = "Ada";
  @Reactive lastName = "Lovelace";
  @Reactive points = 7;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  get initials(): string {
    return `${this.firstName[0] ?? ""}${this.lastName[0] ?? ""}`.toUpperCase();
  }

  get level(): string {
    return this.points >= 10 ? "Expert" : "Learning";
  }

  get nextMilestone(): string {
    const remaining = Math.max(10 - this.points, 0);
    const unit = remaining === 1 ? "point" : "points";
    return remaining === 0 ? "Milestone reached" : `${remaining} ${unit} left`;
  }

  @Listen("#firstNameInput", "input")
  updateFirstName(event: Event): void {
    this.firstName = (event.target as HTMLInputElement).value;
  }

  @Listen("#lastNameInput", "input")
  updateLastName(event: Event): void {
    this.lastName = (event.target as HTMLInputElement).value;
  }

  @Listen("#pointsInput", "input")
  updatePoints(event: Event): void {
    this.points =
      Number.parseInt((event.target as HTMLInputElement).value, 10) || 0;
  }
}
