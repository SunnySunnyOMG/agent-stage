# Pixel rooms and characters

The pixel renderer reuses the room layouts, navigation, director, and generic character artwork from the AI Box pixel renderer at revision `5247b24e51ba07926ad5fe4e4fcd7a3bf9ef36e2`. The eight rooms are Zen, Court, Ubud, Marrakech, Venice, Dali, Alpine, and Santorini. The four selectable characters are Wooden doll, Cat, Rice ball, and Curled paper.

The public build selects only the four generic character definitions and their turned poses. It also retains a generic sprout used internally by the room renderer. The Santorini environment has four WebP textures. They load only when that room is selected.

The checked-in [browser module](../skills/agent-stage/assets/viewer/pixel-engine.mjs) and [environment textures](../skills/agent-stage/assets/viewer/pixel-assets/) are sufficient to run or deploy the viewer. With access to the upstream checkout and its installed esbuild, rebuild them using `node scripts/build-pixel-engine.mjs /path/to/checkout`. The build extracts a pinned revision and validates the excluded character inventory before writing the browser module.

The [character Skill](../skills/agent-stage-character/SKILL.md) documents the editable character format. The viewer validates the JSON and supplies the resulting character directly to the same pixel renderer.
