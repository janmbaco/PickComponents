/**
 * Implements the responsibility of providing a minimal DOM context for each pick-for row.
 *
 * @description
 * Carries the compiled element reference and manages subscriptions for cleanup.
 * When a row is removed, destroy() tears down all reactive subscriptions.
 */
import type { IDomContext } from "../../rendering/dom-context/dom-context.interface.js";
import { DomContentType } from "../../rendering/dom-context/dom-context.interface.js";
import type { Unsubscribe } from "../../reactive/signal.js";

export class ItemDomContext implements IDomContext {
  readonly contextId: string;
  private element: HTMLElement | null = null;
  private subscriptions: Unsubscribe[] = [];

  constructor(private readonly targetRoot: HTMLElement) {
    this.contextId = `pick-for-item-${Math.random().toString(36).slice(2)}`;
  }

  getElement(): HTMLElement | null {
    return this.element;
  }

  getTargetRoot(): HTMLElement {
    return this.targetRoot;
  }

  setElement(element: HTMLElement): void {
    this.element = element;
  }

  getIsRendered(): boolean {
    return Boolean(this.element);
  }

  addSubscription(subscription: Unsubscribe): void {
    this.subscriptions.push(subscription);
  }

  query(selector: string): HTMLElement | null {
    if (!selector) throw new Error("Selector is required");
    if (!this.element) return null;
    return this.element.querySelector(selector);
  }

  clearSubscriptions(): void {
    this.subscriptions.forEach((unsub) => {
      try {
        unsub();
      } catch {
        /* no-op */
      }
    });
    this.subscriptions = [];
  }

  getContentType(): DomContentType {
    return DomContentType.COMPONENT;
  }

  destroy(): void {
    this.clearSubscriptions();
    this.element = null;
  }
}
