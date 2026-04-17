/**
 * Defines the responsibility of migrating host styling to outlet element.
 *
 * @description
 * Handles the migration of class and id attributes from the host element
 * to the outlet element within the rendered component.
 *
 * **Class Migration:**
 * - Merge host classes with outlet classes
 * - Deduplicate tokens
 * - Host classes have priority (appear first)
 *
 * **ID Migration:**
 * - Only migrate if outlet has no id attribute
 * - If outlet has id, do NOT overwrite (conservative fallback)
 * - In conflict case, host keeps its id (not stored in inputs)
 *
 * @example
 * ```typescript
 * const migrator: IHostStyleMigrator = new HostStyleMigrator();
 * migrator.migrate(hostElement, outletElement);
 * // Host class/id attributes are migrated to outlet
 * ```
 */
export interface IHostStyleMigrator {
  /**
   * Migrates class and id from host to outlet element.
   *
   * @param hostElement - Source element with class/id to migrate
   * @param outletElement - Target element to receive styling
   * @throws Error if any parameter is null or undefined
   *
   * @example
   * ```typescript
   * // Before: <host class="btn"></host> with outlet <div class="outlet"></div>
   * migrator.migrate(host, outlet);
   * // After: host has no class; outlet has class="btn outlet"
   * ```
   */
  migrate(hostElement: HTMLElement, outletElement: HTMLElement): void;
}
