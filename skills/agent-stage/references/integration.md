# Discover, then adapt

## Capability inventory

Inspect only the active harness and the source the user has designated. Record:

- Harness/version and authoritative documentation checked.
- Exposed transport: hook stdin, callback, JSONL, SSE, WebSocket or explicit polling.
- Session/run IDs, activity IDs, parent IDs, start/end/outcome fields and ordering/reconnect behavior.
- Which states are genuinely unavailable, including delegation, acceptance, memory and reuse.
- Local runtime, preview and deployment capabilities.

Prefer a documented passive observation interface. A tool list, skill list, task plan or animation does not prove a runtime event happened. If the only source is an agent deliberately writing status records, mark those records `reported`.

Do not silently launch a replacement agent process or repeat the user's task to obtain a trace. A new CLI invocation can execute work twice and does not subscribe to an already-running desktop session.

## Adapter recipe

1. Read a small permitted sample. Preserve original source IDs; map each source invocation to one stable activity ID.
2. Make the mapping explicit in a local `capabilities.json` and short adapter notes. Suggested fields: `harness`, `version`, `transport`, `mode`, `observedKinds`, `missingKinds`, `correlationKeys`, `ordering`, `sourceDocs`.
3. Translate to [events.md](events.md). Maintain one monotonic sequence per run at the adapter boundary, with persistent source-ID/sequence association if delivery can repeat. Do not hash private payload text to fabricate identity.
4. Emit minimal labels rather than raw contents. Review redaction before forwarding to a remote receiver. Keep collection off the critical path and preserve the harness's exit/output contract; collector failure must not alter an approval decision.
5. Forward to a small per-run JSONL file, or implement a narrow transport that produces the same browser snapshots. Rotation/truncation requires a synchronized current snapshot or an explicit partial-observation transition.
6. Verify source → adapter → normalized file → webpage on a harmless operation. Use synthetic cases for unavailable capabilities, visibly labeled as such.

### Available examples, not bundled host support

- Claude Code documents `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `SubagentStart` and `SubagentStop`. Confirm the installed version's input fields and correlation before generating hook configuration. Merge project-local hooks rather than overwrite existing settings. A subagent ending does not establish output acceptance. [Official hooks reference](https://code.claude.com/docs/en/hooks)
- Codex documents JSONL events for `codex exec --json`; that is the output of a new noninteractive run, not a universal subscription to any current session. [Official non-interactive guide](https://developers.openai.com/codex/noninteractive)
- An application owning a Codex App Server connection can consume documented turn/item lifecycle notifications. Confirm capabilities from that connection; do not imply this grants access to another application's private connection. [Official App Server guide](https://developers.openai.com/codex/app-server)
- Other SDKs and custom harnesses may expose callbacks, spans or JSONL. Inspect their actual schema and map only supported facts. Protocol labels such as “MCP” alone are insufficient to claim lifecycle observability.

These references were checked on 2026-11-10. Recheck the current host documentation when implementing an adapter. No native vendor adapter is shipped or certified by this first release.
