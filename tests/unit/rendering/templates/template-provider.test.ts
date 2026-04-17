import { test as base, expect } from "@playwright/test";
import { ComponentMetadataRegistry } from "../../../../src/core/component-metadata-registry.js";
import { TemplateProvider } from "../../../../src/rendering/templates/template-provider.js";
import { TemplateMother } from "../../../fixtures/template.mother.js";
import { PickComponent } from "../../../../src/core/pick-component.js";
import { RenderOptions } from "../../../../src/rendering/render-engine.js";

type TemplateProviderFixture = {
  provider: TemplateProvider;
  metadataRegistry: ComponentMetadataRegistry;
  rulesResolver: any;
  domAdapter: any;
  createRenderOptions: (
    component: PickComponent,
    hostElement?: HTMLElement,
  ) => RenderOptions<PickComponent>;
};

const test = base.extend<TemplateProviderFixture>({
  metadataRegistry: async ({}, use) => {
    await use(new ComponentMetadataRegistry());
  },

  domAdapter: async ({}, use: (r: any) => Promise<void>) => {
    const adapter = TemplateMother.createMockDomAdapter();
    await use(adapter);
  },

  rulesResolver: async ({}, use: (r: any) => Promise<void>) => {
    const resolver = {
      resolve: (template: string, rules: any) => {
        let result = template;
        Object.entries(rules).forEach(([key, value]: [string, any]) => {
          const pattern = new RegExp(`\\[\\[RULES\\.${key}\\]\\]`, "g");
          let attributes = "";
          if (value.required) attributes += " required";
          if (value.minlength) attributes += ` minlength="${value.minlength}"`;
          if (value.maxlength) attributes += ` maxlength="${value.maxlength}"`;
          result = result.replace(pattern, attributes);
        });
        return result;
      },
    };
    await use(resolver);
  },

  provider: async ({ rulesResolver, metadataRegistry }, use) => {
    const provider = new TemplateProvider(rulesResolver, metadataRegistry);
    await use(provider);
  },

  createRenderOptions: async ({ domAdapter }, use) => {
    const createRenderOptions = (
      component: PickComponent,
      hostElement?: HTMLElement,
    ): RenderOptions<PickComponent> => {
      const targetRoot = domAdapter.createElement("div") as HTMLElement;
      return {
        componentId: "test-component",
        component,
        targetRoot,
        hostElement,
      };
    };
    await use(createRenderOptions);
  },
});

test.describe("TemplateProvider", () => {
  test.describe("constructor", () => {
    test("should create instance with valid dependencies", ({ provider }) => {
      expect(provider).toBeDefined();
      expect(provider.getSource).toBeDefined();
    });

    test("should throw error when rulesResolver is null", () => {
      expect(() => new TemplateProvider(null as any)).toThrow(
        "RulesResolver is required",
      );
    });

    test("should throw error when rulesResolver is undefined", () => {
      expect(() => new TemplateProvider(undefined as any)).toThrow(
        "RulesResolver is required",
      );
    });
  });

  test.describe("getSource()", () => {
    test("should throw error when component is null", async ({
      provider,
      createRenderOptions,
    }) => {
      const component = new TestComponent();
      const options = createRenderOptions(component);

      await expect(provider.getSource(null as any, options)).rejects.toThrow(
        "Component is required",
      );
    });

    test("should throw error when options are missing", async ({
      provider,
    }) => {
      const component = new TestComponent();

      await expect(provider.getSource(component, null as any)).rejects.toThrow(
        "Options are required",
      );
    });

    test("should return default template when component has no metadata", async ({
      provider,
      createRenderOptions,
    }) => {
      const component = new TestComponent();
      const options = createRenderOptions(component);

      const result = await provider.getSource(component, options);

      expect(result).toBe("<slot></slot>");
    });

    test("should return template from component metadata", async ({
      provider,
      metadataRegistry,
      createRenderOptions,
    }) => {
      const component = new TestComponent();
      metadataRegistry.register("test-component", {
        selector: "test-component",
        template: "<div>{{message}}</div>",
      });
      const options = createRenderOptions(component);

      const result = await provider.getSource(component, options);

      expect(result).toBe("<div>{{message}}</div>");
    });

    test("should preprocess validation rules bindings", async ({
      provider,
      metadataRegistry,
      createRenderOptions,
    }) => {
      const component = new TestComponent();
      component.rules = { username: { required: true, minlength: 3 } };
      metadataRegistry.register("test-component", {
        selector: "test-component",
        template: "<input [[RULES.username]] />",
      });
      const options = createRenderOptions(component);

      const result = await provider.getSource(component, options);

      expect(result).toContain("required");
      expect(result).toContain('minlength="3"');
      expect(result).not.toContain("[[RULES.username]]");
    });

    test("should keep non-RULES [[...]] literals untouched", async ({
      provider,
      metadataRegistry,
      createRenderOptions,
    }) => {
      const component = new TestComponent();
      component.rules = { email: { required: true } };
      metadataRegistry.register("test-component", {
        selector: "test-component",
        template: '<input class="[[Styles.INPUT]]" [[RULES.email]] />',
      });
      const options = createRenderOptions(component);

      const result = await provider.getSource(component, options);

      expect(result).toContain("[[Styles.INPUT]]");
      expect(result).toContain("required");
      expect(result).not.toContain("[[RULES.email]]");
    });

    test("should preserve literal [[...]] placeholders when no matching rules exist", async ({
      provider,
      metadataRegistry,
      createRenderOptions,
    }) => {
      const component = new TestComponent();
      metadataRegistry.register("test-component", {
        selector: "test-component",
        template: "<div>[[I18N.TITLE]] {{binding}}</div>",
      });
      const options = createRenderOptions(component);

      const result = await provider.getSource(component, options);

      expect(result).toContain("[[I18N.TITLE]]");
      expect(result).toContain("{{binding}}");
    });

    test("should keep reactive bindings intact while resolving rules", async ({
      provider,
      metadataRegistry,
      createRenderOptions,
    }) => {
      const component = new TestComponent();
      component.rules = { password: { required: true, minlength: 8 } };
      metadataRegistry.register("test-component", {
        selector: "test-component",
        template:
          '<input [[RULES.password]] type="password" value="{{password}}" />',
      });
      const options = createRenderOptions(component);

      const result = await provider.getSource(component, options);

      expect(result).toContain("required");
      expect(result).toContain('minlength="8"');
      expect(result).toContain("{{password}}");
    });
  });
});

class TestComponent extends PickComponent {
  rules: Record<string, any> = {};
}
