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

  // ── taskStore — core data operations ─────────────────────────────────────
  // Owns the single source of truth: the private _tasks array.
  // All mutations go through this object; nothing else touches _tasks directly.
  // Persistence (_persist, _deserialize, load) is added in Task 4.

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
      // _persist() will be wired in Task 4.
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
      // _persist() will be wired in Task 4.
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
      // _persist() will be wired in Task 4.
    }

    return {
      getAll: getAll,
      add: add,
      toggle: toggle,
      remove: remove,
      // load() and internal _persist/_deserialize are added in Task 4.
    };
  })();

  /* renderer — Task 6 */

  /* main — Task 7 */
})();
