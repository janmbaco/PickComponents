import type { IDomContext } from "../dom-context/dom-context.interface.js";

/**
 * Defines the responsibility of resolving host elements for components.
 *
 * @description
 * Abstracts the mechanism for locating the DOM host element associated
 * with a component instance or DOM context. Enables lifecycle managers
 * to access the host without direct coupling to DomContext.
 *
 * @example
 * ```typescript
 * const resolver: IHostResolver = new DomContextHostResolver();
 * resolver.register(component, domContext);
 *
 * const host = resolver.resolve(component);
 * host.appendChild(element);
 * ```
 */
export interface IHostResolver {
  /**
   * Registers a component with its associated DOM context.
   *
   * @param component - Component instance
   * @param domContext - Associated DOM context
   */
  register(component: object, domContext: IDomContext): void;

  /**
   * Resolves the host element for a component instance.
   *
   * @param component - Component instance
   * @returns The host HTMLElement
   * @throws Error if component is not registered
   */
  resolve(component: object): HTMLElement;

  /**
   * Unregisters a component from the resolver.
   *
   * @param component - Component instance to unregister
   */
  unregister(component: object): void;

  /**
   * Clears all registered components.
   * Used for testing to ensure test isolation.
   */
  clear(): void;
}
