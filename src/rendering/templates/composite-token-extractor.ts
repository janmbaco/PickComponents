import {
  ITemplateTokenExtractor,
  TemplateToken,
} from "./template-token.interface.js";

/**
 * Implements the responsibility of aggregating multiple token extractors.
 */
export class CompositeTokenExtractor implements ITemplateTokenExtractor {
  private readonly extractors: ITemplateTokenExtractor[];

  constructor(extractors: ITemplateTokenExtractor[]) {
    if (!extractors || extractors.length === 0) {
      throw new Error("At least one extractor is required");
    }
    this.extractors = extractors;
  }

  extract(template: string): TemplateToken[] {
    return this.extractors.flatMap((extractor) => extractor.extract(template));
  }
}
