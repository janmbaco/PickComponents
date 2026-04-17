/**
 * Represents a parsed HTML fragment.
 * This type is opaque as the internal structure varies by parser implementation.
 */
export type ParsedNode = unknown;

/**
 * Defines the responsibility of parsing HTML template strings into a structured representation.
 */
export interface IHtmlFragmentParser {
  /**
   * Parses an HTML template string into a document fragment or AST.
   *
   * @param html - HTML template string to parse
   * @returns Parsed HTML structure
   * @throws Error if html is null or undefined
   */
  parse(html: string): ParsedNode;
}
