/**
 * Defines the responsibility of representing parsed template tokens.
 */
export interface TemplateToken {
  /**
   * Token category to differentiate between reactive bindings, constants, rules, etc.
   */
  readonly kind: "binding" | "constant" | "rule" | string;

  /**
   * Trimmed value of the token (e.g., property path for bindings).
   */
  readonly value: string;

  /**
   * Raw substring matched in the template, including delimiters.
   */
  readonly raw: string;

  /**
   * Inclusive start offset in the template string.
   */
  readonly start: number;

  /**
   * Exclusive end offset in the template string.
   */
  readonly end: number;
}

/**
 * Defines the responsibility of extracting template tokens from a template string.
 */
export interface ITemplateTokenExtractor {
  /**
   * Extracts tokens from the provided template string.
   *
   * @param template - Template source to analyze
   * @returns List of extracted tokens (may be empty)
   */
  extract(template: string): TemplateToken[];
}
