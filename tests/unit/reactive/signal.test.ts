import { test, expect } from "@playwright/test";
import { StateSignal } from "../../../src/reactive/signal.js";

test.describe("StateSignal", () => {
  test("subscribe returns unsubscribe function", () => {
    // Arrange
    const signal = new StateSignal();

    // Act
    const unsub = signal.subscribe(() => {});

    // Assert
    expect(typeof unsub).toBe("function");
  });

  test("notify calls all subscribers", () => {
    // Arrange
    const signal = new StateSignal();
    let callCount = 0;

    // Act
    signal.subscribe(() => callCount++);
    signal.subscribe(() => callCount++);
    signal.notify();

    // Assert
    expect(callCount).toBe(2);
  });

  test("unsubscribe removes listener", () => {
    // Arrange
    const signal = new StateSignal();
    let callCount = 0;
    const unsub = signal.subscribe(() => callCount++);

    // Act
    signal.notify();
    expect(callCount).toBe(1);

    unsub();
    signal.notify();

    // Assert
    expect(callCount).toBe(1); // No additional call
  });

  test("multiple subscriptions work independently", () => {
    // Arrange
    const signal = new StateSignal();
    const results: number[] = [];
    const unsub1 = signal.subscribe(() => results.push(1));
    signal.subscribe(() => results.push(2));

    // Act
    signal.notify();
    unsub1();
    signal.notify();

    // Assert
    expect(results).toEqual([1, 2, 2]);
  });

  test("notify is idempotent across multiple calls", () => {
    // Arrange
    const signal = new StateSignal();
    let callCount = 0;
    signal.subscribe(() => callCount++);

    // Act
    signal.notify();
    signal.notify();
    signal.notify();

    // Assert
    expect(callCount).toBe(3);
  });

  test("subscriber exceptions do not break other subscribers", () => {
    // Arrange
    const signal = new StateSignal();
    let callCount = 0;
    signal.subscribe(() => {
      throw new Error("test error");
    });
    signal.subscribe(() => callCount++);

    // Act
    signal.notify();

    // Assert
    expect(callCount).toBe(1); // Second subscriber still called despite first throwing
  });
});
