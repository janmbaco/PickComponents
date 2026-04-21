import "../bootstrap.js";
import { configureExamplesServices } from "./configure-examples-services.js";

configureExamplesServices();
await import("./register-shell-components.js");
