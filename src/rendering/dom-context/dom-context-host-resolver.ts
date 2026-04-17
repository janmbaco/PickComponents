import type { IDomContext } from "./dom-context.interface.js";
import type { IHostResolver } from "./host-resolver.interface.js";

/**
 * Implements the responsibility of resolving host elements via DomContext.
 *
 * @description
 * Maps component instances to their DomContext and resolves the host element
 * by calling domContext.getElement(). Uses WeakMap for automatic cleanup.
 *
 * @example
 * ```typescript
 * const resolver = new DomContextHostResolver();
 *
 * // Register during render
 * resolver.register(component, domContext);
 *
 * // Resolve in lifecycle manager
 * const host = resolver.resolve(component);
 * host.innerHTML = '';
 *
 * // Cleanup
 * resolver.unregister(component);
 * ```
 */
export class DomContextHostResolver implements IHostResolver {
  private contextMap = new WeakMap<object, IDomContext>();

  /**
   * Registers a component with its DOM context.
   *
   * @param component - Component instance
   * @param domContext - Associated DOM context
   * @throws Error if component or domContext is null/undefined
   */
  register(component: object, domContext: IDomContext): void {
    if (!component || typeof component !== "object") {
      throw new Error("Component is required");
    }
    if (!domContext) {
      throw new Error("DomContext is required");
    }
    this.contextMap.set(component, domContext);
  }

  /**
   * Resolves the host element for a component.
   *
   * @param component - Component instance
   * @returns The host HTMLElement from associated DomContext
   * @throws Error if component is not registered
   */
  resolve(component: object): HTMLElement {
    if (!component || typeof component !== "object") {
      throw new Error("Component is required");
    }

    const domContext = this.contextMap.get(component);
    if (!domContext) {
      throw new Error(
        "Component not registered with HostResolver. Ensure register() was called during render.",
      );
    }

    // Return the target root (the host custom element) so that lifecycle managers
    // can read host-level attributes (e.g. action="decrement" on <pick-action>)
    // and dispatch events from the correct element. For shadow-DOM components the
    // target root is a ShadowRoot, so fall back to the compiled element in that case.
    const targetRoot = domContext.getTargetRoot();
    if (targetRoot instanceof HTMLElement) {
      return targetRoot;
    }

    const element = domContext.getElement();
    if (!element) {
      throw new Error(
        "Element not available in domContext. Ensure component has been rendered.",
      );
    }

    return element;
  }

  /**
   * Unregisters a component from the resolver.
   *
   * @param component - Component instance to unregister
   */
  unregister(component: object): void {
    if (!component || typeof component !== "object") {
      return;
    }
    this.contextMap.delete(component);
  }

  /**
   * Clears all registered components.
   * Primarily for testing to ensure test isolation.
   */
  clear(): void {
    // WeakMap doesn't have a clear method, but we can create a new one
    this.contextMap = new WeakMap<object, IDomContext>();
  }
}
