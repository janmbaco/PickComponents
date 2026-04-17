/**
 * Defines the responsibility of validating whether a method call is safe
 * to execute within template expressions.
 */
export interface ISafeMethodValidator {
  /**
   * Checks if a method is safe to call on a given value type.
   *
   * @param value - The value to check the method against
   * @param methodName - The method name to validate
   * @returns true if the method is safe to call, false otherwise
   * @throws Error if value is null or undefined
   */
  isSafeMethod(value: unknown, methodName: string): boolean;

  /**
   * Gets the list of safe methods for a given value type.
   *
   * @param value - The value to get safe methods for
   * @returns Array of safe method names for the value type
   */
  getSafeMethodsForType(value: unknown): readonly string[];
}
