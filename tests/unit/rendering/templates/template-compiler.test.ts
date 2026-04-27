import { test as base, expect } from "@playwright/test";
import { TemplateCompiler } from "../../../../src/rendering/templates/template-compiler.js";
import { PickComponent } from "../../../../src/core/pick-component.js";
import { TemplateMother } from "../../../fixtures/template.mother.js";
import { ComponentMother } from "../../../fixtures/component.mother.js";
import { MockDomContext } from "../../../fixtures/mock-dom-context.js";
import { BindingResolver } from "../../../../src/rendering/bindings/binding-resolver.js";
import { ExpressionResolver } from "../../../../src/rendering/bindings/expression-resolver.js";
import { PropertyExtractor } from "../../../../src/rendering/bindings/property-extractor.js";
import { ManagedElementResolver } from "../../../../src/rendering/managed-host/managed-element-resolver.js";
import { ManagedElementRegistry } from "../../../../src/rendering/managed-host/managed-element-registry.js";
import { ExpressionParserService } from "../../../../src/rendering/expression-parser/expression-parser.service.js";
import { ASTEvaluator } from "../../../../src/rendering/expression-parser/evaluators/ast.evaluator.js";
import { SafeMethodValidator } from "../../../../src/rendering/expression-parser/safe-methods.js";
import { ComponentMetadataRegistry } from "../../../../src/core/component-metadata-registry.js";
import { DependencyTracker } from "../../../../src/reactive/dependency-tracker.js";
import { WeakRefObjectRegistry } from "../../../../src/utils/object-registry.js";

/**
 * Fixture for TemplateCompiler tests.
 * Provides isolated instances of TemplateCompiler, component, and DOM context.
 */
type TemplateCompilerFixture = {
  compiler: TemplateCompiler;
  component: PickComponent & Record<string, any>;
  domContext: MockDomContext;
};

/**
 * Extended Playwright test with TemplateCompiler fixtures.
 */
const test = base.extend<TemplateCompilerFixture>({
  compiler: async ({}, use) => {
    const domAdapter = TemplateMother.createMockDomAdapter();
    const parser = new ExpressionParserService();
    const metadataRegistry = new ComponentMetadataRegistry();
    const bindingResolver = new BindingResolver(
      new ExpressionResolver(
        parser,
        new ASTEvaluator(new SafeMethodValidator()),
      ),
      new PropertyExtractor(parser),
      new ManagedElementResolver(ManagedElementRegistry),
      new DependencyTracker(),
      new WeakRefObjectRegistry(),
    );
    const compiler = new TemplateCompiler(
      domAdapter,
      bindingResolver,
      metadataRegistry,
    );
    await use(compiler);
  },

  component: async ({}, use) => {
    const component = ComponentMother.forTemplateCompiler({
      message: "",
      title: "",
      firstName: "",
      lastName: "",
      value: "",
      count: 0,
      isActive: false,
      nullable: null,
      space: "",
      name: "",
      user: null,
      items: [],
    });
    await use(component);
  },

  domContext: async ({}, use) => {
    const domContext = new MockDomContext();
    await use(domContext);
  },
});

/**
 * Tests for TemplateCompiler responsibility.
 *
 * Covers:
 * - Template compilation with reactive bindings
 * - Host element projection
 * - DOM adapter integration
 * - Error handling and validation
 */
test.describe("TemplateCompiler", () => {
  /**
   * Constructor tests.
   * Validates dependency injection and error cases.
   */
  test.describe("constructor", () => {
    function createBindingResolver(): BindingResolver {
      const parser = new ExpressionParserService();
      return new BindingResolver(
        new ExpressionResolver(
          parser,
          new ASTEvaluator(new SafeMethodValidator()),
        ),
        new PropertyExtractor(parser),
        new ManagedElementResolver(ManagedElementRegistry),
        new DependencyTracker(),
        new WeakRefObjectRegistry(),
      );
    }

    test("should create instance with valid domAdapter", () => {
      // Arrange
      const domAdapter = TemplateMother.createMockDomAdapter();
      const bindingResolver = createBindingResolver();
      const metadataSource = new ComponentMetadataRegistry();

      // Act
      const compiler = new TemplateCompiler(
        domAdapter,
        bindingResolver,
        metadataSource,
      );

      // Assert
      expect(compiler).toBeDefined();
      expect(compiler).toBeInstanceOf(TemplateCompiler);
    });

    test("should validate required domAdapter", () => {
      const bindingResolver = createBindingResolver();
      const metadataSource = new ComponentMetadataRegistry();

      // Assert
      expect(
        () =>
          new TemplateCompiler(null as any, bindingResolver, metadataSource),
      ).toThrow("Dom adapter is required");
      expect(
        () =>
          new TemplateCompiler(
            undefined as any,
            bindingResolver,
            metadataSource,
          ),
      ).toThrow("Dom adapter is required");
    });
  });

  /**
   * Template compilation tests.
   * Validates template parsing, binding resolution, and element creation.
   */
  test.describe("compile()", () => {
    test("should compile simple template without bindings", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = "<div>Hello World</div>";

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result).toBeDefined();
      expect(result.tagName).toBe("DIV");
      expect(result.textContent).toBe("Hello World");
    });

    test("should validate required parameters", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Assert - templateSource validation
      await expect(
        compiler.compile(null as any, component, domContext),
      ).rejects.toThrow("Template source is required");
      await expect(
        compiler.compile(undefined as any, component, domContext),
      ).rejects.toThrow("Template source is required");
      await expect(compiler.compile("", component, domContext)).rejects.toThrow(
        "Template source is required",
      );

      // Assert - component validation
      await expect(
        compiler.compile("<div></div>", null as any, domContext),
      ).rejects.toThrow("Component is required");
      await expect(
        compiler.compile("<div></div>", undefined as any, domContext),
      ).rejects.toThrow("Component is required");

      // Assert - domContext validation
      await expect(
        compiler.compile("<div></div>", component, null as any),
      ).rejects.toThrow("DOM context is required");
      await expect(
        compiler.compile("<div></div>", component, undefined as any),
      ).rejects.toThrow("DOM context is required");
    });

    test("should add component selector as class to root element", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = "<div>Content</div>";

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result.classList.contains("testcomponent")).toBe(true);
    });

    test("should wrap multiple root elements in div with selector class", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = "<span>First</span><span>Second</span>";

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result.tagName).toBe("DIV");
      expect(result.classList.contains("testcomponent")).toBe(true);
      expect(result.children.length).toBe(2);
    });

    test("should preserve existing classes when adding selector", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = '<div class="custom-class">Content</div>';

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result.classList.contains("custom-class")).toBe(true);
      expect(result.classList.contains("testcomponent")).toBe(true);
    });

    test("should compile template with single text binding", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      component.message = "Hello";
      const template = "<div>{{message}}</div>";

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result.textContent).toBe("Hello");
    });

    test("should compile template with multiple text bindings", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      component.firstName = "John";
      component.lastName = "Doe";
      const template = "<div>{{firstName}} {{lastName}}</div>";

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result.textContent).toBe("John Doe");
    });

    test("should compile template with attribute binding", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      component.title = "Click me";
      const template = '<button title="{{title}}">Button</button>';

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result.getAttribute("title")).toBe("Click me");
    });

    test("should throw on static event handler attributes", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = '<div><img src="x" onerror="alert(1)"></div>';

      // Act & Assert
      await expect(
        compiler.compile(template, component, domContext),
      ).rejects.toThrow('Unsafe static template attribute "onerror"');
    });

    test("should throw on static event handler attributes case-insensitively", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = '<div onClick="alert(1)">x</div>';

      // Act & Assert
      await expect(
        compiler.compile(template, component, domContext),
      ).rejects.toThrow(/onClick|onclick/);
    });

    test("should throw on static javascript URL attributes", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = '<a href="javascript:alert(1)">x</a>';

      // Act & Assert
      await expect(
        compiler.compile(template, component, domContext),
      ).rejects.toThrow("Unsafe static URL");
    });

    test("should throw on static data URL attributes", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = '<a href="data:text/html,<script>alert(1)</script>">x</a>';

      // Act & Assert
      await expect(
        compiler.compile(template, component, domContext),
      ).rejects.toThrow("Unsafe static URL");
    });

    test("should preserve safe static URLs", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = '<a href="https://example.com/test">x</a>';

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result.getAttribute("href")).toBe("https://example.com/test");
    });

    test("should preserve relative static URLs", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = '<a href="/docs/start">x</a>';

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result.getAttribute("href")).toBe("/docs/start");
    });

    test("should preserve dynamic href bindings for the binding policy", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      component.url = "https://example.com/dynamic";
      const template = '<a href="{{url}}">x</a>';

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result.getAttribute("href")).toBe("https://example.com/dynamic");

      component.url = "/docs/updated";
      component.getPropertyObservable("url").notify();
      expect(result.getAttribute("href")).toBe("/docs/updated");
    });

    test("should throw on static srcdoc", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = '<iframe srcdoc="<script>alert(1)</script>"></iframe>';

      // Act & Assert
      await expect(
        compiler.compile(template, component, domContext),
      ).rejects.toThrow(/Unsafe static template element|Unsafe static template attribute "srcdoc"/);
    });

    test("should throw on static script elements", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = "<div><script>alert(1)</script><p>safe</p></div>";

      // Act & Assert
      await expect(
        compiler.compile(template, component, domContext),
      ).rejects.toThrow("Unsafe static template element <script>");
    });

    test("should throw inside native template content", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = '<template><img src="x" onerror="alert(1)"></template>';

      // Act & Assert
      await expect(
        compiler.compile(template, component, domContext),
      ).rejects.toThrow('Unsafe static template attribute "onerror"');
    });

    test("should throw inside pick-for preset templates", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      component.items = ["one"];
      const template = `
        <pick-for items="{{items}}">
          <img src="x" onerror="alert(1)">
        </pick-for>
      `;

      // Act & Assert
      await expect(
        compiler.compile(template, component, domContext),
      ).rejects.toThrow('Unsafe static template attribute "onerror"');
    });

    test("should throw when data-preset-template contains unsafe static HTML", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template =
        '<div data-preset-template=\'<img src="x" onerror="alert(1)">\'></div>';

      // Act & Assert
      await expect(
        compiler.compile(template, component, domContext),
      ).rejects.toThrow('Unsafe static template attribute "onerror"');
    });

    test("should keep dynamic text bindings as text content", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      component.payload = "<img src=x onerror=alert(1)>";
      const template = "<div>{{payload}}</div>";

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result.textContent).toContain("<img");
      expect(result.querySelector("img")).toBeNull();
    });

    test("should keep dynamic href bindings under the dynamic URL policy", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      component.badUrl = "javascript:alert(1)";
      const template = '<a href="{{badUrl}}">x</a>';

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result.hasAttribute("href")).toBe(false);
    });

    test("should preserve framework pick-select and on template syntax", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      component.error = "Boom";
      const template = `
        <pick-select>
          <on condition="{{error !== ''}}">
            <div>{{error}}</div>
          </on>
        </pick-select>
      `;

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      const pickSelect = result.matches("pick-select")
        ? result
        : result.querySelector("pick-select");
      const onElement = result.querySelector("on");
      expect(pickSelect).not.toBeNull();
      expect(onElement).not.toBeNull();
      expect(onElement?.hasAttribute("condition")).toBe(true);
    });

    test("should preserve pick-action event attributes", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template =
        '<pick-action event="run"><button>Run</button></pick-action>';

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      const pickAction = result.matches("pick-action")
        ? result
        : result.querySelector("pick-action");
      expect(pickAction).not.toBeNull();
      expect(pickAction?.getAttribute("event")).toBe("run");
    });

    test("should throw on static style attributes", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = '<div style="color:red">x</div>';

      // Act & Assert
      await expect(
        compiler.compile(template, component, domContext),
      ).rejects.toThrow('Unsafe static template attribute "style"');
    });

    test("should throw on static srcset attributes", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = '<img srcset="a.png 1x, b.png 2x">';

      // Act & Assert
      await expect(
        compiler.compile(template, component, domContext),
      ).rejects.toThrow('Unsafe static template attribute "srcset"');
    });

    test("should allow aria and data attributes", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = '<div aria-label="Hello" data-id="123">x</div>';

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result.getAttribute("aria-label")).toBe("Hello");
      expect(result.getAttribute("data-id")).toBe("123");
    });

    test("should compile template with nested property binding", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      component.user = { name: "Alice" };
      const template = "<div>{{user.name}}</div>";

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result.textContent).toBe("Alice");
    });

    test("should handle missing nested property gracefully", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      component.user = null as any;
      const template = "<div>{{user.name}}</div>";

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result.textContent).toBe("");
    });

    test("should handle undefined property gracefully", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = "<div>{{nonExistent}}</div>";

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result.textContent).toBe("");
    });

    test("should skip pick-tag children from compilation", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = '<div><pick-for items="{{items}}"></pick-for></div>';

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      const pickFor = result.querySelector("pick-for");
      expect(pickFor).toBeDefined();
    });

    test("should preserve pick-for option templates inside native select", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      component.items = ["Sprint", "Final"];
      const template = `
        <select>
          <pick-for items="{{items}}">
            <option value="{{$item}}">{{$item}}</option>
          </pick-for>
        </select>
      `;

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      const pickFor = result.querySelector("pick-for") as HTMLElement | null;
      expect(pickFor).not.toBeNull();
      expect(pickFor?.getAttribute("items")).toMatch(/^__obj_/);
      expect(pickFor?.getAttribute("data-preset-template")).toContain(
        "<option",
      );
      expect(result.querySelector("option")).toBeNull();
    });

    test("should leave pick-for inside native template content untouched", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      component.items = ["Home"];
      const template = `
        <div>
          <template data-route="/">
            <pick-for items="{{items}}">
              <li>{{$item}}</li>
            </pick-for>
          </template>
        </div>
      `;

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      const routeTemplate = result.querySelector(
        "template[data-route]",
      ) as HTMLTemplateElement | null;
      const pickFor = routeTemplate?.content.querySelector("pick-for");
      expect(pickFor).not.toBeNull();
      expect(pickFor?.getAttribute("items")).toBe("{{items}}");
      expect(pickFor?.getAttribute("data-preset-template")).toBeNull();
      expect(
        routeTemplate?.content.querySelector(
          "template[data-pick-for-template-placeholder]",
        ),
      ).toBeNull();
    });

    test("should compile deeply nested bindings", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      component.value = "Nested";
      const template =
        "<div><section><article>{{value}}</article></section></div>";

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result.textContent).toBe("Nested");
    });

    test("should handle multiple bindings to same property", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      component.value = "Shared";
      const template =
        "<div><span>{{value}}</span><span>{{value}}</span></div>";

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      const spans = result.querySelectorAll("span");
      expect(spans[0].textContent).toBe("Shared");
      expect(spans[1].textContent).toBe("Shared");
    });
  });

  test.describe("adoptExisting()", () => {
    test("should bind a prerendered root without replacing it", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      component.title = "Client title";
      component.message = "Hydrated text";

      const adapter = TemplateMother.createMockDomAdapter();
      const prerendered = adapter.createTemplateElement();
      prerendered.innerHTML =
        '<section><span title="Server title">Server text</span></section>';
      const existingRoot = prerendered.content.firstElementChild as HTMLElement;

      // Act
      const result = await compiler.adoptExisting(
        '<section><span title="{{title}}">{{message}}</span></section>',
        existingRoot,
        component,
        domContext,
      );

      // Assert
      expect(result).toBe(existingRoot);
      const span = result.querySelector("span");
      expect(span?.getAttribute("title")).toBe("Client title");
      expect(span?.textContent).toBe("Hydrated text");
      expect(result.classList.contains("testcomponent")).toBe(true);

      component.title = "Updated title";
      component.message = "Live text";
      component.getPropertyObservable("title").notify();
      component.getPropertyObservable("message").notify();

      expect(span?.getAttribute("title")).toBe("Updated title");
      expect(span?.textContent).toBe("Live text");
    });
  });

  /**
   * Edge case tests.
   * Validates boundary conditions and special scenarios.
   */
  test.describe("edge cases", () => {
    test("should handle falsy values correctly", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Assert - null renders as empty
      component.nullable = null;
      let result = await compiler.compile(
        "<div>{{nullable}}</div>",
        component,
        domContext,
      );
      expect(result.textContent).toBe("");

      // Assert - zero renders as '0'
      component.count = 0;
      result = await compiler.compile(
        "<div>{{count}}</div>",
        component,
        domContext,
      );
      expect(result.textContent).toBe("0");
    });

    test("should preserve non-binding curly braces", async ({
      compiler,
      component,
      domContext,
    }) => {
      // Arrange
      const template = "<div>{ not a binding }</div>";

      // Act
      const result = await compiler.compile(template, component, domContext);

      // Assert
      expect(result.textContent).toBe("{ not a binding }");
    });
  });
});
