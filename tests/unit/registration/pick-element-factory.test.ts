import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import { PickElementFactory } from "../../../src/registration/pick-element-factory.js";
import type { PickComponent } from "../../../src/core/pick-component.js";
import type { IServiceProvider } from "../../../src/providers/service-provider.interface.js";
import { IntentSignal } from "../../../src/reactive/signal.js";

/**
 * Tests for PickElementFactory responsibility.
 *
 * Covers:
 * - Constructor validation
 * - create() method validation
 * - CustomElementConstructor creation
 *
 * Note: Tests that exercise connectedCallback/disconnectedCallback require
 * a browser environment (HTMLElement) and are covered by integration tests.
 */
test.describe("PickElementFactory", () => {
  /**
   * Creates a mock service provider for testing.
   */
  function createMockServiceProvider(): IServiceProvider {
    return {
      has(): boolean {
        return true;
      },
      get<T>(): T {
        return {} as T;
      },
    };
  }

  /**
   * Creates a dummy PickComponent constructor for testing.
   */
  function createDummyComponentCtor(): new (
    ...args: unknown[]
  ) => PickComponent {
    return class DummyComponent {} as unknown as new (
      ...args: unknown[]
    ) => PickComponent;
  }

  /**
   * Constructor validation tests.
   */
  test.describe("constructor", () => {
    test("should create instance with valid service provider", () => {
      // Arrange
      const provider = createMockServiceProvider();

      // Act
      const factory = new PickElementFactory(provider);

      // Assert
      expect(factory).toBeDefined();
    });

    test("should throw error when serviceProvider is null", () => {
      // Act & Assert
      expect(() => new PickElementFactory(null as any)).toThrow(
        "Service provider is required",
      );
    });

    test("should throw error when serviceProvider is undefined", () => {
      // Act & Assert
      expect(() => new PickElementFactory(undefined as any)).toThrow(
        "Service provider is required",
      );
    });
  });

  /**
   * create() method tests.
   */
  test.describe("create()", () => {
    test("should throw error when componentCtor is null", () => {
      // Arrange
      const provider = createMockServiceProvider();
      const factory = new PickElementFactory(provider);

      // Act & Assert
      expect(() => factory.create(null as any)).toThrow(
        "Component constructor is required",
      );
    });

    test("should throw error when componentCtor is undefined", () => {
      // Arrange
      const provider = createMockServiceProvider();
      const factory = new PickElementFactory(provider);

      // Act & Assert
      expect(() => factory.create(undefined as any)).toThrow(
        "Component constructor is required",
      );
    });

    test("should return a constructor function", () => {
      // Arrange
      const original = globalThis.HTMLElement;
      globalThis.HTMLElement = class {} as any;
      try {
        const provider = createMockServiceProvider();
        const factory = new PickElementFactory(provider);
        const mockRenderEngine = {
          render: () => Promise.resolve({ cleanup: () => {} }),
        } as any;

        // Act
        const ElementClass = factory.create(createDummyComponentCtor(), {
          renderEngine: mockRenderEngine,
        });

        // Assert
        expect(typeof ElementClass).toBe("function");
      } finally {
        globalThis.HTMLElement = original;
      }
    });

    test("should return different classes for different component constructors", () => {
      // Arrange
      const original = globalThis.HTMLElement;
      globalThis.HTMLElement = class {} as any;
      try {
        const provider = createMockServiceProvider();
        const factory = new PickElementFactory(provider);
        const Ctor1 = createDummyComponentCtor();
        const Ctor2 = createDummyComponentCtor();
        const mockRenderEngine = {
          render: () => Promise.resolve({ cleanup: () => {} }),
        } as any;

        // Act
        const Class1 = factory.create(Ctor1, {
          renderEngine: mockRenderEngine,
        });
        const Class2 = factory.create(Ctor2, {
          renderEngine: mockRenderEngine,
        });

        // Assert
        expect(Class1).not.toBe(Class2);
      } finally {
        globalThis.HTMLElement = original;
      }
    });

    test("should include field-form reactive properties in observedAttributes", () => {
      // Arrange
      // Field form: Object.defineProperty(this, ...) in constructor → own enumerable property
      // This is the mechanism used by @Reactive without `accessor` keyword.
      // Only own enumerable properties appear in Object.keys() → observedAttributes.
      const original = globalThis.HTMLElement;
      globalThis.HTMLElement = class {} as any;
      try {
        const provider = createMockServiceProvider();
        const factory = new PickElementFactory(provider);

        class FieldFormComponent {
          constructor() {
            let _title = "";
            let _body = "";
            Object.defineProperty(this, "title", {
              get() {
                return _title;
              },
              set(v: string) {
                _title = v;
              },
              enumerable: true,
              configurable: true,
            });
            Object.defineProperty(this, "body", {
              get() {
                return _body;
              },
              set(v: string) {
                _body = v;
              },
              enumerable: true,
              configurable: true,
            });
          }
        }

        // Act
        const ElementClass = factory.create(
          FieldFormComponent as unknown as new (
            ...args: unknown[]
          ) => import("../../../src/core/pick-component.js").PickComponent,
          {
            renderEngine: {
              render: () => Promise.resolve({ cleanup: () => {} }),
            } as any,
          },
        );

        // Assert — observedAttributes must include both reactive props so attributeChangedCallback fires
        expect((ElementClass as any).observedAttributes).toContain("title");
        expect((ElementClass as any).observedAttributes).toContain("body");
      } finally {
        globalThis.HTMLElement = original;
      }
    });

    test("should not include intent signal fields in observedAttributes", () => {
      // Arrange
      const original = globalThis.HTMLElement;
      globalThis.HTMLElement = class {} as any;
      try {
        const provider = createMockServiceProvider();
        const factory = new PickElementFactory(provider);

        class IntentComponent {
          readonly saveRequested$ = new IntentSignal();

          constructor() {
            let _title = "";
            Object.defineProperty(this, "title", {
              get() {
                return _title;
              },
              set(v: string) {
                _title = v;
              },
              enumerable: true,
              configurable: true,
            });
          }
        }

        // Act
        const ElementClass = factory.create(
          IntentComponent as unknown as new (
            ...args: unknown[]
          ) => import("../../../src/core/pick-component.js").PickComponent,
          {
            renderEngine: {
              render: () => Promise.resolve({ cleanup: () => {} }),
            } as any,
          },
        );

        // Assert
        expect((ElementClass as any).observedAttributes).toContain("title");
        expect((ElementClass as any).observedAttributes).not.toContain(
          "saveRequested$",
        );
      } finally {
        globalThis.HTMLElement = original;
      }
    });

    test("should include legacy-mode prototype enumerable accessor props in observedAttributes", () => {
      // Arrange
      // Legacy/Babel decorator mode: @Reactive installs an enumerable getter/setter
      // on the prototype via Object.defineProperty(proto, name, { enumerable: true, get, set }).
      // PickElementFactory must also scan the prototype for such descriptors so
      // attributeChangedCallback fires when parents update child attributes.
      const original = globalThis.HTMLElement;
      globalThis.HTMLElement = class {} as any;
      try {
        const provider = createMockServiceProvider();
        const factory = new PickElementFactory(provider);

        class LegacyReactiveComponent {}
        // Mirrors exactly what @Reactive does in legacy/auto decorator mode
        Object.defineProperty(LegacyReactiveComponent.prototype, "title", {
          get() {
            return "";
          },
          set(_v: string) {},
          enumerable: true,
          configurable: true,
        });

        // Act
        const ElementClass = factory.create(
          LegacyReactiveComponent as unknown as new (
            ...args: unknown[]
          ) => import("../../../src/core/pick-component.js").PickComponent,
          {
            renderEngine: {
              render: () => Promise.resolve({ cleanup: () => {} }),
            } as any,
          },
        );

        // Assert — enumerable prototype accessor IS in observedAttributes (legacy fix)
        expect((ElementClass as any).observedAttributes).toContain("title");
      } finally {
        globalThis.HTMLElement = original;
      }
    });

    test("should include TC39 accessor-form non-enumerable prototype props in observedAttributes", () => {
      // Arrange
      // TC39 `accessor` keyword (and Babel 2023-11 compiled accessors) produce a
      // non-enumerable getter/setter pair on the prototype.  These ARE reactive
      // properties and MUST appear in observedAttributes so attributeChangedCallback fires.
      const original = globalThis.HTMLElement;
      globalThis.HTMLElement = class {} as any;
      try {
        const provider = createMockServiceProvider();
        const factory = new PickElementFactory(provider);

        class TC39AccessorComponent {}
        // Non-enumerable (TC39 accessor keyword default), but has both get AND set
        Object.defineProperty(TC39AccessorComponent.prototype, "title", {
          get() {
            return "";
          },
          set(_v: string) {},
          enumerable: false,
          configurable: true,
        });

        // Act
        const ElementClass = factory.create(
          TC39AccessorComponent as unknown as new (
            ...args: unknown[]
          ) => import("../../../src/core/pick-component.js").PickComponent,
          {
            renderEngine: {
              render: () => Promise.resolve({ cleanup: () => {} }),
            } as any,
          },
        );

        // Assert — TC39 accessor (get+set on prototype) IS in observedAttributes
        expect((ElementClass as any).observedAttributes).toContain("title");
      } finally {
        globalThis.HTMLElement = original;
      }
    });

    test("should NOT include plain getter-only prototype props in observedAttributes", () => {
      // Arrange
      // Plain computed getters (get only, no set) are NOT reactive properties
      // and must not pollute observedAttributes.
      const original = globalThis.HTMLElement;
      globalThis.HTMLElement = class {} as any;
      try {
        const provider = createMockServiceProvider();
        const factory = new PickElementFactory(provider);

        class GetterOnlyComponent {}
        Object.defineProperty(GetterOnlyComponent.prototype, "computedValue", {
          get() {
            return "derived";
          },
          enumerable: false,
          configurable: true,
        });

        // Act
        const ElementClass = factory.create(
          GetterOnlyComponent as unknown as new (
            ...args: unknown[]
          ) => import("../../../src/core/pick-component.js").PickComponent,
          {
            renderEngine: {
              render: () => Promise.resolve({ cleanup: () => {} }),
            } as any,
          },
        );

        // Assert — plain getter (no setter) is NOT in observedAttributes
        expect((ElementClass as any).observedAttributes).not.toContain(
          "computedValue",
        );
      } finally {
        globalThis.HTMLElement = original;
      }
    });

    test("should update component property when observed attribute changes", async () => {
      // Arrange — simulates the parent→child attribute update flow for composition
      const original = globalThis.HTMLElement;
      const originalMutationObserver = globalThis.MutationObserver;
      globalThis.HTMLElement = class {} as any;
      (globalThis as any).MutationObserver = class {
        observe(): void {}
        disconnect(): void {}
      };
      try {
        const provider: IServiceProvider = {
          has: () => true,
          get<T>(token: string): T {
            if (token === "IObjectRegistry") {
              return { get: () => undefined, set: () => "" } as unknown as T;
            }
            return {} as T;
          },
        };
        const factory = new PickElementFactory(provider);

        let capturedComponent: Record<string, unknown> | null = null;

        class ChildComponent {
          constructor() {
            let _title = "";
            Object.defineProperty(this, "title", {
              get() {
                return _title;
              },
              set(v: string) {
                _title = v;
              },
              enumerable: true,
              configurable: true,
            });
          }
        }

        const ElementClass = factory.create(
          ChildComponent as unknown as new (
            ...args: unknown[]
          ) => import("../../../src/core/pick-component.js").PickComponent,
          {
            renderEngine: {
              render: (opts: { component: Record<string, unknown> }) => {
                capturedComponent = opts.component;
                return Promise.resolve({ cleanup: () => {} });
              },
            } as any,
          },
        );

        const instance = new ElementClass() as HTMLElement & {
          connectedCallback(): Promise<void>;
          attributeChangedCallback(
            name: string,
            old: string | null,
            next: string | null,
          ): void;
        };
        instance.getAttribute = () => null;
        instance.setAttribute = () => {};
        instance.removeAttribute = () => {};
        Object.defineProperty(instance, "attributes", {
          value: [],
          writable: true,
          configurable: true,
        });
        instance.attachShadow = () => ({ addEventListener: () => {} }) as any;
        instance.addEventListener = () => {};
        (instance as any).tagName = "CHILD-COMPONENT";
        (globalThis as any).document = {
          documentElement: { getAttribute: () => null },
        };

        // Act — simulate connectedCallback then parent sets title attribute
        await instance.connectedCallback();
        instance.attributeChangedCallback("title", null, "Hello World");

        // Assert — the component property must be updated
        expect(capturedComponent!["title"]).toBe("Hello World");
      } finally {
        globalThis.HTMLElement = original;
        globalThis.MutationObserver = originalMutationObserver;
        delete (globalThis as any).document;
      }
    });

    test("should reuse the existing shadow root when the element reconnects", async () => {
      // Arrange
      const original = globalThis.HTMLElement;
      const originalMutationObserver = globalThis.MutationObserver;
      globalThis.HTMLElement = class {
        shadowRoot: {
          innerHTML: string;
          appendChild: () => void;
          prepend: () => void;
        } | null = null;
      } as any;
      (globalThis as any).MutationObserver = class {
        observe(): void {}
        disconnect(): void {}
      };

      try {
        const provider: IServiceProvider = {
          has: () => true,
          get<T>(token: string): T {
            if (token === "IObjectRegistry") {
              return { get: () => undefined, set: () => "" } as unknown as T;
            }

            return {} as T;
          },
        };
        const factory = new PickElementFactory(provider);
        let renderCalls = 0;

        class ReconnectComponent {}

        const ElementClass = factory.create(
          ReconnectComponent as unknown as new (
            ...args: unknown[]
          ) => import("../../../src/core/pick-component.js").PickComponent,
          {
            renderEngine: {
              render: () => {
                renderCalls++;
                return Promise.resolve({ cleanup: () => {} });
              },
            } as any,
          },
        );

        const instance = new ElementClass() as HTMLElement & {
          attachShadowCalls?: number;
          connectedCallback(): Promise<void>;
          disconnectedCallback(): void;
          shadowRoot: {
            innerHTML: string;
            appendChild: () => void;
            prepend: () => void;
          } | null;
        };
        instance.attachShadowCalls = 0;
        instance.attachShadow = () => {
          instance.attachShadowCalls = (instance.attachShadowCalls ?? 0) + 1;

          if (instance.shadowRoot) {
            throw new Error("attachShadow should not be called twice");
          }

          const shadowRoot = {
            innerHTML: "",
            appendChild: () => {},
            prepend: () => {},
          };
          instance.shadowRoot = shadowRoot;
          return shadowRoot as unknown as ShadowRoot;
        };
        instance.addEventListener = () => {};
        instance.removeEventListener = () => {};
        instance.getAttribute = () => null;
        instance.setAttribute = () => {};
        instance.removeAttribute = () => {};
        Object.defineProperty(instance, "attributes", {
          value: [],
          writable: true,
          configurable: true,
        });
        (instance as any).tagName = "RECONNECT-COMPONENT";
        (globalThis as any).document = {
          documentElement: { getAttribute: () => null },
        };

        // Act
        await instance.connectedCallback();
        instance.disconnectedCallback();
        await instance.connectedCallback();

        // Assert
        expect(instance.attachShadowCalls).toBe(1);
        expect(renderCalls).toBe(2);
      } finally {
        globalThis.HTMLElement = original;
        globalThis.MutationObserver = originalMutationObserver;
        delete (globalThis as any).document;
      }
    });

    test("should delegate pick-action events from rendered event targets under restrictive parents", async () => {
      // Arrange
      const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
      const originalDocument = globalThis.document;
      const originalElement = globalThis.Element;
      const originalHTMLElement = globalThis.HTMLElement;
      const originalCustomEvent = globalThis.CustomEvent;
      const originalCustomElements = (globalThis as any).customElements;
      const originalMutationObserver = globalThis.MutationObserver;

      (globalThis as any).document = dom.window.document;
      (globalThis as any).Element = dom.window.Element;
      (globalThis as any).HTMLElement = dom.window.HTMLElement;
      (globalThis as any).CustomEvent = dom.window.CustomEvent;
      (globalThis as any).customElements = dom.window.customElements;
      (globalThis as any).MutationObserver = dom.window.MutationObserver;

      try {
        const provider: IServiceProvider = {
          has(): boolean {
            return true;
          },
          get<T>(token: string): T {
            if (token === "IObjectRegistry") {
              return { get: () => undefined, set: () => "" } as unknown as T;
            }

            return {} as T;
          },
        };
        const factory = new PickElementFactory(provider);
        const restrictiveParent = dom.window.document.createElement("ul");
        dom.window.document.body.appendChild(restrictiveParent);
        const projectedRoot = dom.window.document.createElement("li");

        class RestrictiveActionComponent {
          static latestInstance: RestrictiveActionComponent | null = null;
          value: unknown = null;

          constructor() {
            RestrictiveActionComponent.latestInstance = this;
          }

          choose(nextValue: unknown): void {
            this.value = nextValue;
          }

          getViewActions(): Record<string, unknown> {
            return {
              choose: this.choose,
            };
          }
        }

        const ElementClass = factory.create(
          RestrictiveActionComponent as unknown as new (
            ...args: unknown[]
          ) => import("../../../src/core/pick-component.js").PickComponent,
          {
            renderEngine: {
              render: async (options: { targetRoot: HTMLElement }) => {
                expect(options.targetRoot).toBe(restrictiveParent);
                return {
                  eventTarget: projectedRoot,
                  cleanup: () => {},
                };
              },
            } as any,
          },
        );
        const selector = "restrictive-action-pick-element";
        if (!dom.window.customElements.get(selector)) {
          dom.window.customElements.define(selector, ElementClass);
        }

        const instance = dom.window.document.createElement(
          selector,
        ) as HTMLElement & {
          connectedCallback(): Promise<void>;
          disconnectedCallback(): void;
        };
        const originalConnectedCallback =
          instance.connectedCallback.bind(instance);
        let connectedPromise: Promise<void> | null = null;
        instance.connectedCallback = () => {
          connectedPromise = originalConnectedCallback();
          return connectedPromise;
        };
        Object.defineProperty(instance, "attributes", {
          value: [],
          writable: true,
          configurable: true,
        });
        restrictiveParent.appendChild(instance);

        // Act
        await (connectedPromise ?? instance.connectedCallback());
        projectedRoot.dispatchEvent(
          new dom.window.CustomEvent("pick-action", {
            bubbles: true,
            composed: true,
            detail: { action: "choose", name: "choose", value: 42 },
          }),
        );

        // Assert
        expect(RestrictiveActionComponent.latestInstance?.value).toBe(42);

        instance.disconnectedCallback();
      } finally {
        globalThis.document = originalDocument;
        globalThis.Element = originalElement;
        globalThis.HTMLElement = originalHTMLElement;
        globalThis.CustomEvent = originalCustomEvent;
        globalThis.MutationObserver = originalMutationObserver;
        (globalThis as any).customElements = originalCustomElements;
      }
    });

    test("should stop handled pick-action propagation unless bubble is explicit", async () => {
      // Arrange
      const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
      const originalDocument = globalThis.document;
      const originalElement = globalThis.Element;
      const originalHTMLElement = globalThis.HTMLElement;
      const originalCustomEvent = globalThis.CustomEvent;
      const originalCustomElements = (globalThis as any).customElements;
      const originalMutationObserver = globalThis.MutationObserver;

      (globalThis as any).document = dom.window.document;
      (globalThis as any).Element = dom.window.Element;
      (globalThis as any).HTMLElement = dom.window.HTMLElement;
      (globalThis as any).CustomEvent = dom.window.CustomEvent;
      (globalThis as any).customElements = dom.window.customElements;
      (globalThis as any).MutationObserver = dom.window.MutationObserver;

      try {
        const provider: IServiceProvider = {
          has(): boolean {
            return true;
          },
          get<T>(token: string): T {
            if (token === "IObjectRegistry") {
              return { get: () => undefined, set: () => "" } as unknown as T;
            }

            return {} as T;
          },
        };
        const factory = new PickElementFactory(provider);
        const eventTarget = dom.window.document.createElement("section");
        dom.window.document.body.appendChild(eventTarget);

        class ActionComponent {
          static latestInstance: ActionComponent | null = null;
          calls = 0;

          constructor() {
            ActionComponent.latestInstance = this;
          }

          getViewActions(): Record<string, unknown> {
            return {
              save: () => {
                this.calls++;
              },
            };
          }
        }

        const ElementClass = factory.create(
          ActionComponent as unknown as new (
            ...args: unknown[]
          ) => import("../../../src/core/pick-component.js").PickComponent,
          {
            renderEngine: {
              render: async () => ({
                eventTarget,
                cleanup: () => {},
              }),
            } as any,
          },
        );
        const selector = "action-propagation-pick-element";
        if (!dom.window.customElements.get(selector)) {
          dom.window.customElements.define(selector, ElementClass);
        }

        const instance = dom.window.document.createElement(
          selector,
        ) as HTMLElement & {
          connectedCallback(): Promise<void>;
          disconnectedCallback(): void;
        };
        Object.defineProperty(instance, "attributes", {
          value: [],
          writable: true,
          configurable: true,
        });
        dom.window.document.body.appendChild(instance);
        await instance.connectedCallback();

        let documentEvents = 0;
        dom.window.document.addEventListener("pick-action", () => {
          documentEvents++;
        });

        // Act
        eventTarget.dispatchEvent(
          new dom.window.CustomEvent("pick-action", {
            bubbles: true,
            composed: true,
            detail: { action: "save", name: "save" },
          }),
        );
        eventTarget.dispatchEvent(
          new dom.window.CustomEvent("pick-action", {
            bubbles: true,
            composed: true,
            detail: { action: "save", name: "save", bubble: true },
          }),
        );

        // Assert
        expect(ActionComponent.latestInstance?.calls).toBe(2);
        expect(documentEvents).toBe(1);

        instance.disconnectedCallback();
      } finally {
        globalThis.document = originalDocument;
        globalThis.Element = originalElement;
        globalThis.HTMLElement = originalHTMLElement;
        globalThis.CustomEvent = originalCustomEvent;
        globalThis.MutationObserver = originalMutationObserver;
        (globalThis as any).customElements = originalCustomElements;
      }
    });
  });
});
