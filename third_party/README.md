# Full upstream source imports

The user's request is to have upstream source **physically committed into this repository**, not only dependency lock files or Git submodules.

- `upstreams/sources.lock.json` pins official source references.
- `tools/bootstrap_upstreams.sh all` fetches pinned candidate checkout trees (requires outbound GitHub access).
- `python3 tools/vendor_upstreams.py` does a read-only inventory and stops if any checkout is missing or modified.
- `python3 tools/vendor_upstreams.py --apply --include-alternatives` copies **all** selected upstream projects to `third_party/sources/`. No linked git-submodules are substituted for the primary source trees.
- `git add third_party/sources && git commit ... && git push` actually places their source contents in GitHub.

Caution: software source licenses are not uniform. Keep upstream LICENSE, NOTICE, and embedded vendor licenses. Proprietary third-party binaries may restrict redistribution; do **not** blindly publish those artifacts. Repositories with submodules or generated dependencies require an additional audit to ensure all desired source was checked out. GitHub hard-rejects individual files over 100 MB and huge monolithic pushes may fail; use intentional batches if needed.

In this session, the model's execution container **cannot resolve github.com**, so it cannot fetch and push the full upstream trees. The importer is checked into the repository, but **the 13 upstream trees are not yet present in GitHub**. Nothing in this document should be interpreted as completed source migration or physical device verification.
