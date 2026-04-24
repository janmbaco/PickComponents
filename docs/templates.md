# Template System

Pick Components uses an HTML-aware template system with two active runtime dialects, limited extraction contexts, and managed host handling for projection and inputs.

## Dialects

- **Reactive bindings `{{...}}`:** Subscribes to component properties; updates the DOM when values change.
- **Validation rules `[[RULES.field]]`:** Emits HTML validation attributes based on `component.rules`, typically hydrated by the initializer before the first real render.

## Extraction rules

- Parsed contexts: text nodes and attribute values.
- Excluded contexts: tag names, attribute names, `<script>`, `<style>`, `<template>`, HTML comments, event handler attributes, `style` attribute, `srcdoc` attribute.
- URL attributes with dynamic bindings, such as `href`, `src`, and `formaction`, are written only when the resolved value uses a safe URL shape: relative URLs or `http:`, `https:`, `mailto:`, or `tel:`.

Example (allowed):

```html
<p>Value: {{count}}</p>
<div class="theme-{{mode}}"></div>
```

Blocked examples:

```html
<{{tag}}></{{tag}}>
<button onclick="{{handler}}">Click</button>
<script>{{code}}</script>
```

## Content projection via native `<slot>`

Use standard HTML `<slot>` and `<slot name="x">` elements inside component templates. Shadow DOM handles projection natively. Assign content to named slots with the `slot="x"` attribute on Light DOM children.

## CSS and Shadow DOM styling

Component styles are scoped to the Shadow Root and never leak to the global document. Declare styles via the `styles` option in `@Pick` / `@PickRender`; they are injected as a `<style>` element inside the Shadow Root on every render.

### `:host` — host element styles

Use the `:host` pseudo-class to style the custom element itself from inside the Shadow Root. This replaces any need for an external `display` or layout override.

```css
/* Always show as block */
:host {
  display: block;
}

/* Transparent layout container */
:host {
  display: contents;
}

/* Conditional via attribute */
:host([hidden]) {
  display: none;
}

/* Responsive */
:host {
  display: flex;
  gap: 1rem;
}
@media (max-width: 600px) {
  :host {
    flex-direction: column;
  }
}
```

In `@Pick`:

```typescript
ctx.css(`
  :host { display: block; padding: 1rem; }
`);
```

In `@PickRender`:

```typescript
@PickRender({
  selector: 'my-card',
  styles: `:host { display: block; border: 1px solid #ccc; }`,
  template: `...`,
})
```

### `::slotted()` — styling projected content

The `::slotted()` pseudo-element applies styles to Light DOM children projected into a `<slot>`. Only direct slotted children can be targeted (not grandchildren).

```css
/* All slotted children */
::slotted(*) {
  color: inherit;
}

/* Specific slotted element type */
::slotted(p) {
  margin: 0;
}

/* Slotted children with a class */
::slotted(.highlighted) {
  background: yellow;
}
```

### CSS custom properties — theming across Shadow DOM

CSS custom properties (variables) pierce the Shadow DOM boundary and are the recommended pattern for theming.

```css
/* Consumer page defines theme tokens */
:root {
  --card-bg: #fff;
  --card-padding: 1rem;
}

/* Component styles consume them with a fallback */
:host {
  background: var(--card-bg, white);
  padding: var(--card-padding, 0.5rem);
}
```

This allows external theming without breaking encapsulation.

## Managed hosts

- A managed host is an element rendered through Pick Components with attached component metadata.
- Class transfer: host classes merge into the outlet element; duplicates are removed; host classes stay first.
- ID transfer: host ID moves to the outlet only when the outlet lacks an ID; otherwise both keep their IDs.

## Outlet selection

Outlet resolution is prioritized as:

1. Element with `.outlet` class
2. Single child element when only one exists
3. Root element as fallback

## Input handling

- Host attributes are copied to component properties by `PickElementFactory`
  when the property exists on the component instance.
- Reactive attribute values are managed by `BindingResolver`.
- Supported values: primitives (`title="Card"`), object/array references
  (`items="{{entries}}"` stored by `ObjectRegistry` id), mixed text
  (`msg="Hello {{name}}"`), and boolean attributes such as
  `disabled="{{loading}}"`.
- Structural attributes on primitives such as `<pick-action action="save">`
  are consumed by those primitives and are not component inputs.

## Pick primitives

### `<pick-action>`

```html
<pick-action action="save" value="{{draft}}">
  <button type="button">Save</button>
</pick-action>
```

- `action`: action name exposed by `ctx.on(...)` or `getViewActions()`.
- `event`: alias for `action`; prefer `action` in new code.
- `value`: optional first argument passed to the action.
- `bubble`: opt-in propagation beyond the nearest PickComponent.

The DOM event is always `pick-action`, but handled actions stop at the nearest
component unless `bubble` is present.

### `<pick-for>`

```html
<pick-for items="{{todos}}" key="id">
  <p>{{$item.text}}</p>
</pick-for>
```

`items` receives the array. `key` is optional but recommended when rows have a
stable identifier. Each row exposes `$item` to its template.

### `<pick-select>`

```html
<pick-select>
  <on condition="{{loading}}">
    <p aria-busy="true">Loading...</p>
  </on>
  <otherwise>
    <p>Ready</p>
  </otherwise>
</pick-select>
```

`<on>` branches render when their `condition` resolves truthy. If no `<on>`
branch matches, `<otherwise>` renders.
