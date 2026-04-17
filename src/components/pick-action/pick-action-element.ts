/**
 * Implements the responsibility of dispatching pick action events from a lightweight host.
 *
 * @description
 * Pure custom element that wires click and keyboard events on its host to dispatch
 * a bubbling CustomEvent('pick-action'). Does not use the PickComponent rendering
 * pipeline — no template compilation, no reactive bindings, no lifecycle manager.
 *
 * The parent component's template compiler resolves [[CONSTANT]] and {{reactive}}
 * bindings before pick-action's connectedCallback fires, so attribute values are
 * already resolved strings or ObjectRegistry IDs for object values.
 *
 * @example
 * ```html
 * <pick-action action="addToCart" value="{{product}}">
 *   <button>Add to Cart</button>
 * </pick-action>
 * ```
 */
import { Services } from "../../providers/service-provider.js";
import type { ITransparentHost } from "../../rendering/managed-host/transparent-host.interface.js";
import type { ITransparentHostFactory } from "../../rendering/managed-host/transparent-host-factory.interface.js";
import type { IObjectRegistry } from "../../utils/object-registry.js";

export interface PickActionEventDetail<TValue = unknown> {
  action: string;
  name: string;
  value?: TValue;
  bubble: boolean;
}

export type PickActionEvent<TValue = unknown> = CustomEvent<
  PickActionEventDetail<TValue>
>;

export type PickViewAction<TValue = unknown> = (
  value: TValue,
  event: PickActionEvent<TValue>,
) => void | Promise<void>;

export interface PickViewActions {
  [action: string]: PickViewAction;
}

export class PickActionElement extends HTMLElement {
  private eventListeners: Array<{
    target: EventTarget;
    event: string;
    handler: EventListener;
  }> = [];
  private objectRegistry: IObjectRegistry | null = null;
  private transparentHost: ITransparentHost | null = null;
  private renderedNodes: Node[] = [];

  static get observedAttributes(): string[] {
    return ["action", "event", "value", "bubble"];
  }

  connectedCallback(): void {
    this.eventListeners = [];
    this.objectRegistry = Services.get<IObjectRegistry>("IObjectRegistry");
    this.transparentHost = Services.get<ITransparentHostFactory>(
      "ITransparentHostFactory",
    ).create(this, "pick-action-anchor");
    this.transparentHost.connect();
    this.renderedNodes = this.renderContent();

    const topLevelElements = this.getTopLevelElements();
    const hasFocusableChild = this.hasFocusableDescendant(topLevelElements);

    if (this.transparentHost.isTransparent) {
      topLevelElements.forEach((element) => {
        this.bindClickTarget(element);
      });
    } else {
      this.bindClickTarget(this);
    }

    if (!hasFocusableChild) {
      this.bindKeyboardTarget(topLevelElements);
    }
  }

  disconnectedCallback(): void {
    this.eventListeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    this.eventListeners = [];
    this.restoreRenderedNodesToHost();
    this.renderedNodes = [];
    this.transparentHost?.disconnect();
    this.transparentHost = null;
    this.objectRegistry = null;
  }

  private handleClick(event: MouseEvent): void {
    if (event.defaultPrevented) {
      return;
    }

    if (this.hasAttribute("disabled")) {
      return;
    }

    const target = event.target;
    if (this.isDisabledControl(target)) {
      return;
    }

    const dispatchTarget =
      event.currentTarget instanceof EventTarget ? event.currentTarget : this;
    this.dispatchAction(dispatchTarget);
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented) {
      return;
    }

    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const dispatchTarget =
        event.currentTarget instanceof EventTarget ? event.currentTarget : this;
      this.dispatchAction(dispatchTarget);
    }
  }

  private dispatchAction(dispatchTarget: EventTarget): void {
    const action = this.resolveActionName();
    if (!action) {
      return;
    }

    const value = this.resolveActionValue();

    const detail: PickActionEventDetail = {
      action,
      name: action,
      bubble: this.hasAttribute("bubble"),
    };
    if (value !== undefined) {
      detail.value = value;
    }

    const actionEvent = new CustomEvent("pick-action", {
      bubbles: true,
      composed: true,
      detail,
    });

    dispatchTarget.dispatchEvent(actionEvent);
  }

  private resolveActionName(): string | null {
    const attrValue = this.getAttribute("action") ?? this.getAttribute("event");
    if (attrValue && attrValue.length > 0) {
      const registryValue = this.objectRegistry!.get<unknown>(attrValue);
      if (typeof registryValue === "string" && registryValue.length > 0) {
        return registryValue;
      }
      return attrValue;
    }

    return null;
  }

  private resolveActionValue(): unknown {
    const attrValue = this.getAttribute("value");
    if (attrValue !== null) {
      const registryValue = this.objectRegistry!.get<unknown>(attrValue);
      if (registryValue !== undefined) {
        return registryValue;
      }
      return attrValue;
    }

    return undefined;
  }

  private renderContent(): Node[] {
    if (!this.transparentHost) {
      throw new Error("TransparentHost is required");
    }

    if (!this.transparentHost.isTransparent) {
      return Array.from(this.childNodes);
    }

    const renderedNodes = Array.from(this.childNodes);
    renderedNodes.forEach((node) => {
      this.transparentHost?.insert(node);
    });
    return renderedNodes;
  }

  private restoreRenderedNodesToHost(): void {
    for (const node of this.renderedNodes) {
      this.appendChild(node);
    }
  }

  private getTopLevelElements(): HTMLElement[] {
    return this.renderedNodes.filter((node): node is HTMLElement => {
      return node instanceof HTMLElement;
    });
  }

  private hasFocusableDescendant(elements: readonly HTMLElement[]): boolean {
    const focusableSelector =
      "button, a[href], input, select, textarea, [tabindex]";
    const topLevelMatch = elements.some((element) =>
      element.matches(focusableSelector),
    );
    const descendantMatch = elements.some((element) =>
      Boolean(element.querySelector(focusableSelector)),
    );
    return topLevelMatch || descendantMatch;
  }

  private bindClickTarget(target: HTMLElement): void {
    const clickHandler = (event: MouseEvent) => {
      this.handleClick(event);
    };
    target.addEventListener("click", clickHandler);
    this.eventListeners.push({
      target,
      event: "click",
      handler: clickHandler as EventListener,
    });
  }

  private bindKeyboardTarget(topLevelElements: readonly HTMLElement[]): void {
    const keyboardTarget = topLevelElements[0] ?? this;

    if (!keyboardTarget.hasAttribute("role")) {
      keyboardTarget.setAttribute("role", "button");
    }
    if (!keyboardTarget.hasAttribute("tabindex")) {
      keyboardTarget.setAttribute("tabindex", "0");
    }

    const keydownHandler = (event: KeyboardEvent) => {
      this.handleKeydown(event);
    };
    keyboardTarget.addEventListener("keydown", keydownHandler);
    this.eventListeners.push({
      target: keyboardTarget,
      event: "keydown",
      handler: keydownHandler as EventListener,
    });
  }

  private isDisabledControl(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) {
      return false;
    }

    const tagName = target.tagName.toLowerCase();
    if (
      tagName === "button" ||
      tagName === "input" ||
      tagName === "select" ||
      tagName === "textarea"
    ) {
      return Boolean((target as unknown as Record<string, unknown>).disabled);
    }

    if (target.hasAttribute("disabled")) {
      return true;
    }

    return false;
  }
}
