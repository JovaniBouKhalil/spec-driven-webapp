# Implementation Plan: Task Manager

## Overview

Implement a single-page task manager as a plain HTML + CSS + vanilla JavaScript application with no build step. The implementation follows the unidirectional data flow pattern described in the design: a Task Store owns all state and persistence, a Renderer projects state to the DOM, a Validator guards all input, and a thin event-handler layer wires everything together.

Tasks are ordered to build the pure-logic core first, then the DOM layer, and finally wire them together — ensuring every piece is testable in isolation before integration.

---

## Tasks

- [x] 1. Set up project structure and static shell
  - Create `index.html` with the app skeleton: task input form, task list container, and empty-state placeholder
  - Create `style.css` with base layout styles, the `task--complete` class (strikethrough), and validation/error message styles
  - Create `app.js` as the single JavaScript entry point (IIFE or ES module)
  - Link `style.css` and `app.js` from `index.html`
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Implement the Validator module
  - [x] 2.1 Implement the `validate(title)` pure function
    - Returns `{ valid: true }` for trimmed titles of length 1–255
    - Returns `{ valid: false, reason: "EMPTY" }` for empty or whitespace-only strings
    - Returns `{ valid: false, reason: "TOO_LONG" }` for trimmed titles exceeding 255 characters
    - _Requirements: 1.1, 1.3, 1.4_

  - [ ]* 2.2 Write property test for `validate()` — Property 3: Whitespace/empty titles are rejected
    - **Property 3: Whitespace / empty titles are rejected**
    - Use fast-check to generate empty strings and whitespace-only strings; assert `{ valid: false, reason: "EMPTY" }`
    - **Validates: Requirements 1.3**

  - [ ]* 2.3 Write property test for `validate()` — Property 4: Over-length titles are rejected
    - **Property 4: Over-length titles are rejected**
    - Use fast-check to generate strings whose trimmed length exceeds 255 characters; assert `{ valid: false, reason: "TOO_LONG" }`
    - **Validates: Requirements 1.4**

  - [ ]* 2.4 Write unit tests for `validate()`
    - Test each invalid input class with concrete examples (empty string, `"   "`, 256-char string)
    - Test a 255-char string passes, a 1-char string passes
    - _Requirements: 1.1, 1.3, 1.4_

- [x] 3. Implement the Task Store — core data operations
  - [x] 3.1 Implement `_generateId()` using `crypto.randomUUID()` with a `Date.now()`+`Math.random()` base-36 fallback
    - After generation, verify the ID is not already present in `_tasks` before returning
    - _Requirements: 1.5_

  - [x] 3.2 Implement `add(title)`, `toggle(id)`, `remove(id)`, and `getAll()`
    - `add`: trims title, generates a unique ID, appends `{ id, title, completed: false }` to `_tasks`
    - `toggle`: flips `completed` on the matching task; logs a warning and no-ops if ID is unknown
    - `remove`: splices the matching task out; logs a warning and no-ops if ID is unknown
    - `getAll`: returns a shallow copy of `_tasks`
    - _Requirements: 1.1, 1.5, 3.1, 3.2, 4.2_

  - [ ]* 3.3 Write property test for Task Store — Property 2: Valid title acceptance
    - **Property 2: Valid title acceptance**
    - Use fast-check to generate strings of trimmed length 1–255; call `store.add()`; assert list length +1, title trimmed, `completed: false`, ID unique
    - **Validates: Requirements 1.1, 1.5**

  - [ ]* 3.4 Write property test for Task Store — Property 5: Toggle is its own inverse
    - **Property 5: Toggle is its own inverse (round-trip)**
    - Use fast-check to generate arbitrary Task_Lists and a random task; toggle twice; assert status unchanged and all other tasks unmodified
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 3.5 Write property test for Task Store — Property 6: Task IDs are unique after any sequence of additions
    - **Property 6: Task IDs are unique after any sequence of additions**
    - Use fast-check to generate sequences of up to 50 valid titles; add all; collect IDs; assert all pairwise distinct
    - **Validates: Requirements 1.5**

  - [ ]* 3.6 Write property test for Task Store — Property 7: Deletion removes exactly the targeted task
    - **Property 7: Deletion removes exactly the targeted task**
    - Use fast-check to generate arbitrary Task_Lists and a valid target ID; call `store.remove(id)`; assert only that task is absent and all others are unmodified in order
    - **Validates: Requirements 4.2**

- [x] 4. Implement the Task Store — persistence layer
  - [x] 4.1 Implement `_persist()` and `_deserialize(raw)`
    - `_persist`: serializes `_tasks` to JSON and writes to `localStorage["task-manager-tasks"]`; catches storage errors and emits a user-visible banner message
    - `_deserialize`: parses JSON; validates each element has string `id`, non-empty string `title`, and boolean `completed`; drops invalid records with a console warning; returns `null` on top-level parse failure
    - _Requirements: 5.1, 5.4_

  - [x] 4.2 Implement `load()`
    - Reads `localStorage["task-manager-tasks"]`; calls `_deserialize`; on `null` result clears the key and sets `_tasks = []`; on missing key sets `_tasks = []`
    - _Requirements: 5.2, 5.3, 5.4_

  - [ ]* 4.3 Write property test for Task Store — Property 1: Task serialization round-trip
    - **Property 1: Task serialization round-trip**
    - Use fast-check to generate arbitrary arrays of `Task` objects; serialize then deserialize; assert deep equality
    - **Validates: Requirements 5.5**

  - [ ]* 4.4 Write property test for Task Store — Property 9: Storage round-trip preserves Task_List across mutations and reload
    - **Property 9: Storage round-trip preserves Task_List across mutations and reload**
    - Use fast-check to generate mutation sequences (add/toggle/remove); after each mutation assert `localStorage` matches in-memory list; call `store.load()` and assert deep equality
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 4.5 Write property test for Task Store — Property 10: Malformed storage is tolerated at initialization
    - **Property 10: Malformed storage is tolerated at initialization**
    - Use fast-check to generate invalid JSON strings and invalid-shape JSON values; write to `localStorage`; call `store.load()`; assert `getAll()` returns `[]` and the key is removed
    - **Validates: Requirements 5.4**

  - [ ]* 4.6 Write unit tests for the persistence layer
    - `store.load()` initializes to `[]` when storage is empty
    - `store.load()` initializes to `[]` and clears storage when data is malformed
    - After `store.add()`, `localStorage["task-manager-tasks"]` contains the new task
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 5. Checkpoint — Ensure all store and validator tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement the Renderer
  - [x] 6.1 Implement `render(tasks, container)`
    - When `tasks` is empty, inject an empty-state message element into `container`
    - When `tasks` is non-empty, build a `<ul>` where each `<li>` has `data-task-id`, a checkbox/toggle control, the task title, and a delete button
    - Apply the `task--complete` CSS class to `<li>` elements whose task has `completed: true`
    - Perform a full re-render by replacing `container.innerHTML` on each call
    - Ensure all interactive controls have accessible `aria-label` attributes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.3_

  - [ ]* 6.2 Write property test for Renderer — Property 8: Render faithfully reflects task list state
    - **Property 8: Render faithfully reflects task list state**
    - Use fast-check to generate arbitrary Task_Lists (mixed completion statuses and arbitrary titles); call `render()`; assert item count equals list length, rendered titles match stored titles in order, `task--complete` class present iff `completed: true`
    - **Validates: Requirements 2.1, 2.3, 2.4**

  - [ ]* 6.3 Write unit tests for Renderer
    - Empty list renders the empty-state message and no `<li>` elements
    - Completed task renders with `task--complete` class; incomplete task does not
    - Each `<li>` carries the correct `data-task-id`
    - Delete button and toggle control are present on each list item
    - _Requirements: 2.1, 2.2, 2.3, 4.1_

- [ ] 7. Wire event handlers and bootstrap the application
  - [ ] 7.1 Implement the add-form `submit` handler
    - Trim the input value; call `validate()`; on failure display the inline validation message associated with the input via `aria-describedby` and do not mutate state; on success call `store.add()`, re-render, clear the input, and return focus to the input field
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 7.2 Implement the delegated `click` handler on the task list
    - Identify the target by `data-task-id` and by control type (toggle vs. delete)
    - For toggle: call `store.toggle(id)` and re-render; display an error banner if toggle fails
    - For delete: call `window.confirm()` for confirmation; on confirm call `store.remove(id)` and re-render; on cancel leave state unchanged; display an error banner if remove fails
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 7.3 Implement the `main` bootstrap sequence
    - Call `store.load()`, then `render(store.getAll(), listContainer)`, then attach the add-form and list click handlers
    - _Requirements: 5.2, 5.3_

  - [ ]* 7.4 Write unit tests for event handlers
    - Validation message is shown for empty submission; no task is added
    - Validation message is shown for over-length title; no task is added
    - Input field is cleared after a successful add
    - Confirmation prompt is shown before deletion; no deletion occurs on cancel
    - Empty-state message appears when the last task is deleted
    - _Requirements: 1.2, 1.3, 1.4, 4.1, 4.3, 4.4_

- [ ] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The property tests use **fast-check** (browser/Node compatible); install with `npm install --save-dev fast-check` or load from a CDN in a test HTML page
- Checkpoints ensure incremental validation at logical boundaries
- Property tests validate universal correctness properties; unit tests cover concrete examples and edge cases
- The Renderer uses full `innerHTML` replacement — adequate for tens to low hundreds of tasks per the design

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "2.4", "3.2"] },
    { "id": 2, "tasks": ["3.3", "3.4", "3.5", "3.6", "4.1"] },
    { "id": 3, "tasks": ["4.2", "6.1"] },
    { "id": 4, "tasks": ["4.3", "4.4", "4.5", "4.6", "6.2", "6.3", "7.1"] },
    { "id": 5, "tasks": ["7.2"] },
    { "id": 6, "tasks": ["7.3"] },
    { "id": 7, "tasks": ["7.4"] }
  ]
}
```
