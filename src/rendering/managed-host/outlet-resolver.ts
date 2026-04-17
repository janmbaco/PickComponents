import { IOutletResolver } from "./outlet-resolver.interface.js";

/**
 * Implements the responsibility of locating the target outlet element within a rendered component.
 *
 * @description
 * Resolves the outlet element using a prioritized strategy:
 * 1. Element with `.outlet` class (explicit outlet marker)
 * 2. First child element if root has single child (common pattern)
 * 3. Fallback: rootElement itself (conservative approach)
 *
 * @example
 * ```typescript
 * const resolver = new OutletResolver();
 * const outlet = resolver.resolve(compiledElement);
 * // Returns the element that should receive host styling
 * ```
 */
export class OutletResolver implements IOutletResolver {
  /**
   * Resolves the outlet element within a compiled component root.
   *
   * @param rootElement - The compiled component root element
   * @returns The outlet element that should receive host styling
   * @throws Error if rootElement is null or undefined
   *
   * @example
   * ```typescript
   * // Template: <div><span class="outlet"></span></div>
   * const outlet = resolver.resolve(rootElement);
   * // Returns the span.outlet element
   *
   * // Template: <div><span>content</span></div>
   * const outlet = resolver.resolve(rootElement);
   * // Returns the span (single child)
   *
   * // Template: <div>multiple<span>children</span></div>
   * const outlet = resolver.resolve(rootElement);
   * // Returns rootElement (fallback)
   * ```
   */
  resolve(rootElement: HTMLElement): HTMLElement {
    if (!rootElement) {
      throw new Error("Root element is required");
    }

    // Strategy 1: Explicit .outlet marker
    const explicitOutlet = rootElement.querySelector<HTMLElement>(".outlet");
    if (explicitOutlet) {
      return explicitOutlet;
    }

    // Strategy 2: Single child element (common pattern)
    const children = Array.from(rootElement.children).filter(
      (child) =>
        child instanceof
        (rootElement.ownerDocument?.defaultView?.HTMLElement || HTMLElement),
    );

    if (children.length === 1) {
      return children[0] as HTMLElement;
    }

    // Strategy 3: Fallback to root (conservative)
    return rootElement;
  }
}
