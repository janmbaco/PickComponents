/**
 * Defines the responsibility of abstracting DOM creation operations.
 *
 * @description
 * Provides an environment-agnostic interface for creating and handling basic
 * DOM primitives needed by the rendering pipeline (templates and elements).
 * Decouples consumers from the global `document` to enable testing and SSR-ready
 * adapters.
 */
export interface IDomAdapter {
  /**
   * Creates a new HTML template element.
   *
   * @throws Error if the environment cannot create a template element
   * @returns HTMLTemplateElement instance
   *
   * @example
   * ```typescript
   * const tpl = dom.createTemplateElement();
   * tpl.innerHTML = "<div>Hello</div>";
   * ```
   */
  createTemplateElement(): HTMLTemplateElement;

  /**
   * Creates a new HTMLElement for the given tag name.
   *
   * @param tagName - The HTML tag name to create (e.g., 'div')
   * @throws Error if tagName is invalid or environment cannot create the element
   * @returns HTMLElement instance
   *
   * @example
   * ```typescript
   * const div = dom.createElement('div');
   * div.className = 'container';
   * ```
   */
  createElement(tagName: string): HTMLElement;
}
