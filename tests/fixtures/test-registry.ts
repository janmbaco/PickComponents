import { DefaultServiceRegistry } from "../../src/providers/default-service-provider.js";
import { bootstrapFramework } from "../../src/providers/framework-bootstrap.js";
import type { IServiceRegistry } from "../../src/providers/service-provider.interface.js";

/**
 * Creates a fresh service registry pre-populated with all framework services.
 *
 * Use in integration tests that need the full rendering pipeline.
 * For unit tests, prefer manual mocks.
 *
 * @returns A fully bootstrapped service registry
 */
export async function createTestRegistry(): Promise<IServiceRegistry> {
  const registry = new DefaultServiceRegistry();
  await bootstrapFramework(registry);
  return registry;
}
