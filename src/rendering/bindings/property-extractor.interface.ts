/**
 * Defines the responsibility of extracting property dependencies from template expressions.
 */
export interface IPropertyExtractor {
  /**
   * Extracts property names from template bindings.
   *
   * @param template - Template string with {{bindings}}
   * @returns Array of unique property names
   * @throws Error if template is null or undefined
   *
   * @example
   * ```typescript
   * extract('Count: {{count}}') // → ['count']
   * extract('{{user?.name}} - {{user?.email}}') // → ['user']
   * extract('{{x + y * 2}}') // → ['x', 'y']
   * ```
   */
  extract(template: string): string[];
}
