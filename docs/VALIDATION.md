# Validation scope

Checked on 2026-11-10. This is a shallow starter validation, not a native-host compatibility certification.

## Deterministic checks

`npm test` exercises event validation/field projection, duplicate IDs and late events, absence of fabricated memory/acceptance, explicit same-run parent relationships, run isolation, observation loss, a real loopback SSE response and self-contained static export without overwriting existing output.

The core was first exercised against an empty implementation; its five behavioral checks failed. After implementation, those checks passed. The export check exposed a destination-exists error; the helper was fixed to copy into its exclusively created output directory, and the full suite passed.

`quick_validate.py` from the Skill authoring tool accepted the Skill frontmatter and structure. This structural check does not establish agent behavior. The package was also installed with skills CLI 1.7.4 from its local source into an isolated project directory for Codex; this verifies package discovery/copy, not native runtime event support.

## Browser smoke test

The actual browser loaded the demo, displayed its synthetic provenance, advanced through the replay and showed nine activities with eight explicit relationships. Desktop screenshot: [preview](preview-desktop.png). A 390 px mobile viewport was checked with no horizontal overflow. Browser-local JSONL import displayed a synthetic tool record without creating parent links; a label containing an HTML image tag remained literal text. This does not establish every browser/device combination.

## Independent forward-test

A fresh agent received only the Skill package and a custom JSONL harness scenario, with no parent-agent or memory events. It created a thin adapter and exported webpage in an isolated temporary directory. Twelve grouped checks passed: normalization; start/end outcomes; concurrency without invented agents; duplicate/late events; run isolation; unknown outcomes; missing end; absent acceptance/memory/reuse; HTTP/SSE round trip; exported assets; read-only routes; source disappearance/recovery. Its browser check displayed four tool activities, zero links and visibly synthetic provenance. The independent run did not test browser file-import interaction; the separate browser smoke check did. The sample adapter needed an explicit disconnection indicator because its source schema did not expose connection loss; its basic watch mode did not synchronize file rotation. The synthetic scenario is not a live vendor session.

The baseline agent, before receiving this Skill, already described conservative observation boundaries. No comparative model-quality or speed improvement is claimed.

## Independent release review

A separate reviewer found two observation-state defects: late observation events could be hidden by a newer activity sequence, and an initially unreadable source was indistinguishable from an empty healthy source in the browser. Each was reproduced with a failing regression check, corrected, and included in the nine-test suite.

## Still unverified

- Real Claude Code hooks, Codex CLI/App Server sessions and other native harness adapters.
- Public/remote live ingestion, authentication, concurrent viewers and long-running production loads.
- Whether an arbitrary host discovers the Skill automatically or has the tools/accounts needed for deployment.

Static replay can be deployed independently. Remote live observation requires additional infrastructure described in the deployment reference.

## Publication check

The public `v0.1.0` Git tag was installed with skills CLI 1.7.4 into a fresh isolated project directory; discovery and copy succeeded. GitHub Actions package checks passed. The published Pages demo returned HTTP 200 and loaded its browser modules and synthetic replay. This is a public static demonstration, not a hosted live collector.

## Self-contained studio

The default viewer renders an orthographic room from procedural geometry. Automated checks cover the station mapping, incomplete observation, a completed-only to-do update, duplicate snapshots, and static export of the studio and both demo inputs. The graph remains available with `?view=graph`. The studio demo uses synthetic events.

A Chrome run loaded the static export, visited all 12 stations in the synthetic replay, and switched to the graph. At 390 px the room fit the viewport with no horizontal overflow.

## Pixel rooms and character import

The v0.4.0 static export rendered all eight pixel rooms and all four built-in looks in Chrome. Santorini loaded its four environment textures. The example character from the character Skill imported and replayed planning, walking, reading, coffee and rest. Reload and clear were verified, along with the studio and graph links and a 390 px viewport. The checked-in bundle is reproducible from the pinned source and the tests assert its exact room, character, and turn-pose inventory.
