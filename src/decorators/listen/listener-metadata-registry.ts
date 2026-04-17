import type { IListenerMetadataRegistry } from "./listener-metadata-registry.interface.js";
import type { ListenerMetadata } from "../listen.decorator.js";

/**
 * Symbol key for storing listener metadata on component prototypes.
 * Prevents property name collisions and enables private metadata storage.
 */
const LISTENERS_SYMBOL = Symbol("pickcomponents:listeners");

interface HasListenerMetadata {
  [LISTENERS_SYMBOL]?: ListenerMetadata[];
}

/**
 * Implements the responsibility of storing and retrieving listener metadata for component prototypes.
 *
 * @description
 * Stores metadata directly on component prototypes via a Symbol key,
 * ensuring per-class isolation with inherited deduplication.
 * Registered in the service container under `'IListenerMetadataRegistry'`.
 */
export class DefaultListenerMetadataRegistry implements IListenerMetadataRegistry {
  /**
   * Registers listener metadata on a component prototype with deduplication.
   *
   * @param prototype - Component prototype to register metadata on
   * @param metadata - Listener metadata to register
   */
  register(prototype: unknown, metadata: ListenerMetadata): void {
    if (typeof prototype !== "object" || prototype === null) return;

    if (!Object.prototype.hasOwnProperty.call(prototype, LISTENERS_SYMBOL)) {
      const inherited = ((prototype as Record<symbol, unknown>)[
        LISTENERS_SYMBOL
      ] || []) as ListenerMetadata[];
      (prototype as Record<symbol, ListenerMetadata[]>)[LISTENERS_SYMBOL] = [
        ...inherited,
      ];
    }

    const listeners = (prototype as Record<symbol, ListenerMetadata[]>)[
      LISTENERS_SYMBOL
    ];
    const isDuplicate = listeners.some(
      (l) =>
        l.methodName === metadata.methodName &&
        l.eventName === metadata.eventName &&
        l.selector === metadata.selector,
    );

    if (!isDuplicate) {
      listeners.push(metadata);
    }
  }

  /**
   * Retrieves all listener metadata for a component instance.
   *
   * @param component - Component instance to read metadata from
   * @returns Array of listener metadata, or empty array if none registered
   */
  get(component: unknown): ListenerMetadata[] {
    if (typeof component !== "object" || component === null) return [];
    const prototype = Object.getPrototypeOf(component) as HasListenerMetadata;
    return prototype[LISTENERS_SYMBOL] || [];
  }
}
