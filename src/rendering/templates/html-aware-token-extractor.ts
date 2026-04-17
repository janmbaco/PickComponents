import type {
  ITemplateTokenExtractor,
  TemplateToken,
} from "./template-token.interface.js";
import type { IHtmlFragmentParser } from "./html-fragment-parser.interface.js";
import type { IInterpolableContentSelector } from "./interpolable-content-selector.interface.js";

/**
 * Implements the responsibility of extracting tokens from HTML templates with context awareness.
 *
 * @description
 * HTML-aware token extractor that:
 * 1. Parses the template HTML into a structured representation
 * 2. Selects only safe/interpolable content (text nodes and allowed attribute values)
 * 3. Delegates actual token extraction to a string-based extractor
 *
 * This ensures tokens are ONLY extracted from:
 * - Text node content (excluding script/style/template/comments)
 * - Attribute values (excluding on*, style, and structure like tag/attr names)
 *
 * @example
 * ```typescript
 * const parser = new Parse5FragmentParser();
 * const selector = new SafeContentSelector();
 * const stringExtractor = new DelimitedTokenExtractor('{{', '}}', 'binding');
 * const htmlExtractor = new HtmlAwareTokenExtractor(parser, selector, stringExtractor);
 *
 * const tokens = htmlExtractor.extract('<div>{{message}}</div>');
 * // tokens = [{ kind: 'binding', value: 'message', ... }]
 * ```
 */
export class HtmlAwareTokenExtractor implements ITemplateTokenExtractor {
  /**
   * Initializes a new instance of HtmlAwareTokenExtractor.
   *
   * @param parser - HTML fragment parser for template parsing
   * @param selector - Content selector for safe fragment extraction
   * @param stringExtractor - String-based token extractor for actual tokenization
   * @throws Error if any dependency is null or undefined
   */
  constructor(
    private readonly parser: IHtmlFragmentParser,
    private readonly selector: IInterpolableContentSelector,
    private readonly stringExtractor: ITemplateTokenExtractor,
  ) {
    if (!parser) throw new Error("Parser is required");
    if (!selector) throw new Error("Selector is required");
    if (!stringExtractor) throw new Error("StringExtractor is required");
  }

  /**
   * Extracts tokens from an HTML template string.
   *
   * @param template - HTML template string
   * @returns Array of extracted tokens from safe/interpolable content only
   * @throws Error if template is null or undefined
   *
   * @example
   * ```typescript
   * const extractor = new HtmlAwareTokenExtractor(parser, selector, stringExtractor);
   * const tokens = extractor.extract('<div>{{message}}</div>');
   * ```
   */
  extract(template: string): TemplateToken[] {
    if (template === null || template === undefined) {
      throw new Error("Template is required");
    }

    // Parse HTML structure
    const parsedHtml = this.parser.parse(template);

    // Select interpolable fragments (text nodes and safe attribute values)
    const fragments = this.selector.selectInterpolableFragments(parsedHtml);

    // Extract tokens from each safe fragment
    const allTokens: TemplateToken[] = [];
    for (const fragment of fragments) {
      const tokens = this.stringExtractor.extract(fragment.content);
      allTokens.push(...tokens);
    }

    return allTokens;
  }
}
