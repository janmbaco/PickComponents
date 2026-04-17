import { IDomAdapter } from "./dom-adapter.interface.js";

/**
 * Implements the responsibility of creating DOM primitives using the browser's Document.
 *
 * @description
 * Adapter backed by the global `document` for environments where the DOM is available
 * (e.g., browsers, Playwright). Provides basic creation methods for templates and elements.
 */
export class BrowserDomAdapter implements IDomAdapter {
  /**
   * Initializes a new instance of BrowserDomAdapter.
   *
   * @throws Error if `document` is not available in the environment
   */
  constructor() {
    if (typeof document === "undefined" || !document.createElement) {
      throw new Error("BrowserDomAdapter requires a DOM-enabled environment");
    }
  }

  /**
   * Creates a new HTML template element via `document.createElement('template')`.
   *
   * @returns HTMLTemplateElement instance
   */
  createTemplateElement(): HTMLTemplateElement {
    return document.createElement("template");
  }

  /**
   * Creates a new HTMLElement for the given tag name.
   *
   * @param tagName - HTML tag name to create
   * @returns HTMLElement instance
   */
  createElement(tagName: string): HTMLElement {
    if (!tagName) {
      throw new Error("Tag name is required");
    }
    return document.createElement(tagName);
  }
}
