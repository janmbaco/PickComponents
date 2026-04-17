/**
 * Implements the responsibility of validating method calls in template expressions.
 * Only read-only methods are allowed - no state mutation.
 */

import type { ISafeMethodValidator } from "./safe-method-validator.interface.js";

/**
 * Safe string methods that can be called in template expressions.
 */
const SAFE_STRING_METHODS = [
  "charAt",
  "charCodeAt",
  "concat",
  "endsWith",
  "includes",
  "indexOf",
  "lastIndexOf",
  "match",
  "padEnd",
  "padStart",
  "repeat",
  "replace",
  "search",
  "slice",
  "split",
  "startsWith",
  "substring",
  "toLowerCase",
  "toUpperCase",
  "trim",
  "trimEnd",
  "trimStart",
] as const;

/**
 * Safe number methods that can be called in template expressions.
 */
const SAFE_NUMBER_METHODS = [
  "toExponential",
  "toFixed",
  "toLocaleString",
  "toPrecision",
  "toString",
  "valueOf",
] as const;

/**
 * Safe array methods that can be called in template expressions.
 */
const SAFE_ARRAY_METHODS = [
  "join",
  "concat",
  "slice",
  "indexOf",
  "lastIndexOf",
  "includes",
  "toString",
  "toLocaleString",
] as const;

/**
 * Safe date methods that can be called in template expressions.
 */
const SAFE_DATE_METHODS = [
  "getDate",
  "getDay",
  "getFullYear",
  "getHours",
  "getMilliseconds",
  "getMinutes",
  "getMonth",
  "getSeconds",
  "getTime",
  "toDateString",
  "toISOString",
  "toJSON",
  "toLocaleDateString",
  "toLocaleString",
  "toLocaleTimeString",
  "toString",
  "toTimeString",
] as const;

/**
 * Safe object methods that can be called in template expressions.
 */
const SAFE_OBJECT_METHODS = ["toString", "valueOf"] as const;

/**
 * Implements the responsibility of validating method calls in template expressions
 * against a read-only allowlist. This is a security boundary that prevents
 * arbitrary method invocation from user templates.
 */
export class SafeMethodValidator implements ISafeMethodValidator {
  /**
   * Checks if a method is safe to call on a given value type.
   *
   * @param value - The value to check the method against
   * @param methodName - The method name to validate
   * @returns true if the method is safe to call, false otherwise
   * @throws Error if value is null or undefined
   */
  isSafeMethod(value: unknown, methodName: string): boolean {
    if (value == null) {
      throw new Error("Value cannot be null or undefined");
    }

    const type = typeof value;

    if (type === "string") {
      return (SAFE_STRING_METHODS as readonly string[]).includes(methodName);
    }

    if (type === "number") {
      return (SAFE_NUMBER_METHODS as readonly string[]).includes(methodName);
    }

    if (Array.isArray(value)) {
      return (SAFE_ARRAY_METHODS as readonly string[]).includes(methodName);
    }

    if (value instanceof Date) {
      return (SAFE_DATE_METHODS as readonly string[]).includes(methodName);
    }

    return (SAFE_OBJECT_METHODS as readonly string[]).includes(methodName);
  }

  /**
   * Gets the list of safe methods for a given value type.
   *
   * @param value - The value to get safe methods for
   * @returns Array of safe method names for the value type
   */
  getSafeMethodsForType(value: unknown): readonly string[] {
    if (value == null) return SAFE_OBJECT_METHODS;

    const type = typeof value;

    if (type === "string") return SAFE_STRING_METHODS;
    if (type === "number") return SAFE_NUMBER_METHODS;
    if (Array.isArray(value)) return SAFE_ARRAY_METHODS;
    if (value instanceof Date) return SAFE_DATE_METHODS;

    return SAFE_OBJECT_METHODS;
  }
}
