import type { PickComponent } from "../core/pick-component.js";
import type { IServiceRegistry } from "../providers/service-provider.interface.js";
import type { PickElementOptions } from "./pick-element-factory.js";
import type { IPickElementRegistrar } from "./pick-element-registrar.interface.js";
import type { IPickElementFactory } from "./pick-element-factory.interface.js";

/**
 * Implements the responsibility of registering Pick Components as native custom elements.
 *
 * @example
 * ```typescript
 * const registrar = new PickElementRegistrar(serviceRegistry, elementFactory);
 * registrar.register('my-counter', CounterComponent);
 * ```
 */
export class PickElementRegistrar implements IPickElementRegistrar {
  private readonly elementFactory: IPickElementFactory;

  /**
   * Initializes a new instance of PickElementRegistrar.
   *
   * @param _serviceRegistry - Registry for resolving and registering services (reserved for future use)
   * @param elementFactory - Factory for creating CustomElementConstructor classes
   * @throws Error if serviceRegistry or elementFactory are null or undefined
   */
  constructor(
    _serviceRegistry: IServiceRegistry,
    elementFactory: IPickElementFactory,
  ) {
    if (!_serviceRegistry) throw new Error("Service registry is required");
    if (!elementFactory) throw new Error("Element factory is required");

    this.elementFactory = elementFactory;
  }

  /**
   * Registers a PickComponent as a native custom element.
   *
   * @param tagName - HTML tag name for the element (e.g. 'my-component')
   * @param componentCtor - Constructor of the PickComponent to register
   * @param options - Optional configuration: lifecycle, initializer, shadow DOM, render engine
   * @throws Error if tagName or componentCtor are null or undefined
   *
   * @example
   * ```typescript
   * const registrar = new PickElementRegistrar(serviceRegistry);
   * registrar.register('my-counter', CounterComponent);
   * ```
   */
  register<T extends PickComponent>(
    tagName: string,
    componentCtor: new (...args: unknown[]) => T,
    options?: PickElementOptions<T>,
  ): void {
    if (!tagName) throw new Error("Tag name is required");
    if (!componentCtor) throw new Error("Component constructor is required");

    const normalizedTag = tagName.toLowerCase();

    if (typeof customElements === "undefined") {
      return;
    }

    if (customElements.get(normalizedTag)) {
      return;
    }

    const PickElementClass = this.elementFactory.create(
      componentCtor,
      options,
    );
    customElements.define(normalizedTag, PickElementClass);
  }
}
