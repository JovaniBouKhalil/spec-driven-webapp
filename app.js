/**
 * app.js — Task Manager entry point
 *
 * Sections (to be implemented in subsequent tasks):
 *   1. validator   — input validation (Tasks 2.x)
 *   2. taskStore   — in-memory state + localStorage (Tasks 3.x, 4.x)
 *   3. renderer    — DOM construction (Tasks 6.x)
 *   4. main        — bootstrap + event wiring (Tasks 7.x)
 *
 * This file is a skeleton created in Task 1. No logic is implemented yet.
 */

(function () {
  "use strict";

  // ── Placeholder sections ──────────────────────────────────────────────────
  // Each section will be filled in as the corresponding task is implemented.

  // ── validator ─────────────────────────────────────────────────────────────
  // Pure function — no side effects, no DOM access, no storage access.
  // Called before any state mutation to decide whether a proposed title is
  // acceptable (Requirements 1.1, 1.3, 1.4).

  /**
   * Validate a proposed task title.
   *
   * Rules (from Requirements 1.1, 1.3, 1.4):
   *   - Empty or whitespace-only → EMPTY
   *   - Trimmed length > 255     → TOO_LONG
   *   - Otherwise                → valid
   *
   * The function does NOT return the trimmed value; callers are responsible
   * for trimming before passing the title to the task store.
   *
   * @param {string} title - The raw value from the input field.
   * @returns {{ valid: true } | { valid: false, reason: "EMPTY" | "TOO_LONG" }}
   */
  function validate(title) {
    var trimmed = title.trim();

    if (trimmed.length === 0) {
      // Requirement 1.3 — empty or whitespace-only title must be rejected.
      return { valid: false, reason: "EMPTY" };
    }

    if (trimmed.length > 255) {
      // Requirement 1.4 — title exceeding 255 characters must be rejected.
      return { valid: false, reason: "TOO_LONG" };
    }

    // Requirement 1.1 — title is acceptable.
    return { valid: true };
  }

  // ── taskStore — core data operations + persistence ───────────────────────
  // Owns the single source of truth: the private _tasks array.
  // All mutations go through this object; nothing else touches _tasks directly.
  // Persistence layer (_persist, _deserialize, load) is implemented in Task 4.

  var taskStore = (function () {
    /** @type {Array<{id: string, title: string, completed: boolean}>} */
    var _tasks = [];

    // ── 3.1  _generateId ────────────────────────────────────────────────────
    /**
     * Generate a collision-free Task_ID.
     *
     * Primary:  crypto.randomUUID()  — UUID v4, available in all modern browsers.
     * Fallback: Date.now() + Math.random() encoded as base-36, for environments
     *           where crypto.randomUUID is unavailable.
     *
     * After generation the ID is checked against every existing task as a
     * defensive guard; in practice UUID v4 collisions are astronomically
     * unlikely but the invariant is made explicit here.
     *
     * Satisfies: Requirement 1.5 — each Task_ID must be unique within _tasks.
     *
     * @returns {string}
     */
    function _generateId() {
      var id;
      // Try the native UUID generator first.
      if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
      ) {
        id = crypto.randomUUID();
      } else {
        // Fallback: combine timestamp + random fraction, encode as base-36.
        id =
          Date.now().toString(36) +
          "-" +
          Math.random().toString(36).slice(2, 10);
      }

      // Defensive uniqueness guard — retry if (extremely unlikely) collision.
      var collision = _tasks.some(function (t) {
        return t.id === id;
      });
      if (collision) {
        return _generateId(); // recurse once; collision probability is negligible
      }

      return id;
    }

    // ── 3.2  Public store API ────────────────────────────────────────────────

    /**
     * Return a shallow copy of _tasks in insertion order.
     *
     * Returning a copy prevents callers from mutating the internal array
     * directly, preserving the store as the single authority over state.
     *
     * Satisfies: Requirement 2.1 — tasks must be displayed in insertion order.
     *
     * @returns {Array<{id: string, title: string, completed: boolean}>}
     */
    function getAll() {
      return _tasks.slice();
    }

    /**
     * Create a new Task and append it to _tasks.
     *
     * The title is trimmed here (Req 1.1 mandates the stored title is the
     * trimmed value). The caller (event handler, Task 7) is responsible for
     * running validate() before calling add().
     *
     * Satisfies: Requirements 1.1 (trimmed title, incomplete status, unique ID),
     *            1.5 (unique Task_ID via _generateId).
     *
     * @param {string} title - Already-validated raw title from the input field.
     * @returns {{id: string, title: string, completed: boolean}} The new Task.
     */
    function add(title) {
      var task = {
        id: _generateId(),
        title: title.trim(),
        completed: false,
      };
      _tasks.push(task);
      _persist(); // Requirement 5.1 — sync to storage on every mutation.
      return task;
    }

    /**
     * Flip the completed status of the Task identified by id.
     *
     * No-ops with a console warning if the ID is not found — this keeps the
     * UI consistent rather than throwing an unhandled error.
     *
     * Satisfies: Requirements 3.1 (incomplete → complete),
     *            3.2 (complete → incomplete).
     *
     * @param {string} id - Task_ID of the task to toggle.
     * @returns {{id: string, title: string, completed: boolean} | undefined}
     */
    function toggle(id) {
      var task = _tasks.find(function (t) {
        return t.id === id;
      });
      if (!task) {
        console.warn("[taskStore] toggle: unknown id", id);
        return undefined;
      }
      task.completed = !task.completed;
      _persist(); // Requirement 5.1 — sync to storage on every mutation.
      return task;
    }

    /**
     * Remove the Task identified by id from _tasks.
     *
     * No-ops with a console warning if the ID is not found.
     *
     * Satisfies: Requirements 4.1 (delete action removes the task),
     *            4.2 (list updates immediately — renderer re-render is triggered
     *                 by the event handler in Task 7).
     *
     * @param {string} id - Task_ID of the task to remove.
     */
    function remove(id) {
      var index = _tasks.findIndex(function (t) {
        return t.id === id;
      });
      if (index === -1) {
        console.warn("[taskStore] remove: unknown id", id);
        return;
      }
      _tasks.splice(index, 1);
      _persist(); // Requirement 5.1 — sync to storage on every mutation.
    }

    // ── 4.1  _persist ─────────────────────────────────────────────────────
    /**
     * Serialize _tasks to JSON and write it to localStorage.
     *
     * Key: "task-manager-tasks"  (Requirement 5.1)
     *
     * localStorage.setItem can throw when storage quota is exceeded or when
     * the browser blocks storage (e.g. Safari private mode). Both are caught;
     * in-memory state is left intact and an error banner is shown to the user.
     *
     * Satisfies: Requirement 5.1 — every mutation immediately syncs to storage.
     */
    function _persist() {
      try {
        localStorage.setItem("task-manager-tasks", JSON.stringify(_tasks));
      } catch (err) {
        console.error("[taskStore] _persist: could not write to localStorage", err);
        var banner = document.getElementById("error-banner");
        if (banner) {
          banner.textContent =
            "Warning: your tasks could not be saved. Storage may be full or unavailable.";
          banner.hidden = false;
        }
      }
    }

    // ── 4.1  _deserialize ──────────────────────────────────────────────────
    /**
     * Parse a raw JSON string from localStorage and validate its shape.
     *
     * Validation rules per the Task data model:
     *   - Top-level value must be an array.
     *   - Each element must have:
     *       id        {string, non-empty}
     *       title     {string, non-empty}
     *       completed {boolean}
     *   - Malformed elements are dropped with a console warning; partial
     *     corruption does not wipe the entire list.
     *
     * Returns null if the top-level parse fails entirely, signalling to load()
     * that the stored data is unrecoverable.
     *
     * Satisfies: Requirements 5.4 (malformed data → empty list + key removed),
     *            5.5 (round-trip: every valid Task survives serialize→deserialize).
     *
     * @param {string} raw - Raw string from localStorage.getItem().
     * @returns {Array<{id:string,title:string,completed:boolean}>|null}
     */
    function _deserialize(raw) {
      var parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (_) {
        return null; // Not valid JSON — unrecoverable.
      }

      if (!Array.isArray(parsed)) {
        return null; // Valid JSON but wrong shape — unrecoverable.
      }

      // Keep only elements that fully match the Task shape.
      var valid = parsed.filter(function (item) {
        if (
          item === null ||
          typeof item !== "object" ||
          typeof item.id !== "string" ||
          item.id.length === 0 ||
          typeof item.title !== "string" ||
          item.title.length === 0 ||
          typeof item.completed !== "boolean"
        ) {
          console.warn("[taskStore] _deserialize: dropping malformed record", item);
          return false;
        }
        return true;
      });

      return valid;
    }

    // ── 4.2  load ──────────────────────────────────────────────────────────
    /**
     * Hydrate _tasks from localStorage before the first render.
     *
     * Behaviour matrix:
     *   Storage key absent       → _tasks = []                  (Req 5.3)
     *   Key present, valid JSON  → _tasks = deserialized tasks   (Req 5.2)
     *   Key present, bad data    → _tasks = [], key removed      (Req 5.4)
     *
     * Must be called by main() before render() so no tasks are ever displayed
     * from a default or stale state (Req 5.2: "before any Task is displayed").
     *
     * Satisfies: Requirements 5.2, 5.3, 5.4.
     */
    function load() {
      var raw = localStorage.getItem("task-manager-tasks");

      if (raw === null) {
        // Requirement 5.3 — nothing stored; start fresh.
        _tasks = [];
        return;
      }

      var result = _deserialize(raw);

      if (result === null) {
        // Requirement 5.4 — unrecoverable data; remove it and start fresh.
        console.warn("[taskStore] load: malformed storage data removed");
        localStorage.removeItem("task-manager-tasks");
        _tasks = [];
        return;
      }

      // Requirement 5.2 — restore the persisted list.
      _tasks = result;
    }

    return {
      getAll: getAll,
      add: add,
      toggle: toggle,
      remove: remove,
      load: load,
    };
  })();

  // ── renderer ──────────────────────────────────────────────────────────────
  // Pure DOM builder — reads task data, writes DOM, no side effects elsewhere.
  // Called after every state mutation (by main's event handlers, Task 7).

  /**
   * Render the current task list into the given container element.
   *
   * Strategy: full replacement (container.innerHTML = "").
   * For the expected list sizes (tens to low hundreds) this is fast enough
   * and far simpler than keyed diffing. Every call produces a faithful
   * snapshot of the task array passed in.
   *
   * Two output modes:
   *   - tasks.length === 0  → inject the empty-state message (Req 2.2)
   *   - tasks.length  >  0  → build a <ul> with one <li> per task (Req 2.1)
   *
   * Each <li> carries:
   *   - data-task-id           so the delegated click handler (Task 7) can
   *                            identify which task was acted on
   *   - task--complete class   when completed === true (Req 2.3, 3.3)
   *   - a checkbox toggle      aria-labelled for screen readers (Req 2.3, 3.1/3.2)
   *   - the task title span    text content set exactly as stored (Req 2.4)
   *   - a delete button        aria-labelled for screen readers (Req 4.1)
   *
   * Satisfies: Requirements 2.1, 2.2, 2.3, 2.4, 3.3, 4.1.
   *
   * @param {Array<{id: string, title: string, completed: boolean}>} tasks
   * @param {HTMLElement} container - The #task-list-container element.
   */
  function render(tasks, container) {
    // Wipe previous content on every call — full re-render approach.
    container.innerHTML = "";

    // ── Empty state (Requirement 2.2) ────────────────────────────────────
    if (tasks.length === 0) {
      var emptyMsg = document.createElement("p");
      emptyMsg.className = "task-list__empty";
      emptyMsg.id = "empty-state";
      emptyMsg.textContent = "No tasks yet. Add one above!";
      container.appendChild(emptyMsg);
      return;
    }

    // ── Task list (Requirements 2.1, 2.3, 2.4) ──────────────────────────
    var ul = document.createElement("ul");
    ul.className = "task-list";
    // aria-label gives screen readers context for the list.
    ul.setAttribute("aria-label", "Task list");

    tasks.forEach(function (task) {
      var li = document.createElement("li");
      li.className = "task-item" + (task.completed ? " task--complete" : "");
      // data-task-id lets the delegated handler resolve the task without a
      // secondary lookup — it's the only coupling between DOM and store.
      li.setAttribute("data-task-id", task.id);

      // ── Toggle checkbox ──────────────────────────────────────────────
      // Using a real <input type="checkbox"> gives free keyboard support
      // and the correct checked/unchecked semantics for screen readers.
      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "task-item__toggle";
      checkbox.checked = task.completed;
      // aria-label encodes the task title so the control is self-describing
      // without needing a visible <label> next to it.
      checkbox.setAttribute(
        "aria-label",
        (task.completed ? "Mark incomplete: " : "Mark complete: ") + task.title
      );

      // ── Title span ───────────────────────────────────────────────────
      // textContent (not innerHTML) ensures the title is displayed exactly
      // as stored — no HTML injection risk (Requirement 2.4).
      var titleSpan = document.createElement("span");
      titleSpan.className = "task-item__title";
      titleSpan.textContent = task.title;

      // ── Delete button ────────────────────────────────────────────────
      var deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "task-item__delete";
      deleteBtn.setAttribute("aria-label", "Delete task: " + task.title);
      deleteBtn.textContent = "Delete";

      li.appendChild(checkbox);
      li.appendChild(titleSpan);
      li.appendChild(deleteBtn);
      ul.appendChild(li);
    });

    container.appendChild(ul);
  }

  // ── main ──────────────────────────────────────────────────────────────────
  // Wires all pieces together and bootstraps the application.
  // Three responsibilities:
  //   7.1  handleAddFormSubmit  — validate → add → re-render → clear input
  //   7.2  handleListClick      — delegated toggle / delete handler
  //   7.3  bootstrap            — load storage → render → attach listeners

  (function main() {

    // ── DOM references ──────────────────────────────────────────────────────
    var form      = document.getElementById("task-form");
    var input     = document.getElementById("task-input");
    var errorMsg  = document.getElementById("task-input-error");
    var container = document.getElementById("task-list-container");

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Show a validation message below the input field.
     * Associates it with the input via aria-describedby (already set in HTML).
     * Satisfies: Requirements 1.3, 1.4 — validation message must be displayed.
     */
    function showInputError(message) {
      errorMsg.textContent = message;
      errorMsg.hidden = false;
      input.classList.add("task-form__input--invalid");
      input.setAttribute("aria-invalid", "true");
    }

    /**
     * Clear any previously shown validation message.
     */
    function clearInputError() {
      errorMsg.textContent = "";
      errorMsg.hidden = true;
      input.classList.remove("task-form__input--invalid");
      input.removeAttribute("aria-invalid");
    }

    // ── 7.1  Add-form submit handler ────────────────────────────────────────
    /**
     * Handles the add-task form submission.
     *
     * Flow:
     *   1. Prevent default form submission (page reload).
     *   2. Read the raw input value.
     *   3. Run validate() — if invalid, show the appropriate message and stop.
     *   4. Call taskStore.add() with the raw value (store trims internally).
     *   5. Re-render the list.
     *   6. Clear the input field and return focus to it (Req 1.2).
     *   7. Clear any leftover validation message.
     *
     * Satisfies: Requirements 1.1, 1.2, 1.3, 1.4.
     */
    function handleAddFormSubmit(event) {
      event.preventDefault();

      var raw    = input.value;
      var result = validate(raw);

      if (!result.valid) {
        if (result.reason === "EMPTY") {
          // Requirement 1.3 — display message and do not add a task.
          showInputError("A task title is required.");
        } else if (result.reason === "TOO_LONG") {
          // Requirement 1.4 — display message and do not add a task.
          showInputError("Task title must be 255 characters or fewer.");
        }
        input.focus();
        return;
      }

      // Valid title — add, re-render, reset.
      taskStore.add(raw);
      render(taskStore.getAll(), container);

      // Requirement 1.2 — clear the input field after a successful add.
      input.value = "";
      clearInputError();
      // Return focus to the input so the user can immediately type another task.
      input.focus();
    }

    // ── 7.2  Delegated list click handler ───────────────────────────────────
    /**
     * Single click handler on the task-list container using event delegation.
     *
     * Identifies the target by walking up to the nearest [data-task-id] element,
     * then inspects whether the clicked element was the checkbox toggle or the
     * delete button.
     *
     * Toggle flow (Req 3.1, 3.2, 3.3, 3.4):
     *   1. Call taskStore.toggle(id).
     *   2. Re-render immediately (≤500 ms — synchronous, Req 3.3).
     *   3. If toggle returned undefined (unknown id), show error banner (Req 3.4).
     *
     * Delete flow (Req 4.1, 4.2, 4.3, 4.4, 4.5):
     *   1. Show window.confirm() — Req 4.1 requires confirmation before removal.
     *   2. If cancelled, leave state unchanged — Req 4.3.
     *   3. If confirmed, call taskStore.remove(id) and re-render (Req 4.2, 4.4).
     *   4. On unexpected error, show error banner and leave task intact (Req 4.5).
     */
    function handleListClick(event) {
      // Walk up from the click target to find the <li data-task-id="…">.
      var li = event.target.closest("[data-task-id]");
      if (!li) return; // Click was outside any task item.

      var id = li.getAttribute("data-task-id");

      // ── Toggle ────────────────────────────────────────────────────────────
      if (event.target.classList.contains("task-item__toggle")) {
        var toggled = taskStore.toggle(id);
        if (toggled === undefined) {
          // Requirement 3.4 — status update failed; retain previous state.
          showBanner("Could not update task status. Please try again.");
        }
        // Re-render immediately — satisfies the ≤500 ms requirement (Req 3.3).
        render(taskStore.getAll(), container);
        return;
      }

      // ── Delete ────────────────────────────────────────────────────────────
      if (event.target.classList.contains("task-item__delete")) {
        // Requirement 4.1 — confirmation prompt before any removal.
        var confirmed = window.confirm("Delete this task?");

        if (!confirmed) {
          // Requirement 4.3 — user cancelled; leave list unchanged.
          return;
        }

        try {
          taskStore.remove(id);
          // Requirement 4.2 — remove from list and re-render immediately.
          render(taskStore.getAll(), container);
          // Requirement 4.4 — if list is now empty, render shows the empty-state
          // message automatically (handled inside render()).
        } catch (err) {
          // Requirement 4.5 — deletion failed; retain task and show error.
          console.error("[main] handleListClick: remove failed", err);
          showBanner("Could not delete the task. Please try again.");
          render(taskStore.getAll(), container);
        }
      }
    }

    /**
     * Show a non-blocking error banner at the bottom of the app.
     * Used for storage errors and unexpected operation failures.
     *
     * @param {string} message
     */
    function showBanner(message) {
      var banner = document.getElementById("error-banner");
      if (banner) {
        banner.textContent = message;
        banner.hidden = false;
      }
    }

    // ── 7.3  Bootstrap sequence ─────────────────────────────────────────────
    /**
     * Runs once on page load.
     *
     * Order matters:
     *   1. taskStore.load()   — hydrate _tasks from localStorage BEFORE render
     *                           (Req 5.2: "before any Task is displayed to the user")
     *   2. render(...)        — paint the initial UI from the restored task list
     *   3. addEventListener   — attach handlers only after DOM is ready
     *
     * Satisfies: Requirements 5.2, 5.3 (via taskStore.load()).
     */

    // 1. Restore persisted state (Req 5.2, 5.3).
    taskStore.load();

    // 2. Paint initial UI.
    render(taskStore.getAll(), container);

    // 3. Attach event listeners.
    form.addEventListener("submit", handleAddFormSubmit);
    container.addEventListener("click", handleListClick);

  })();
})();
