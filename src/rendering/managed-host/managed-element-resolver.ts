import { IManagedElementResolver } from "./managed-element-resolver.interface.js";
import type { IManagedElementRegistry } from "./managed-element-registry.js";

/**
 * Implements the responsibility of determining if an Element is managed by Pick Components.
 *
 * @description
 * Provides authoritative answer based on IManagedElementRegistry, which tracks actual
 * component associations created by the rendering pipeline. Does NOT use tag name heuristics.
 */
export class ManagedElementResolver implements IManagedElementResolver {
  private readonly registry: IManagedElementRegistry;

  /**
   * Initializes a new instance of ManagedElementResolver.
   *
   * @param registry - Registry for managed element tracking
   * @throws Error if registry is null or undefined
   */
  constructor(registry: IManagedElementRegistry) {
    if (!registry) throw new Error("ManagedElementRegistry is required");
    this.registry = registry;
  }

  /**
   * Determines if an element is managed by Pick Components engine.
   *
   * @param element - Element to check for PickComponent association
   * @returns true if element is registered in ManagedElementRegistry; false otherwise
   */
  isManagedElement(element: Element): boolean {
    return this.registry.isManagedElement(element);
  }
}
