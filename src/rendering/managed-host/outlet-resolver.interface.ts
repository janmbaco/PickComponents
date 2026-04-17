/**
 * Defines the responsibility of locating the target outlet element within a rendered component.
 *
 * @description
 * The outlet is the element that should receive host styling (class/id migration).
 * Resolution strategy:
 * 1. Element with `.outlet` class
 * 2. First child element (if single root)
 * 3. Fallback: the rootElement itself
 *
 * @example
 * ```typescript
 * const resolver: IOutletResolver = new OutletResolver();
 * const outlet = resolver.resolve(compiledElement);
 * // outlet could be .outlet element, first child, or compiledElement itself
 * ```
 */
export interface IOutletResolver {
  /**
   * Resolves the outlet element within a compiled component root.
   *
   * @param rootElement - The compiled component root element
   * @returns The outlet element that should receive host styling
   * @throws Error if rootElement is null or undefined
   */
  resolve(rootElement: HTMLElement): HTMLElement;
}
