import { ICompiledTemplate } from "./compiled-template.interface.js";
import { ITemplateAnalyzer } from "./template-analyzer.js";

/**
 * Implements the responsibility of caching compiled templates.
 *
 * @description
 * Caches compiled templates to avoid re-parsing.
 * Templates are indexed by a cache key that includes both componentId and template content hash
 * to prevent staleness when constants or rules change.
 *
 * @example
 * ```typescript
 * const cache = new TemplateCompilationCache();
 * const analyzer = new TemplateAnalyzer();
 *
 * // First call: compiles and caches
 * const compiled1 = cache.getOrCompile('my-counter', '<div>{{count}}</div>', analyzer);
 *
 * // Second call with same template: returns cached version
 * const compiled2 = cache.getOrCompile('my-counter', '<div>{{count}}</div>', analyzer);
 *
 * // Different resolved template (e.g., constants changed): new compilation
 * const compiled3 = cache.getOrCompile('my-counter', '<div class="new-class">{{count}}</div>', analyzer);
 *
 * // compiled1 === compiled2 (same reference)
 * // compiled1 !== compiled3 (different template)
 * ```
 */
export class TemplateCompilationCache {
  private cache = new Map<string, ICompiledTemplate>();

  /**
   * Generates a cache key from componentId and template content.
   *
   * @description
   * Uses a small deterministic non-cryptographic hash of the template to
   * ensure different resolved templates (due to different constants/rules)
   * produce different cache keys without relying on Node.js builtins.
   *
   * @param componentId - Component selector (tag name)
   * @param template - Resolved template string (after static binding resolution)
   * @returns Cache key combining componentId and template hash
   */
  private generateCacheKey(componentId: string, template: string): string {
    const hash = this.hashTemplate(template);
    return `${componentId}:${hash}`;
  }

  private hashTemplate(template: string): string {
    let hash = 2166136261;

    for (let currentIndex = 0; currentIndex < template.length; currentIndex++) {
      hash ^= template.charCodeAt(currentIndex);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  /**
   * Gets cached compiled template or compiles and caches it.
   *
   * @param componentId - Component selector (tag name)
   * @param template - HTML template string (should already be resolved of [[...]] and [[RULES.*]])
   * @param analyzer - Template analyzer instance
   * @returns Compiled template (cached or newly compiled)
   * @throws Error if any parameter is null or undefined
   *
   * @example
   * ```typescript
   * const cache = new TemplateCompilationCache();
   * const analyzer = new TemplateAnalyzer();
   *
   * const compiled = cache.getOrCompile(
   *   'my-counter',
   *   '<div>{{count}}</div>',
   *   analyzer
   * );
   * ```
   */
  getOrCompile(
    componentId: string,
    template: string,
    analyzer: ITemplateAnalyzer,
  ): ICompiledTemplate {
    if (!componentId) throw new Error("ComponentId is required");
    if (!template) throw new Error("Template is required");
    if (!analyzer) throw new Error("Analyzer is required");

    const cacheKey = this.generateCacheKey(componentId, template);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const compiled = analyzer.analyze(template);
    this.cache.set(cacheKey, compiled);
    return compiled;
  }

  /**
   * Checks if a template is cached.
   *
   * @param componentId - Component selector (tag name)
   * @param template - Template string to check
   * @returns true if cached, false otherwise
   * @throws Error if parameters are null or undefined
   *
   * @example
   * ```typescript
   * if (cache.has('my-counter', '<div>{{count}}</div>')) {
   *   console.log('Template is cached');
   * }
   * ```
   */
  has(componentId: string, template: string): boolean {
    if (!componentId) throw new Error("ComponentId is required");
    if (!template) throw new Error("Template is required");
    const cacheKey = this.generateCacheKey(componentId, template);
    return this.cache.has(cacheKey);
  }

  /**
   * Clears all cached templates.
   *
   * @description
   * Used for testing to ensure test isolation.
   *
   * @example
   * ```typescript
   * afterEach(() => {
   *   cache.clear();
   * });
   * ```
   */
  clear(): void {
    this.cache.clear();
  }
}
