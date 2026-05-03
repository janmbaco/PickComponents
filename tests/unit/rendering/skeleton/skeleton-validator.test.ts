import { test, expect } from "@playwright/test";
import { SkeletonValidator } from "../../../../src/rendering/skeleton/skeleton-validator.js";

/**
 * Tests for SkeletonValidator responsibility.
 *
 * Covers:
 * - Valid skeleton templates (should pass)
 * - Forbidden tags (should throw)
 * - Forbidden attributes (should throw)
 * - Event handlers (should throw)
 * - Dangerous URLs (should throw)
 */
test.describe("SkeletonValidator", () => {
  test.describe("valid templates", () => {
    test("should accept empty skeleton", () => {
      // Arrange
      const validator = new SkeletonValidator();

      // Act & Assert
      expect(() => validator.validate("")).not.toThrow();
    });

    test("should accept simple layout markup", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = '<div class="loader"><span>Loading...</span></div>';

      // Act & Assert
      expect(() => validator.validate(html)).not.toThrow();
    });

    test("should accept semantic HTML with allowed tags", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = `
        <article class="card">
          <header>
            <h2>Skeleton Title</h2>
          </header>
          <section>
            <p>Loading content...</p>
          </section>
          <footer>
            <small>Footer text</small>
          </footer>
        </article>
      `;

      // Act & Assert
      expect(() => validator.validate(html)).not.toThrow();
    });

    test("should accept data-* attributes", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html =
        '<div data-test-id="skeleton" data-state="loading">Loading</div>';

      // Act & Assert
      expect(() => validator.validate(html)).not.toThrow();
    });

    test("should accept aria-* attributes", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html =
        '<div aria-label="Loading" aria-busy="true" role="status">Loading...</div>';

      // Act & Assert
      expect(() => validator.validate(html)).not.toThrow();
    });

    test("should accept id and class attributes", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html =
        '<div id="skeleton-root" class="skeleton skeleton-card">Content</div>';

      // Act & Assert
      expect(() => validator.validate(html)).not.toThrow();
    });

    test("should accept img tags with alt and src", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = '<img src="/loader.png" alt="Loading indicator" />';

      // Act & Assert
      expect(() => validator.validate(html)).not.toThrow();
    });

    test("should accept svg elements", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html =
        '<svg class="spinner"><circle cx="50" cy="50" r="40" /></svg>';

      // Act & Assert
      expect(() => validator.validate(html)).not.toThrow();
    });

    test("should accept svg focusable attribute", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html =
        '<svg focusable="false" aria-hidden="true"><path d="M0 0 L10 10" /></svg>';

      // Act & Assert
      expect(() => validator.validate(html)).not.toThrow();
    });

    test("should accept svg namespaced attributes (xmlns:xlink, xlink:href)", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html =
        '<svg xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100"><defs><path id="p" d="M0 0 L10 10"/></defs><use xlink:href="#p"/></svg>';

      // Act & Assert
      expect(() => validator.validate(html)).not.toThrow();
    });

    test("should accept form elements", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html =
        '<button disabled>Submit</button><input type="text" placeholder="Name" />';

      // Act & Assert
      expect(() => validator.validate(html)).not.toThrow();
    });

    test("should accept lists", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";

      // Act & Assert
      expect(() => validator.validate(html)).not.toThrow();
    });
  });

  test.describe("forbidden tags", () => {
    test("should reject <style> tags", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = "<style>body { display: none; }</style>";

      // Act & Assert
      expect(() => validator.validate(html)).toThrow(
        /Tag <style> is not allowed/,
      );
    });

    test("should reject <script> tags", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = '<script>alert("xss")</script>';

      // Act & Assert
      expect(() => validator.validate(html)).toThrow(
        /Tag <script> is not allowed/,
      );
    });

    test("should reject <iframe> tags", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = '<iframe src="https://evil.com"></iframe>';

      // Act & Assert
      expect(() => validator.validate(html)).toThrow(
        /Tag <iframe> is not allowed/,
      );
    });

    test("should reject <object> tags", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = '<object data="malware.swf"></object>';

      // Act & Assert
      expect(() => validator.validate(html)).toThrow(
        /Tag <object> is not allowed/,
      );
    });

    test("should reject custom tags", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = "<my-custom-element></my-custom-element>";

      // Act & Assert
      expect(() => validator.validate(html)).toThrow(
        /Tag <my-custom-element> is not allowed/,
      );
    });
  });

  test.describe("forbidden attributes", () => {
    test("should reject onclick event handler", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = "<div onclick=\"alert('xss')\">Click me</div>";

      // Act & Assert
      expect(() => validator.validate(html)).toThrow(
        /Event handler attribute "onclick" is not allowed/,
      );
    });

    test("should reject onload event handler", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = '<img src="image.png" onload="fetch(\'evil\')" />';

      // Act & Assert
      expect(() => validator.validate(html)).toThrow(
        /Event handler attribute "onload" is not allowed/,
      );
    });

    test("should reject onerror event handler", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = "<div onerror=\"console.log('error')\"></div>";

      // Act & Assert
      expect(() => validator.validate(html)).toThrow(
        /Event handler attribute "onerror" is not allowed/,
      );
    });

    test("should reject style attribute", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html =
        '<div style="position: fixed; top: 0; left: 0;">Block everything</div>';

      // Act & Assert
      expect(() => validator.validate(html)).toThrow(
        /Attribute "style" is not allowed/,
      );
    });

    test("should reject javascript: URLs in href", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = "<a href=\"javascript:alert('xss')\">Click</a>";

      // Act & Assert
      expect(() => validator.validate(html)).toThrow(
        /Unsafe URL "javascript:alert\('xss'\)" is not allowed in href attributes/,
      );
    });

    test("should reject javascript: URLs in src", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = "<img src=\"javascript:alert('xss')\" />";

      // Act & Assert
      expect(() => validator.validate(html)).toThrow(
        /Unsafe URL "javascript:alert\('xss'\)" is not allowed in src attributes/,
      );
    });

    test("should reject data, vbscript and obfuscated executable URLs", () => {
      const validator = new SkeletonValidator();
      const unsafeSkeletons = [
        '<a href="data:image/svg+xml;base64,PHN2Zy8+">Click</a>',
        '<a href="VBScript:msgbox(1)">Click</a>',
        '<a href="java script:alert(1)">Click</a>',
      ];

      for (const html of unsafeSkeletons) {
        expect(() => validator.validate(html)).toThrow(/Unsafe URL/);
      }
    });

    test("should reject unknown attributes", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = '<div unknown-attr="value">Content</div>';

      // Act & Assert
      expect(() => validator.validate(html)).toThrow(
        /Attribute "unknown-attr" is not allowed/,
      );
    });
  });

  test.describe("nested validation", () => {
    test("should validate nested elements recursively", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = '<div><section><div onclick="xss"></div></section></div>';

      // Act & Assert
      expect(() => validator.validate(html)).toThrow(
        /Event handler attribute "onclick"/,
      );
    });

    test("should accept deeply nested valid structure", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = `
        <div class="outer">
          <section>
            <article>
              <header>
                <h1>Title</h1>
              </header>
              <p>Content</p>
            </article>
          </section>
        </div>
      `;

      // Act & Assert
      expect(() => validator.validate(html)).not.toThrow();
    });

    test("should reject forbidden tag nested deep inside", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = `
        <div class="outer">
          <section>
            <article>
              <style>body { display: none; }</style>
            </article>
          </section>
        </div>
      `;

      // Act & Assert
      expect(() => validator.validate(html)).toThrow(
        /Tag <style> is not allowed/,
      );
    });
  });

  test.describe("error messages", () => {
    test("should provide helpful error message for forbidden tag", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = "<style></style>";

      // Act & Assert
      expect(() => validator.validate(html)).toThrow(/Allowed tags:/);
    });

    test("should provide helpful error message for forbidden attribute", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = '<div onclick="alert()"></div>';

      // Act & Assert
      expect(() => validator.validate(html)).toThrow(
        /Use data-\* attributes or CSS classes instead/,
      );
    });

    test("should include SkeletonValidator prefix in error messages", () => {
      // Arrange
      const validator = new SkeletonValidator();
      const html = "<script></script>";

      // Act & Assert
      expect(() => validator.validate(html)).toThrow(/\[SkeletonValidator\]/);
    });
  });
});
