import formsStyles from "./forms.styles.css";
import {
  PickComponent,
  PickRender,
  Reactive,
  Listen,
  Services,
  type PickViewActions,
} from "pick-components";
import {
  type FieldValidationRules,
  type RegistrationFormRules,
  type RegistrationFormSession,
} from "./forms.rules-service.js";

@PickRender({
  selector: "forms-example",
  initializer: () => Services.get("RegistrationFormInitializer"),
  skeleton: `
    <section class="panel" role="status" aria-live="polite">
      <p class="eyebrow">Rendering lifecycle</p>
      <h3>Forms & Rules</h3>
      <p aria-busy="true">Loading validation rules...</p>
    </section>
  `,
  errorTemplate:
    '<p role="alert">Validation rules could not be loaded before render.</p>',
  styles: formsStyles,
  template: `
    <section class="panel">
      <header>
        <p class="eyebrow">Rendering lifecycle</p>
        <h3>Forms & Rules</h3>
        <p class="intro">
          A service provides validation rules before the first render.
          [[RULES.*]] applies them to the inputs.
        </p>
      </header>

      <pick-select>
        <on condition="{{submitted}}">
          <div class="success" role="alert">
            <p>Form submitted successfully.</p>
            <pick-action action="resetForm"><button type="button">Start over</button></pick-action>
          </div>
        </on>

        <otherwise>
          <form id="regForm" novalidate>
            <div class="field">
              <label for="usernameField">Username <span class="required">*</span></label>
              <input id="usernameField" type="text" placeholder="Username" aria-describedby="usernameHint" [[RULES.username]] />
              <small id="usernameHint" class="hint">{{usernameHint}}</small>
            </div>

            <div class="field">
              <label for="emailField">Email <span class="required">*</span></label>
              <input id="emailField" type="email" placeholder="Email" aria-describedby="emailHint" [[RULES.email]] />
              <small id="emailHint" class="hint">{{emailHint}}</small>
            </div>

            <div class="field">
              <label for="passwordField">Password <span class="required">*</span></label>
              <input id="passwordField" type="password" placeholder="Password" aria-describedby="passwordHint" [[RULES.password]] />
              <small id="passwordHint" class="hint">{{passwordHint}}</small>
            </div>

            <p class="status"><strong>{{validCount}}</strong>/3 valid</p>
            <button type="submit" disabled="{{!isValid}}">Register</button>
          </form>
        </otherwise>
      </pick-select>
    </section>
  `,
})
export class FormsExample extends PickComponent {
  rules: RegistrationFormRules = {};

  @Reactive isValid = false;
  @Reactive validCount = 0;
  @Reactive submitted = false;

  get usernameHint(): string {
    return this.describeRule(this.rules.username);
  }

  get emailHint(): string {
    return this.describeRule(this.rules.email);
  }

  get passwordHint(): string {
    return this.describeRule(this.rules.password);
  }

  hydrate(session: RegistrationFormSession): void {
    this.rules = session.rules;
    this.resetRuleState();
  }

  getViewActions(): PickViewActions {
    return {
      resetForm: () => this.resetRuleState(),
    };
  }

  @Listen("focusout")
  onFieldBlur(event: Event): void {
    const field = event.target as HTMLElement;
    if (field.tagName === "INPUT") {
      (field as HTMLInputElement).classList.add("touched");
    }
  }

  @Listen("input")
  onFormInput(event: Event): void {
    const form = (event.target as HTMLElement).closest<HTMLFormElement>("form");
    if (form) {
      this.evaluateFormRules(form);
    }
  }

  @Listen("submit")
  handleRegister(event: Event): void {
    event.preventDefault();
    if (!(event.target instanceof HTMLFormElement)) {
      return;
    }

    this.evaluateFormRules(event.target);
    if (!this.isValid) {
      this.touchFields(event.target);
      return;
    }

    this.submitted = true;
  }

  private evaluateFormRules(form: HTMLFormElement): void {
    const fields = form.querySelectorAll<HTMLInputElement>("input");
    let count = 0;

    for (const field of fields) {
      if (field.checkValidity()) {
        count++;
      }
    }

    this.validCount = count;
    this.isValid = count === fields.length;
  }

  private resetRuleState(): void {
    this.isValid = false;
    this.validCount = 0;
    this.submitted = false;
  }

  private touchFields(form: HTMLFormElement): void {
    for (const field of form.querySelectorAll<HTMLInputElement>("input")) {
      field.classList.add("touched");
    }
  }

  private describeRule(rule?: FieldValidationRules): string {
    return rule?.title ?? "";
  }
}
