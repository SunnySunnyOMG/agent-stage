# Agent Stage

## Scope

A portable Agent Skill helps the user's current harness build a small webpage that visualizes its exposed execution events. It discovers the available protocol instead of assuming a particular agent vendor. The repository includes a minimal reusable animation engine and a synthetic replay for a shallow integration check; it is not a complete observability platform.

## Separation

`Harness → adapter → normalized events → display state → director → renderer`

The adapter establishes facts and capabilities. A deterministic reducer maintains display state. A presentation director selects an activity and animation cue. The default renderer draws a room with a fixed orthographic camera. A second renderer draws the event graph. Both consume the same normalized event contract. The same normalized events drive live observation and replay. Animation never schedules agent work or establishes successful execution.

## Contract

- Versioned, minimal JSONL activity snapshots carry event ID, run ID, sequence, observation time, activity ID, kind, state, short label, provenance and optional explicit parent.
- Only declared parent relationships produce graph edges. Concurrent tool calls do not establish multiple agents.
- Tool success does not establish task acceptance, memory persistence, or reusable knowledge. Those need their own exposed evidence.
- Disconnects and missing end events preserve the last observed state, with observation marked partial/unavailable.
- Demo fixtures, host-observed events and agent-reported events remain visibly distinguishable.
- The browser receives short labels and identifiers, not raw prompts, file contents, credentials or tool argument dumps.

## Deliverables

1. `skills/agent-stage/SKILL.md`: discovery, adapter construction, local launch, export/deploy and evidence-based handoff.
2. Small zero-dependency browser engine, sample JSONL and loopback Node server. Static export works independently of the server; it supports replay/import, not remote access to local files.
3. Focused protocol/reducer/server checks, a browser smoke test, and an independent skill forward-test.

## First release limits

No ready-made native adapter or universal host support claim. The skill guides the host agent to implement the narrow adapter supported by its current documented surface. Remote live use requires an explicitly configured event bridge and access control. No log-directory crawling, agent control endpoints, accounts, billing or analytics backend.
