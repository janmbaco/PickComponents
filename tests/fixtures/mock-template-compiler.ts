import type { ITemplateCompiler } from "../../src/rendering/templates/template-compiler.interface.js";
import type { PickComponent } from "../../src/core/pick-component.js";
import type { IDomContext } from "../../src/rendering/dom-context/dom-context.interface.js";
import type { ComponentMetadata } from "../../src/core/component-metadata.js";

/**
 * Mock implementation of ITemplateCompiler for unit testing.
 *
 * @description
 * Returns mock compiled elements without real template parsing.
 * Useful for testing components that use template compilation.
 */
export class MockTemplateCompiler implements ITemplateCompiler {
  public compileCalls: Array<{
    template: string;
    component: PickComponent;
    domContext: IDomContext;
    metadata?: ComponentMetadata;
  }> = [];

  async compile(
    template: string,
    component: PickComponent,
    domContext: IDomContext,
    metadata?: ComponentMetadata,
  ): Promise<HTMLElement> {
    this.compileCalls.push({ template, component, domContext, metadata });

    // Return mock element with template content
    const mockElement: any = {
      tagName: "DIV",
      innerHTML: template,
      ownerDocument: {
        createElement(tag: string): { tagName: string; textContent: string } {
          return { tagName: tag.toUpperCase(), textContent: "" };
        },
      },
      setAttribute: () => {},
      getAttribute: () => null,
      classList: { add: () => {}, remove: () => {}, contains: () => false },
      appendChild: () => {},
      querySelectorAll: () => [],
      _mockTemplate: template,
    };

    return mockElement;
  }

  reset(): void {
    this.compileCalls = [];
  }

  getCompileCount(): number {
    return this.compileCalls.length;
  }

  wasTemplateCompiled(template: string): boolean {
    return this.compileCalls.some((call) => call.template === template);
  }
}
