---
description: "Use when writing, reviewing, or fixing tests. Covers test structure (AAA), naming conventions, mocks, assertions, error testing, and Playwright configuration for this project."
applyTo: "tests/**, test/**"
---

# Testing Instructions — Repository Tests (TypeScript + Playwright)

> Framework: Playwright (unit & integration), `@testing-library/dom`. JSDoc in English.

---

## 1) Structure & Naming

- **AAA:** `// Arrange`, `// Act`, `// Assert` (or `// Act & Assert`) as comments in every test
- Arrange ≤ 5 lines; extract complex setup to helpers; `{SutName}.spec.ts` / `{SutName}.test.ts`
- **Name:** `should {action} when {condition}` or `{Sut}_when{Condition}_then{Result}`

```typescript
test.describe("OrderService", () => {
  test("should save order when order is valid", async () => {
    // Arrange
    const service = new OrderService(mockLogger, mockRepository);
    // Act
    const result = await service.add(createValidOrder());
    // Assert
    expect(result).toBe(true);
  });
  test("should throw error when order is null", () => {
    // Act & Assert
    expect(() =>
      new OrderService(mockLogger, mockRepository).add(null as any),
    ).toThrow("Order is required");
  });
});
```

---

## 2) Mocks

- Plain objects only (no built-in mock utilities); configure in **Arrange**, not `beforeEach`
- **Mock:** interfaces, external services, async I/O · **Real:** domain classes, pure functions

```typescript
const mockRepository = { save: () => Promise.resolve(true) };
const mockLogger = { info: () => {}, warn: () => {}, error: () => {} };
```

- **Integration:** `createTestRegistry()` — `new DefaultServiceRegistry()` + `bootstrapFramework(registry)`
- **Unit:** explicit mocks in constructor args; no framework bootstrap; never global `Services`

---

## 3) Assertions

`toBe` · `toEqual` · `toStrictEqual` · `toBeTruthy/Falsy` · `toBeNull/Undefined/Defined` · `toContain` · `toHaveLength` · `toHaveProperty`
`await expect(p).resolves.toBe(v)` · `await expect(p).rejects.toThrow('msg')`

---

## 4) Error Testing

```typescript
expect(() => service.validate({ items: [] })).toThrow(ValidationError);
await expect(service.add(order)).rejects.toThrow(DatabaseError);
```

---

## 5) Determinism & Isolation

- No random data, no timing dependencies; no shared mutable state
- `beforeEach` for setup, `afterEach` for cleanup; `beforeAll` only for expensive one-time setup
- Never global `Services` in unit tests; integration: `Services.clear()` in `afterEach`

---

## 6) Data-Driven Tests

```typescript
cases.forEach(({ input, expected, reason }) => {
  test(`should handle: ${reason}`, () => expect(fn(input)).toBe(expected));
});
```

## 7) Playwright Config

```typescript
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  timeout: 10000,
  expect: { timeout: 5000 },
});
```
