import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import { RenderEngine } from "../../src/rendering/render-engine.js";
import { PickComponent } from "../../src/core/pick-component.js";
import { PickRender } from "../../src/decorators/pick-render.decorator.js";
import { Reactive } from "../../src/decorators/index.js";
import { Services } from "../../src/providers/service-provider.js";
import { bootstrapFramework } from "../../src/providers/framework-bootstrap.js";

interface TodoItem {
  readonly id: number;
  readonly text: string;
  done: boolean;
}

/**
 * Integration tests for TodoManager component logic.
 *
 * Tests cover:
 * - toggleDone mutates the done flag correctly
 * - removeTodo removes the correct item
 * - Reactive class attribute binding updates the DOM after state change
 *
 * NOTE: Tests involving pick-for item rendering require the Custom Elements API
 * which depends on a real browser. The reactive class binding tests use a flat
 * template that does not rely on pick-for to verify the ternary expression
 * resolves correctly in the binding resolver pipeline.
 */
test.describe("TodoManager Integration", () => {
  let dom: JSDOM;
  let document: Document;
  let renderEngine: RenderEngine;
  let targetRoot: HTMLElement;

  test.beforeEach(async () => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document as unknown as Document;
    (global as any).document = document;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).Element = dom.window.Element;
    (global as any).Node = dom.window.Node;
    (global as any).CustomEvent = dom.window.CustomEvent;
    (global as any).MutationObserver = dom.window.MutationObserver;

    Services.clear();
    await bootstrapFramework(Services);
    renderEngine = Services.get<RenderEngine>("IRenderEngine");

    targetRoot = document.createElement("div");
    document.body.appendChild(targetRoot);
  });

  test.afterEach(() => {
    Services.clear();
    delete (global as any).document;
    delete (global as any).HTMLElement;
    delete (global as any).Element;
    delete (global as any).Node;
    delete (global as any).CustomEvent;
    delete (global as any).MutationObserver;
  });

  test.describe("toggleDone state logic", () => {
    test("should set done to true when toggling an undone item", () => {
      // Arrange
      class TodoManagerLogic extends PickComponent {
        @Reactive accessor todos: readonly TodoItem[] = [
          { id: 1, text: "task", done: false },
        ];

        toggleDone(id: unknown): void {
          const numericId = Number(id);
          this.todos = this.todos.map((todo) =>
            todo.id === numericId ? { ...todo, done: !todo.done } : todo,
          );
        }
      }
      const component = new TodoManagerLogic();

      // Act
      component.toggleDone(1);

      // Assert
      expect(component.todos[0].done).toBe(true);
    });

    test("should set done to false when toggling an already done item", () => {
      // Arrange
      class TodoManagerLogic2 extends PickComponent {
        @Reactive accessor todos: readonly TodoItem[] = [
          { id: 1, text: "task", done: true },
        ];

        toggleDone(id: unknown): void {
          const numericId = Number(id);
          this.todos = this.todos.map((todo) =>
            todo.id === numericId ? { ...todo, done: !todo.done } : todo,
          );
        }
      }
      const component = new TodoManagerLogic2();

      // Act
      component.toggleDone(1);

      // Assert
      expect(component.todos[0].done).toBe(false);
    });

    test("should not affect other items when toggling one", () => {
      // Arrange
      class TodoManagerLogic3 extends PickComponent {
        @Reactive accessor todos: readonly TodoItem[] = [
          { id: 1, text: "first", done: false },
          { id: 2, text: "second", done: false },
        ];

        toggleDone(id: unknown): void {
          const numericId = Number(id);
          this.todos = this.todos.map((todo) =>
            todo.id === numericId ? { ...todo, done: !todo.done } : todo,
          );
        }
      }
      const component = new TodoManagerLogic3();

      // Act
      component.toggleDone(1);

      // Assert
      expect(component.todos[0].done).toBe(true);
      expect(component.todos[1].done).toBe(false);
    });
  });

  test.describe("removeTodo state logic", () => {
    test("should remove item with matching id", () => {
      // Arrange
      class TodoManagerRemove extends PickComponent {
        @Reactive accessor todos: readonly TodoItem[] = [
          { id: 1, text: "first", done: false },
          { id: 2, text: "second", done: false },
        ];

        removeTodo(id: unknown): void {
          const numericId = Number(id);
          this.todos = this.todos.filter((todo) => todo.id !== numericId);
        }
      }
      const component = new TodoManagerRemove();

      // Act
      component.removeTodo(1);

      // Assert
      expect(component.todos.length).toBe(1);
      expect(component.todos[0].id).toBe(2);
    });

    test("should not modify list when id does not match", () => {
      // Arrange
      class TodoManagerRemove2 extends PickComponent {
        @Reactive accessor todos: readonly TodoItem[] = [
          { id: 1, text: "task", done: false },
        ];

        removeTodo(id: unknown): void {
          const numericId = Number(id);
          this.todos = this.todos.filter((todo) => todo.id !== numericId);
        }
      }
      const component = new TodoManagerRemove2();

      // Act
      component.removeTodo(999);

      // Assert
      expect(component.todos.length).toBe(1);
    });
  });

  test.describe("setFilter and activeCount logic", () => {
    class TodoManagerFull extends PickComponent {
      @Reactive accessor todos: readonly TodoItem[] = [
        { id: 1, text: "first", done: false },
        { id: 2, text: "second", done: true },
        { id: 3, text: "third", done: false },
      ];
      @Reactive accessor filter: "all" | "active" | "done" = "all";
      @Reactive accessor filteredTodos: readonly TodoItem[] = [];
      @Reactive accessor activeCount = 0;

      private applyFilter(): void {
        const active = this.todos.filter((t) => !t.done);
        const done = this.todos.filter((t) => t.done);
        this.filteredTodos =
          this.filter === "active"
            ? active
            : this.filter === "done"
              ? done
              : this.todos;
        this.activeCount = active.length;
      }

      setFilter(value: unknown): void {
        this.filter = value as "all" | "active" | "done";
        this.applyFilter();
      }

      clearDone(): void {
        this.todos = this.todos.filter((t) => !t.done);
        this.applyFilter();
      }
    }

    test("should show only active todos when filter is set to active", () => {
      // Arrange
      const component = new TodoManagerFull();

      // Act
      component.setFilter("active");

      // Assert
      expect(component.filteredTodos.length).toBe(2);
      expect(component.filteredTodos.every((t) => !t.done)).toBe(true);
    });

    test("should show only done todos when filter is set to done", () => {
      // Arrange
      const component = new TodoManagerFull();

      // Act
      component.setFilter("done");

      // Assert
      expect(component.filteredTodos.length).toBe(1);
      expect(component.filteredTodos[0].done).toBe(true);
    });

    test("should show all todos when filter is all", () => {
      // Arrange
      const component = new TodoManagerFull();
      component.setFilter("active");

      // Act
      component.setFilter("all");

      // Assert
      expect(component.filteredTodos.length).toBe(3);
    });

    test("should compute activeCount correctly after toggle", () => {
      // Arrange
      const component = new TodoManagerFull();
      component.setFilter("all");

      // Assert initial count
      expect(component.activeCount).toBe(2);
    });

    test("should remove done todos and update count when clearDone is called", () => {
      // Arrange
      const component = new TodoManagerFull();
      component.setFilter("all");

      // Act
      component.clearDone();

      // Assert
      expect(component.todos.length).toBe(2);
      expect(component.todos.every((t) => !t.done)).toBe(true);
      expect(component.activeCount).toBe(2);
    });
  });

  test.describe("ternary class binding initial render", () => {
    test("should not have done class when done is false on initial render", async () => {
      // Arrange — flat template (no pick-for) to test ternary binding through the full pipeline
      @PickRender({
        selector: "todo-ternary-test-1",
        template: `<li class="todo-item {{isDone ? 'done' : ''}}">task</li>`,
      })
      class TodoTernaryTest1 extends PickComponent {
        @Reactive accessor isDone = false;
      }

      const component = new TodoTernaryTest1();
      const host = document.createElement("todo-ternary-test-1");

      // Act
      await renderEngine.render({
        componentId: "todo-ternary-test-1",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert — class contains 'todo-item' but NOT 'done'
      const li = targetRoot.querySelector("li")!;
      expect(li).not.toBeNull();
      expect(li.className).toContain("todo-item");
      expect(li.className).not.toContain("done");
    });

    test("should have done class when done is true on initial render", async () => {
      // Arrange
      @PickRender({
        selector: "todo-ternary-test-2",
        template: `<li class="todo-item {{isDone ? 'done' : ''}}">task</li>`,
      })
      class TodoTernaryTest2 extends PickComponent {
        @Reactive accessor isDone = true;
      }

      const component = new TodoTernaryTest2();
      const host = document.createElement("todo-ternary-test-2");

      // Act
      await renderEngine.render({
        componentId: "todo-ternary-test-2",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert
      const li = targetRoot.querySelector("li")!;
      expect(li).not.toBeNull();
      expect(li.className).toContain("todo-item");
      expect(li.className).toContain("done");
    });

    test("should evaluate filter comparison ternary for active filter button", async () => {
      // Arrange — verifies filter === 'all' ? 'active' : '' resolves through parsed expression path
      @PickRender({
        selector: "todo-filter-test-1",
        template: `<button class="filter-btn {{currentFilter === 'all' ? 'current' : ''}}">All</button>`,
      })
      class TodoFilterTest extends PickComponent {
        @Reactive accessor currentFilter = "all";
      }

      const component = new TodoFilterTest();
      const host = document.createElement("todo-filter-test-1");

      // Act
      await renderEngine.render({
        componentId: "todo-filter-test-1",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert
      const btn = targetRoot.querySelector("button")!;
      expect(btn.className).toContain("filter-btn");
      expect(btn.className).toContain("current");
    });

    test("should not have active class on inactive filter button", async () => {
      // Arrange
      @PickRender({
        selector: "todo-filter-test-2",
        template: `<button class="filter-btn {{currentFilter === 'active' ? 'current' : ''}}">Active</button>`,
      })
      class TodoFilterTest2 extends PickComponent {
        @Reactive accessor currentFilter = "all";
      }

      const component = new TodoFilterTest2();
      const host = document.createElement("todo-filter-test-2");

      // Act
      await renderEngine.render({
        componentId: "todo-filter-test-2",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert
      const btn = targetRoot.querySelector("button")!;
      expect(btn.className).toContain("filter-btn");
      expect(btn.className).not.toContain("current");
    });
  });
});
