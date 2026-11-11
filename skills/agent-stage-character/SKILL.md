---
name: agent-stage-character
description: Design a custom pixel character for Agent Stage, turn a user concept into a character JSON with action poses, or repair a character that does not render in the pixel rooms.
---

# Agent Stage Character

Turn the user's character idea into an importable `.json` file for the [Agent Stage viewer](https://sunnysunnyomg.github.io/agent-stage/?demo=1). The viewer loads the file locally in **Import character**. It saves the latest custom character in the current browser and provides **Clear custom character**.

1. Use the user's description or provided artwork to pick a silhouette and a compact palette. When the request leaves room for interpretation, make a first version and use the preview for feedback.
2. Start with [the example](assets/starter-character.json). Draw each pose as an array of equal-length strings. A dot is transparent. Each other character is a one-letter or digit key in `palette` and maps to a six-digit hex color. Use at most 24 palette entries and keep each pose within 30 columns × 24 rows.
3. Supply all seven required poses. Aim for a standing silhouette around 18–22 pixels tall. Keep the character’s scale, silhouette, and floor contact consistent from frame to frame. Leave negative space where the feet lift or a held object moves. In `work`, turn the character away toward the screen. Give `sleep` a horizontal silhouette.

| Pose | Use |
| --- | --- |
| `idle`, `back` | Standing front and rear poses |
| `walkA`, `walkB` | Alternating steps with stable body mass and different foot placements |
| `work`, `read`, `sleep` | Seated work, reading, and lying down |
| Optional `work2`, `blink`, `post`, `phone`, `tea` | Second typing frame, blink, board note, telephone, and coffee break |

4. Save `version: 1`, a display `name` of up to 40 characters, `palette`, and `poses` in one JSON file under 32 KiB. Use the browser's import validation. When browser access is available, import the exact file and play the demo through walking, seated work, and rest in two rooms. When it is unavailable, check required keys, grid widths, palette coverage, and visible pixels for every pose.
5. Deliver the character JSON and the viewer link. Include the file itself so the user can move it between browsers or share it.
