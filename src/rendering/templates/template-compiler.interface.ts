import { PickComponent } from "../../core/pick-component.js";
import { IDomContext } from "../dom-context/dom-context.interface.js";
import { ComponentMetadata } from "../../core/component-metadata.js";

/**
 * Defines the responsibility of compiling template HTML strings into live DOM elements.
 *
 * @description
 * Defines the contract for compiling template HTML strings into live DOM elements
 * with reactive bindings and host projection applied.
 */
export interface ITemplateCompiler {
  /**
   * Compiles a template string into a reactive DOM element.
   *
   * @param templateSource - Preprocessed template HTML string
   * @param component - Component instance for binding context
   * @param domContext - DOM context for managing subscriptions and element references
   * @param metadata - Optional component metadata for selector and configuration
   * @returns Promise resolving to compiled HTMLElement ready for insertion
   * @throws Error if template has no root element or compilation fails
   *
   * @example
   * ```typescript
   * const compiler = new TemplateCompiler();
   * const element = await compiler.compile(
   *   '<div>{{message}}</div>',
   *   myComponent,
   *   domContext,
   *   metadata
   * );
   * ```
   */
  compile(
    templateSource: string,
    component: PickComponent,
    domContext: IDomContext,
    metadata?: ComponentMetadata,
  ): Promise<HTMLElement>;

  /**
   * Activates a prerendered root element by applying template bindings to the
   * existing DOM instead of creating and inserting a fresh tree.
   *
   * @param templateSource - Preprocessed template HTML string
   * @param existingRoot - DOM root already present in the document
   * @param component - Component instance for binding context
   * @param domContext - DOM context for managing subscriptions and element references
   * @param metadata - Optional component metadata for selector and configuration
   * @returns Promise resolving to the adopted root element
   */
  adoptExisting(
    templateSource: string,
    existingRoot: HTMLElement,
    component: PickComponent,
    domContext: IDomContext,
    metadata?: ComponentMetadata,
  ): Promise<HTMLElement>;
}
