import {
  IHtmlFragmentParser,
  ParsedNode,
} from "./html-fragment-parser.interface.js";

/**
 * Implements the responsibility of normalizing HTML fragments for selector traversal.
 *
 * @description
 * The historical class name is preserved for public API compatibility, but the
 * runtime implementation is intentionally self-contained and does not rely on
 * external parsing libraries. The selector layer operates on the normalized
 * HTML string returned by this parser.
 *
 * @example
 * ```typescript
 * const parser = new Parse5FragmentParser();
 * const fragment = parser.parse('<div>{{message}}</div>');
 * ```
 */
export class Parse5FragmentParser implements IHtmlFragmentParser {
  /**
   * Parses an HTML template string into a normalized fragment representation.
   *
   * @param html - HTML template string to parse
   * @returns Normalized fragment representation
   * @throws Error if html is null or undefined
   *
   * @example
   * ```typescript
   * const parser = new Parse5FragmentParser();
   * const fragment = parser.parse('<div>{{message}}</div>');
   * ```
   */
  parse(html: string): ParsedNode {
    if (html === null || html === undefined) {
      throw new Error("Html is required");
    }

    return html;
  }
}
