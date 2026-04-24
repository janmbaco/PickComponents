/**
 * Implements the responsibility of client-side URL routing from a lightweight custom element.
 *
 * @description
 * Pure custom element that handles URL-based routing for SPAs using the History API.
 * Collects `<template data-route="...">` children, listens through
 * INavigationService, and renders the matching route template into an outlet div.
 * Does not use the PickComponent rendering pipeline — no template compilation,
 * no reactive bindings, no lifecycle manager.
 *
 * Supports exact routes, dynamic segments (/users/:id), and wildcard fallback (*).
 *
 * @example
 * ```html
 * <pick-router>
 *   <template data-route="/">Home Page</template>
 *   <template data-route="/about">About Us</template>
 *   <template data-route="/users/:id">User Profile for :id</template>
 *   <template data-route="*">404 Not Found</template>
 * </pick-router>
 * ```
 */
import { Services } from "../../providers/service-provider.js";
import type { INavigationService } from "./navigation-service.interface.js";
import type { ITransparentHost } from "../../rendering/managed-host/transparent-host.interface.js";
import type { ITransparentHostFactory } from "../../rendering/managed-host/transparent-host-factory.interface.js";

const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

interface Route {
  path: string;
  template: HTMLTemplateElement;
}

interface RouteMatch {
  template: HTMLTemplateElement;
  params: Record<string, string>;
}

export class PickRouterElement extends HTMLElement {
  private routes: Route[] = [];
  private outlet: HTMLDivElement | null = null;
  private transparentHost: ITransparentHost | null = null;
  private currentParams: Record<string, string> = {};
  private currentTemplate: HTMLTemplateElement | null = null;
  private currentPath = "";
  private navigation: INavigationService | null = null;
  private unsubscribeNavigation: (() => void) | null = null;

  /**
   * Returns a copy of the current route parameters.
   *
   * @returns The current route parameters as key-value pairs
   */
  get routeParams(): Record<string, string> {
    return { ...this.currentParams };
  }

  connectedCallback(): void {
    if (!Array.isArray(this.routes)) {
      this.routes = [];
    }
    this.unsubscribeNavigation = null;
    this.navigation = null;
    if (!this.currentParams || typeof this.currentParams !== "object") {
      this.currentParams = {};
    }
    if (this.currentTemplate === undefined) {
      this.currentTemplate = null;
    }

    if (!isBrowser) {
      return;
    }

    this.transparentHost = Services.get<ITransparentHostFactory>(
      "ITransparentHostFactory",
    ).create(this, "pick-router-anchor");
    this.transparentHost.connect();
    this.navigation = Services.get<INavigationService>("INavigationService");

    if (this.routes.length === 0) {
      const templates = Array.from(this.children).filter(
        (child): child is HTMLTemplateElement =>
          child.tagName === "TEMPLATE" && child.hasAttribute("data-route"),
      );
      this.routes = templates.map((template) => ({
        path: template.dataset.route || "/",
        template,
      }));
    }
    this.innerHTML = "";

    this.outlet = document.createElement("div");
    this.outlet.className = "router-outlet";
    this.transparentHost.insert(this.outlet);

    this.unsubscribeNavigation = this.navigation.subscribe(() => {
      this.renderRoute();
    });

    this.renderRoute();
  }

  disconnectedCallback(): void {
    this.unsubscribeNavigation?.();
    this.unsubscribeNavigation = null;
    this.navigation = null;
    this.outlet?.parentNode?.removeChild(this.outlet);
    this.outlet = null;
    this.transparentHost?.disconnect();
    this.transparentHost = null;
    this.currentParams = {};
    this.currentTemplate = null;
    this.currentPath = "";
  }

  private renderRoute(): void {
    if (!this.outlet) {
      return;
    }

    const path = this.navigation?.getCurrentPath() ?? "/";
    const match = this.matchRoute(path);

    if (match) {
      const isSameTemplate = match.template === this.currentTemplate;
      const hasSameParams = this.paramsEqual(match.params, this.currentParams);
      const hasSamePath = path === this.currentPath;
      if (isSameTemplate && hasSameParams && hasSamePath) {
        return;
      }

      if (isSameTemplate && !hasSameParams) {
        const updatedInPlace = this.updateRouteInPlace(match);
        if (!updatedInPlace) {
          this.renderRouteTemplate(match);
        }
      } else if (!isSameTemplate) {
        this.renderRouteTemplate(match);
      }

      this.currentTemplate = match.template;
      this.currentParams = { ...match.params };
      this.currentPath = path;

      this.dispatchEvent(
        new CustomEvent("route-change", {
          bubbles: true,
          detail: { path, params: { ...match.params } },
        }),
      );
    } else {
      this.outlet.innerHTML = "<p>Route not found</p>";
      this.currentTemplate = null;
      this.currentParams = {};
      this.currentPath = path;
    }
  }

  private renderRouteTemplate(match: RouteMatch): void {
    if (!this.outlet) {
      return;
    }

    const fragment = match.template.content.cloneNode(true) as DocumentFragment;
    this.applyParamsToNodeList(
      Array.from(match.template.content.childNodes),
      Array.from(fragment.childNodes),
      match.params,
    );
    this.outlet.replaceChildren(fragment);
  }

  private updateRouteInPlace(match: RouteMatch): boolean {
    if (!this.outlet) {
      return false;
    }

    return this.applyParamsToNodeList(
      Array.from(match.template.content.childNodes),
      Array.from(this.outlet.childNodes),
      match.params,
    );
  }

  private applyParamsToNodeList(
    templateNodes: ChildNode[],
    renderedNodes: ChildNode[],
    params: Record<string, string>,
  ): boolean {
    if (templateNodes.length !== renderedNodes.length) {
      return false;
    }

    for (let index = 0; index < templateNodes.length; index++) {
      const templateNode = templateNodes[index];
      const renderedNode = renderedNodes[index];
      if (!this.applyParamsToNode(templateNode, renderedNode, params)) {
        return false;
      }
    }

    return true;
  }

  private applyParamsToNode(
    templateNode: Node,
    renderedNode: Node,
    params: Record<string, string>,
  ): boolean {
    if (templateNode.nodeType !== renderedNode.nodeType) {
      return false;
    }

    if (templateNode.nodeType === Node.TEXT_NODE) {
      renderedNode.textContent = this.interpolateParams(
        templateNode.textContent ?? "",
        params,
      );
      return true;
    }

    if (templateNode.nodeType !== Node.ELEMENT_NODE) {
      return true;
    }

    const templateElement = templateNode as Element;
    const renderedElement = renderedNode as Element;
    if (templateElement.tagName !== renderedElement.tagName) {
      return false;
    }

    this.applyParamsToAttributes(templateElement, renderedElement, params);

    if (this.isCustomElement(templateElement)) {
      return true;
    }

    if (
      templateElement instanceof HTMLTemplateElement &&
      renderedElement instanceof HTMLTemplateElement
    ) {
      return this.applyParamsToNodeList(
        Array.from(templateElement.content.childNodes),
        Array.from(renderedElement.content.childNodes),
        params,
      );
    }

    return this.applyParamsToNodeList(
      Array.from(templateElement.childNodes),
      Array.from(renderedElement.childNodes),
      params,
    );
  }

  private applyParamsToAttributes(
    templateElement: Element,
    renderedElement: Element,
    params: Record<string, string>,
  ): void {
    for (const attr of Array.from(templateElement.attributes)) {
      renderedElement.setAttribute(
        attr.name,
        this.interpolateParams(attr.value, params),
      );
    }
  }

  private isCustomElement(element: Element): boolean {
    return element.tagName.includes("-");
  }

  private interpolateParams(
    template: string,
    params: Record<string, string>,
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`:${key}`, "g"), value);
    }

    return result;
  }

  private paramsEqual(
    a: Record<string, string>,
    b: Record<string, string>,
  ): boolean {
    const left = a ?? {};
    const right = b ?? {};
    const keysA = Object.keys(left);
    const keysB = Object.keys(right);
    if (keysA.length !== keysB.length) {
      return false;
    }
    for (const key of keysA) {
      if (left[key] !== right[key]) {
        return false;
      }
    }
    return true;
  }

  private matchRoute(rawPath: string): RouteMatch | null {
    const path =
      rawPath.length > 1 && rawPath.endsWith("/")
        ? rawPath.slice(0, -1)
        : rawPath;

    for (const route of this.routes) {
      if (route.path === path) {
        return { template: route.template, params: {} };
      }

      if (route.path === "*") {
        continue;
      }

      const routeParts = route.path.split("/");
      const pathParts = path.split("/");

      const hasWildcardSuffix = routeParts[routeParts.length - 1] === "**";
      if (hasWildcardSuffix) {
        const prefixParts = routeParts.slice(0, -1);
        if (pathParts.length < prefixParts.length) {
          continue;
        }

        const params: Record<string, string> = {};
        let isMatch = true;

        for (let i = 0; i < prefixParts.length; i++) {
          if (prefixParts[i].startsWith(":")) {
            if (!pathParts[i]) {
              isMatch = false;
              break;
            }
            params[prefixParts[i].slice(1)] = pathParts[i];
          } else if (prefixParts[i] !== pathParts[i]) {
            isMatch = false;
            break;
          }
        }

        if (isMatch) {
          return { template: route.template, params };
        }
        continue;
      }

      if (routeParts.length !== pathParts.length) {
        continue;
      }

      const params: Record<string, string> = {};
      let isMatch = true;

      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(":")) {
          params[routeParts[i].slice(1)] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        return { template: route.template, params };
      }
    }

    const wildcard = this.routes.find((route) => route.path === "*");
    if (wildcard) {
      return { template: wildcard.template, params: {} };
    }

    return null;
  }
}
