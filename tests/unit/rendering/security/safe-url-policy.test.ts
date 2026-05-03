import { expect, test } from "@playwright/test";
import { SafeUrlPolicy } from "../../../../src/rendering/security/safe-url-policy.js";

test.describe("SafeUrlPolicy", () => {
  const policy = new SafeUrlPolicy();

  test("should allow common safe absolute and relative URLs", () => {
    expect(policy.isSafeUrl("https://example.test/path")).toBe(true);
    expect(policy.isSafeUrl("http://example.test/path")).toBe(true);
    expect(policy.isSafeUrl("mailto:hello@example.test")).toBe(true);
    expect(policy.isSafeUrl("tel:+34123456789")).toBe(true);
    expect(policy.isSafeUrl("/assets/icon.svg")).toBe(true);
    expect(policy.isSafeUrl("#section")).toBe(true);
  });

  test("should block executable URL protocols", () => {
    expect(policy.isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(policy.isSafeUrl("vbscript:msgbox(1)")).toBe(false);
    expect(policy.isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(
      false,
    );
  });

  test("should block executable protocols with casing and whitespace evasions", () => {
    expect(policy.isSafeUrl(" JaVaScRiPt:alert(1)")).toBe(false);
    expect(policy.isSafeUrl("java script:alert(1)")).toBe(false);
    expect(policy.isSafeUrl("data :text/html,<svg onload=alert(1)>")).toBe(
      false,
    );
  });

  test("should block URLs containing control characters", () => {
    expect(policy.isSafeUrl("java\nscript:alert(1)")).toBe(false);
    expect(policy.isSafeUrl("https://example.test/\u0000payload")).toBe(false);
  });

  test("should block unsupported explicit protocols", () => {
    expect(policy.isSafeUrl("ftp://example.test/file.txt")).toBe(false);
  });
});
