import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import { TemplateStaticValidator } from "../../../../src/rendering/templates/template-static-validator.js";

/**
 * Unit tests for TemplateStaticValidator.
 *
 * Verifies that unsafe elements, blocked attributes (on*, style, srcdoc, srcset),
 * and unsafe URL protocols are caught at compile time with descriptive errors.
 */
test.describe("TemplateStaticValidator", () => {
  let document: Document;
  let validator: TemplateStaticValidator;

  test.beforeEach(() => {
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    (global as any).document = document;
    validator = new TemplateStaticValidator();
  });

  test.afterEach(() => {
    delete (global as any).document;
  });

  function fragmentFrom(html: string): DocumentFragment {
    const template = document.createElement("template");
    template.innerHTML = html;
    return template.content;
  }

  test.describe("dangerous elements", () => {
    const dangerousElements = [
      "script",
      "iframe",
      "object",
      "embed",
      "applet",
      "base",
      "meta",
      "link",
    ];

    dangerousElements.forEach((tag) => {
      test(`should throw when template contains <${tag}>`, () => {
        // Arrange
        const fragment = fragmentFrom(`<div><${tag}></${tag}></div>`);

        // Act & Assert
        expect(() => validator.validate(fragment)).toThrow(
          `[PickComponents] Unsafe static template element <${tag}> found.`,
        );
      });
    });
  });

  test.describe("on* event handler attributes", () => {
    test("should throw for onclick with a literal value", () => {
      // Arrange
      const fragment = fragmentFrom(`<button onclick="alert(1)">click</button>`);

      // Act & Assert
      expect(() => validator.validate(fragment)).toThrow(
        `[PickComponents] Unsafe static template attribute "onclick" found on <button>.`,
      );
    });

    test("should throw for onclick with a binding value", () => {
      // Arrange
      const fragment = fragmentFrom(`<button onclick="{{handler}}">click</button>`);

      // Act & Assert
      expect(() => validator.validate(fragment)).toThrow(
        `[PickComponents] Unsafe static template attribute "onclick" found on <button>.`,
      );
    });

    test("should throw for onerror on an img element", () => {
      // Arrange
      const fragment = fragmentFrom(`<img src="/img.png" onerror="alert(1)">`);

      // Act & Assert
      expect(() => validator.validate(fragment)).toThrow(
        `[PickComponents] Unsafe static template attribute "onerror" found on <img>.`,
      );
    });

    test("should throw for onload regardless of case", () => {
      // Arrange — browsers normalise to lowercase but validate the normalised form
      const fragment = fragmentFrom(`<svg onload="alert(1)"></svg>`);

      // Act & Assert
      expect(() => validator.validate(fragment)).toThrow(
        `[PickComponents] Unsafe static template attribute "onload" found on <svg>.`,
      );
    });

    test("error message should instruct to use @Listen or pick-action instead", () => {
      // Arrange
      const fragment = fragmentFrom(`<div onclick="{{x}}"></div>`);

      // Act & Assert
      expect(() => validator.validate(fragment)).toThrow(
        "Use @Listen, pick-action, lifecycle methods, or a dedicated component instead.",
      );
    });
  });

  test.describe("blocked attributes: style", () => {
    test("should throw for style with a literal value", () => {
      // Arrange
      const fragment = fragmentFrom(`<div style="color:red">text</div>`);

      // Act & Assert
      expect(() => validator.validate(fragment)).toThrow(
        `[PickComponents] Unsafe static template attribute "style" found on <div>.`,
      );
    });

    test("should throw for style with a binding value", () => {
      // Arrange
      const fragment = fragmentFrom(`<div style="{{cssText}}">text</div>`);

      // Act & Assert
      expect(() => validator.validate(fragment)).toThrow(
        `[PickComponents] Unsafe static template attribute "style" found on <div>.`,
      );
    });

    test("error message should instruct to use classes instead", () => {
      // Arrange
      const fragment = fragmentFrom(`<div style="color:red"></div>`);

      // Act & Assert
      expect(() => validator.validate(fragment)).toThrow(
        "Use classes, CSS parts, or component-scoped styles instead.",
      );
    });
  });

  test.describe("blocked attributes: srcdoc", () => {
    test("should throw for srcdoc with a literal value", () => {
      // Arrange — use div; iframe is already blocked as a dangerous element
      const fragment = fragmentFrom(`<div srcdoc="<p>hi</p>"></div>`);

      // Act & Assert
      expect(() => validator.validate(fragment)).toThrow(
        `[PickComponents] Unsafe static template attribute "srcdoc" found on <div>.`,
      );
    });

    test("should throw for srcdoc with a binding value", () => {
      // Arrange — use div; iframe is already blocked as a dangerous element
      const fragment = fragmentFrom(`<div srcdoc="{{content}}"></div>`);

      // Act & Assert
      expect(() => validator.validate(fragment)).toThrow(
        `[PickComponents] Unsafe static template attribute "srcdoc" found on <div>.`,
      );
    });

    test("error message should explain the risk", () => {
      // Arrange
      const fragment = fragmentFrom(`<div srcdoc="{{x}}"></div>`);

      // Act & Assert
      expect(() => validator.validate(fragment)).toThrow(
        "The srcdoc attribute creates an executable HTML document",
      );
    });
  });

  test.describe("blocked attributes: srcset", () => {
    test("should throw for srcset with any value", () => {
      // Arrange
      const fragment = fragmentFrom(`<img src="/a.png" srcset="/a.png 1x, /b.png 2x">`);

      // Act & Assert
      expect(() => validator.validate(fragment)).toThrow(
        `[PickComponents] Unsafe static template attribute "srcset" found on <img>.`,
      );
    });
  });

  test.describe("unsafe URL protocols in static URL attributes", () => {
    const unsafeUrls = [
      { attr: "href", value: "javascript:alert(1)", tag: "a" },
      { attr: "href", value: "vbscript:msgbox(1)", tag: "a" },
      { attr: "src", value: "data:text/html,<script>alert(1)</script>", tag: "img" },
      { attr: "action", value: "javascript:void(0)", tag: "form" },
    ];

    unsafeUrls.forEach(({ attr, value, tag }) => {
      test(`should throw for ${attr}="${value}" on <${tag}>`, () => {
        // Arrange
        const fragment = fragmentFrom(`<${tag} ${attr}="${value}"></${tag}>`);

        // Act & Assert
        expect(() => validator.validate(fragment)).toThrow(
          `[PickComponents] Unsafe static URL "${value}" found in ${attr} on <${tag}>.`,
        );
      });
    });

    test("should not throw for a dynamic binding in a URL attribute", () => {
      // Arrange — {{url}} is safe at static validation time; runtime policy handles it
      const fragment = fragmentFrom(`<a href="{{url}}">link</a>`);

      // Act & Assert
      expect(() => validator.validate(fragment)).not.toThrow();
    });
  });

  test.describe("safe templates pass through", () => {
    test("should not throw for a plain template with no unsafe content", () => {
      // Arrange
      const fragment = fragmentFrom(
        `<div class="card"><h2>{{title}}</h2><p>{{body}}</p></div>`,
      );

      // Act & Assert
      expect(() => validator.validate(fragment)).not.toThrow();
    });

    test("should not throw for aria-* and data-* attributes", () => {
      // Arrange
      const fragment = fragmentFrom(
        `<button aria-label="{{label}}" data-id="{{id}}">OK</button>`,
      );

      // Act & Assert
      expect(() => validator.validate(fragment)).not.toThrow();
    });

    test("should not throw for safe absolute URL in href", () => {
      // Arrange
      const fragment = fragmentFrom(`<a href="https://example.com">link</a>`);

      // Act & Assert
      expect(() => validator.validate(fragment)).not.toThrow();
    });

    test("should not throw for a relative URL in href", () => {
      // Arrange
      const fragment = fragmentFrom(`<a href="/about">about</a>`);

      // Act & Assert
      expect(() => validator.validate(fragment)).not.toThrow();
    });

    test("should not throw for pick-action structural attributes", () => {
      // Arrange
      const fragment = fragmentFrom(
        `<button pick-action action="save" bubble>Save</button>`,
      );

      // Act & Assert
      expect(() => validator.validate(fragment)).not.toThrow();
    });
  });

  test.describe("recursive validation inside native <template>", () => {
    test("should throw for on* inside a native template element", () => {
      // Arrange
      const fragment = fragmentFrom(
        `<template><div onclick="{{x}}"></div></template>`,
      );

      // Act & Assert
      expect(() => validator.validate(fragment)).toThrow(
        `[PickComponents] Unsafe static template attribute "onclick" found on <div>.`,
      );
    });
  });

  test.describe("recursive validation inside data-preset-template", () => {
    test("should throw for style inside a data-preset-template value", () => {
      // Arrange
      const fragment = fragmentFrom(
        `<pick-for data-preset-template="<div style=&quot;color:red&quot;></div>"></pick-for>`,
      );

      // Act & Assert
      expect(() => validator.validate(fragment)).toThrow(
        `[PickComponents] Unsafe static template attribute "style" found on <div>.`,
      );
    });
  });
});
