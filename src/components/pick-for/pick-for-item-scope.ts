/**
 * Implements the responsibility of providing a reactive scope for each pick-for iteration.
 *
 * @description
 * Provides reactive properties ($item, $index, $key, $count, $first, $last, $even, $odd)
 * for each row. Extends PickComponent to satisfy ITemplateCompiler's contract —
 * getPropertyObservable() powers fine-grained reactive text node updates.
 *
 * This is NOT a rendered component. It is a pure reactive data context (ViewModel)
 * used as binding scope by ITemplateCompiler.compile().
 */
import { PickComponent } from "../../core/pick-component.js";

type KeyType = string | number;

export class PickForItemScope extends PickComponent {
  private itemValue: unknown = null;
  private indexValue = 0;
  private keyValue: KeyType = 0;
  private countValue = 0;
  private firstValue = false;
  private lastValue = false;
  private evenValue = false;
  private oddValue = false;

  get $item(): unknown {
    return this.itemValue;
  }

  set $item(value: unknown) {
    this.itemValue = value;
    this.getPropertyObservable("$item").notify();
  }

  get $index(): number {
    return this.indexValue;
  }

  set $index(value: number) {
    this.indexValue = value;
    this.getPropertyObservable("$index").notify();
  }

  get $key(): KeyType {
    return this.keyValue;
  }

  set $key(value: KeyType) {
    this.keyValue = value;
    this.getPropertyObservable("$key").notify();
  }

  get $count(): number {
    return this.countValue;
  }

  set $count(value: number) {
    this.countValue = value;
    this.getPropertyObservable("$count").notify();
  }

  get $first(): boolean {
    return this.firstValue;
  }

  set $first(value: boolean) {
    this.firstValue = value;
    this.getPropertyObservable("$first").notify();
  }

  get $last(): boolean {
    return this.lastValue;
  }

  set $last(value: boolean) {
    this.lastValue = value;
    this.getPropertyObservable("$last").notify();
  }

  get $even(): boolean {
    return this.evenValue;
  }

  set $even(value: boolean) {
    this.evenValue = value;
    this.getPropertyObservable("$even").notify();
  }

  get $odd(): boolean {
    return this.oddValue;
  }

  set $odd(value: boolean) {
    this.oddValue = value;
    this.getPropertyObservable("$odd").notify();
  }

  /**
   * Updates all context properties for this iteration scope.
   *
   * @param params - Object containing item, index, key, and count values
   */
  setContext(params: {
    item: unknown;
    index: number;
    key: KeyType;
    count: number;
  }): void {
    this.$item = params.item;
    this.$index = params.index;
    this.$key = params.key;
    this.$count = params.count;
    this.$first = params.index === 0;
    this.$last = params.index === params.count - 1;
    this.$even = params.index % 2 === 0;
    this.$odd = !this.$even;
  }
}
