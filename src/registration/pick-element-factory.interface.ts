import type { PickComponent } from "../core/pick-component.js";
import type { PickElementOptions } from "./pick-element-factory.js";

/**
 * Defines the responsibility of creating CustomElementConstructor classes for Pick Components.
 */
export interface IPickElementFactory {
  /**
   * Creates a CustomElementConstructor class bound to the given PickComponent.
   *
   * @param componentCtor - Constructor of the PickComponent to wrap
   * @param options - Optional configuration for the element
   * @throws Error if componentCtor is null or undefined
   * @returns A CustomElementConstructor ready to be passed to customElements.define
   */
  create<T extends PickComponent>(
    componentCtor: new (...args: unknown[]) => T,
    options?: PickElementOptions<T>,
  ): CustomElementConstructor;
}
