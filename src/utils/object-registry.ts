/**
 * Interface for ID generation strategies
 */
export interface IIdGenerator {
  generate(): string;
}

/**
 * Default ID generator using timestamp and counter
 */
export class TimestampIdGenerator implements IIdGenerator {
  private counter = 0;

  generate(): string {
    return `__obj_${Date.now()}_${this.counter++}`;
  }
}

/**
 * Contract for the Object Registry
 */
export interface IObjectRegistry {
  set<T>(value: T): string;
  get<T>(id: string): T | undefined;
  has(id: string): boolean;
  delete(id: string): void;
  watch<T>(id: string, cb: (value: T | undefined) => void): () => void;
  update<T>(id: string, value: T): void;
}

/**
 * ObjectRegistry - Manages object references for attribute-based component communication
 *
 * Uses WeakMap and WeakRef to allow garbage collection of unused objects:
 * - Objects are registered with unique IDs
 * - IDs can be passed through DOM attributes (strings)
 * - Objects are automatically cleaned up when no longer referenced
 *
 * Usage:
 * ```typescript
 * const items = [{ id: 1, name: 'Item 1' }];
 * const id = ObjectRegistry.set(items); // "__obj_abc123"
 *
 * const retrieved = ObjectRegistry.get(id); // Returns the array
 *
 * // React to updates:
 * const unwatch = ObjectRegistry.watch(id, (next) => console.log(next));
 * ObjectRegistry.update(id, [...items, { id: 2 }]);
 * ```
 */
export class WeakRefObjectRegistry implements IObjectRegistry {
  private idToEntry = new Map<
    string,
    { type: "object"; ref: WeakRef<object> } | { type: "value"; value: unknown }
  >();
  private watchers = new Map<string, Set<(value: unknown) => void>>();

  constructor(private idGenerator: IIdGenerator = new TimestampIdGenerator()) {}

  set<T>(value: T): string {
    const id = this.idGenerator.generate();
    this.storeEntry(id, value);
    return id;
  }

  get<T>(id: string): T | undefined {
    return this.resolveEntry<T>(id);
  }

  has(id: string): boolean {
    return this.get(id) !== undefined;
  }

  delete(id: string): void {
    this.notifyWatchers(id, undefined);
    this.watchers.delete(id);
    this.idToEntry.delete(id);
  }

  watch<T>(id: string, cb: (value: T | undefined) => void): () => void {
    const watcherSet =
      this.watchers.get(id) ?? new Set<(value: unknown) => void>();
    watcherSet.add(cb as (value: unknown) => void);
    this.watchers.set(id, watcherSet);

    return () => {
      const current = this.watchers.get(id);
      if (!current) return;
      current.delete(cb as (value: unknown) => void);
      if (current.size === 0) {
        this.watchers.delete(id);
      }
    };
  }

  update<T>(id: string, value: T): void {
    if (!this.idToEntry.has(id)) {
      throw new Error(`[ObjectRegistry] Attempted to update unknown id: ${id}`);
    }

    this.storeEntry(id, value);
    this.notifyWatchers(id, this.get(id));
  }

  private storeEntry<T>(id: string, value: T): void {
    if (this.isObjectLike(value)) {
      this.idToEntry.set(id, {
        type: "object",
        ref: new WeakRef(value as object),
      });
      return;
    }

    this.idToEntry.set(id, { type: "value", value });
  }

  private resolveEntry<T>(id: string): T | undefined {
    const entry = this.idToEntry.get(id);
    if (!entry) return undefined;

    if (entry.type === "value") {
      return entry.value as T;
    }

    const obj = entry.ref.deref();
    if (!obj) {
      this.idToEntry.delete(id);
      return undefined;
    }

    return obj as T;
  }

  private isObjectLike(value: unknown): value is object {
    return (
      (typeof value === "object" && value !== null) ||
      typeof value === "function"
    );
  }

  private notifyWatchers<T>(id: string, value: T | undefined): void {
    const watcherSet = this.watchers.get(id);
    if (!watcherSet || watcherSet.size === 0) return;

    watcherSet.forEach((cb) => {
      try {
        (cb as (value: T | undefined) => void)(value);
      } catch (error) {
        console.error(
          "[ObjectRegistry] Watcher callback threw an error:",
          error,
        );
      }
    });
  }
}

/**
 * Token for dependency injection referencing the ObjectRegistry service.
 * Use with Services.register() for custom implementations.
 *
 * @example
 * ```typescript
 * Services.register(ObjectRegistryToken, () => customRegistry);
 * ```
 */
export const ObjectRegistryToken = "ObjectRegistry" as const;
