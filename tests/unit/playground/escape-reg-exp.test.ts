import { expect, test } from "@playwright/test";
import { escapeRegExp } from "../../../examples/src/features/playground/security/escape-reg-exp.js";

test.describe("escapeRegExp", () => {
  test("should escape all JavaScript regular expression metacharacters", () => {
    const fileNames = [
      "component.template.html",
      "path\\component.ts",
      "sum+total.ts",
      "maybe?value.ts",
      "item[0].ts",
      "item].ts",
      "factory(name).ts",
      "price$.ts",
      "choice|fallback.ts",
      "anchor^start.ts",
      "wild*card.ts",
      "block{1}.ts",
    ];

    for (const fileName of fileNames) {
      const pattern = new RegExp(`^${escapeRegExp(fileName)}$`);

      expect(pattern.test(fileName)).toBe(true);
      expect(pattern.test(`${fileName}.extra`)).toBe(false);
    }
  });
});
