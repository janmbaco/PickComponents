import type { CapturedConfig, InlineContext } from "./types.js";
import type { PickComponent } from "../../core/pick-component.js";
import type { PickInitializer } from "../../behaviors/pick-initializer.js";
import type { PickLifecycleManager } from "../../behaviors/pick-lifecycle-manager.js";

/**
 * Defines the responsibility of building the dynamic class hierarchy for a `@Pick` component.
 *
 * @description
 * Abstracts the construction of the three class layers that every `@Pick` component requires:
 * - The enhanced base class (extends PickComponent with reactive state and computed props)
 * - An optional initializer class (handles async data loading)
 * - An optional lifecycle class (handles onInit / onDestroy hooks)
 *
 * Implementations are registered in the service container and resolved by the `@Pick` decorator,
 * decoupling the decorator from concrete construction strategies.
 */
export interface IPickComponentFactory {
  /**
   * Captures the configuration produced by executing the setup function against an InlineContext.
   *
   * @param setup - Setup function receiving InlineContext
   * @returns Captured configuration object
   */
  captureConfig<TState>(
    setup: (ctx: InlineContext<TState>) => void,
  ): CapturedConfig<TState>;
  /**
   * Creates the enhanced PickComponent class with reactive state and handlers from the setup config.
   *
   * @param target - Original class decorated by `@Pick`
   * @param config - Captured setup configuration
   * @returns Constructor extending PickComponent
   */
  createEnhancedClass<TState>(
    target: unknown,
    config: CapturedConfig<TState>,
  ): new (...args: unknown[]) => PickComponent;

  /**
   * Creates an initializer class from the captured config, or `undefined` if no initializer was configured.
   *
   * @param config - Captured setup configuration
   * @returns Initializer constructor, or `undefined`
   */
  createInitializerClass<TState>(
    config: CapturedConfig<TState>,
  ): (new () => PickInitializer<unknown>) | undefined;

  /**
   * Creates a lifecycle manager class from the captured config, or `undefined` if no lifecycle was configured.
   *
   * @param config - Captured setup configuration
   * @returns Lifecycle manager constructor, or `undefined`
   */
  createLifecycleClass<TState>(
    config: CapturedConfig<TState>,
  ): (new () => PickLifecycleManager<unknown>) | undefined;
}
