import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import { Services } from "../../src/providers/service-provider.js";
import { bootstrapFramework } from "../../src/providers/framework-bootstrap.js";
import type { ITemplateCompiler } from "../../src/rendering/templates/template-compiler.interface.js";
import type { IObjectRegistry } from "../../src/utils/object-registry.js";
import { PickForItemScope } from "../../src/components/pick-for/pick-for-item-scope.js";
import { ItemDomContext } from "../../src/components/pick-for/item-dom-context.js";

/**
 * Integration tests for nested pick-for — binding to {{$item.items}}.
 *
 * These tests use the REAL TemplateCompiler, BindingResolver, and PickForItemScope
 * to verify that inner <pick-for items="{{$item.items}}"> receives an objectId
 * (not a stringified array) when compiled within an outer pick-for row context.
 */
test.describe("Nested pick-for integration", () => {
  let dom: JSDOM;
  let document: Document;
  let templateCompiler: ITemplateCompiler;
  let objectRegistry: IObjectRegistry;

  test.beforeEach(async () => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    (global as any).document = document;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).Element = dom.window.Element;
    (global as any).Node = dom.window.Node;
    (global as any).CustomEvent = dom.window.CustomEvent;
    (global as any).MutationObserver = dom.window.MutationObserver;

    Services.clear();
    await bootstrapFramework(Services);

    templateCompiler = Services.get<ITemplateCompiler>("ITemplateCompiler");
    objectRegistry = Services.get<IObjectRegistry>("IObjectRegistry");
  });

  test.afterEach(() => {
    Services.clear();
    delete (global as any).document;
    delete (global as any).HTMLElement;
    delete (global as any).Element;
    delete (global as any).Node;
    delete (global as any).CustomEvent;
    delete (global as any).MutationObserver;
  });

  test("should set items attribute to objectId (not stringified) for inner pick-for when compiling outer row template", async () => {
    // Arrange
    const innerItems = ["HTML", "CSS", "JavaScript"];
    const scope = new PickForItemScope();
    scope.setContext({
      item: { id: 1, name: "Frontend", items: innerItems },
      index: 0,
      key: 1,
      count: 1,
    });
    const domContext = new ItemDomContext(document.createElement("div"));

    const templateHtml = `
      <details>
        <summary>{{$item.name}}</summary>
        <ul>
          <pick-for items="{{$item.items}}">
            <li>{{$item}}</li>
          </pick-for>
        </ul>
      </details>
    `;

    // Act
    const compiled = await templateCompiler.compile(
      templateHtml,
      scope,
      domContext,
    );

    // Assert — inner pick-for must have items as an objectId, not a string
    const innerFor = compiled.querySelector("pick-for");
    expect(innerFor).not.toBeNull();

    const attrValue = innerFor!.getAttribute("items");
    expect(
      attrValue,
      "items attribute should be an objectId, not a stringified array",
    ).toMatch(/^__obj_/);

    const resolved = objectRegistry.get<unknown[]>(attrValue!);
    expect(resolved).toEqual(["HTML", "CSS", "JavaScript"]);
  });

  test("should set data-preset-template attribute on inner pick-for elements after compile to prevent connectedCallback ordering race", async () => {
    // Arrange — simulates TemplateCompiler compiling the outer row template
    const innerItems = ["HTML", "CSS", "JavaScript"];
    const scope = new PickForItemScope();
    scope.setContext({
      item: { id: 1, name: "Frontend", items: innerItems },
      index: 0,
      key: 1,
      count: 1,
    });
    const domContext = new ItemDomContext(document.createElement("div"));

    const templateHtml = `
      <details>
        <summary>{{$item.name}}</summary>
        <ul>
          <pick-for items="{{$item.items}}">
            <li>{{$item}}</li>
          </pick-for>
        </ul>
      </details>
    `;

    // Act
    const compiled = await templateCompiler.compile(
      templateHtml,
      scope,
      domContext,
    );

    // Assert — inner pick-for must have data-preset-template attribute set
    // before DOM insertion, so connectedCallback ordering doesn't corrupt it
    const innerFor = compiled.querySelector("pick-for") as HTMLElement;
    expect(innerFor).not.toBeNull();

    // The data-preset-template attribute must contain the inner template HTML
    const presetAttr = innerFor!.getAttribute("data-preset-template");
    expect(presetAttr).not.toBeNull();
    expect(presetAttr!.trim()).toContain("<li>");

    // items attribute must already be a valid objectId (binding ran correctly)
    const attrValue = innerFor!.getAttribute("items");
    expect(attrValue).toMatch(/^__obj_/);

    // Verify the objectId resolves to the correct array
    const resolved = objectRegistry.get<unknown[]>(attrValue!);
    expect(resolved).toEqual(["HTML", "CSS", "JavaScript"]);
  });

  test("should resolve objectId for each category row in a multi-row scenario", async () => {
    // Arrange
    const categories = [
      { id: 1, name: "Frontend", items: ["HTML", "CSS"] },
      { id: 2, name: "Backend", items: ["Node.js", "Python", "Go"] },
    ];
    const templateHtml = `
      <details>
        <summary>{{$item.name}}</summary>
        <ul>
          <pick-for items="{{$item.items}}">
            <li>{{$item}}</li>
          </pick-for>
        </ul>
      </details>
    `;

    for (const category of categories) {
      // Arrange per-row
      const scope = new PickForItemScope();
      scope.setContext({
        item: category,
        index: 0,
        key: category.id,
        count: categories.length,
      });
      const domContext = new ItemDomContext(document.createElement("div"));

      // Act
      const compiled = await templateCompiler.compile(
        templateHtml,
        scope,
        domContext,
      );

      // Assert
      const innerFor = compiled.querySelector("pick-for");
      const attrValue = innerFor!.getAttribute("items");
      expect(
        attrValue,
        `Row "${category.name}" — items attribute must be an objectId`,
      ).toMatch(/^__obj_/);

      const resolved = objectRegistry.get<unknown[]>(attrValue!);
      expect(resolved).toEqual(category.items);
    }
  });

  test("should NOT stringify the array via expressionResolver for {{$item.items}} binding", async () => {
    // Arrange — verifies the stringified form "HTML,CSS,JavaScript" does NOT appear
    const scope = new PickForItemScope();
    scope.setContext({
      item: { id: 3, name: "DevOps", items: ["Docker", "Kubernetes", "CI/CD"] },
      index: 0,
      key: 3,
      count: 1,
    });
    const domContext = new ItemDomContext(document.createElement("div"));

    const templateHtml = `<div><pick-for items="{{$item.items}}"><li>{{$item}}</li></pick-for></div>`;

    // Act
    const compiled = await templateCompiler.compile(
      templateHtml,
      scope,
      domContext,
    );

    // Assert — attribute must NOT be "Docker,Kubernetes,CI/CD"
    const innerFor = compiled.querySelector("pick-for");
    const attrValue = innerFor!.getAttribute("items");
    expect(attrValue).not.toBe("Docker,Kubernetes,CI/CD");
    expect(attrValue).not.toContain(",");
    expect(attrValue).toMatch(/^__obj_/);
  });
});
