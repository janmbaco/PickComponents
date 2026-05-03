import {
  defaultSafeUrlPolicy,
  isUrlAttributeName,
  type ISafeUrlPolicy,
} from "../security/safe-url-policy.js";

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

/**
 * Keeps dynamic attribute bindings away from browser-executed contexts.
 */
export class AttributeBindingPolicy implements IAttributeBindingPolicy {
  constructor(
    private readonly safeUrlPolicy: ISafeUrlPolicy = defaultSafeUrlPolicy,
  ) {}

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
    return isUrlAttributeName(attributeName);
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
    return this.safeUrlPolicy.isSafeUrl(value, ownerElement);
  }
}

export const defaultAttributeBindingPolicy = new AttributeBindingPolicy();
