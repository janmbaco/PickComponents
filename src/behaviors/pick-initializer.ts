import { IComponentInitializer } from "../types/interfaces.js";

/**
 * Base class for component initializers
 * Handles initial setup and data loading for components
 */
export abstract class PickInitializer<
  TComponent,
> implements IComponentInitializer<TComponent> {
  /**
   * Initializes the component with initial data and configuration
   *
   * @param component - Component instance to initialize
   * @returns true if initialization succeeded, false if failed
   * @throws Never - always catches and logs errors
   */
  async initialize(component: TComponent): Promise<boolean> {
    if (!component) {
      return false;
    }

    try {
      return await this.onInitialize(component);
    } catch (error) {
      void error;
      return false;
    }
  }

  /**
   * Hook for custom initialization logic
   * Return true if initialization was successful, false otherwise
   */
  protected abstract onInitialize(
    component: TComponent,
  ): boolean | Promise<boolean>;
}
