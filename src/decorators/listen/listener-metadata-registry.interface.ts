import type { ListenerMetadata } from "../listen.decorator.js";

/**
 * Defines the responsibility of storing and retrieving listener metadata for component prototypes.
 *
 * @description
 * Acts as the coordination point between the `@Listen` decorator (which writes metadata)
 * and the listener initializer (which reads metadata at render time).
 * Consumers resolve this via the service container to avoid coupling to the concrete implementation.
 */
export interface IListenerMetadataRegistry {
  /**
   * Registers listener metadata on a component prototype with deduplication.
   *
   * @param prototype - Component prototype to register metadata on
   * @param metadata - Listener metadata to register
   */
  register(prototype: unknown, metadata: ListenerMetadata): void;

  /**
   * Retrieves all listener metadata for a component instance.
   *
   * @param component - Component instance to read metadata from
   * @returns Array of listener metadata, or empty array if none registered
   */
  get(component: unknown): ListenerMetadata[];
}
