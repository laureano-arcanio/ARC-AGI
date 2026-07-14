# Event System

ARC solver work is stored as ordered event graph nodes. Each event records who acted, which task and attempt it belongs to, what caused the node, and the output-grid state after the action.

## Stored Shape

`event` rows use the API schema in `backend/app/schemas/event.py`:

| Field | Meaning |
|---|---|
| `user_id` | Solver or reviewer who produced the event. |
| `task_id` | ARC task id. |
| `attempt_id` | Solver attempt id. `null` is only used for review-tag events. |
| `node_id` | Stable graph node id, e.g. `node_003`, `pre_node_001`, `review_tag_12`. |
| `parent_node_id` | Parent graph node id, or `null` for roots. |
| `test_pair_index` | Test input index the node belongs to. `null` when not attached to a test input, currently review tags. |
| `trigger` | JSON discriminator describing the event type and metadata. |
| `state_snapshot` | Output grid after the event. Pre-solver events use `[[0]]`; review tags use `[]`. |
| `timestamp` | Client or server Unix milliseconds, used for display order. |

Events are returned ordered by `timestamp`. The database has a uniqueness constraint on `(attempt_id, node_id, test_pair_index)`. If a duplicate is posted, the repository updates the existing row's trigger, snapshot, timestamp, and parent instead of inserting another row.

## Write Paths

- `POST /api/v1/events/` stores normal mechanical and cognitive events. The router verifies owner/admin access, task assignment, and that any `attempt_id` belongs to the same user and task.
- `POST /api/v1/events/submit` is the only valid submit path. The server checks submitted grids against stored solutions and records `trigger.details.correct`; clients must not self-report correctness through the generic endpoint.
- `GET /api/v1/events/users/{user_id}/tasks/{task_id}?attemptId=...` returns a user's events. Owner or admin only.
- `GET /api/v1/events/cross/{target_user_id}/tasks/{task_id}?attemptId=...` returns events without `user_id` for peer review. Reviewer must be paired with the target solver, unless admin.

## Trigger Types

Frontend graph triggers are defined in `frontend/src/shared/types/arc-graph.ts`.

### Mechanical

Shape:

```json
{ "kind": "mechanical", "action": "cell_paint", "details": {} }
```

| Action | Important metadata |
|---|---|
| `load_task` | Root node. No details. Usually `node_000`; created in frontend state and may be persisted. |
| `cell_paint` | `details.cells`: array of `{ x, y, symbol }`. Consecutive paints on the active node are compacted into one event. |
| `fill_selected` | Flood-fill: `{ x, y, symbol }`. Multi-select fill: `{ count, symbol }`. |
| `paste` | Legacy — kept for backward compatibility. Current solver emits `paste_selection` instead. |
| `resize` | `details.size`: formatted grid size string, e.g. `5x5`. |
| `copy_from_input` | Copies current test input into output. No details. |
| `reset_output` | Resets output grid and jumps active node back to root. No details. |
| `select_object` | `details.cells`: array of `{ x, y }`, `details.symbol`: number, `details.count`: number. |
| `select_area` | `details.cellCount`: number of cells in the selected rectangle. The trigger is created on mouse-up after a rectangular drag in `area_select` mode. |
| `copy_selection` | `details.width`, `details.height`, `details.cellCount`: dimensions and count of the copied bounding box. Stores the subgrid in the frontend `clipboard` state. |
| `paste_selection` | `details.x`, `details.y`, `details.width`, `details.height`: position and dimensions of the paste operation. Reads from `clipboard` state. |
| `submit` | `details.correct`: boolean computed only by the backend submit endpoint. Drives attempt status. |
| `abandon` | Legacy — kept for backward compatibility. Current solver emits `continue_later` instead. |
| `continue_later` | Pause checkpoint when the user clicks "Continue later". No details. Creates a timestamped event for tracking real time taken. |

Attempt status is derived from event triggers: correct submit -> `completed`, wrong submit -> `failed`, abandon -> `abandoned`. Completed has priority over failed and abandoned.

### Cognitive

Shape:

```json
{ "kind": "cognitive", "intent": "hypothesis_revision", "text": "...", "details": {} }
```

| Intent | Purpose / metadata |
|---|---|
| `initial_hypothesis` | Pre-solver first rule. `details.visibleTrainPairIndexes` records visible training examples. |
| `hypothesis_revision` | Pre-solver or solve-time rule update. `details.revisionType` may be `confirmed`, `refined`, `invalidated`, or `uncertain`; invalidated revisions include `details.contradiction`; test-step revisions may include `details.testIndex`. |
| `hypothesis_finalized` | Final pre-solver rule before solving. `details.edited` is set when the final text was edited. |
| `final_algorithm_before_solving` | Supported by shared type and timeline visuals; not currently emitted by the wizard. |
| `hypothesis` | General hypothesis node. Also used for synthesized `hypothesis_final` nodes with `details.isPreSolverFinal`. |
| `branch_pivot` | New approach after wrong work; parent is usually the last hypothesis node. |
| `failure_analysis` | Supported by shared type and visuals; current failure flow records `branch_pivot` instead. |
| `correct_analysis` | Post-solve reasoning captured after a correct submit when required. |

Pre-solver cognitive events use node ids `pre_node_###`, a 1x1 placeholder snapshot, and `test_pair_index: 0`. When loading a solver attempt, the solve page imports these nodes and synthesizes a `hypothesis_final` node per test input so the final pre-solve rule can parent later solve actions.

### Review Tag

Review tagging writes backend-only events:

```json
{ "kind": "review_tag", "quality": "good" }
```

These events have `attempt_id: null`, `node_id: review_tag_{id}`, `parent_node_id` set to the reviewed solver node, empty `state_snapshot`, and `test_pair_index: null`. They are not part of the frontend `GraphTrigger` union.

## Consumer Assumptions

- Admin timelines convert events into graph nodes keyed by `(test_pair_index, node_id)` and keep the latest row for each key.
- Peer review only displays cognitive events from the reviewed solver and validates review tags against real stored solver node ids.
- Submit events must be skipped by frontend generic event persistence; they are created by `/events/submit`.
- New event kinds should update the shared trigger types, timeline visuals, admin/review consumers, backend tests, and this document.
