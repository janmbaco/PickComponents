import { PickComponent } from "../../core/pick-component.js";
import { ComponentMetadata } from "../../core/component-metadata.js";
import { RenderResult } from "../render-engine.js";
import { IDomContext } from "../dom-context/dom-context.interface.js";
import { ICompiledTemplate } from "../templates/compiled-template.interface.js";
import type { ClientRenderMode } from "../../ssr/prerender-manifest.js";

/**
 * Defines the responsibility of configuring pipeline execution.
 */
export interface PipelineOptions<T extends PickComponent = PickComponent> {
  /** The component instance to render */
  component: T;
  /** Component metadata (template, initializer, lifecycle, etc) */
  metadata: ComponentMetadata;
  /** DOM context for managing subscriptions and cleanup */
  domContext: IDomContext;
  /** Pre-compiled template (from cache or fresh compilation) */
  compiledTemplate: ICompiledTemplate;
  /** The custom element itself (for host projection content) */
  hostElement?: HTMLElement;
  /** Pipeline placement strategy for the first client boot. */
  renderMode?: ClientRenderMode;
  /** Existing DOM root to adopt when renderMode is "adopt". */
  adoptedElement?: HTMLElement | null;
}

/**
 * Defines the responsibility of orchestrating the complete component rendering pipeline.
 *
 * @description
 * Defines the contract for executing the post-initialization component
 * rendering pipeline, coordinating compilation and lifecycle management.
 */
export interface IRenderPipeline {
  /**
   * Executes the complete render pipeline for a component.
   *
   * @param options - Pipeline configuration options
   * @param domContext - DOM context for managing subscriptions and cleanup
   * @returns Promise resolving to render result with cleanup function
   * @throws Error if options are null/undefined
   *
   * @example
   * ```typescript
   * const result = await renderPipeline.execute(
   *   {
   *     component: myComponent,
   *     metadata,
   *     domContext,
   *     compiledTemplate,
   *     hostElement: customElement
   *   },
   *   domContext
   * );
   * // Call result.cleanup() when done
   * ```
   */
  execute(
    options: PipelineOptions,
    domContext: IDomContext,
  ): Promise<RenderResult>;
}
