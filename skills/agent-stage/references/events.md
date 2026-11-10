# Normalized event contract v1

One JSON object per line. Each activity event is a complete display snapshot of one activity, not a text delta.

```json
{"v":1,"id":"evt-3","run":"run-1","seq":3,"at":"2026-01-01T00:00:02Z","activity":"tool-1","parent":"agent-1","kind":"tool","state":"working","label":"Read primary documentation","origin":"observed"}
```

| Field | Meaning |
| --- | --- |
| `v` | Exactly `1`. |
| `id` | Stable event identifier within a run; preserve on redelivery. |
| `run` | Run/session namespace. |
| `seq` | Nonnegative safe integer, monotonically increasing within a run. Preserve sequence on redelivery. Across activity snapshots, later sequence wins. |
| `at` | Observation timestamp in ISO 8601 with time and zone. Preserve on redelivery. Do not substitute arrival time during replay. |
| `activity` | Stable identifier for this task, agent, invocation, check, memory operation or reuse operation. |
| `parent` | Optional explicit same-run parent activity. Never infer from proximity or kind. |
| `kind` | `task`, `agent`, `tool`, `verification`, `memory`, `reuse`. Use the kind actually supported by the source, not a guessed business purpose. |
| `state` | `working`, `waiting`, `needs-user`, `done`, `failed`, `cancelled`, `unknown`. `done` means this activity ended with its declared outcome, not that a whole task was accepted. |
| `label` | Nonempty, redacted display label; max 160 JavaScript characters. Render as text. |
| `origin` | `observed`: recorded by a connected source; `reported`: agent/self-reported; `demo`: synthetic fixture. A source fact still needs semantic interpretation; `observed` does not certify business success. |

Identifiers are 1–120 ASCII letters, digits, `_ . : @ / -`. Namespaces prevent the same activity ID in separate runs from colliding. No raw arguments, transcript or arbitrary HTML field is part of this contract. Extra fields are removed by validation.

Observation changes use the same base envelope:

```json
{"v":1,"id":"obs-7","run":"run-1","seq":7,"at":"2026-01-01T00:00:06Z","kind":"observation","availability":"unavailable","origin":"observed"}
```

Availability is `ready`, `partial` or `unavailable`; reconnect emits an explicit `ready` observation only after synchronization. These events do not end activities. A missing end keeps the last recorded state with an incomplete-observation notice.

Duplicate event IDs in the same run are ignored. Late or equal-sequence snapshots cannot overwrite a newer activity. Complete parent/child identity must be in the same run. The small viewer caps accepted events at 20,000 and activities at 2,000; exceeding a cap is shown as partial observation. The local file and browser import are limited to 2 MB; use a per-run export instead of a historical archive.

See `assets/viewer/demo.jsonl` for an explicitly synthetic scenario with independent agents, a failed tool, a retry, a human decision, a check and separately reported memory/reuse operations. It is not evidence of any native host integration.
