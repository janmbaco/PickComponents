/**
 * Mock implementation of ISkeletonValidator for unit tests.
 *
 * @description
 * Tracks calls to validate() and can be configured to throw a specific error.
 */
import type { ISkeletonValidator } from "../../src/rendering/skeleton/skeleton-validator.js";

export class MockSkeletonValidator implements ISkeletonValidator {
  /** Number of times validate() was called */
  public calls = 0;
  /** Optional message that triggers an error when set */
  private readonly errorMessage?: string;

  /**
   * Initializes a new instance of MockSkeletonValidator.
   *
   * @param errorMessage - When provided, validate() will throw with this message
   */
  constructor(errorMessage?: string) {
    this.errorMessage = errorMessage;
  }

  /**
   * Validates the provided HTML.
   *
   * @param html - HTML string (ignored by the mock)
   * @throws Error when configured with an error message
   */
  validate(_html: string): void {
    this.calls++;
    if (this.errorMessage) {
      throw new Error(this.errorMessage);
    }
  }
}
