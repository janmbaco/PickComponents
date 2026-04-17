import { test, expect } from "@playwright/test";
import { HostStyleMigrator } from "../../../../src/rendering/managed-host/host-style-migrator.js";
import { JSDOM } from "jsdom";

test.describe("HostStyleMigrator", () => {
  let migrator: HostStyleMigrator;
  let dom: JSDOM;
  let document: Document;

  test.beforeEach(() => {
    migrator = new HostStyleMigrator();
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
  });

  test.describe("migrate", () => {
    test("should throw error if hostElement is null", () => {
      // Arrange
      const outlet = document.createElement("div");

      // Act & Assert
      expect(() => migrator.migrate(null as any, outlet)).toThrow(
        "Host element is required",
      );
    });

    test("should throw error if outletElement is null", () => {
      // Arrange
      const host = document.createElement("div");

      // Act & Assert
      expect(() => migrator.migrate(host, null as any)).toThrow(
        "Outlet element is required",
      );
    });

    test.describe("class migration", () => {
      test("should migrate class from host to outlet", () => {
        // Arrange
        const host = document.createElement("div");
        host.className = "btn primary";
        const outlet = document.createElement("div");

        // Act
        migrator.migrate(host, outlet);

        // Assert
        expect(host.hasAttribute("class")).toBe(false);
        expect(outlet.className).toBe("btn primary");
      });

      test("should merge host and outlet classes with deduplication", () => {
        // Arrange
        const host = document.createElement("div");
        host.className = "btn primary";
        const outlet = document.createElement("div");
        outlet.className = "outlet primary";

        // Act
        migrator.migrate(host, outlet);

        // Assert
        expect(host.hasAttribute("class")).toBe(false);
        expect(outlet.className).toBe("btn primary outlet");
      });

      test("should preserve host-first order in class merge", () => {
        // Arrange
        const host = document.createElement("div");
        host.className = "alpha beta";
        const outlet = document.createElement("div");
        outlet.className = "gamma delta";

        // Act
        migrator.migrate(host, outlet);

        // Assert
        expect(outlet.className).toBe("alpha beta gamma delta");
      });

      test("should handle host class with extra whitespace", () => {
        // Arrange
        const host = document.createElement("div");
        host.className = "  btn   primary  ";
        const outlet = document.createElement("div");

        // Act
        migrator.migrate(host, outlet);

        // Assert
        expect(outlet.className).toBe("btn primary");
      });

      test("should not modify outlet if host has no class", () => {
        // Arrange
        const host = document.createElement("div");
        const outlet = document.createElement("div");
        outlet.className = "outlet";

        // Act
        migrator.migrate(host, outlet);

        // Assert
        expect(outlet.className).toBe("outlet");
      });

      test("should handle empty host class attribute", () => {
        // Arrange
        const host = document.createElement("div");
        host.setAttribute("class", "   ");
        const outlet = document.createElement("div");
        outlet.className = "outlet";

        // Act
        migrator.migrate(host, outlet);

        // Assert
        expect(outlet.className).toBe("outlet");
      });
    });

    test.describe("id migration", () => {
      test("should migrate id from host to outlet when outlet has no id", () => {
        // Arrange
        const host = document.createElement("div");
        host.id = "my-id";
        const outlet = document.createElement("div");

        // Act
        migrator.migrate(host, outlet);

        // Assert
        expect(host.hasAttribute("id")).toBe(false);
        expect(outlet.id).toBe("my-id");
      });

      test("should NOT overwrite outlet id (conservative conflict resolution)", () => {
        // Arrange
        const host = document.createElement("div");
        host.id = "host-id";
        const outlet = document.createElement("div");
        outlet.id = "outlet-id";

        // Act
        migrator.migrate(host, outlet);

        // Assert
        expect(host.id).toBe("host-id"); // Host keeps its id
        expect(outlet.id).toBe("outlet-id"); // Outlet unchanged
      });

      test("should not modify outlet if host has no id", () => {
        // Arrange
        const host = document.createElement("div");
        const outlet = document.createElement("div");
        outlet.id = "outlet-id";

        // Act
        migrator.migrate(host, outlet);

        // Assert
        expect(outlet.id).toBe("outlet-id");
      });
    });

    test.describe("combined class and id migration", () => {
      test("should migrate both class and id successfully", () => {
        // Arrange
        const host = document.createElement("div");
        host.className = "btn";
        host.id = "submit-btn";
        const outlet = document.createElement("div");
        outlet.className = "outlet";

        // Act
        migrator.migrate(host, outlet);

        // Assert
        expect(host.hasAttribute("class")).toBe(false);
        expect(host.hasAttribute("id")).toBe(false);
        expect(outlet.className).toBe("btn outlet");
        expect(outlet.id).toBe("submit-btn");
      });

      test("should migrate class but preserve conflicting ids", () => {
        // Arrange
        const host = document.createElement("div");
        host.className = "btn";
        host.id = "host-id";
        const outlet = document.createElement("div");
        outlet.className = "outlet";
        outlet.id = "outlet-id";

        // Act
        migrator.migrate(host, outlet);

        // Assert
        expect(host.hasAttribute("class")).toBe(false);
        expect(host.id).toBe("host-id"); // Conflict: host keeps id
        expect(outlet.className).toBe("btn outlet");
        expect(outlet.id).toBe("outlet-id"); // Not overwritten
      });
    });
  });
});
