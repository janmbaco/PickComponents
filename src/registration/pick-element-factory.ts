import { PickComponent } from "../core/pick-component.js";
import type { RenderResult } from "../rendering/index.js";
import type { IRenderEngine } from "../rendering/index.js";
import type { IServiceProvider } from "../providers/service-provider.interface.js";
import type { IObjectRegistry } from "../utils/object-registry.js";
import { IntentSignal } from "../reactive/signal.js";
import type {
  InitializerFactory,
  LifecycleFactory,
} from "../core/component-metadata.js";
import type { IPickElementFactory } from "./pick-element-factory.interface.js";
import { getRestrictiveParentElement } from "../rendering/dom/restrictive-html-context.js";
import type {
  PickActionEvent,
  PickActionEventDetail,
  PickViewAction,
  PickViewActions,
} from "../components/pick-action/pick-action-element.js";
import { ensureReactiveProperties } from "../decorators/reactive.decorator.js";

/**
 * Defines the responsibility of configuring a pick element registration.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface PickElementOptions<
  _T extends PickComponent = PickComponent,
> {
  /** Factory function that creates the component initializer */
  initializer?: InitializerFactory;
  /** Factory function that creates the lifecycle manager */
  lifecycle?: LifecycleFactory;
  /** Custom render engine instance (defaults to container-resolved IRenderEngine) */
  renderEngine?: IRenderEngine;
}

/**
 * Implements the responsibility of creating CustomElementConstructor classes for Pick Components.
 *
 * @example
 * ```typescript
 * const factory = new PickElementFactory(serviceProvider);
 * const ElementClass = factory.create(CounterComponent);
 * customElements.define('my-counter', ElementClass);
 * ```
 */
export class PickElementFactory implements IPickElementFactory {
  private readonly serviceProvider: IServiceProvider;

  /**
   * Initializes a new instance of PickElementFactory.
   *
   * @param serviceProvider - Service provider for resolving dependencies
   * @throws Error if serviceProvider is null or undefined
   */
  constructor(serviceProvider: IServiceProvider) {
    if (!serviceProvider) throw new Error("Service provider is required");

    this.serviceProvider = serviceProvider;
  }

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
  ): CustomElementConstructor {
    if (!componentCtor) throw new Error("Component constructor is required");

    const { renderEngine } = options ?? {};
    const engine =
      renderEngine || this.serviceProvider.get<IRenderEngine>("IRenderEngine");
    const objectRegistry =
      this.serviceProvider.get<IObjectRegistry>("IObjectRegistry");

    // Collect reactive props from both the instance (TC39 field form) and the
    // prototype (TC39 accessor form and legacy/Babel decorator mode).
    // Only accessors with BOTH get AND set are picked from the prototype
    // to avoid capturing plain getters (which lack a setter) or methods.
    const instance = new componentCtor();
    ensureReactiveProperties(instance);
    const instanceProps = Object.keys(instance).filter(
      (key) =>
        !key.startsWith("_") &&
        !((instance as Record<string, unknown>)[key] instanceof IntentSignal),
    );
    const proto = Object.getPrototypeOf(instance) as object | null;
    const protoProps = proto
      ? Object.entries(Object.getOwnPropertyDescriptors(proto))
          .filter(
            ([key, desc]) =>
              !key.startsWith("_") &&
              key !== "constructor" &&
              typeof desc.get === "function" &&
              typeof desc.set === "function",
          )
          .map(([key]) => key)
      : [];
    const observableProps = [...new Set([...instanceProps, ...protoProps])];

    const syncHostThemeAttribute = (host: HTMLElement): void => {
      const docTheme = document.documentElement.getAttribute("data-theme");
      if (docTheme) {
        host.setAttribute("data-theme", docTheme);
        return;
      }

      host.removeAttribute("data-theme");
    };

    return class PickElement extends HTMLElement {
      private component: T | null = null;
      private renderResult: RenderResult | null = null;
      private pickActionTarget: EventTarget | null = null;
      private themeObserver: MutationObserver | null = null;

      static get observedAttributes(): string[] {
        return observableProps;
      }

      private handlePickAction = (event: Event): void => {
        if (!this.component) return;
        const originalTarget = event.composedPath()[0];
        if (originalTarget === this) return;

        const customEvent = event as CustomEvent<
          Partial<PickActionEventDetail>
        >;
        const detail = customEvent.detail;
        const nameCandidate = detail?.action ?? detail?.name;

        if (typeof nameCandidate !== "string" || nameCandidate.length === 0) {
          return;
        }

        const value = detail?.value;
        const allowBubble = detail?.bubble === true;
        let handled = false;

        const maybeGetViewActions = (
          this.component as unknown as {
            getViewActions?: () => PickViewActions;
          }
        ).getViewActions;
        if (typeof maybeGetViewActions === "function") {
          const actions = maybeGetViewActions.call(this.component);
          const candidate = actions?.[nameCandidate];
          if (typeof candidate === "function") {
            (candidate as PickViewAction).call(
              this.component,
              value,
              event as PickActionEvent,
            );
            handled = true;
          }
        } else if (nameCandidate in this.component) {
          const candidate = (this.component as Record<string, unknown>)[
            nameCandidate
          ];
          if (typeof candidate === "function") {
            (candidate as PickViewAction).call(
              this.component,
              value,
              event as PickActionEvent,
            );
            handled = true;
          }
        }

        if (handled) {
          if (!allowBubble) {
            event.stopPropagation();
          }
          return;
        }

        if (!allowBubble) {
          event.stopPropagation();
          console.warn(
            `[pick-action] Unknown action "${nameCandidate}" on <${this.tagName.toLowerCase()}>. ` +
              "Define it in getViewActions() or ctx.on(), or add the bubble attribute to let a parent handle it.",
          );
        }
      };

      async connectedCallback(): Promise<void> {
        if (this.component) {
          return;
        }

        this.component = new componentCtor();
        ensureReactiveProperties(this.component);

        const component = this.component;
        Array.from(this.attributes).forEach((attr) => {
          const propName = attr.name;
          if (propName in component) {
            const fromRegistry = objectRegistry.get(attr.value);
            (component as Record<string, unknown>)[propName] =
              fromRegistry !== undefined ? fromRegistry : attr.value;
          }
        });

        const componentId = this.tagName.toLowerCase();
        const restrictiveParent = getRestrictiveParentElement(this);
        const targetRoot =
          restrictiveParent ??
          this.shadowRoot ??
          this.attachShadow({ mode: "open" });

        // Mirror the document-level theme into the host so Shadow DOM styles
        // that branch on :host([data-theme=...]) stay aligned after theme changes.
        syncHostThemeAttribute(this);
        this.themeObserver = new MutationObserver(() => {
          syncHostThemeAttribute(this);
        });
        this.themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-theme"],
        });

        try {
          const result = await engine.render({
            componentId,
            component: this.component,
            targetRoot,
            hostElement: this,
          });
          this.renderResult = result;
        } catch (error) {
          this.component = null;
          throw error;
        }

        this.pickActionTarget = this.renderResult.eventTarget ?? this;
        this.pickActionTarget.addEventListener(
          "pick-action",
          this.handlePickAction,
        );
      }

      attributeChangedCallback(
        name: string,
        _oldValue: string | null,
        newValue: string | null,
      ): void {
        if (!this.component || newValue === null) return;

        if (name in this.component) {
          const resolved = objectRegistry.get(newValue);
          (this.component as Record<string, unknown>)[name] =
            resolved !== undefined ? resolved : newValue;
        }
      }

      disconnectedCallback(): void {
        this.pickActionTarget?.removeEventListener(
          "pick-action",
          this.handlePickAction,
        );
        this.pickActionTarget = null;

        this.themeObserver?.disconnect();
        this.themeObserver = null;

        if (this.renderResult) {
          this.renderResult.cleanup();
          this.renderResult = null;
        }

        this.component = null;
      }
    };
  }
}
