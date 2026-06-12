# Requirements Document

## Introduction

The Task Manager is a web application that enables users to manage a personal list of tasks. Users can add new tasks, view all existing tasks, mark tasks as completed, and delete tasks they no longer need. All task data is persisted in the browser's localStorage so that tasks survive page reloads without requiring a backend server.

## Glossary

- **Task Manager**: The web application described in this document.
- **Task**: A unit of work with a title, a completion status, and a unique identifier.
- **Task_List**: The in-memory collection of all Tasks currently loaded in the application.
- **Storage**: The browser's localStorage mechanism used to persist the Task_List.
- **Task_ID**: A unique identifier assigned to each Task at creation time.

---

## Requirements

### Requirement 1: Add a Task

**User Story:** As a user, I want to add a new task by entering a title, so that I can track work I need to do.

#### Acceptance Criteria

1. WHEN the user submits a task title that is non-empty after trimming leading and trailing whitespace and is at most 255 characters long, THE Task_Manager SHALL add a new Task to the Task_List with a unique Task_ID, the trimmed title, and a completion status of `incomplete`.
2. WHEN the user submits a non-empty task title, THE Task_Manager SHALL clear the task input field after the Task is added.
3. IF the user attempts to submit an empty or whitespace-only task title, THEN THE Task_Manager SHALL display a validation message indicating that a title is required and SHALL NOT add a Task to the Task_List.
4. IF the user attempts to submit a task title that exceeds 255 characters, THEN THE Task_Manager SHALL display a validation message indicating the maximum title length and SHALL NOT add a Task to the Task_List.
5. THE Task_Manager SHALL assign each new Task a Task_ID that is unique among all Tasks currently in the Task_List.

---

### Requirement 2: View Tasks

**User Story:** As a user, I want to see all my tasks listed on the page, so that I have a clear picture of what needs to be done.

#### Acceptance Criteria

1. THE Task_Manager SHALL display every Task in the Task_List as a visible list item on the page, ordered by insertion order (most recently added task last).
2. WHEN the Task_List is empty, THE Task_Manager SHALL display an empty-state message indicating that no tasks have been added.
3. WHEN a Task has a completion status of `complete`, THE Task_Manager SHALL render that Task's title with strikethrough text; WHEN a Task has a completion status of `incomplete`, THE Task_Manager SHALL render that Task's title without strikethrough text.
4. THE Task_Manager SHALL display each Task's title as provided by the user without alteration.

---

### Requirement 3: Mark a Task as Completed

**User Story:** As a user, I want to mark a task as completed, so that I can track my progress.

#### Acceptance Criteria

1. WHEN the user marks an `incomplete` Task as complete, THE Task_Manager SHALL update that Task's completion status to `complete` in the Task_List.
2. WHEN the user marks a `complete` Task as incomplete, THE Task_Manager SHALL update that Task's completion status to `incomplete` in the Task_List.
3. WHEN a Task's completion status changes, THE Task_Manager SHALL reflect the updated visual style (strikethrough for complete, no strikethrough for incomplete) in the displayed list within 500 ms and without requiring a page reload.
4. IF a Task's completion status update fails, THE Task_Manager SHALL indicate the error to the user and SHALL retain the Task's previous completion status.

---

### Requirement 4: Delete a Task

**User Story:** As a user, I want to delete a task, so that I can remove tasks I no longer need.

#### Acceptance Criteria

1. WHEN the user activates the delete control on a Task, THE Task_Manager SHALL display a confirmation prompt asking the user to confirm the deletion before removing the Task from the Task_List.
2. WHEN the user confirms deletion, THE Task_Manager SHALL remove the confirmed Task from the Task_List and remove the corresponding list item from the displayed list within 500 ms without requiring a page reload.
3. WHEN the user cancels the confirmation prompt, THE Task_Manager SHALL NOT remove the Task from the Task_List and SHALL leave the displayed list unchanged.
4. WHEN the last remaining Task is deleted, THE Task_Manager SHALL display the empty-state message defined in Requirement 2.
5. IF a Task deletion fails, THE Task_Manager SHALL indicate the error to the user and SHALL retain the Task in both the Task_List and the displayed list.

---

### Requirement 5: Persist Tasks Using localStorage

**User Story:** As a user, I want my tasks to be saved between browser sessions, so that I do not lose my task list when I reload or close the page.

#### Acceptance Criteria

1. WHEN the Task_List changes (Task added, deleted, or completion status updated), THE Task_Manager SHALL serialize the current Task_List and write it to Storage under the key `"task-manager-tasks"`.
2. WHEN the Task_Manager initializes, THE Task_Manager SHALL read the serialized Task_List from Storage under the key `"task-manager-tasks"` and restore it into the in-memory Task_List before any Task is displayed to the user.
3. IF no data exists in Storage under `"task-manager-tasks"` at initialization, THEN THE Task_Manager SHALL initialize with an empty Task_List.
4. IF the data read from Storage is malformed or cannot be parsed, THEN THE Task_Manager SHALL initialize with an empty Task_List and SHALL remove the malformed data from Storage.
5. THE Task_Manager SHALL ensure that serializing then deserializing any Task_List (zero or more Tasks each with a title, Task_ID, and completion status) produces a Task_List with identical Tasks, titles, Task_IDs, and completion statuses (round-trip property).
