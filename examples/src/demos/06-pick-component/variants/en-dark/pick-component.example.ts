import pickComponentStyles from "./pick-component.styles.css";
import { Pick } from "pick-components";
import type { InlineContext } from "pick-components";

interface ProfileState {
  firstName: string;
  lastName: string;
  role: string;
  focus: string;
  progress: number;
}

@Pick<ProfileState>(
  "pick-profile-example",
  (ctx: InlineContext<ProfileState>) => {
    // @Pick keeps the same ideas, but composes them in a functional setup.
    ctx.state({
      firstName: "Ada",
      lastName: "Lovelace",
      role: "Engineer",
      focus: "analytical engines",
      progress: 68,
    });

    ctx.computed({
      fullName() {
        return `${this.firstName} ${this.lastName}`.trim();
      },
      initials() {
        return `${this.firstName[0] ?? ""}${this.lastName[0] ?? ""}`.toUpperCase();
      },
      progressLabel() {
        return `${Math.min(Math.max(this.progress, 0), 100)}%`;
      },
      status() {
        return this.progress >= 80 ? "Ready" : "In progress";
      },
      summary() {
        return `${this.firstName} works as ${this.role} focused on ${this.focus}.`;
      },
    });

    ctx.listen("#firstNameInput", "input", function (event) {
      this.firstName = (event.target as HTMLInputElement).value;
    });

    ctx.listen("#lastNameInput", "input", function (event) {
      this.lastName = (event.target as HTMLInputElement).value;
    });

    ctx.listen("#roleInput", "input", function (event) {
      this.role = (event.target as HTMLInputElement).value;
    });

    ctx.listen("#focusInput", "input", function (event) {
      this.focus = (event.target as HTMLInputElement).value;
    });

    ctx.listen("#progressInput", "input", function (event) {
      this.progress =
        Number.parseInt((event.target as HTMLInputElement).value, 10) || 0;
    });

    ctx.css(pickComponentStyles);

    ctx.html(`
      <section class="panel">
        <header class="profile">
          <span class="avatar">{{initials}}</span>
          <div>
            <p class="eyebrow">@Pick component</p>
            <h2>{{fullName}}</h2>
            <p>{{summary}}</p>
          </div>
        </header>

        <div class="fields">
          <label>
            First name
            <input id="firstNameInput" type="text" value="{{firstName}}" />
          </label>

          <label>
            Last name
            <input id="lastNameInput" type="text" value="{{lastName}}" />
          </label>

          <label>
            Role
            <input id="roleInput" type="text" value="{{role}}" />
          </label>

          <label>
            Focus
            <input id="focusInput" type="text" value="{{focus}}" />
          </label>

          <label>
            Progress
            <input id="progressInput" type="number" value="{{progress}}" min="0" max="100" step="1" />
          </label>
        </div>

        <footer>
          <span>{{status}}</span>
          <strong>{{progressLabel}}</strong>
        </footer>
      </section>
    `);
  },
)
class PickProfileExample {}
