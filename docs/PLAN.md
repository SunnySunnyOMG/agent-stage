# Agent Stage implementation plan

Goal: release a portable visualization Skill with a minimal working event-driven web engine.

Architecture: a host-specific adapter emits a small public event contract. A reusable reducer/director/renderer consumes it for live observation or replay. Node built-ins provide local serving; exported web assets need no build step.

Spec: [DESIGN.md](DESIGN.md).

1. Define observable-state tests, watch the stub fail, then implement validation, deduplication, ordering, run isolation and explicit graph relationships.
2. Add the animated browser view, marked synthetic replay, local read-only JSONL server and static export helper. Smoke-test real local transport and browser replay.
3. Write the Skill and conditional integration/deployment references, validate packaging, independently forward-test an unsupported harness scenario, review public contents, then publish the repository.

Check scope: short malformed inputs, duplicate/late events, disconnect without completion, tool success without acceptance, and private local paths during deployment. Preserve existing Ideas work and the earlier videos.
