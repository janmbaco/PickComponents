import { bootstrapFramework, Services } from "pick-components";
import { RegistrationFormRulesService } from "./forms.rules-service.js";
import { RegistrationFormInitializer } from "./forms.initializer.js";

await bootstrapFramework(Services);

Services.register(
  "RegistrationFormInitializer",
  () => new RegistrationFormInitializer(new RegistrationFormRulesService()),
);

await import("./forms.example.js");
