/**
 * Defines the responsibility of tracking reactive property access during
 * computed getter evaluation.
 *
 * @description
 * Provides a tracking context that `@Reactive` getters participate in.
 * When a computed getter is evaluated under `discoverDependencies()`, any
 * `@Reactive` accessor that is read will record its property name via
 * `trackAccess()`.
 */
export interface IDependencyTracker {
  /**
   * Records a property access in the active tracking context.
   * Called by `@Reactive` getters during dependency discovery.
   * No-op when no tracking context is active.
   *
   * @param propertyName - Name of the reactive property being read
   */
  trackAccess(propertyName: string): void;

  /**
   * Runs a function while tracking which reactive properties are accessed.
   *
   * @param fn - Function to run (typically a getter invocation)
   * @returns Array of reactive property names that were read during execution
   *
   * @example
   * ```typescript
   * const deps = tracker.discoverDependencies(() => component.icon);
   * // deps → ['mode'] (because getter reads this.mode)
   * ```
   */
  discoverDependencies(fn: () => unknown): string[];
}
