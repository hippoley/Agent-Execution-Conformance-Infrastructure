"""Run the deterministic conformance fixture on a JSON proposal."""
import json
import sys
from pathlib import Path

from .contract import evaluate


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python -m aeci <proposal.json>", file=sys.stderr)
        return 2
    try:
        proposal = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
        if not isinstance(proposal, dict):
            raise ValueError("JSON root must be an object")
    except (OSError, ValueError) as exc:
        print(f"Invalid proposal: {exc}", file=sys.stderr)
        return 2
    decision = evaluate(proposal)
    print(json.dumps(decision.to_dict(), sort_keys=True))
    return 0 if decision.allowed else 1


if __name__ == "__main__":
    raise SystemExit(main())
