"""Semantic event validation (warnings only - never rejects client data)."""

import logging
from typing import Any

from app.repositories.event import EventRepository

logger = logging.getLogger(__name__)

_READ_ONLY_ACTIONS = frozenset(
    {
        "select_object",
        "select_area",
        "submit",
        "load_task",
        "copy_from_input",
        "abandon",
        "continue_later",
        "give_up",
    }
)


async def warn_if_read_only_mutated(
    repository: EventRepository,
    attempt_id: int,
    node_id: str,
    parent_node_id: str | None,
    test_pair_index: int | None,
    action: str,
    state_snapshot: list[list[int]],
) -> None:
    """Log a warning when a read-only action changes the grid relative to its parent."""
    if action not in _READ_ONLY_ACTIONS:
        return
    if parent_node_id is None:
        return
    parent_snapshot = await repository.get_snapshot_by_node(
        attempt_id, parent_node_id, test_pair_index
    )
    if parent_snapshot is None:
        return
    if state_snapshot != parent_snapshot:
        logger.warning(
            "Read-only action %s modified stateSnapshot node=%s attempt=%s",
            action,
            node_id,
            attempt_id,
        )


async def warn_fill_mismatch(
    repository: EventRepository,
    attempt_id: int,
    node_id: str,
    parent_node_id: str | None,
    test_pair_index: int | None,
    action: str,
    details: dict[str, Any] | None,
    state_snapshot: list[list[int]],
) -> None:
    """Log a warning when fill_selected count doesn't match cells changed."""
    if action != "fill_selected":
        return
    if parent_node_id is None:
        return
    parent_snapshot = await repository.get_snapshot_by_node(
        attempt_id, parent_node_id, test_pair_index
    )
    if parent_snapshot is None:
        return
    count = details.get("count", 0) if details else 0
    changed = _count_changed_cells(parent_snapshot, state_snapshot)
    if changed != count:
        logger.warning(
            "fill_selected mismatch details=%s changed=%s node=%s attempt=%s",
            count,
            changed,
            node_id,
            attempt_id,
        )


def _count_changed_cells(
    before: list[list[int]], after: list[list[int]]
) -> int:
    """Count cells that differ between two snapshots."""
    diff = 0
    for y in range(min(len(before), len(after))):
        row_b = before[y] if y < len(before) else []
        row_a = after[y] if y < len(after) else []
        for x in range(min(len(row_b), len(row_a))):
            if row_b[x] != row_a[x]:
                diff += 1
    return diff
