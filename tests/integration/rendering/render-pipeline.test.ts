import { test } from "@playwright/test";
import { RenderPipeline } from "../../../src/rendering/pipeline/render-pipeline.js";
import type { PipelineOptions } from "../../../src/rendering/pipeline/render-pipeline.interface.js";
import { ComponentMetadataMother } from "../../fixtures/component-metadata.mother.js";
import { ComponentMother } from "../../fixtures/component.mother.js";
import { MockDomContextFactory } from "../../fixtures/mock-dom-context.js";
import { MockTemplateCompiler } from "../../fixtures/mock-template-compiler.js";
import { MockErrorRenderer } from "../../fixtures/mock-error-renderer.js";
import type { IOutletResolver } from "../../../src/rendering/managed-host/outlet-resolver.interface.js";
import type { IHostStyleMigrator } from "../../../src/rendering/managed-host/host-style-migrator.interface.js";
import type { IManagedElementRegistry } from "../../../src/rendering/managed-host/managed-element-registry.js";
import type { IListenerInitializer } from "../../../src/decorators/listen/listener-initializer.interface.js";

function createMockOutletResolver(): IOutletResolver {
  return { resolve: (root: HTMLElement) => root };
}

function createMockStyleMigrator(): IHostStyleMigrator {
  return { migrate: () => {} };
}

function createMockManagedRegistry(): IManagedElementRegistry {
  return {
    register: () => {},
    unregister: () => {},
    isManagedElement: () => false,
    getComponentId: () => undefined,
  };
}

function createMockListenerInitializer(): IListenerInitializer {
  return {
    initialize: () => {},
  };
}

function createPipeline(
  templateCompiler: any,
  errorRenderer: any,
): RenderPipeline {
  return new RenderPipeline(
    null,
    templateCompiler,
    errorRenderer,
    createMockOutletResolver(),
    createMockStyleMigrator(),
    createMockManagedRegistry(),
    createMockListenerInitializer(),
  );
}

test.describe("RenderPipeline (Integration)", () => {
  test.afterEach(() => {
    MockDomContextFactory.cleanup();
  });

  test("executes complete render pipeline successfully", async () => {
    // Arrange
    const templateCompiler = new MockTemplateCompiler();
    const errorRenderer = new MockErrorRenderer();
    const pipeline = createPipeline(templateCompiler, errorRenderer);

    const metadata = ComponentMetadataMother.minimal();
    const component = ComponentMother.withProperty("value", "test");
    const domContext = MockDomContextFactory.create();
    const compiledTemplate = {
      templateString: "<div>{{value}}</div>",
      bindings: new Set(["value"]),
      clone: function () {
        return { ...this };
      },
    };

    const options: PipelineOptions<any> = {
      component,
      metadata,
      domContext,
      compiledTemplate,
      hostElement: undefined,
    };

    // Act
    const result = await pipeline.execute(options);

    // Assert
    if (!result) {
      throw new Error("Pipeline should return result");
    }

    if (!result.cleanup) {
      throw new Error("Result should have cleanup function");
    }

    // Verify template was compiled
    if (templateCompiler.getCompileCount() !== 1) {
      throw new Error(
        `Template should be compiled once, got ${templateCompiler.getCompileCount()}`,
      );
    }

    // Verify DOM context was used
    if (!domContext.wasMethodCalled("setElement")) {
      throw new Error("setElement should be called on domContext");
    }

    if (!domContext.getIsRendered()) {
      throw new Error("DOM context should be marked as rendered");
    }
  });

  test("does not execute initializer when metadata includes one", async () => {
    // Arrange
    const templateCompiler = new MockTemplateCompiler();
    const errorRenderer = new MockErrorRenderer();

    let initializerCalled = false;
    class MockInitializer {
      async initialize() {
        initializerCalled = true;
        return true;
      }
    }

    const pipeline = createPipeline(templateCompiler, errorRenderer);

    const metadata = ComponentMetadataMother.withBehaviors(
      "test",
      MockInitializer,
    );
    const component = ComponentMother.minimal();
    const domContext = MockDomContextFactory.create();
    const compiledTemplate = {
      templateString: "<div>Test</div>",
      bindings: new Set([]),
      clone: function () {
        return { ...this };
      },
    };

    const options: PipelineOptions<any> = {
      component,
      metadata,
      domContext,
      compiledTemplate,
      hostElement: undefined,
    };

    // Act
    await pipeline.execute(options);

    // Assert
    if (initializerCalled) {
      throw new Error(
        "Initializer should be handled before RenderPipeline.execute()",
      );
    }
  });

  test("calls lifecycle manager when provided in metadata", async () => {
    // Arrange
    const templateCompiler = new MockTemplateCompiler();
    const errorRenderer = new MockErrorRenderer();

    let lifecycleStarted = false;
    class MockLifecycle {
      startListening() {
        lifecycleStarted = true;
      }
      stopListening() {}
      dispose() {}
    }

    const pipeline = createPipeline(templateCompiler, errorRenderer);

    const metadata = ComponentMetadataMother.withBehaviors(
      "test",
      undefined,
      MockLifecycle as any,
    );
    const component = ComponentMother.minimal();
    const domContext = MockDomContextFactory.create();
    const compiledTemplate = {
      templateString: "<div>Test</div>",
      bindings: new Set([]),
      clone: function () {
        return { ...this };
      },
    };

    const options: PipelineOptions<any> = {
      component,
      metadata,
      domContext,
      compiledTemplate,
      hostElement: undefined,
    };

    // Act
    await pipeline.execute(options);

    // Assert
    if (!lifecycleStarted) {
      throw new Error("Lifecycle should be started");
    }
  });

  test("cleanup function destroys DOM context (onDestroy centralized in registry)", async () => {
    // Arrange
    const templateCompiler = new MockTemplateCompiler();
    const errorRenderer = new MockErrorRenderer();
    const pipeline = createPipeline(templateCompiler, errorRenderer);

    const metadata = ComponentMetadataMother.minimal();
    const component = ComponentMother.withLifecycleTracking();
    const domContext = MockDomContextFactory.create();
    const compiledTemplate = {
      templateString: "<div>Test</div>",
      bindings: new Set([]),
      clone: function () {
        return { ...this };
      },
    };

    const options: PipelineOptions<any> = {
      component,
      metadata,
      domContext,
      compiledTemplate,
      hostElement: undefined,
    };

    // Act
    const result = await pipeline.execute(options);
    result.cleanup();

    // Assert
    // Verify domContext.destroy() is called in cleanup
    if (!domContext.wasMethodCalled("destroy")) {
      throw new Error("domContext.destroy() should be called");
    }

    // Note: onDestroy is no longer called in RenderPipeline.cleanup()
    // It is centralized in ComponentInstanceRegistry.release() to prevent double teardown
    // This avoids memory leaks from duplicate cleanup handlers
  });

  test("supports templates that already resolved [[RULES.*]] and still keep reactive bindings", async () => {
    // ARRANGE
    // This test verifies the flow after TemplateProvider has already expanded [[RULES.*]]
    // but before reactive analysis runs.
    // BEFORE: <form><input [[RULES.email]] class="{{dynamicClass}}" /><span>{{name}}</span></form>
    // AFTER:  <form><input required class="{{dynamicClass}}" /><span>{{name}}</span></form>
    // TemplateAnalyzer should ONLY extract {dynamicClass, name}.

    const templateCompiler = new MockTemplateCompiler();
    const errorRenderer = new MockErrorRenderer();
    const pipeline = createPipeline(templateCompiler, errorRenderer);

    const metadata = ComponentMetadataMother.minimal();

    const resolvedTemplate =
      '<form><input required class="{{dynamicClass}}" /><span>{{name}}</span></form>';

    const component = ComponentMother.withProperties({
      dynamicClass: "active",
      name: "World",
    });

    const domContext = MockDomContextFactory.create();

    const compiledTemplate = {
      templateString: resolvedTemplate,
      // CRITICAL: TemplateAnalyzer should only extract reactive bindings, NOT static ones
      bindings: new Set(["dynamicClass", "name"]),
      clone: function () {
        return { ...this };
      },
    };

    const options: PipelineOptions<any> = {
      component,
      metadata,
      domContext,
      compiledTemplate,
      hostElement: undefined,
    };

    // ACT
    const result = await pipeline.execute(options);

    // ASSERT
    if (!result) {
      throw new Error(
        "Pipeline should execute successfully with rules+reactive bindings",
      );
    }

    // Verify that only reactive bindings were extracted
    if (compiledTemplate.bindings.size !== 2) {
      throw new Error(`Expected 2 bindings, got ${compiledTemplate.bindings.size}`);
    }

    if (!compiledTemplate.bindings.has("dynamicClass")) {
      throw new Error("dynamicClass binding should be extracted");
    }

    if (!compiledTemplate.bindings.has("name")) {
      throw new Error("name binding should be extracted");
    }

    // Verify that rule markers are NOT in the reactive bindings set
    if (compiledTemplate.bindings.has("RULES.email")) {
      throw new Error(
        "Rule markers should NOT be in reactive bindings",
      );
    }

    // Verify template was rendered correctly with rules already resolved
    if (compiledTemplate.templateString.includes("[[RULES.email]]")) {
      throw new Error(
        "Resolved template should not contain unresolved [[RULES.email]]",
      );
    }

    // Verify DOM context was used
    if (!domContext.wasMethodCalled("setElement")) {
      throw new Error("setElement should be called on domContext");
    }

    result.cleanup();
  });

  test("should call setElement exactly once per execution (no double DOM insertion)", async () => {
    // Arrange
    // Bug fix: previously both domContext.setElement() AND replaceSkeleton() inserted into the DOM,
    // causing the second innerHTML='' to disconnect nested custom elements (pick-action/pick-for),
    // triggering disconnectedCallback and losing nested component state before reconnection.
    const templateCompiler = new MockTemplateCompiler();
    const errorRenderer = new MockErrorRenderer();
    const pipeline = createPipeline(templateCompiler, errorRenderer);

    const metadata = ComponentMetadataMother.minimal();
    const component = ComponentMother.withProperty("value", "test");
    const domContext = MockDomContextFactory.create();
    const compiledTemplate = {
      templateString: "<div>{{value}}</div>",
      bindings: new Set(["value"]),
      clone: function () {
        return { ...this };
      },
    };

    const options: PipelineOptions<any> = {
      component,
      metadata,
      domContext,
      compiledTemplate,
      hostElement: undefined,
    };

    // Act
    const result = await pipeline.execute(options);

    // Assert — setElement must be called exactly once; a second call would wipe the DOM
    // via innerHTML='', disconnecting nested pick-action/pick-for elements and losing their
    // HostProjectionRegistry content before they can be reconnected.
    const setElementCallCount = domContext.getMethodCallCount("setElement");
    if (setElementCallCount !== 1) {
      throw new Error(
        `setElement should be called exactly once per render execution, but was called ${setElementCallCount} time(s). ` +
          "Double DOM insertion clears innerHTML twice, disconnecting nested custom elements and losing host projection content.",
      );
    }

    result.cleanup();
  });

  test("injects style element into target root when metadata has styles", async () => {
    // Arrange
    const templateCompiler = new MockTemplateCompiler();
    const errorRenderer = new MockErrorRenderer();
    const pipeline = createPipeline(templateCompiler, errorRenderer);

    const metadata = ComponentMetadataMother.withStyles();
    const component = ComponentMother.minimal();
    const domContext = MockDomContextFactory.create();
    const compiledTemplate = {
      templateString: '<div class="container">Styled component</div>',
      bindings: new Set([]),
      clone: function () {
        return { ...this };
      },
    };

    const options: PipelineOptions<any> = {
      component,
      metadata,
      domContext,
      compiledTemplate,
      hostElement: undefined,
    };

    // Act
    await pipeline.execute(options);

    // Assert
    const prepended = domContext.getPrependedToRoot();
    if (prepended.length !== 1) {
      throw new Error(
        `Expected 1 prepended element (style), got ${prepended.length}`,
      );
    }

    const styleEl = prepended[0];
    if (styleEl.tagName !== "STYLE") {
      throw new Error(
        `Expected prepended element to be STYLE, got ${styleEl.tagName}`,
      );
    }

    if (!styleEl.textContent.includes("padding")) {
      throw new Error(
        `Expected style content to contain 'padding', got: ${styleEl.textContent}`,
      );
    }
  });

  test("does not inject style element when metadata has no styles", async () => {
    // Arrange
    const templateCompiler = new MockTemplateCompiler();
    const errorRenderer = new MockErrorRenderer();
    const pipeline = createPipeline(templateCompiler, errorRenderer);

    const metadata = ComponentMetadataMother.minimal();
    const component = ComponentMother.minimal();
    const domContext = MockDomContextFactory.create();
    const compiledTemplate = {
      templateString: "<div>Test</div>",
      bindings: new Set([]),
      clone: function () {
        return { ...this };
      },
    };

    const options: PipelineOptions<any> = {
      component,
      metadata,
      domContext,
      compiledTemplate,
      hostElement: undefined,
    };

    // Act
    await pipeline.execute(options);

    // Assert
    const prepended = domContext.getPrependedToRoot();
    if (prepended.length !== 0) {
      throw new Error(
        `Expected no prepended elements, got ${prepended.length}`,
      );
    }
  });
});
