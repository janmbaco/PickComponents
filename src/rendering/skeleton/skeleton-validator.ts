import {
  defaultSafeUrlPolicy,
  isUrlAttributeName,
  type ISafeUrlPolicy,
} from "../security/safe-url-policy.js";

/**
 * Defines the responsibility of validating skeleton templates.
 *
 * @description
 * Contract for validating developer-supplied skeleton HTML. Implementations must
 * throw an Error describing the violation when the input is not acceptable.
 */
export interface ISkeletonValidator {
  /**
   * Validates the provided skeleton HTML string.
   *
   * @param html - Raw skeleton HTML to validate
   * @throws Error if the HTML contains disallowed tags, attributes, or URLs
   */
  validate(html: string): void;
}

/**
 * Implements the responsibility of validating skeleton HTML templates.
 *
 * @description
 * Enforces whitelist of allowed tags and attributes to prevent developers
 * from accidentally breaking layouts, performance, or security via skeleton templates.
 * Fails fast with clear errors so developers know what went wrong.
 *
 * @remarks
 * - Allowed tags include common semantic, structural, and basic SVG elements.
 * - Allowed attributes include common HTML and selected SVG attributes; prefixes `data-*`, `aria-*`, and XMLNS/xlink are permitted.
 * - Forbidden content includes `<style>`, `<script>`, inline event handlers (`on*`), and unsafe URL protocols.
 */
export class SkeletonValidator implements ISkeletonValidator {
  constructor(
    private readonly safeUrlPolicy: ISafeUrlPolicy = defaultSafeUrlPolicy,
  ) {}

  private readonly ALLOWED_TAGS = new Set([
    // Containers
    "div",
    "span",
    "section",
    "article",
    "header",
    "footer",
    "main",
    "aside",
    "nav",
    // Text
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "strong",
    "em",
    "b",
    "i",
    "small",
    "mark",
    "code",
    "pre",
    // Media
    "img",
    "svg",
    "picture",
    "source",
    "circle",
    "rect",
    "path",
    "g",
    "line",
    "polyline",
    "polygon",
    "text",
    "tspan",
    "defs",
    "use",
    "animate",
    "animatetransform",
    "a",
    // Forms
    "button",
    "form",
    "input",
    "label",
    "fieldset",
    "legend",
    "textarea",
    "select",
    "option",
    // Lists
    "ul",
    "li",
    "ol",
    "dl",
    "dt",
    "dd",
    // Semantic
    "figure",
    "figcaption",
    "table",
    "tbody",
    "thead",
    "tfoot",
    "tr",
    "td",
    "th",
    "blockquote",
    "hr",
  ]);

  private readonly ALLOWED_ATTRIBUTES = new Set([
    "class",
    "id",
    "role",
    "title",
    "alt",
    "type",
    "placeholder",
    "disabled",
    "readonly",
    "required",
    "tabindex",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-hidden",
    "aria-live",
    "aria-atomic",
    "width",
    "height",
    "src",
    "href",
    "target",
    "rel",
    "xmlns",
    "viewbox",
    "focusable",
    "cx",
    "cy",
    "r",
    "x",
    "y",
    "d",
    "fill",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-dasharray",
    "stroke-dashoffset",
    "transform",
    "xmlns:xlink",
    "xlink:href",
    // SVG animation attributes
    "attributename",
    "from",
    "to",
    "dur",
    "repeatcount",
    "calcmode",
    "values",
    "keytimes",
  ]);

  /**
   * Validates skeleton HTML template.
   *
   * @param html - Raw skeleton HTML to validate
   * @throws Error with clear message if validation fails
   *
   * @example
   * ```typescript
   * const validator = new SkeletonValidator();
   * validator.validate('<div class="loader"><span>Loading...</span></div>'); // OK
   * validator.validate('<style>body { display: none; }</style>'); // Throws error
   * ```
   */
  validate(html: string): void {
    if (!html || !html.trim()) {
      return; // Empty skeleton is valid
    }

    // Check for forbidden tags
    this.checkForbiddenTags(html);
    // Check for forbidden attributes
    this.checkForbiddenAttributes(html);
    // Check for dangerous URLs
    this.checkDangerousUrls(html);
  }

  private checkForbiddenTags(html: string): void {
    // Check for <style> tags
    if (/<style[\s>]/i.test(html)) {
      throw new Error(
        `[SkeletonValidator] Tag <style> is not allowed in skeleton templates. ` +
          `Allowed tags: ${Array.from(this.ALLOWED_TAGS).join(", ")}`,
      );
    }
    // Check for <script> tags
    if (/<script[\s>]/i.test(html)) {
      throw new Error(
        `[SkeletonValidator] Tag <script> is not allowed in skeleton templates. ` +
          `Allowed tags: ${Array.from(this.ALLOWED_TAGS).join(", ")}`,
      );
    }

    // Check for tags not in whitelist using regex
    const tagRegex = /<\/?\s*([a-z][a-z0-9-]*)/gi;
    let match;
    const checkedTags = new Set<string>();

    while ((match = tagRegex.exec(html)) !== null) {
      const tag = match[1].toLowerCase();
      if (!checkedTags.has(tag) && !this.ALLOWED_TAGS.has(tag)) {
        checkedTags.add(tag);
        throw new Error(
          `[SkeletonValidator] Tag <${tag}> is not allowed in skeleton templates. ` +
            `Allowed tags: ${Array.from(this.ALLOWED_TAGS).join(", ")}`,
        );
      }
    }
  }

  private checkForbiddenAttributes(html: string): void {
    // Check for event handlers (on*)
    if (/\s(on[a-z]+)\s*=/i.test(html)) {
      const match = html.match(/\s(on[a-z]+)\s*=/i);
      const attr = match ? match[1] : "on*";
      throw new Error(
        `[SkeletonValidator] Event handler attribute "${attr}" is not allowed in skeleton templates. ` +
          `Use data-* attributes or CSS classes instead.`,
      );
    }

    // Check for style attribute
    if (/\sstyle\s*=/i.test(html)) {
      throw new Error(
        `[SkeletonValidator] Attribute "style" is not allowed in skeleton templates.`,
      );
    }

    // Check for disallowed attributes (not in whitelist and not data-* or aria-* or namespaced)
    const attrRegex = /\s([a-z][a-z0-9:_-]*)\s*=/gi;
    let match;
    const checkedAttrs = new Set<string>();

    while ((match = attrRegex.exec(html)) !== null) {
      const attr = match[1].toLowerCase();
      if (!checkedAttrs.has(attr)) {
        checkedAttrs.add(attr);
        // Allow data-*, aria-*, namespaced (xmlns, xlink:*), and whitelisted
        if (
          !attr.startsWith("data-") &&
          !attr.startsWith("aria-") &&
          !attr.startsWith("xmlns") &&
          !attr.startsWith("xlink:") &&
          !this.ALLOWED_ATTRIBUTES.has(attr)
        ) {
          throw new Error(
            `[SkeletonValidator] Attribute "${attr}" is not allowed in skeleton templates. ` +
              `Allowed attributes: ${Array.from(this.ALLOWED_ATTRIBUTES).join(", ")}, data-*, aria-*, xmlns*`,
          );
        }
      }
    }
  }

  private checkDangerousUrls(html: string): void {
    const attrRegex =
      /\s([a-z][a-z0-9:_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
    let match;

    while ((match = attrRegex.exec(html)) !== null) {
      const attr = match[1].toLowerCase();
      if (!isUrlAttributeName(attr)) {
        continue;
      }

      const value = match[2] ?? match[3] ?? match[4] ?? "";
      if (!this.safeUrlPolicy.isSafeUrl(value)) {
        throw new Error(
          `[SkeletonValidator] Unsafe URL "${value}" is not allowed in ${attr} attributes.`,
        );
      }
    }
  }
}
