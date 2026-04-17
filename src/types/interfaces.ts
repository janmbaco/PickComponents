import { IStateSignal } from "../reactive/signal.js";

/**
 * Base interface for all components
 */
export interface IComponent {
  /**
   * Gets whether the component has been rendered
   */
  readonly isRendered: boolean;

  /**
   * Gets the root HTML element of the component
   */
  readonly htmlElement: HTMLElement;

  /**
   * Appends the component to a parent element
   */
  setInElement(element: HTMLElement): void;

  /**
   * Removes the component from the DOM and cleans up resources
   */
  remove(fromDom?: boolean): void;
}

/**
 * Base interface for component initializers
 *
 * @description
 * Defines the contract for asynchronous component initialization.
 * Initializers are responsible for loading data, setting up dependencies,
 * and preparing components before rendering.
 *
 * @template TComponent - The component type being initialized
 *
 * @example
 * ```typescript
 * class TodoListInitializer implements IComponentInitializer<TodoListComponent> {
 *   constructor(private todoService: TodoService) {}
 *
 *   async initialize(component: TodoListComponent): Promise<boolean> {
 *     const todos = await this.todoService.loadTodos();
 *     component.todos = todos;
 *     return true; // Success
 *   }
 * }
 * ```
 */
export interface IComponentInitializer<TComponent> {
  /**
   * Initializes the component with initial data and configuration
   *
   * @param component - Component instance to initialize
   * @returns Promise resolving to true if successful, false otherwise
   */
  initialize(component: TComponent): boolean | Promise<boolean>;
}

/**
 * Base interface for lifecycle managers
 *
 * @description
 * Defines the contract for managing component lifecycle, events, and subscriptions.
 * Lifecycle managers act as mediators between components and services.
 *
 * @template TComponent - The component type being managed
 *
 * @example
 * ```typescript
 * class TodoListLifecycleManager implements ILifecycleManager<TodoListComponent> {
 *   constructor(private todoService: TodoService) {}
 *
 *   startListening(component: TodoListComponent): void {
 *     // Subscribe to component events
 *     // Call service methods
 *     // Update component state
 *   }
 *
 *   stopListening(): void {
 *     // Cleanup subscriptions
 *   }
 *
 *   dispose(): void {
 *     // Final cleanup
 *   }
 * }
 * ```
 */
export interface ILifecycleManager<TComponent> {
  /**
   * The component being managed
   */
  readonly component: TComponent | null;

  /**
   * Starts listening to events and managing component lifecycle
   *
   * @param component - Component instance to manage
   */
  startListening(component: TComponent): void;

  /**
   * Stops listening to events and cleans up subscriptions
   */
  stopListening(): void;

  /**
   * Disposes of all resources
   */
  dispose(): void;
}

/**
 * Reactive state management interface
 *
 * @description
 * Defines the contract for granular reactive state management.
 * Each property has its own observable channel for optimal performance.
 *
 * @remarks
 * Implemented by PickComponent to provide property-specific reactivity.
 * RenderEngine subscribes to specific properties to avoid unnecessary updates.
 */
export interface IReactiveState {
  /**
   * Gets or creates property-specific observable for granular reactivity
   *
   * @param propName - Name of the property to observe
   * @returns Observable that emits when the property changes
   *
   * @example
   * ```typescript
   * // RenderEngine subscribes to specific property
   * component.getPropertyObservable('count').subscribe(() => {
   *   // Only runs when 'count' changes
   *   updateDOM();
   * });
   * ```
   */
  getPropertyObservable(propName: string): IStateSignal;
}

/**
 * Type for subscription cleanup functions
 */
export type SubscriptionCleanup = () => void;

/**
 * Metadata for behaviors attached to components
 *
 * @description
 * Stores initializer and lifecycle manager types for component registration.
 * Used internally by decorators and registration system.
 */
export interface BehaviorMetadata {
  initializerType?: new (...args: unknown[]) => IComponentInitializer<unknown>;
  lifecycleManagerType?: new (...args: unknown[]) => ILifecycleManager<unknown>;
}

/**
 * HTML5 validation rules for form inputs
 *
 * @description
 * Defines the structure for validation rules that can be automatically
 * converted to HTML validation attributes using [[RULES.field]] syntax.
 * Supports all standard HTML5 validation attributes.
 *
 * @example
 * ```typescript
 * const rules: ValidationRules = {
 *   username: {
 *     required: true,
 *     minlength: 3,
 *     maxlength: 20,
 *     pattern: '^[a-zA-Z0-9_]+$'
 *   },
 *   email: {
 *     required: true
 *   },
 *   age: {
 *     min: 18,
 *     max: 120
 *   }
 * };
 * ```
 */
export interface ValidationRules {
  [fieldName: string]: {
    /** Makes the field required */
    required?: boolean;

    /** Minimum length for text inputs */
    minlength?: number;

    /** Maximum length for text inputs */
    maxlength?: number;

    /** Regular expression pattern */
    pattern?: string;

    /** Minimum value for number/date inputs */
    min?: number | string;

    /** Maximum value for number/date inputs */
    max?: number | string;

    /** Step increment for number inputs */
    step?: number | string;

    /** Accepted file types (for file inputs) */
    accept?: string;

    /** Autocomplete behavior */
    autocomplete?: string;

    /** Input placeholder text */
    placeholder?: string;

    /** Input title/tooltip */
    title?: string;

    /** Custom validation message */
    message?: string;
  };
}
