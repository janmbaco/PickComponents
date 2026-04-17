import type { Unsubscribe } from "../../reactive/signal.js";

/**
 * Defines the types of content that can be rendered in the DOM context.
 * This enumeration tracks the current state of content being displayed,
 * allowing the rendering system to understand what type of content is currently active.
 */
export enum DomContentType {
  /** No content is currently being displayed (initial state) */
  NONE = "none",
  /** Loading skeleton is being displayed while component initializes */
  SKELETON = "skeleton",
  /** Error overlay is being displayed when rendering fails */
  ERROR = "error",
  /** Component content is being displayed (fully rendered component) */
  COMPONENT = "component",
}

/**
 * Defines the responsibility of managing DOM representation and subscriptions.
 *
 * @description
 * Pure View utility for DOM manipulation and subscription lifecycle management.
 * Component-agnostic - does not hold component references.
 * Each context has a unique identifier for tracking component instances.
 *
 * @example
 * ```typescript
 * const domContext: IDomContext = new DomContext(targetRoot);
 * console.log(domContext.contextId); // 'dom-ctx-1'
 * domContext.setElement(compiledElement);
 * domContext.addSubscription(subscription);
 * const button = domContext.query('.submit-btn');
 * ```
 */
export interface IDomContext {
  /**
   * Unique context identifier.
   * Used for tracking component instances across multiple contexts.
   *
   * @example
   * ```typescript
   * const id = domContext.contextId; // 'dom-ctx-123'
   * ```
   */
  readonly contextId: string;

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
  getElement(): HTMLElement | null;

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
  getTargetRoot(): HTMLElement | ShadowRoot;

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
  setElement(element: HTMLElement, contentType: DomContentType): void;

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
  getIsRendered(): boolean;

  /**
   * Adds a teardown callback to be managed and cleaned up on destroy.
   *
   * @param subscription - The unsubscribe function to add
   * @throws Error if subscription is null or undefined
   *
   * @example
   * ```typescript
   * const sub = observable.subscribe(value => console.log(value));
   * domContext.addSubscription(sub);
   * ```
   */
  addSubscription(subscription: Unsubscribe): void;

  /**
   * Queries a single element using CSS selector within the root element.
   *
   * @param selector - CSS selector string
   * @returns The first matching element or null
   * @throws Error if selector is null or undefined
   *
   * @example
   * ```typescript
   * const button = domContext.query('.submit-btn');
   * ```
   */
  query(selector: string): HTMLElement | null;

  /**
   * Clears all subscriptions without destroying the context.
   * Useful for re-render scenarios.
   *
   * @example
   * ```typescript
   * domContext.clearSubscriptions();
   * // Re-initialize listeners after clearing
   * ```
   */
  clearSubscriptions(): void;

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
  getContentType(): DomContentType;

  /**
   * Destroys the DOM context, cleaning up callbacks and removing elements.
   *
   * @description
   * Calls all managed cleanup functions, removes the HTML element from DOM,
   * and resets internal state.
   *
   * @example
   * ```typescript
   * domContext.destroy();
   * ```
   */
  destroy(): void;
}
