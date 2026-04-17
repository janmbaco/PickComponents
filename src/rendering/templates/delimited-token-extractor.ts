import {
  ITemplateTokenExtractor,
  TemplateToken,
} from "./template-token.interface.js";

/**
 * Implements the responsibility of extracting delimited tokens (e.g., {{binding}}, [[CONSTANT]]).
 */
export class DelimitedTokenExtractor implements ITemplateTokenExtractor {
  private readonly kind: string;
  private readonly pattern: RegExp;

  constructor(start: string, end: string, kind: string) {
    if (!start) throw new Error("Start delimiter is required");
    if (!end) throw new Error("End delimiter is required");
    if (!kind) throw new Error("Token kind is required");

    this.kind = kind;
    const escapedStart = DelimitedTokenExtractor.escapeRegex(start);
    const escapedEnd = DelimitedTokenExtractor.escapeRegex(end);
    this.pattern = new RegExp(`${escapedStart}([^]*?)${escapedEnd}`, "g");
  }

  extract(template: string): TemplateToken[] {
    if (!template) {
      return [];
    }

    const tokens: TemplateToken[] = [];
    let match: RegExpExecArray | null;

    while ((match = this.pattern.exec(template)) !== null) {
      const raw = match[0];
      const value = (match[1] ?? "").trim();
      const startIndex = match.index;
      const endIndex = startIndex + raw.length;

      tokens.push({
        kind: this.kind,
        value,
        raw,
        start: startIndex,
        end: endIndex,
      });
    }

    return tokens;
  }

  private static escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
