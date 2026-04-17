import { PickComponent } from "../../src/core/pick-component.js";

/**
 * Concrete test implementation of PickComponent.
 * PickComponent is abstract, so we need a concrete class for testing.
 */
class TestPickComponent extends PickComponent {
  // Concrete implementation for testing
}

/**
 * TestComponent with specific name for selector-based CSS class matching.
 * TemplateCompiler uses constructor.name.toLowerCase() as selector.
 */
export class TestComponent extends PickComponent {}

/**
 * Mother Object for creating PickComponent test instances.
 * Provides pre-configured components for different testing scenarios.
 *
 * @description
 * Implements the Mother Object pattern for component instantiation.
 * Creates mock components with predictable behavior for testing.
 */
export class ComponentMother {
  /**
   * Creates a minimal component with no properties.
   *
   * @returns Basic PickComponent instance
   */
  static minimal(): PickComponent {
    return new TestPickComponent();
  }

  /**
   * Creates a component with a single reactive property.
   *
   * @param propertyName - Name of the reactive property
   * @param initialValue - Initial value for the property
   * @returns Component with reactive property
   */
  static withProperty(
    propertyName = "value",
    initialValue: any = "",
  ): PickComponent {
    const component = new TestPickComponent();
    let value = initialValue;

    Object.defineProperty(component, propertyName, {
      get() {
        return value;
      },
      set(newValue) {
        if (value !== newValue) {
          value = newValue;
          if (typeof component.getPropertyObservable === "function") {
            component.getPropertyObservable(propertyName).next();
          }
        }
      },
      enumerable: true,
      configurable: true,
    });

    return component;
  }

  /**
   * Creates a component with multiple reactive properties.
   *
   * @param properties - Record of property names and initial values
   * @returns Component with multiple reactive properties
   */
  static withProperties(properties: Record<string, any>): PickComponent {
    const component = new TestPickComponent();

    Object.keys(properties).forEach((propName) => {
      let value = properties[propName];

      Object.defineProperty(component, propName, {
        get() {
          return value;
        },
        set(newValue) {
          if (value !== newValue) {
            value = newValue;
            if (typeof component.getPropertyObservable === "function") {
              component.getPropertyObservable(propName).next();
            }
          }
        },
        enumerable: true,
        configurable: true,
      });
    });

    return component;
  }

  /**
   * Creates a component with lifecycle hooks tracking.
   * Useful for verifying lifecycle method calls.
   *
   * @returns Component with lifecycle tracking
   */
  static withLifecycleTracking(): PickComponent & {
    lifecycleCalls: string[];
  } {
    const component = new TestPickComponent() as any;
    component.lifecycleCalls = [];

    const originalOnRenderComplete =
      component.onRenderComplete?.bind(component);
    component.onRenderComplete = function () {
      component.lifecycleCalls.push("onRenderComplete");
      if (originalOnRenderComplete) {
        originalOnRenderComplete();
      }
    };

    const originalOnDestroy = component.onDestroy?.bind(component);
    component.onDestroy = function () {
      component.lifecycleCalls.push("onDestroy");
      if (originalOnDestroy) {
        originalOnDestroy();
      }
    };

    return component;
  }

  /**
   * Creates a component with a method.
   *
   * @param methodName - Name of the method
   * @param methodImpl - Method implementation
   * @returns Component with custom method
   */
  static withMethod(methodName: string, methodImpl: Function): PickComponent {
    const component = new TestPickComponent();
    (component as any)[methodName] = methodImpl.bind(component);
    return component;
  }

  /**
   * Creates a spy component that tracks all property accesses and mutations.
   *
   * @returns Component with access tracking
   */
  static spy(): PickComponent & {
    accessLog: Array<{ type: "get" | "set"; property: string; value?: any }>;
  } {
    const component = new TestPickComponent() as any;
    component.accessLog = [];

    const properties = ["value", "count", "text", "items"];

    properties.forEach((propName) => {
      let value: any;

      Object.defineProperty(component, propName, {
        get() {
          component.accessLog.push({ type: "get", property: propName });
          return value;
        },
        set(newValue) {
          component.accessLog.push({
            type: "set",
            property: propName,
            value: newValue,
          });
          value = newValue;
          if (typeof component.getPropertyObservable === "function") {
            component.getPropertyObservable(propName).next();
          }
        },
        enumerable: true,
        configurable: true,
      });
    });

    return component;
  }

  /**
   * Creates a list of component instances for bulk testing.
   *
   * @param count - Number of instances to create
   * @returns Array of PickComponent instances
   */
  static list(count: number): PickComponent[] {
    return Array.from({ length: count }, () => new TestPickComponent());
  }

  /**
   * Creates a component with specific class name for selector matching.
   * TemplateCompiler uses constructor.name.toLowerCase() as CSS selector.
   *
   * @param properties - Record of property names and initial values
   * @returns TestComponent instance with properties
   */
  static forTemplateCompiler(
    properties: Record<string, any> = {},
  ): PickComponent {
    const component = new TestComponent();
    return Object.assign(component, properties);
  }
}
