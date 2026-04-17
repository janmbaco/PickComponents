import { IHostStyleMigrator } from "./host-style-migrator.interface.js";

/**
 * Implements the responsibility of migrating host styling to outlet element.
 *
 * @description
 * Handles the migration of class and id attributes from host to outlet:
 * - **Class:** Merge and deduplicate, host-first order
 * - **ID:** Only migrate if outlet has no id (conservative conflict resolution)
 *
 * @example
 * ```typescript
 * const migrator = new HostStyleMigrator();
 * migrator.migrate(hostElement, outletElement);
 * // Host class/id migrated to outlet; host attributes removed
 * ```
 */
export class HostStyleMigrator implements IHostStyleMigrator {
  /**
   * Migrates class and id from host to outlet element.
   *
   * @param hostElement - Source element with class/id to migrate
   * @param outletElement - Target element to receive styling
   * @throws Error if any parameter is null or undefined
   *
   * @example
   * ```typescript
   * // Host: <x-foo class="btn primary"></x-foo>
   * // Outlet: <div class="outlet"></div>
   * migrator.migrate(host, outlet);
   * // Result: outlet has class="btn primary outlet"; host has no class
   *
   * // ID conflict case:
   * // Host: <x-foo id="my-id"></x-foo>
   * // Outlet: <div id="outlet-id"></div>
   * migrator.migrate(host, outlet);
   * // Result: outlet keeps "outlet-id"; host keeps "my-id" (conservative)
   * ```
   */
  migrate(hostElement: HTMLElement, outletElement: HTMLElement): void {
    if (!hostElement) {
      throw new Error("Host element is required");
    }
    if (!outletElement) {
      throw new Error("Outlet element is required");
    }

    // Migrate class attribute
    this.migrateClass(hostElement, outletElement);

    // Migrate id attribute (conservative: only if outlet has no id)
    this.migrateId(hostElement, outletElement);
  }

  /**
   * Migrates class attribute with merge and deduplication.
   *
   * @param hostElement - Source element with classes
   * @param outletElement - Target element to receive classes
   */
  private migrateClass(
    hostElement: HTMLElement,
    outletElement: HTMLElement,
  ): void {
    const hostClass = hostElement.getAttribute("class");
    if (!hostClass) {
      return; // No class to migrate
    }

    // Parse host classes
    const hostClasses = hostClass
      .split(/\s+/)
      .map((cls) => cls.trim())
      .filter((cls) => cls.length > 0);

    if (hostClasses.length === 0) {
      return;
    }

    // Get outlet classes
    const outletClasses = Array.from(outletElement.classList);

    // Merge: host-first order, deduplicate
    const mergedClasses = [...hostClasses];
    for (const cls of outletClasses) {
      if (!mergedClasses.includes(cls)) {
        mergedClasses.push(cls);
      }
    }

    // Apply merged classes to outlet
    outletElement.className = mergedClasses.join(" ");

    // Remove class from host
    hostElement.removeAttribute("class");
  }

  /**
   * Migrates id attribute with conservative conflict resolution.
   *
   * @param hostElement - Source element with id
   * @param outletElement - Target element to receive id
   */
  private migrateId(
    hostElement: HTMLElement,
    outletElement: HTMLElement,
  ): void {
    const hostId = hostElement.getAttribute("id");
    if (!hostId) {
      return; // No id to migrate
    }

    const outletId = outletElement.getAttribute("id");
    if (outletId) {
      // Conservative: Do NOT overwrite outlet id
      // Host keeps its id (not stored in inputs, not removed)
      return;
    }

    // Safe to migrate: outlet has no id
    outletElement.setAttribute("id", hostId);
    hostElement.removeAttribute("id");
  }
}
