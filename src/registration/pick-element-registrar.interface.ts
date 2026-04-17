import type { PickComponent } from "../core/pick-component.js";
import type { PickElementOptions } from "./pick-element-factory.js";

/**
 * Defines the responsibility of registering Pick Components as native custom elements.
 */
export interface IPickElementRegistrar {
  /**
   * Registers a PickComponent as a native custom element.
   *
   * @param tagName - HTML tag name for the element (e.g. 'my-component')
   * @param componentCtor - Constructor of the PickComponent to register
   * @param options - Optional configuration: lifecycle, initializer, shadow DOM, render engine
   * @throws Error if tagName or componentCtor are null or undefined
   */
  register<T extends PickComponent>(
    tagName: string,
    componentCtor: new (...args: unknown[]) => T,
    options?: PickElementOptions<T>,
  ): void;
}
