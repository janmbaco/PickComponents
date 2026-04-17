import { PickComponent } from "../../core/pick-component.js";
import { ComponentMetadata } from "../../core/component-metadata.js";
import type { IExpressionResolver } from "../bindings/expression-resolver.interface.js";
import {
  IDomContext,
  DomContentType,
} from "../dom-context/dom-context.interface.js";
import { IDomAdapter } from "../dom/dom-adapter.interface.js";
import type { ISkeletonValidator } from "./skeleton-validator.js";

/**
 * Implements the responsibility of handling loading and displaying skeleton states.
 *
 * @description
 * Manages the rendering of loading states (skeletons) during component initialization.
 * Supports skeleton templates defined in component metadata and a default fallback
 * skeleton rendered directly to the DOM context.
 *
 * @architecture
 * Skeleton loading priority:
 * 1. Metadata skeleton: metadata.skeleton property
 * 2. Fallback: Default skeleton rendered directly to DOM context target root
 */

/**
 * Defines the responsibility of rendering loading states (skeletons) during component initialization.
 *
 * @description
 * Defines the contract for rendering loading states (skeletons) during component initialization.
 * Implementations handle different skeleton sources: custom methods, metadata, or file-based loading.
 */
export interface ISkeletonRenderer {
  /**
   * Renders a skeleton element for the given component.
   *
   * @param component - The component instance requesting skeleton
   * @param metadata - The component metadata containing skeleton template
   * @param domContext - DOM context for managing subscriptions and cleanup
   * @returns Promise that completes when skeleton is rendered
   * @throws Error if component or metadata are null/undefined
   */
  render(
    component: PickComponent,
    metadata: ComponentMetadata,
    domContext: IDomContext,
  ): Promise<void>;
}

export class SkeletonRenderer implements ISkeletonRenderer {
  private cachedDefaultSkeleton: HTMLElement | null = null;
  private readonly validator: ISkeletonValidator;

  /**
   * Initializes a new instance of SkeletonRenderer.
   *
   * @param domAdapter - Adapter for DOM element creation
   * @param validator - Validator enforcing whitelist rules for skeleton HTML
   * @throws Error if any dependency is null or undefined
   */
  constructor(
    private readonly domAdapter: IDomAdapter,
    validator: ISkeletonValidator,
    private readonly expressionResolver: IExpressionResolver,
  ) {
    if (!domAdapter) throw new Error("Dom adapter is required");
    if (!validator) throw new Error("Skeleton validator is required");
    if (!expressionResolver) throw new Error("Expression resolver is required");
    this.validator = validator;
  }
  /**
   * Renders a skeleton element for the given component
   *
   * @description
   * Attempts to render a skeleton in order of preference, falling back gracefully.
   * Uses metadata skeleton if available, otherwise renders the default skeleton.
   *
   * @param component - The component instance requesting skeleton
   * @param metadata - The component metadata containing skeleton template
   * @param domContext - DOM context for managing subscriptions and cleanup
   * @returns Promise that completes when skeleton is rendered
   *
   * @example
   * ```typescript
   * // Metadata skeleton via @PickRender decorator
   * @PickRender({
   *   skeleton: '<div class="loading">Loading component...</div>'
   * })
   * ```
   */
  async render(
    component: PickComponent,
    metadata: ComponentMetadata,
    domContext: IDomContext,
  ): Promise<void> {
    if (!component) throw new Error("Component is required");
    if (!metadata) throw new Error("Metadata is required");
    if (!domContext) throw new Error("DOM context is required");

    if (this.tryRenderMetadataSkeleton(component, metadata, domContext)) {
      return;
    }

    this.renderDefaultSkeleton(domContext);
  }

  private tryRenderMetadataSkeleton(
    component: PickComponent,
    metadata: ComponentMetadata,
    domContext: IDomContext,
  ): boolean {
    if (!metadata.skeleton) {
      return false;
    }

    // Validate skeleton template before rendering
    try {
      this.validator.validate(metadata.skeleton);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(
        "[SkeletonRenderer] Skeleton template validation failed:",
        msg,
      );
      throw error;
    }

    const skeletonHTML = this.expressionResolver.resolve(
      metadata.skeleton,
      component,
    );
    this.renderSkeletonWrapper(skeletonHTML, domContext);
    return true;
  }

  private renderSkeletonWrapper(
    skeletonHTML: string,
    domContext: IDomContext,
  ): void {
    const wrapper = this.domAdapter.createElement("div");
    const safeHTML = this.sanitizeHTML(skeletonHTML);
    wrapper.innerHTML = safeHTML;
    wrapper.setAttribute("data-skeleton", "true");
    domContext.setElement(wrapper, DomContentType.SKELETON);
  }

  private renderDefaultSkeleton(domContext: IDomContext): void {
    const skeletonElement = this.buildDefaultSkeleton();
    skeletonElement.setAttribute("data-skeleton", "true");
    domContext.setElement(skeletonElement, DomContentType.SKELETON);
  }

  private buildDefaultSkeleton(): HTMLElement {
    // Cache the complete default skeleton (structure + styles) to avoid re-creating it
    if (this.cachedDefaultSkeleton) {
      return this.cachedDefaultSkeleton.cloneNode(true) as HTMLElement;
    }

    // Build wrapper once
    const wrapper = this.domAdapter.createElement("div");
    wrapper.appendChild(this.createSkeletonStructure());
    wrapper.appendChild(this.createSkeletonStyles());

    this.cachedDefaultSkeleton = wrapper;

    // Return a clone for this use
    return wrapper.cloneNode(true) as HTMLElement;
  }

  private createSkeletonStructure(): HTMLElement {
    const container = this.domAdapter.createElement("div");
    container.className = "pick-default-skeleton";

    const dots = this.domAdapter.createElement("div");
    dots.className = "pick-skeleton-dots";

    for (let i = 0; i < 3; i++) {
      const dot = this.domAdapter.createElement("div");
      dot.className = "pick-skeleton-dot";
      dots.appendChild(dot);
    }

    container.appendChild(dots);
    return container;
  }

  private createSkeletonStyles(): HTMLElement {
    const style = this.domAdapter.createElement("style");
    style.textContent = `
      .pick-default-skeleton {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100px;
        background: #f3f6fa;
        border-radius: 4px;
      }
      .pick-skeleton-dots {
        display: flex;
        align-items: center;
      }
      .pick-skeleton-dot {
        width: 20px;
        height: 20px;
        background: #d1dae6;
        border-radius: 50%;
        margin: 0 8px;
        animation: pick-skeleton-pulse 1.5s ease-in-out infinite;
      }
      :host([data-theme="dark"]) .pick-default-skeleton {
        background: #1b2430;
      }
      :host([data-theme="dark"]) .pick-skeleton-dot {
        background: #5d6b7d;
      }
      .pick-skeleton-dot:nth-child(2) {
        animation-delay: 0.3s;
      }
      .pick-skeleton-dot:nth-child(3) {
        animation-delay: 0.6s;
      }
      @keyframes pick-skeleton-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    return style;
  }

  /**
   * Sanitizes skeleton HTML to prevent execution of dangerous content.
   *
   * @description
   * Removes <script> tags and inline event handler attributes (on*). Also strips
   * javascript: URLs from href/src attributes. Intended as a defensive measure;
   * skeleton templates are developer-provided, but this ensures SSR/browser safety.
   *
   * @param html - Raw HTML string to sanitize
   * @returns Sanitized HTML string
   */
  private sanitizeHTML(html: string): string {
    const temp = this.domAdapter.createElement("div");
    temp.innerHTML = html || "";

    // Remove <script> elements
    const scripts = Array.from(temp.querySelectorAll("script"));
    scripts.forEach((s) => s.remove());

    // Walk elements and strip dangerous attributes
    const walk = (el: Element) => {
      // Remove inline event handlers (on*)
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value?.toLowerCase() || "";
        if (name.startsWith("on")) {
          el.removeAttribute(attr.name);
          return;
        }
        // Strip javascript: urls in href/src
        if (
          (name === "href" || name === "src") &&
          value.trim().startsWith("javascript:")
        ) {
          el.removeAttribute(attr.name);
        }
      });

      Array.from(el.children).forEach((child) => walk(child));
    };

    Array.from(temp.children).forEach((child) => walk(child));

    return temp.innerHTML;
  }
}
