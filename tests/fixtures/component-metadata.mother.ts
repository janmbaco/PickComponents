import type { ComponentMetadata } from "../../src/core/component-metadata.js";

/**
 * Mother Object for creating ComponentMetadata test instances.
 * Provides pre-configured metadata for different testing scenarios.
 *
 * @description
 * Implements the Mother Object pattern for test data generation.
 * Each method creates valid ComponentMetadata with sensible defaults.
 */
export class ComponentMetadataMother {
  /**
   * Creates a minimal valid metadata instance.
   *
   * @param selector - Component selector (default: 'test-component')
   * @returns ComponentMetadata with minimal required fields
   */
  static minimal(selector = "test-component"): ComponentMetadata {
    return {
      selector,
      template: "<div>Test</div>",
    };
  }

  /**
   * Creates metadata for a component.
   * Each DOM context gets its own instance (1:1 model).
   *
   * @param selector - Component selector
   * @returns ComponentMetadata
   */
  static nonShared(selector = "non-shared-component"): ComponentMetadata {
    return {
      selector,
      template: "<div>Component: {{value}}</div>",
      skeleton: "<div>Loading...</div>",
    };
  }

  /**
   * Creates metadata for a component with skeleton.
   * Each DOM context gets its own instance (1:1 model).
   *
   * @param selector - Component selector
   * @returns ComponentMetadata
   */
  static shared(selector = "shared-component"): ComponentMetadata {
    return {
      selector,
      template: "<div>Component: {{value}}</div>",
      skeleton: "<div>Loading...</div>",
    };
  }

  /**
   * Creates metadata with initializer and lifecycle factory functions.
   *
   * @param selector - Component selector
   * @param initializer - Initializer class constructor (wrapped as factory)
   * @param lifecycle - Lifecycle class constructor (wrapped as factory)
   * @returns ComponentMetadata with full configuration
   */
  static withBehaviors(
    selector = "behavior-component",
    initializer?: new () => any,
    lifecycle?: new () => any,
  ): ComponentMetadata {
    return {
      selector,
      template: "<div>Component with behaviors: {{value}}</div>",
      skeleton: "<div>Initializing...</div>",
      initializer: initializer ? () => new initializer() : undefined,
      lifecycle: lifecycle ? () => new lifecycle() : undefined,
    };
  }

  /**
   * Creates metadata with component-scoped styles.
   *
   * @param selector - Component selector
   * @returns ComponentMetadata with styles scoped to Shadow DOM
   */
  static withShadowDom(selector = "shadow-component"): ComponentMetadata {
    return {
      selector,
      template: "<div>Shadow DOM component</div>",
      styles: ":host { display: block; }",
      shared: false,
    };
  }

  /**
   * Creates metadata with reactive bindings in template.
   *
   * @param selector - Component selector
   * @param bindings - Array of property names to bind
   * @returns ComponentMetadata with bindings in template
   */
  static withBindings(
    selector = "binding-component",
    bindings: string[] = ["value"],
  ): ComponentMetadata {
    const bindingTemplate = bindings.map((prop) => `{{${prop}}}`).join(" ");
    return {
      selector,
      template: `<div>${bindingTemplate}</div>`,
      shared: false,
    };
  }

  /**
   * Creates metadata with custom error template.
   *
   * @param selector - Component selector
   * @returns ComponentMetadata with errorTemplate
   */
  static withErrorTemplate(selector = "error-component"): ComponentMetadata {
    return {
      selector,
      template: "<div>Normal content</div>",
      errorTemplate: '<div class="error">Error: {{message}}</div>',
      shared: false,
    };
  }

  /**
   * Creates metadata with styles.
   *
   * @param selector - Component selector
   * @returns ComponentMetadata with styles
   */
  static withStyles(selector = "styled-component"): ComponentMetadata {
    return {
      selector,
      template: '<div class="container">Styled component</div>',
      styles: ".container { padding: 1rem; background: #f0f0f0; }",
      shared: false,
    };
  }

  /**
   * Creates a list of metadata instances for bulk testing.
   *
   * @param count - Number of instances to create
   * @returns Array of ComponentMetadata instances
   */
  static list(count: number): ComponentMetadata[] {
    return Array.from({ length: count }, (_, i) => ({
      selector: `test-component-${i}`,
      template: `<div>Component ${i}</div>`,
      shared: false,
    }));
  }
}
