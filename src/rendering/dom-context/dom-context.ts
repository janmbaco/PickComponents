import type { Unsubscribe } from "../../reactive/signal.js";
import type { ITransparentHost } from "../managed-host/transparent-host.interface.js";
import { IDomContext, DomContentType } from "./dom-context.interface.js";

/**
 * Implements the responsibility of managing DOM representation and subscriptions.
 * Separates component logic from DOM manipulation.
 *
 * @description
 * Pure View utility that manages:
 * - DOM root element reference
 * - Teardown callback lifecycle (composite pattern)
 * - Query operations on rendered DOM
 * - Unique context identification
 *
 * Component-agnostic - does not hold component references.
 *
 * @example
 * ```typescript
 * const domContext = new DomContext(document.body);
 * console.log(domContext.contextId); // 'dom-ctx-1'
 * domContext.setElement(compiledElement);
 * domContext.addSubscription(eventSub);
 * const button = domContext.query('.btn');
 * ```
 */
export class DomContext implements IDomContext {
  private static contextCounter = 0;

  readonly contextId: string;
  private htmlElement: HTMLElement | null = null;
  private subscriptions: Unsubscribe[] = [];
  private isRendered = false;
  private contentType = DomContentType.NONE;
  private ownsElement = false;

  /**
   * Initializes a new instance of DomContext.
   *
   * @param targetRoot - The target root where DOM will be attached
   * @throws Error if targetRoot is null or undefined
   *
   * @example
   * ```typescript
   * const domContext = new DomContext(document.body);
   * const shadowContext = new DomContext(element.shadowRoot!);
   * ```
   */
  constructor(private targetRoot: HTMLElement | ShadowRoot) {
    if (!targetRoot) throw new Error("Target root is required");
    this.contextId = `dom-ctx-${++DomContext.contextCounter}`;
  }

  /**
   * Gets the root HTML element.
   *
   * @returns The root HTML element or null if not yet set
   *
   * @example
   * ```typescript
   * const element = domContext.getElement();
   * ```
   */
  getElement(): HTMLElement | null {
    return this.htmlElement;
  }

  /**
   * Gets the target root for rendering.
   *
   * @returns The target root (HTMLElement or ShadowRoot)
   *
   * @example
   * ```typescript
   * const root = domContext.getTargetRoot();
   * ```
   */
  getTargetRoot(): HTMLElement | ShadowRoot {
    return this.targetRoot;
  }

  /**
   * Sets the compiled HTML element as the root.
   *
   * @param element - The HTML element to set as root
   * @param contentType - The type of content being set
   * @throws Error if element or contentType are null/undefined
   *
   * @example
   * ```typescript
   * domContext.setElement(compiledElement, DomContentType.COMPONENT);
   * ```
   */
  setElement(element: HTMLElement, contentType: DomContentType): void {
    if (!element) throw new Error("Element is required");
    if (!contentType) throw new Error("Content type is required");
    this.targetRoot.innerHTML = "";
    this.targetRoot.appendChild(element);
    this.htmlElement = element;
    this.ownsElement = true;
    this.isRendered = true;
    this.contentType = contentType;
  }

  /**
   * Adopts an existing HTML element as the root without clearing the target root.
   *
   * @param element - Existing HTML element to use as root
   * @param contentType - The type of content being adopted
   * @throws Error if element or contentType are null/undefined
   *
   * @example
   * ```typescript
   * domContext.adoptElement(serverRenderedElement, DomContentType.COMPONENT);
   * ```
   */
  adoptElement(element: HTMLElement, contentType: DomContentType): void {
    if (!element) throw new Error("Element is required");
    if (!contentType) throw new Error("Content type is required");
    if (element.parentNode !== this.targetRoot) {
      this.targetRoot.appendChild(element);
    }
    this.htmlElement = element;
    this.ownsElement = false;
    this.isRendered = true;
    this.contentType = contentType;
  }

  /**
   * Checks if the DOM has been rendered.
   *
   * @returns true if rendered, false otherwise
   *
   * @example
   * ```typescript
   * if (domContext.getIsRendered()) {
   *   console.log('DOM is ready');
   * }
   * ```
   */
  getIsRendered(): boolean {
    return this.isRendered;
  }

  /**
   * Queries a single element using CSS selector.
   *
   * @param selector - CSS selector string
   * @returns The first matching element or null
   * @throws Error if selector is null or undefined
   *
   * @example
   * ```typescript
   * const button = domContext.query('.submit-btn');
   * const input = domContext.query('#email-input');
   * ```
   */
  query(selector: string): HTMLElement | null {
    if (!selector) throw new Error("Selector is required");
    if (!this.htmlElement) return null;
    return this.htmlElement.querySelector(selector);
  }

  /**
   * Queries all elements matching CSS selector.
   *
   * @param selector - CSS selector string
   * @returns NodeList of matching elements or empty list
   * @throws Error if selector is null or undefined
   *
   * @example
   * ```typescript
   * const buttons = domContext.queryAll('.action-btn');
   * buttons.forEach(btn => console.log(btn));
   * ```
   */
  queryAll(selector: string): NodeListOf<Element> {
    if (!selector) throw new Error("Selector is required");
    if (!this.htmlElement) {
      return document.querySelectorAll(":empty");
    }
    return this.htmlElement.querySelectorAll(selector);
  }

  /**
   * Adds a teardown callback to be managed by the context.
   *
   * @param subscription - The unsubscribe function to add
   * @throws Error if subscription is null or undefined
   *
   * @example
   * ```typescript
   * const unsub = () => element.removeEventListener('click', handler);
   * domContext.addSubscription(unsub);
   * ```
   */
  addSubscription(subscription: Unsubscribe): void {
    if (!subscription) throw new Error("Subscription is required");
    this.subscriptions.push(subscription);
  }

  /**
   * Clears all callbacks without destroying the context.
   * Useful for re-render scenarios.
   *
   * @example
   * ```typescript
   * domContext.clearSubscriptions();
   * // Re-initialize listeners
   * ```
   */
  clearSubscriptions(): void {
    this.subscriptions.forEach((fn) => {
      try {
        fn();
      } catch {
        /* no-op */
      }
    });
    this.subscriptions = [];
  }

  /**
   * Sets the current content type being displayed.
   *
   * @param contentType - The content type to set
   * @throws Error if contentType is null or undefined
   *
   * @example
   * ```typescript
   * domContext.setContentType(DomContentType.ERROR);
   * ```
   */
  getContentType(): DomContentType {
    return this.contentType;
  }

  /**
   * Destroys the DOM context, cleaning up callbacks and removing elements.
   *
   * @example
   * ```typescript
   * domContext.destroy();
   * ```
   */
  destroy(): void {
    this.clearSubscriptions();

    if (this.htmlElement && this.ownsElement) {
      this.htmlElement.remove();
    }

    this.htmlElement = null;
    this.ownsElement = false;
    this.isRendered = false;
    this.contentType = DomContentType.NONE;
  }
}

/**
 * Implements the responsibility of rendering component DOM beside a hidden managed host.
 *
 * @description
 * Used when a PickComponent custom element lives under a restrictive native
 * HTML parent such as `tbody` or `ul`. The managed host stays alive for
 * lifecycle purposes while rendered content is inserted through a transparent
 * anchor before the host.
 *
 * @example
 * ```typescript
 * const context = new AnchoredDomContext(targetRoot, transparentHost);
 * context.setElement(renderedElement, DomContentType.COMPONENT);
 * ```
 */
export class AnchoredDomContext implements IDomContext {
  private static contextCounter = 0;

  readonly contextId: string;
  private htmlElement: HTMLElement | null = null;
  private subscriptions: Unsubscribe[] = [];
  private isRendered = false;
  private contentType = DomContentType.NONE;
  private ownsElement = false;

  /**
   * Initializes a new instance of AnchoredDomContext.
   *
   * @param targetRoot - The restrictive parent that will own rendered nodes
   * @param transparentHost - The transparent host helper for the managed custom element
   * @throws Error if any parameter is null or undefined
   *
   * @example
   * ```typescript
   * const context = new AnchoredDomContext(targetRoot, transparentHost);
   * ```
   */
  constructor(
    private readonly targetRoot: HTMLElement,
    private readonly transparentHost: ITransparentHost,
  ) {
    if (!targetRoot) throw new Error("Target root is required");
    if (!transparentHost) throw new Error("TransparentHost is required");

    this.contextId = `anchored-dom-ctx-${++AnchoredDomContext.contextCounter}`;
    this.transparentHost.connect("none");
  }

  /**
   * Gets the rendered root HTML element.
   *
   * @returns The rendered element, or null when no element is currently mounted
   *
   * @example
   * ```typescript
   * const root = context.getElement();
   * ```
   */
  getElement(): HTMLElement | null {
    return this.htmlElement;
  }

  /**
   * Gets the restrictive parent that owns rendered nodes.
   *
   * @returns The restrictive parent element
   *
   * @example
   * ```typescript
   * const targetRoot = context.getTargetRoot();
   * ```
   */
  getTargetRoot(): HTMLElement | ShadowRoot {
    return this.targetRoot;
  }

  /**
   * Sets the rendered root element through the transparent host.
   *
   * @param element - The rendered component root element
   * @param contentType - The type of content being mounted
   * @returns Nothing
   * @throws Error if any parameter is null or undefined
   *
   * @example
   * ```typescript
   * context.setElement(renderedElement, DomContentType.COMPONENT);
   * ```
   */
  setElement(element: HTMLElement, contentType: DomContentType): void {
    if (!element) throw new Error("Element is required");
    if (!contentType) throw new Error("Content type is required");

    if (this.htmlElement && this.ownsElement && this.htmlElement.parentNode) {
      this.htmlElement.parentNode.removeChild(this.htmlElement);
    }

    this.transparentHost.insert(element);
    this.htmlElement = element;
    this.ownsElement = true;
    this.isRendered = true;
    this.contentType = contentType;
  }

  /**
   * Adopts an existing anchored element as the root without moving it.
   *
   * @param element - Existing HTML element to use as root
   * @param contentType - The type of content being adopted
   * @returns Nothing
   * @throws Error if any parameter is null or undefined
   */
  adoptElement(element: HTMLElement, contentType: DomContentType): void {
    if (!element) throw new Error("Element is required");
    if (!contentType) throw new Error("Content type is required");

    this.htmlElement = element;
    this.ownsElement = false;
    this.isRendered = true;
    this.contentType = contentType;
  }

  /**
   * Checks whether anchored content has been rendered.
   *
   * @returns True when an element has been mounted
   *
   * @example
   * ```typescript
   * if (context.getIsRendered()) {
   *   console.log("Anchored DOM is ready");
   * }
   * ```
   */
  getIsRendered(): boolean {
    return this.isRendered;
  }

  /**
   * Queries a single element inside the rendered root.
   *
   * @param selector - CSS selector string
   * @returns The first matching element, or null when none exists
   * @throws Error if selector is null or undefined
   *
   * @example
   * ```typescript
   * const button = context.query(".submit");
   * ```
   */
  query(selector: string): HTMLElement | null {
    if (!selector) throw new Error("Selector is required");
    if (!this.htmlElement) return null;
    return this.htmlElement.querySelector(selector);
  }

  /**
   * Queries all matching elements inside the rendered root.
   *
   * @param selector - CSS selector string
   * @returns All matching elements, or an empty NodeList when no root exists
   * @throws Error if selector is null or undefined
   *
   * @example
   * ```typescript
   * const items = context.queryAll(".item");
   * ```
   */
  queryAll(selector: string): NodeListOf<Element> {
    if (!selector) throw new Error("Selector is required");
    if (!this.htmlElement) {
      return document.querySelectorAll(":empty");
    }
    return this.htmlElement.querySelectorAll(selector);
  }

  /**
   * Adds a teardown callback to the anchored context.
   *
   * @param subscription - The teardown callback to register
   * @returns Nothing
   * @throws Error if subscription is null or undefined
   *
   * @example
   * ```typescript
   * context.addSubscription(() => window.removeEventListener("resize", onResize));
   * ```
   */
  addSubscription(subscription: Unsubscribe): void {
    if (!subscription) throw new Error("Subscription is required");
    this.subscriptions.push(subscription);
  }

  /**
   * Clears all registered teardown callbacks.
   *
   * @returns Nothing
   *
   * @example
   * ```typescript
   * context.clearSubscriptions();
   * ```
   */
  clearSubscriptions(): void {
    this.subscriptions.forEach((fn) => {
      try {
        fn();
      } catch {
        /* no-op */
      }
    });
    this.subscriptions = [];
  }

  /**
   * Gets the currently mounted content type.
   *
   * @returns The active content type
   *
   * @example
   * ```typescript
   * const contentType = context.getContentType();
   * ```
   */
  getContentType(): DomContentType {
    return this.contentType;
  }

  /**
   * Destroys the anchored DOM context.
   *
   * @returns Nothing
   *
   * @example
   * ```typescript
   * context.destroy();
   * ```
   */
  destroy(): void {
    this.clearSubscriptions();

    if (this.htmlElement && this.ownsElement) {
      this.htmlElement.remove();
    }

    this.htmlElement = null;
    this.ownsElement = false;
    this.transparentHost.disconnect();
    this.isRendered = false;
    this.contentType = DomContentType.NONE;
  }
}
