import { PickComponent } from "../../core/pick-component.js";
import { IExpressionResolver } from "./expression-resolver.interface.js";
import { IPropertyExtractor } from "./property-extractor.interface.js";
import { IManagedElementResolver } from "../managed-host/managed-element-resolver.interface.js";
import { NodeType } from "../dom/node-types.js";
import { Unsubscribe } from "../../reactive/signal.js";
import type { IDependencyTracker } from "../../reactive/dependency-tracker.interface.js";
import type { IObjectRegistry } from "../../utils/object-registry.js";
import {
  defaultAttributeBindingPolicy,
  type IAttributeBindingPolicy,
} from "../templates/attribute-binding-policy.js";

/**
 * Defines the responsibility of managing reactive state bindings in DOM elements.
 */
export interface IBindingResolver {
  /**
   * Binds reactive state to a DOM element and its children.
   *
   * @param element - Root element to bind reactively
   * @param component - Component instance providing state observables
   * @param bindingTarget - Target for managing subscriptions (e.g., DomContext)
   * @throws Error if element or component are null/undefined
   */
  bindElement(
    element: Element,
    component: PickComponent,
    bindingTarget: { addSubscription(subscription: Unsubscribe): void },
  ): void;
}

/**
 * Defines the set of HTML boolean attributes whose presence (not value) determines state.
 * For these attributes, the binding resolver toggles attribute presence
 * and syncs the corresponding DOM property instead of setting a string value.
 */
const BOOLEAN_ATTRIBUTES: ReadonlySet<string> = new Set([
  "checked",
  "disabled",
  "selected",
  "readonly",
  "required",
  "hidden",
  "multiple",
  "open",
  "autofocus",
  "autoplay",
  "controls",
  "loop",
  "muted",
  "novalidate",
]);

/**
 * Implements the responsibility of managing reactive state bindings and subscriptions.
 */
export class BindingResolver implements IBindingResolver {
  private readonly expressionResolver: IExpressionResolver;
  private readonly propertyExtractor: IPropertyExtractor;
  private readonly managedElementResolver: IManagedElementResolver;
  private readonly dependencyTracker: IDependencyTracker;
  private readonly objectRegistry: IObjectRegistry;

  /**
   * Creates a BindingResolver instance.
   *
   * @param expressionResolver - Resolver for {{expression}} evaluation
   * @param propertyExtractor - Extractor for property dependencies from templates
   * @param managedElementResolver - Resolver for managed element detection
   * @param dependencyTracker - Tracker for reactive property access discovery
   * @param objectRegistry - Registry for object reference management
   */
  constructor(
    expressionResolver: IExpressionResolver,
    propertyExtractor: IPropertyExtractor,
    managedElementResolver: IManagedElementResolver,
    dependencyTracker: IDependencyTracker,
    objectRegistry: IObjectRegistry,
    private readonly attributePolicy: IAttributeBindingPolicy = defaultAttributeBindingPolicy,
  ) {
    if (!expressionResolver) throw new Error("ExpressionResolver is required");
    if (!propertyExtractor) throw new Error("PropertyExtractor is required");
    if (!managedElementResolver)
      throw new Error("ManagedElementResolver is required");
    if (!dependencyTracker) throw new Error("DependencyTracker is required");
    if (!objectRegistry) throw new Error("ObjectRegistry is required");
    if (!attributePolicy) throw new Error("AttributeBindingPolicy is required");

    this.expressionResolver = expressionResolver;
    this.propertyExtractor = propertyExtractor;
    this.managedElementResolver = managedElementResolver;
    this.dependencyTracker = dependencyTracker;
    this.objectRegistry = objectRegistry;
  }

  /**
   * Binds reactive state to a DOM element and its children.
   *
   * @param element - Element to compile (recursively processes children)
   * @param component - Component instance for state binding
   * @param bindingTarget - DOM context for subscription management
   * @throws Error if element, component, or bindingTarget are null/undefined
   */
  bindElement(
    element: Element,
    component: PickComponent,
    bindingTarget: { addSubscription(subscription: Unsubscribe): void },
  ): void {
    if (!element) throw new Error("Element is required");
    if (!component) throw new Error("Component is required");
    if (!bindingTarget) throw new Error("Binding target is required");

    for (const attr of Array.from(element.attributes)) {
      if (attr.name === "data-preset-template") {
        continue;
      }

      if (attr.value && attr.value.includes("{{")) {
        this.bindAttribute(attr, component, bindingTarget);
      }
    }

    if (this.managedElementResolver.isManagedElement(element)) {
      return;
    }

    for (const child of Array.from(element.children)) {
      this.bindElement(child, component, bindingTarget);
    }

    for (const node of Array.from(element.childNodes)) {
      if (
        node.nodeType === NodeType.TEXT_NODE &&
        node.textContent &&
        node.textContent.includes("{{")
      ) {
        this.bindTextNode(node, component, bindingTarget);
      }
    }
  }

  /**
   * Binds attribute value to component state.
   *
   * @param attr - Attribute to bind (e.g., class="{{status}}")
   * @param component - Component instance for property access
   * @param bindingTarget - DOM context for subscription management
   */
  private bindAttribute(
    attr: Attr,
    component: PickComponent,
    bindingTarget: { addSubscription(subscription: Unsubscribe): void },
  ): void {
    const originalValue = attr.value;
    const attrName = attr.name;
    const ownerElement = attr.ownerElement as HTMLElement | null;
    const usedProps = this.propertyExtractor.extract(originalValue);

    if (usedProps.length === 0) return;
    if (!ownerElement) return;

    if (!this.attributePolicy.canBindAttribute(attrName)) {
      ownerElement.removeAttribute(attrName);
      return;
    }

    const isBooleanAttr = BOOLEAN_ATTRIBUTES.has(attrName);

    const updateAttr = () => {
      const isSimpleBinding = /^\{\{\s*[\w$.]+\s*\}\}$/.test(originalValue);

      if (isSimpleBinding && usedProps.length === 1) {
        // Extract full dotted path from the expression (not just root property from usedProps)
        // e.g. "{{$item.items}}" → fullPath = "$item.items", parts = ["$item", "items"]
        const exprMatch = /^\{\{\s*([\w$.]+)\s*\}\}$/.exec(originalValue);
        const fullPath = exprMatch ? exprMatch[1] : usedProps[0];

        let value: unknown = component;
        const parts = fullPath.split(".");
        let valid = true;

        for (const part of parts) {
          if (value === null || value === undefined) {
            valid = false;
            break;
          }
          value = (value as Record<string, unknown>)[part];
        }

        if (
          valid &&
          value !== null &&
          value !== undefined &&
          (Array.isArray(value) || typeof value === "object")
        ) {
          if (!this.attributePolicy.allowsObjectBinding(attrName)) {
            ownerElement.removeAttribute(attrName);
            return;
          }

          const objectId = this.objectRegistry.set(value);
          ownerElement.setAttribute(attrName, objectId);
          return;
        }
      }

      const resolved = this.expressionResolver.resolve(
        originalValue,
        component,
      );
      const safeResolved = this.attributePolicy.sanitizeResolvedValue(
        attrName,
        resolved,
        ownerElement,
      );

      if (safeResolved === null) {
        ownerElement.removeAttribute(attrName);
        return;
      }

      if (isBooleanAttr) {
        const isTruthy =
          safeResolved !== "" &&
          safeResolved !== "false" &&
          safeResolved !== "null" &&
          safeResolved !== "undefined";
        if (isTruthy) {
          ownerElement.setAttribute(attrName, "");
        } else {
          ownerElement.removeAttribute(attrName);
        }
        if (attrName in ownerElement) {
          (ownerElement as unknown as Record<string, unknown>)[attrName] =
            isTruthy;
        }
      } else {
        ownerElement.setAttribute(attrName, safeResolved);
      }
    };

    updateAttr();

    for (const prop of usedProps) {
      this.subscribeWithComputedSupport(
        prop,
        component,
        bindingTarget,
        updateAttr,
      );
    }
  }

  /**
   * Binds text node to component state.
   *
   * @param node - Text node to bind (e.g., "Count: {{count}}")
   * @param component - Component instance for property access
   * @param bindingTarget - DOM context for subscription management
   */
  private bindTextNode(
    node: Node,
    component: PickComponent,
    bindingTarget: { addSubscription(subscription: Unsubscribe): void },
  ): void {
    const originalText = node.textContent || "";
    const usedProps = this.propertyExtractor.extract(originalText);

    if (usedProps.length === 0) return;

    const updateText = () => {
      node.textContent = this.expressionResolver.resolve(
        originalText,
        component,
      );
    };

    updateText();

    for (const prop of usedProps) {
      this.subscribeWithComputedSupport(
        prop,
        component,
        bindingTarget,
        updateText,
      );
    }
  }

  /**
   * Subscribes to a property's observable, with automatic computed-getter support.
   *
   * @description
   * If the property is a plain getter (not a @Reactive state property), discovers which
   * @Reactive properties it reads and subscribes the update callback to those instead.
   * This enables {{icon}} to update when this.mode changes, even though 'icon' is
   * a plain getter that derives from the @Reactive 'mode' property.
   *
   * @param prop - Property name from the template expression
   * @param component - Component instance
   * @param bindingTarget - DOM context for subscription management
   * @param updateCallback - Callback to invoke when the property value changes
   */
  private subscribeWithComputedSupport(
    prop: string,
    component: PickComponent,
    bindingTarget: { addSubscription(subscription: Unsubscribe): void },
    updateCallback: () => void,
  ): void {
    const descriptor = this.getPropertyDescriptor(component, prop);
    const isPlainGetter =
      descriptor !== undefined &&
      typeof descriptor.get === "function" &&
      descriptor.set === undefined;

    if (isPlainGetter) {
      const reactiveDeps = this.dependencyTracker.discoverDependencies(() => {
        void (component as unknown as Record<string, unknown>)[prop];
      });

      if (reactiveDeps.length > 0) {
        for (const dep of reactiveDeps) {
          const depObs = component.getPropertyObservable(dep);
          const unsubscribe = depObs.subscribe(updateCallback);
          bindingTarget.addSubscription(unsubscribe);
        }
        return;
      }
    }

    const propertyObs = component.getPropertyObservable(prop);
    const unsubscribe = propertyObs.subscribe(updateCallback);
    bindingTarget.addSubscription(unsubscribe);
  }

  /**
   * Walks the prototype chain to find a property descriptor.
   */
  private getPropertyDescriptor(
    obj: object,
    prop: string,
  ): PropertyDescriptor | undefined {
    let current: object | null = obj;
    while (current) {
      const descriptor = Object.getOwnPropertyDescriptor(current, prop);
      if (descriptor) {
        return descriptor;
      }
      current = Object.getPrototypeOf(current);
    }
    return undefined;
  }
}
