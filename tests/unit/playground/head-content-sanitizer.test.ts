import { expect, test } from "@playwright/test";
import { Window } from "happy-dom";
import {
  downloadHeadContentPolicy,
  previewHeadContentPolicy,
  sanitizeHeadContent,
} from "../../../examples/src/features/playground/security/head-content-sanitizer.js";

test.describe("sanitizeHeadContent", () => {
  test("should remove scripts with unusual casing, attributes and closing whitespace", () => {
    const sanitized = sanitizeHeadContent(
      [
        '<ScRiPt data-x="1">alert(1)</sCrIpT>',
        '<script type="module">alert(2)</script >',
        "<style>.card { color: red; }</style>",
      ].join("\n"),
      previewHeadContentPolicy,
      { document: createDocument() },
    );

    expect(sanitized.toLowerCase()).not.toContain("<script");
    expect(sanitized).toContain("<style>");
  });

  test("should remove malformed script content according to HTML parsing", () => {
    const sanitized = sanitizeHeadContent(
      [
        "<script><script>alert(1)</script></script>",
        "<style>.ok { display: block; }</style>",
      ].join("\n"),
      previewHeadContentPolicy,
      { document: createDocument() },
    );

    expect(sanitized.toLowerCase()).not.toContain("<script");
    expect(sanitized).toContain(".ok");
  });

  test("should remove meta charset for preview while keeping viewport explicit", () => {
    const sanitized = sanitizeHeadContent(
      [
        '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width">',
        "<style>.preview { color: blue; }</style>",
      ].join("\n"),
      previewHeadContentPolicy,
      { document: createDocument() },
    );

    expect(sanitized.toLowerCase()).not.toContain("charset");
    expect(sanitized).toContain('name="viewport"');
    expect(sanitized).toContain(".preview");
  });

  test("should remove meta charset and viewport for downloads", () => {
    const sanitized = sanitizeHeadContent(
      [
        '<meta CHARSET="UTF-8">',
        '<meta name="viewport" content="width=device-width">',
        '<meta name="description" content="Safe">',
      ].join("\n"),
      downloadHeadContentPolicy,
      { document: createDocument() },
    );

    expect(sanitized.toLowerCase()).not.toContain("charset");
    expect(sanitized.toLowerCase()).not.toContain("viewport");
    expect(sanitized).toContain('name="description"');
  });
});

function createDocument(): Document {
  return new Window().document;
}
