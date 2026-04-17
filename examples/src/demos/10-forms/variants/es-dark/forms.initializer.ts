import { PickInitializer } from "pick-components";
import type { FormsExample } from "./forms.example.js";
import { RegistrationFormRulesService } from "./forms.rules-service.js";

export class RegistrationFormInitializer extends PickInitializer<FormsExample> {
  constructor(private readonly service: RegistrationFormRulesService) {
    super();
  }

  protected async onInitialize(component: FormsExample): Promise<boolean> {
    component.hydrate(await this.service.loadSession());
    return true;
  }
}
