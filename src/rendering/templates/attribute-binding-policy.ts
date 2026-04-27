/**
 * Defines the safety policy for dynamic template attribute bindings.
 *
 * The template analyzer and the DOM binder both use this policy so extraction
 * and final DOM writes cannot drift apart.
 */
export interface IAttributeBindingPolicy {
  canExtractFromAttribute(attributeName: string): boolean;
  canBindAttribute(attributeName: string): boolean;
  allowsObjectBinding(attributeName: string): boolean;
  sanitizeStaticAttribute(
    attributeName: string,
    value: string,
    ownerElement?: Element | null,
  ): string | null;
  sanitizeResolvedValue(
    attributeName: string,
    value: string,
    ownerElement?: Element | null,
  ): string | null;
}

const URL_DYNAMIC_ATTRIBUTES = new Set([
  "action",
  "background",
  "cite",
  "formaction",
  "href",
  "lowsrc",
  "ping",
  "poster",
  "src",
  "xlink:href",
]);

const SAFE_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * Keeps dynamic attribute bindings away from browser-executed contexts.
 */
export class AttributeBindingPolicy implements IAttributeBindingPolicy {
  canExtractFromAttribute(attributeName: string): boolean {
    const normalized = this.normalize(attributeName);
    if (!normalized) return false;
    if (this.looksLikeInterpolation(normalized)) return false;
    return this.canBindAttribute(normalized);
  }

  canBindAttribute(attributeName: string): boolean {
    return !!this.normalize(attributeName);
  }

  allowsObjectBinding(attributeName: string): boolean {
    const normalized = this.normalize(attributeName);
    return (
      this.canBindAttribute(normalized) && !this.isUrlAttribute(normalized)
    );
  }

  sanitizeStaticAttribute(
    attributeName: string,
    value: string,
    ownerElement?: Element | null,
  ): string | null {
    const normalized = this.normalize(attributeName);

    if (!this.isUrlAttribute(normalized)) return value;
    return this.isSafeUrl(value, ownerElement) ? value : null;
  }

  sanitizeResolvedValue(
    attributeName: string,
    value: string,
    ownerElement?: Element | null,
  ): string | null {
    const normalized = this.normalize(attributeName);
    if (!normalized) return null;
    if (!this.isUrlAttribute(normalized)) return value;
    return this.isSafeUrl(value, ownerElement) ? value : null;
  }

  private normalize(attributeName: string): string {
    return (attributeName || "").trim().toLowerCase();
  }

  private isUrlAttribute(attributeName: string): boolean {
    return URL_DYNAMIC_ATTRIBUTES.has(attributeName);
  }

  private looksLikeInterpolation(attributeName: string): boolean {
    return (
      attributeName.includes("{{") ||
      attributeName.includes("}}") ||
      attributeName.includes("${") ||
      attributeName.includes("[[") ||
      attributeName.includes("]]")
    );
  }

  private isSafeUrl(value: string, ownerElement?: Element | null): boolean {
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (this.hasControlCharacter(trimmed)) return false;

    const compact = trimmed.replace(/\s+/g, "").toLowerCase();
    if (
      compact.startsWith("javascript:") ||
      compact.startsWith("vbscript:") ||
      compact.startsWith("data:")
    ) {
      return false;
    }

    try {
      const baseUrl = this.resolveBaseUrl(ownerElement);
      const parsed = new URL(trimmed, baseUrl);
      return SAFE_URL_PROTOCOLS.has(parsed.protocol);
    } catch {
      return false;
    }
  }

  private resolveBaseUrl(ownerElement?: Element | null): string {
    const candidates = [
      ownerElement?.ownerDocument?.baseURI,
      globalThis.document?.baseURI,
    ];

    for (const candidate of candidates) {
      if (candidate && /^https?:\/\//i.test(candidate)) {
        return candidate;
      }
    }

    return "https://pick-components.local/";
  }

  private hasControlCharacter(value: string): boolean {
    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      if (code <= 31 || code === 127) {
        return true;
      }
    }

    return false;
  }
}

export const defaultAttributeBindingPolicy = new AttributeBindingPolicy();
