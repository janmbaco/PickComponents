import type { Unsubscribe } from "../../reactive/signal.js";
import type { IDomContext } from "../../rendering/dom-context/dom-context.interface.js";
import { Services } from "../../providers/service-provider.js";
import type { IListenerMetadataRegistry } from "./listener-metadata-registry.interface.js";
import type { IListenerInitializer } from "./listener-initializer.interface.js";

/**
 * Implements the responsibility of binding DOM event listeners to a component after render.
 *
 * @description
 * Reads listener metadata via `IListenerMetadataRegistry` and wires up DOM event handlers
 * using the provided `IDomContext`. Subscriptions are managed by the context for
 * automatic cleanup on destroy or re-render.
 *
 * Registered in the service container under `'IListenerInitializer'` by `bootstrapFramework`.
 */
export class DefaultListenerInitializer implements IListenerInitializer {
  /**
   * Binds all `@Listen`-registered event handlers to the component's DOM context.
   *
   * @param domContext - DOM context for querying elements and managing subscriptions
   * @param component - Component instance whose methods should be bound
   * @throws Error if domContext or component is null or undefined
   */
  initialize(domContext: IDomContext, component: unknown): void {
    if (!domContext) throw new Error("DomContext is required");
    if (!component || typeof component !== "object")
      throw new Error("Component is required");

    const listeners = Services.get<IListenerMetadataRegistry>(
      "IListenerMetadataRegistry",
    ).get(component);
    const comp = component as Record<string, unknown>;

    listeners.forEach(({ methodName, eventName, selector }) => {
      const method = comp[methodName];
      if (typeof method !== "function") {
        return;
      }

      if (selector) {
        const rootElement = domContext.getElement();
        if (!rootElement) {
          return;
        }

        this.assertValidSelector(rootElement, selector);

        const handler = (event: Event) => {
          if (!this.findDelegatedTarget(event, selector, rootElement)) {
            return;
          }

          (method as (event: Event) => void).call(component, event);
        };
        rootElement.addEventListener(eventName, handler);

        const unsub: Unsubscribe = () =>
          rootElement.removeEventListener(eventName, handler as EventListener);
        domContext.addSubscription(unsub);
        return;
      }

      const targetElement = domContext.getElement();
      if (!targetElement) {
        return;
      }

      const handler = (event: Event) =>
        (method as (event: Event) => void).call(component, event);
      targetElement.addEventListener(eventName, handler);

      const unsub: Unsubscribe = () =>
        targetElement.removeEventListener(eventName, handler as EventListener);
      domContext.addSubscription(unsub);
    });
  }

  private assertValidSelector(rootElement: HTMLElement, selector: string): void {
    rootElement.querySelector(selector);
  }

  private findDelegatedTarget(
    event: Event,
    selector: string,
    rootElement: HTMLElement,
  ): Element | null {
    const targetNode = event.target as Node | null;
    if (!targetNode || typeof targetNode.nodeType !== "number") {
      return null;
    }

    const candidates = rootElement.querySelectorAll(selector);
    for (const candidate of Array.from(candidates)) {
      if (candidate === targetNode || candidate.contains(targetNode)) {
        return candidate;
      }
    }

    return null;
  }
}
