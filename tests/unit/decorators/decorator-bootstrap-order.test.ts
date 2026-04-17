import { test, expect } from "@playwright/test";
import { Pick } from "../../../src/decorators/pick.decorator.js";
import { PickRender } from "../../../src/decorators/pick-render.decorator.js";
import { Services } from "../../../src/providers/service-provider.js";

test.describe("Decorator bootstrap order", () => {
  test.beforeEach(() => {
    Services.clear();
  });

  test.afterEach(() => {
    Services.clear();
  });

  test("should throw explicit error when PickRender is evaluated before bootstrap", () => {
    // Arrange
    const defineComponent = () => {
      @PickRender({
        selector: "before-bootstrap-render",
        template: "<div>content</div>",
      })
      class BeforeBootstrapRenderComponent {}

      return BeforeBootstrapRenderComponent;
    };

    // Act & Assert
    expect(defineComponent).toThrow(
      "[PickRender] Framework services are not available. " +
        "Call bootstrapFramework(Services) before importing or defining components " +
        "that use @PickRender. Missing service: 'IComponentMetadataRegistry'.",
    );
  });

  test("should throw explicit error when Pick is evaluated before bootstrap", () => {
    // Arrange
    const defineComponent = () => {
      @Pick("before-bootstrap-pick", (ctx) => {
        ctx.html("<div>content</div>");
      })
      class BeforeBootstrapPickComponent {}

      return BeforeBootstrapPickComponent;
    };

    // Act & Assert
    expect(defineComponent).toThrow(
      "[Pick] Framework services are not available. " +
        "Call bootstrapFramework(Services) before importing or defining components " +
        "that use @Pick. Missing service: 'IPickComponentFactory'.",
    );
  });
});
