/**
 * Defines the responsibility of determining if an Element is managed by Pick Components.
 *
 * @description
 * A managed element is one that has an associated PickComponent instance rendered
 * by the Pick Components engine, regardless of its tag name. This resolver provides
 * the authoritative answer based on actual component registration, NOT tag name heuristics.
 *
 * @example
 * ```typescript
 * const resolver: IManagedElementResolver = new ManagedElementResolver();
 * const isManaged = resolver.isManagedElement(element);
 * if (isManaged) {
 *   // Element has PickComponent association - apply managed policies
 * }
 * ```
 */
export interface IManagedElementResolver {
  /**
   * Determines if an element is managed by Pick Components engine.
   *
   * @param element - Element to check for PickComponent association
   * @returns true if element has associated PickComponent; false otherwise
   *
   * @example
   * ```typescript
   * // Managed: element rendered by engine with componentId/metadata
   * resolver.isManagedElement(hostElement); // true
   *
   * // Not managed: regular HTML or external custom element
   * resolver.isManagedElement(divElement); // false
   * ```
   */
  isManagedElement(element: Element): boolean;
}
