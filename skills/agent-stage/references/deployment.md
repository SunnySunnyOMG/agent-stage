# Local first; deploy the mode that actually works

## Local live observation

Run `scripts/serve.mjs --events <explicit-normalized.jsonl>`. It listens on `127.0.0.1`, polls the specified small file and emits display snapshots over same-origin SSE. It exposes no task execution or log-directory browser. `/health` reports source readiness without exposing its path.

For a missing/unreadable source, restore that source and verify a fresh event; an HTTP listener alone is not a successful harness integration. Keep the printed command/process handle for stopping. A terminal-started process can be stopped with Ctrl+C.

## Shareable replay page

Export `assets/viewer` with `scripts/export.mjs --out <new-directory>`, then use the user's available static hosting workflow. Examples include an already-connected hosting tool or a repository Pages workflow. Inspect the environment's supported command and authentication instead of assuming a provider or installing one globally.

The export includes a clearly marked synthetic demo; it does not copy the user's event source. Browser JSONL import reads a selected file locally and does not upload it. If publishing a real recording, create an explicit redacted export and verify its contents before adding it to the static bundle. Preserve the requested audience.

Check the served page after export, all local module/resource requests, and the host's actual deployment result. Return the literal URL and mode. Do not call a local URL a public deployment.

## Remote live observation

A hosted static page cannot directly read a local harness file or reach another device's `127.0.0.1`. A real remote setup needs an explicitly chosen collector/bridge, authenticated transport, reconnect/snapshot behavior and viewer access control. Use a bridge the user already owns where possible; otherwise describe this missing component and scope any new work with the user.

Do not expose the bundled loopback helper to the Internet, embed API credentials in static assets, or quietly upload whole session logs. This first release provides a local helper and portable frontend; it does not ship a remote multi-user collector.
