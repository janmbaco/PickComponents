import { PickComponent } from "../../core/pick-component.js";
import type { IExpressionResolver } from "../bindings/expression-resolver.interface.js";
import {
  IDomContext,
  DomContentType,
} from "../dom-context/dom-context.interface.js";
import { IDomAdapter } from "../dom/dom-adapter.interface.js";
import { NodeType } from "../dom/node-types.js";

/**
 * Defines the responsibility of carrying error rendering options.
 *
 * @description
 * Encapsulates optional data required by `ErrorRenderer` to display a custom
 * error overlay, including an HTML template and the current component for
 * expression resolution.
 */
export interface ErrorRenderOptions {
  /**
   * Optional HTML template used to render the error overlay. Supports
   * `{{message}}` placeholder, which will be replaced by the final error message.
   */
  errorTemplate?: string;

  /**
   * Optional component instance used to resolve template expressions like
   * `{{t.ERROR}}`.
   */
  component?: PickComponent;
}

/**
 * Defines the responsibility of rendering error states and overlays.
 *
 * @description
 * Defines the contract for rendering error states when component rendering fails,
 * including custom error templates and fallback overlays.
 */
export interface IErrorRenderer {
  /**
   * Renders an error overlay in the DOM context.
   *
   * @param domContext - DOM context for managing the error display
   * @param errorMessage - Error message to display
   * @param options - Optional custom template and component to render error overlay
   * @throws Error if domContext or errorMessage are null/undefined
   */
  render(
    domContext: IDomContext,
    errorMessage: string,
    options?: ErrorRenderOptions,
  ): Promise<void>;
}

/**
 * Implements the responsibility of rendering error states and overlays.
 *
 * @description
 * Handles the rendering of error states when component rendering fails.
 * Supports custom error templates from component metadata and provides
 * a coherent fallback error overlay without hardcoded styles.
 *
 * @architecture
 * Error Display Priority:
 * 1. Custom error template: @PickRender({ errorTemplate: '...' })
 * 2. Fallback overlay: Simple HTML structure with message
 */
export class ErrorRenderer implements IErrorRenderer {
  /**
   * Initializes a new instance of ErrorRenderer.
   *
   * @param domAdapter - Adapter for DOM element creation
   * @param expressionResolver - Resolver for component-backed {{expressions}}
   * @throws Error if domAdapter is null or undefined
   */
  constructor(
    private readonly domAdapter: IDomAdapter,
    private readonly expressionResolver: IExpressionResolver,
  ) {
    if (!domAdapter) throw new Error("Dom adapter is required");
    if (!expressionResolver)
      throw new Error("Expression resolver is required");
  }
  /**
   * Renders an error overlay in the DOM context
   *
   * @description
   * Displays error message by either using custom error template from metadata
   * or showing a simple fallback overlay. Resolves component expressions in
   * custom templates.
   *
   * @param domContext - DOM context for managing the error display
   * @param errorMessage - Error message to display
   * @param options - Optional render options for the custom error template
   *
   * @example
   * ```typescript
   * // Custom error template with component expressions
   * @PickRender({
   *   selector: 'my-component',
   *   errorTemplate: `<div class="{{errorClass}}">{{message}}</div>`
   * })
   *
   * // Fallback: Simple structure without styles
   * <div><div>⚠️</div><div>Error message</div></div>
   * ```
   */
  async render(
    domContext: IDomContext,
    errorMessage: string,
    options?: ErrorRenderOptions,
  ): Promise<void> {
    if (!domContext) throw new Error("DOM context is required");
    if (!errorMessage) throw new Error("Error message is required");

    if (
      await this.tryRenderCustomErrorTemplate(domContext, errorMessage, options)
    ) {
      return;
    }

    this.renderDefaultErrorOverlay(domContext, errorMessage);
  }

  private async tryRenderCustomErrorTemplate(
    domContext: IDomContext,
    errorMessage: string,
    options?: ErrorRenderOptions,
  ): Promise<boolean> {
    if (!options?.errorTemplate) return false;
    await this.renderCustomErrorTemplate(
      domContext,
      errorMessage,
      options.errorTemplate,
      options.component,
    );
    return true;
  }

  private async renderCustomErrorTemplate(
    domContext: IDomContext,
    errorMessage: string,
    errorTemplate: string,
    component?: PickComponent,
  ): Promise<void> {
    const placeholder = "__ERROR_MESSAGE_PLACEHOLDER__";
    let template = errorTemplate.replace(
      /\{\{\s*message\s*\}\}/g,
      placeholder,
    );

    if (component) {
      template = this.expressionResolver.resolve(template, component);
    }

    const wrapper = this.domAdapter.createElement("div");
    wrapper.innerHTML = template;

    // Replace placeholder with safe text content to prevent XSS
    this.replaceTextPlaceholder(wrapper, placeholder, errorMessage);

    wrapper.setAttribute("data-error", "true");
    domContext.setElement(wrapper, DomContentType.ERROR);
  }

  private renderDefaultErrorOverlay(
    domContext: IDomContext,
    errorMessage: string,
  ): void {
    const overlay = this.domAdapter.createElement("div");
    overlay.setAttribute("data-error", "true");

    const container = this.domAdapter.createElement("div");
    const icon = this.domAdapter.createElement("div");
    icon.textContent = "⚠️";

    const message = this.domAdapter.createElement("div");
    message.textContent = errorMessage;

    container.appendChild(icon);
    container.appendChild(message);
    overlay.appendChild(container);

    domContext.setElement(overlay, DomContentType.ERROR);
  }

  /**
   * Safely replaces text placeholders in DOM tree to prevent XSS.
   *
   * @param element - Root element to search
   * @param placeholder - Placeholder text to find
   * @param value - Safe text value to insert
   */
  private replaceTextPlaceholder(
    element: HTMLElement,
    placeholder: string,
    value: string,
  ): void {
    this.walkTextNodes(element, (textNode) => {
      if (textNode.textContent?.includes(placeholder)) {
        textNode.textContent = textNode.textContent.replace(
          new RegExp(placeholder, "g"),
          value,
        );
      }
    });
  }

  /**
   * Recursively walks all text nodes in an element.
   *
   * @param node - Node to start walking from
   * @param callback - Function to call for each text node
   */
  private walkTextNodes(node: Node, callback: (textNode: Text) => void): void {
    if (node.nodeType === NodeType.TEXT_NODE) {
      callback(node as Text);
    } else if (node.nodeType === NodeType.ELEMENT_NODE) {
      const children = Array.from(node.childNodes);
      children.forEach((child) => this.walkTextNodes(child, callback));
    }
  }
}
