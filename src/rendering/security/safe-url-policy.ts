export interface ISafeUrlPolicy {
  isSafeUrl(value: string, ownerElement?: Element | null): boolean;
}

const DEFAULT_ALLOWED_URL_PROTOCOLS: ReadonlySet<string> = new Set([
  "http:",
  "https:",
  "mailto:",
  "tel:",
]);

const BLOCKED_URL_PROTOCOLS: ReadonlySet<string> = new Set([
  "javascript:",
  "vbscript:",
  "data:",
]);

export const URL_ATTRIBUTE_NAMES: ReadonlySet<string> = new Set([
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

export function isUrlAttributeName(attributeName: string): boolean {
  return URL_ATTRIBUTE_NAMES.has(attributeName.trim().toLowerCase());
}

export class SafeUrlPolicy implements ISafeUrlPolicy {
  constructor(
    private readonly allowedProtocols: ReadonlySet<string> = DEFAULT_ALLOWED_URL_PROTOCOLS,
    private readonly blockedProtocols: ReadonlySet<string> = BLOCKED_URL_PROTOCOLS,
  ) {}

  isSafeUrl(value: string, ownerElement?: Element | null): boolean {
    const trimmed = value.trim();
    if (!trimmed) {
      return true;
    }

    if (this.hasControlCharacter(trimmed)) {
      return false;
    }

    const explicitProtocol =
      this.extractProtocolIgnoringAsciiWhitespace(trimmed);
    if (explicitProtocol && this.blockedProtocols.has(explicitProtocol)) {
      return false;
    }

    try {
      const parsed = new URL(trimmed, this.resolveBaseUrl(ownerElement));
      return this.allowedProtocols.has(parsed.protocol);
    } catch {
      return false;
    }
  }

  private extractProtocolIgnoringAsciiWhitespace(value: string): string | null {
    const normalized = this.removeAsciiWhitespace(value).toLowerCase();
    const colonIndex = normalized.indexOf(":");
    if (colonIndex <= 0) {
      return null;
    }

    const slashIndex = normalized.search(/[/?#]/);
    if (slashIndex !== -1 && slashIndex < colonIndex) {
      return null;
    }

    return `${normalized.slice(0, colonIndex)}:`;
  }

  private removeAsciiWhitespace(value: string): string {
    let normalized = "";

    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      if (
        code === 9 ||
        code === 10 ||
        code === 12 ||
        code === 13 ||
        code === 32
      ) {
        continue;
      }
      normalized += value[index];
    }

    return normalized;
  }

  private resolveBaseUrl(ownerElement?: Element | null): string {
    const candidates = [
      ownerElement?.ownerDocument?.baseURI,
      globalThis.document?.baseURI,
    ];

    for (const candidate of candidates) {
      if (candidate && this.isHttpBaseUrl(candidate)) {
        return candidate;
      }
    }

    return "https://pick-components.local/";
  }

  private isHttpBaseUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
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

export const defaultSafeUrlPolicy = new SafeUrlPolicy();
