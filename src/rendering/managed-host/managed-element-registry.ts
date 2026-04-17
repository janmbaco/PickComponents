/**
 * Defines the responsibility of tracking elements managed by the Pick Components engine.
 */
export interface IManagedElementRegistry {
  /**
   * Registers an element as managed by Pick Components engine.
   *
   * @param element - Element to register
   * @param componentId - Component selector/ID for debugging
   * @throws Error if element or componentId is null/undefined
   */
  register(element: Element, componentId: string): void;

  /**
   * Checks if an element is managed by Pick Components engine.
   *
   * @param element - Element to check
   * @returns true if element is registered as managed
   */
  isManagedElement(element: Element): boolean;

  /**
   * Gets the componentId for a managed element.
   *
   * @param element - Managed element
   * @returns Component ID if element is managed; undefined otherwise
   */
  getComponentId(element: Element): string | undefined;

  /**
   * Unregisters an element from managed tracking.
   *
   * @param element - Element to unregister
   */
  unregister(element: Element): void;
}

/**
 * Implements a global registry for managed elements.
 *
 * @description
 * Central WeakMap-based registry that tracks Elements rendered by Pick Components engine.
 * When the engine/pipeline renders a component (host or nested), it registers the Element
 * with its componentId/metadata. This registry provides the authoritative source for
 * determining if an Element is managed, independent of tag name heuristics.
 *
 * **Usage Pattern:**
 * 1. RenderPipeline registers host element when rendering component
 * 2. TemplateCompiler/BindingResolver registers nested component elements
 * 3. IManagedElementResolver queries this registry
 *
 * @example
 * ```typescript
 * // Register element as managed
 * ManagedElementRegistry.register(element, 'my-component');
 *
 * // Query element status
 * const isManaged = ManagedElementRegistry.isManagedElement(element); // true
 *
 * // Unregister on cleanup
 * ManagedElementRegistry.unregister(element);
 * ```
 */

const registry = new WeakMap<Element, string>();

export const ManagedElementRegistry: IManagedElementRegistry = {
  /**
   * Registers an element as managed by Pick Components engine.
   *
   * @param element - Element to register (host or nested component element)
   * @param componentId - Component selector/ID for debugging/tracing
   * @throws Error if element or componentId is null/undefined
   *
   * @example
   * ```typescript
   * // Register host element
   * ManagedElementRegistry.register(hostElement, 'my-component');
   *
   * // Register nested component element
   * ManagedElementRegistry.register(nestedElement, 'child-component');
   * ```
   */
  register(element: Element, componentId: string): void {
    if (!element) {
      throw new Error("Element is required");
    }
    if (!componentId) {
      throw new Error("Component ID is required");
    }
    registry.set(element, componentId);
  },

  /**
   * Checks if an element is managed by Pick Components engine.
   *
   * @param element - Element to check
   * @returns true if element is registered as managed; false otherwise
   *
   * @example
   * ```typescript
   * if (ManagedElementRegistry.isManagedElement(element)) {
   *   // Apply managed element policies
   * }
   * ```
   */
  isManagedElement(element: Element): boolean {
    if (!element) {
      return false;
    }
    return registry.has(element);
  },

  /**
   * Gets the componentId for a managed element.
   *
   * @param element - Managed element
   * @returns Component ID if element is managed; undefined otherwise
   */
  getComponentId(element: Element): string | undefined {
    if (!element) {
      return undefined;
    }
    return registry.get(element);
  },

  /**
   * Unregisters an element from managed tracking.
   *
   * @param element - Element to unregister
   *
   * @example
   * ```typescript
   * // Cleanup on component destroy
   * ManagedElementRegistry.unregister(element);
   * ```
   */
  unregister(element: Element): void {
    if (!element) {
      return;
    }
    registry.delete(element);
  },
};
