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

  /* taskStore — Tasks 3 & 4 */

  /* renderer — Task 6 */

  /* main — Task 7 */
})();
