import { PickComponent } from "../../src/core/pick-component.js";
import { ComponentMetadataRegistry } from "../../src/core/component-metadata-registry.js";
import { ICompiledTemplate } from "../../src/rendering/templates/compiled-template.interface.js";
import { IDomAdapter } from "../../src/rendering/dom/dom-adapter.interface.js";
import { ExpressionResolver } from "../../src/rendering/bindings/expression-resolver.js";
import { ExpressionParserService } from "../../src/rendering/expression-parser/expression-parser.service.js";
import { ASTEvaluator } from "../../src/rendering/expression-parser/evaluators/ast.evaluator.js";
import { SafeMethodValidator } from "../../src/rendering/expression-parser/safe-methods.js";
import { Window } from "happy-dom";

/**
 * Test fixture for template-related test data.
 * Provides helper methods for creating template test objects following the Mother Object pattern.
 * Uses happy-dom for accurate DOM simulation in tests.
 */
export class TemplateMother {
  /**
   * Creates a simple compiled template with basic binding.
   *
   * @param templateString - Template HTML string
   * @param bindings - Set of binding names
   * @returns ICompiledTemplate instance
   */
  static createCompiledTemplate(
    templateString: string = "<div>{{message}}</div>",
    bindings: Set<string> = new Set(["message"]),
  ): ICompiledTemplate {
    return {
      templateString,
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

  /**
   * Creates a compiled template with multiple bindings.
   *
   * @returns ICompiledTemplate with multiple bindings
   */
  static createComplexTemplate(): ICompiledTemplate {
    return TemplateMother.createCompiledTemplate(
      '<div class="{{className}}">{{title}} - {{count}} items</div>',
      new Set(["className", "title", "count"]),
    );
  }

  /**
   * Creates a compiled template with nested property bindings.
   *
   * @returns ICompiledTemplate with nested bindings
   */
  static createNestedBindingTemplate(): ICompiledTemplate {
    return TemplateMother.createCompiledTemplate(
      "<div>{{user.profile.name}} ({{user.email}})</div>",
      new Set(["user.profile.name", "user.email"]),
    );
  }

  /**
   * Creates a template string with slot projection.
   *
   * @returns Template HTML with native slot elements
   */
  static createTemplateWithSlots(): string {
    return `
      <div class="card">
        <header><slot name="header">Default Header</slot></header>
        <main><slot>Default Content</slot></main>
        <footer><slot name="footer">Default Footer</slot></footer>
      </div>
    `.trim();
  }

  /**
   * Creates slot content for projection tests.
   *
   * @returns HTML string with slot attributes
   */
  static createSlotContent(): string {
    return `
      <h1 slot="header">Custom Header</h1>
      <p>Custom main content paragraph</p>
      <span slot="footer">Custom Footer</span>
    `.trim();
  }

  /**
   * Creates a mock DOM adapter using happy-dom for accurate DOM simulation.
   *
   * @returns IDomAdapter implementation backed by happy-dom
   */
  static createMockDomAdapter(): IDomAdapter {
    const window = new Window();
    const document = window.document;

    return {
      createTemplateElement: () => {
        return document.createElement("template") as any;
      },

      createElement: (tagName: string) => {
        return document.createElement(tagName) as any;
      },
    };
  }

  /**
   * Creates a real ExpressionResolver backed by the framework parser/evaluator.
   */
  static createExpressionResolver(): ExpressionResolver {
    return new ExpressionResolver(
      new ExpressionParserService(),
      new ASTEvaluator(new SafeMethodValidator()),
    );
  }

  /**
   * Creates a minimal mock PickComponent for testing.
   *
   * @param properties - Initial properties for the component
   * @returns Mock PickComponent instance
   */
  static createMockComponent(
    properties: Record<string, any> = {},
  ): PickComponent {
    const component = {
      ...properties,
      getPropertyObservable: (_prop: string) => ({
        subscribe: (_callback: () => void) => ({ unsubscribe: () => {} }),
      }),
      constructor: {
        name: "MockComponent",
      },
    } as any;

    const metadataRegistry = new ComponentMetadataRegistry();
    if (!metadataRegistry.has("mock-component")) {
      metadataRegistry.register("mock-component", {
        selector: "mock-component",
        template: "<div>{{message}}</div>",
      });
    }

    return component;
  }

  /**
   * Creates a template with static bindings.
   *
   * @returns Template string with [[CONSTANT]] and [[RULES.field]] bindings
   */
  static createTemplateWithStaticBindings(): string {
    return `
      <form>
        <input [[RULES.username]] class="[[Styles.INPUT]]" placeholder="Username" />
        <input [[RULES.password]] class="[[Styles.INPUT]]" type="password" />
        <button event="[[Events.SUBMIT]]">Login</button>
      </form>
    `.trim();
  }

  /**
   * Creates a template with reactive bindings.
   *
   * @returns Template string with {{property}} bindings
   */
  static createTemplateWithReactiveBindings(): string {
    return `
      <div class="{{theme}}">
        <h1>{{title}}</h1>
        <p>{{description}}</p>
        <span>Count: {{count}}</span>
      </div>
    `.trim();
  }

  /**
   * Creates a template with both static and reactive bindings.
   *
   * @returns Template string with mixed binding types
   */
  static createTemplateWithMixedBindings(): string {
    return `
      <div class="[[Styles.CONTAINER]] {{theme}}">
        <input [[RULES.email]] value="{{email}}" />
      </div>
    `.trim();
  }
}
