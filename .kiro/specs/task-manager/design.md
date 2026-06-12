# Design Document: Task Manager

## Overview

The Task Manager is a single-page web application that lets users create, view, complete, and delete personal tasks. It runs entirely in the browser — no backend, no build step required — and relies on `localStorage` for persistence so tasks survive page reloads and browser restarts.

The application is deliberately lightweight: a single HTML file, a vanilla JavaScript module, and a plain CSS stylesheet. This keeps the dependency surface minimal and the mental model simple while still delivering a clean, accessible UI.

**Key design goals:**

- **Simplicity** — No framework, no bundler, no server. Drop the files in a folder and open `index.html`.
- **Correctness** — All state mutations go through a well-defined task store; the UI is a pure projection of that state.
- **Persistence** — Every write to the task list is immediately synced to `localStorage`; every load reads from it before rendering.
- **Accessibility** — Semantic HTML, visible focus management, and ARIA labels so the app is usable with a keyboard and screen reader.

---

## Architecture

The application follows a **unidirectional data flow** pattern:

```
User Interaction
      │
      ▼
   UI Event Handler
      │  (calls)
      ▼
   Task Store  ──► localStorage (side effect)
      │  (returns new state)
      ▼
   Renderer (pure)
      │
      ▼
   DOM
```

All business logic lives in the **Task Store** module. The **Renderer** reads from the store and builds DOM nodes. **Event handlers** sit in the UI layer and bridge user gestures to store operations. This separation ensures the store can be tested without touching the DOM, and the renderer can be tested without touching storage.

### Module Breakdown

```
task-manager/
├── index.html          # Shell: mounts the app, loads scripts
├── style.css           # Visual styles only — no layout logic in JS
└── app.js              # Single JS entry point (split into logical sections):
    ├── taskStore       # State + persistence (pure functions + localStorage calls)
    ├── renderer        # DOM construction/patching
    ├── validator       # Input validation rules
    └── main            # Wires event listeners; bootstraps the app
```

Because the project targets modern browsers and avoids a build step, `app.js` uses ES module syntax (`import`/`export`) if served from a local server, or can be written as a single IIFE-style script for file-system use.

---

## Components and Interfaces

### 1. Validator

Responsible for deciding whether a proposed task title is acceptable before any state mutation occurs.

```
validate(title: string): ValidationResult

ValidationResult:
  { valid: true }
  { valid: false; reason: "EMPTY" | "TOO_LONG" }
```

- `"EMPTY"` — title is empty or whitespace-only after trimming
- `"TOO_LONG"` — trimmed title exceeds 255 characters

The validator is a pure function with no side effects. It trims the title internally but does **not** return the trimmed value; callers are responsible for trimming before passing to the store.

---

### 2. Task Store

Manages the in-memory `Task_List` and owns all interactions with `localStorage`.

```
TaskStore interface:

  getAll(): Task[]              — returns a copy of the current Task_List (insertion order)
  add(title: string): Task      — creates & appends a new Task; syncs to storage
  toggle(id: string): Task      — flips completion status; syncs to storage
  remove(id: string): void      — deletes the Task with given id; syncs to storage
  load(): void                  — reads & deserializes from localStorage on boot
```

Internal helpers (not exposed):

```
  _generateId(): string         — returns a collision-free Task_ID (see §Data Models)
  _persist(): void              — serializes Task_List and writes to localStorage
  _deserialize(raw: string): Task[] | null — parses JSON; returns null on failure
```

The store keeps a single private array `_tasks: Task[]` as the source of truth. Every mutating operation modifies `_tasks` then immediately calls `_persist()`.

---

### 3. Renderer

Translates the current `Task[]` state into DOM. Called after every state change.

```
render(tasks: Task[], container: HTMLElement): void
```

- If `tasks` is empty, injects the empty-state message element.
- Otherwise, builds a `<ul>` where each `<li>` represents one task.
- Applies `text-decoration: line-through` (via a CSS class `task--complete`) for completed tasks.
- Each `<li>` carries the `data-task-id` attribute so event delegation can identify which task was acted upon.

The renderer performs a **full re-render** on each call (replaces `container.innerHTML`). For the expected task list sizes (tens to low hundreds), this is fast enough and dramatically simpler than a diffing approach. A future optimization could introduce keyed diffing.

---

### 4. UI / Event Handlers (`main`)

Bootstrap sequence:

1. Call `store.load()` to hydrate state from `localStorage`.
2. Call `render(store.getAll(), listContainer)` to paint initial UI.
3. Attach event listeners:
   - **Add form `submit`** → validate → `store.add()` → re-render → clear input
   - **List `click`** (delegated) → identify target (complete toggle or delete button) → act accordingly

Delete confirmation uses the browser's built-in `window.confirm()` dialog for simplicity. This satisfies Requirement 4.1 without requiring a custom modal component.

---

## Data Models

### Task

```
interface Task {
  id:        string;   // Task_ID — unique, stable across sessions
  title:     string;   // Trimmed, 1–255 characters
  completed: boolean;  // false = incomplete, true = complete
}
```

### Task_ID Generation

Task IDs must be unique among all tasks currently in the list (Requirement 1.5). The implementation uses `crypto.randomUUID()`, which is available in all modern browsers and produces UUID v4 strings. On environments where `crypto.randomUUID` is unavailable, a fallback generates a collision-resistant ID by combining `Date.now()` with `Math.random()` and encoding as a base-36 string.

Before inserting, the store checks that the generated ID does not already exist in `_tasks` (defensive guard; collisions are astronomically unlikely with UUID v4 but the check makes the invariant explicit).

### localStorage Schema

Key: `"task-manager-tasks"`

Value: JSON array of `Task` objects.

```json
[
  { "id": "550e8400-e29b-41d4-a716-446655440000", "title": "Buy groceries", "completed": false },
  { "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8", "title": "Write design doc", "completed": true }
]
```

On deserialization, the store validates that the parsed value is an array and that every element has a string `id`, a non-empty string `title`, and a boolean `completed`. Any record that fails this check is dropped, and a console warning is emitted. If the top-level parse fails entirely, the store initializes with `[]` and removes the corrupted key from storage (Requirement 5.4).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Task serialization round-trip

*For any* Task_List containing zero or more Tasks (each with a title, Task_ID, and completion status), serializing the list to JSON and then deserializing it SHALL produce a Task_List with identical Tasks, identical titles, identical Task_IDs, and identical completion statuses.

**Validates: Requirements 5.5**

---

### Property 2: Valid title acceptance

*For any* non-empty string whose trimmed length is between 1 and 255 characters, calling `store.add()` SHALL increase the length of the Task_List by exactly one, and the new Task SHALL have the trimmed title, a `completed` value of `false`, and a unique ID not present in the list before the call.

**Validates: Requirements 1.1, 1.5**

---

### Property 3: Whitespace / empty titles are rejected

*For any* string that is empty or composed entirely of whitespace characters, the validator SHALL return `{ valid: false, reason: "EMPTY" }`, and no Task SHALL be added to the Task_List.

**Validates: Requirements 1.3**

---

### Property 4: Over-length titles are rejected

*For any* string whose trimmed length exceeds 255 characters, the validator SHALL return `{ valid: false, reason: "TOO_LONG" }`, and no Task SHALL be added to the Task_List.

**Validates: Requirements 1.4**

---

### Property 5: Toggle is its own inverse (round-trip)

*For any* Task in the Task_List, toggling its completion status twice SHALL return the Task to its original completion status, and all other Tasks in the list SHALL remain unmodified.

This single property subsumes both the incomplete→complete and complete→incomplete directions of toggle (Requirements 3.1 and 3.2), since if toggle is a true inverse, both directions must be correct.

**Validates: Requirements 3.1, 3.2**

---

### Property 6: Task IDs are unique after any sequence of additions

*For any* sequence of N valid task titles (N ≥ 1) added to an initially empty Task_List, all resulting Task_IDs SHALL be pairwise distinct.

**Validates: Requirements 1.5**

---

### Property 7: Deletion removes exactly the targeted task

*For any* Task_List and any valid Task_ID present in that list, calling `store.remove(id)` SHALL produce a Task_List that (a) does not contain the task with the given ID and (b) contains every other task, unmodified and in the same order.

**Validates: Requirements 4.2**

---

### Property 8: Render faithfully reflects task list state

*For any* Task_List (including mixed completion statuses and arbitrary titles), the renderer SHALL produce a DOM list where (a) the number of rendered items equals the number of tasks, (b) the rendered titles match the stored titles exactly, (c) each rendered item appears in insertion order, and (d) the `task--complete` CSS class is present on an item if and only if the corresponding task has `completed: true`.

This property consolidates the rendering fidelity rules from Requirements 2.1, 2.3, and 2.4 into a single comprehensive property, since they all describe invariants of the same `render()` function.

**Validates: Requirements 2.1, 2.3, 2.4**

---

### Property 9: Storage round-trip preserves Task_List across mutations and reload

*For any* sequence of valid mutations (add, toggle, remove) applied to a Task_List, after each mutation the value written to `localStorage["task-manager-tasks"]` SHALL be a valid JSON representation of the current in-memory Task_List; and for any such serialized value, calling `store.load()` SHALL restore the in-memory Task_List to one that is deeply equal to the original.

This property covers both the write path (Requirement 5.1) and the read path (Requirement 5.2) in one round-trip property, ensuring persistence is bidirectionally correct.

**Validates: Requirements 5.1, 5.2**

---

### Property 10: Malformed storage is tolerated at initialization

*For any* string stored in `localStorage["task-manager-tasks"]` that is either (a) not valid JSON or (b) valid JSON but not an array of valid Task objects, calling `store.load()` SHALL initialize the in-memory Task_List to `[]` and SHALL remove the key from `localStorage`.

**Validates: Requirements 5.4**

---

## Error Handling

| Scenario | Handling |
|---|---|
| Empty / whitespace title submitted | Validator returns `EMPTY`; UI shows inline validation message; no state mutation |
| Title > 255 characters submitted | Validator returns `TOO_LONG`; UI shows inline validation message with max length; no state mutation |
| `localStorage.setItem` throws (storage quota exceeded or security error) | Catch the error; display a non-blocking toast/banner; in-memory state remains consistent |
| Malformed data in `localStorage` at init | Log warning to console; discard bad data; initialize with empty list; remove the corrupted key |
| `toggle()` called with unknown ID | Log warning; no state mutation; UI re-renders current state (no visible change) |
| `remove()` called with unknown ID | Log warning; no state mutation; UI re-renders current state (no visible change) |

All error paths preserve the last known good state so the user never sees a broken or inconsistent task list.

---

## Testing Strategy

### Dual Testing Approach

Testing is split into two complementary layers:

**Unit / property tests** — cover pure logic (validator, store mutations, serialization). No DOM, no network.

**Example-based integration tests** — verify UI behavior by mounting the component tree against a real (or mocked) DOM.

### Property-Based Testing

The feature contains several pure functions whose correctness should hold for all valid inputs, making it a good fit for property-based testing. The recommended library for browser/Node JavaScript is **fast-check**.

Each property test runs a minimum of **100 iterations**.

Property test tag format:
`// Feature: task-manager, Property {N}: {property_text}`

| Design Property | Test strategy |
|---|---|
| Property 1 — Serialization round-trip | Generate arbitrary arrays of `Task` objects; serialize then deserialize; deep-equal check |
| Property 2 — Valid title acceptance | Generate strings of length 1–255 (trimmed); call `store.add()`; assert list length +1, title trimmed, completed=false, ID unique |
| Property 3 — Empty/whitespace rejection | Generate strings from the whitespace alphabet (and empty string); call `validate()`; assert `valid: false, reason: "EMPTY"` |
| Property 4 — Over-length rejection | Generate strings with trimmed length > 255; call `validate()`; assert `valid: false, reason: "TOO_LONG"` |
| Property 5 — Toggle round-trip | Generate arbitrary Task_Lists; pick a random task; toggle twice; assert status unchanged and all other tasks unmodified |
| Property 6 — ID uniqueness | Generate sequences of N valid titles (N up to 50); add all; collect IDs; assert all pairwise distinct |
| Property 7 — Deletion precision | Generate arbitrary Task_Lists; pick a random task; call `store.remove(id)`; assert only that task is absent and all others are unmodified in order |
| Property 8 — Render fidelity | Generate arbitrary Task_Lists; call `render()`; assert item count, titles in order, and CSS class match task data |
| Property 9 — Storage round-trip | Generate mutation sequences; after each mutation assert localStorage matches in-memory list; generate stored task arrays; call `store.load()`; assert deep equality |
| Property 10 — Malformed storage tolerance | Generate invalid JSON strings and invalid-shape JSON; write to localStorage; call `store.load()`; assert `getAll()=[]` and key removed |

### Unit Tests (Example-Based)

- Validator returns correct reasons for each invalid input class
- `store.load()` initializes to `[]` when storage is empty
- `store.load()` initializes to `[]` and clears storage when data is malformed
- `store.add()` clears input field after successful add
- Confirmation prompt is shown before deletion; no deletion occurs on cancel
- Empty-state message appears when the last task is deleted
- Completed task renders with `task--complete` CSS class; incomplete without it

### Integration Tests

- Full add → view → complete → delete cycle on a real DOM
- Page reload restores task list from localStorage
- Storage quota error is surfaced to the user without breaking existing state

### Accessibility Checks

- Tab order follows visual reading order
- Delete and toggle controls have accessible labels (`aria-label`)
- Validation messages are associated with the input via `aria-describedby`
- Focus returns to the input field after adding a task
