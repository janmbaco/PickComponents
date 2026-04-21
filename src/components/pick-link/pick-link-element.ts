/**
 * Implements the responsibility of SPA navigation from a lightweight custom element.
 *
 * @description
 * Pure custom element that wraps its children in an anchor tag and intercepts
 * clicks to navigate through INavigationService instead of full page reloads.
 * Does not use the PickComponent rendering pipeline — no template compilation,
 * no reactive bindings, no lifecycle manager.
 *
 * The `to` attribute specifies the target route path.
 *
 * @example
 * ```html
 * <pick-link to="/todos">Todos</pick-link>
 * <pick-link to="/about">About</pick-link>
 * <pick-link to="/users/123">User Profile</pick-link>
 * ```
 */
import { Services } from "../../providers/service-provider.js";
import type { INavigationService } from "../pick-router/navigation-service.interface.js";
import type { ITransparentHost } from "../../rendering/managed-host/transparent-host.interface.js";
import type { ITransparentHostFactory } from "../../rendering/managed-host/transparent-host-factory.interface.js";

const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

export class PickLinkElement extends HTMLElement {
  private anchor: HTMLAnchorElement | null = null;
  private ownsAnchor = false;
  private transparentHost: ITransparentHost | null = null;
  private navigation: INavigationService | null = null;
  private unsubscribeNavigation: (() => void) | null = null;
  private eventListeners: Array<{
    target: EventTarget;
    event: string;
    handler: EventListener;
  }> = [];

  static get observedAttributes(): string[] {
    return ["to"];
  }

  connectedCallback(): void {
    this.eventListeners = [];

    if (!isBrowser) {
      return;
    }

    this.transparentHost = Services.get<ITransparentHostFactory>(
      "ITransparentHostFactory",
    ).create(this, "pick-link-anchor");
    this.transparentHost.connect();
    this.navigation = Services.get<INavigationService>("INavigationService");

    const to = this.getAttribute("to") || "/";
    this.anchor = this.findExistingAnchor();

    if (this.anchor) {
      this.ownsAnchor = false;
      this.anchor.href = to;
    } else {
      this.ownsAnchor = true;
      this.anchor = document.createElement("a");
      this.anchor.href = to;
      this.moveHostChildrenToAnchor();
      this.transparentHost.insert(this.anchor);
    }

    const clickHandler = (event: MouseEvent) => {
      this.handleClick(event);
    };
    this.anchor.addEventListener("click", clickHandler);
    this.eventListeners.push({
      target: this.anchor,
      event: "click",
      handler: clickHandler as EventListener,
    });

    this.unsubscribeNavigation = this.navigation.subscribe(() => {
      this.updateActiveState();
    });

    this.updateActiveState();
  }

  disconnectedCallback(): void {
    this.eventListeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    this.eventListeners = [];
    this.unsubscribeNavigation?.();
    this.unsubscribeNavigation = null;
    if (this.ownsAnchor) {
      this.restoreAnchorChildrenToHost();
      this.anchor?.parentNode?.removeChild(this.anchor);
    }
    this.anchor = null;
    this.ownsAnchor = false;
    this.navigation = null;
    this.transparentHost?.disconnect();
    this.transparentHost = null;
  }

  /**
   * Updates the anchor href when the `to` attribute changes.
   *
   * @param name - The attribute name that changed
   * @param _oldValue - The previous attribute value
   * @param newValue - The new attribute value
   */
  attributeChangedCallback(
    name: string,
    _oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name === "to" && this.anchor) {
      this.anchor.href = newValue || "/";
      this.updateActiveState();
    }
  }

  private updateActiveState(): void {
    const to = this.getAttribute("to") || "/";
    const isActive = this.navigation?.getCurrentPath() === to;

    if (isActive) {
      this.classList.add("active");
      this.anchor?.classList.add("active");
    } else {
      this.classList.remove("active");
      this.anchor?.classList.remove("active");
    }
  }

  private handleClick(event: MouseEvent): void {
    if (event.defaultPrevented) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    if (!this.anchor || !this.canInterceptAnchor(this.anchor)) {
      return;
    }

    event.preventDefault();
    const targetUrl = new URL(this.anchor.href, window.location.href);
    const to = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
    this.navigation?.navigate(to);
  }

  private findExistingAnchor(): HTMLAnchorElement | null {
    const firstElement = this.firstElementChild;

    if (firstElement?.tagName.toLowerCase() === "a") {
      return firstElement as HTMLAnchorElement;
    }

    return this.querySelector(":scope > a");
  }

  private canInterceptAnchor(anchor: HTMLAnchorElement): boolean {
    if (anchor.hasAttribute("download")) {
      return false;
    }

    const target = anchor.getAttribute("target");
    if (target && target.toLowerCase() !== "_self") {
      return false;
    }

    const url = new URL(anchor.href, window.location.href);
    return url.origin === window.location.origin;
  }

  /**
   * Moves the live host children into the rendered anchor so any existing
   * reactive text/attribute bindings continue updating after connect.
   */
  private moveHostChildrenToAnchor(): void {
    if (!this.anchor) {
      return;
    }

    while (this.firstChild) {
      this.anchor.appendChild(this.firstChild);
    }
  }

  /**
   * Restores anchor children back to the host before teardown so reconnects
   * keep the same live nodes and bindings.
   */
  private restoreAnchorChildrenToHost(): void {
    if (!this.anchor) {
      return;
    }

    while (this.anchor.firstChild) {
      this.appendChild(this.anchor.firstChild);
    }
  }
}
