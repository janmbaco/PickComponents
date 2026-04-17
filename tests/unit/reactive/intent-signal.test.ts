import { test, expect } from "@playwright/test";
import { IntentSignal } from "../../../src/reactive/signal.js";

test.describe("IntentSignal", () => {
  test("notifies void subscribers and supports unsubscribe", () => {
    const signal = new IntentSignal();
    let callCount = 0;

    const unsubscribe = signal.subscribe(() => {
      callCount++;
    });

    signal.notify();
    unsubscribe();
    signal.notify();

    expect(callCount).toBe(1);
  });

  test("delivers payloads in order", () => {
    const signal = new IntentSignal<string>();
    const values: string[] = [];

    signal.subscribe((value) => {
      values.push(value);
    });

    signal.notify("first");
    signal.notify("second");

    expect(values).toEqual(["first", "second"]);
  });

  test("listener errors do not stop sibling listeners", () => {
    const signal = new IntentSignal<number>();
    const values: number[] = [];

    signal.subscribe(() => {
      throw new Error("boom");
    });
    signal.subscribe((value) => {
      values.push(value);
    });

    signal.notify(7);

    expect(values).toEqual([7]);
  });

  test("unsubscribe prevents future payload notifications", () => {
    const signal = new IntentSignal<number>();
    const values: number[] = [];

    const unsubscribe = signal.subscribe((value) => {
      values.push(value);
    });

    signal.notify(1);
    unsubscribe();
    signal.notify(2);

    expect(values).toEqual([1]);
  });
});
