/**
 * Defines the responsibility of managing shared CSSStyleSheet instances
 * that are adopted by every Shadow Root in the framework.
 *
 * @description
 * Follows the Lit pattern: stylesheets are parsed once into CSSStyleSheet
 * objects and shared across all component shadow roots via adoptedStyleSheets.
 * This avoids injecting duplicate `<link>` tags into every shadow root.
 */
export interface ISharedStylesRegistry {
  /**
   * Adds a CSSStyleSheet to the shared set.
   *
   * @param sheet - A constructed CSSStyleSheet instance
   */
  add(sheet: CSSStyleSheet): void;

  /**
   * Returns all registered shared stylesheets.
   *
   * @returns Readonly array of CSSStyleSheet instances
   */
  getAll(): readonly CSSStyleSheet[];

  /**
   * Applies all shared stylesheets to a ShadowRoot via adoptedStyleSheets.
   *
   * @param shadowRoot - The target ShadowRoot
   */
  applyTo(shadowRoot: ShadowRoot): void;
}

/**
 * Implements the responsibility of storing and distributing shared CSSStyleSheet
 * instances across all component Shadow Roots.
 *
 * @example
 * ```typescript
 * const registry = new SharedStylesRegistry();
 * const sheet = new CSSStyleSheet();
 * sheet.replaceSync(cssText);
 * registry.add(sheet);
 *
 * // Later, in the render pipeline:
 * registry.applyTo(shadowRoot);
 * ```
 */
export class SharedStylesRegistry implements ISharedStylesRegistry {
  private readonly sheets: CSSStyleSheet[] = [];

  /**
   * Adds a CSSStyleSheet to the shared set.
   *
   * @param sheet - A constructed CSSStyleSheet instance
   * @throws Error if sheet is not a CSSStyleSheet
   */
  add(sheet: CSSStyleSheet): void {
    if (!(sheet instanceof CSSStyleSheet)) {
      throw new Error("Expected a CSSStyleSheet instance");
    }
    this.sheets.push(sheet);
  }

  /**
   * Returns all registered shared stylesheets.
   *
   * @returns Readonly array of CSSStyleSheet instances
   */
  getAll(): readonly CSSStyleSheet[] {
    return this.sheets;
  }

  /**
   * Applies all shared stylesheets to a ShadowRoot via adoptedStyleSheets.
   *
   * @param shadowRoot - The target ShadowRoot
   * @throws Error if shadowRoot is not provided
   */
  applyTo(shadowRoot: ShadowRoot): void {
    if (!shadowRoot) throw new Error("ShadowRoot is required");
    if (this.sheets.length === 0) return;

    shadowRoot.adoptedStyleSheets = [
      ...this.sheets,
      ...shadowRoot.adoptedStyleSheets,
    ];
  }
}
