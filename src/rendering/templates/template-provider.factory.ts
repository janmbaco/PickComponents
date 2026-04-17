import { TemplateProvider } from "./template-provider.js";
import { RulesResolver } from "../bindings/rules-resolver.js";
import { ITemplateProvider } from "./template-provider.js";
import type { IComponentMetadataRegistry } from "../../core/component-metadata-registry.interface.js";

/**
 * Factory for creating TemplateProvider instances.
 * Implements the Factory Pattern for centralized object creation.
 *
 * @description
 * Provides a centralized way to create TemplateProvider instances with their dependencies.
 * Ensures consistent dependency injection and allows for easy testing and mocking.
 *
 * @example
 * ```typescript
 * const provider = TemplateProviderFactory.createDefault(metadataSource);
 * const template = await provider.getSource(component, options);
 * ```
 */
export class TemplateProviderFactory {
  /**
   * Creates a TemplateProvider with default dependencies.
   *
   * @param metadataSource - Optional metadata source for component metadata lookup
   * @returns A fully configured TemplateProvider instance
   */
  static createDefault(
    metadataSource?: IComponentMetadataRegistry,
  ): ITemplateProvider {
    const rulesResolver = new RulesResolver();

    return new TemplateProvider(rulesResolver, metadataSource);
  }

  /**
   * Creates a TemplateProvider with custom dependencies.
   *
   * @param rulesResolver - Custom rules resolver implementation
   * @param metadataSource - Optional metadata source for component metadata lookup
   * @returns A TemplateProvider instance with custom dependencies
   */
  static createWithDependencies(
    rulesResolver: import("../bindings/rules-resolver.interface.js").IRulesResolver,
    metadataSource?: IComponentMetadataRegistry,
  ): ITemplateProvider {
    return new TemplateProvider(rulesResolver, metadataSource);
  }
}
