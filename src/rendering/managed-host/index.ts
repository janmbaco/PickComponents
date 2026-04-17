/**
 * Managed Host Module
 *
 * Provides abstractions for handling managed host elements in the Pick Components
 * rendering pipeline. A managed host is an element that is being rendered by the
 * engine with an associated PickComponent instance.
 *
 * @module managed-host
 */

export { IOutletResolver } from "./outlet-resolver.interface.js";
export { IHostStyleMigrator } from "./host-style-migrator.interface.js";
export { IManagedElementResolver } from "./managed-element-resolver.interface.js";
export type { ITransparentHost } from "./transparent-host.interface.js";
export type { ITransparentHostFactory } from "./transparent-host-factory.interface.js";
export type { IManagedElementRegistry } from "./managed-element-registry.js";
export { OutletResolver } from "./outlet-resolver.js";
export { HostStyleMigrator } from "./host-style-migrator.js";
export { ManagedElementResolver } from "./managed-element-resolver.js";
export { ManagedElementRegistry } from "./managed-element-registry.js";
export { TransparentHost } from "./transparent-host.js";
export { TransparentHostFactory } from "./transparent-host.factory.js";
