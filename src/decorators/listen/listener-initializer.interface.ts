import type { IDomContext } from "../../rendering/dom-context/dom-context.interface.js";

/**
 * Defines the responsibility of binding DOM event listeners to a component after render.
 *
 * @description
 * Reads listener metadata from the component and wires up DOM event handlers
 * via `IDomContext`. Consumers depend on this abstraction — resolved from the
 * service container — instead of coupling to the concrete binding function.
 */
export interface IListenerInitializer {
  /**
   * Binds all `@Listen`-registered event handlers to the component's DOM context.
   *
   * @param domContext - DOM context for querying elements and managing subscriptions
   * @param component - Component instance whose methods should be bound
   * @throws Error if domContext or component is null or undefined
   */
  initialize(domContext: IDomContext, component: unknown): void;
}
