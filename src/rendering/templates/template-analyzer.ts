import { ICompiledTemplate } from "./compiled-template.interface.js";
import { CompositeTokenExtractor } from "./composite-token-extractor.js";
import { DelimitedTokenExtractor } from "./delimited-token-extractor.js";
import {
  ITemplateTokenExtractor,
  TemplateToken,
} from "./template-token.interface.js";
import { HtmlAwareTokenExtractor } from "./html-aware-token-extractor.js";
import { Parse5FragmentParser } from "./parse5-fragment-parser.js";
import { SafeContentSelector } from "./safe-content-selector.js";

/**
 * Implements the responsibility of analyzing templates and extracting bindings.
 *
 * @description
 * Extracts template tokens using HTML-aware context selection.
 * Tokenization occurs ONLY in:
 * - Text nodes (excluding script/style/template/comments)
 * - Attribute values (excluding on*, style, tag names, attribute names)
 *
 * Uses pluggable dialect extractors for different interpolation syntaxes.
 */

/**
 * Defines the responsibility of analyzing templates and producing compiled representations.
 */
export interface ITemplateAnalyzer {
  /**
   * Analyzes a template and returns its compiled representation.
   *
   * @param template - Template source string
   * @returns Compiled template with extracted bindings
   * @throws Error if template is null or undefined
   */
  analyze(template: string): ICompiledTemplate;
}

export class TemplateAnalyzer implements ITemplateAnalyzer {
  private readonly extractor: ITemplateTokenExtractor;

  constructor(extractor?: ITemplateTokenExtractor) {
    this.extractor = extractor ?? TemplateAnalyzer.createDefaultExtractor();
  }

  /**
   * Analyzes a template and extracts bindings from safe contexts only.
   *
   * @param template - HTML template string with {{bindings}}
   * @returns Compiled template with extracted bindings
   * @throws Error if template is null or undefined
   *
   * @description
   * Tokenization occurs ONLY in text nodes and allowed attribute values.
   * Excluded contexts: tag names, attribute names, script/style content,
   * comments, template elements, on* attributes, style attribute.
   * Empty string templates are allowed and return zero bindings.
   *
   * @example
   * ```typescript
   * const analyzer = new TemplateAnalyzer();
   * // Valid: text node
   * analyzer.analyze('<div>{{message}}</div>'); // bindings: {'message'}
   * // Valid: attribute value
   * analyzer.analyze('<div attr="{{x}}"></div>'); // bindings: {'x'}
   * // Invalid: tag name (excluded)
   * analyzer.analyze('<{{tag}}></{{tag}}>'); // bindings: {}
   * // Invalid: script content (excluded)
   * analyzer.analyze('<script>{{x}}</script>'); // bindings: {}
   * ```
   */
  analyze(template: string): ICompiledTemplate {
    if (template === null || template === undefined) {
      throw new Error("Template is required");
    }

    const tokens = this.extractor.extract(template);
    const bindings = this.collectBindings(tokens);

    return {
      templateString: template,
      bindings,
      clone(): ICompiledTemplate {
        return {
          templateString: this.templateString,
          bindings: new Set(this.bindings),
          clone: this.clone,
        };
      },
    };
  }

  private collectBindings(tokens: TemplateToken[]): Set<string> {
    const bindings = new Set<string>();
    tokens
      .filter((token) => token.kind === "binding")
      .forEach((token) => {
        if (token.value) {
          bindings.add(token.value);
        }
      });
    return bindings;
  }

  private static createDefaultExtractor(): ITemplateTokenExtractor {
    const parser = new Parse5FragmentParser();
    const selector = new SafeContentSelector();
    const bindingExtractor = new DelimitedTokenExtractor("{{", "}}", "binding");
    const stringExtractor = new CompositeTokenExtractor([bindingExtractor]);

    return new HtmlAwareTokenExtractor(parser, selector, stringExtractor);
  }
}
