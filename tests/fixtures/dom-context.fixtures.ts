import { DomContext } from "../../src/rendering/dom-context/dom-context.js";
import type { IDomContext } from "../../src/rendering/dom-context/dom-context.interface.js";

/**
 * Fixture factory for creating DomContext test instances.
 * Provides pre-configured contexts for different testing scenarios.
 *
 * @description
 * Implements the Fixture pattern for DOM context setup.
 * Manages cleanup and provides isolated testing environments.
 */
export class DomContextFixtures {
  private static createdContexts: IDomContext[] = [];

  /**
   * Creates a minimal DOM context with a simple div root.
   * Automatically tracks for cleanup.
   *
   * @returns IDomContext instance
   */
  static create(): IDomContext {
    const root = document.createElement("div");
    const context = new DomContext(root);
    this.createdContexts.push(context);
    return context;
  }

  /**
   * Creates a DOM context with a pre-populated root element.
   *
   * @param innerHTML - Initial HTML content
   * @returns IDomContext instance
   */
  static withContent(innerHTML: string): IDomContext {
    const root = document.createElement("div");
    root.innerHTML = innerHTML;
    const context = new DomContext(root);
    this.createdContexts.push(context);
    return context;
  }

  /**
   * Creates a DOM context with Shadow DOM root.
   *
   * @returns IDomContext instance with ShadowRoot
   */
  static withShadowRoot(): IDomContext {
    const host = document.createElement("div");
    const shadowRoot = host.attachShadow({ mode: "open" });
    const context = new DomContext(shadowRoot);
    this.createdContexts.push(context);
    return context;
  }

  /**
   * Creates a DOM context with custom root element.
   *
   * @param root - Custom root element
   * @returns IDomContext instance
   */
  static withRoot(root: HTMLElement | ShadowRoot): IDomContext {
    const context = new DomContext(root);
    this.createdContexts.push(context);
    return context;
  }

  /**
   * Creates multiple isolated DOM contexts.
   *
   * @param count - Number of contexts to create
   * @returns Array of IDomContext instances
   */
  static createMultiple(count: number): IDomContext[] {
    return Array.from({ length: count }, () => this.create());
  }

  /**
   * Creates a pair of contexts for testing.
   *
   * @returns Tuple of two IDomContext instances
   */
  static createPair(): [IDomContext, IDomContext] {
    return [this.create(), this.create()];
  }

  /**
   * Cleans up all created contexts.
   * Call this in afterEach to prevent memory leaks.
   */
  static cleanup(): void {
    this.createdContexts.forEach((context) => {
      try {
        context.destroy();
      } catch {
        // Ignore cleanup errors in tests
      }
    });
    this.createdContexts = [];
  }

  /**
   * Gets the current number of tracked contexts.
   * Useful for verifying cleanup.
   *
   * @returns Number of tracked contexts
   */
  static getTrackedCount(): number {
    return this.createdContexts.length;
  }
}
