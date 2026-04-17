/**
 * Defines the responsibility of representing a pre-compiled template.
 *
 * @description
 * Represents a template that has been parsed and analyzed for bindings.
 * Can be cloned for instantiation in multiple DOM contexts.
 *
 * @example
 * ```typescript
 * const compiledTemplate: ICompiledTemplate = {
 *   templateString: '<div>{{message}}</div>',
 *   bindings: new Set(['message']),
 *   clone: () => ({ ...this })
 * };
 * ```
 */
export interface ICompiledTemplate {
  /** Original template string */
  templateString: string;

  /** Detected bindings (property paths like 'message', 'user.name') */
  bindings: Set<string>;

  /**
   * Clones this compiled template for use in a new context.
   *
   * @returns A new ICompiledTemplate instance
   *
   * @example
   * ```typescript
   * const clone = compiledTemplate.clone();
   * ```
   */
  clone(): ICompiledTemplate;
}
