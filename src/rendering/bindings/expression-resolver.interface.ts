import { PickComponent } from "../../core/pick-component.js";

/**
 * Defines the responsibility of resolving template expressions using component properties.
 */
export interface IExpressionResolver {
  /**
   * Resolves a binding expression to its current value.
   *
   * @param expression - Template expression with {{bindings}}
   * @param component - Component instance for property access
   * @returns Resolved string value
   * @throws Error if expression or component are null/undefined
   *
   * @example
   * ```typescript
   * const result = expressionResolver.resolve(
   *   'Hello {{name}}!',
   *   component
   * );
   * // Returns: "Hello World!" if component.name = "World"
   * ```
   */
  resolve(expression: string, component: PickComponent): string;
}
