"""A small, deterministic contract checker; never executes the proposed action."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class Decision:
    request_id: str
    allowed: bool
    reasons: tuple[str, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "request_id": self.request_id,
            "allowed": self.allowed,
            "reasons": list(self.reasons),
        }


def evaluate(proposal: Mapping[str, Any]) -> Decision:
    """Evaluate an untrusted proposal. Invalid shapes fail closed.

    This checker is a demonstrator, not a production authentication or
    physical-completion verifier.
    """
    request_id = proposal.get("request_id")
    if not isinstance(request_id, str) or not request_id.strip():
        request_id = ""

    reasons: list[str] = []
    if not request_id:
        reasons.append("invalid_request_id")

    for key in ("actor", "target", "operation"):
        if not isinstance(proposal.get(key), str) or not proposal[key].strip():
            reasons.append(f"invalid_{key}")

    permissions = proposal.get("permissions")
    if not isinstance(permissions, list) or not all(isinstance(x, str) for x in permissions):
        reasons.append("invalid_permissions")
        permissions = []

    target_allowlist = proposal.get("allowed_targets")
    if not isinstance(target_allowlist, list) or not all(isinstance(x, str) for x in target_allowlist):
        reasons.append("invalid_allowed_targets")
        target_allowlist = []

    operation_allowlist = proposal.get("allowed_operations")
    if not isinstance(operation_allowlist, list) or not all(isinstance(x, str) for x in operation_allowlist):
        reasons.append("invalid_allowed_operations")
        operation_allowlist = []

    target = proposal.get("target")
    operation = proposal.get("operation")
    if isinstance(target, str) and target not in target_allowlist:
        reasons.append("target_not_allowed")
    if isinstance(operation, str) and operation not in operation_allowlist:
        reasons.append("operation_not_allowed")
    if "execute" not in permissions:
        reasons.append("execute_permission_missing")

    expected_state = proposal.get("expected_state")
    if not isinstance(expected_state, dict) or not expected_state:
        reasons.append("expected_state_required")

    return Decision(request_id=request_id, allowed=not reasons, reasons=tuple(reasons))
