/**
 * Minimal bootstrap entry point.
 * Exports only what is needed to initialize the framework,
 * without importing component files or triggering decorator side effects.
 */
export {
  bootstrapFramework,
  type FrameworkOverrides,
  type BootstrapOptions,
  type DecoratorMode,
} from "./providers/framework-bootstrap.js";
export {
  Services,
  IServiceRegistry,
  DefaultServiceRegistry,
} from "./providers/service-provider.js";
export type { ServiceToken } from "./providers/service-provider.interface.js";
