// Agent Stage pixel renderer. Rebuild with scripts/build-pixel-engine.mjs.
function facingBetween(a, b) {
  return Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]) ? b[0] >= a[0] ? "right" : "left" : b[1] >= a[1] ? "front" : "back";
}
function canWalk(p, scene2) {
  const [x, y] = p;
  return x >= 18 && x <= scene2.width - 18 && y >= (scene2.floorTop ?? 34) + 10 && y <= scene2.height - 12 && !scene2.solids.some(
    (s) => x + 12 > s.x && x - 12 < s.x + s.width && y + 4 > s.y && // Walking feet lift up to 16px above the contact point.
    y - 16 < s.y + s.height
  );
}
function clear(a, b, scene2) {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
  for (let i = 0; i <= n; i++)
    if (!canWalk(
      [
        a[0] + (b[0] - a[0]) * i / (n || 1),
        a[1] + (b[1] - a[1]) * i / (n || 1)
      ],
      scene2
    ))
      return false;
  return true;
}
function findPath(a, b, scene2) {
  if (!canWalk(a, scene2) || !canWalk(b, scene2))
    throw new Error(
      "Navigation endpoint intersects furniture or the room boundary"
    );
  if (clear(a, b, scene2)) return [a, b];
  const step = 8, cols = Math.ceil(scene2.width / step), rows = Math.ceil(scene2.height / step);
  const point = (index) => [
    index % cols * step,
    Math.floor(index / cols) * step
  ];
  function nearest(p) {
    const candidates = [];
    for (let y = Math.round(p[1] / step) - 3; y <= Math.round(p[1] / step) + 3; y++)
      for (let x = Math.round(p[0] / step) - 3; x <= Math.round(p[0] / step) + 3; x++)
        if (x >= 0 && x < cols && y >= 0 && y < rows && canWalk([x * step, y * step], scene2) && clear(p, [x * step, y * step], scene2))
          candidates.push(y * cols + x);
    candidates.sort(
      (i, j) => Math.hypot(point(i)[0] - p[0], point(i)[1] - p[1]) - Math.hypot(point(j)[0] - p[0], point(j)[1] - p[1])
    );
    if (!candidates.length)
      throw new Error("No walkable grid point near station");
    return candidates[0];
  }
  const start = nearest(a), end = nearest(b), parents = /* @__PURE__ */ new Map([[start, -1]]), queue = [start];
  for (let q = 0; q < queue.length && !parents.has(end); q++) {
    const id = queue[q], [x, y] = point(id);
    for (const [dx, dy] of [
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step]
    ]) {
      const nx = x + dx, ny = y + dy, index = ny / step * cols + nx / step;
      if (nx < 0 || nx >= scene2.width || ny < 0 || ny >= scene2.height || parents.has(index) || !clear([x, y], [nx, ny], scene2))
        continue;
      parents.set(index, id);
      queue.push(index);
    }
  }
  if (!parents.has(end))
    throw new Error("Station is unreachable: furniture blocks the route");
  const route2 = [];
  for (let i = end; i !== -1; ) {
    route2.unshift(point(i));
    const parent = parents.get(i);
    if (parent === void 0) throw new Error("Broken navigation parent chain");
    i = parent;
  }
  const compact = [a];
  for (let i = 0; i < route2.length; i++) {
    const last = compact[compact.length - 1];
    if (last[0] === route2[i][0] && last[1] === route2[i][1]) continue;
    if (i > 0 && i < route2.length - 1 && (route2[i - 1][0] === route2[i][0] && route2[i][0] === route2[i + 1][0] || route2[i - 1][1] === route2[i][1] && route2[i][1] === route2[i + 1][1]))
      continue;
    compact.push(route2[i]);
  }
  if (compact[compact.length - 1][0] !== b[0] || compact[compact.length - 1][1] !== b[1])
    compact.push(b);
  return compact;
}
function pathLength(path) {
  return path.slice(1).reduce(
    (n, p, i) => n + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]),
    0
  );
}
function pointOnPath(path, fraction) {
  let remaining = pathLength(path) * Math.max(0, Math.min(1, fraction));
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (remaining < d || i === path.length - 1) {
      const f = d ? remaining / d : 0;
      const direction = facingBetween(a, b);
      return {
        point: [
          Math.round(a[0] + (b[0] - a[0]) * f),
          Math.round(a[1] + (b[1] - a[1]) * f)
        ],
        direction
      };
    }
    remaining -= d;
  }
  return { point: path[0], direction: "front" };
}

var office_scene_default = {
  width: 480,
  height: 560,
  floorTop: 150,
  items: [
    {
      name: "room",
      asset: "room",
      x: 0,
      y: 0,
      depth: 0
    },
    {
      name: "meeting-rug",
      asset: "rug-meeting",
      x: 22,
      y: 266,
      depth: 1
    },
    {
      name: "sofa-rug",
      asset: "lounge-rug-lounge",
      x: 228,
      y: 416,
      depth: 1
    },
    {
      name: "work-rug",
      asset: "rug-small",
      x: 325,
      y: 313,
      depth: 1
    },
    {
      name: "window",
      asset: "window",
      x: 16,
      y: 4,
      depth: 3,
      wallMounted: true
    },
    {
      name: "window-frame",
      asset: "window-frame",
      x: 16,
      y: 4,
      depth: 3,
      wallMounted: true
    },
    {
      name: "clock",
      asset: "clock",
      x: 224,
      y: 14,
      depth: 4,
      wallMounted: true
    },
    {
      name: "sill-herb",
      asset: "sill-herb",
      x: 188,
      y: 130,
      depth: 4,
      wallMounted: true
    },
    {
      name: "library-sign",
      asset: "library-sign",
      x: 287,
      y: 12,
      depth: 3,
      wallMounted: true
    },
    {
      name: "library-bay-0",
      asset: "bookcase-bay",
      x: 214,
      y: 46,
      depth: 160,
      station: "library",
      layer: "back"
    },
    {
      name: "library-shelf-0-0",
      asset: "book-row",
      x: 218,
      y: 56,
      depth: 160,
      station: "library"
    },
    {
      name: "library-shelf-0-1",
      asset: "book-row-b",
      x: 218,
      y: 82,
      depth: 160,
      station: "library"
    },
    {
      name: "library-shelf-0-2",
      asset: "storage-bin",
      x: 218,
      y: 108,
      depth: 160,
      station: "library"
    },
    {
      name: "library-shelf-0-3",
      asset: "book-row-c",
      x: 218,
      y: 134,
      depth: 160,
      station: "library"
    },
    {
      name: "library-bay-0",
      asset: "bookcase-bay",
      x: 214,
      y: 46,
      depth: 160,
      station: "library",
      layer: "front"
    },
    {
      name: "library-bay-1",
      asset: "bookcase-bay",
      x: 264,
      y: 46,
      depth: 160,
      station: "library",
      layer: "back"
    },
    {
      name: "library-shelf-1-0",
      asset: "book-row-c",
      x: 268,
      y: 56,
      depth: 160,
      station: "library"
    },
    {
      name: "library-shelf-1-1",
      asset: "book-row",
      x: 268,
      y: 82,
      depth: 160,
      station: "library"
    },
    {
      name: "library-shelf-1-2",
      asset: "book-row-b",
      x: 268,
      y: 108,
      depth: 160,
      station: "library"
    },
    {
      name: "library-shelf-1-3",
      asset: "book-row-selected",
      cycle: "library-book",
      x: 268,
      y: 134,
      depth: 160,
      station: "library"
    },
    {
      name: "library-bay-1",
      asset: "bookcase-bay",
      x: 264,
      y: 46,
      depth: 160,
      station: "library",
      layer: "front"
    },
    {
      name: "library-bay-2",
      asset: "bookcase-bay",
      x: 314,
      y: 46,
      depth: 160,
      station: "library",
      layer: "back"
    },
    {
      name: "library-shelf-2-0",
      asset: "book-row-b",
      x: 318,
      y: 56,
      depth: 160,
      station: "library"
    },
    {
      name: "library-shelf-2-1",
      asset: "book-row-c",
      x: 318,
      y: 82,
      depth: 160,
      station: "library"
    },
    {
      name: "library-shelf-2-2",
      asset: "book-row",
      x: 318,
      y: 108,
      depth: 160,
      station: "library"
    },
    {
      name: "library-reading-light",
      asset: "shelf-light",
      x: 279,
      y: 44,
      depth: 160.5,
      station: "library"
    },
    {
      name: "library-shelf-2-3",
      asset: "storage-bin",
      x: 318,
      y: 134,
      depth: 160,
      station: "library"
    },
    {
      name: "library-bay-2",
      asset: "bookcase-bay",
      x: 314,
      y: 46,
      depth: 160,
      station: "library",
      layer: "front"
    },
    {
      name: "library-bay-3",
      asset: "bookcase-bay",
      x: 364,
      y: 46,
      depth: 160,
      station: "library",
      layer: "back"
    },
    {
      name: "library-shelf-3-0",
      asset: "storage-bin",
      x: 368,
      y: 56,
      depth: 160,
      station: "library"
    },
    {
      name: "library-shelf-3-1",
      asset: "book-row",
      x: 368,
      y: 82,
      depth: 160,
      station: "library"
    },
    {
      name: "library-shelf-3-2",
      asset: "book-row-c",
      x: 368,
      y: 108,
      depth: 160,
      station: "library"
    },
    {
      name: "library-shelf-3-3",
      asset: "book-row-b",
      x: 368,
      y: 134,
      depth: 160,
      station: "library"
    },
    {
      name: "library-bay-3",
      asset: "bookcase-bay",
      x: 364,
      y: 46,
      depth: 160,
      station: "library",
      layer: "front"
    },
    {
      name: "library-bay-4",
      asset: "bookcase-bay",
      x: 414,
      y: 46,
      depth: 160,
      station: "library",
      layer: "back"
    },
    {
      name: "library-shelf-4-0",
      asset: "book-row",
      x: 418,
      y: 56,
      depth: 160,
      station: "library"
    },
    {
      name: "library-shelf-4-1",
      asset: "book-row-b",
      x: 418,
      y: 82,
      depth: 160,
      station: "library"
    },
    {
      name: "library-shelf-4-2",
      asset: "book-row-c",
      x: 418,
      y: 108,
      depth: 160,
      station: "library"
    },
    {
      name: "library-shelf-4-3",
      asset: "storage-bin",
      x: 418,
      y: 134,
      depth: 160,
      station: "library"
    },
    {
      name: "library-bay-4",
      asset: "bookcase-bay",
      x: 414,
      y: 46,
      depth: 160,
      station: "library",
      layer: "front"
    },
    {
      name: "bookcase-top-greenery",
      asset: "plant-leaf",
      x: 428,
      y: 16,
      depth: 161
    },
    {
      name: "code-desk",
      asset: "standing-desk",
      x: 18,
      y: 137,
      depth: 164,
      station: "code"
    },
    {
      name: "code-screen-stand-left",
      asset: "monitor-stand",
      x: 40,
      y: 129,
      depth: 164,
      station: "code"
    },
    {
      name: "code-screen-stand-right",
      asset: "monitor-stand",
      x: 96,
      y: 129,
      depth: 164,
      station: "code"
    },
    {
      name: "claude-monitor",
      asset: "monitor-warm",
      x: 18,
      y: 97,
      depth: 164,
      station: "code"
    },
    {
      name: "claude-monitor-content",
      asset: "screen-claude",
      x: 24,
      y: 103,
      depth: 164,
      station: "code",
      cycle: "display"
    },
    {
      name: "codex-monitor",
      asset: "monitor-warm",
      x: 74,
      y: 97,
      depth: 164,
      station: "code"
    },
    {
      name: "codex-monitor-content",
      asset: "screen-codex",
      x: 80,
      y: 103,
      depth: 164,
      station: "code",
      cycle: "display"
    },
    {
      name: "code-keyboard",
      asset: "keyboard",
      x: 54,
      y: 143,
      depth: 164,
      station: "code",
      cycle: "keyboard"
    },
    {
      name: "code-lamp",
      asset: "desk-lamp",
      x: 126,
      y: 117,
      depth: 164,
      station: "code"
    },
    {
      name: "window-radio",
      asset: "retro-radio",
      x: 150,
      y: 118,
      depth: 158
    },
    {
      name: "main-drawer",
      asset: "drawer",
      x: 267,
      y: 295,
      depth: 321,
      station: "work"
    },
    {
      name: "main-desk",
      asset: "desk-frame",
      x: 261,
      y: 259,
      depth: 323,
      station: "work"
    },
    {
      name: "main-monitor-stand",
      asset: "monitor-stand",
      x: 343,
      y: 271,
      depth: 323,
      station: "work"
    },
    {
      name: "slack-monitor",
      asset: "monitor-warm",
      x: 321,
      y: 239,
      depth: 323,
      station: "work"
    },
    {
      name: "slack-monitor-content",
      asset: "screen-slack",
      x: 327,
      y: 245,
      depth: 323,
      station: "work",
      cycle: "display"
    },
    {
      name: "docs-monitor-stand",
      asset: "monitor-stand",
      x: 399,
      y: 271,
      depth: 323,
      station: "work"
    },
    {
      name: "docs-monitor",
      asset: "monitor-warm",
      x: 377,
      y: 239,
      depth: 323,
      station: "work"
    },
    {
      name: "docs-monitor-content",
      asset: "screen-docs",
      x: 383,
      y: 245,
      depth: 323,
      station: "work",
      cycle: "display"
    },
    {
      name: "main-paper-stack",
      asset: "paper-stack",
      x: 293,
      y: 269,
      depth: 323,
      station: "work"
    },
    {
      name: "main-keyboard",
      asset: "keyboard",
      x: 357,
      y: 287,
      depth: 323,
      station: "work",
      cycle: "keyboard"
    },
    {
      name: "main-mug",
      asset: "mug",
      x: 337,
      y: 288,
      depth: 323,
      station: "work"
    },
    {
      name: "main-paper-pile-1",
      asset: "paper-stack",
      x: 265,
      y: 267,
      depth: 323,
      station: "work"
    },
    {
      name: "main-paper-pile-2",
      asset: "paper-stack",
      x: 266,
      y: 262,
      depth: 323,
      station: "work"
    },
    {
      name: "main-paper-pile-3",
      asset: "paper-stack",
      x: 265,
      y: 257,
      depth: 323,
      station: "work"
    },
    {
      name: "main-paper-pile-4",
      asset: "paper-stack",
      x: 284,
      y: 269,
      depth: 323,
      station: "work"
    },
    {
      name: "main-paper-pile-5",
      asset: "paper-stack",
      x: 285,
      y: 264,
      depth: 323,
      station: "work"
    },
    {
      name: "main-phone",
      asset: "phone-base",
      x: 433,
      y: 267,
      depth: 323,
      station: "phone",
      cycle: "phone"
    },
    {
      name: "main-chair",
      asset: "chair",
      x: 357,
      y: 281,
      depth: 333,
      station: "work",
      layer: "back"
    },
    {
      name: "main-chair",
      asset: "chair",
      x: 357,
      y: 281,
      depth: 333,
      station: "work",
      layer: "front"
    },
    {
      name: "work-lamp",
      asset: "wall-lamp",
      x: 403,
      y: 195,
      depth: 325,
      station: "work"
    },
    {
      name: "task-board",
      asset: "task-board",
      x: 139,
      y: 228,
      depth: 270,
      station: "tasks"
    },
    {
      name: "task-board-light",
      asset: "board-light",
      x: 151,
      y: 222,
      depth: 270.3,
      station: "tasks"
    },
    {
      name: "desk-olive",
      asset: "olive-tree",
      x: 267,
      y: 191,
      depth: 279
    },
    {
      name: "meeting-monitor-stand",
      asset: "floor-screen-stand",
      x: 60,
      y: 232,
      depth: 279,
      station: "meeting"
    },
    {
      name: "meeting-monitor",
      asset: "monitor-floor",
      x: 39,
      y: 190,
      depth: 279,
      station: "meeting"
    },
    {
      name: "meeting-monitor-content",
      asset: "screen-meeting",
      x: 45,
      y: 196,
      depth: 279,
      station: "meeting",
      cycle: "recording"
    },
    {
      name: "meeting-table",
      asset: "meeting-table",
      x: 26,
      y: 264,
      depth: 318,
      station: "meeting"
    },
    {
      name: "meeting-left",
      asset: "chair",
      x: 40,
      y: 284,
      depth: 334,
      station: "meeting",
      layer: "back"
    },
    {
      name: "meeting-left",
      asset: "chair",
      x: 40,
      y: 284,
      depth: 334,
      station: "meeting",
      layer: "front"
    },
    {
      name: "meeting-right",
      asset: "chair",
      x: 84,
      y: 284,
      depth: 334,
      station: "meeting",
      layer: "back"
    },
    {
      name: "meeting-right",
      asset: "chair",
      x: 84,
      y: 284,
      depth: 334,
      station: "meeting",
      layer: "front"
    },
    {
      name: "meeting-microphone",
      asset: "microphone",
      x: 68,
      y: 269,
      depth: 319,
      station: "meeting",
      cycle: "meeting"
    },
    {
      name: "meeting-laptop",
      asset: "laptop",
      x: 88,
      y: 275,
      depth: 319,
      station: "meeting",
      cycle: "meeting"
    },
    {
      name: "meeting-paper",
      asset: "paper-stack",
      x: 44,
      y: 277,
      depth: 319,
      station: "meeting"
    },
    {
      name: "meeting-pen",
      asset: "pen",
      x: 64,
      y: 279,
      depth: 319,
      station: "meeting"
    },
    {
      name: "meeting-lamp",
      asset: "desk-lamp",
      x: 30,
      y: 257,
      depth: 319,
      station: "meeting"
    },
    {
      name: "bookcase-flowers",
      asset: "plant-flowering",
      x: 396,
      y: 10,
      depth: 161
    },
    {
      name: "sofa",
      asset: "lounge-sofa",
      x: 263,
      y: 397,
      depth: 465,
      station: "sofa",
      layer: "back"
    },
    {
      name: "sofa",
      asset: "lounge-sofa",
      x: 263,
      y: 397,
      depth: 465,
      station: "sofa",
      layer: "front"
    },
    {
      name: "sofa-cushion",
      asset: "lounge-cushion",
      x: 359,
      y: 417,
      depth: 465,
      station: "sofa"
    },
    {
      name: "sofa-floor-lamp",
      asset: "tiffany-lamp",
      x: 230,
      y: 383,
      depth: 454
    },
    {
      name: "lounge-plant",
      asset: "lounge-plants",
      x: 406,
      y: 350,
      depth: 446
    },
    {
      name: "coffee-cabinet",
      asset: "coffee-cabinet",
      x: 412,
      y: 472,
      depth: 528,
      station: "coffee"
    },
    {
      name: "coffee-machine",
      asset: "coffee-machine",
      x: 414,
      y: 466,
      depth: 529,
      station: "coffee",
      cycle: "brew"
    },
    {
      name: "coffee-candle",
      asset: "cc0-candle",
      x: 441,
      y: 466,
      depth: 529,
      station: "coffee"
    },
    {
      name: "lounge-pouf",
      asset: "lounge-pouf",
      x: 254,
      y: 492,
      depth: 511
    },
    {
      name: "lounge-pouf-2",
      asset: "lounge-pouf",
      x: 367,
      y: 511,
      depth: 530
    },
    {
      name: "coffee-table",
      asset: "lounge-coffee-table",
      x: 276,
      y: 464,
      depth: 520
    },
    {
      name: "coffee-table-flowers",
      asset: "lounge-flower-pot",
      x: 293,
      y: 462,
      depth: 520
    },
    {
      name: "coffee-table-book",
      asset: "lounge-book",
      x: 327,
      y: 469,
      depth: 520
    },
    {
      name: "coffee-table-mug",
      asset: "lounge-mug",
      x: 359,
      y: 488,
      depth: 520
    },
    {
      name: "door",
      asset: "entry-door",
      x: 0,
      y: 375,
      depth: 457
    },
    {
      name: "umbrella-stand",
      asset: "umbrella-stand",
      x: 3,
      y: 343,
      depth: 372
    },
    {
      name: "handoff-cabinet",
      asset: "handoff-cabinet",
      x: 42,
      y: 426,
      depth: 497,
      station: "handoff"
    },
    {
      name: "handoff-bell",
      asset: "handoff-bell",
      x: 56,
      y: 432,
      depth: 498,
      station: "handoff"
    },
    {
      name: "handoff-rack-back",
      asset: "handoff-rack",
      x: 96,
      y: 426,
      depth: 498,
      station: "handoff",
      layer: "back"
    },
    {
      name: "handoff-rack-front",
      asset: "handoff-rack",
      x: 96,
      y: 426,
      depth: 500,
      station: "handoff",
      layer: "front"
    },
    {
      name: "handoff-lantern",
      asset: "handoff-lantern",
      x: 29,
      y: 408,
      depth: 470
    },
    {
      name: "floor-eucalyptus",
      asset: "eucalyptus",
      x: 3,
      y: 484,
      depth: 541
    },
    {
      name: "radio-notes",
      asset: "radio-notes",
      x: 150,
      y: 108,
      depth: 159,
      cycle: "always"
    },
    {
      name: "library-flowers",
      asset: "library-flowers",
      x: 260,
      y: 22,
      depth: 162
    },
    {
      name: "handoff-rug",
      asset: "handoff-rug",
      x: 22,
      y: 448,
      depth: 1
    },
    {
      name: "reading-rug",
      asset: "reading-rug",
      x: 322,
      y: 181,
      depth: 1
    },
    {
      name: "reading-chair",
      asset: "reading-chair",
      x: 375,
      y: 155,
      depth: 206,
      station: "library",
      layer: "back"
    },
    {
      name: "reading-chair",
      asset: "reading-chair",
      x: 375,
      y: 155,
      depth: 206,
      station: "library",
      layer: "front"
    },
    {
      name: "reading-table",
      asset: "reading-table",
      x: 333,
      y: 178,
      depth: 206,
      station: "library"
    },
    {
      name: "reading-lamp",
      asset: "pleated-lamp",
      x: 330,
      y: 148,
      depth: 207,
      station: "library"
    },
    {
      name: "halloween-pumpkin",
      asset: "jack-o-lantern",
      x: 81,
      y: 437,
      depth: 498.5,
      decor: "halloween"
    },
    {
      name: "halloween-bats",
      asset: "paper-bats",
      x: 88,
      y: 7,
      depth: 3.5,
      wallMounted: true,
      decor: "halloween"
    },
    {
      name: "halloween-cobweb",
      asset: "cobweb",
      x: 189,
      y: 7,
      depth: 3.5,
      wallMounted: true,
      decor: "halloween"
    },
    {
      name: "christmas-tree",
      asset: "corner-tree",
      x: 464,
      y: 118,
      depth: 164,
      decor: "christmas"
    },
    {
      name: "spring-lanterns",
      asset: "red-lanterns",
      x: 90,
      y: 7,
      depth: 3.5,
      wallMounted: true,
      decor: "spring-festival"
    },
    {
      name: "spring-fu",
      asset: "fu-diamond",
      x: 4,
      y: 387,
      depth: 457.5,
      decor: "spring-festival"
    }
  ],
  stations: {
    library: {
      approach: [288, 182],
      seat: [399, 191],
      pivot: [20, 54],
      chair: "reading-chair",
      enterSide: 1,
      via: [432, 207],
      seatApproach: [432, 207]
    },
    code: {
      approach: [82, 164]
    },
    work: {
      approach: [321, 359],
      seat: [377, 330],
      pivot: [20, 64],
      chair: "main-chair",
      enterSide: -1
    },
    tasks: {
      approach: [226, 278],
      postApproach: [156, 272]
    },
    phone: {
      approach: [451, 353]
    },
    meeting: {
      approach: [166, 346],
      seat: [104, 333],
      pivot: [20, 64],
      chair: "meeting-right",
      enterSide: 1,
      bubbleSide: "right"
    },
    coffee: {
      approach: [400, 502]
    },
    sofa: {
      approach: [408, 476],
      seat: [338, 456],
      pivot: [20, 66],
      sleepPivot: [23, 58],
      chair: "sofa",
      enterSide: 1
    },
    handoff: {
      approach: [146, 464],
      bubbleSide: "right"
    }
  },
  solids: [
    {
      name: "library",
      x: 214,
      y: 150,
      width: 250,
      height: 12
    },
    {
      name: "main-desk",
      x: 263,
      y: 271,
      width: 200,
      height: 52
    },
    {
      name: "main-chair",
      x: 365,
      y: 321,
      width: 24,
      height: 12
    },
    {
      name: "task-board",
      x: 147,
      y: 276,
      width: 60,
      height: 10
    },
    {
      name: "meeting-display",
      x: 64,
      y: 252,
      width: 36,
      height: 28
    },
    {
      name: "sofa",
      x: 265,
      y: 427,
      width: 128,
      height: 38
    },
    {
      name: "sofa-floor-lamp",
      x: 240,
      y: 444,
      width: 18,
      height: 10
    },
    {
      name: "lounge-plant",
      x: 410,
      y: 436,
      width: 54,
      height: 12
    },
    {
      name: "coffee-cabinet",
      x: 414,
      y: 500,
      width: 52,
      height: 28
    },
    {
      name: "coffee-table",
      x: 280,
      y: 494,
      width: 98,
      height: 24
    },
    {
      name: "desk-olive",
      x: 283,
      y: 267,
      width: 24,
      height: 12
    },
    {
      name: "meeting-table",
      x: 28,
      y: 283,
      width: 108,
      height: 26
    },
    {
      name: "meeting-left",
      x: 48,
      y: 324,
      width: 24,
      height: 12
    },
    {
      name: "meeting-right",
      x: 92,
      y: 324,
      width: 24,
      height: 12
    },
    {
      name: "lounge-pouf",
      x: 256,
      y: 501,
      width: 21,
      height: 9
    },
    {
      name: "lounge-pouf-2",
      x: 368,
      y: 520,
      width: 21,
      height: 9
    },
    {
      name: "handoff-cabinet",
      x: 48,
      y: 473,
      width: 98,
      height: 27
    },
    {
      name: "handoff-lantern",
      x: 32,
      y: 465,
      width: 16,
      height: 6
    },
    {
      name: "umbrella-stand",
      x: 7,
      y: 366,
      width: 12,
      height: 7
    },
    {
      name: "standing-left-foot",
      x: 28,
      y: 162,
      width: 8,
      height: 2
    },
    {
      name: "standing-right-foot",
      x: 128,
      y: 162,
      width: 8,
      height: 2
    },
    {
      name: "floor-eucalyptus",
      x: 12,
      y: 530,
      width: 22,
      height: 10
    },
    {
      name: "reading-chair",
      x: 381,
      y: 187,
      width: 37,
      height: 17
    },
    {
      name: "reading-table",
      x: 337,
      y: 194,
      width: 24,
      height: 11
    }
  ],
  labels: [
    {
      text: "My Library",
      x: 292,
      y: 20,
      width: 94,
      height: 9,
      style: "tall"
    },
    {
      text: "Local \xB7 Private",
      x: 292,
      y: 31,
      width: 94,
      height: 5,
      style: "small"
    }
  ],
  lights: [
    {
      kind: "patch",
      origin: [20, 150],
      width: 59,
      length: 120,
      shear: 0.3,
      color: [150, 186, 236],
      strength: 0.2
    },
    {
      kind: "patch",
      origin: [83, 150],
      width: 59,
      length: 120,
      shear: 0.3,
      color: [150, 186, 236],
      strength: 0.2
    },
    {
      kind: "patch",
      origin: [146, 150],
      width: 58,
      length: 120,
      shear: 0.3,
      color: [150, 186, 236],
      strength: 0.2
    },
    {
      kind: "pool",
      origin: [100, 50],
      radius: [96, 44],
      color: [150, 186, 236],
      strength: 0.1
    },
    {
      kind: "beam",
      origin: [423, 229],
      end: [407, 305],
      nearWidth: 18,
      farWidth: 154,
      color: [255, 212, 148],
      strength: 0.52
    },
    {
      kind: "pool",
      origin: [401, 299],
      radius: [144, 60],
      color: [255, 208, 140],
      strength: 1
    },
    {
      kind: "pool",
      origin: [423, 226],
      radius: [9, 6],
      color: [255, 236, 190],
      strength: 0.9
    },
    {
      kind: "pool",
      origin: [248, 430],
      radius: [234, 158],
      color: [255, 206, 140],
      strength: 0.86
    },
    {
      kind: "pool",
      origin: [249, 398],
      radius: [11, 14],
      color: [255, 232, 186],
      strength: 0.8
    },
    {
      kind: "pool",
      origin: [10, 452],
      radius: [39, 24],
      color: [255, 214, 150],
      strength: 0.54
    },
    {
      kind: "pool",
      origin: [61, 448],
      radius: [60, 30],
      color: [255, 214, 150],
      strength: 0.96
    },
    {
      kind: "pool",
      origin: [61, 448],
      radius: [128, 62],
      color: [255, 214, 150],
      strength: 0.38
    },
    {
      kind: "pool",
      origin: [40, 422],
      radius: [14, 13],
      color: [255, 232, 186],
      strength: 0.9
    },
    {
      kind: "pool",
      origin: [452, 476],
      radius: [51, 33],
      color: [255, 190, 110],
      strength: 0.72
    },
    {
      kind: "pool",
      origin: [452, 470],
      radius: [10, 5],
      color: [255, 228, 170],
      strength: 0.85
    },
    {
      kind: "pool",
      origin: [106, 145],
      radius: [104, 45],
      color: [255, 212, 148],
      strength: 0.84
    },
    {
      kind: "pool",
      origin: [134, 125],
      radius: [7, 5],
      color: [255, 236, 190],
      strength: 0.85
    },
    {
      kind: "pool",
      origin: [82, 288],
      radius: [126, 72],
      color: [255, 212, 148],
      strength: 0.78
    },
    {
      kind: "pool",
      origin: [38, 267],
      radius: [7, 5],
      color: [255, 236, 190],
      strength: 0.85
    },
    {
      kind: "pool",
      origin: [338, 120],
      radius: [110, 90],
      color: [255, 212, 148],
      strength: 1
    },
    {
      kind: "pool",
      origin: [339, 52],
      radius: [60, 4],
      color: [255, 236, 190],
      strength: 0.8
    },
    {
      kind: "pool",
      origin: [175, 250],
      radius: [54, 34],
      color: [255, 212, 148],
      strength: 0.8
    },
    {
      kind: "pool",
      origin: [175, 230],
      radius: [22, 3],
      color: [255, 236, 190],
      strength: 0.8
    },
    {
      kind: "pool",
      origin: [342, 166],
      radius: [54, 45],
      color: [255, 225, 181],
      strength: 0.4
    },
    {
      kind: "pool",
      origin: [88, 444],
      radius: [7, 5],
      color: [255, 196, 110],
      strength: 0.9,
      decor: "halloween"
    },
    {
      kind: "pool",
      origin: [88, 446],
      radius: [30, 16],
      color: [255, 168, 92],
      strength: 0.55,
      decor: "halloween"
    },
    {
      kind: "pool",
      origin: [472, 138],
      radius: [14, 24],
      color: [255, 214, 150],
      strength: 0.35,
      decor: "christmas"
    },
    {
      kind: "pool",
      origin: [470, 127],
      radius: [3, 3],
      color: [255, 236, 190],
      strength: 0.85,
      decor: "christmas",
      twinkle: 0
    },
    {
      kind: "pool",
      origin: [474, 130],
      radius: [3, 3],
      color: [255, 120, 100],
      strength: 0.85,
      decor: "christmas",
      twinkle: 0.37
    },
    {
      kind: "pool",
      origin: [469, 135],
      radius: [3, 3],
      color: [255, 206, 110],
      strength: 0.85,
      decor: "christmas",
      twinkle: 0.71
    },
    {
      kind: "pool",
      origin: [474, 138],
      radius: [3, 3],
      color: [150, 200, 255],
      strength: 0.85,
      decor: "christmas",
      twinkle: 0.13
    },
    {
      kind: "pool",
      origin: [471, 140],
      radius: [3, 3],
      color: [255, 236, 190],
      strength: 0.85,
      decor: "christmas",
      twinkle: 0.52
    },
    {
      kind: "pool",
      origin: [468, 145],
      radius: [3, 3],
      color: [255, 120, 100],
      strength: 0.85,
      decor: "christmas",
      twinkle: 0.88
    },
    {
      kind: "pool",
      origin: [473, 147],
      radius: [3, 3],
      color: [255, 206, 110],
      strength: 0.85,
      decor: "christmas",
      twinkle: 0.29
    },
    {
      kind: "pool",
      origin: [476, 150],
      radius: [3, 3],
      color: [150, 200, 255],
      strength: 0.85,
      decor: "christmas",
      twinkle: 0.64
    },
    {
      kind: "pool",
      origin: [470, 151],
      radius: [3, 3],
      color: [255, 236, 190],
      strength: 0.85,
      decor: "christmas",
      twinkle: 0.05
    },
    {
      kind: "pool",
      origin: [97, 26],
      radius: [7, 8],
      color: [255, 128, 96],
      strength: 0.85,
      decor: "spring-festival"
    },
    {
      kind: "pool",
      origin: [126, 26],
      radius: [7, 8],
      color: [255, 128, 96],
      strength: 0.85,
      decor: "spring-festival"
    },
    {
      kind: "pool",
      origin: [111, 30],
      radius: [40, 26],
      color: [255, 112, 84],
      strength: 0.3,
      decor: "spring-festival"
    }
  ],
  focusRects: {
    library: {
      x: 218,
      y: 30,
      width: 240,
      height: 200
    },
    code: {
      x: 0,
      y: 70,
      width: 240,
      height: 184
    },
    work: {
      x: 240,
      y: 206,
      width: 240,
      height: 184
    },
    tasks: {
      x: 52,
      y: 160,
      width: 240,
      height: 184
    },
    phone: {
      x: 240,
      y: 216,
      width: 240,
      height: 184
    },
    meeting: {
      x: 0,
      y: 186,
      width: 240,
      height: 184
    },
    coffee: {
      x: 240,
      y: 380,
      width: 240,
      height: 184
    },
    sofa: {
      x: 214,
      y: 360,
      width: 240,
      height: 184
    },
    handoff: {
      x: 0,
      y: 370,
      width: 240,
      height: 184
    }
  }
};

var office_scene_default2 = office_scene_default;

var scene = office_scene_default2;

var clips = [
  { name: "walk-front", pose: "walk", direction: "front", count: 6 },
  { name: "walk-right", pose: "walk", direction: "right", count: 6 },
  { name: "walk-back", pose: "walk", direction: "back", count: 6 },
  { name: "walk-left", pose: "walk", direction: "left", count: 6 },
  { name: "idle", pose: "idle", direction: "front", count: 8 },
  { name: "sit", pose: "sit", direction: "back", count: 8 },
  { name: "type", pose: "type", direction: "back", count: 6 },
  { name: "coffee", pose: "coffee", direction: "front", count: 12 },
  { name: "read", pose: "read", direction: "front", count: 8 },
  { name: "phone", pose: "phone", direction: "front", count: 8 },
  { name: "meet", pose: "meet", direction: "front", count: 8 },
  { name: "rest", pose: "rest", direction: "front", count: 6 },
  { name: "think", pose: "think", direction: "front", count: 6 },
  { name: "stretch", pose: "stretch", direction: "front", count: 6 },
  { name: "cheer", pose: "cheer", direction: "front", count: 6 },
  { name: "carry-front", pose: "carry", direction: "front", count: 6 },
  { name: "carry-right", pose: "carry", direction: "right", count: 6 },
  { name: "carry-back", pose: "carry", direction: "back", count: 6 },
  { name: "carry-left", pose: "carry", direction: "left", count: 6 },
  { name: "operate", pose: "operate", direction: "right", count: 8 },
  { name: "pickup", pose: "pickup", direction: "right", count: 6 },
  { name: "take-book", pose: "take", direction: "back", count: 6 },
  { name: "post", pose: "post", direction: "right", count: 8 },
  { name: "watch", pose: "watch", direction: "right", count: 8 },
  { name: "alert", pose: "alert", direction: "front", count: 10 },
  { name: "stand-type", pose: "stand-type", direction: "back", count: 6 },
  // The product guide's hello and its task-board post (spec issue 4621).
  { name: "wave", pose: "wave", direction: "front", count: 10 },
  { name: "post-back", pose: "post-back", direction: "back", count: 19 }
];
var from = 0;
var tags = Object.fromEntries(
  clips.map((clip) => {
    const result = [clip.name, { from, count: clip.count }];
    from += clip.count;
    return result;
  })
);
var holds = {
  operate: [160, 140, 120, 140, 320, 200, 160, 220],
  "take-book": [180, 260, 200, 140, 140, 180],
  post: [160, 140, 140, 300, 160, 160, 260, 340],
  coffee: [580, 160, 160, 160, 180, 220, 700, 700, 220, 160, 160, 600],
  pickup: [220, 160, 120, 120, 140, 200],
  watch: [260, 260, 200, 200, 260, 140, 260, 260],
  alert: [180, 120, 140, 420, 300, 300, 300, 300, 420, 200],
  // 180 ms a frame at the tempo below, 1.8 s in all, like the sidebar mark's
  // hello (packages/shell-ui/src/actor-paper.css, actor-paper-greet).
  wave: [300, 300, 300, 300, 300, 300, 300, 300, 300, 300],
  // Frame 8 (the press) starts at 384 ms, as the board pins the new note, and
  // frame 12 (the point, 624-768 ms) holds while the doing card leaves at
  // 636 ms: post's own moments, which the board's notes move by (timeline.ts,
  // pressedAt and pointedAt).
  "post-back": [
    80,
    80,
    80,
    80,
    80,
    80,
    80,
    80,
    160,
    80,
    80,
    80,
    240,
    80,
    80,
    80,
    80,
    80,
    160
  ]
};
var strideMs = 38;
var tempo = 0.6;
function frameDuration(action, phase) {
  if (action.startsWith("walk-") || action.startsWith("carry-"))
    return strideMs;
  const hold = holds[action]?.[phase] ?? 125;
  return action === "coffee" ? hold : Math.round(hold * tempo);
}
function cycleDuration(action) {
  let total = 0;
  for (let i = 0; i < tags[action].count; i++)
    total += frameDuration(action, i);
  return total;
}
function frameAt(action, ms) {
  const t = tags[action];
  let rest = Math.max(0, ms) % cycleDuration(action);
  for (let i = 0; i < t.count; i++) {
    rest -= frameDuration(action, i);
    if (rest < 0) return t.from + i;
  }
  return t.from + t.count - 1;
}
function clipOf(frame) {
  return clips.find(
    (c) => frame >= tags[c.name].from && frame < tags[c.name].from + c.count
  );
}
var paper = { x: 8, y: 14, w: 24, h: 28, curl: 10 };
var tipInset = 7;
var at = (list, phase) => list[phase % list.length];
function paperPose(pose, direction, phase) {
  const back = direction === "back";
  const lean = direction === "right" ? 1 : direction === "left" ? -1 : 0;
  const still = (dy) => ({
    dx: 0,
    dy: at(dy, phase),
    lean,
    back
  });
  switch (pose) {
    case "walk":
    case "carry":
      return still([0, -1, -2, -3, -2, -1]);
    case "idle":
      return still([0, 0, 0, -1, -1, -1, 0, 0]);
    case "sit":
      return still([0, 0, 1, 1, 2, 2, 2, 2]);
    case "stand-type":
    case "type":
      return still([2, 2, 3, 2, 2, 2]);
    case "coffee":
      return still([0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0]);
    case "phone":
      return still([0, 0, -1, 0, 0, -1, 0, 0]);
    case "rest":
      return still([2]);
    case "think":
      return still([0, -1, -1, -1, -1, 0]);
    case "stretch":
      return still([-1, -2, -1, -2, -1, 0]);
    case "cheer":
      return still([0, -2, -4, -4, -2, 0]);
    // The page hops and tips left once in the first second while the curl,
    // drawn as an arm, waves out, in, out, in and comes back down.
    case "wave":
      return {
        dx: 0,
        dy: at([0, 0, -2, -3, -1, 0, 0, 0, 0, 0], phase),
        lean: at([0, 0, -1, -1, 0, 0, 0, 0, 0, 0], phase),
        back
      };
    case "watch":
      return still([0, 0, -1, -1, 0, 0, 0, 0]);
    case "alert":
      return still([1, -3, 1, 0, 0, 0, 1, 1, 0, 0]);
    // Jump up to the shelf, hold while pulling the book, settle back down.
    case "take":
      return still([-5, -14, -14, -9, -4, 0]);
    // Reaching moves: the page hops so the curl meets the target.
    case "operate":
      return {
        dx: at([0, 3, 6, 10, 13, 10, 5, 0], phase),
        dy: at([0, -3, -5, -8, -11, -8, -4, 0], phase),
        lean,
        back
      };
    case "post":
      return {
        curlDy: 8,
        dx: at([0, 3, 7, 10, 6, 2, 6, 9], phase),
        dy: at([0, -5, -10, -13, -8, -3, -9, -13], phase),
        lean,
        back
      };
    // Post from in front of the board, back to the room: hop up to press
    // the new note into todo, slide right to point at the doing card as it
    // hops to done, settle. The page stays inside its 64 px frame.
    case "post-back":
      return {
        curlDy: 8,
        dx: at(
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 10, 16, 22, 18, 12, 7, 3, 1, 0],
          phase
        ),
        dy: at(
          [
            0,
            -4,
            -8,
            -11,
            -12,
            -13,
            -13,
            -13,
            -13,
            -11,
            -10,
            -11,
            -13,
            -10,
            -7,
            -4,
            -2,
            -1,
            0
          ],
          phase
        ),
        lean,
        back
      };
    case "pickup":
      return {
        dx: at([6, 6, 4, 3, 1, 0], phase),
        dy: at([-3, -3, -2, -1, 0, 0], phase),
        lean,
        back
      };
    default:
      return still([0]);
  }
}
function curlTip(pp) {
  const y = paper.y + paper.h - 1 - tipInset + pp.dy + (pp.curlDy ?? 0);
  return pp.back ? [paper.x + tipInset + pp.dx, y] : [paper.x + paper.w - 1 - tipInset + pp.dx, y];
}
var tipFor = (action, phase) => {
  const clip = clips.find((c) => c.name === action);
  return curlTip(paperPose(clip.pose, clip.direction, phase));
};
function pickupContact(phase) {
  const [tx, ty] = tipFor("pickup", phase);
  const x = [43, 43, 38, 32, tx + 3, tx + 3][phase % 6], y = [23, 23, 24, 26, ty - 9, ty - 9][phase % 6];
  return {
    x,
    y,
    left: [tx, ty],
    right: [tx, ty]
  };
}
function coffeeContact(phase, direction = "front", carrying = false) {
  const pp = paperPose(carrying ? "carry" : "coffee", direction, phase);
  const [tx, ty] = curlTip(pp);
  return {
    x: pp.back ? tx - 15 : tx + 3,
    y: ty - 9,
    flipX: pp.back,
    left: [tx, ty],
    right: [tx, ty]
  };
}
function heldPropForFrame(frame) {
  const c = clipOf(frame);
  if (!c) return void 0;
  const phase = frame - tags[c.name].from;
  if (c.pose === "take") return bookTakeContact(phase).prop;
  if (c.pose === "coffee" || c.pose === "carry") {
    const a = coffeeContact(phase, c.direction, c.pose === "carry");
    return { id: "mug", x: a.x, y: a.y, flipX: a.flipX, frame: 3 };
  }
  if (c.pose === "pickup") {
    const a = pickupContact(phase);
    return { id: "mug", x: a.x, y: a.y, frame: 3 };
  }
  const [tx, ty] = curlTip(paperPose(c.pose, c.direction, phase));
  if (c.pose === "read")
    return {
      id: "book-covers",
      x: tx - 22,
      y: ty - 12,
      frame: Math.floor(phase / 2) % 4
    };
  if (c.pose === "phone")
    return { id: "handset", x: tx + 1, y: ty - 20, frame: 0 };
  if (c.pose === "meet") {
    const [x, y] = meetPen(phase);
    return { id: "pen-held", x: x - 1, y: y - 6, frame: 0 };
  }
  if (c.pose === "alert") return alertMark(phase);
  if (c.pose === "post-back" && phase < 8)
    return { id: "sticky-note", x: tx - 10, y: ty - 8, frame: 1 };
  if (c.pose === "post" && phase < 4)
    return { id: "sticky-note", x: tx - 2, y: ty - 8, frame: 1 };
  return void 0;
}
function meetPen(phase) {
  const [tx, ty] = tipFor("meet", phase);
  const [dx, dy] = [
    [0, 0],
    [-1, -1],
    [-2, 0],
    [-1, 1],
    [0, 0],
    [-1, -1],
    [-2, -2],
    [-2, -2]
  ][phase % 8];
  return [tx + dx, ty + dy];
}
function bookTakeContact(phase) {
  const hand = tipFor("take-book", phase);
  if (phase < 2) return { hand, prop: void 0 };
  return {
    hand,
    prop: {
      id: "book-closed",
      x: hand[0] - 5,
      y: hand[1] - 8,
      frame: 0,
      behind: false
    }
  };
}
var alertMarkAnchor = [37, 1];
function alertMark(phase) {
  if (phase % 10 === 0) return void 0;
  const dy = [0, 1, 0, 0, 0, 1, 1, 0, 0, 0][phase % 10];
  return {
    id: "alert-mark",
    x: alertMarkAnchor[0],
    y: alertMarkAnchor[1] + dy,
    frame: phase % 10 === 1 ? 0 : 1
  };
}

var taskColumns = [
  { x: 5, label: "todo" },
  { x: 27, label: "doing" },
  { x: 49, label: "done" }
];
var taskRows = [15, 27];
var coffeeSpout = [10, 18];
var handoffPaperSlots = [
  [8, 22],
  [8, 12],
  [8, 2]
];

var beatLift = (p) => p <= 0 || p >= 1 ? 0 : Math.round(2 * Math.sin(Math.PI * p));
function item(name) {
  const found = scene.items.find((i) => i.name === name);
  if (!found) throw new Error(`Missing scene item: ${name}`);
  return found;
}
var walkSpeed = 200;
var seatSpeed = 300;
var seatStep = 0.5;
function seatVia(station) {
  const s = scene.stations[station];
  if (!s.seat) throw new Error(`Station has no seat: ${station}`);
  return s.via ?? [s.seat[0] + (s.enterSide ?? -1) * 32, s.seat[1] + 16];
}
function seatDuration(station) {
  const s = scene.stations[station], via = seatVia(station);
  if (!s.seat) throw new Error(`Station has no seat: ${station}`);
  const step = Math.hypot(
    via[0] - (s.seatApproach ?? s.approach)[0],
    via[1] - (s.seatApproach ?? s.approach)[1]
  ), settle = Math.hypot(
    s.seat[0] - via[0],
    s.seat[1] - via[1] - ((s.pivot?.[1] ?? 44) - 44)
  );
  return Math.round(
    Math.max(step, 1.5 * settle) / seatSpeed / seatStep * 1e3
  );
}
var seatMs = Math.max(
  ...Object.keys(scene.stations).filter((station) => scene.stations[station].seat).map(seatDuration)
);
var seatAction = (station) => station === "code" || station === "work" || station === "meeting" ? "sit" : "rest";
var samePoint = (a, b) => a[0] === b[0] && a[1] === b[1];
function routeVia(from2, via, to) {
  const first = samePoint(from2, via) ? [via] : findPath(from2, via, scene), second = findPath(via, to, scene);
  const before = first[first.length - 2], after = second[1];
  return before && after && samePoint(before, after) ? [...first.slice(0, -1), ...second.slice(2)] : [...first, ...second.slice(1)];
}
function createTrack(start, at2 = 0) {
  const track = {
    segments: [],
    cursor: at2,
    position: start,
    // Prop state stamped onto each appended segment.
    posted: void 0,
    postings: 0,
    brewAt: void 0,
    mugAway: false,
    add(ms, s) {
      const duration = Math.round(ms);
      track.segments.push({
        ...s,
        from: track.cursor,
        to: track.cursor + duration,
        start: track.position,
        ...track.posted === void 0 ? {} : { posted: track.posted, postIndex: track.postings - 1 },
        ...track.brewAt === void 0 ? {} : { brewAt: track.brewAt },
        ...track.mugAway ? { mugAway: true } : {}
      });
      track.cursor += duration;
      track.position = s.end;
    },
    walk(station, label, carrying = false) {
      track.walkTo(scene.stations[station].approach, label, carrying);
    },
    // Walk to `dest`, by way of `via` when given, in one stride.
    walkTo(dest, label, carrying = false, via) {
      const path = via ? routeVia(track.position, via, dest) : findPath(track.position, dest, scene);
      if (pathLength(path) > 0)
        track.add(pathLength(path) / walkSpeed * 1e3, {
          stage: "walk",
          label,
          bubble: "",
          end: dest,
          path,
          carrying
        });
    },
    enter(station) {
      const seat = scene.stations[station].seat;
      if (!seat) throw new Error(`Station has no seat: ${station}`);
      const approach = scene.stations[station].seatApproach;
      if (approach) track.walkTo(approach, "\u8D70\u5230\u9605\u8BFB\u6905\u65C1");
      track.add(seatDuration(station), {
        stage: "sit",
        station,
        label: station === "sofa" ? "\u5750\u4E0B\u6765\u6B47\u4E00\u4F1A\u513F" : "\u4ECE\u4FA7\u9762\u5750\u597D",
        bubble: "",
        end: seat,
        action: seatAction(station),
        carrying: station === "sofa"
      });
    },
    // Rise from the seat; from < 1 resumes a sit-down that was cut short.
    leave(station, from2 = 1) {
      track.add(seatDuration(station) * from2, {
        stage: "sit",
        station,
        label: "\u4ECE\u4FA7\u9762\u8D77\u8EAB",
        bubble: "",
        end: scene.stations[station].seatApproach ?? scene.stations[station].approach,
        action: seatAction(station),
        reverse: true,
        ...from2 < 1 ? { span: [from2, 0] } : {}
      });
    },
    act(ms, stage, station, action, label, bubble, options = {}) {
      if (action === "post" || action === "post-back") {
        track.posted = track.cursor;
        track.postings += 1;
      }
      track.add(ms, {
        stage,
        station,
        action,
        label,
        bubble,
        end: track.position,
        ...options.backwards ? { backwards: true } : {},
        ...options.beat ? { beat: options.beat } : {},
        ...scene.stations[station].seat && (track.position[0] !== scene.stations[station].seat[0] || track.position[1] !== scene.stations[station].seat[1]) ? { standing: true } : {}
      });
    },
    // Pin a new note on the task board. Agent stands at the board's right, and
    // its one hand, the curl, cannot reach the todo column from there: it
    // comes round by the board's right and along the board's front to that
    // column (a straight line from the shelves would cross behind the board
    // and pop Agent out in front of it), posts with its back to the room and
    // points at the doing card as it hops to done, then steps back to the
    // right. The guide's tour and everyday work both post this way. Returns
    // when the post began.
    postNote(walkLabel, label, bubble) {
      const board2 = scene.stations.tasks;
      if (!board2.postApproach)
        throw new Error("The task board has no post approach");
      track.walkTo(board2.postApproach, walkLabel, false, board2.approach);
      const postedAt = track.cursor;
      track.act(
        cycleDuration("post-back"),
        "post",
        "tasks",
        "post-back",
        label,
        bubble
      );
      track.walkTo(board2.approach, label);
      return postedAt;
    }
  };
  return track;
}
function phaseFrameAt(action, [first, last], ms) {
  let total = 0;
  for (let i = first; i <= last; i++) total += frameDuration(action, i);
  let rest = Math.max(0, ms) % total;
  for (let i = first; i <= last; i++) {
    rest -= frameDuration(action, i);
    if (rest < 0) return tags[action].from + i;
  }
  return tags[action].from + last;
}
function segmentAt(segments, t) {
  return segments.find((s) => t < s.to) ?? segments[segments.length - 1];
}
function poseOn(segments, t) {
  const s = segmentAt(segments, t);
  const progress = Math.min(1, (t - s.from) / (s.to - s.from)), local = Math.max(0, t - s.from);
  let pos = s.start, pivot = [20, 44], frame = s.phases ? phaseFrameAt(s.action ?? "idle", s.phases, local) : frameAt(s.action ?? "idle", local);
  if (s.backwards && s.action) {
    const clip = tags[s.action];
    frame = clip.from + clip.count - 1 - (frame - clip.from);
  }
  let asset = "actor";
  if (s.stage === "walk") {
    if (!s.path) throw new Error("Walking segment has no route");
    const v = pointOnPath(s.path, progress);
    pos = v.point;
    frame = frameAt(
      `${s.carrying ? "carry" : "walk"}-${v.direction}`,
      local
    );
  } else if (s.stage === "sit") {
    if (!s.station) throw new Error("Seating needs a station");
    const station = scene.stations[s.station], seat = station.seat, seatedPivot = station.pivot;
    if (!seat || !seatedPivot)
      throw new Error("Seating needs a seat and pivot");
    const via = seatVia(s.station);
    const f = s.span ? s.span[0] + (s.span[1] - s.span[0]) * progress : s.reverse ? 1 - progress : progress;
    const approach = station.seatApproach ?? station.approach;
    const first = f < seatStep, u = first ? f / seatStep : (f - seatStep) / (1 - seatStep), k = first ? u : u * u * (3 - 2 * u);
    const a = first ? approach : via, b = first ? via : seat;
    pos = [
      Math.round(a[0] + (b[0] - a[0]) * k),
      Math.round(a[1] + (b[1] - a[1]) * k)
    ];
    pivot = [20, Math.round(44 + (seatedPivot[1] - 44) * (first ? 0 : k))];
    const tag = tags[s.action ?? "idle"];
    frame = tag.from + Math.min(tag.count - 1, Math.floor(f * tag.count));
    if (s.carrying)
      frame = f < 0.85 ? frameAt("carry-left", local) : tags.coffee.from;
    if (pivot[1] === 44) {
      const direction = s.reverse ? facingBetween(b, a) : facingBetween(a, b);
      frame = frameAt(
        `${s.carrying ? "carry" : "walk"}-${direction}`,
        local
      );
    }
  } else if (s.stage === "sleep" || s.stage === "lie-down") {
    asset = "actor-sleep";
    frame = s.stage === "sleep" ? 3 + Math.floor(local / 380) % 4 : local < 100 ? 0 : local < 200 ? 1 : 2;
    const sleepPivot = scene.stations.sofa.sleepPivot ?? [23, 60];
    pivot = [
      sleepPivot[0],
      sleepPivot[1] + (frame === 0 ? 6 : frame === 1 ? 3 : 0)
    ];
  } else if (s.station && scene.stations[s.station]?.seat && !s.standing) {
    pivot = scene.stations[s.station].pivot ?? pivot;
  }
  if (s.stage === "cheer")
    pivot = [20, 44 + [0, 1, 2, 2, 1, 0][frame - tags.cheer.from]];
  const lift = s.beat && local < s.beat ? beatLift(local / s.beat) : 0;
  if (lift) pivot = [pivot[0], pivot[1] + lift];
  return {
    x: pos[0],
    y: pos[1],
    frame,
    pivot,
    stage: s.stage,
    station: s.station,
    label: s.label,
    bubble: s.bubble,
    asset,
    carrying: !!s.carrying,
    local,
    ...lift ? { lift } : {}
  };
}
var boardStart = [
  { column: 0, row: 0, color: 0, id: 0, seq: 3 },
  { column: 1, row: 0, color: 2, id: 1, seq: 2 },
  { column: 1, row: 1, color: 1, id: 2, seq: 1 },
  { column: 2, row: 0, color: 3, id: 3, seq: 0 }
];
var postAt = (phase, into = 0) => {
  let ms = into * frameDuration("post", phase);
  for (let i = 0; i < phase; i++) ms += frameDuration("post", i);
  return ms;
};
var pressedAt = postAt(3, 2 / 3);
var pointedAt = postAt(6);
var clearMs = Math.round(pressedAt * 0.45);
var slideMs = Math.round(pressedAt * 0.65);
var hopMs = slideMs;
var slot = (c) => ({ column: c.column, row: c.row, color: c.color });
function planPosting(cards) {
  let seq = Math.max(...cards.map((c) => c.seq)) + 1;
  const nextId = Math.max(...cards.map((c) => c.id)) + 1;
  const inColumn = (list, column) => list.filter((c) => c.column === column).sort((a, b) => a.seq - b.seq);
  const freeRow = (list, column) => taskRows.findIndex(
    (_, row) => !list.some((c) => c.column === column && c.row === row)
  );
  let board2 = [...cards];
  const mover = inColumn(board2, 1)[0];
  const removed = mover && freeRow(board2, 2) < 0 ? inColumn(board2, 2)[0] : void 0;
  if (removed) board2 = board2.filter((c) => c !== removed);
  let slid;
  const startRow = freeRow(board2, 1);
  if (freeRow(board2, 0) < 0 && startRow >= 0) {
    const card = inColumn(board2, 0)[0];
    const to = { ...card, column: 1, row: startRow, seq: seq++ };
    slid = { card, to };
    board2 = board2.map((c) => c === card ? to : c);
  }
  const addRow = freeRow(board2, 0);
  const added = addRow < 0 ? void 0 : { column: 0, row: addRow, color: 1, id: nextId, seq: seq++ };
  if (added) board2.push(added);
  let hop;
  const doneRow = freeRow(board2, 2);
  if (mover && doneRow >= 0) {
    const to = { ...mover, column: 2, row: doneRow, seq: seq++ };
    hop = { card: mover, to };
    board2 = board2.map((c) => c === mover ? to : c);
  }
  return {
    removed,
    slid,
    added,
    hop,
    after: board2.sort((a, b) => a.id - b.id)
  };
}
var boardCycle = (() => {
  const seen = /* @__PURE__ */ new Map();
  const postings = [];
  let cards = boardStart;
  for (; ; ) {
    const ages = cards.map((card) => card.seq).sort((a, b) => a - b);
    cards = cards.map((card, id) => ({
      ...card,
      id,
      seq: ages.indexOf(card.seq)
    }));
    const key = JSON.stringify(cards);
    const repeatAt = seen.get(key);
    if (repeatAt !== void 0) return { postings, repeatAt };
    seen.set(key, postings.length);
    const plan = planPosting(cards);
    postings.push({ cards, plan });
    cards = plan.after;
  }
})();
function postingAt(index) {
  const { postings, repeatAt } = boardCycle;
  return postings[index < postings.length ? index : repeatAt + (index - repeatAt) % (postings.length - repeatAt)];
}
function boardNotes(local, index = 0) {
  const board2 = item("task-board");
  const notes = [];
  const at2 = (n) => ({
    note: n,
    x: board2.x + taskColumns[n.column].x + 1,
    y: board2.y + taskRows[n.row] - (n.lift ?? 0)
  });
  const arc = (from2, to, k) => {
    const a = at2(from2), b = at2(to);
    return {
      x: Math.round(a.x + (b.x - a.x) * k),
      y: Math.round(a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 9)
    };
  };
  const { cards, plan } = postingAt(index);
  for (const c of cards) {
    const n = slot(c);
    if (c === plan.removed) {
      if (local >= clearMs) continue;
      notes.push(
        at2({ ...n, lift: Math.round(Math.max(0, local) / clearMs * 6) })
      );
      continue;
    }
    if (c === plan.slid?.card && local >= 0) {
      const k = Math.min(1, local / slideMs);
      notes.push({ note: n, ...arc(n, slot(plan.slid.to), k) });
      continue;
    }
    if (c === plan.hop?.card && local >= pointedAt) {
      const k = Math.min(1, (local - pointedAt) / hopMs);
      notes.push({ note: n, ...arc(n, slot(plan.hop.to), k) });
      continue;
    }
    notes.push(at2(n));
  }
  if (plan.added && local >= pressedAt) notes.push(at2(slot(plan.added)));
  return notes;
}
var chairLayers = /* @__PURE__ */ new Set(["back", "front"]);
function placeOn(segments, t, ms, pendingCount = 0, delivering = false, guests = []) {
  const s = segmentAt(segments, t);
  const pose = poseOn(segments, t), ranked = [];
  const seat = pose.station ? scene.stations[pose.station] : void 0;
  const seated = !s.standing && !!seat?.seat && !["walk", "cheer"].includes(pose.stage) && (pose.stage !== "sit" || pose.pivot[1] === seat.pivot?.[1]);
  const climbing = pose.stage === "sit" && !seated && pose.pivot[1] > 44 && !!seat?.chair;
  const chairDepth = climbing ? Math.max(
    ...scene.items.filter((i) => i.name === seat?.chair).map((i) => i.depth)
  ) + 0.5 : 0;
  const boardLocal = s.posted === void 0 ? -Infinity : t - s.posted;
  for (const i of scene.items) {
    if (i.name === "coffee-table-mug" && s.mugAway) continue;
    const active = i.cycle === "always" || i.cycle === "keyboard" && pose.stage === "type" && i.station === pose.station || i.cycle === "phone" && pose.stage === "phone" || i.cycle === "meeting" && pose.stage === "meeting" || i.cycle === "brew" && pose.stage === "brew";
    let frame = i.asset.endsWith("mug") ? 3 : active ? Math.floor(ms / 250) % 4 : 0;
    if (i.asset === "radio-notes") frame = Math.floor(ms / 160) % 8;
    if (i.cycle === "phone")
      frame = active ? 1 + Math.floor(ms / 250) % 3 : 0;
    if (i.cycle === "display")
      frame = pose.stage === "type" && i.station === pose.station ? 1 + Math.floor(pose.local / 250) % 4 : 0;
    if (i.cycle === "recording")
      frame = pose.stage === "meeting" ? 1 + Math.floor(pose.local / 160) % 8 : 0;
    if (i.cycle === "library-book")
      frame = s.action === "take-book" ? pose.frame >= tags["take-book"].from + 2 ? 2 : 1 : s.action === "read" && s.station === "library" ? 2 : 0;
    let depth = i.depth;
    if (seated && i.name === seat?.chair && i.layer && chairLayers.has(i.layer))
      depth = pose.y + (i.layer === "front" ? 1 : -1);
    if (seated && i.asset.endsWith("cushion") && i.station === pose.station)
      depth = pose.y - 0.5;
    ranked.push({
      depth,
      items: [
        {
          id: i.asset,
          frame,
          layer: i.layer,
          x: i.x,
          y: i.y,
          ...i.decor ? { decor: i.decor } : {}
        }
      ]
    });
  }
  const board2 = item("task-board");
  const notes = boardNotes(boardLocal, s.postIndex ?? 0);
  ranked.push({
    depth: board2.depth + 0.1,
    items: notes.map(({ note, x, y }) => ({
      id: "sticky-note",
      frame: note.color,
      x,
      y
    }))
  });
  const origin = [pose.x - pose.pivot[0], pose.y - pose.pivot[1]];
  const body = [];
  if (!seated && pose.asset === "actor")
    body.push({
      id: "foot-shadow",
      frame: 0,
      x: pose.x - 16,
      y: pose.y - 2,
      actorPart: "shadow"
    });
  const prop = pose.asset === "actor" ? heldPropForFrame(pose.frame) : void 0;
  const placedProp = prop && {
    id: prop.id,
    frame: prop.frame,
    x: origin[0] + prop.x,
    y: origin[1] + prop.y,
    flipX: prop.flipX,
    actorPart: "prop"
  };
  if (pose.stage === "phone") {
    const phone = item("main-phone");
    ranked.push({
      depth: pose.y - 0.5,
      items: [
        {
          id: "phone-cord",
          frame: 0,
          x: phone.x + 27,
          y: phone.y + 26,
          actorPart: "prop"
        }
      ]
    });
  }
  if (placedProp && prop?.behind) body.push(placedProp);
  body.push({
    id: pose.asset,
    frame: pose.frame,
    layer: "base",
    x: origin[0],
    y: origin[1],
    actorPart: "base"
  });
  if ((pose.stage === "sleep" || pose.stage === "lie-down") && pose.frame >= 2)
    body.push({
      id: "sleep-blanket",
      frame: 0,
      x: origin[0] + 9,
      y: origin[1] + 19,
      actorPart: "prop"
    });
  const hands = [];
  if (placedProp && !prop?.behind) hands.push(placedProp);
  hands.push({
    id: pose.asset,
    frame: pose.frame,
    layer: "hands",
    x: origin[0],
    y: origin[1],
    actorPart: "hands"
  });
  if (pose.stage === "coffee" && prop)
    hands.push({
      id: "steam",
      frame: Math.floor(ms / 180) % 6,
      x: origin[0] + prop.x,
      y: origin[1] + prop.y - 19
    });
  const rack = item("handoff-rack-back"), rackFront = item("handoff-rack-front");
  const actorDepth = Math.max(pose.y, chairDepth);
  ranked.push({ depth: actorDepth, items: body });
  ranked.push({
    depth: pose.station === "handoff" ? Math.max(actorDepth, rackFront.depth + 0.5) : actorDepth,
    items: hands
  });
  if (s.brewAt !== void 0) {
    const machine = item("coffee-machine");
    ranked.push({
      depth: machine.depth + 0.5,
      items: [
        {
          id: "mug",
          frame: Math.min(3, Math.floor(Math.max(0, t - s.brewAt) / 700)),
          x: machine.x + coffeeSpout[0] - 1,
          y: machine.y + coffeeSpout[1] - 3
        },
        ...t > s.brewAt + 600 ? [
          {
            id: "steam",
            frame: Math.floor(ms / 180) % 6,
            x: machine.x + coffeeSpout[0] - 1,
            y: machine.y + coffeeSpout[1] - 23
          }
        ] : []
      ]
    });
  }
  const sparkleAt = pointedAt + hopMs;
  if (boardLocal >= sparkleAt && boardLocal < sparkleAt + 500) {
    const done = {
      x: board2.x + taskColumns[2].x + 1,
      y: board2.y + taskRows[0]
    };
    ranked.push({
      depth: board2.depth + 0.2,
      items: [{ id: "sparkle", frame: 0, x: done.x + 2, y: done.y - 10 }]
    });
  }
  if (pose.stage === "cheer")
    ranked.push({
      depth: pose.y + 2,
      items: [
        { id: "sparkle", frame: 0, x: pose.x - 31, y: origin[1] + 5 },
        { id: "sparkle", frame: 0, x: pose.x + 15, y: origin[1] - 3 }
      ]
    });
  const visible = Math.min(5, pendingCount), handing = delivering && (pose.stage === "walk" || pose.stage === "handoff");
  const slot2 = (i) => {
    const local = handoffPaperSlots[i % handoffPaperSlots.length];
    return [
      rack.x + local[0],
      rack.y + local[1] - Math.floor(i / handoffPaperSlots.length)
    ];
  };
  const documents = Array.from(
    { length: Math.max(0, visible - Number(handing)) },
    (_, i) => {
      const [x, y] = slot2(i);
      return { id: "handoff-paper", frame: 0, x, y };
    }
  );
  if (documents.length)
    ranked.push({ depth: rack.depth + 1, items: documents });
  if (handing && visible) {
    const clip = clips.find(
      (c) => pose.frame >= tags[c.name].from && pose.frame < tags[c.name].from + c.count
    );
    const tip = curlTip(
      paperPose(clip.pose, clip.direction, pose.frame - tags[clip.name].from)
    );
    const from2 = [origin[0] + tip[0] - 6, origin[1] + tip[1] - 11], to = slot2(visible - 1);
    const phase = pose.stage === "handoff" ? Math.min(1, Math.max(0, (pose.local - 750) / 1150)) : 0;
    const u = phase * phase * (3 - 2 * phase);
    ranked.push({
      depth: pose.station === "handoff" ? rackFront.depth + 0.25 : actorDepth,
      items: [
        {
          id: "handoff-paper",
          frame: 0,
          x: Math.round(from2[0] + (to[0] - from2[0]) * u),
          y: Math.round(from2[1] + (to[1] - from2[1]) * u),
          actorPart: "prop"
        }
      ]
    });
  }
  ranked.push(...guests);
  ranked.sort((a, b) => a.depth - b.depth);
  return [
    ...ranked.flatMap((r) => r.items),
    { id: "labels", frame: 0, x: 0, y: 0 }
  ];
}

var kindStation = {
  organize: "work",
  research: "library",
  memory: "work",
  code: "code",
  company: "phone",
  meeting: "meeting",
  other: "work"
};

var board = scene.stations.tasks;
if (!board.postApproach) throw new Error("The task board has no post approach");
var tourSpots = {
  // The open floor down and to the left, where Agent says hello (the middle of
  // the room is crowded).
  hello: [150, 400],
  // At the task board Agent talks from the board's right, where it also stands
  // in everyday work, and walks to the front of the todo column to post: its
  // one hand, the curl, cannot reach that column from the right. Both points
  // are the board station's in the scene (Track.postNote).
  tasksRight: board.approach,
  tasksFront: board.postApproach
};
var helloRestMs = 1400;
var talkMs = 1400;
function tourIntro(track, stop) {
  const label = tourLabels[stop];
  if (stop === "hello") {
    track.walkTo(tourSpots.hello, label);
    return;
  }
  if (stop === "tasks") {
    track.walk("tasks", label);
    track.act(talkMs, "idle", "tasks", "idle", label, "");
    track.postNote(label, label, "");
    return;
  }
  track.walk(stop, label);
  if (stop === "library")
    track.act(
      cycleDuration("take-book"),
      "read",
      "library",
      "take-book",
      label,
      "",
      { backwards: true }
    );
  if (stop === "meeting" || stop === "work") track.enter(stop);
}
function tourHold(track, stop) {
  const label = tourLabels[stop];
  if (stop === "hello") {
    track.add(cycleDuration("wave"), {
      stage: "idle",
      action: "wave",
      label,
      bubble: "",
      end: track.position
    });
    track.add(helloRestMs, {
      stage: "idle",
      action: "idle",
      label,
      bubble: "",
      end: track.position
    });
    return;
  }
  const act = holds2[stop];
  track.act(act.ms, act.stage, stop, act.action, label, "");
}
var holds2 = {
  library: { ms: 2400, stage: "idle", action: "idle" },
  meeting: { ms: 3600, stage: "meeting", action: "type" },
  tasks: { ms: 2400, stage: "idle", action: "idle" },
  work: { ms: 3600, stage: "type", action: "type" },
  phone: { ms: 3600, stage: "phone", action: "phone" },
  code: { ms: 3600, stage: "type", action: "stand-type" }
};
var tourLabels = {
  hello: "\u5728\u7A7A\u5730\u4E0A\u8DDF\u4F60\u6253\u62DB\u547C",
  library: "\u5E26\u4F60\u770B\u4E2A\u4EBA\u56FE\u4E66\u9986",
  meeting: "\u5E26\u4F60\u770B\u4F1A\u8BAE\u684C",
  tasks: "\u5E26\u4F60\u770B\u4EFB\u52A1\u677F",
  work: "\u5E26\u4F60\u770B\u5DE5\u4F5C\u684C",
  phone: "\u5E26\u4F60\u770B\u7535\u8BDD",
  code: "\u5E26\u4F60\u770B\u5199\u4EE3\u7801\u7684\u684C\u5B50"
};

var needsUserAction = "idle";
var boardLook = "idle";
var directorConfig = {
  // One planned stretch at a station by the shown group's importance. While
  // the work runs the next stretch carries on seamlessly; this only sets how
  // often Agent looks again at what else is going on.
  dwellMs: { low: 2500, normal: 3500, high: 5e3 },
  // A visit whose activity disappears still lasts this long once arrived.
  minDwellMs: 2500,
  // Progress on other work draws Agent over once it has been here this long.
  newsDwellMs: 5e3,
  // Without progress anywhere, parallel work takes turns this long.
  rotateMs: 9e3,
  // A task reported as another known kind moves Agent only once the new kind
  // has held this long: a quick file read while coding stays at the desk.
  kindSettleMs: 3e3,
  // A step of the work Agent is doing shows as a small lift on the spot, at
  // most once per gap; steps in between merge into the next one.
  beatMs: 360,
  beatGapMs: 2e3,
  // After putting the files down Agent lingers this long, then goes back to
  // work or rest; the stack and its count stay on the desk.
  needsUserDwellMs: 1500,
  needsUserAction,
  // Kinds that take part in the rotation at once.
  rotationSize: 3,
  // With nothing to do Agent sits at the computer: that is what someone
  // opening the office should mostly find, rather than Agent asleep.
  // One stretch there, carried on seamlessly while idle lasts.
  deskMs: 6e3,
  // A tea break only after this long at the desk with nothing to do, then
  // back to the desk; breaks stay occasional however long the quiet lasts.
  breakAfterMs: 10 * 6e4,
  restMs: 8e3,
  napMs: 6e3,
  // Continuous confirmed idle before a break ends in a nap instead of going
  // back to the desk: only a really long quiet stretch puts Agent to sleep.
  napAfterMs: 40 * 6e4,
  // Standing wait while observation is partial or unavailable.
  holdMs: 6e3,
  resultMs: 1800,
  // Frame gaps longer than this restart the plan at the late frame.
  catchUpLimitMs: 3e4,
  // Scoring: higher wins. Distance is in pixels / distanceScale.
  weights: { unseen: 3, changed: 1, importance: 1, distance: 0.5 },
  unseenCapMs: 6e4,
  distanceScale: 400
};
var plays = {
  organize: { walk: "\u56DE\u5DE5\u4F5C\u684C\u6574\u7406\u8D44\u6599", bubble: "\u628A\u8981\u70B9\u6574\u7406\u6E05\u695A" },
  research: { walk: "\u53BB\u4E2A\u4EBA\u56FE\u4E66\u9986\u67E5\u8D44\u6599", bubble: "\u6211\u53BB\u67E5\u4E00\u4E0B\u8D44\u6599" },
  memory: { walk: "\u56DE\u5DE5\u4F5C\u684C\u6574\u7406\u8BB0\u5FC6", bubble: "\u628A\u8FD9\u6761\u6574\u7406\u6E05\u695A" },
  code: { walk: "\u53BB\u770B\u770B\u4EE3\u7801\u7684\u8FDB\u5EA6", bubble: "\u770B\u770B\u4EE3\u7801\u505A\u5230\u54EA\u4E86" },
  company: { walk: "\u53BB\u7535\u8BDD\u90A3\u8FB9\u95EE\u95EE\u516C\u53F8", bubble: "\u6211\u6765\u95EE\u95EE\u516C\u53F8\u90A3\u8FB9" },
  meeting: { walk: "\u53BB\u4F1A\u8BAE\u684C\u8BB0\u5F55", bubble: "\u6211\u5728\u542C\uFF0C\u4E5F\u5728\u8BA4\u771F\u8BB0\u5F55" },
  other: { walk: "\u56DE\u5DE5\u4F5C\u684C\u770B\u770B", bubble: "\u6211\u770B\u4E00\u4E0B" }
};
var stationActs = {
  code: { stage: "type", action: "stand-type" },
  work: { stage: "type", action: "type" },
  library: { stage: "read", action: "read" },
  phone: { stage: "phone", action: "phone" },
  meeting: { stage: "meeting", action: "type" }
};
var importanceRank = { low: 0, normal: 1, high: 2 };
var kindOrder = [
  "meeting",
  "code",
  "company",
  "research",
  "memory",
  "organize",
  "other"
];
var same = (a, b) => a[0] === b[0] && a[1] === b[1];
var time = (iso) => Date.parse(iso);
function atRest(action, phase) {
  if (action === "wave") return phase === tags.wave.count - 1;
  const clip = clips.find((c) => c.name === action);
  if (!clip) return true;
  const rest = paperPose(clip.pose, clip.direction, 0), here = paperPose(clip.pose, clip.direction, phase);
  return Math.abs(here.dx - rest.dx) <= 1 && Math.abs(here.dy - rest.dy) <= 1;
}
var byPriority = (a, b) => importanceRank[b.importance] - importanceRank[a.importance] || time(b.updatedAt) - time(a.updatedAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
function createDirector(options = {}) {
  const cfg = { ...directorConfig, ...options.config };
  const startPoint = scene.stations[options.start ?? "work"].approach;
  const track = createTrack(startPoint, 0);
  let started = false, state, lastNow = -Infinity, perf, idleSince, deskSince, beatAt = -Infinity, tourStop;
  let result;
  let seenLogs = /* @__PURE__ */ new Set();
  const delivered = /* @__PURE__ */ new Set();
  const posted = /* @__PURE__ */ new Set();
  const shownAt = /* @__PURE__ */ new Map(), shownUpdate = /* @__PURE__ */ new Map();
  const kinds = /* @__PURE__ */ new Map();
  const segments = () => track.segments;
  const lastSegment = () => segments().at(-1);
  function seatedAt() {
    const s = lastSegment();
    if (!s || s.stage === "walk" || s.standing || !s.station) return void 0;
    const seat = scene.stations[s.station].seat;
    return seat && same(s.end, seat) ? s.station : void 0;
  }
  function standingAt(station) {
    const s = lastSegment();
    return !!s && s.stage !== "walk" && s.station === station && !seatedAt() && same(track.position, scene.stations[station].approach);
  }
  function standAct(ms, stage, station, action, label, bubble, phases) {
    const t = track;
    t.add(ms, {
      stage,
      station,
      action,
      label,
      bubble,
      end: t.position,
      standing: true,
      ...phases ? { phases } : {}
    });
  }
  function rise() {
    const last = lastSegment();
    if (last?.stage === "sleep" || last?.stage === "lie-down") wake();
    const here = seatedAt();
    if (here) track.leave(here);
  }
  function activities(phase) {
    return (state?.activities ?? []).filter((a) => a.phase === phase);
  }
  const waitingCompany = () => activities("waiting").find((a) => a.kind === "company");
  function undelivered(list = state?.activities ?? []) {
    return list.filter((a) => a.phase === "needs-user" && !delivered.has(a.id));
  }
  function busy(list = state?.activities ?? []) {
    return list.some((a) => a.phase !== "needs-user" || !delivered.has(a.id));
  }
  const kindOf = (a) => kinds.get(a.id)?.kind ?? a.kind;
  function noteKinds(list, now) {
    const live = new Set(list.map((a) => a.id));
    for (const id of kinds.keys()) if (!live.has(id)) kinds.delete(id);
    for (const a of list) {
      const known = kinds.get(a.id);
      if (!known || known.kind === "other") kinds.set(a.id, { kind: a.kind });
      else if (a.kind === known.kind) delete known.next;
      else if (known.next?.kind !== a.kind)
        known.next = { kind: a.kind, at: now };
    }
  }
  function settleKinds(now) {
    let changed = false;
    for (const known of kinds.values())
      if (known.next && now - known.next.at >= cfg.kindSettleMs) {
        known.kind = known.next.kind;
        delete known.next;
        changed = true;
      }
    return changed;
  }
  function groups() {
    const map = /* @__PURE__ */ new Map();
    for (const a of activities("working"))
      map.set(kindOf(a), [...map.get(kindOf(a)) ?? [], a]);
    return [...map].map(([kind, list]) => {
      const members = [...list].sort(byPriority);
      return {
        kind,
        station: kindStation[kind],
        members,
        importance: members[0].importance,
        updatedAt: Math.max(...members.map((m) => time(m.updatedAt))),
        startedAt: Math.min(...members.map((m) => time(m.startedAt)))
      };
    });
  }
  function rotationGroups() {
    return groups().sort(
      (a, b) => importanceRank[b.importance] - importanceRank[a.importance] || b.updatedAt - a.updatedAt || kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind)
    ).slice(0, cfg.rotationSize);
  }
  function visiting(list) {
    return perf?.type === "activity" ? list.find((g) => g.kind === perf?.kind) : void 0;
  }
  function hasNews(g) {
    const base = perf?.base;
    if (!base) return false;
    return g.updatedAt > base.updatedAt || g.members.some((m) => !base.ids.has(m.id));
  }
  function stepDue(g) {
    return g.updatedAt > (shownUpdate.get(g.kind) ?? -Infinity);
  }
  function choose(at2) {
    if (tourStop) return { type: "tour", stop: tourStop };
    if (!state || state.availability === "unavailable") {
      idleSince = void 0;
      return { type: "hold" };
    }
    const fresh = undelivered().sort(byPriority);
    if (fresh.length) {
      idleSince = void 0;
      return { type: "needs-user", activity: fresh[0] };
    }
    if (result) return { type: "result", entry: result };
    const waiting = waitingCompany();
    if (waiting) {
      idleSince = void 0;
      return { type: "waiting", activity: waiting };
    }
    const rotation = rotationGroups();
    if (rotation.length) {
      const current = visiting(rotation);
      let pool = rotation;
      if (current && perf) {
        const here2 = at2 - perf.arriveAt, others = rotation.filter((g) => g !== current), news = others.filter((g) => hasNews(g));
        if (news.length && here2 >= cfg.newsDwellMs) pool = news;
        else if (others.length && here2 >= cfg.rotateMs) pool = others;
        else {
          idleSince = void 0;
          return { type: "activity", group: current };
        }
      }
      const w = cfg.weights, here = track.position;
      const score = (g) => {
        const seen = shownAt.get(g.kind);
        const unseen = Math.min(
          seen === void 0 ? cfg.unseenCapMs : at2 - seen,
          cfg.unseenCapMs
        ) / cfg.unseenCapMs;
        const changed = seen === void 0 || g.updatedAt > (shownUpdate.get(g.kind) ?? 0) ? 1 : 0;
        const [x, y] = scene.stations[g.station].approach;
        const distance2 = Math.hypot(x - here[0], y - here[1]) / cfg.distanceScale;
        return w.unseen * unseen + w.changed * changed + w.importance * importanceRank[g.importance] - w.distance * distance2;
      };
      const latest = Math.max(
        ...pool.map((g) => shownAt.get(g.kind) ?? -Infinity)
      ), turn = pool.length > 1 ? pool.filter((g) => shownAt.get(g.kind) !== latest) : pool;
      let best = turn[0];
      for (const g of turn.slice(1)) if (score(g) > score(best)) best = g;
      idleSince = void 0;
      return { type: "activity", group: best };
    }
    if (activities("waiting").length) {
      idleSince = void 0;
      return { type: "idle", nap: false };
    }
    if (state.availability !== "ready") {
      idleSince = void 0;
      return { type: "hold" };
    }
    idleSince ??= at2;
    return { type: "idle", nap: at2 - idleSince >= cfg.napAfterMs };
  }
  function build(pick) {
    const t = track;
    if (pick.type === "tour") {
      const stop = pick.stop;
      if (perf?.type === "tour" && perf.stop === stop) {
        const reachAt3 = t.cursor;
        tourHold(t, stop);
        return {
          type: "tour",
          stop,
          reachAt: perf.reachAt,
          arriveAt: perf.arriveAt || reachAt3
        };
      }
      rise();
      const leaveAt = t.cursor;
      tourIntro(t, stop);
      const reachAt2 = t.cursor;
      if (reachAt2 === leaveAt) tourHold(t, stop);
      return { type: "tour", stop, reachAt: reachAt2, arriveAt: reachAt2 };
    }
    if (pick.type === "needs-user") {
      const a = pick.activity, station = "handoff";
      const delivers = undelivered().map((n) => n.id);
      rise();
      t.walk(station, "\u628A\u9700\u8981\u4F60\u786E\u8BA4\u7684\u6587\u4EF6\u9001\u5230\u4EA4\u63A5\u53F0");
      const reachAt2 = t.cursor;
      standAct(
        1900,
        "handoff",
        station,
        cfg.needsUserAction,
        a.summary,
        "\u8FD9\u4EFD\u6587\u4EF6\uFF0C\u4EA4\u7ED9\u4F60\u51B3\u5B9A"
      );
      const deliveredAt = t.cursor;
      standAct(
        cfg.needsUserDwellMs,
        "idle",
        station,
        cfg.needsUserAction,
        a.summary,
        "\u6587\u4EF6\u653E\u597D\u4E86\uFF0C\u7B49\u4F60\u786E\u8BA4"
      );
      for (const id of delivers) delivered.add(id);
      return {
        type: "needs-user",
        activityId: a.id,
        reachAt: reachAt2,
        arriveAt: reachAt2,
        delivers,
        deliveredAt
      };
    }
    if (pick.type === "waiting") {
      if (!standingAt("phone")) {
        rise();
        t.walk("phone", "\u53BB\u7535\u8BDD\u90A3\u8FB9\u7B49\u516C\u53F8\u56DE\u590D");
      }
      const reachAt2 = t.cursor;
      const cycle = cycleDuration("phone");
      standAct(
        Math.ceil(cfg.dwellMs.normal / cycle) * cycle,
        "phone",
        "phone",
        "phone",
        pick.activity.summary,
        ""
      );
      return {
        type: "waiting",
        activityId: pick.activity.id,
        reachAt: reachAt2,
        arriveAt: reachAt2
      };
    }
    if (pick.type === "result") {
      result = void 0;
      rise();
      const success = pick.entry.outcome === "done";
      if (success && pick.entry.kind === "memory") {
        t.walk("library", "\u628A\u6574\u7406\u597D\u7684\u8D44\u6599\u9001\u56DE\u4E66\u67B6");
        t.act(
          cycleDuration("take-book"),
          "read",
          "library",
          "take-book",
          pick.entry.summary,
          "\u8FD9\u6761\u6211\u8BB0\u4E0B\u4E86",
          { backwards: true }
        );
      }
      const reachAt2 = t.cursor;
      const station = lastSegment()?.station ?? "work";
      standAct(
        cfg.resultMs,
        success ? "cheer" : "idle",
        station,
        success ? "cheer" : "think",
        success ? "\u4EFB\u52A1\u5DF2\u5B8C\u6210" : "\u4EFB\u52A1\u672A\u80FD\u5B8C\u6210",
        ""
      );
      return { type: "result", reachAt: reachAt2, arriveAt: reachAt2 };
    }
    if (pick.type === "activity") {
      const g = pick.group, station = g.station, rep = g.members[0], play = plays[g.kind], act = stationActs[station] ?? { stage: "idle", action: "idle" };
      const seat = !!scene.stations[station].seat;
      const post = g.kind === "organize" && g.members.some((m) => !posted.has(m.id));
      const ongoing = perf?.type === "activity" && perf.kind === g.kind && !post && (seat ? seatedAt() === station : standingAt(station) && lastSegment()?.stage === act.stage) ? perf : void 0;
      const continuing = ongoing !== void 0;
      const seatedHere = !continuing && !post && station !== "library" && seat && seatedAt() === station;
      let reachAt2 = t.cursor;
      if (!continuing && !seatedHere) {
        rise();
        if (post) {
          for (const m of g.members) posted.add(m.id);
          reachAt2 = t.postNote("\u628A\u65B0\u4EFB\u52A1\u8D34\u5230\u770B\u677F\u4E0A", rep.summary, "\u65B0\u4EFB\u52A1\u8D34\u4E0A");
          t.act(600, "idle", "tasks", boardLook, rep.summary, "\u55EF\uFF0C\u6E05\u695A\u591A\u4E86");
          t.walk(station, play.walk);
        } else {
          t.walk(station, play.walk);
          reachAt2 = t.cursor;
        }
        if (seat && station !== "library") t.enter(station);
      }
      let arriveAt = ongoing ? ongoing.arriveAt : t.cursor;
      const dwell = cfg.dwellMs[g.importance];
      const shown = {
        key: g.kind,
        at: shownAt.get(g.kind),
        update: shownUpdate.get(g.kind)
      };
      const beat = continuing && stepDue(g) && t.cursor - beatAt >= cfg.beatGapMs;
      if (beat) beatAt = t.cursor;
      if (!continuing || beat) shownUpdate.set(g.kind, g.updatedAt);
      if (continuing)
        perform(
          Math.max(100, Math.min(dwell, reconsiderAt(g, arriveAt) - t.cursor)),
          act.stage,
          station,
          act.action,
          rep.summary,
          play.bubble,
          beat
        );
      else if (station === "library") {
        const take = cycleDuration("take-book");
        t.act(take, "read", "library", "take-book", rep.summary, play.bubble);
        t.enter("library");
        reachAt2 = t.cursor;
        arriveAt = t.cursor;
        t.act(
          Math.max(cfg.minDwellMs, dwell - take),
          "read",
          "library",
          "read",
          rep.summary,
          play.bubble
        );
      } else if (seatedHere)
        perform(
          dwell,
          act.stage,
          station,
          act.action,
          rep.summary,
          play.bubble,
          false
        );
      else
        t.act(dwell, act.stage, station, act.action, rep.summary, play.bubble);
      shownAt.set(g.kind, t.cursor);
      const working = activities("working");
      return {
        type: "activity",
        kind: g.kind,
        reachAt: reachAt2,
        arriveAt,
        shown,
        base: ongoing?.base ?? {
          ids: new Set(working.map((a) => a.id)),
          updatedAt: Math.max(...working.map((a) => time(a.updatedAt)))
        }
      };
    }
    if (pick.type === "idle") {
      const previous = perf?.type === "idle" ? perf.idle : void 0;
      const owed = perf?.type === "idle" ? perf.owed : void 0;
      if (previous !== "desk") deskSince = void 0;
      let step = owed ? owed : previous === "coffee" ? "rest" : previous === "rest" || previous === "nap" ? pick.nap ? "nap" : "desk" : t.cursor - (deskSince ?? t.cursor) >= cfg.breakAfterMs || cfg.breakAfterMs <= 0 ? "coffee" : "desk";
      if ((step === "rest" || step === "nap") && seatedAt() !== "sofa")
        step = "desk";
      const interlude = idleSince === void 0 || state?.activities.length ? void 0 : options.interludes?.cue({
        at: t.cursor,
        window: idleSince,
        next: step,
        seated: seatedAt()
      });
      if (interlude) {
        const from2 = t.cursor, idle = interlude.play(t);
        if (t.cursor > from2)
          return {
            type: "idle",
            idle,
            interlude: true,
            owed: idle === void 0 ? step : void 0,
            reachAt: from2,
            arriveAt: from2
          };
      }
      const reachAt2 = t.cursor;
      if (step === "desk") {
        const seated = seatedAt() === "work";
        if (!seated) {
          rise();
          t.walk("work", "\u56DE\u7535\u8111\u524D\u5750\u5750");
          t.enter("work");
        }
        const arriveAt = seated ? reachAt2 : t.cursor;
        deskSince ??= arriveAt;
        perform(cfg.deskMs, "type", "work", "type", "\u5728\u7535\u8111\u524D\u770B\u770B", "", false);
        return { type: "idle", idle: step, reachAt: arriveAt, arriveAt };
      }
      if (step === "coffee") {
        rise();
        t.walk("coffee", "\u53BB\u6CE1\u4E00\u676F\u5496\u5561");
        const arriveAt = t.cursor;
        t.brewAt = t.cursor + cycleDuration("operate");
        t.act(
          cycleDuration("operate"),
          "operate",
          "coffee",
          "operate",
          "\u6309\u4E0B\u5496\u5561\u673A\u5F00\u5173",
          "\u6309\u4E00\u4E0B\u5F00\u5173"
        );
        t.mugAway = true;
        t.act(2800, "brew", "coffee", "watch", "\u7B49\u5496\u5561\u6162\u6162\u6EF4\u597D", "\u9999\u5473\u51FA\u6765\u4E86");
        t.brewAt = void 0;
        t.act(
          cycleDuration("pickup"),
          "pickup",
          "coffee",
          "pickup",
          "\u62FF\u8D77\u70ED\u5496\u5561",
          "\u5C0F\u5FC3\uFF0C\u6709\u70B9\u70EB"
        );
        t.walk("sofa", "\u7AEF\u7740\u5496\u5561\u53BB\u4F11\u606F", true);
        t.enter("sofa");
        t.act(
          4e3,
          "coffee",
          "sofa",
          "coffee",
          "\u6C99\u53D1\u4E0A\u559D\u5496\u5561",
          "\u559D\u4E00\u53E3\uFF0C\u7EE7\u7EED\u52A0\u6CB9"
        );
        t.mugAway = false;
        return { type: "idle", idle: step, reachAt: arriveAt, arriveAt };
      }
      const asleep = lastSegment();
      if (step === "rest") {
        if (asleep?.stage === "sleep" || asleep?.stage === "lie-down") wake();
        t.act(cfg.restMs, "idle", "sofa", "rest", "\u4F11\u606F\u7247\u523B", "\u8BA9\u6211\u5145\u5145\u7535");
      } else if (asleep?.stage === "sleep" && asleep.to === t.cursor) {
        asleep.to += cfg.napMs;
        t.cursor = asleep.to;
      } else {
        t.add(300, {
          stage: "lie-down",
          station: "sofa",
          label: "\u4FA7\u8EAB\u8EBA\u597D\uFF0C\u76D6\u4E0A\u5C0F\u6BEF\u5B50",
          bubble: "\u9760\u7740\u6795\u5934\u4F11\u606F\u4E00\u4E0B",
          end: t.position
        });
        t.add(cfg.napMs, {
          stage: "sleep",
          station: "sofa",
          label: "\u5728\u6C99\u53D1\u4E0A\u6253\u4E2A\u76F9",
          bubble: "Z z z \u2026",
          end: t.position
        });
      }
      return { type: "idle", idle: step, reachAt: reachAt2, arriveAt: reachAt2 };
    }
    const label = state?.availability === "unavailable" ? "\u8FDE\u63A5\u4E2D\u65AD\uFF0C\u7B49\u5F85\u6062\u590D" : state ? "\u90E8\u5206\u72B6\u6001\u6682\u65F6\u770B\u4E0D\u5230" : "\u6B63\u5728\u8FDE\u63A5";
    if (!standingAt("work")) {
      rise();
      t.walk("work", label);
    }
    const reachAt = t.cursor;
    standAct(cfg.holdMs, "idle", "work", "idle", label, "");
    return { type: "hold", reachAt, arriveAt: reachAt };
  }
  function perform(ms, stage, station, action, label, bubble, beat) {
    const s = lastSegment();
    if (!beat && s && s.to === track.cursor && s.stage === stage && s.action === action && s.station === station && !s.backwards && !s.phases) {
      s.to += Math.round(ms);
      s.label = label;
      s.bubble = bubble;
      track.cursor = s.to;
      return;
    }
    track.act(ms, stage, station, action, label, bubble, {
      ...beat ? { beat: cfg.beatMs } : {}
    });
  }
  function wake() {
    track.act(
      700,
      "stretch",
      "sofa",
      "stretch",
      "\u9192\u6765\u4F38\u4E2A\u61D2\u8170",
      "\u547C\uFF0C\u7CBE\u795E\u56DE\u6765\u4E86"
    );
  }
  function cutWalk(s, at2) {
    const path = s.path;
    if (!path) throw new Error("Walking segment has no route");
    const fraction = (at2 - s.from) / (s.to - s.from), travelled = pathLength(path) * fraction;
    const sub = [path[0]];
    let walked = 0, corner;
    for (let k = 1; k < path.length; k++) {
      const d = Math.hypot(
        path[k][0] - path[k - 1][0],
        path[k][1] - path[k - 1][1]
      );
      if (walked + d > travelled) {
        corner = path[k];
        break;
      }
      sub.push(path[k]);
      walked += d;
    }
    const point = pointOnPath(path, fraction).point;
    if (!corner || canWalk(point, scene)) {
      if (!same(point, sub[sub.length - 1])) sub.push(point);
      s.to = at2;
    } else {
      sub.push(corner);
      s.to = s.from + Math.round(pathLength(sub) / walkSpeed * 1e3);
    }
    s.path = sub;
    s.end = sub[sub.length - 1];
  }
  function cut(at2) {
    const t = track, list = t.segments, i = list.findIndex((s2) => at2 < s2.to);
    if (i < 0) return;
    const s = list[i];
    t.brewAt = void 0;
    t.mugAway = false;
    if (at2 <= s.from) {
      list.splice(i);
      t.cursor = s.from;
      t.position = s.start;
      return;
    }
    list.splice(i + 1);
    if (s.stage === "walk") {
      cutWalk(s, at2);
      t.cursor = s.to;
      t.position = s.end;
      return;
    }
    if (s.stage === "sit" && !s.reverse && s.station) {
      const [a, b] = s.span ?? [0, 1], f = a + (b - a) * (at2 - s.from) / (s.to - s.from);
      s.span = [a, f];
      s.to = at2;
      s.end = s.start;
      t.cursor = at2;
      t.position = s.start;
      if (f * seatDuration(s.station) >= 1) t.leave(s.station, f);
      return;
    }
    if (s.stage === "sit") {
      t.cursor = s.to;
      t.position = s.end;
      return;
    }
    s.to = at2;
    t.cursor = at2;
    t.position = s.end;
    if (s.stage === "sleep" || s.stage === "lie-down") wake();
  }
  function endVisit(at2) {
    if (perf?.delivers && at2 < (perf.deliveredAt ?? Infinity))
      for (const id of perf.delivers) delivered.delete(id);
    if (perf?.interlude) options.interludes?.yield(at2);
    cut(at2);
    const shown = perf?.shown;
    if (!perf || !shown) return;
    if (at2 < perf.arriveAt) {
      if (shown.at === void 0) shownAt.delete(shown.key);
      else shownAt.set(shown.key, shown.at);
      if (shown.update === void 0) shownUpdate.delete(shown.key);
      else shownUpdate.set(shown.key, shown.update);
    } else shownAt.set(shown.key, Math.min(shownAt.get(shown.key) ?? at2, at2));
  }
  function ensurePlan(now) {
    const t = track;
    if (!started) {
      started = true;
      t.cursor = now;
    }
    if (t.cursor < now - cfg.catchUpLimitMs) {
      t.cursor = now;
      t.brewAt = void 0;
      t.mugAway = false;
    }
    for (let guard = 0; t.cursor <= now; guard++) {
      if (guard > 64) throw new Error("Director plan does not advance");
      perf = build(choose(t.cursor));
    }
  }
  function wantsWork() {
    return rotationGroups().length > 0 || waitingCompany() !== void 0;
  }
  function reconsiderAt(g, arriveAt) {
    const others = rotationGroups().filter((x) => x.kind !== g.kind);
    let at2 = others.some(hasNews) ? arriveAt + cfg.newsDwellMs : others.length ? arriveAt + cfg.rotateMs : Infinity;
    if (stepDue(g)) at2 = Math.min(at2, beatAt + cfg.beatGapMs);
    return at2;
  }
  function review(now) {
    const current = perf;
    if (!current) return;
    if (tourStop || current.type === "tour") {
      ensurePlan(now);
      return;
    }
    const needs = activities("needs-user");
    const fresh = undelivered();
    const settle = (at2 = now) => endVisit(settleAt(at2));
    if (state?.availability === "unavailable") {
      result = void 0;
      if (current.type !== "hold") settle();
    } else if (current.type === "waiting") {
      if (fresh.length || result || !activities("waiting").some((a) => a.id === current.activityId))
        settle();
    } else if (current.type === "result") {
      if (fresh.length || activities("working").length || result?.outcome === "failed")
        settle();
    } else if (result && !fresh.length) {
      settle();
    } else if (current.type === "hold") {
      if (state?.availability === "ready" || state?.activities.length)
        endVisit(now);
    } else if (current.type === "needs-user") {
      if (!needs.some((a) => a.id === current.activityId)) settle();
    } else if (fresh.length) settle();
    else if (current.type === "activity" && waitingCompany()) settle();
    else if (current.type === "activity" && current.kind) {
      const g = rotationGroups().find((x) => x.kind === current.kind);
      if (!g)
        settle(
          now < current.arriveAt ? now : Math.max(now, current.arriveAt + cfg.minDwellMs)
        );
      else if (now >= current.arriveAt) {
        const due = reconsiderAt(g, current.arriveAt);
        if (due < track.cursor) settle(Math.max(now, due));
      }
    } else if (current.type === "idle" && (current.interlude ? busy() || state?.availability !== "ready" : wantsWork() || current.idle === "nap" && (state?.availability !== "ready" || busy())))
      settle();
    ensurePlan(now);
  }
  function settleAt(at2) {
    const s = track.segments.find((x) => at2 < x.to);
    if (!s || !s.action || ["walk", "sit", "sleep", "lie-down"].includes(s.stage))
      return at2;
    const action = s.action, count = tags[action].count;
    const [first, last] = s.phases ?? [0, count - 1];
    let cycle = 0;
    for (let i = first; i <= last; i++) cycle += frameDuration(action, i);
    if (cycle <= 0) return at2;
    let edge = s.from + Math.floor(Math.max(0, at2 - s.from) / cycle) * cycle;
    for (let i = first; i <= last; i++) {
      edge += frameDuration(action, i);
      if (edge >= at2 && atRest(action, s.backwards ? count - 1 - i : i)) break;
    }
    return Math.min(s.to, edge);
  }
  function focus(now, stage) {
    const current = perf;
    if (!current || stage === "walk" || now < current.reachAt) return void 0;
    if (current.type === "waiting")
      return activities("waiting").some((a) => a.id === current.activityId) ? current.activityId : void 0;
    if (current.type === "needs-user")
      return activities("needs-user").some((a) => a.id === current.activityId) ? current.activityId : void 0;
    if (current.type === "activity")
      return activities("working").filter((a) => kindOf(a) === current.kind).sort(byPriority)[0]?.id;
    return void 0;
  }
  return {
    accept(next, nowMs) {
      const now = Math.max(nowMs, lastNow);
      lastNow = now;
      ensurePlan(now);
      if (state && next.generation === state.generation && next.revision <= state.revision)
        return;
      const newGeneration = !state || next.generation !== state.generation;
      if (newGeneration) {
        shownAt.clear();
        shownUpdate.clear();
        result = void 0;
        delivered.clear();
        kinds.clear();
      } else {
        const fresh = next.recent.filter(
          (entry) => !seenLogs.has(entry.id) && (entry.outcome === "done" || entry.outcome === "failed") && time(entry.at) >= time(state.observedAt)
        ).sort((a, b) => time(b.at) - time(a.at) || a.id.localeCompare(b.id));
        result = fresh[0] ?? result;
      }
      for (const id of delivered)
        if (!next.activities.some((a) => a.id === id && a.phase === "needs-user"))
          delivered.delete(id);
      for (const id of posted)
        if (!next.activities.some((a) => a.id === id)) posted.delete(id);
      noteKinds(next.activities, now);
      seenLogs = new Set(next.recent.map((entry) => entry.id));
      if (next.availability === "unavailable" || undelivered(next.activities).length)
        result = void 0;
      if (busy(next.activities)) idleSince = void 0;
      if (busy(next.activities) || next.availability !== "ready")
        options.interludes?.yield(now);
      state = next;
      review(now);
    },
    frameAt(nowMs) {
      const now = Math.max(nowMs, lastNow);
      lastNow = now;
      if (settleKinds(now)) review(now);
      else ensurePlan(now);
      const list = segments();
      while (list.length > 1 && list[0].to < now - 1e3) list.shift();
      const pose = poseOn(list, now);
      const placed = placeOn(
        list,
        now,
        now,
        activities("needs-user").length,
        perf?.type === "needs-user",
        options.interludes?.at(now)
      );
      const talk = options.interludes?.talk?.(now, pose) ?? [];
      const heading = pose.stage === "walk" ? list.find((s) => s.from >= now && s.stage !== "walk" && s.station)?.station : void 0;
      return {
        ...talk.length ? { talk } : {},
        pose,
        placed: options.interludes?.dress?.(placed, now) ?? placed,
        pendingUserCount: activities("needs-user").length,
        activeStation: pose.stage === "walk" ? void 0 : pose.station,
        ...heading ? { heading } : {},
        focusActivityId: focus(now, pose.stage),
        availability: state?.availability ?? "unavailable",
        ...perf?.type === "tour" && perf.stop ? { tourStop: perf.stop } : {}
      };
    },
    tour(stop, nowMs) {
      const now = Math.max(nowMs, lastNow);
      lastNow = now;
      ensurePlan(now);
      const next = stop ?? void 0;
      if (next === tourStop) return;
      tourStop = next;
      if (next) options.interludes?.yield(now);
      endVisit(settleAt(now));
      ensurePlan(now);
    }
  };
}

var dayMs = 864e5;
function localDay(date) {
  return Math.round(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / dayMs
  );
}

var set = (family, stories) => stories.map(([id, title, description], variation) => ({
  id,
  title,
  description,
  family,
  variation
}));
var environmentStories = [
  ...set("nest", [
    [
      "nest",
      "\u4E00\u6839\u8349\uFF0C\u4E00\u6839\u8349\u5730\u5B89\u5BB6",
      "\u5C0F\u9E1F\u8854\u7740\u7EC6\u8349\u98DE\u6765\uFF0C\u5728\u771F\u5B9E\u679D\u6748\u6216\u6A90\u89D2\u6DFB\u4E0A\u4E00\u4E2A\u9E1F\u7A9D\uFF0C\u8E29\u4E00\u8E29\uFF0C\u518D\u51FA\u53BB\u627E\u4E0B\u4E00\u6839\u3002"
    ],
    [
      "breakfast-at-home",
      "\u4ECA\u5929\u8F6E\u5230\u8C01\u5403\u65E9\u996D",
      "\u4EB2\u9E1F\u843D\u56DE\u7A9D\u6CBF\uFF0C\u51E0\u9897\u5C0F\u8111\u888B\u4F9D\u6B21\u63A2\u51FA\u6765\uFF0C\u6700\u540E\u4E00\u53EA\u8FD8\u591A\u7B49\u4E86\u4E00\u4F1A\u513F\u3002"
    ],
    [
      "first-hatch",
      "\u9E1F\u7A9D\u91CC\u591A\u4E86\u4E00\u9897\u5C0F\u8111\u888B",
      "\u7A9D\u91CC\u7684\u86CB\u58F3\u8F7B\u8F7B\u52A8\u4E86\u52A8\uFF0C\u96CF\u9E1F\u63A2\u5934\uFF0C\u4EB2\u9E1F\u632A\u5230\u65C1\u8FB9\u66FF\u5B83\u6321\u98CE\u3002"
    ],
    [
      "nest-in-the-wind",
      "\u628A\u5BB6\u91CD\u65B0\u7406\u4E00\u7406",
      "\u4E00\u5C0F\u64AE\u8349\u88AB\u98CE\u5439\u7FD8\u4E86\uFF0C\u4EB2\u9E1F\u7528\u5599\u538B\u56DE\u53BB\uFF0C\u518D\u5728\u7A9D\u8FB9\u5B89\u9759\u5B88\u7740\u3002"
    ],
    [
      "nest-siesta",
      "\u4E00\u7A9D\u90FD\u7761\u7740\u4E86",
      "\u5C0F\u9E1F\u9760\u5728\u7A9D\u6CBF\u6253\u76F9\uFF0C\u5076\u5C14\u7741\u773C\u770B\u770B\uFF0C\u5C3E\u5DF4\u968F\u547C\u5438\u8F7B\u8F7B\u8D77\u4F0F\u3002"
    ]
  ]),
  ...set("sparrow", [
    [
      "window-knock",
      "\u7A97\u8FB9\u7684\u5C0F\u8BBF\u5BA2",
      "\u9EBB\u96C0\u843D\u5728\u6CBF\u53E3\uFF0C\u6B6A\u5934\u770B\u770B\u91CC\u9762\uFF0C\u8F7B\u8F7B\u5544\u4E00\u4E0B\uFF0C\u9000\u540E\u534A\u6B65\u3002"
    ],
    [
      "feather-preening",
      "\u6574\u7406\u4E00\u4E0B\u7FBD\u6BDB",
      "\u5C0F\u9E1F\u5728\u7A97\u6CBF\u68B3\u7406\u7FC5\u8180\uFF0C\u6296\u843D\u4E00\u6839\u5C0F\u7FBD\u6BDB\uFF1B\u7FBD\u6BDB\u6CBF\u7740\u7A97\u6846\u6162\u6162\u843D\u4E0B\u3002"
    ],
    [
      "shared-crumb",
      "\u4E00\u7C92\u79CD\u5B50\u5206\u4E24\u534A",
      "\u4E24\u53EA\u9EBB\u96C0\u76F8\u7EE7\u843D\u5728\u6CBF\u53E3\uFF0C\u4E00\u53EA\u63A8\u8FC7\u53BB\u4E00\u7C92\u79CD\u5B50\uFF0C\u53E6\u4E00\u53EA\u51D1\u8FD1\u3002"
    ],
    [
      "sparrow-stretch",
      "\u7A97\u6CBF\u4E0A\u7684\u4F38\u61D2\u8170",
      "\u9EBB\u96C0\u7AD9\u7A33\u540E\u4F38\u5C55\u5F00\u4E00\u4FA7\u7FC5\u8180\uFF0C\u518D\u6362\u53E6\u4E00\u4FA7\uFF0C\u6700\u540E\u8E66\u5230\u7A97\u6CBF\u53E6\u4E00\u7AEF\u3002"
    ],
    [
      "sparrow-queue",
      "\u6CBF\u53E3\u5FFD\u7136\u6392\u8D77\u4E86\u961F",
      "\u4E09\u53EA\u5C0F\u9E1F\u4F9D\u6B21\u843D\u5728\u6A2A\u6881\u4E0A\uFF0C\u540E\u5230\u7684\u90A3\u53EA\u6324\u4E00\u6324\uFF0C\u5927\u5BB6\u5404\u632A\u5F00\u4E00\u70B9\u3002"
    ]
  ]),
  ...set("swallow", [
    [
      "swallow-return",
      "\u7ED5\u4E86\u4E00\u5708\uFF0C\u53C8\u56DE\u6765\u4E86",
      "\u71D5\u5B50\u4ECE\u6A90\u4E0B\u63A0\u51FA\uFF0C\u7ED5\u8FC7\u5C4B\u89D2\uFF0C\u518D\u843D\u56DE\u540C\u4E00\u6839\u6881\u4E0A\u3002"
    ],
    [
      "swallow-tail",
      "\u6A90\u4E0B\u7684\u4E00\u628A\u5C0F\u526A\u5200",
      "\u71D5\u5B50\u5728\u6A90\u53E3\u6536\u62E2\u7FC5\u8180\uFF0C\u53C9\u5F62\u5C3E\u5DF4\u968F\u98CE\u5F20\u5F00\u53C8\u5408\u4E0A\u3002"
    ],
    [
      "swallow-pair",
      "\u4E00\u524D\u4E00\u540E\u98DE\u8FC7\u7A97\u524D",
      "\u4E24\u53EA\u71D5\u5B50\u6CBF\u7A97\u5916\u4E0D\u540C\u9AD8\u5EA6\u63A0\u8FC7\uFF0C\u4E00\u53EA\u6298\u8FD4\uFF0C\u53E6\u4E00\u53EA\u505C\u5728\u6CBF\u53E3\u7B49\u5B83\u3002"
    ],
    [
      "swallow-shadow",
      "\u5F71\u5B50\u5148\u4ECE\u7A97\u4E0A\u8FC7\u53BB",
      "\u4E00\u7247\u7EC6\u5C0F\u7684\u9E1F\u5F71\u6ED1\u8FC7\u7A97\u9762\uFF0C\u71D5\u5B50\u624D\u4ECE\u53E6\u4E00\u4FA7\u8FDB\u5165\u89C6\u91CE\u3002"
    ],
    [
      "swallow-wire",
      "\u77ED\u6682\u505C\u9760",
      "\u71D5\u5B50\u8E29\u4E0A\u6A2A\u6881\uFF0C\u4F4E\u5934\u770B\u770B\u5C4B\u91CC\uFF0C\u505C\u987F\u7247\u523B\uFF0C\u518D\u5229\u843D\u5730\u98DE\u8D70\u3002"
    ]
  ]),
  ...set("crow", [
    [
      "shiny-button",
      "\u5E26\u6765\u4E00\u9897\u4EAE\u6676\u6676\u7684\u5C0F\u4E1C\u897F",
      "\u5C0F\u4E4C\u9E26\u628A\u6361\u6765\u7684\u4EAE\u7247\u653E\u5728\u7A97\u6CBF\uFF0C\u9000\u540E\u6253\u91CF\uFF0C\u53C8\u628A\u5B83\u62E8\u6B63\u4E00\u70B9\u3002"
    ],
    [
      "crow-curiosity",
      "\u5B83\u5728\u7814\u7A76\u8FD9\u6247\u7A97",
      "\u4E4C\u9E26\u843D\u5728\u6CBF\u53E3\uFF0C\u5DE6\u6B6A\u5934\u3001\u53F3\u6B6A\u5934\uFF0C\u6CBF\u7740\u7A97\u6846\u8D70\u4E24\u5C0F\u6B65\u3002"
    ],
    [
      "twig-collector",
      "\u8FD9\u6839\u6811\u679D\u597D\u50CF\u4E0D\u592A\u5408\u9002",
      "\u4E4C\u9E26\u53FC\u6765\u4E00\u6839\u7EC6\u679D\uFF0C\u8BD5\u7740\u653E\u8FDB\u6A90\u89D2\uFF0C\u6A2A\u8FC7\u6765\u3001\u7AD6\u8FC7\u53BB\uFF0C\u6700\u540E\u8854\u8D70\u3002"
    ],
    [
      "crow-plant",
      "\u82B1\u76C6\u540E\u9762\u662F\u8C01",
      "\u4E4C\u9E26\u4ECE\u82B1\u53F6\u540E\u9732\u51FA\u5934\uFF0C\u63A2\u770B\u571F\u91CC\uFF0C\u518D\u8DF3\u4E0A\u82B1\u76C6\u8FB9\u7F18\u3002"
    ],
    [
      "rolling-nut",
      "\u575A\u679C\u6EDA\u5230\u4E86\u53E6\u4E00\u8FB9",
      "\u4E4C\u9E26\u5728\u6CBF\u53E3\u653E\u4E0B\u4E00\u9897\u575A\u679C\uFF0C\u575A\u679C\u6EDA\u52A8\uFF0C\u5B83\u8D76\u7D27\u8DF3\u8FC7\u53BB\u62E6\u4F4F\u3002"
    ]
  ]),
  ...set("cat", [
    [
      "stray-cat",
      "\u4E00\u4F4D\u4E0D\u6253\u62DB\u547C\u7684\u5BA2\u4EBA",
      "\u91CE\u732B\u4ECE\u5165\u53E3\u63A2\u5934\uFF0C\u6CBF\u73B0\u6709\u901A\u9053\u6162\u6162\u8D70\u8FDB\u6765\uFF0C\u9009\u4E00\u5757\u5730\u677F\u8737\u4E0B\uFF0C\u518D\u539F\u8DEF\u79BB\u5F00\u3002"
    ],
    [
      "cat-wash",
      "\u501F\u4F60\u8FD9\u91CC\u6D17\u4E00\u4E0B\u8138",
      "\u732B\u8D70\u5230\u95E8\u5185\uFF0C\u5750\u7A33\u3001\u8214\u722A\u3001\u64E6\u8138\uFF0C\u7136\u540E\u82E5\u65E0\u5176\u4E8B\u5730\u8D70\u4E86\u3002"
    ],
    [
      "cat-peek",
      "\u53EA\u9732\u51FA\u4E86\u4E00\u53CC\u773C\u775B",
      "\u732B\u6CBF\u901A\u9053\u9760\u8FD1\u5BB6\u5177\uFF0C\u5728\u906E\u6321\u540E\u505C\u4F4F\uFF0C\u53EA\u9732\u51FA\u8033\u6735\u548C\u5C3E\u5DF4\uFF0C\u968F\u540E\u63A2\u5934\u3002"
    ],
    [
      "cat-threshold-nap",
      "\u95E8\u69DB\u4E0A\u7684\u5348\u7761",
      "\u732B\u5728\u771F\u5B9E\u5165\u53E3\u8F6C\u4E00\u5708\uFF0C\u4F0F\u5728\u95E8\u69DB\u5185\u4FA7\u6253\u4E2A\u77ED\u76F9\uFF0C\u8033\u6735\u5076\u5C14\u52A8\u4E00\u4E0B\u3002"
    ],
    [
      "cat-checking-in",
      "\u53C8\u56DE\u6765\u770B\u770B",
      "\u732B\u8D70\u8FDB\u51E0\u6B65\uFF0C\u56DE\u5934\u5F20\u671B\uFF0C\u51C6\u5907\u79BB\u5F00\u65F6\u53C8\u6298\u8FD4\u55C5\u4E00\u55C5\u5730\u677F\u3002"
    ]
  ]),
  ...set("cat-play", [
    [
      "cat-and-leaf",
      "\u4E00\u7247\u53F6\u5B50\u5F15\u6765\u7684\u5BA2\u4EBA",
      "\u98CE\u628A\u4E00\u7247\u5C0F\u53F6\u5B50\u5439\u8FC7\u5165\u53E3\uFF0C\u732B\u8DDF\u7740\u8DD1\u4E24\u6B65\uFF0C\u6309\u4F4F\u5B83\uFF0C\u53C8\u677E\u5F00\u3002"
    ],
    [
      "cat-pounce",
      "\u6CA1\u6251\u4E2D\u7684\u5C0F\u5149\u70B9",
      "\u732B\u6CBF\u901A\u9053\u8DDF\u7740\u4E00\u5904\u5C0F\u5149\u5F71\u4F0F\u4F4E\u8EAB\u5B50\uFF0C\u8F7B\u8F7B\u6251\u8FC7\u53BB\uFF0C\u518D\u88C5\u4F5C\u4EC0\u4E48\u4E5F\u6CA1\u53D1\u751F\u3002"
    ],
    [
      "cat-tail-shadow",
      "\u5B83\u53D1\u73B0\u4E86\u81EA\u5DF1\u7684\u5C3E\u5DF4",
      "\u732B\u5750\u4E0B\u65F6\u5C3E\u5DF4\u626B\u8FC7\u5730\u9762\uFF0C\u76EF\u7740\u5C3E\u5DF4\u5C16\u8F6C\u4E86\u4E00\u5C0F\u5708\u3002"
    ],
    [
      "cat-stretch",
      "\u8FD9\u91CC\u5F88\u9002\u5408\u4F38\u4E2A\u61D2\u8170",
      "\u732B\u8FDB\u95E8\u540E\u524D\u722A\u4F38\u8FDC\u3001\u80CC\u62F1\u8D77\u6765\uFF0C\u540E\u817F\u4F9D\u6B21\u8E6C\u76F4\uFF0C\u6162\u60A0\u60A0\u79BB\u5F00\u3002"
    ],
    [
      "cat-rolling",
      "\u4E00\u5757\u6EE1\u610F\u7684\u5730\u677F",
      "\u732B\u5728\u95E8\u5185\u7A7A\u5730\u8E6D\u8E6D\u8138\uFF0C\u7FFB\u4E2A\u8EAB\uFF0C\u7AD9\u8D77\u6765\u6296\u6296\u6BDB\u3002"
    ]
  ]),
  ...set("squirrel", [
    [
      "secret-acorn",
      "\u85CF\u597D\u4E86\uFF0C\u8C01\u4E5F\u6CA1\u770B\u89C1",
      "\u677E\u9F20\u6CBF\u5165\u53E3\u6E9C\u6765\uFF0C\u5728\u73B0\u6709\u82B1\u76C6\u7684\u571F\u8FB9\u62E8\u51E0\u4E0B\uFF0C\u85CF\u8FDB\u4E00\u9897\u5C0F\u6A61\u679C\u3002"
    ],
    [
      "squirrel-breakfast",
      "\u7A97\u6CBF\u4E0A\u7684\u575A\u679C\u65E9\u9910",
      "\u677E\u9F20\u62B1\u7740\u575A\u679C\u5750\u5728\u6CBF\u53E3\uFF0C\u5543\u51E0\u53E3\uFF0C\u505C\u4E0B\u6765\u56DB\u5904\u5F20\u671B\u3002"
    ],
    [
      "squirrel-tail",
      "\u628A\u5C3E\u5DF4\u5F53\u6210\u5C0F\u88AB\u5B50",
      "\u677E\u9F20\u9760\u7740\u7A97\u6846\u5750\u4E0B\uFF0C\u84EC\u677E\u5C3E\u5DF4\u6162\u6162\u5377\u5230\u8EAB\u4F53\u65C1\u3002"
    ],
    [
      "squirrel-peek",
      "\u6811\u5E72\u53E6\u4E00\u4FA7\u7684\u6349\u8FF7\u85CF",
      "\u677E\u9F20\u4ECE\u5DF2\u6709\u679D\u5E72\u65C1\u63A2\u51FA\u5934\uFF0C\u7F29\u56DE\u53BB\uFF0C\u53C8\u4ECE\u7A0D\u9AD8\u7684\u4F4D\u7F6E\u51FA\u73B0\u3002"
    ],
    [
      "squirrel-forgot",
      "\u597D\u50CF\u5FD8\u8BB0\u85CF\u5728\u54EA\u91CC\u4E86",
      "\u677E\u9F20\u5728\u82B1\u76C6\u4E24\u4FA7\u5206\u522B\u627E\u4E00\u627E\uFF0C\u505C\u4F4F\u601D\u8003\uFF0C\u6700\u540E\u62B1\u56DE\u521A\u521A\u653E\u4E0B\u7684\u90A3\u9897\u679C\u5B50\u3002"
    ]
  ]),
  ...set("mouse", [
    [
      "mouse-at-door",
      "\u95E8\u8FB9\u4E00\u77AC\u95F4\u7684\u5C0F\u52A8\u9759",
      "\u5C0F\u8001\u9F20\u4ECE\u5165\u53E3\u8FB9\u63A2\u5934\uFF0C\u8DD1\u8FDB\u4E00\u70B9\u70B9\uFF0C\u53C8\u8EB2\u56DE\u95E8\u6846\u65C1\u3002"
    ],
    [
      "seed-courier",
      "\u6BD4\u81EA\u5DF1\u8FD8\u73CD\u60DC\u7684\u4E00\u7C92\u79CD\u5B50",
      "\u8001\u9F20\u6CBF\u5730\u9762\u901A\u9053\u62B1\u7740\u79CD\u5B50\u8D70\u4E00\u6BB5\uFF0C\u505C\u4E0B\u6765\u6362\u4E2A\u62B1\u6CD5\u3002"
    ],
    [
      "mouse-zigzag",
      "\u8D70\u4E24\u6B65\uFF0C\u518D\u56DE\u5934\u770B\u4E00\u773C",
      "\u8001\u9F20\u6CBF\u901A\u9053\u5C0F\u8DD1\uFF0C\u8D70\u8D70\u505C\u505C\uFF0C\u5728\u95E8\u69DB\u5904\u56DE\u5934\u770B\u770B\u3002"
    ],
    [
      "mouse-under-leaf",
      "\u4E00\u7247\u53F6\u5B50\u81EA\u5DF1\u52A8\u4E86",
      "\u843D\u53F6\u5E95\u4E0B\u5148\u9732\u51FA\u5C3E\u5DF4\uFF0C\u8001\u9F20\u62D6\u7740\u53F6\u5B50\u8D70\u4E86\u4E24\u6B65\uFF0C\u624D\u94BB\u51FA\u6765\u3002"
    ],
    [
      "mouse-last-tail",
      "\u53EA\u6765\u5F97\u53CA\u770B\u89C1\u5C3E\u5DF4",
      "\u8001\u9F20\u6CBF\u95E8\u8FB9\u4E00\u95EA\u800C\u8FC7\uFF0C\u5C3E\u5DF4\u6700\u540E\u6D88\u5931\u5728\u95E8\u6846\u4E4B\u540E\u3002"
    ]
  ]),
  ...set("snail", [
    [
      "snail-rim",
      "\u7ED5\u82B1\u76C6\u534A\u5708\u7684\u65C5\u884C",
      "\u8717\u725B\u6CBF\u73B0\u6709\u82B1\u76C6\u7684\u8FB9\u7F18\u7F13\u7F13\u632A\u52A8\uFF0C\u89E6\u89D2\u4E00\u524D\u4E00\u540E\u8BD5\u63A2\u3002"
    ],
    [
      "snail-leaf",
      "\u53F6\u5B50\u4E0A\u7684\u6162\u884C\u8005",
      "\u8717\u725B\u4ECE\u4E00\u7247\u771F\u5B9E\u53F6\u5B50\u7684\u6839\u90E8\u722C\u5411\u53F6\u5C16\uFF0C\u53F6\u5B50\u88AB\u538B\u5F97\u8F7B\u8F7B\u4F4E\u4E0B\u53BB\u3002"
    ],
    [
      "snail-glass",
      "\u8FB9\u6846\u4E0A\u7684\u4E00\u6761\u5F2F\u7EBF",
      "\u8717\u725B\u5728\u6846\u8FB9\u6162\u6162\u722C\u884C\uFF0C\u7559\u4E0B\u4E00\u6761\u5F88\u6DE1\u7684\u5F27\u5F62\u75D5\u8FF9\u3002"
    ],
    [
      "snail-curious",
      "\u89E6\u89D2\u78B0\u89C1\u4E00\u9897\u9732\u73E0",
      "\u8717\u725B\u4F38\u51FA\u89E6\u89D2\u89E6\u78B0\u53F6\u5C16\u7684\u6C34\u73E0\uFF0C\u7F29\u4E00\u4E0B\uFF0C\u518D\u8BD5\u4E00\u6B21\u3002"
    ],
    [
      "snail-trail",
      "\u5148\u53D1\u73B0\u4E86\u90A3\u6761\u94F6\u7EBF",
      "\u7A97\u6CBF\u7559\u7740\u4E00\u6761\u5FAE\u5149\u7EC6\u7EBF\uFF0C\u987A\u7740\u770B\u8FC7\u53BB\uFF0C\u8717\u725B\u505C\u5728\u53E6\u4E00\u5934\u3002"
    ]
  ]),
  ...set("butterfly", [
    [
      "butterfly-flower",
      "\u82B1\u5F00\u5F97\u6B63\u597D",
      "\u8774\u8776\u7ED5\u7740\u5DF2\u6709\u7684\u82B1\u53F6\u76D8\u65CB\uFF0C\u843D\u4E0B\u6765\u5408\u62E2\u7FC5\u8180\uFF0C\u518D\u8F7B\u8F7B\u5F20\u5F00\u3002"
    ],
    [
      "butterfly-pair",
      "\u4E24\u53EA\u8774\u8776\u7ED5\u4E86\u4E2A\u5C0F\u5708",
      "\u4E24\u53EA\u8774\u8776\u5728\u540C\u4E00\u76C6\u7EFF\u690D\u65C1\u4EA4\u9519\uFF0C\u505C\u5728\u4E0D\u540C\u7684\u53F6\u7247\u4E0A\u3002"
    ],
    [
      "butterfly-reflection",
      "\u7ED5\u7740\u7A97\u8FB9\u8F6C\u4E86\u4E00\u5708",
      "\u8774\u8776\u9760\u8FD1\u5F00\u53E3\u8FB9\u7F18\uFF0C\u53C8\u9000\u5F00\uFF0C\u518D\u7ED5\u56DE\u6CBF\u53E3\u3002"
    ],
    [
      "butterfly-rest",
      "\u5408\u8D77\u7FC5\u8180\u5C31\u50CF\u4E00\u7247\u53F6\u5B50",
      "\u8774\u8776\u505C\u5728\u53F6\u7F18\uFF0C\u7FC5\u8180\u5408\u62E2\u65F6\u51E0\u4E4E\u85CF\u8FDB\u7EFF\u610F\u91CC\uFF0C\u8FC7\u4E00\u4F1A\u513F\u53C8\u6253\u5F00\u3002"
    ],
    [
      "butterfly-breeze",
      "\u8BA9\u4E00\u9635\u98CE\u5148\u8FC7\u53BB",
      "\u8774\u8776\u88AB\u98CE\u8F7B\u8F7B\u63A8\u5F00\uFF0C\u7ED5\u7740\u82B1\u76C6\u56DE\u65CB\uFF0C\u6700\u540E\u627E\u5230\u80CC\u98CE\u7684\u4E00\u7247\u53F6\u5B50\u3002"
    ]
  ]),
  ...set("bee", [
    [
      "pollen-visitor",
      "\u817F\u4E0A\u6CBE\u4E86\u4E24\u70B9\u82B1\u7C89",
      "\u871C\u8702\u6328\u7740\u771F\u5B9E\u82B1\u4E1B\u505C\u7559\uFF0C\u8D77\u98DE\u65F6\u540E\u817F\u591A\u4E86\u4E24\u56E2\u7EC6\u5C0F\u82B1\u7C89\u3002"
    ],
    [
      "tired-bee",
      "\u53F6\u5C16\u4E0A\u7684\u5C0F\u4F11\u606F",
      "\u871C\u8702\u843D\u5728\u53F6\u5B50\u4E0A\uFF0C\u6536\u597D\u7FC5\u8180\u4F11\u606F\u4E00\u4F1A\u513F\uFF0C\u624D\u91CD\u65B0\u98DE\u8D77\u6765\u3002"
    ],
    [
      "bee-eight",
      "\u82B1\u76C6\u65C1\u7684\u4E00\u7B14\u5C0F\u516B\u5B57",
      "\u871C\u8702\u7ED5\u7740\u82B1\u76C6\u98DE\u4E00\u4E2A\u516B\u5B57\uFF0C\u7ECF\u8FC7\u82B1\u6735\u65F6\u7A0D\u7A0D\u653E\u6162\u3002"
    ],
    [
      "bumblebee-landing",
      "\u7740\u9646\u65F6\u6643\u4E86\u4E00\u4E0B",
      "\u5706\u6EDA\u6EDA\u7684\u718A\u8702\u843D\u4E0A\u7EC6\u53F6\uFF0C\u8EAB\u4F53\u6643\u4E00\u4E0B\uFF0C\u5B83\u8C03\u6574\u811A\u6B65\u7AD9\u7A33\u3002"
    ],
    [
      "two-bees",
      "\u521A\u597D\u9519\u5F00\u4E86",
      "\u4E00\u53EA\u871C\u8702\u79BB\u5F00\u82B1\u5FC3\u65F6\uFF0C\u53E6\u4E00\u53EA\u4ECE\u76F8\u53CD\u65B9\u5411\u8FC7\u6765\uFF0C\u4E24\u53EA\u7ED5\u5F00\u5F7C\u6B64\u3002"
    ]
  ]),
  ...set("dragonfly", [
    [
      "dragonfly-hover",
      "\u505C\u5728\u534A\u7A7A\u7684\u4E00\u5C0F\u4F1A\u513F",
      "\u873B\u8713\u5728\u7A97\u6CBF\u5916\u60AC\u505C\uFF0C\u8EAB\u4F53\u4E0D\u52A8\uFF0C\u900F\u660E\u7FC5\u8180\u7EC6\u7EC6\u95EA\u52A8\u3002"
    ],
    [
      "dragonfly-sill",
      "\u6CBF\u53E3\u4E0A\u7684\u56DB\u7247\u8584\u7FC5",
      "\u873B\u8713\u843D\u5728\u7A97\u6CBF\uFF0C\u56DB\u7247\u7FC5\u8180\u6162\u6162\u6536\u5E73\uFF0C\u518D\u5FFD\u7136\u98DE\u8FDC\u3002"
    ],
    [
      "dragonfly-crossing",
      "\u4E24\u6761\u64E6\u80A9\u800C\u8FC7\u7684\u8F68\u8FF9",
      "\u4E24\u53EA\u873B\u8713\u5728\u7A97\u5916\u4EA4\u9519\uFF0C\u4E00\u53EA\u62C9\u9AD8\uFF0C\u53E6\u4E00\u53EA\u6CBF\u7A97\u6CBF\u6ED1\u8FC7\u53BB\u3002"
    ],
    [
      "dragonfly-loop",
      "\u7ED5\u7740\u90A3\u7247\u53F6\u5B50",
      "\u873B\u8713\u7ED5\u5DF2\u6709\u7EFF\u690D\u8F6C\u534A\u5708\uFF0C\u77ED\u6682\u505C\u5728\u53F6\u5C16\u4E0A\u3002"
    ],
    [
      "dragonfly-shadow",
      "\u5730\u4E0A\u90A3\u4E00\u70B9\u5C0F\u5F71\u5B50",
      "\u873B\u8713\u6CBF\u7A97\u524D\u63A0\u8FC7\uFF0C\u8584\u8584\u7684\u5F71\u5B50\u987A\u7740\u7A97\u53F0\u8868\u9762\u6ED1\u52A8\u3002"
    ]
  ]),
  ...set("moth", [
    [
      "moth-lamp",
      "\u8FFD\u7740\u4E00\u5C0F\u5708\u5149",
      "\u98DE\u86FE\u5728\u73B0\u6709\u5149\u6E90\u9644\u8FD1\u7ED5\u5708\uFF0C\u5076\u5C14\u505C\u5728\u65C1\u8FB9\uFF1B\u767D\u5929\u5B89\u9759\u6B47\u7740\u3002"
    ],
    [
      "moth-wall",
      "\u5899\u4E0A\u7684\u4E00\u7247\u5C0F\u7FC5\u8180",
      "\u98DE\u86FE\u843D\u5728\u7A97\u6846\u8FB9\u7684\u5899\u9762\uFF0C\u7FC5\u8180\u5408\u62E2\u6210\u4E00\u4E2A\u5B89\u9759\u7684\u5C0F\u4E09\u89D2\u3002"
    ],
    [
      "moth-window",
      "\u60F3\u51FA\u53BB\uFF0C\u53C8\u505C\u4E0B\u6765",
      "\u98DE\u86FE\u6CBF\u5F00\u53E3\u8FB9\u7F18\u6298\u8FD4\uFF0C\u6700\u540E\u505C\u5728\u8FB9\u6846\u5185\u4FA7\u3002"
    ],
    [
      "moth-shadow",
      "\u706F\u8FB9\u6643\u8FC7\u4E00\u7247\u5C0F\u5F71\u5B50",
      "\u98DE\u86FE\u63A0\u8FC7\u706F\u5149\uFF0C\u5F71\u5B50\u5728\u9644\u8FD1\u8868\u9762\u8F7B\u8F7B\u53D8\u5927\u3001\u7F29\u5C0F\u3002"
    ],
    [
      "moth-pair",
      "\u4E24\u53EA\u591C\u95F4\u5C0F\u8BBF\u5BA2",
      "\u4E24\u53EA\u98DE\u86FE\u4EE5\u4E0D\u540C\u65B9\u5411\u7ED5\u7740\u706F\uFF0C\u5148\u540E\u505C\u5728\u7A97\u6846\u4E0A\u3002"
    ]
  ]),
  ...set("web", [
    [
      "window-web",
      "\u7A97\u6846\u89D2\u843D\u7684\u65B0\u4F4F\u5BA2",
      "\u4E00\u5F20\u7EC6\u7EC6\u7684\u86DB\u7F51\u63A5\u5728\u771F\u5B9E\u7A97\u6846\u7684\u4E24\u6761\u8FB9\u4E0A\uFF0C\u5C0F\u8718\u86DB\u6CBF\u4E1D\u7EBF\u68C0\u67E5\u4E00\u5708\u3002"
    ],
    [
      "web-dew",
      "\u86DB\u7F51\u4E0A\u6302\u7740\u51E0\u9897\u9732\u73E0",
      "\u9732\u73E0\u505C\u5728\u7A97\u89D2\u86DB\u7F51\u7684\u4EA4\u70B9\u4E0A\uFF0C\u5149\u4E00\u53D8\uFF0C\u5176\u4E2D\u4E00\u9897\u8F7B\u8F7B\u95EA\u4E00\u4E0B\u3002"
    ],
    [
      "spider-descent",
      "\u4E00\u6839\u5782\u4E0B\u6765\u7684\u7EC6\u4E1D",
      "\u5C0F\u8718\u86DB\u4ECE\u6A90\u89D2\u6CBF\u7EC6\u4E1D\u843D\u4E0B\u4E00\u622A\uFF0C\u60AC\u505C\uFF0C\u53C8\u6162\u6162\u722C\u56DE\u53BB\u3002"
    ],
    [
      "web-petal",
      "\u7559\u4F4F\u4E86\u4E00\u7247\u82B1\u74E3",
      "\u4E00\u7247\u5C0F\u82B1\u74E3\u6302\u5728\u7A97\u89D2\u86DB\u7F51\u8FB9\u7F18\uFF0C\u968F\u7740\u6C14\u6D41\u8F7B\u8F7B\u98A4\u52A8\u3002"
    ],
    [
      "web-breeze",
      "\u98CE\u4ECE\u7A97\u8FB9\u8FC7\u53BB\u4E86",
      "\u7A97\u6846\u4E0A\u7684\u86DB\u7F51\u88AB\u8F7B\u8F7B\u63A8\u6210\u5F27\u9762\uFF0C\u98CE\u505C\u540E\u7F13\u7F13\u590D\u539F\u3002"
    ]
  ]),
  ...set("plant", [
    [
      "first-bud",
      "\u4ECA\u5929\u5F00\u4E86\u4E00\u6735\u5C0F\u82B1",
      "\u5DF2\u6709\u7684\u7EFF\u690D\u53F6\u95F4\u591A\u4E86\u4E00\u679A\u82B1\u82DE\uFF0C\u82B1\u74E3\u4E00\u70B9\u70B9\u5C55\u5F00\u3002"
    ],
    [
      "new-leaf",
      "\u4E00\u7247\u8FD8\u6CA1\u4F38\u76F4\u7684\u65B0\u53F6",
      "\u5DF2\u6709\u82B1\u76C6\u91CC\u5192\u51FA\u5377\u7740\u7684\u65B0\u53F6\uFF0C\u53F6\u5C16\u7F13\u7F13\u5C55\u5F00\u3002"
    ],
    [
      "seedpod-open",
      "\u79CD\u835A\u677E\u5F00\u4E86\u4E00\u70B9",
      "\u7EFF\u690D\u65C1\u7684\u4E00\u679A\u5C0F\u79CD\u835A\u88C2\u5F00\uFF0C\u9732\u51FA\u51E0\u9897\u79CD\u5B50\uFF0C\u5176\u4E2D\u4E00\u9897\u843D\u56DE\u76C6\u571F\u3002"
    ],
    [
      "tiny-shoot",
      "\u76C6\u571F\u91CC\u591A\u4E86\u4E24\u4E2A\u5C0F\u82BD",
      "\u65B0\u82BD\u4ECE\u73B0\u6709\u82B1\u76C6\u7684\u571F\u8FB9\u5192\u51FA\uFF0C\u4E00\u9AD8\u4E00\u4F4E\uFF0C\u968F\u98CE\u8F7B\u8F7B\u70B9\u5934\u3002"
    ],
    [
      "berry-cluster",
      "\u53F6\u5B50\u80CC\u540E\u85CF\u7740\u5C0F\u679C\u5B50",
      "\u5DF2\u6709\u679D\u53F6\u95F4\u591A\u4E86\u4E00\u5C0F\u4E32\u679C\u5B50\uFF0C\u4E00\u53EA\u5C0F\u9E1F\u8FC7\u6765\u770B\u770B\uFF0C\u5374\u6CA1\u6458\u8D70\u3002"
    ]
  ]),
  ...set("leaf", [
    [
      "caught-leaf",
      "\u7A97\u6CBF\u63A5\u4F4F\u4E86\u4E00\u7247\u843D\u53F6",
      "\u843D\u53F6\u6CBF\u7A97\u5916\u65CB\u843D\uFF0C\u88AB\u771F\u5B9E\u7A97\u53F0\u63A5\u4F4F\uFF0C\u53F6\u5C16\u5076\u5C14\u7FFB\u52A8\u3002"
    ],
    [
      "eaves-leaf",
      "\u5C4B\u6A90\u4E0A\u5361\u7740\u4E00\u7247\u5C0F\u53F6\u5B50",
      "\u4E00\u7247\u53F6\u5B50\u5361\u5728\u6A90\u89D2\uFF0C\u98CE\u5439\u65F6\u7FD8\u8D77\u6765\uFF0C\u53C8\u88AB\u8FB9\u6CBF\u7559\u4F4F\u3002"
    ],
    [
      "leaf-whirl",
      "\u95E8\u53E3\u8F6C\u4E86\u534A\u5708\u7684\u5C0F\u98CE",
      "\u4E24\u7247\u53F6\u5B50\u6CBF\u5165\u53E3\u7A7A\u5730\u6253\u4E86\u4E2A\u65CB\uFF0C\u6700\u540E\u8D34\u7740\u95E8\u69DB\u505C\u4E0B\u3002"
    ],
    [
      "leaf-shadow",
      "\u4E00\u7247\u6811\u53F6\u7684\u5F71\u5B50",
      "\u7A97\u5916\u679D\u53F6\u6447\u52A8\uFF0C\u4E00\u679A\u6E05\u6670\u7684\u5C0F\u53F6\u5F71\u63A0\u8FC7\u7A97\u9762\u548C\u6CBF\u53E3\u3002"
    ],
    [
      "leaf-on-planter",
      "\u7ED9\u82B1\u76C6\u6DFB\u4E86\u4E00\u7247\u79CB\u5929",
      "\u4E00\u7247\u5E72\u53F6\u843D\u8FDB\u5DF2\u6709\u82B1\u76C6\uFF0C\u9760\u7740\u76C6\u6CBF\u505C\u4F4F\uFF0C\u8717\u725B\u4ECE\u65C1\u8FB9\u63A2\u51FA\u5934\u3002"
    ]
  ]),
  ...set("petal", [
    [
      "petal-sill",
      "\u7A97\u6CBF\u4E0A\u7684\u4E09\u7247\u82B1\u74E3",
      "\u4E09\u7247\u82B1\u74E3\u5148\u540E\u843D\u5230\u771F\u5B9E\u7A97\u6CBF\uFF0C\u6700\u8F7B\u7684\u4E00\u7247\u8FD8\u4F1A\u88AB\u98CE\u7FFB\u4E00\u6B21\u3002"
    ],
    [
      "petal-at-pot",
      "\u82B1\u843D\u56DE\u4E86\u81EA\u5DF1\u7684\u82B1\u76C6",
      "\u5DF2\u6709\u82B1\u4E1B\u7684\u4E00\u7247\u82B1\u74E3\u8131\u843D\uFF0C\u8F7B\u8F7B\u843D\u56DE\u76C6\u571F\u3002"
    ],
    [
      "petal-on-glass",
      "\u6846\u8FB9\u8D34\u7740\u4E00\u7247\u5C0F\u82B1\u74E3",
      "\u4E00\u7247\u88AB\u6C34\u6CBE\u6E7F\u7684\u82B1\u74E3\u8D34\u5728\u6846\u8FB9\uFF0C\u53E6\u4E00\u7247\u4ECE\u65C1\u8FB9\u98DE\u8FC7\u3002"
    ],
    [
      "petal-swirl",
      "\u4E00\u9635\u5F88\u8F7B\u7684\u82B1\u96E8",
      "\u51E0\u7247\u82B1\u74E3\u7ED5\u7740\u5DF2\u6709\u7EFF\u690D\u6162\u6162\u6253\u8F6C\uFF0C\u843D\u5728\u76C6\u8FB9\uFF0C\u4E0D\u94FA\u6EE1\u6574\u4E2A\u753B\u9762\u3002"
    ],
    [
      "petal-on-feather",
      "\u7A97\u6CBF\u4E0A\u7684\u4E00\u4EFD\u5076\u7136",
      "\u4E00\u6839\u9E1F\u7FBD\u7559\u5728\u6CBF\u53E3\uFF0C\u4E00\u7247\u82B1\u74E3\u98D8\u6765\uFF0C\u521A\u597D\u843D\u5728\u65C1\u8FB9\u3002"
    ]
  ]),
  ...set("dew", [
    [
      "dew-on-leaf",
      "\u9732\u73E0\u4ECE\u53F6\u5C16\u6EDA\u4E0B\u6765\u4E86",
      "\u6C34\u73E0\u6CBF\u771F\u5B9E\u53F6\u7F18\u6EDA\u5230\u5C16\u7AEF\uFF0C\u505C\u4E00\u4F1A\u513F\uFF0C\u843D\u56DE\u4E0B\u65B9\u82B1\u76C6\u3002"
    ],
    [
      "window-dew",
      "\u6CBF\u6846\u6162\u6162\u6ED1\u843D\u7684\u6C34\u73E0",
      "\u51E0\u9897\u7EC6\u5C0F\u6C34\u73E0\u5728\u6846\u8FB9\u6C47\u5230\u4E00\u8D77\uFF0C\u6162\u6162\u6ED1\u4E0B\u3002"
    ],
    [
      "ledge-drip",
      "\u6CBF\u53E3\u6EF4\u4E0B\u4E00\u9897\u6C34",
      "\u6C34\u6EF4\u79EF\u5728\u6CBF\u53E3\u4E0B\u7F18\uFF0C\u53D8\u5927\u4E00\u70B9\uFF0C\u843D\u4E0B\uFF0C\u518D\u91CD\u65B0\u79EF\u8D77\u4E00\u9897\u3002"
    ],
    [
      "silver-web",
      "\u53EA\u5728\u8FD9\u4E2A\u89D2\u5EA6\u770B\u89C1\u7684\u4E1D\u7EBF",
      "\u7A97\u89D2\u7684\u51E0\u6839\u7EC6\u4E1D\u5E26\u7740\u9732\u73E0\uFF0C\u4E00\u9635\u7EC6\u98CE\u8BA9\u5B83\u4EEC\u77ED\u6682\u663E\u51FA\u6765\u3002"
    ],
    [
      "roof-drip",
      "\u6A90\u4E0B\u6162\u6162\u6EF4\u7740\u6C34",
      "\u4E00\u9897\u5C0F\u6C34\u6EF4\u6CBF\u7740\u771F\u5B9E\u6A90\u53E3\u6ED1\u5230\u6700\u4F4E\u5904\uFF0C\u6EF4\u843D\u5728\u4E0B\u65B9\u5730\u9762\u3002"
    ]
  ]),
  ...set("wind", [
    [
      "leaf-conversation",
      "\u4E24\u7247\u53F6\u5B50\u6CA1\u6709\u540C\u65F6\u70B9\u5934",
      "\u5DF2\u6709\u7EFF\u690D\u65C1\u7684\u7EC6\u53F6\u4E00\u524D\u4E00\u540E\u8F7B\u8F7B\u6643\u52A8\uFF0C\u5C0F\u6606\u866B\u501F\u53F6\u5C16\u505C\u9760\u3002"
    ],
    [
      "feather-caught",
      "\u679D\u5934\u6302\u4F4F\u4E86\u4E00\u6839\u5C0F\u7FBD\u6BDB",
      "\u4E00\u6839\u7FBD\u6BDB\u5361\u5728\u771F\u5B9E\u679D\u6748\u4E0A\uFF0C\u98CE\u8BA9\u7FBD\u5C16\u8F7B\u8F7B\u8F6C\u52A8\u3002"
    ],
    [
      "eaves-chime",
      "\u6A90\u4E0B\u591A\u4E86\u4E00\u679A\u5C0F\u98CE\u94C3",
      "\u6781\u5C0F\u7684\u98CE\u94C3\u7531\u7EC6\u7EBF\u6302\u5728\u771F\u5B9E\u6A2A\u6881\u4E0B\u9762\uFF0C\u53EA\u5728\u98CE\u8FC7\u65F6\u6447\u4E00\u4E0B\u3002"
    ],
    [
      "seed-mobile",
      "\u4E09\u9897\u79CD\u5B50\u5728\u6A90\u4E0B\u6643\u7740",
      "\u4E00\u6839\u7EC6\u7EBF\u7CFB\u7740\u4E09\u9897\u79CD\u835A\uFF0C\u6302\u5728\u771F\u5B9E\u6A90\u89D2\uFF0C\u6162\u6162\u9519\u5F00\u6446\u52A8\u3002"
    ],
    [
      "bending-stem",
      "\u53F6\u5C16\u4E0A\u8F7B\u8F7B\u4E00\u6C89",
      "\u8774\u8776\u843D\u4E0A\u5DF2\u6709\u82B1\u53F6\uFF0C\u7EC6\u53F6\u7A0D\u7A0D\u4F4E\u4E0B\u53BB\uFF0C\u8D77\u98DE\u540E\u56DE\u5F39\u3002"
    ]
  ]),
  ...set("lichen", [
    [
      "moss-rim",
      "\u82B1\u76C6\u6CBF\u53E3\u591A\u4E86\u4E00\u70B9\u7EFF",
      "\u73B0\u6709\u82B1\u76C6\u7684\u8FB9\u7F18\u51FA\u73B0\u4E00\u5C0F\u6BB5\u82D4\u85D3\uFF0C\u7EC6\u770B\u8FD8\u6709\u4E00\u679A\u5C0F\u8611\u83C7\u3002"
    ],
    [
      "mushroom-in-soil",
      "\u76C6\u571F\u91CC\u7684\u5C0F\u4F1E",
      "\u5DF2\u6709\u82B1\u76C6\u91CC\u5192\u51FA\u4E24\u679A\u5C0F\u8611\u83C7\uFF0C\u4E00\u53EA\u74E2\u866B\u4ECE\u4F1E\u8FB9\u7ED5\u8FC7\u53BB\u3002"
    ],
    [
      "fern-unfurl",
      "\u4E00\u679A\u5377\u66F2\u7684\u5C0F\u8568\u82BD",
      "\u73B0\u6709\u82B1\u76C6\u7684\u571F\u8FB9\u591A\u4E86\u4E00\u679A\u5377\u66F2\u65B0\u82BD\uFF0C\u6162\u6162\u8212\u5C55\u5F00\u3002"
    ],
    [
      "seed-found-home",
      "\u4E00\u7C92\u79CD\u5B50\u627E\u5230\u4E86\u5730\u65B9",
      "\u4E00\u7C92\u5E26\u7ED2\u6BDB\u7684\u79CD\u5B50\u98D8\u5230\u73B0\u6709\u82B1\u76C6\u91CC\uFF0C\u5361\u5728\u571F\u8FB9\u4E0D\u518D\u98DE\u8D70\u3002"
    ],
    [
      "ladybird-patrol",
      "\u6CBF\u7740\u76C6\u6CBF\u8D70\u4E00\u5C0F\u5708",
      "\u74E2\u866B\u987A\u7740\u771F\u5B9E\u82B1\u76C6\u8FB9\u7F18\u8D70\u4E00\u5C0F\u6BB5\uFF0C\u94BB\u5230\u53F6\u5B50\u540E\u9762\u3002"
    ]
  ])
];
function environmentStoryFor(date) {
  const day = localDay(date);
  if (!Number.isFinite(day)) throw new RangeError("Invalid environment date");
  const index = (day * 37 % environmentStories.length + environmentStories.length) % environmentStories.length;
  return environmentStories[index];
}
function createEnvironmentTimeline() {
  let day;
  let beganAt = 0;
  let previous = 0;
  return (date, playheadMs) => {
    const story = environmentStoryFor(date);
    const nextDay = localDay(date);
    if (day !== void 0 && nextDay !== day) beganAt = playheadMs;
    else if (playheadMs < previous) beganAt = 0;
    day = nextDay;
    previous = playheadMs;
    return { story, elapsedMs: Math.max(0, playheadMs - beganAt) };
  };
}

function environmentInk(ctx, night) {
  const ink = (day, dark) => night ? dark ?? day : day;
  const p = (color, x, y, w = 1, h = 1) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      Math.round(x),
      Math.round(y),
      Math.max(1, Math.round(w)),
      Math.max(1, Math.round(h))
    );
  };
  const ellipse = (color, cx, cy, rx, ry) => {
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      const half = rx * Math.sqrt(Math.max(0, 1 - y * y / (ry * ry)));
      if (half > 0) p(color, cx - half, cy + y, half * 2, 1);
    }
  };
  const line = (color, points, width = 1) => {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const steps = Math.max(
        1,
        Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])))
      );
      for (let j = 0; j <= steps; j++)
        p(
          color,
          a[0] + (b[0] - a[0]) * j / steps,
          a[1] + (b[1] - a[1]) * j / steps,
          width,
          width
        );
    }
  };
  return { ink, p, ellipse, line };
}
function drawWildBird(ctx, at2, kind, time2, options = {}, night = false) {
  const { ink, p, ellipse, line } = environmentInk(ctx, night);
  ctx.save();
  ctx.translate(Math.round(at2[0]), Math.round(at2[1]));
  ctx.scale(options.facing ?? 1, 1);
  const dark = ink("#655849", "#53585b");
  const back = kind === "crow" ? ink("#42494a", "#34434d") : kind === "swallow" ? ink("#4d6370", "#3b5363") : ink("#9b7d59", "#727268");
  const breast = kind === "crow" ? ink("#697275", "#52616b") : kind === "swallow" ? ink("#e4d9c4", "#b4bdba") : ink("#d2c2a1", "#a8ac9b");
  const b = options.flying ? -1 : Math.sin(time2 / 1800) > 0.92 ? -1 : 0;
  if (!options.flying) {
    line(dark, [
      [-2, -2],
      [-2, 0],
      [-4, 0]
    ]);
    line(dark, [
      [3, -2],
      [3, 0],
      [5, 0]
    ]);
  }
  if (options.action === "sleep") {
    ellipse(back, 0, -4, 7, 4);
    ellipse(breast, 2, -3, 4, 2);
    line(dark, [
      [2, -5],
      [4, -5]
    ]);
  } else {
    ellipse(back, 0, -6 + b, 6, 4);
    ellipse(breast, 3, -5 + b, 4, 3);
    const headX = options.action === "preen" ? -2 : options.action === "tap" ? 7 : 5;
    const headY = options.action === "preen" ? -7 : options.action === "tap" ? -5 : -10;
    ellipse(back, headX, headY + b, 3.5, 3);
    p(ink("#222d2d", "#d5d5b9"), headX + 1, headY - 1 + b);
    p(ink("#c89b5e", "#a99873"), headX + 4, headY + b, 2, 1);
    line(
      back,
      [
        [-4, -5 + b],
        [-9, options.flying ? -4 : -2],
        [-11, options.flying ? -5 : -3]
      ],
      2
    );
    if (kind === "swallow")
      line(back, [
        [-7, -5],
        [-13, -2],
        [-10, -6],
        [-14, -7]
      ]);
    if (options.flying || options.action === "stretch") {
      const flap = options.action === "stretch" ? 7 : Math.sin(time2 / 75) * 8;
      line(
        back,
        [
          [0, -7 + b],
          [-3, -8 - flap],
          [-7, -8 - flap * 1.15]
        ],
        2
      );
      line(
        ink("#b9b9a5", "#7c9496"),
        [
          [-1, -8 + b],
          [-5, -8 - flap]
        ],
        1
      );
      line(
        back,
        [
          [2, -7 + b],
          [5, -9 + flap * 0.55],
          [9, -9 + flap * 0.6]
        ],
        2
      );
    } else {
      ellipse(ink("#7e705d", "#60726e"), -1, -6 + b, 3.5, 2);
      p(ink("#c2b08e", "#8a9b92"), -4, -7 + b, 4, 1);
    }
    if (options.twig)
      line(ink("#b3a07b", "#99a59a"), [
        [headX + 4, headY + 1],
        [headX + 11, headY - 2],
        [headX + 13, headY - 5]
      ]);
  }
  ctx.restore();
}
function drawWovenNest(ctx, at2, night, progress = 1, chicks = 0, time2 = 0) {
  const { ink, ellipse, line, p } = environmentInk(ctx, night);
  const [x, y] = at2;
  ellipse(ink("#79634d", "#566363"), x, y - 2, 8 * progress, 3);
  ellipse(ink("#b6a082", "#8b9991"), x, y - 4, 8 * progress, 2);
  ellipse(ink("#5e5142", "#364c50"), x, y - 4, 5.5 * progress, 1.3);
  for (let i = 0; i < 7; i++) {
    const k = i - 3;
    line(ink(i % 2 ? "#c5b38f" : "#9a7d57", i % 2 ? "#a6b0a0" : "#738b83"), [
      [x + k * 2.1 - 2, y - 4 + Math.abs(k) * 0.4],
      [x + k * 2.1 + 3, y - 1 - Math.abs(k) * 0.25]
    ]);
  }
  if (!chicks) {
    for (let i = 0; i < 2; i++)
      ellipse(ink("#e9e0c7", "#bac9c5"), x - 2 + i * 4, y - 5, 1.5, 1.5);
  } else
    for (let i = 0; i < chicks; i++) {
      const lift = Math.sin(time2 / 650 + i * 2) > 0.2 ? 2 : 0;
      ellipse(ink("#c7b483", "#99aa97"), x - 4 + i * 4, y - 5 - lift, 2, 2);
      p(ink("#ba865b", "#9c9c80"), x - 3 + i * 4, y - 6 - lift, 2, 1);
    }
}
function drawStrayCat(ctx, at2, pose, time2, facing = 1, night = false) {
  const { ink, p, ellipse, line } = environmentInk(ctx, night);
  const fur = ink("#b69373", "#899187"), shade = ink("#876d57", "#65766f");
  const white = ink("#e3d6bc", "#b0beb4"), eye = ink("#465346", "#d5d0a2");
  ctx.save();
  ctx.translate(Math.round(at2[0]), Math.round(at2[1]));
  ctx.scale(facing, 1);
  if (pose === "sleep" || pose === "roll") {
    const roll = pose === "roll" ? Math.sin(time2 / 600) * 0.12 : 0;
    ctx.rotate(roll);
    ellipse(fur, 0, -5, 12, 6);
    ellipse(white, 2, -4, 6, 3);
    line(
      shade,
      [
        [-8, -4],
        [-5, -8],
        [2, -9],
        [7, -7]
      ],
      2
    );
    ellipse(fur, 7, -5, 5, 4);
    p(shade, 7, -5, 3, 1);
    line(
      shade,
      [
        [-10, -5],
        [-13, -6],
        [-14, -4],
        [-11, -2],
        [-5, -2]
      ],
      2
    );
  } else {
    const seated = pose === "sit" || pose === "groom";
    const stretch = pose === "stretch", sniff = pose === "sniff", pounce = pose === "pounce";
    const phase = Math.floor(time2 / 130) % 4;
    const bob = pose === "walk" ? phase % 2 : 0;
    const bodyX = seated ? -3 : stretch ? -3 : -2;
    const bodyY = seated ? -10 : stretch || pounce ? -6 : -10 - bob;
    ellipse(fur, bodyX, bodyY, seated ? 7 : 11, seated ? 8 : stretch ? 4 : 6);
    ellipse(
      white,
      seated ? 1 : 4,
      seated ? -7 : bodyY + 2,
      seated ? 3 : 5,
      seated ? 5 : 3
    );
    for (let i = 0; i < 4; i++) {
      const root = seated ? -6 + i * 3 : -10 + i * 6;
      const step = pose === "walk" ? [0, 2, 0, -2][(phase + i % 2 * 2) % 4] : pounce && i > 1 ? 4 : 0;
      line(
        i % 2 ? shade : fur,
        [
          [root, -6],
          [root + step, -2],
          [root + step + 2, -1]
        ],
        seated && i < 2 ? 3 : 2
      );
    }
    const headX = seated ? 3 : stretch ? 13 : sniff ? 12 : 9;
    const headY = seated ? -18 : stretch || pounce ? -6 : sniff ? -7 : -15 - bob;
    ellipse(fur, headX, headY, 5, 4);
    line(
      fur,
      [
        [headX - 4, headY - 1],
        [headX - 4, headY - 6],
        [headX - 1, headY - 4]
      ],
      2
    );
    line(
      fur,
      [
        [headX + 2, headY - 3],
        [headX + 4, headY - 6],
        [headX + 5, headY - 1]
      ],
      2
    );
    p(ink("#c2a195", "#96a29a"), headX - 3, headY - 4, 1, 2);
    p(white, headX + 2, headY + 2, 4, 2);
    p(shade, headX + 5, headY + 1);
    if (Math.floor(time2 / 210) % 41 === 0) p(shade, headX + 1, headY, 2, 1);
    else p(eye, headX + 2, headY - 1);
    for (let i = 0; i < 3; i++)
      line(
        shade,
        [
          [-7 + i * 5, bodyY - 4],
          [-5 + i * 5, bodyY]
        ],
        1
      );
    p(shade, headX - 2, headY - 3, 3, 1);
    if (pose === "groom")
      line(
        fur,
        [
          [3, -7],
          [10, -12],
          [7, -15 + Math.sin(time2 / 250) * 2]
        ],
        3
      );
    const tip = Math.sin(time2 / 1700) * 2;
    line(
      shade,
      [
        [-11, -7],
        [-16, -10],
        [-18, -16 + tip],
        [-16, -19 + tip]
      ],
      3
    );
    line(
      fur,
      [
        [-11, -8],
        [-15, -11],
        [-17, -16 + tip]
      ],
      2
    );
  }
  ctx.restore();
}
function drawSmallMammal(ctx, at2, kind, time2, facing = 1, night = false, sleeping = false) {
  const { ink, p, ellipse, line } = environmentInk(ctx, night);
  ctx.save();
  ctx.translate(Math.round(at2[0]), Math.round(at2[1]));
  ctx.scale(facing, 1);
  const fur = kind === "squirrel" ? ink("#b28e68", "#87988a") : ink("#9a9890", "#798c8c");
  const shade = ink("#716b5c", "#526c71");
  if (kind === "squirrel") {
    line(
      shade,
      [
        [-5, -4],
        [-11, -7],
        [-14, -15],
        [-11, -22],
        [-5, -20],
        [-4, -14]
      ],
      5
    );
    line(
      fur,
      [
        [-6, -4],
        [-10, -9],
        [-12, -16],
        [-10, -20],
        [-6, -19]
      ],
      4
    );
  } else
    line(
      ink("#b5a899", "#9aaba7"),
      [
        [-6, -2],
        [-13, -2],
        [-17, -5]
      ],
      1
    );
  ellipse(fur, 0, -5, kind === "squirrel" ? 7 : 6, kind === "squirrel" ? 7 : 4);
  ellipse(fur, 5, -10, 4, 3);
  ellipse(fur, 2, -13, 2, 2);
  p(ink("#323f39", "#d9d5b8"), 7, -11);
  p(ink("#c2a59a", "#9eb1ad"), 9, -9);
  if (!sleeping) {
    p(shade, -4 + Math.sin(time2 / 150) * 1.5, -1, 4, 1);
    p(shade, 4, -1, 3, 1);
  } else p(shade, 6, -10, 2, 1);
  ctx.restore();
}
function drawInsect(ctx, at2, kind, time2, resting = false, night = false) {
  const { ink, p, ellipse, line } = environmentInk(ctx, night);
  const [x, y] = at2;
  const flap = resting ? Math.max(0.1, Math.sin(time2 / 2400) * 0.5 + 0.4) : 0.45 + Math.abs(Math.sin(time2 / 100)) * 0.55;
  if (kind === "bee") {
    if (!resting) {
      ellipse(ink("#d4e0d2", "#91b1b6"), x - 2, y - 4, 3, 2 * flap);
      ellipse(ink("#d4e0d2", "#91b1b6"), x + 2, y - 4, 3, 2 * flap);
    }
    ellipse(ink("#d5b25d", "#b2ad7c"), x, y, 4, 2);
    p(ink("#5d5844", "#596d69"), x - 2, y - 1, 1, 3);
    p(ink("#5d5844", "#596d69"), x + 1, y - 1, 1, 3);
  } else if (kind === "dragonfly") {
    const wing = ink("#b9d3ca", "#7fadb2");
    line(wing, [
      [x - 6, y - 3 * flap],
      [x + 6, y + 2 * flap]
    ]);
    line(wing, [
      [x - 6, y + 2 * flap],
      [x + 6, y - 3 * flap]
    ]);
    line(ink("#497b79", "#8bb5ad"), [
      [x, y - 3],
      [x, y + 5]
    ]);
    p(ink("#4c665b", "#a3c0ad"), x - 1, y - 4, 3, 1);
  } else if (kind === "ladybird") {
    ellipse(ink("#a66b55", "#8d8974"), x, y, 3, 2);
    p(ink("#515b4c", "#a4bab1"), x, y - 2, 1, 4);
    p("#4c5247", x - 2, y);
    p("#4c5247", x + 2, y - 1);
  } else {
    const moth = kind === "moth";
    const base = moth ? ink("#c7bd9d", "#c8c6ac") : ink("#c3a1ac", "#9eaabd");
    const spot = moth ? ink("#9c927c", "#899da2") : ink("#7c8290", "#6f8fa1");
    ellipse(base, x - 3 * flap, y - 2, 3.5 * flap, 3);
    ellipse(base, x + 3 * flap, y - 2, 3.5 * flap, 3);
    ellipse(base, x - 2 * flap, y + 2, 2.5 * flap, 2);
    ellipse(base, x + 2 * flap, y + 2, 2.5 * flap, 2);
    p(spot, x - 4 * flap, y - 2);
    p(spot, x + 3 * flap, y - 2);
    line(ink("#696854", "#a9b7ad"), [
      [x, y - 4],
      [x, y + 3]
    ]);
  }
}
function drawGardenLeaf(ctx, at2, angle, night, petal = false, size = 1) {
  const { ink, p, line } = environmentInk(ctx, night);
  ctx.save();
  ctx.translate(Math.round(at2[0]), Math.round(at2[1]));
  ctx.rotate(angle);
  const color = petal ? ink("#dab5ad", "#b4afb8") : ink("#ab965f", "#8c9f8a");
  for (let y = -4; y <= 4; y++) {
    const w = Math.max(1, 5 - Math.abs(y));
    p(color, -w * size / 2, y * size, w * size, size);
  }
  if (!petal)
    line(ink("#776e4f", "#627f77"), [
      [0, -4 * size],
      [0, 5 * size]
    ]);
  ctx.restore();
}

var mixPoint = (a, b, p) => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p];
function environmentPathAt(space, progress) {
  const path = space.route;
  const lengths = path.slice(1).map(
    (point, i) => Math.hypot(point[0] - path[i][0], point[1] - path[i][1])
  );
  let remaining = lengths.reduce((sum, length) => sum + length, 0) * Math.max(0, Math.min(1, progress));
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const p = lengths[i] ? remaining / lengths[i] : 0;
      const a = path[i], b = path[i + 1];
      const world = [
        a[0] + (b[0] - a[0]) * p,
        a[1] + (b[1] - a[1]) * p,
        a[2] + (b[2] - a[2]) * p
      ];
      const screenA = space.project(a), screenB = space.project(b);
      return {
        world,
        at: space.project(world),
        direction: screenB[0] >= screenA[0] ? 1 : -1
      };
    }
    remaining -= lengths[i];
  }
  return { world: path[0], at: space.project(path[0]), direction: 1 };
}

var clamp = (n) => Math.max(0, Math.min(1, n));
var ease = (n) => {
  const p = clamp(n);
  return p * p * (3 - 2 * p);
};
var offset = (p, x, y) => [p[0] + x, p[1] + y];
var along = (surface, distance2) => offset(surface.at, surface.along[0] * distance2, surface.along[1] * distance2);
function drawEnvironmentStory(ctx, story, space, options) {
  const time2 = options.reduced ? 24e3 : options.elapsedMs;
  const s = time2 / 1e3, v = story.variation, night = options.night;
  const { ink, p, ellipse, line } = environmentInk(ctx, night);
  const supports = [];
  let animal;
  const use = (surface) => {
    supports.push(surface.at);
    return surface.at;
  };
  const curve = (from2, to, amount, lift) => {
    const at2 = mixPoint(from2, to, clamp(amount));
    return [at2[0], at2[1] - Math.sin(clamp(amount) * Math.PI) * lift];
  };
  function onSurface(surface, paint, shift = 0) {
    let world = surface.world;
    if (world && shift) {
      const origin = space.project(world), u = space.project([world[0] + 1, world[1], world[2]]), v2 = space.project([world[0], world[1] + 1, world[2]]);
      const ux = u[0] - origin[0], uy = u[1] - origin[1], vx = v2[0] - origin[0], vy = v2[1] - origin[1], det = ux * vy - uy * vx;
      const dx = surface.along[0] * shift, dy = surface.along[1] * shift;
      world = [
        world[0] + (dx * vy - dy * vx) / det,
        world[1] + (dy * ux - dx * uy) / det,
        world[2]
      ];
    }
    if (world && options.actor) options.actor(world, paint);
    else paint(ctx);
  }
  function birdOn(surface, kind, shift = 0, action, facing = 1) {
    onSurface(
      surface,
      (g) => drawWildBird(
        g,
        along(surface, shift),
        kind,
        time2,
        { action, facing },
        night
      ),
      shift
    );
  }
  function clipWindow(paint) {
    ctx.save();
    ctx.beginPath();
    space.window.forEach(
      ([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
    );
    ctx.closePath();
    ctx.clip();
    paint();
    ctx.restore();
  }
  function reflection(paint) {
    if (space.windowMaterial !== "glass") return;
    clipWindow(() => {
      ctx.save();
      ctx.globalAlpha *= 0.18;
      ctx.translate(3, -1);
      paint();
      ctx.restore();
    });
  }
  function feather(at2, tilt = 0) {
    const end = offset(at2, Math.sin(tilt) * 5, -9);
    line(ink("#d4d0bd", "#9bb5b5"), [at2, end]);
    for (let i = 1; i < 6; i++) {
      const a = mixPoint(at2, end, i / 7);
      line(ink("#e6dfca", "#b5c7c0"), [
        offset(a, -3 + i / 3, 1),
        a,
        offset(a, 2, -2)
      ]);
    }
  }
  function seed(at2, shiny = false, g = ctx) {
    const { ink: ink2, ellipse: ellipse2, p: p2 } = environmentInk(g, night);
    ellipse2(
      ink2(shiny ? "#c6b36b" : "#ad9162", shiny ? "#b4b992" : "#8eaa94"),
      at2[0],
      at2[1] - 1,
      2,
      1.5
    );
    p2(ink2("#e4d4a2", "#cbd4bc"), at2[0] - 1, at2[1] - 2);
  }
  function snail(at2, turn = 1, trail = false) {
    const [x, y] = at2;
    if (trail) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      line(ink("#b1c4b2", "#8fb9b8"), [
        [x - 17 * turn, y + 1],
        [x - 12 * turn, y - 1],
        [x - 8 * turn, y]
      ]);
      ctx.restore();
    }
    ellipse(ink("#8d9c6b", "#749b8b"), x + turn, y, 5, 1.5);
    ellipse(ink("#b59b70", "#9eb09a"), x - turn, y - 3, 3, 3);
    line(ink("#7e7258", "#6f8e84"), [
      [x - 2 * turn, y - 3],
      [x, y - 4],
      [x + turn, y - 2],
      [x - turn, y - 1]
    ]);
    for (const n of [-1, 1])
      line(ink("#798b63", "#a3c1ae"), [
        [x + 4 * turn, y - 1],
        [x + (5 + n) * turn, y - 4 + Math.sin(s * 0.9 + n)]
      ]);
  }
  function flower(at2, opening = 1) {
    line(ink("#6d8b5c", "#6b9482"), [at2, offset(at2, 1, -10)]);
    drawGardenLeaf(ctx, offset(at2, -2, -4), -0.8, night, false, 0.45);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      ellipse(
        ink("#d6b5ac", "#aab8b7"),
        at2[0] + 1 + Math.cos(a) * 3 * opening,
        at2[1] - 10 + Math.sin(a) * 2 * opening,
        Math.max(1, 2 * opening),
        1.5
      );
    }
    p(ink("#d3b371", "#b5b997"), at2[0], at2[1] - 11, 2, 2);
  }
  function web(kind) {
    const origin = space.window[space.webCorner === "bottom-right" ? 2 : space.webCorner === "bottom" ? 3 : 0], right = space.window[space.webCorner === "bottom-right" ? 3 : space.webCorner === "bottom" ? 2 : 1], bottom = space.window[space.webCorner === "bottom-right" ? 1 : space.webCorner === "bottom" ? 0 : 3];
    supports.push(
      origin,
      mixPoint(origin, right, 0.55),
      mixPoint(origin, bottom, 0.3)
    );
    const axis = mixPoint(
      origin,
      right,
      Math.min(
        0.65,
        24 / Math.max(1, Math.hypot(right[0] - origin[0], right[1] - origin[1]))
      )
    );
    const down = mixPoint(
      origin,
      bottom,
      Math.min(
        0.5,
        25 / Math.max(1, Math.hypot(bottom[0] - origin[0], bottom[1] - origin[1]))
      )
    );
    clipWindow(() => {
      ctx.save();
      ctx.globalAlpha = night ? 0.48 : 0.4;
      const thread = ink("#ccd4c9", "#b4c9c8");
      const rays = Array.from(
        { length: 7 },
        (_, i) => mixPoint(axis, down, i / 6)
      );
      for (const end of rays) line(thread, [origin, end]);
      for (const q of [0.24, 0.47, 0.71, 1]) {
        const points = rays.map(
          (end, i) => offset(
            mixPoint(origin, end, q),
            kind === 4 ? Math.sin(s / 2 + i * 0.2) * q : 0,
            0
          )
        );
        line(thread, points);
      }
      ctx.restore();
      if (kind === 1 || kind === 3)
        for (let i = 0; i < 4; i++) {
          const a = mixPoint(origin, rays[1 + i], 0.5 + i * 0.1);
          ellipse(ink("#d6e3d9", "#d0e1d8"), a[0], a[1], 1.2, 1.2);
        }
      if (kind === 3)
        drawGardenLeaf(
          ctx,
          mixPoint(origin, rays[3], 0.8),
          0.6 + Math.sin(s) * 0.08,
          night,
          true,
          0.6
        );
      const at2 = mixPoint(origin, rays[2], 0.55 + Math.sin(s / 5) * 0.2);
      ellipse(ink("#746c56", "#a3b7ad"), at2[0], at2[1], 1.6, 2);
      line(ink("#8e8b73", "#8ba9a5"), [
        offset(at2, -3, -2),
        at2,
        offset(at2, 3, 1)
      ]);
    });
  }
  function floorAnimal(pose, progress, kind = "cat", facing, lift = 0, carried, opacity = 1) {
    const frame = environmentPathAt(space, progress);
    animal = frame.world;
    const paint = (g) => {
      g.save();
      g.globalAlpha *= opacity;
      const art = environmentInk(g, night);
      g.save();
      g.globalAlpha *= 0.18;
      art.ellipse(
        "#283e3c",
        frame.at[0] + 1,
        frame.at[1] + 1,
        kind === "cat" ? 11 : 6,
        2
      );
      g.restore();
      const at2 = offset(frame.at, 0, -lift);
      if (kind === "cat")
        drawStrayCat(g, at2, pose, time2, facing ?? frame.direction, night);
      else
        drawSmallMammal(
          g,
          at2,
          kind,
          time2,
          facing ?? frame.direction,
          night,
          pose === "sleep"
        );
      carried?.(g, at2, facing ?? frame.direction);
      g.restore();
    };
    if (options.actor) options.actor(frame.world, paint);
    else paint(ctx);
  }
  switch (story.family) {
    case "nest": {
      const at2 = use(space.nest), beat = s % 40;
      drawWovenNest(
        ctx,
        at2,
        night,
        v === 0 ? 0.82 + clamp(s / 18) * 0.18 : 1,
        v === 1 ? 3 : v === 2 && beat > 8 ? 1 : 0,
        time2
      );
      if (v === 4)
        drawWildBird(
          ctx,
          offset(at2, 3, -3),
          "sparrow",
          time2,
          { action: "sleep" },
          night
        );
      else {
        const perch = offset(at2, 8, -2), away = [at2[0] < 240 ? -22 : 502, at2[1] - 75];
        const outward = beat > 4 && beat < 8, inward = beat >= 11 && beat < 15;
        const flight = outward || inward;
        const pos = outward ? curve(perch, away, ease((beat - 4) / 4), 8) : inward ? curve(away, perch, ease((beat - 11) / 4), 8) : perch;
        if (beat < 8 || beat >= 11)
          drawWildBird(
            ctx,
            pos,
            "sparrow",
            time2,
            {
              flying: flight,
              facing: (away[0] > perch[0] ? 1 : -1) * (outward ? 1 : -1),
              twig: v === 0,
              action: v === 1 && !flight ? "tap" : void 0
            },
            night
          );
        if (v === 3)
          line(ink("#b5a17b", "#a2b3a1"), [
            offset(at2, -8, -3),
            offset(at2, -12, -7 + Math.sin(s * 1.5) * 2)
          ]);
      }
      break;
    }
    case "sparrow": {
      const at2 = use(space.sill), beat = s % 30;
      if (v === 0) {
        const tap = beat % 8 > 5;
        reflection(
          () => drawWildBird(
            ctx,
            along(space.sill, -4),
            "sparrow",
            time2,
            { action: tap ? "tap" : void 0 },
            night
          )
        );
        birdOn(space.sill, "sparrow", -4, tap ? "tap" : void 0);
      } else if (v === 1) {
        birdOn(space.sill, "sparrow", -5, "preen");
        ctx.save();
        ctx.globalAlpha *= ease(beat / 0.8) * ease((30 - beat) / 1);
        feather(
          offset(at2, 9 + Math.sin(s) * 2, -2 - Math.max(0, 8 - beat) * 1.8),
          Math.sin(s / 2) * 0.4
        );
        ctx.restore();
      } else if (v === 2) {
        birdOn(space.sill, "sparrow", -9, beat % 8 > 4 ? "tap" : void 0);
        birdOn(space.sill, "sparrow", 12, void 0, -1);
        seed(along(space.sill, Math.sin(s / 5) * 3));
      } else if (v === 3) {
        const hop = ease((beat - 8) / 2) - ease((beat - 22) / 2);
        const at3 = offset(
          along(space.sill, -6 + hop * 14),
          0,
          -Math.abs(Math.sin(hop * Math.PI)) * 3
        );
        onSurface(
          space.sill,
          (g) => drawWildBird(
            g,
            at3,
            "sparrow",
            time2,
            { action: beat % 9 < 2 ? "stretch" : void 0 },
            night
          ),
          -6 + hop * 14
        );
      } else
        for (let i = 0; i < 3; i++)
          birdOn(
            space.sill,
            "sparrow",
            -13 + i * 12,
            void 0,
            i === 1 ? -1 : 1
          );
      break;
    }
    case "swallow": {
      const perchSurface = space.eave.at[1] < 16 ? space.sill : space.eave;
      use(perchSurface);
      const phase = s % 24 / 24;
      if (v === 0) {
        const beat = s % 32, perch = perchSurface.at, away = [perch[0] < 240 ? -25 : 505, perch[1] - 55];
        const out = beat > 3 && beat < 7, back = beat >= 12 && beat < 16;
        if (beat < 7 || beat >= 12) {
          const at2 = out ? curve(perch, away, ease((beat - 3) / 4), 12) : back ? curve(away, perch, ease((beat - 12) / 4), 12) : perch;
          drawWildBird(
            ctx,
            at2,
            "swallow",
            time2,
            {
              flying: out || back,
              facing: (away[0] > perch[0] ? 1 : -1) * (out ? 1 : -1)
            },
            night
          );
        }
      } else if (v === 1 || v === 4)
        birdOn(perchSurface, "swallow", v === 1 ? 0 : Math.sin(s / 3) * 2);
      else {
        const left = mixPoint(space.window[0], space.window[3], 0.5), right = mixPoint(space.window[1], space.window[2], 0.5), span = Math.hypot(right[0] - left[0], right[1] - left[1]), margin = 24 / Math.max(1, span);
        const start = [
          left[0] - (right[0] - left[0]) * margin,
          left[1] - (right[1] - left[1]) * margin
        ];
        const end = [
          right[0] + (right[0] - left[0]) * margin,
          right[1] + (right[1] - left[1]) * margin
        ];
        const pos = curve(start, end, phase, 4);
        birdOn(space.sill, "swallow", -7, void 0, -1);
        if (v === 3)
          clipWindow(() => {
            ctx.save();
            ctx.globalAlpha = 0.22;
            const shadow = mixPoint(space.window[0], space.window[2], 0.5);
            drawWildBird(
              ctx,
              offset(shadow, Math.sin(s / 3) * 4, 0),
              "swallow",
              time2,
              { flying: true },
              true
            );
            ctx.restore();
          });
        const paint = () => {
          drawWildBird(ctx, pos, "swallow", time2, { flying: true }, night);
        };
        clipWindow(() => {
          ctx.save();
          if (space.windowMaterial === "paper") ctx.globalAlpha *= 0.3;
          paint();
          ctx.restore();
        });
      }
      break;
    }
    case "crow": {
      const surface = v === 3 ? space.soil : v === 2 ? space.nest : space.sill;
      const at2 = use(surface), beat = s % 24;
      birdOn(
        surface,
        "crow",
        v === 3 ? 0 : v === 4 ? Math.sin(s / 5) * 8 : -5,
        v === 1 && beat % 8 > 4 ? "tap" : void 0
      );
      if (v === 0) seed(along(surface, 9 + Math.sin(s / 4)), true);
      if (v === 2)
        line(ink("#a58a60", "#839d8b"), [
          offset(at2, 4, -7),
          offset(at2, 17, -8 + Math.sin(s / 3) * 4)
        ]);
      if (v === 4) seed(along(surface, Math.sin(s / 5) * 11 + 6));
      break;
    }
    case "cat":
    case "cat-play": {
      const beat = s % 88;
      if (beat >= 77) break;
      const entering = beat < 9, leaving = beat > 65;
      const dwellProgress = (at2) => story.family === "cat" ? v === 3 ? 0.18 : v === 4 ? 0.7 + Math.sin((at2 - 9) / 7) * 0.28 : 1 : v < 2 ? 0.82 + Math.sin((at2 - 9) / 3) * 0.12 : 1;
      const progress = entering ? dwellProgress(9) * beat / 9 : leaving ? dwellProgress(65) * (1 - (beat - 65) / 12) : dwellProgress(beat);
      let pose = entering || leaving ? "walk" : "sleep";
      let lift = 0;
      let carried;
      let backward = leaving;
      if (!entering && !leaving) {
        if (story.family === "cat") {
          pose = ["sleep", "groom", "sniff", "sleep", "sit"][v];
          if (v === 4) {
            backward = Math.cos((beat - 9) / 7) < 0;
            pose = "walk";
          }
        } else {
          pose = ["pounce", "pounce", "sit", "stretch", "roll"][v];
          if (v < 2) {
            backward = Math.cos((beat - 9) / 3) < 0;
            lift = Math.max(0, Math.sin(beat * 1.4)) * 4;
          }
          if (v === 0)
            carried = (g, at2, facing) => drawGardenLeaf(
              g,
              offset(at2, facing * 15, lift),
              Math.sin(beat / 2),
              night,
              false,
              0.6
            );
          if (v === 1)
            carried = (g, at2, facing) => environmentInk(g, night).p(
              ink("#ece2b0", "#a4bab1"),
              at2[0] + facing * 15,
              at2[1] + lift,
              2,
              1
            );
        }
      }
      floorAnimal(
        pose,
        progress,
        "cat",
        environmentPathAt(space, progress).direction * (backward ? -1 : 1),
        lift,
        carried,
        ease(beat / 0.7) * ease((77 - beat) / 0.7)
      );
      supports.push(environmentPathAt(space, progress).at);
      break;
    }
    case "squirrel": {
      const beat = s % 60;
      if (v === 1 || v === 2) {
        const at2 = use(space.sill);
        onSurface(space.sill, (g) => {
          drawSmallMammal(g, at2, "squirrel", time2, 1, night, v === 2);
          if (v === 1) seed(offset(at2, 8, -9), false, g);
        });
      } else if (v === 3) {
        const at2 = use(space.nest);
        onSurface(
          space.nest,
          (g) => drawSmallMammal(
            g,
            offset(at2, Math.sin(s / 3) * 3, 0),
            "squirrel",
            time2,
            1,
            night
          )
        );
      } else {
        const progress = v === 4 ? 0.5 + Math.sin(s / 4) * 0.4 : beat < 8 ? beat / 8 : beat > 48 ? clamp(1 - (beat - 48) / 12) : 1;
        const backward = v === 4 ? Math.cos(s / 4) < 0 : beat > 48;
        floorAnimal(
          beat < 8 || backward || v === 4 ? "walk" : "groom",
          progress,
          "squirrel",
          environmentPathAt(space, progress).direction * (backward ? -1 : 1),
          0,
          (g, at3, facing) => seed(offset(at3, facing * 8, -8), false, g)
        );
        const at2 = environmentPathAt(space, progress).at;
        supports.push(at2);
      }
      break;
    }
    case "mouse": {
      const period = v === 4 ? 4 : v === 2 ? 7 : 14;
      const progress = v === 0 ? 0.08 + Math.sin(s / 3) * 0.06 : 0.5 - Math.cos(s / period) * 0.5;
      const backward = v === 0 ? Math.cos(s / 3) < 0 : Math.sin(s / period) < 0;
      floorAnimal(
        v === 0 ? "sniff" : "walk",
        progress,
        "mouse",
        environmentPathAt(space, progress).direction * (backward ? -1 : 1),
        0,
        v === 1 ? (g, at3, facing) => seed(offset(at3, facing * 8, -7), false, g) : v === 3 ? (g, at3) => drawGardenLeaf(g, offset(at3, 1, -7), 0.45, night, false, 1.1) : void 0
      );
      const at2 = environmentPathAt(space, progress).at;
      supports.push(at2);
      break;
    }
    case "snail": {
      const surface = v === 1 || v === 3 ? space.plant : space.soil;
      const at2 = use(surface);
      if (v === 2) {
        const pos = mixPoint(
          space.window[3],
          space.window[0],
          0.1 + (1 - Math.cos(s / 100)) * 0.25
        );
        ctx.save();
        ctx.translate(pos[0], pos[1]);
        ctx.rotate(-Math.PI / 2 * Math.tanh(Math.sin(s / 100) * 18));
        snail([0, 0], 1, true);
        ctx.restore();
        supports.push(pos);
      } else {
        const pos = along(
          surface,
          surface.kind === "leaf" ? 0 : Math.sin(s / 35) * 5
        );
        snail(pos, 1, v === 4);
        if (v === 3)
          ellipse(ink("#c9ded0", "#afd1cd"), at2[0] + 7, at2[1] - 2, 1.5, 2);
      }
      break;
    }
    case "butterfly":
    case "bee":
    case "dragonfly":
    case "moth": {
      const kind = story.family;
      const base = kind === "moth" && v === 1 ? space.window[0] : kind === "butterfly" && v === 2 ? mixPoint(space.window[0], space.window[2], 0.55) : use(
        kind === "dragonfly" && v < 3 || kind === "moth" && v === 2 ? space.sill : kind === "moth" ? space.eave : space.plant
      );
      if (kind === "moth" && v === 1) supports.push(base);
      if (kind === "butterfly" && v === 2) supports.push(base);
      const center = kind === "moth" && (v === 0 || v === 3 || v === 4) ? space.lamp : base;
      const beat = s % 25;
      const restAt = v === 1 ? 6 : v === 3 ? 4 : v === 0 ? 13 : Infinity;
      const landed = ease((beat - restAt) / 2) * (1 - ease((beat - 23) / 2));
      const flightShare = kind === "moth" && !night ? 0 : 1 - landed;
      const resting = flightShare < 0.1;
      const movement = kind === "bee" && v === 2 ? [Math.sin(s * 1.3) * 17, Math.sin(s * 2.6) * 7] : kind === "dragonfly" && v === 0 ? [Math.sin(s / 4) * 2, Math.sin(s / 2) * 1] : [
        Math.cos(s * 0.8) * (v === 4 ? 11 : 17),
        Math.sin(s * 1.1) * 8 - 10
      ];
      const perch = offset(base, 0, -2);
      const pos = mixPoint(
        perch,
        offset(center, movement[0], movement[1]),
        flightShare
      );
      if (v === 2 && (kind === "butterfly" || kind === "moth"))
        reflection(
          () => drawInsect(ctx, offset(pos, 2, -1), kind, time2, false, night)
        );
      if (v === 3 && kind === "moth" || v === 4 && kind === "dragonfly")
        clipWindow(() => {
          ctx.save();
          ctx.globalAlpha = 0.15;
          const a = mixPoint(space.window[0], space.window[2], 0.55);
          ellipse("#253c39", a[0] + movement[0] * 0.5, a[1], 7, 2);
          ctx.restore();
        });
      const perchSurface = kind === "moth" ? v === 2 ? space.sill : space.eave : kind === "dragonfly" && v < 3 ? space.sill : space.plant;
      if (resting)
        onSurface(
          perchSurface,
          (g) => drawInsect(g, pos, kind, time2, true, night)
        );
      else drawInsect(ctx, pos, kind, time2, false, night);
      if (v === 1 && kind === "butterfly" || v === 4 && (kind === "bee" || kind === "moth") || v === 2 && kind === "dragonfly") {
        const paintPair = (g) => drawInsect(
          g,
          mixPoint(
            offset(base, 7, -3),
            offset(center, -movement[0] * 0.8, -movement[1] - 13),
            flightShare
          ),
          kind,
          time2 + 110,
          resting,
          night
        );
        if (resting) onSurface(perchSurface, paintPair);
        else paintPair(ctx);
      }
      if (kind === "bee" && v === 0) {
        p(ink("#d5b36f", "#bec7a1"), pos[0] - 3, pos[1] + 3);
        p(ink("#d5b36f", "#bec7a1"), pos[0] + 2, pos[1] + 3);
      }
      break;
    }
    case "web": {
      if (v === 2) {
        const at2 = use(space.eave), down = 5 + (Math.sin(s / 7) + 1) * 13;
        ctx.save();
        ctx.globalAlpha = 0.45;
        line(ink("#c7d1c7", "#bad0cd"), [at2, offset(at2, 0, down)]);
        ctx.restore();
        ellipse(ink("#7d7763", "#a1b7af"), at2[0], at2[1] + down, 1.5, 2);
      } else web(v);
      break;
    }
    case "plant": {
      const at2 = use(space.soil), bloom = (Math.sin(s / 15) + 1) / 2;
      if (v === 0) flower(at2, 0.35 + bloom * 0.65);
      if (v === 1 || v === 3) {
        line(ink("#648257", "#709886"), [at2, offset(at2, 0, -8)]);
        drawGardenLeaf(
          ctx,
          offset(at2, 2, -8),
          -0.3 + bloom * 0.3,
          night,
          false,
          0.7
        );
        if (v === 3) {
          line(ink("#7a9b69", "#82a48e"), [
            offset(at2, -5, 0),
            offset(at2, -5, -5)
          ]);
          drawGardenLeaf(ctx, offset(at2, -7, -5), -0.7, night, false, 0.4);
        }
      }
      if (v === 2) {
        line(ink("#648257", "#709886"), [at2, offset(at2, 0, -7)]);
        ellipse(ink("#b7a97b", "#9aaf9e"), at2[0], at2[1] - 8, 3, 5);
        line(ink("#7d7a5d", "#78998d"), [
          offset(at2, 0, -11),
          offset(at2, 1 + bloom * 2, -3)
        ]);
        seed(offset(at2, bloom * 4, -2));
      }
      if (v === 4) {
        const top = use(space.plant);
        for (let i = 0; i < 4; i++)
          ellipse(
            ink("#b77966", "#98a591"),
            top[0] - 4 + i * 2.5,
            top[1] + Math.abs(i - 1) * 2,
            2,
            2
          );
        birdOn(space.plant, "sparrow", 0, void 0, -1);
      }
      break;
    }
    case "leaf":
    case "petal": {
      const petal = story.family === "petal";
      const surface = petal ? v === 1 || v === 3 ? space.soil : space.sill : v === 1 ? space.eave : v === 4 ? space.soil : space.sill;
      const at2 = use(surface), beat = s % 22 / 22;
      if (v === 2 && !petal) {
        for (let i = 0; i < 2; i++) {
          const frame = environmentPathAt(
            space,
            0.15 + (Math.sin(s / 3 + i) + 1) * 0.055
          );
          supports.push(frame.at);
          const paint = (g) => drawGardenLeaf(
            g,
            offset(frame.at, 0, -2),
            Math.sin(s / 3 + i),
            night,
            false,
            0.7
          );
          if (options.actor) options.actor(frame.world, paint);
          else paint(ctx);
        }
      } else if (v === 2 && petal) {
        const stuck = space.windowMaterial === "glass" ? mixPoint(space.window[0], space.window[3], 0.68) : space.sill.at;
        drawGardenLeaf(ctx, stuck, 0.4, night, true, 0.65);
      } else if (v === 3 && !petal) {
        clipWindow(() => {
          ctx.save();
          ctx.globalAlpha = 0.2;
          drawGardenLeaf(
            ctx,
            offset(
              mixPoint(space.window[0], space.window[2], 0.55),
              Math.sin(s / 3) * 7,
              0
            ),
            Math.sin(s / 4),
            true,
            false,
            2
          );
          ctx.restore();
        });
      } else {
        const count = petal && (v === 0 || v === 3) ? 3 : v === 2 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const phase = (beat + i * 0.18) % 1;
          const falling = v === 0 || v === 3 || v === 1 && petal;
          const pos = falling ? offset(
            at2,
            Math.sin(phase * 7) * (v === 3 ? 11 : 5) + i * 3,
            -Math.max(0, 0.7 - phase) * 54
          ) : offset(along(surface, i * 5), 0, -3);
          ctx.save();
          if (falling)
            ctx.globalAlpha *= ease(phase / 0.08) * ease((1 - phase) / 0.08);
          drawGardenLeaf(
            ctx,
            pos,
            falling ? phase * 2 : Math.sin(s / 3) * 0.12 + 0.6,
            night,
            petal,
            petal ? 0.55 : 0.75
          );
          ctx.restore();
        }
        if (v === 4) {
          if (petal) feather(offset(at2, -5, 0), 0.5);
          else snail(offset(at2, 9, -1));
        }
      }
      break;
    }
    case "dew": {
      const surface = v === 0 ? space.plant : v === 4 ? space.eave : space.sill;
      const at2 = use(surface), phase = s % 15 / 15;
      if (v === 3) {
        web(0);
        const left = mixPoint(space.window[0], space.window[3], 0.4), right = mixPoint(space.window[1], space.window[2], 0.4);
        supports.push(left, right);
        const middle = offset(mixPoint(left, right, 0.5), 0, 3);
        ctx.save();
        ctx.globalAlpha = 0.4;
        line(ink("#c5d6cd", "#9dbfbd"), [left, middle, right]);
        ctx.restore();
        for (let i = 1; i < 5; i++) {
          const point = mixPoint(left, right, i / 5);
          ellipse(
            ink("#d6e3d9", "#d0e1d8"),
            point[0],
            point[1] + Math.sin(i / 5 * Math.PI) * 3,
            1,
            1.5
          );
        }
        break;
      }
      if (v === 1) {
        if (space.windowMaterial === "glass")
          clipWindow(() => {
            for (let i = 0; i < 4; i++) {
              const top = mixPoint(
                space.window[0],
                space.window[1],
                0.16 + i * 0.19
              );
              const travel = (s * 1.2 + i * 13) % 40;
              ctx.save();
              ctx.globalAlpha *= ease(travel / 3) * ease((40 - travel) / 4);
              ellipse(
                ink("#b8d0c6", "#8bb4ba"),
                top[0],
                top[1] + 12 + travel,
                1,
                2
              );
              ctx.restore();
            }
          });
        else {
          const drop = mixPoint(
            space.window[0],
            space.window[3],
            (1 - Math.cos(s / 15)) * 0.4 + 0.1
          );
          ellipse(ink("#b8d0c6", "#8bb4ba"), drop[0], drop[1], 1, 2);
        }
      } else {
        const end = surface.below ?? offset(at2, 0, 24);
        const dropAt = phase < 0.65 ? offset(at2, v === 0 ? phase * 5 : phase * 2, -1) : mixPoint(offset(at2, 3, 0), end, ((phase - 0.65) / 0.35) ** 2);
        const falling = clamp((phase - 0.65) / 0.35);
        onSurface(surface, (g) => {
          const paint = environmentInk(g, night);
          g.save();
          g.globalAlpha *= ease(phase / 0.1) * (1 - ease((falling - 0.9) / 0.1));
          paint.ellipse(
            ink("#afd0c4", "#96c5c8"),
            dropAt[0],
            dropAt[1],
            1.5,
            phase < 0.65 ? 1.5 : 2
          );
          paint.p(ink("#e4ead8", "#d3e4db"), dropAt[0], dropAt[1] - 1);
          if (falling > 0.9)
            paint.ellipse(
              ink("#b7d1c4", "#87b3b7"),
              end[0],
              end[1],
              2 + falling,
              1
            );
          g.restore();
        });
      }
      break;
    }
    case "wind": {
      const surface = v === 1 ? space.nest : v === 2 || v === 3 ? space.eave : space.plant;
      const at2 = use(surface), sway = Math.sin(s / 3) * 2;
      if (v === 1) feather(at2, sway / 8);
      else if (v === 2 || v === 3) {
        const ends = v === 3 ? 3 : 1;
        for (let i = 0; i < ends; i++) {
          const end = offset(at2, sway * (1 + i * 0.2) + i * 4, 15 + i * 3);
          line(ink("#9c9a7f", "#8fafa6"), [offset(at2, i * 2, 0), end]);
          if (v === 2) {
            ellipse(ink("#b1a67f", "#b0bba8"), end[0], end[1], 3, 2);
            line(ink("#9a8d68", "#9ab4a2"), [end, offset(end, sway, 7)]);
          } else seed(end);
        }
      } else {
        line(ink("#6f895e", "#769d8d"), [at2, offset(at2, sway, -6)]);
        drawGardenLeaf(ctx, offset(at2, sway, -7), sway / 12, night, false, 0.6);
        if (v === 4)
          drawInsect(
            ctx,
            offset(at2, sway, -10),
            "butterfly",
            time2,
            true,
            night
          );
        else
          drawGardenLeaf(
            ctx,
            offset(at2, -6 + Math.sin(s / 3 + 0.8), -3),
            -0.6,
            night,
            false,
            0.5
          );
      }
      break;
    }
    case "lichen": {
      const at2 = use(space.soil);
      if (v === 0)
        for (let i = 0; i < 9; i++)
          p(
            ink("#829368", "#6d9988"),
            at2[0] - 8 + i * 2,
            at2[1] + surfaceSlope(space.soil, i - 4),
            2,
            1 + i % 2
          );
      if (v === 0 || v === 1)
        for (let i = 0; i < (v === 1 ? 2 : 1); i++) {
          const x = at2[0] + i * 6, y = at2[1] - i;
          line(ink("#c9bea0", "#a8bdb0"), [
            [x, y],
            [x, y - 4]
          ]);
          ellipse(ink("#ad9878", "#8fa89c"), x, y - 4, 3.5, 2);
          p(ink("#d4c6a4", "#bfd1bf"), x - 2, y - 5, 3, 1);
        }
      if (v === 2) {
        const tip = offset(at2, 2 + Math.sin(s / 12), -8);
        line(ink("#64875f", "#6f9c89"), [
          at2,
          offset(at2, 0, -5),
          tip,
          offset(tip, -3, 0),
          offset(tip, -2, 3)
        ]);
      }
      if (v === 3) {
        const phase = clamp(s % 35 / 13);
        const seedAt = curve(offset(at2, 24, -44), at2, phase, 8);
        ctx.save();
        ctx.globalAlpha *= ease(s % 35 / 0.6) * ease((35 - s % 35) / 2);
        seed(seedAt);
        for (let i = 0; i < 5; i++)
          line(ink("#d4d8c1", "#b8d0c4"), [
            offset(seedAt, 0, -2),
            offset(seedAt, (i - 2) * 2, -8 + Math.abs(i - 2))
          ]);
        ctx.restore();
      }
      if (v === 1 || v === 4)
        drawInsect(
          ctx,
          along(space.soil, Math.sin(s / 17) * 7),
          "ladybird",
          time2,
          true,
          night
        );
      break;
    }
  }
  return { id: story.id, supports, ...animal ? { animal } : {} };
}
var surfaceSlope = (surface, amount) => surface.along[1] * amount;

var stopNode = {
  code: "code",
  work: "code",
  board: "board",
  library: "library",
  phone: "phone",
  handoff: "handoff",
  tea: "tea",
  meeting: "meeting",
  sleep: "sleep"
};
function zenStop(station, napping, night) {
  if (napping) return "sleep";
  switch (station) {
    case void 0:
      return void 0;
    case "tasks":
      return "board";
    case "coffee":
      return "tea";
    case "sofa":
      return night ? "sleep" : "tea";
    default:
      return station;
  }
}
var distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function route(graph, from2, to) {
  const best = /* @__PURE__ */ new Map([[from2, 0]]);
  const via = /* @__PURE__ */ new Map();
  const open = /* @__PURE__ */ new Set([from2]);
  while (open.size) {
    let here;
    for (const node of open)
      if (here === void 0 || (best.get(node) ?? 0) < (best.get(here) ?? 0))
        here = node;
    if (here === void 0 || here === to) break;
    open.delete(here);
    for (const [a, b] of graph.edges) {
      const next = a === here ? b : b === here ? a : void 0;
      if (next === void 0) continue;
      const cost = (best.get(here) ?? 0) + distance(graph.nodes[here], graph.nodes[next]);
      if (cost < (best.get(next) ?? Infinity)) {
        best.set(next, cost);
        via.set(next, here);
        open.add(next);
      }
    }
  }
  if (!best.has(to)) throw new Error(`No floor path from ${from2} to ${to}`);
  const chain = [to];
  for (let node = to; node !== from2; ) {
    const previous = via.get(node);
    if (previous === void 0) break;
    chain.unshift(node = previous);
  }
  return chain;
}
function walkAlong(graph, start, nodes) {
  const points = [start, ...nodes.map((node) => graph.nodes[node])];
  let length = 0;
  for (let i = 1; i < points.length; i++)
    length += distance(points[i - 1] ?? start, points[i] ?? start);
  return { points, nodes, length };
}
function walkAt(walk, covered) {
  let left = Math.max(0, covered);
  for (let i = 1; i < walk.points.length; i++) {
    const a = walk.points[i - 1], b = walk.points[i];
    if (!a || !b) break;
    const span = distance(a, b);
    if (left <= span) {
      const f = span === 0 ? 1 : left / span;
      return {
        point: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f],
        ahead: i
      };
    }
    left -= span;
  }
  const last = walk.points.at(-1) ?? [0, 0];
  return { point: last, ahead: walk.points.length - 1 };
}
function walkingAnimation(delta, animations) {
  const [dx, dy] = delta;
  if (dx === 0 && dy === 0) return "walk";
  const name = Math.abs(dy) > Math.abs(dx) * 0.75 ? dy < 0 ? "walkBack" : "walk" : dx < 0 ? "walkLeft" : "walkRight";
  return animations[name]?.length ? name : "walk";
}

var bindings = {
  zen: {
    nest: [86, 468],
    frame: { u: 123, v: 0, top: 115, width: 31, height: 99 },
    beam: [129, 1, 121],
    plant: [256, 30, 49],
    soil: [240, 30, 1],
    lamp: [11, 171, 20],
    entry: "ne",
    material: "paper",
    approach: [
      [208, -12, 0],
      [208, 8, 6],
      [184, 12, 6],
      [180, 44, 6]
    ]
  },
  court: {
    nest: [458, 480],
    frame: { u: 138, v: 0, top: 147, width: 32, height: 138 },
    ledge: [154, 0, 150],
    beam: [145, 0, 150],
    plant: [228, 22, 54],
    soil: [228, 22, 1],
    lamp: [8, 82, 90],
    entry: "door"
  },
  ubud: {
    nest: [15, 155],
    ledge: [2, 126, 140],
    beam: [2, 147, 140],
    frame: { u: 2, v: 91, top: 132, width: 70, height: 101, facing: "u" },
    plant: [205.5, 81, 52],
    soil: [212, 81, 16],
    lamp: [78, 3, 102],
    entry: "door",
    material: "open"
  },
  marrakech: {
    nest: [18, 179],
    ledge: [195, -1, 147],
    beam: [175, -1, 147],
    frame: {
      u: 180,
      v: 0,
      top: 124,
      width: 30,
      height: 106,
      webCorner: "bottom-right"
    },
    plant: [9, 157, 42],
    soil: [11, 157, 16],
    lamp: [81, 2, 110],
    entry: "east",
    material: "open",
    approach: [
      [220, 210, 0],
      [220, 184, 6],
      [220, 145, 6]
    ]
  },
  venice: {
    nest: { world: [204, 0, 151] },
    frame: {
      u: 171,
      v: 0,
      top: 145,
      width: 38,
      height: 94,
      webCorner: "bottom"
    },
    plant: [89, 7, 35],
    soil: [87, 7, 12],
    lamp: [214, 133, 57],
    entry: "southWest",
    approach: [
      [100, 203, -15],
      [100, 186, 5],
      [104, 170, 5]
    ]
  },
  dali: {
    nest: { world: [0, 158, 148] },
    frame: { u: 99, v: 2, top: 130, width: 104, height: 77 },
    plant: [219, 75, 40],
    soil: [220, 75, 15],
    lamp: [148, 25, 48],
    entry: "door"
  },
  alpine: {
    nest: { world: [205, 1, 148] },
    frame: { u: 165, v: 0, top: 137, width: 47, height: 112 },
    plant: [11, 48, 123],
    soil: [8, 48, 105],
    lamp: [28, 121, 90],
    entry: "door"
  },
  santorini: {
    nest: { world: [3, 167, 55] },
    frame: {
      u: 0.5,
      v: 144,
      top: 145,
      width: 46,
      height: 90,
      facing: "u",
      webCorner: "bottom"
    },
    plant: [329, 24, 69],
    soil: [324, 24, 20],
    lamp: [17, 87, 123],
    entry: "landing"
  }
};
function publicEnvironmentSpace(name, room, landscapes) {
  const binding = bindings[name];
  const project = (p) => landscapes.project(name, ...p);
  const surface = (point2, kind, along2 = [1, 0.5]) => ({ at: point2, along: along2, kind });
  const { u, v, top, width, height, facing = "v" } = binding.frame;
  const point = (across2, down) => project(
    facing === "v" ? [u + across2, v, top - down] : [u, v + width - across2, top - down]
  );
  const sillWorld = binding.ledge ?? (facing === "v" ? [u + width * 0.5, v, top - height] : [u, v + width * 0.5, top - height]);
  const corners = [
    point(0, 0),
    point(width, 0),
    point(width, height),
    point(0, height)
  ];
  const eaveWorld = binding.beam ?? ("world" in binding.nest ? binding.nest.world : facing === "v" ? [u + width * 0.2, v, top] : [u, v + width * 0.8, top]);
  const across = facing === "v" ? [1, 0.5] : [1, -0.5];
  const nest = "world" in binding.nest ? {
    ...surface(project(binding.nest.world), "beam", across),
    world: binding.nest.world
  } : surface(binding.nest, "branch", [1, -0.3]);
  const graph = { nodes: room.NODES, edges: room.EDGES };
  const end = room.NODES.hub ? "hub" : "walk";
  const start = room.NODES[binding.entry] ? binding.entry : "door";
  const nodes = route(graph, start, end);
  const path = [
    ...room.NODES[binding.entry] ? binding.approach ?? [] : [],
    ...nodes.map((node) => {
      const [a, b] = room.NODES[node];
      return [a, b, room.floorAt(a, b)];
    })
  ];
  return {
    nest,
    sill: {
      ...surface(
        binding.ledge ? project(binding.ledge) : point(width * 0.5, height),
        "ledge",
        across
      ),
      world: sillWorld,
      below: project([
        sillWorld[0],
        sillWorld[1],
        room.floorAt(sillWorld[0], sillWorld[1])
      ])
    },
    plant: {
      ...surface(project(binding.plant), "leaf", [1, -0.35]),
      world: binding.plant,
      below: project(binding.soil)
    },
    soil: {
      ...surface(project(binding.soil), "soil", [1, 0.4]),
      world: binding.soil
    },
    eave: {
      ...surface(project(eaveWorld), "beam", across),
      world: eaveWorld,
      below: project([
        eaveWorld[0],
        eaveWorld[1],
        room.floorAt(eaveWorld[0], eaveWorld[1])
      ])
    },
    window: corners,
    webCorner: binding.frame.webCorner,
    windowMaterial: binding.material ?? "glass",
    lamp: project(binding.lamp),
    route: path,
    project
  };
}

function createFrameBudget(interval) {
  let previous = 0;
  return {
    reset(at2) {
      previous = at2;
    },
    due(at2) {
      const periods = Math.floor((at2 - previous + 1e-6) / interval);
      if (periods < 1) return false;
      previous += periods * interval;
      return true;
    }
  };
}

var CENTER_OMEGA = 10;
var LEVEL_OMEGA = 7;
var REST_LEVEL = 2e-3;
var REST_SPEED = 0.01;
var BEAM_TOP = -24;
var ACTOR_POOL_HALF = 30;
var ACTOR_TOP_RATIO = 0.45;
var PLACE_MARGIN = 14;
var PLACE_TOP_RATIO = 0.9;
function spring(x, v, target, omega, dt) {
  const decay = Math.exp(-omega * dt), c1 = x - target, c2 = v + omega * c1;
  return [
    target + (c1 + c2 * dt) * decay,
    (c2 - omega * (c1 + c2 * dt)) * decay
  ];
}
function fade(f, on, dt) {
  [f.level, f.speed] = spring(f.level, f.speed, on ? 1 : 0, LEVEL_OMEGA, dt);
  f.level = Math.min(1, Math.max(0, f.level));
  if (!on && f.level < REST_LEVEL && Math.abs(f.speed) < REST_SPEED) {
    f.level = 0;
    f.speed = 0;
  }
}
function createSpotlight() {
  let x = 0, y = 0, vx = 0, vy = 0, resting = true;
  const room = { level: 0, speed: 0 };
  const places = /* @__PURE__ */ new Map();
  return {
    step({ at: at2, on, stop, dtMs, reduced }) {
      const presented = on ? stop : void 0;
      if (presented !== void 0 && !places.has(presented))
        places.set(presented, { level: 0, speed: 0 });
      if (reduced) {
        x = at2.x;
        y = at2.y;
        vx = vy = 0;
        room.level = on ? 1 : 0;
        room.speed = 0;
        for (const [place, f] of places) {
          f.level = place === presented ? 1 : 0;
          f.speed = 0;
        }
      } else {
        if (room.level === 0 && room.speed === 0) {
          x = at2.x;
          y = at2.y;
          vx = vy = 0;
        }
        const dt = Math.max(0, dtMs) / 1e3;
        [x, vx] = spring(x, vx, at2.x, CENTER_OMEGA, dt);
        [y, vy] = spring(y, vy, at2.y, CENTER_OMEGA, dt);
        fade(room, on, dt);
        for (const [place, f] of places) fade(f, place === presented, dt);
      }
      const lit = {};
      for (const [place, f] of places) {
        if (f.level > 0) lit[place] = f.level;
        else if (place !== presented) places.delete(place);
      }
      resting = !on && room.level === 0 && places.size === 0;
      return { x, y, level: room.level, places: lit };
    },
    get resting() {
      return resting;
    }
  };
}
function topLights(state, boxes) {
  if (state.level <= 0) return [];
  const lights = [
    {
      cx: state.x,
      top: BEAM_TOP,
      topHalf: ACTOR_POOL_HALF * ACTOR_TOP_RATIO,
      floorY: state.y,
      floorHalf: ACTOR_POOL_HALF,
      litFrom: state.y - 44,
      strength: 1
    }
  ];
  for (const [place, strength] of Object.entries(state.places)) {
    const box = boxes.get(place);
    if (!box) continue;
    const floorHalf = box.w / 2 + PLACE_MARGIN;
    lights.push({
      cx: box.x + box.w / 2,
      top: BEAM_TOP,
      topHalf: floorHalf * PLACE_TOP_RATIO,
      floorY: box.y + box.h,
      floorHalf,
      litFrom: box.y,
      strength
    });
  }
  return lights;
}

function localDay2(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((n, i) => String(n).padStart(i ? 2 : 4, "0")).join("-");
}
function weatherOn(day, southern = false) {
  const n = dayNumber(day);
  const firstSnow = firstSnowBefore(n, southern);
  return {
    weather: skyOn(n, southern),
    day,
    ...firstSnow ? { firstSnow } : {},
    ...southern ? { southern } : {}
  };
}
function southernTimeZone(zone) {
  return /^(Australia|Antarctica|America\/Argentina)\//.test(zone) || southernZones.has(zone);
}
var southernZones = /* @__PURE__ */ new Set([
  "Pacific/Auckland",
  "Pacific/Chatham",
  "Pacific/Fiji",
  "Pacific/Noumea",
  "Pacific/Tongatapu",
  "America/Sao_Paulo",
  "America/Santiago",
  "America/Montevideo",
  "America/Asuncion",
  "America/La_Paz",
  "America/Lima",
  "Africa/Johannesburg",
  "Africa/Maputo",
  "Africa/Harare",
  "Africa/Lusaka",
  "Africa/Windhoek",
  "Africa/Gaborone",
  "Indian/Mauritius",
  "Indian/Reunion",
  "Indian/Antananarivo"
]);
var odds = {
  winter: [
    ["snow", 0.32],
    ["cloudy", 0.28],
    ["clear", 0.25],
    ["fog", 0.1],
    ["rain", 0.05]
  ],
  spring: [
    ["rain", 0.35],
    ["clear", 0.3],
    ["cloudy", 0.25],
    ["fog", 0.1]
  ],
  summer: [
    ["clear", 0.55],
    ["cloudy", 0.25],
    ["rain", 0.15],
    ["fog", 0.05]
  ],
  autumn: [
    ["rain", 0.35],
    ["cloudy", 0.25],
    ["clear", 0.25],
    ["fog", 0.15]
  ]
};
var dayMs2 = 864e5;
function dayNumber(day) {
  const [y, m, d] = day.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / dayMs2);
}
function monthOf(n) {
  return new Date(n * dayMs2).getUTCMonth() + 1;
}
function seasonOf(month, southern) {
  const m = southern ? (month + 5) % 12 + 1 : month;
  return m === 12 || m <= 2 ? "winter" : m <= 5 ? "spring" : m <= 8 ? "summer" : "autumn";
}
function scatter(a, b) {
  let h = Math.imul(a ^ 2654435769, 2246822507) ^ Math.imul(b + 1663821227, 3266489909);
  h ^= h >>> 15;
  h = Math.imul(h, 739982445);
  h ^= h >>> 12;
  h = Math.imul(h, 695872825);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
function skyOn(n, southern) {
  const block = Math.floor(n / 3), split = scatter(block, 1) < 0.5 ? 1 : 2, spell = n - block * 3 < split ? 0 : 1, start = block * 3 + (spell ? split : 0);
  const roll = scatter(block, 2 + spell);
  let sum = 0, weather = "clear";
  for (const [w, p] of odds[seasonOf(monthOf(start), southern)]) {
    weather = w;
    if (roll < (sum += p)) break;
  }
  return weather === "snow" && seasonOf(monthOf(n), southern) !== "winter" ? "cloudy" : weather;
}
function firstSnowBefore(n, southern) {
  const date = new Date(n * dayMs2), year = date.getUTCFullYear(), month = date.getUTCMonth() + 1;
  const start = southern ? month >= 4 && month <= 10 ? Date.UTC(year, 5, 1) : void 0 : month >= 10 ? Date.UTC(year, 11, 1) : month <= 4 ? Date.UTC(year - 1, 11, 1) : void 0;
  if (start === void 0) return void 0;
  for (let d = Math.round(start / dayMs2); d <= n && d < start / dayMs2 + 92; d++)
    if (skyOn(d, southern) === "snow")
      return new Date(d * dayMs2).toISOString().slice(0, 10);
  return void 0;
}

function createZenKit() {
  const window = {
    SANTORINI_ART_SOURCE: new URL("./pixel-assets/santorini-props.webp", import.meta.url).href,
    SANTORINI_FLOOR_SOURCE: new URL("./pixel-assets/santorini-floor.webp", import.meta.url).href,
    SANTORINI_ARCHITECTURE_SOURCE: new URL("./pixel-assets/santorini-architecture.webp", import.meta.url).href,
    SANTORINI_LEFT_WALL_SOURCE: new URL("./pixel-assets/santorini-wall-left.webp", import.meta.url).href
  };
  let PX, ACTOR, CP, CX, CONCEPTS, OFFICE_SCREENS, ROOM_PAINTER, ROOM_CONTRACT, LANDSCAPES;
  const ACTOR_FINAL = window.ACTOR_FINAL = [];
  (function(global) {
    "use strict";
    function sprite(rows) {
      const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
      return { w, h: rows.length, rows };
    }
    function flipX(s) {
      return {
        w: s.w,
        h: s.h,
        rows: s.rows.map((r) => r.padEnd(s.w, ".").split("").reverse().join(""))
      };
    }
    function paint(ctx, s, pal, x, y) {
      for (let j = 0; j < s.h; j++) {
        const row = s.rows[j];
        for (let i = 0; i < row.length; i++) {
          const k = row[i];
          if (k === "." || k === " ") continue;
          const c = pal[k];
          if (!c) continue;
          ctx.fillStyle = c;
          ctx.fillRect(x + i, y + j, 1, 1);
        }
      }
    }
    function rect(ctx, colour, x, y, w, h) {
      ctx.fillStyle = colour;
      ctx.fillRect(x, y, w, h);
    }
    function pixCanvas(w, h, scale, drawFn) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.style.width = w * scale + "px";
      c.style.height = h * scale + "px";
      c.style.imageRendering = "pixelated";
      c.style.display = "block";
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      drawFn(ctx);
      return c;
    }
    function swatches(pal, keys, labels) {
      return el(
        "div",
        { class: "px-swatches" },
        keys.map(
          (k, i) => el(
            "div",
            { class: "px-swatch" },
            el("i", { style: { background: pal[k] } }),
            el("b", null, labels ? labels[i] : k),
            el("code", null, pal[k])
          )
        )
      );
    }
    function scale2x(s) {
      const g = s.rows.map((r) => r.padEnd(s.w, "."));
      const at2 = (x, y) => x < 0 || y < 0 || x >= s.w || y >= s.h ? "." : g[y][x];
      const out = [];
      for (let y = 0; y < s.h; y++) {
        let r1 = "";
        let r2 = "";
        for (let x = 0; x < s.w; x++) {
          const p = at2(x, y);
          const a = at2(x, y - 1);
          const b = at2(x + 1, y);
          const c = at2(x - 1, y);
          const d = at2(x, y + 1);
          r1 += (c === a && c !== d && a !== b ? a : p) + (a === b && a !== c && b !== d ? b : p);
          r2 += (d === c && d !== b && c !== a ? c : p) + (b === d && b !== a && d !== c ? d : p);
        }
        out.push(r1, r2);
      }
      return sprite(out);
    }
    global.PX = { sprite, flipX, paint, rect, pixCanvas, swatches, scale2x };
  })(window);
  PX = window.PX;
  (function(global) {
    "use strict";
    const pad = (rows) => rows.map((r) => "." + r + ".");
    function closeEyes(rows, fill, line) {
      const seen = {};
      return rows.map(
        (r, j) => r.split("").map((ch, i) => {
          if (ch !== "e") return ch;
          const first = !(i in seen);
          seen[i] = true;
          return first ? fill : line;
        }).join("")
      );
    }
    function rotateCCW(rows) {
      const h = rows.length;
      const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
      const g = rows.map((r) => r.padEnd(w, "."));
      const out = [];
      for (let i = 0; i < w; i++) {
        let s = "";
        for (let j = 0; j < h; j++) s += g[j][w - 1 - i];
        out.push(s);
      }
      return out;
    }
    function backRows(rows, def) {
      const hide = def.backHide || {};
      return rows.map((r, j) => {
        r = r.replace(/./g, (ch) => hide[ch] || ch);
        if (j < def.faceRows[0] || j > def.faceRows[1]) return r;
        const a = r.indexOf("o");
        const b = r.lastIndexOf("o");
        return r.split("").map(
          (ch, i) => "ecv".includes(ch) || ch === "o" && i > a + 1 && i < b - 1 ? def.backFill : ch
        ).join("");
      });
    }
    function poses(def) {
      const out = {};
      if (def.body) {
        const body = pad(def.body);
        const legs = (rows) => pad(rows);
        const typeRows = body.map((r, j) => j === def.handRow ? def.hand + r.slice(1, -1) + def.hand : r);
        out.idle = PX.sprite(body.concat(legs(def.stand)));
        out.walkA = PX.sprite(body.concat(legs(def.strideA), ["."]));
        out.walkB = PX.sprite(body.concat(legs(def.strideB)));
        out.type = PX.sprite(typeRows);
        out.back = PX.sprite(backRows(typeRows, def));
        out.sleep = PX.sprite(rotateCCW(closeEyes(body.concat(legs(def.stand)), def.eyeFill, def.eyeLine)));
      }
      Object.entries(def.poses || {}).forEach(([k, rows]) => out[k] = PX.sprite(rows));
      return out;
    }
    function sleep(head, tucked = []) {
      const W = 36, H = 22;
      const make = (breath) => {
        const g = Array.from({ length: H }, () => Array(W).fill("."));
        const stamp = (rows, x, y) => rows.forEach((row, j) => [...row].forEach((pixel, i) => {
          if (pixel !== "." && g[y + j] && x + i >= 0 && x + i < W) g[y + j][x + i] = pixel;
        }));
        stamp([
          "..2222222222222..",
          ".211111111111112.",
          ...Array(12).fill("21111111111111112"),
          ".211111111111112.",
          "..2222222222222.."
        ], 0, 3);
        stamp(head, 1, 1);
        const edges = [
          [18, 30],
          [16, 32],
          [15, 33],
          ...Array(12).fill([15, 34]),
          [16, 33],
          [17, 32],
          [19, 30]
        ];
        edges.forEach(([left, right], row) => {
          for (let x = left; x <= right; x++)
            g[row + 2][x] = x === right || row === edges.length - 1 ? "Q" : x === left ? "2" : x < left + 3 ? "3" : row === 0 || x === left + 3 ? "6" : "q";
        });
        if (breath) for (let x = 22; x < 30; x++) {
          g[1][x] = "6";
          g[2][x] = "q";
        }
        tucked.forEach(([rows, x, y]) => stamp(rows, x, y));
        return g.map((row) => row.join(""));
      };
      return {
        sleep: make(false),
        sleep2: make(true),
        pal: { "1": "#ebe2d2", "2": "#c3b7a2", "3": "#f5efdf", "6": "#b8c7a6", q: "#7f9a5a", Q: "#647f43" },
        loop: [...Array(16).fill("sleep"), ...Array(16).fill("sleep2")]
      };
    }
    const paper2 = {
      body: [
        "oooooooooooooooo.....",
        "owwwwwwwwwwwwwwsoo...",
        "owwwwwwwwwwwwwwssoo..",
        "owwwwwwwwwwwwwwsssoo.",
        "owwwwwwwwwwwwwwssssoo",
        "owwwwwwwwwwwwwwoooooo",
        "owwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwo",
        "owwweewwwwwwwwweewwwo",
        "owwweewwwwwwwwweewwwo",
        "owwweewwwwwwwwweewwwo",
        "owwwwwwwwwwwwwwwwwwwo",
        "owwccwwwowwwowwwccwwo",
        "owwwwwwwwooowwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwo",
        "oswwwwwwwwwwwwwwwwwso",
        "ossssssssssssssssssso",
        "ooooooooooooooooooooo"
      ],
      stand: ["....ooo.......ooo....", "....ooo.......ooo....", "...oooo.......oooo..."],
      strideA: ["...ooo.........ooo...", "..ooo...........ooo..", ".oooo...........oooo."],
      strideB: [".....ooo.....ooo.....", ".....ooo.....ooo.....", "....oooo.....oooo...."],
      hand: "o",
      handRow: 15,
      eyeFill: "w",
      eyeLine: "o",
      faceRows: [9, 14],
      backFill: "w"
    };
    const sprout = {
      body: [
        ".....lll.....LLL.....",
        "....lllll...LLLLL....",
        "...lllllll.LLLLLLL...",
        ".....llll.o.LLLL.....",
        "..........o..........",
        "..........o..........",
        "......ooooooooo......",
        "....oobbbbbbbbboo....",
        "...obbbbbbbbbbbbbo...",
        "..obbbbbbbbbbbbbbbo..",
        ".obbbbbbbbbbbbbbbbbo.",
        ".obbbbbbbbbbbbbbbbbo.",
        "obbbeebbbbbbbbbeebbbo",
        "obbbeebbbbbbbbbeebbbo",
        "obbccbbbobbbobbbccbbo",
        "obbbbbbbbooobbbbbbbbo",
        "obbbbbbbbbbbbbbbbbbbo",
        "oaaaaaaaaaaaaaaaaaaao",
        "oaaaaaapppppppaaaaaao",
        "oaaaaaapaaaaapaaaaaao",
        ".oaaaaapppppppaaaaao.",
        "..oaaaaaaaaaaaaaaao..",
        "...ooooooooooooooo..."
      ],
      stand: [".....ooo.....ooo.....", "....oooo.....oooo...."],
      strideA: ["....ooo.......ooo....", "...oooo.......oooo..."],
      strideB: ["......ooo...ooo......", ".....oooo...oooo....."],
      hand: "b",
      handRow: 16,
      eyeFill: "b",
      eyeLine: "o",
      faceRows: [12, 15],
      backFill: "b",
      backHide: { p: "a" }
      // the apron pocket is on the front
    };
    const hood = {
      body: [
        ".......ooooooo.......",
        ".....oohhhhhhhoo.....",
        "....ohhhhhhhhhhho....",
        "...ohhhhhhhhhhhhho...",
        "..ohhhhhhhhhhhhhhho..",
        "..ohhhvvvvvvvvvhhho..",
        ".ohhhvvvvvvvvvvvhhho.",
        ".ohhvvvvvvvvvvvvvhho.",
        ".ohhvveevvvvveevvhho.",
        ".ohhvveevvvvveevvhho.",
        ".ohhvvvvvvvvvvvvvhho.",
        ".ohhhvvvvvvvvvvvhhho.",
        "..ohhhvvvvvvvvvhhho..",
        "..ohhhhhhhhhhhhhhho..",
        ".ohhhhhhwhhhwhhhhhho.",
        ".ohhhhhhwhhhwhhhhhho.",
        "ohhhhhhhhhhhhhhhhhhho",
        "ohhhhhHHHHHHHHHhhhhho",
        "ohhhhhHhhhhhhhHhhhhho",
        "oHHHHHHHHHHHHHHHHHHHo",
        ".ooooooooooooooooooo."
      ],
      stand: ["......ooo...ooo......", ".....oooo...oooo....."],
      strideA: [".....ooo.....ooo.....", "....oooo.....oooo...."],
      strideB: [".......ooo.ooo.......", "......oooo.oooo......"],
      hand: "h",
      handRow: 15,
      eyeFill: "v",
      eyeLine: "e",
      faceRows: [5, 12],
      backFill: "h",
      backHide: { w: "h", H: "h" }
      // drawstrings and pocket are on the front
    };
    global.ACTOR = {
      make: poses,
      sleep,
      paper: poses(paper2),
      sprout: poses(sprout),
      hood: poses(hood)
    };
  })(window);
  ACTOR = window.ACTOR;
  (function(global) {
    "use strict";
    function hexToRgb(h) {
      const n = parseInt(h.slice(1), 16);
      return [n >> 16 & 255, n >> 8 & 255, n & 255];
    }
    function rgbToHex(r, g, b) {
      return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
    }
    function rgbToHsl(r, g, b) {
      r /= 255;
      g /= 255;
      b /= 255;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (mx + mn) / 2;
      if (mx !== mn) {
        const d = mx - mn;
        s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (mx === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
      }
      return [h, s, l];
    }
    function hslToRgb(h, s, l) {
      h = (h % 360 + 360) % 360;
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs(h / 60 % 2 - 1));
      const m = l - c / 2;
      const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
      return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
    }
    function towards(h, target, amt) {
      let d = target - h;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      return h + Math.sign(d) * Math.min(Math.abs(d), amt);
    }
    function shade(hex, dl, ds) {
      const [h, s, l] = rgbToHsl(...hexToRgb(hex));
      const hh = dl < 0 ? towards(h, 250, Math.abs(dl) * 40) : towards(h, 50, dl * 30);
      const ss = Math.max(0, Math.min(1, s + (ds || 0) + (dl < 0 ? Math.abs(dl) * 0.15 : -dl * 0.2)));
      return rgbToHex(...hslToRgb(hh, ss, Math.max(0.03, Math.min(0.97, l + dl))));
    }
    function ramp(hex) {
      return { o: shade(hex, -0.34), d: shade(hex, -0.13), m: hex, l: shade(hex, 0.09), h: shade(hex, 0.18) };
    }
    function mix(a, b, t) {
      const A = hexToRgb(a);
      const B = hexToRgb(b);
      return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
    }
    function rng(seed) {
      let a = seed >>> 0;
      return function() {
        a = a + 1831565813 >>> 0;
        let t = a;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    function P(ctx, c, x, y, w, h) {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w === void 0 ? 1 : w), Math.round(h === void 0 ? 1 : h));
    }
    function inset(r, j, h) {
      if (r <= 0) return 0;
      const k = j < r ? r - j - 0.5 : j >= h - r ? j - (h - r) + 0.5 : -1;
      if (k < 0) return 0;
      return Math.round(r - Math.sqrt(Math.max(0, r * r - k * k)));
    }
    function rrect(ctx, x, y, w, h, r, c) {
      x = Math.round(x);
      y = Math.round(y);
      r = Math.min(r, Math.floor(w / 2), Math.floor(h / 2));
      ctx.fillStyle = c;
      for (let j = 0; j < h; j++) {
        const k = inset(r, j, h);
        ctx.fillRect(x + k, y + j, w - 2 * k, 1);
      }
    }
    function orect(ctx, x, y, w, h, r, ol, fill) {
      rrect(ctx, x, y, w, h, r, ol);
      rrect(ctx, x + 2, y + 2, w - 4, h - 4, Math.max(0, r - 2), fill);
    }
    function ell(ctx, cx, cy, rx, ry, c) {
      ctx.fillStyle = c;
      for (let j = -ry; j <= ry; j++) {
        const k = Math.round(rx * Math.sqrt(Math.max(0, 1 - j * j / (ry * ry + 0.3))));
        ctx.fillRect(Math.round(cx - k), Math.round(cy + j), 2 * k + 1, 1);
      }
    }
    function oell(ctx, cx, cy, rx, ry, ol, fill) {
      ell(ctx, cx, cy, rx, ry, ol);
      ell(ctx, cx, cy, rx - 2, ry - 2, fill);
    }
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
    const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
    function dither(ctx, x, y, w, h, c, k) {
      if (k <= 0) return;
      ctx.fillStyle = c;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (bay(x + i, y + j) < k) ctx.fillRect(x + i, y + j, 1, 1);
    }
    function vgrad(ctx, x, y, w, h, cs) {
      const n = cs.length - 1;
      for (let j = 0; j < h; j++) {
        const t = j / Math.max(1, h - 1) * n;
        const i = Math.min(n - 1, Math.floor(t));
        const f = t - i;
        P(ctx, cs[i], x, y + j, w, 1);
        if (f > 0.05) {
          ctx.fillStyle = cs[i + 1];
          for (let q = 0; q < w; q++) if (bay(x + q, y + j) < f) ctx.fillRect(x + q, y + j, 1, 1);
        }
      }
    }
    function speckle(ctx, x, y, w, h, cs, density, seed, clip) {
      const r = rng(seed);
      const n = Math.round(w * h * density);
      for (let k = 0; k < n; k++) {
        const px = x + Math.floor(r() * w);
        const py = y + Math.floor(r() * h);
        if (clip && !clip(px, py)) continue;
        P(ctx, cs[Math.floor(r() * cs.length)], px, py, 1, 1);
      }
    }
    function shadowEll(ctx, cx, cy, rx, ry, a) {
      ctx.save();
      ctx.globalAlpha = a || 0.16;
      ell(ctx, cx, cy, rx, ry, "#2a1a10");
      ctx.globalAlpha = (a || 0.16) * 0.8;
      ell(ctx, cx, cy, Math.round(rx * 0.75), Math.round(ry * 0.7), "#2a1a10");
      ctx.restore();
    }
    function glow(ctx, cx, cy, r, c, strength) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = strength || 0.22;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, c);
      g.addColorStop(0.35, c + "aa");
      g.addColorStop(0.7, c + "33");
      g.addColorStop(1, c + "00");
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
      ctx.restore();
    }
    function lightPoly(ctx, pts, c, a, k) {
      ctx.save();
      ctx.beginPath();
      pts.forEach(([x2, y2], i) => i ? ctx.lineTo(x2, y2) : ctx.moveTo(x2, y2));
      ctx.closePath();
      ctx.clip();
      ctx.globalAlpha = a;
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const x = Math.floor(Math.min(...xs));
      const y = Math.floor(Math.min(...ys));
      dither(ctx, x, y, Math.ceil(Math.max(...xs)) - x, Math.ceil(Math.max(...ys)) - y, c, k);
      ctx.restore();
    }
    global.CP = { hexToRgb, rgbToHex, shade, ramp, mix, rng, P, rrect, orect, ell, oell, dither, vgrad, speckle, shadowEll, glow, lightPoly, bay };
  })(window);
  CP = window.CP;
  (function(global) {
    "use strict";
    const { P, ell, oell, ramp, rng, mix, vgrad, speckle, glow } = CP;
    function poly(ctx, pts, c) {
      const ys = pts.map((p) => p[1]);
      const y0 = Math.floor(Math.min(...ys));
      const y1 = Math.ceil(Math.max(...ys));
      ctx.fillStyle = c;
      for (let y = y0; y < y1; y++) {
        const yc = y + 0.5;
        const xs = [];
        for (let i = 0; i < pts.length; i++) {
          const [ax, ay] = pts[i];
          const [bx, by] = pts[(i + 1) % pts.length];
          if (ay <= yc && by > yc || by <= yc && ay > yc) xs.push(ax + (yc - ay) * (bx - ax) / (by - ay));
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const xa = Math.round(xs[k]);
          const xb = Math.round(xs[k + 1]);
          if (xb > xa) ctx.fillRect(xa, y, xb - xa, 1);
        }
      }
    }
    function lowres(ctx, fn) {
      const c = document.createElement("canvas");
      c.width = 480;
      c.height = 560;
      const x = c.getContext("2d");
      x.imageSmoothingEnabled = false;
      fn(x);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(c, 0, 0, 480, 560, 0, 0, 960, 1120);
    }
    const SKIES = {
      day: ["#5fb8f0", "#7cc8f4", "#9ad6f7", "#bfe6fa", "#dff3fc"],
      golden: ["#6f8fd0", "#c99ac0", "#f7b98a", "#ffd49a", "#ffe9c0"],
      night: ["#0f1433", "#161c42", "#1e2652", "#283164", "#323c74"]
    };
    function sky(ctx, x, y, w, h, t) {
      vgrad(ctx, x, y, w, h, SKIES[t]);
      if (t === "night") {
        const r = rng(7);
        for (let i = 0; i < w * h / 900; i++) P(ctx, r() < 0.2 ? "#fff6d8" : "#c8d0f0", x + r() * w, y + r() * h * 0.8, 1, 1);
      }
    }
    function sun(ctx, cx, cy, r, t) {
      if (t === "night") {
        ell(ctx, cx, cy, r, r, "#fff3c8");
        ell(ctx, cx + Math.round(r * 0.45), cy - Math.round(r * 0.2), r - 1, r - 1, SKIES.night[1]);
        return;
      }
      const c = t === "golden" ? "#ffb35c" : "#fff4b0";
      ctx.save();
      ctx.globalAlpha = 0.25;
      ell(ctx, cx, cy, r + 5, r + 5, c);
      ctx.restore();
      ell(ctx, cx, cy, r, r, c);
      ell(ctx, cx - 1, cy - 1, r - 3, r - 3, t === "golden" ? "#ffd08a" : "#fffbe0");
    }
    function cloud(ctx, x, y, w, t) {
      if (t === "night") return;
      const c = t === "golden" ? "#ffe2c8" : "#ffffff";
      const s = t === "golden" ? "#f2b8a0" : "#d6ecfa";
      ell(ctx, x + w * 0.3, y, w * 0.22, w * 0.14, c);
      ell(ctx, x + w * 0.55, y - w * 0.06, w * 0.26, w * 0.18, c);
      ell(ctx, x + w * 0.78, y + 1, w * 0.2, w * 0.12, c);
      P(ctx, c, x + w * 0.1, y, w * 0.85, w * 0.1);
      P(ctx, s, x + w * 0.12, y + w * 0.1, w * 0.8, 2);
    }
    function ridge(ctx, x0, w, base, amp, f, ph, c, bottom) {
      for (let x = x0; x < x0 + w; x++) {
        const h = amp * (0.6 * Math.sin(x * f + ph) + 0.4 * Math.sin(x * f * 2.3 + ph * 1.7));
        const top = Math.round(base - Math.abs(h));
        P(ctx, c, x, top, 1, (bottom || 560) - top);
      }
    }
    function mountains(ctx, peaks, c, snow, bottom) {
      peaks.forEach(([cx, top, half]) => {
        poly(ctx, [[cx, top], [cx + half, bottom], [cx - half, bottom]], c);
        if (snow) poly(ctx, [[cx, top], [cx + half * 0.28, top + half * 0.32], [cx + half * 0.08, top + half * 0.26], [cx - half * 0.1, top + half * 0.34], [cx - half * 0.28, top + half * 0.3]], snow);
      });
    }
    function pine(ctx, x, y, h, G, t) {
      const dark = t === "night";
      P(ctx, dark ? "#1a1410" : "#5a3a26", x - 1, y - 4, 2, 6);
      for (let k = 0; k < 4; k++) {
        const ty = y - h + k * (h / 5);
        const half = h / 6 * (k + 1) * 0.55 + 2;
        poly(ctx, [[x, ty], [x + half, ty + h / 3.2], [x - half, ty + h / 3.2]], dark ? mix(G.o, "#101830", 0.4) : G.d);
        poly(ctx, [[x, ty], [x + half * 0.2, ty + h / 3.2], [x - half, ty + h / 3.2]], dark ? mix(G.d, "#101830", 0.5) : G.m);
      }
    }
    function roundTree(ctx, x, y, r, G, t, trunk) {
      const dark = t === "night";
      P(ctx, dark ? "#1a1410" : trunk || "#6b4a30", x - 2, y - r, 4, r + 2);
      const c = dark ? [mix(G.o, "#101830", 0.5), mix(G.d, "#101830", 0.5), mix(G.m, "#101830", 0.5)] : [G.d, G.m, G.l];
      ell(ctx, x, y - r * 1.4, r, r * 0.9, c[0]);
      ell(ctx, x - r * 0.25, y - r * 1.55, r * 0.75, r * 0.65, c[1]);
      ell(ctx, x - r * 0.35, y - r * 1.75, r * 0.4, r * 0.3, c[2]);
    }
    function grassTufts(ctx, x, y, w, h, G, seed, t) {
      const r = rng(seed);
      const dark = t === "night";
      for (let i = 0; i < w * h / 30; i++) {
        const px = x + r() * w;
        const py = y + r() * h;
        P(ctx, dark ? mix(G.l, "#101830", 0.5) : r() < 0.5 ? G.l : G.d, px, py, 1, 2);
      }
    }
    function flowers(ctx, x, y, w, h, cols, seed, t) {
      if (t === "night") return;
      const r = rng(seed);
      for (let i = 0; i < w * h / 60; i++) {
        const px = x + r() * w;
        const py = y + r() * h;
        P(ctx, cols[Math.floor(r() * cols.length)], px, py, 1, 1);
      }
    }
    function water(ctx, x, y, w, h, t) {
      const c = {
        day: ["#3f9fd8", "#4fb0e0", "#6cc2ea", "#4a9fd0"],
        golden: ["#7a8fc0", "#d8a07a", "#f2b47c", "#c08a7a"],
        night: ["#121a3c", "#18224a", "#1e2a56", "#141c40"]
      }[t];
      vgrad(ctx, x, y, w, h, c);
      const r = rng(x + y);
      const spark = t === "night" ? "#4a5a8a" : t === "golden" ? "#ffe0a0" : "#ffffff";
      for (let i = 0; i < w * h / 120; i++) P(ctx, spark, x + r() * (w - 6), y + 2 + r() * (h - 4), 2 + Math.floor(r() * 4), 1);
    }
    function reflect(ctx, x, y, w, h, alpha) {
      const img = ctx.getImageData(x, y - h, w, h);
      const out = ctx.getImageData(x, y, w, h);
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) {
          const sj = h - 1 - j;
          const wob = Math.round(Math.sin(j * 0.7) * 1.2);
          const si = Math.max(0, Math.min(w - 1, i + wob));
          const s = (sj * w + si) * 4;
          const d = (j * w + i) * 4;
          for (let k = 0; k < 3; k++) out.data[d + k] = out.data[d + k] * (1 - alpha) + img.data[s + k] * alpha;
        }
      ctx.putImageData(out, x, y);
    }
    function nightTint(ctx, c, w, h) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = c || "#6f70a8";
      ctx.fillRect(0, 0, w || 960, h || 1120);
      ctx.restore();
    }
    function litWindow(ctx, x, y, w, h) {
      vgrad(ctx, x, y, w, h, ["#ffe7a8", "#ffc76a"]);
      glow(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 1.1, "#ffb050", 0.35);
    }
    const big = {};
    function actor(key, pose, x2) {
      const id = key + pose + (x2 ? 2 : 1);
      if (!big[id]) big[id] = x2 ? PX.scale2x(ACTOR[key][pose]) : ACTOR[key][pose];
      return big[id];
    }
    function paintOri(ctx, key, pose, pal, cx, footY, x2) {
      const s = actor(key, pose, x2);
      PX.paint(ctx, s, pal, Math.round(cx - s.w / 2), footY - s.h);
      return s;
    }
    const ORIPAL = {
      paper: { o: "#2a3a4c", w: "#ffffff", s: "#dbe9f5", e: "#2a3a4c", c: "#ff8a6a" },
      sprout: { o: "#5a4a32", b: "#fbf3dc", l: "#8cc152", L: "#5f9a3a", e: "#3b3a2a", c: "#f0a08a", a: "#e8b84a", p: "#c0903a" },
      bloom: { o: "#5a4a3a", b: "#fffaf0", l: "#ff8ab8", L: "#ff5f98", e: "#3a3a2a", c: "#ffb0c0", a: "#7fc8f0", p: "#4fa8e0" },
      sunny: { o: "#3a3f4a", h: "#ffd24a", H: "#f0b528", v: "#2c3038", e: "#8af0ff", w: "#ffffff" },
      mint: { o: "#2a3a3a", h: "#bfeadf", H: "#8fd4c2", v: "#24343a", e: "#ffe28a", w: "#ff8a6a" }
    };
    function zzz(ctx, x, y, c) {
      [[0, 0, 6], [10, -10, 5], [18, -19, 4]].forEach(([dx, dy, sz]) => {
        P(ctx, c, x + dx, y + dy, sz, 1);
        for (let k = 1; k < sz; k++) P(ctx, c, x + dx + sz - 1 - k, y + dy + k, 1, 1);
        P(ctx, c, x + dx, y + dy + sz, sz, 1);
      });
    }
    function planksBox(ctx, x, y, w, h, W, ph, vertical, seed) {
      const r = rng(seed || x + y);
      if (vertical) {
        for (let px = x; px < x + w; px += ph) {
          const base = r() < 0.5 ? W.m : W.l;
          P(ctx, base, px, y, Math.min(ph, x + w - px), h);
          P(ctx, W.d, px, y, 1, h);
          P(ctx, W.h, px + 1, y, 1, h);
          for (let g = 0; g < h / 30; g++) P(ctx, mix(base, W.d, 0.4), px + 2 + r() * (ph - 4), y + r() * h, 1, 6 + r() * 16);
        }
      } else {
        for (let py = y; py < y + h; py += ph) {
          const base = r() < 0.5 ? W.m : W.l;
          P(ctx, base, x, py, w, Math.min(ph, y + h - py));
          P(ctx, W.d, x, py, w, 1);
          P(ctx, W.h, x, py + 1, w, 1);
          for (let g = 0; g < w / 40; g++) P(ctx, mix(base, W.d, 0.4), x + r() * w, py + 2 + r() * (ph - 4), 8 + r() * 20, 1);
        }
      }
    }
    function wallpaper(ctx, x, y, w, h, A, B, style) {
      P(ctx, A, x, y, w, h);
      if (style === "stripe") for (let px = x; px < x + w; px += 14) P(ctx, B, px, y, 5, h);
      if (style === "dots") for (let py = y + 6; py < y + h; py += 14) for (let px = x + (py / 14 % 2 ? 7 : 0); px < x + w; px += 14) P(ctx, B, px, py, 2, 2);
      if (style === "diamond")
        for (let py = y; py < y + h; py += 16)
          for (let px = x + (py / 16 % 2 ? 8 : 0); px < x + w - 2; px += 16) {
            P(ctx, B, px + 1, py, 1, 1);
            P(ctx, B, px, py + 1, 3, 1);
            P(ctx, B, px + 1, py + 2, 1, 1);
          }
    }
    function theme(o) {
      const b = {
        trim: ramp("#c9a27a"),
        door: ramp("#8a5a3a"),
        winFrame: ramp("#f2ece0"),
        wood: ramp("#c08a56"),
        wood2: ramp("#a8743e"),
        shelf: ramp("#9a6a40"),
        sofa: ramp("#e8b06a"),
        chair: ramp("#6a7f9a"),
        chair2: ramp("#d9774a"),
        rattan: ramp("#d9ad6a"),
        pillows: [ramp("#e86a5a"), ramp("#4f8fc0"), ramp("#f2d27a")],
        sofaPillows: [[62, ramp("#e86a5a"), "dots"], [102, ramp("#4f8fc0"), "stripe"], [198, ramp("#f2d27a"), "knit"]],
        throw: ramp("#4f8fc0"),
        rugA: ramp("#efe2c8"),
        rugB: ramp("#c0563a"),
        jute: ramp("#d6b98a"),
        mat: ramp("#8a6a3a"),
        leaf: ramp("#4f9a4a"),
        leaf2: ramp("#78b85a"),
        pot: ramp("#d0754a"),
        vase: ramp("#efe6d6"),
        books: ["#c0563a", "#e8b84a", "#4f7f9a", "#5f8a4a", "#efe2c8", "#7a4a2a", "#d98a4a", "#9a6ab8"],
        shade: ramp("#f6e6c0"),
        counter: ramp("#5f8f7a"),
        stone: ramp("#efe9df"),
        cups: ["#e86a5a", "#fbf6ee", "#4f8fc0"],
        notes: ["#ffe27a", "#a8dcff", "#ffb3a0", "#c8f0b0"],
        folders: ["#e86a5a", "#f2d27a", "#4f8fc0"],
        radio: ramp("#c0563a"),
        frame: ramp("#6b4a30"),
        phone: ramp("#e86a5a"),
        chatSide: "#4b4a7a",
        accentSoft: "#fff0d0",
        flowers: [ramp("#ff8ab0"), ramp("#ffd24a"), ramp("#ffffff")],
        boardHeads: ["#f5b84a", "#6fb8e8", "#7fc47a"],
        rope: "#a07a4a"
      };
      return Object.assign(b, o || {});
    }
    global.CX = {
      theme,
      poly,
      lowres,
      sky,
      sun,
      cloud,
      ridge,
      mountains,
      pine,
      roundTree,
      grassTufts,
      flowers,
      water,
      reflect,
      nightTint,
      litWindow,
      actor,
      paintOri,
      ORIPAL,
      zzz,
      planksBox,
      wallpaper,
      SKIES
    };
    global.CONCEPTS = [];
  })(window);
  CX = window.CX;
  CONCEPTS = window.CONCEPTS;
  (function() {
    "use strict";
    const { P } = CP;
    const DESK_W = 32;
    const DESK_H = 22;
    const CALL_W = 45;
    const CALL_H = 28;
    function mk(w, h, fn) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d");
      x.imageSmoothingEnabled = false;
      fn(x);
      return c;
    }
    function dots(c, ymin, ymax) {
      return (x, y, col) => {
        if (ymin !== void 0 && (y < ymin || y > ymax)) return;
        P(c, col, x, y, 1, 1);
      };
    }
    function desk(kind, look) {
      const w = DESK_W;
      const h = DESK_H;
      return mk(w, h, (c) => {
        P(c, look.frame, 0, 0, w, h);
        if (kind === "slack") {
          P(c, "#4a154b", 1, 1, 9, h - 2);
          P(c, "#3f0e40", 1, 1, 9, 3);
          P(c, "#e8dbe8", 2, 2, 5, 1);
          [5, 8, 14, 17].forEach((y, i) => P(c, "#b99fba", 3, y, [5, 4, 6, 4][i], 1));
          P(c, "#1164a3", 1, 10, 9, 3);
          P(c, "#ffffff", 3, 11, 5, 1);
          P(c, "#ffffff", 10, 1, w - 11, h - 2);
          [[3, "#e8a33d", 9, 13], [9, "#2eb67d", 7, 15], [15, "#36c5f0", 8, 11]].forEach(([y, av, nl, tl]) => {
            P(c, av, 12, y, 3, 3);
            P(c, "#1d1c1d", 16, y, nl, 1);
            P(c, "#9a9a9a", 16, y + 2, tl, 1);
          });
          P(c, "#c8c8c8", 12, h - 3, w - 14, 1);
        } else if (kind === "claude") {
          const O = "#d97757";
          P(c, "#1f1e1d", 1, 1, w - 2, h - 2);
          P(c, O, 3, 1, w - 6, 1);
          P(c, O, 3, 8, w - 6, 1);
          P(c, O, 2, 2, 1, 6);
          P(c, O, w - 3, 2, 1, 6);
          const star = dots(c);
          [[6, 2], [6, 3], [6, 5], [6, 6], [4, 4], [5, 4], [7, 4], [8, 4], [6, 4], [5, 3], [7, 3], [5, 5], [7, 5]].forEach(([x, y]) => star(x, y, O));
          P(c, "#e8e2d9", 11, 4, 15, 1);
          P(c, "#8a847d", 3, 11, 15, 1);
          P(c, "#8a847d", 3, 14, 10, 1);
          P(c, "#4a4643", 2, 17, w - 4, 1);
          const prompt = dots(c);
          [[3, 18], [4, 19], [3, 20]].forEach(([x, y]) => prompt(x, y, "#a8a29b"));
          P(c, "#e8e2d9", 6, 18, 2, 3);
        } else {
          P(c, "#2b2c2f", 1, 1, w - 2, h - 2);
          const cx = w / 2;
          const sign = dots(c);
          const D = "#2b2c2f";
          for (let i = 0; i < 12; i++) {
            const hw = Math.floor(i * 0.72);
            let x0 = cx - 1 - hw;
            let x1 = cx + hw;
            if (i === 11) {
              x0 += 1;
              x1 -= 1;
            }
            for (let x = x0; x <= x1; x++) sign(x, 3 + i, look.accent);
          }
          [6, 7, 8, 9, 10].forEach((y) => [cx - 1, cx].forEach((x) => sign(x, y, D)));
          [12].forEach((y) => [cx - 1, cx].forEach((x) => sign(x, y, D)));
          for (let x = cx - 6; x < cx + 6; x++) sign(x, 18, "#6b6e74");
        }
      });
    }
    function call(look, lit) {
      const w = CALL_W;
      const h = CALL_H;
      return mk(w, h, (c) => {
        P(c, look.frame, 0, 0, w, h);
        P(c, lit ? "#151517" : look.off, 1, 1, w - 2, h - 2);
        if (!lit) return;
        const tiles = [
          [2, 2, "#4f5b56", "#e9d6bf", "#7f9a72", "#3a2e28"],
          [23, 2, "#5c5149", "#c99f7f", "#3e4a5e", null],
          [2, 11, "#46505e", "#f0d2b8", "#a65d4e", "#6b4a35"],
          [23, 11, "#5b5560", "#8d6748", "#d8cfb8", "#1f1b19"]
        ];
        tiles.forEach(([x, y, bg, skin, shirt, hair]) => {
          P(c, bg, x, y, 20, 8);
          const cx = x + 10;
          const put = dots(c, y, y + 7);
          const rect = (x0, y0, ww, hh, col, round) => {
            for (let j = 0; j < hh; j++)
              for (let i = 0; i < ww; i++) {
                if (round && (j === 0 || j === hh - 1) && (i === 0 || i === ww - 1)) continue;
                put(x0 + i, y0 + j, col);
              }
          };
          rect(cx - 5, y + 6, 10, 3, shirt, true);
          rect(cx - 1, y + 5, 2, 1, skin, false);
          rect(cx - 2, y + 1, 4, 4, skin, true);
          if (hair) {
            rect(cx - 2, y + 1, 4, 1, hair, false);
            put(cx - 2, y + 2, hair);
            put(cx + 1, y + 2, hair);
          }
        });
        const [ax, ay] = tiles[0];
        P(c, "#b8d433", ax - 1, ay - 1, 22, 1);
        P(c, "#b8d433", ax - 1, ay + 8, 22, 1);
        P(c, "#b8d433", ax - 1, ay - 1, 1, 10);
        P(c, "#b8d433", ax + 20, ay - 1, 1, 10);
        P(c, "#0e0e10", 1, 21, w - 2, h - 22);
        [4, 8, 12, 16, 20].forEach((x) => P(c, "#b9bcc2", x, 23, 2, 2));
        P(c, "#e0393e", w - 10, 23, 7, 2);
        P(c, look.accent, 3, 3, 2, 2);
      });
    }
    const DESK_GAP = 2;
    function deskScreens(fx) {
      const w = DESK_W;
      const h = DESK_H;
      return [
        ["slack", fx.u - DESK_GAP / 2 - w],
        ["claude", fx.u + DESK_GAP / 2]
      ].map(([kind, u0]) => ({ kind, u0, cu: u0 + w / 2, v: fx.v, z: fx.z, w, h }));
    }
    function callScreen(fx) {
      return { u: fx.u, v: fx.v, v0: fx.v - CALL_W / 2, z: fx.z, w: CALL_W, h: CALL_H };
    }
    function deskBox(fx) {
      const [a, b] = deskScreens(fx);
      return [a.u0, fx.v - 1, fx.z, b.u0 + b.w, fx.v, fx.z + DESK_H];
    }
    function callBox(fx) {
      const s = callScreen(fx);
      return [s.u - 1, s.v0, s.z, s.u, s.v0 + s.w, s.z + s.h];
    }
    function placeDesk(ctx, fx, look, links, draw) {
      if (fx.facing !== "+v") throw new Error("desk screens face +v");
      deskScreens(fx).forEach((s) => {
        const kind = links && links[s.kind] === false ? "warn" : s.kind;
        draw.stand(ctx, s);
        draw.box(ctx, s.u0, s.v - 1, s.z, s.w, 1, s.h, look.body, Object.assign({ edge: false }, look.bodyOpts));
        draw.onV(ctx, desk(kind, look), s.u0, s.v, s.z + s.h);
      });
    }
    function placeCall(ctx, fx, look, lit, draw) {
      if (fx.facing !== "+u") throw new Error("the call screen faces +u");
      const s = callScreen(fx);
      draw.stand(ctx, s);
      draw.box(ctx, s.u - 1, s.v0, s.z, 1, s.w, s.h, look.body, Object.assign({ edge: false }, look.bodyOpts));
      draw.onU(ctx, call(look, lit), s.u, s.v0, s.z + s.h);
    }
    window.OFFICE_SCREENS = {
      DESK_W,
      DESK_H,
      DESK_GAP,
      CALL_W,
      CALL_H,
      desk,
      call,
      deskScreens,
      callScreen,
      deskBox,
      callBox,
      placeDesk,
      placeCall
    };
  })();
  OFFICE_SCREENS = window.OFFICE_SCREENS;
  (function() {
    "use strict";
    function maskFor(parts, u, v) {
      let mask = 0, bit = 0;
      for (const part of parts) {
        if (!part.fp) continue;
        if (bit >= 53) throw new Error("A room has more than 53 occluding parts");
        if (part.front ?? !(u > part.fp[2] || v > part.fp[3])) mask += 2 ** bit;
        bit++;
      }
      return mask;
    }
    function layers(parts, mask, mk) {
      const back = mk(480, 560, (ctx2) => parts.forEach((p) => p.draw(ctx2)));
      const coverage = mk(480, 560, () => {
      });
      const cover = coverage.getContext("2d");
      const scratch = mk(480, 560, () => {
      }), ctx = scratch.getContext("2d");
      ctx.roomOcclusionMask = true;
      let bit = 0;
      for (const part of parts) {
        ctx.clearRect(0, 0, 480, 560);
        part.draw(ctx);
        const foreground = part.fp && Math.floor(mask / 2 ** bit++) % 2 === 1;
        cover.globalCompositeOperation = foreground ? "source-over" : "destination-out";
        cover.drawImage(scratch, 0, 0);
      }
      const front = mk(480, 560, (c) => {
        c.drawImage(back, 0, 0);
        c.globalCompositeOperation = "destination-in";
        c.drawImage(coverage, 0, 0);
        c.globalCompositeOperation = "source-over";
      });
      return { back, front };
    }
    function sleepPlace(bed) {
      return bed.alongV ? { u: bed.u + bed.d / 2, v: bed.v - bed.w / 2, z: bed.z } : { u: bed.u + bed.w / 2, v: bed.v + bed.d / 2, z: bed.z };
    }
    function sleeper(ctx, image, project, bed, place) {
      if (place) {
        const center = sleepPlace(bed);
        bed = { ...bed, u: bed.u + place.u - center.u, v: bed.v + place.v - center.v, z: place.z };
      }
      const matrix = ctx.getTransform();
      const at2 = (x, y) => {
        const p = bed.alongV ? project(bed.u + y * bed.d, bed.v - x * bed.w, bed.z) : project(bed.u + x * bed.w, bed.v + y * bed.d, bed.z);
        return [matrix.a * p[0] + matrix.c * p[1] + matrix.e, matrix.b * p[0] + matrix.d * p[1] + matrix.f];
      };
      const a = at2(0, 0), b = at2(1, 0), c = at2(0, 1), end = at2(1, 1);
      const ux = b[0] - a[0], uy = b[1] - a[1];
      const vx = c[0] - a[0], vy = c[1] - a[1], det = ux * vy - uy * vx;
      const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0], end[0])));
      const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1], end[1])));
      const w = Math.min(ctx.canvas.width, Math.ceil(Math.max(a[0], b[0], c[0], end[0]))) - x0;
      const h = Math.min(ctx.canvas.height, Math.ceil(Math.max(a[1], b[1], c[1], end[1]))) - y0;
      if (w <= 0 || h <= 0 || !det) return;
      const src = image.getContext("2d").getImageData(0, 0, image.width, image.height).data;
      const target = ctx.getImageData(x0, y0, w, h), dst = target.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = x0 + x + 0.5 - a[0], dy = y0 + y + 0.5 - a[1];
        const u = (dx * vy - dy * vx) / det, v = (dy * ux - dx * uy) / det;
        if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
        const si = (Math.floor(v * image.height) * image.width + Math.floor(u * image.width)) * 4;
        const alpha = src[si + 3] / 255;
        if (!alpha) continue;
        const di = (y * w + x) * 4, old = dst[di + 3] / 255;
        const combined = alpha + old * (1 - alpha);
        for (let ch = 0; ch < 3; ch++)
          dst[di + ch] = (src[si + ch] * alpha + dst[di + ch] * old * (1 - alpha)) / combined;
        dst[di + 3] = combined * 255;
      }
      ctx.putImageData(target, x0, y0);
    }
    window.ROOM_PAINTER = { maskFor, layers, sleeper, sleepPlace };
  })();
  ROOM_PAINTER = window.ROOM_PAINTER;
  (function() {
    "use strict";
    const STATIONS = ["code", "work", "library", "board", "phone", "meeting", "tea", "handoff", "door", "walk", "sleep"];
    const SPOTS = ["tasks", "library", "meeting", "handoff", "phone", "desk"];
    const STOPS = {
      code: "code",
      work: "code",
      board: "board",
      library: "library",
      phone: "phone",
      handoff: "handoff",
      tea: "tea",
      meeting: "meeting",
      sleep: "sleep"
    };
    const API = ["STATIONS", "PLACES", "NODES", "EDGES", "SPOTS", "FIXTURES", "floorAt", "project", "use", "slotFor", "layers", "drawOri"];
    const FACINGS = {
      // The desk's two screens face +v and Agent sits on their +v side: on
      // screen Agent looks up-right, the way the hand-drawn turn pose faces.
      desk: { screen: "+v", pose: "turn", stations: ["code", "work"] },
      // The call screen faces +u and Agent sits on its +u side: on screen Agent
      // looks up-left, so the pose is the turn pose's mirror image.
      meeting: { screen: "+u", pose: "turnL", stations: ["meeting"] }
    };
    const POSES = ["idle", "blink", "walkA", "walkB", "walkC", "walkD", "type", "type2", "back", "read", "post", "phone", "tea", "wave", "attention", "cheer", "think", "sleep", "sleep2", "icon24", "icon16"];
    const TURN = { maxW: 30, maxH: 24, k: 2 };
    const NEAR = 0.5;
    const near = (a, b) => Math.abs(a - b) <= NEAR;
    const fmt = (p) => "(" + p.map((n) => Math.round(n * 10) / 10).join(", ") + ")";
    function unreachable(nodes, edges) {
      const names = [...new Set(Object.values(STOPS))].filter((n) => nodes[n]);
      if (!names.length) return [];
      const seen = /* @__PURE__ */ new Set([names[0]]);
      const todo = [names[0]];
      while (todo.length) {
        const a = todo.pop();
        edges.forEach(([x, y]) => {
          const b = x === a ? y : y === a ? x : null;
          if (b && !seen.has(b)) {
            seen.add(b);
            todo.push(b);
          }
        });
      }
      return names.filter((n) => !seen.has(n));
    }
    function check(entry) {
      const out = [];
      if (!entry || !entry.room) return ["\u6CA1\u6709 room"];
      const r = entry.room;
      const S = window.OFFICE_SCREENS;
      API.forEach((k) => {
        if (r[k] === void 0) out.push("\u7F3A\u5C11 " + k);
      });
      if (out.length) return out;
      STATIONS.forEach((s) => {
        if (!r.PLACES[s]) out.push("\u7AD9\u70B9 " + s + " \u6CA1\u6709 PLACE");
      });
      SPOTS.forEach((s) => {
        const b = r.SPOTS[s];
        if (!b) out.push("\u7F3A\u5C11\u70B9\u51FB\u533A " + s);
        else if (b.length !== 6 || b[0] > b[3] || b[1] > b[4] || b[2] > b[5]) out.push("\u70B9\u51FB\u533A " + s + " \u4E0D\u662F [u0, v0, z0, u1, v1, z1]");
      });
      Object.entries(FACINGS).forEach(([name, f]) => {
        const fx = r.FIXTURES[name];
        if (!fx) return out.push("\u7F3A\u5C11 FIXTURES." + name);
        if (fx.facing !== f.screen) out.push(name + " \u7684\u5C4F\u5E55\u671D\u5411\u662F " + fx.facing + "\uFF0C\u5E94\u4E3A " + f.screen);
        if (fx.w !== void 0 || fx.h !== void 0) out.push(name + " \u7684\u5C4F\u5E55\u4E0D\u80FD\u81EA\u5B9A\u5C3A\u5BF8\uFF0C\u7528\u5C4F\u5E55\u516C\u7528\u4EF6\u7684");
        if (!fx.seat) return out.push(name + " \u6CA1\u6709\u5EA7\u4F4D seat");
        const [su, sv] = fx.seat;
        if (name === "desk") {
          const keyboard = fx.keyboard;
          if (!Array.isArray(keyboard) || keyboard.length !== 6 || !keyboard.every(Number.isFinite) || keyboard.slice(3).some((n) => n <= 0))
            out.push("\u4E66\u684C\u952E\u76D8\u8981\u7ED9\u51FA [u, v, z, width, depth, height]\uFF0C\u5C3A\u5BF8\u4E3A\u6B63\u6570");
          if (!near(su, fx.u)) out.push("\u4E66\u684C\u5EA7\u4F4D\u4E0D\u5728\u4E24\u5757\u5C4F\u7684\u4E2D\u7EBF\u4E0A\uFF1A\u5EA7\u4F4D u " + su + "\uFF0C\u5C4F\u5E55\u4E2D\u7EBF u " + fx.u);
          if (!(sv > fx.v)) out.push("\u4E66\u684C\u5EA7\u4F4D\u8981\u5728\u5C4F\u5E55\u524D\u9762\uFF08\u5EA7\u4F4D v \u5927\u4E8E\u5C4F\u5E55 v " + fx.v + "\uFF09");
          const box = S.deskBox(fx);
          if (r.SPOTS.desk && r.SPOTS.desk.some((n, i) => n !== box[i])) out.push("\u70B9\u51FB\u533A desk \u8981\u7B49\u4E8E\u4E24\u5757\u5C4F\u7684\u8303\u56F4 " + fmt(box));
        } else {
          if (!near(sv, fx.v)) out.push("\u4F1A\u8BAE\u5EA7\u4F4D\u4E0D\u5728\u901A\u8BDD\u5C4F\u7684\u4E2D\u7EBF\u4E0A\uFF1A\u5EA7\u4F4D v " + sv + "\uFF0C\u5C4F\u5E55\u4E2D\u7EBF v " + fx.v);
          if (!(su > fx.u)) out.push("\u4F1A\u8BAE\u5EA7\u4F4D\u8981\u5728\u5C4F\u5E55\u524D\u9762\uFF08\u5EA7\u4F4D u \u5927\u4E8E\u5C4F\u5E55 u " + fx.u + "\uFF09");
          const box = S.callBox(fx);
          const m = r.SPOTS.meeting;
          if (m && !(m[0] <= box[0] && m[1] <= box[1] && m[2] <= box[2] && m[3] >= box[3] && m[4] >= box[4] && m[5] >= box[5]))
            out.push("\u70B9\u51FB\u533A meeting \u8981\u5305\u4F4F\u901A\u8BDD\u5C4F " + fmt(box));
        }
        f.stations.forEach((s) => {
          const p = r.PLACES[s];
          if (!p) return;
          if (!near(p.u, su) || !near(p.v, sv)) out.push("\u7AD9\u70B9 " + s + " \u4E0D\u5728\u5EA7\u4F4D\u4E0A\uFF1A" + fmt([p.u, p.v]) + "\uFF0C\u5EA7\u4F4D " + fmt([su, sv]));
          if (p.own !== f.pose) out.push("\u7AD9\u70B9 " + s + " \u7684\u59FF\u52BF\u662F " + p.own + "\uFF0C\u5E94\u4E3A " + f.pose);
        });
      });
      Object.values(STOPS).forEach((n) => {
        if (!r.NODES[n]) out.push("\u5730\u9762\u8DEF\u7EBF\u7F3A\u5C11\u8282\u70B9 " + n);
      });
      r.EDGES.forEach(([a, b]) => {
        if (!r.NODES[a] || !r.NODES[b]) out.push("\u8DEF\u7EBF " + a + " \u2192 " + b + " \u8FDE\u7740\u4E0D\u5B58\u5728\u7684\u8282\u70B9");
      });
      unreachable(r.NODES, r.EDGES).forEach((n) => out.push("\u8282\u70B9 " + n + " \u8D70\u4E0D\u5230"));
      [["desk", "code"], ["meeting", "meeting"]].forEach(([fx, node]) => {
        const seat = r.FIXTURES[fx] && r.FIXTURES[fx].seat;
        const n = r.NODES[node];
        if (seat && n && (!Number.isFinite(n[0]) || !Number.isFinite(n[1]) || Math.hypot(n[0] - seat[0], n[1] - seat[1]) > TURN.maxW * TURN.k))
          out.push("\u5730\u9762\u5019\u4F4D\u8282\u70B9 " + node + " \u8981\u9760\u8FD1\u5EA7\u4F4D " + fmt(seat));
      });
      return out;
    }
    function checkCharacter(ch, turns) {
      const out = [];
      const name = ch && (ch.zh || ch.key) || "?";
      if (!ch || !ch.poses) return [name + "\uFF1A\u6CA1\u6709 poses"];
      POSES.forEach((p) => {
        if (!ch.poses[p]) out.push(name + "\uFF1A\u7F3A\u5C11\u59FF\u52BF " + p);
      });
      const scale = ch.k === void 0 ? TURN.k : ch.k;
      if (scale !== 1 && scale !== TURN.k) out.push(name + "\uFF1Ak \u5E94\u4E3A 1 \u6216 " + TURN.k);
      const rows = (turns || window.ACTOR_TURN || {})[ch.key];
      if (!rows) out.push(name + "\uFF1AORI_TURN \u91CC\u6CA1\u6709 " + ch.key + "\uFF08\u5750\u7740\u8F6C\u5411\u5C4F\u5E55\u7684\u59FF\u52BF\uFF09");
      else {
        const w = Math.max(...rows.map((r) => r.length));
        if (w * scale > TURN.maxW * TURN.k || rows.length * scale > TURN.maxH * TURN.k) out.push(name + "\uFF1A\u8F6C\u8EAB\u5750\u59FF " + w + "\xD7" + rows.length + "\uFF08k=" + scale + "\uFF09\uFF0C\u8D85\u8FC7\u4E16\u754C\u8303\u56F4 " + TURN.maxW * TURN.k + "\xD7" + TURN.maxH * TURN.k);
      }
      return out;
    }
    const TURNED = [/* @__PURE__ */ new WeakMap(), /* @__PURE__ */ new WeakMap()];
    function turnSprite(char, mirror) {
      const cache = TURNED[mirror ? 1 : 0];
      let s = cache.get(char.poses);
      if (s) return s;
      if (mirror) s = window.PX.flipX(turnSprite(char, false));
      else {
        const key = char.key || (window.ACTOR && char.poses === window.ACTOR.sprout ? "sprout" : "");
        const rows = (window.ACTOR_TURN || {})[key];
        s = rows ? window.PX.sprite(rows) : char.poses.back || char.poses.idle;
      }
      cache.set(char.poses, s);
      return s;
    }
    window.ROOM_CONTRACT = { STATIONS, SPOTS, STOPS, API, FACINGS, POSES, TURN, check, checkCharacter, turnSprite };
  })();
  ROOM_CONTRACT = window.ROOM_CONTRACT;
  (function() {
    "use strict";
    const { P, ell, mix, rng } = CP;
    const poly = CX.poly;
    const W = 480, H = 560;
    let light = "day";
    let weather = "clear";
    const colorAt = (time2, day, night, golden) => time2 === "night" ? night : time2 === "golden" ? golden || day : day;
    const color = (day, night, golden) => colorAt(light, day, night, golden);
    const snowAsRain = /* @__PURE__ */ new Set(["court", "ubud", "marrakech", "dali", "santorini"]);
    function weatherFor(room, reading = "clear") {
      return reading === "snow" && snowAsRain.has(room) ? "rain" : reading;
    }
    const line = (c, points, ink, width = 1) => {
      for (let k = 1; k < points.length; k++) {
        const [x, y] = points[k - 1], [xx, yy] = points[k];
        const n = Math.max(Math.abs(xx - x), Math.abs(yy - y), 1);
        for (let i = 0; i <= n; i++) P(c, ink, Math.round(x + (xx - x) * i / n), Math.round(y + (yy - y) * i / n), width, width);
      }
    };
    function gradient(c, top, bottom, y = 0, h = H) {
      for (let k = 0; k < h; k += 3) P(c, mix(top, bottom, k / h), 0, y + k, W, 3);
    }
    const weatherSkies = {
      cloudy: [["#a8b9c3", "#2d3d50", "#a9a2ad"], ["#d9dcda", "#667580", "#d6beb2"]],
      fog: [["#c6d2d0", "#465866", "#c5baba"], ["#e3e5dc", "#81908e", "#e1cebe"]],
      rain: [["#8496a7", "#253346", "#8b8998"], ["#b9c7cb", "#556a7a", "#bba9a5"]],
      snow: [["#b9cbd6", "#394e64", "#b6afbb"], ["#e5ebee", "#708496", "#e1cfd0"]]
    };
    function weatherSky(c) {
      const tones = weatherSkies[weather];
      if (!tones) return false;
      const [top, bottom] = tones.map((tone) => color(...tone));
      gradient(c, top, bottom);
      for (const [x, y, w, h] of [[32, 36, 95, 9], [193, 67, 124, 12], [407, 49, 125, 11]]) {
        ell(c, x, y, w, h, mix(top, bottom, 0.22));
        ell(c, x + 24, y + 7, w - 9, h - 4, mix(top, bottom, 0.35));
      }
      return true;
    }
    function weatherOverLandscape(c) {
      if (weather === "clear") return;
      c.save();
      if (weather === "fog") {
        const mist = color("#e0e5dd", "#9aa9af", "#e9d6c9");
        for (let y = 0; y < H; y += 4) {
          c.globalAlpha = 0.1 + 0.44 * Math.max(0, 1 - Math.abs(y - 172) / 325);
          P(c, mist, 0, y, W, 4);
        }
      } else {
        c.globalAlpha = weather === "rain" ? 0.19 : 0.09;
        P(c, color("#899da9", "#425a74", "#a49aab"), 0, 0, W, H);
      }
      c.restore();
    }
    const hasPrecipitation = (reading) => reading === "rain" || reading === "snow";
    function drawPrecipitation(c, reading, time2) {
      if (!hasPrecipitation(reading)) return;
      c.save();
      const r = rng(157);
      if (reading === "rain") {
        c.globalAlpha = time2 === "night" ? 0.4 : 0.5;
        const drop = colorAt(time2, "#59768a", "#9eb5cd", "#697a91");
        for (let i = 0; i < 1250; i++) P(c, drop, r() * W, r() * H, 1, 3 + r() * 3);
      } else {
        c.globalAlpha = 0.82;
        const flake = colorAt(time2, "#ffffff", "#edf6ff", "#fff4ed");
        for (let i = 0; i < 520; i++) {
          const size = i % 4 === 0 ? 2 : 1;
          P(c, flake, r() * W, r() * H, size, size);
        }
      }
      c.restore();
    }
    function sky(c, family = "green") {
      if (weatherSky(c)) return;
      const warm = family === "warm", sea = family === "sea";
      P(c, color(warm ? "#f3e4c8" : "#edf0dc", "#677b87", "#f8d8ab"), 0, 0, W, H);
      gradient(c, color(warm ? "#d5d3c5" : sea ? "#9ecbd6" : "#b6cfc6", "#1d2e41", "#c3adab"), color(warm ? "#f3e4c8" : "#edf0dc", "#677b87", "#f8d8ab"), 0, 250);
      if (light === "night") {
        const r = rng(137);
        for (let i = 0; i < 32; i++) P(c, i % 4 ? "#b3c6c4" : "#e1d9b3", 14 + r() * 450, 10 + r() * 110, 1, 1);
        ell(c, 389, 51, 12, 12, "#f2e8ba");
        ell(c, 394, 47, 11, 11, "#293b4e");
      } else {
        ell(c, 388, 54, light === "golden" ? 20 : 15, light === "golden" ? 20 : 15, color("#fbf4ce", "", "#ffe8b3"));
        for (const [x, y, w] of [[57, 47, 45], [244, 31, 28], [426, 97, 44]]) {
          ell(c, x, y, w, 3, color("#e5e9d7", "", "#ead1bc"));
          ell(c, x + 17, y + 3, w + 12, 2, color("#e5e9d7", "", "#ead1bc"));
        }
        birds(c, 165, 55, color("#789b9a", "#a7b5b5", "#b59488"));
      }
    }
    function birds(c, x, y, ink) {
      for (let i = 0; i < 3; i++) {
        const xx = x + i * 18, yy = y + i % 2 * 9;
        line(c, [[xx - 4, yy - 2], [xx, yy], [xx + 4, yy - 2]], ink);
      }
    }
    function ridge(c, base, rise, ink, seed = 9) {
      const r = rng(seed), phase = r() * 6, pts = [[-20, base + 90]];
      for (let x = -20; x <= 520; x += 12) {
        const y = base - rise * (0.53 + 0.25 * Math.sin(x / 96 + phase) + 0.14 * Math.sin(x / 45 + phase) + 0.025 * Math.sin(x / 13));
        pts.push([x, Math.round(y)]);
      }
      pts.push([510, H], [-20, H]);
      poly(c, pts, ink);
    }
    function hills(c, tall = false) {
      ridge(c, 180, tall ? 105 : 66, color("#b7cec5", "#4b6570", "#c2bda2"), 6);
      ridge(c, 217, tall ? 100 : 68, color("#8eafa3", "#3d5961", "#a3ac8b"), 35);
      ridge(c, 265, tall ? 84 : 52, color("#739580", "#304b4e", "#8d9b72"), 22);
    }
    function ground(c, kind = "grass", start = 260) {
      const colors = {
        grass: [color("#a2b389", "#3b5148", "#b7ac7e"), color("#bdc39b", "#4a5c4e", "#c7b88e")],
        sand: [color("#dcc7a1", "#6b6666", "#e5bd91"), color("#ead8b4", "#77716e", "#edcd9e")],
        stone: [color("#c5c6af", "#566268", "#d3bea1"), color("#d9d6bd", "#687277", "#ddc8a8")],
        water: [color("#82b2ae", "#304d5c", "#baa99e"), color("#9bbfba", "#3b5966", "#cbb6a4")]
      };
      const [top, bottom] = colors[kind];
      gradient(c, top, bottom, start, H - start);
    }
    function ripples(c, start = 240, ink, seed = 3) {
      const r = rng(seed);
      for (let i = 0; i < 85; i++) {
        const y = start + r() * (H - start), x = r() * W;
        P(c, ink || color("#c9ddce", "#71858a", "#ebcfac"), x, y, 3 + y / H * r() * 24, 1);
      }
    }
    function leaves(c, x, y, size, tones, seed = 2) {
      const r = rng(seed);
      ell(c, x, y, size * 0.82, size * 0.63, tones[0]);
      for (let i = 0; i < 31; i++) {
        const a = i * 2.4, rr = size * (0.16 + r() * 0.24), xx = Math.round(x + Math.cos(a) * size * (0.32 + r() * 0.45)), yy = Math.round(y + Math.sin(a) * size * 0.48);
        ell(c, xx, yy, rr, rr * 0.7, tones[i % tones.length]);
        if (i % 3 === 0) {
          P(c, tones[2], xx - rr * 0.4, yy - rr * 0.35, rr * 0.7, 2);
          P(c, tones[1], xx + rr * 0.3, yy + rr * 0.2, rr * 0.5, 2);
        }
      }
    }
    function tree(c, x, y, height, style = "green", seed = 7) {
      const bark = color("#716f53", "#39434a", "#81705a");
      const palettes = {
        green: [color("#718e65", "#304c46", "#8b9567"), color("#819a6b", "#3a5549", "#a3a471"), color("#9bad7c", "#4e6756", "#b0ae7b")],
        cherry: [color("#c89699", "#685569", "#cd9a9d"), color("#dfb5b0", "#876c80", "#e7beb0"), color("#edc9bb", "#9a7c8c", "#f0cfb7")],
        maple: [color("#a65e46", "#60484b", "#b36b4b"), color("#c37d53", "#795b51", "#d58e59"), color("#dca16a", "#8c715d", "#e9ad6d")],
        olive: [color("#7e977e", "#395551", "#9eaa87"), color("#a1b09a", "#4e6963", "#b4b99a"), color("#bac4a5", "#647b6c", "#c3c6a2")]
      };
      line(c, [[x, y], [x - 4, y - height * 0.55], [x + 5, y - height * 0.82]], bark, height > 90 ? 5 : 3);
      line(c, [[x - 2, y - height * 0.42], [x - height * 0.23, y - height * 0.74]], bark, 2);
      line(c, [[x - 3, y - height * 0.54], [x + height * 0.25, y - height * 0.83]], bark, 2);
      leaves(c, x, y - height * 0.79, height * 0.4, palettes[style], seed);
    }
    function pine(c, x, y, h, ink) {
      P(c, color("#6e755b", "#3c4d50", "#827558"), x - 1, y - h, 3, h);
      for (let j = 0; j < 4; j++) {
        const yy = y - h + j * h * 0.19, s = h * (0.14 + j * 0.075);
        poly(c, [[x, yy - h * 0.15], [x - s, yy + h * 0.3], [x + s, yy + h * 0.3]], ink || color("#527966", "#2c4b49", "#798562"));
      }
    }
    function meadow(c, seed = 8, flowers = false) {
      const r = rng(seed);
      for (let i = 0; i < 150; i++) {
        const x = r() * W, y = 260 + r() * 300;
        P(c, color("#91a37c", "#3b554b", "#aa9d6d"), x, y, 1, 3);
        if (flowers && i % 4 === 0) {
          P(c, color(i % 3 ? "#e7dfbc" : "#e9c4ad", "#a3ac91", "#f0ce9e"), x - 1, y - 1, 3, 2);
        }
      }
    }
    function path(c, ink, bend = 0) {
      poly(c, [[190 + bend, 250], [211 + bend, 250], [221, 370], [330, H], [248, H], [186, 375]], ink || color("#d7ceb0", "#64736b", "#d9c39c"));
    }
    function bamboo(c, x, base, height, seed = 2) {
      const r = rng(seed);
      for (let j = 0; j < 6; j++) {
        const xx = x + j * 10 + r() * 7, top = base - height * (0.78 + r() * 0.22);
        line(c, [[xx, base], [xx - 5, top]], color("#718b65", "#38544c", "#8b9564"), 3);
        for (let yy = top + 12; yy < base - 8; yy += 25) {
          P(c, color("#a4b18a", "#68806b", "#b4b07c"), xx - 3, yy, 4, 1);
          for (let k = 0; k < 5; k++) {
            const sign = k % 2 ? -1 : 1;
            line(c, [[xx - 2, yy], [xx + sign * (9 + k * 4), yy - 4 - k * 3]], color("#617f5f", "#34534a", "#82905e"), 2);
          }
        }
      }
    }
    function lake(c, horizon = 177) {
      gradient(c, color("#a9c9c4", "#4a6c7b", "#d3bb9e"), color("#7ea9a7", "#344f60", "#bda597"), horizon, H - horizon);
      ripples(c, horizon + 9);
    }
    function mountain(c, x, base, w, h, snow = false) {
      const peak = x + w * 0.51;
      poly(c, [[x, base], [x + w * 0.18, base - h * 0.34], [peak, base - h], [x + w * 0.73, base - h * 0.55], [x + w, base]], color("#83a2a9", "#456277", "#a0a3a0"));
      poly(c, [[peak, base - h], [x + w * 0.62, base - h * 0.47], [x + w, base], [x + w * 0.54, base]], color("#71939e", "#354e67", "#92969b"));
      if (snow) poly(c, [[peak, base - h], [x + w * 0.64, base - h * 0.67], [x + w * 0.55, base - h * 0.75], [x + w * 0.5, base - h * 0.62], [x + w * 0.39, base - h * 0.69]], color("#eef0dd", "#b1c5c9", "#f3d9bb"));
    }
    function terraces(c, gold = false) {
      const tones = gold ? [color("#c0b16d", "#6c7059", "#cfb06a"), color("#d5c284", "#7c7d64", "#dfbf77"), color("#e6d39b", "#909075", "#ecd08e")] : [color("#6e9667", "#35564d", "#94a375"), color("#94b07a", "#496957", "#aeb582"), color("#b9c68c", "#627e62", "#c6c18d")];
      for (let i = 0; i < 9; i++) {
        const y = 159 + i * 40;
        poly(c, [[0, y + 10], [120, y - 18], [267, y + 5], [390, y - 20], [480, y - 4], [480, H], [0, H]], tones[i % 3]);
        line(c, [[0, y + 10], [120, y - 18], [267, y + 5], [390, y - 20], [480, y - 4]], color("#5d7e5b", "#344e49", "#8c9563"), 2);
        line(c, [[0, y + 14], [120, y - 14], [267, y + 9], [390, y - 16], [480, y]], gold ? color("#f0ddab", "#91977b", "#f4d391") : color("#c4d3a2", "#7c957c", "#d0cd9a"));
      }
    }
    function palm(c, x, y, h, seed = 5) {
      const cx = x + 3, cy = y - h, span = h * 0.43;
      line(c, [[x, y], [x + 7, y - h * 0.47], [cx, cy]], color("#8b8064", "#46615e", "#a28d69"), 5);
      for (let yy = y - 8; yy > cy; yy -= 10) P(c, color("#aca080", "#637d6f", "#bdab7d"), x + 1, yy, 4, 1);
      const fronds = [[-1, 0.38], [-0.86, -0.08], [-0.53, -0.52], [-0.12, -0.78], [0.36, -0.64], [0.79, -0.21], [1, 0.32]];
      fronds.forEach(([dx, dy], k) => {
        const point = (t) => [cx + dx * span * t, cy + dy * span * t - Math.sin(t * Math.PI) * 15 + t * t * 9];
        const points = Array.from({ length: 13 }, (_, i) => point(i / 12));
        line(c, points, color("#58795b", "#284b46", "#83915f"), 2);
        for (let j = 2; j < 12; j++) {
          const t = j / 12, [px, py] = point(t), [qx, qy] = point(Math.min(1, t + 0.08));
          const nx = -(qy - py), ny = qx - px, mag = Math.hypot(nx, ny) || 1;
          const reach = 3 + Math.sin(t * Math.PI) * 10;
          const ink = color(k % 3 ? "#789365" : "#66855c", "#3a5d4d", "#a0a36d");
          for (const sign of [-1, 1]) poly(c, [[px, py], [px + sign * nx / mag * reach + dx * 6, py + sign * ny / mag * reach + 5], [qx, qy]], ink);
        }
      });
    }
    function house(c, x, y, w, h, family = "italy", seed = 2) {
      const r = rng(seed);
      const white = family === "white", earth = family === "earth";
      const wall = white ? color("#f2efdc", "#9dacb6", "#f5d9bb") : earth ? color("#c19377", "#705f67", "#d3a17c") : color(["#d2af91", "#d9b99b", "#d6c6aa"][seed % 3], "#7a7e83", "#dfb598");
      P(c, wall, x, y - h, w, h);
      P(c, mix(wall, color("#ad997d", "#455264", "#ac8370"), 0.3), x + w - 5, y - h, 5, h);
      if (!earth) poly(c, [[x - 2, y - h], [x + w * 0.45, y - h - 7], [x + w + 2, y - h - 1], [x + w, y - h + 3], [x, y - h + 3]], white ? color("#dfdfce", "#829bab", "#e0c3ac") : color("#a67e64", "#5c606d", "#b58368"));
      else P(c, color("#a77b69", "#5d5863", "#b7856b"), x - 1, y - h, w + 2, 3);
      const win = light === "night" ? "#e3c291" : white ? "#6d95a4" : "#78847c";
      for (let yy = y - h + 8; yy < y - 5; yy += 12) {
        for (let xx = x + 5; xx < x + w - 5; xx += 10) if (r() > 0.2) {
          P(c, win, xx, yy, 3, 5);
        }
      }
    }
    function city(c, y, family = "italy", seed = 19) {
      const r = rng(seed);
      for (let x = -12; x < W; x += 26) house(c, x, y + r() * 12, 25 + r() * 9, 26 + r() * 36, family, Math.floor(r() * 90));
    }
    function boat(c, x, y, size = 16, sail = false) {
      poly(c, [[x - size, y], [x + size, y], [x + size * 0.6, y + 3], [x - size * 0.6, y + 3]], color("#5c7775", "#243d4b", "#8a7c77"));
      if (sail) {
        P(c, color("#a0a392", "#a6b8b7", "#c5af93"), x, y - size * 2, 1, size * 2);
        poly(c, [[x - 1, y - size * 2], [x - 1, y - 3], [x - size, y - 3]], color("#f3edcc", "#b3c6c7", "#f5d8ad"));
      }
    }
    function dunes(c) {
      for (let j = 0; j < 5; j++) {
        const y = 165 + j * 87;
        poly(c, [[0, y + 20], [100, y - 17], [215, y + 18], [365, y - 12], [480, y + 11], [480, H], [0, H]], color(["#d4ba95", "#d9be96", "#dfc49b", "#e6cda4", "#ebd4ae"][j], ["#6c6b75", "#736d75", "#7a7178", "#80767b", "#897e82"][j], ["#d1a585", "#dcae8b", "#e4b891", "#e9c29a", "#edcca4"][j]));
      }
    }
    function mediterranean(c, sunset = false) {
      sky(c, sunset ? "warm" : "sea");
      gradient(c, color(sunset ? "#d5bdae" : "#92c0ce", "#48667e", "#d3b3a3"), color(sunset ? "#bda9a4" : "#679fb9", "#2c465d", "#b89d9d"), 154, H - 154);
      ripples(c, 165, color(sunset ? "#ecceaf" : "#c3dbe0", "#71889c", "#ebc5a4"));
      poly(c, [[0, 153], [62, 132], [122, 141], [202, 160], [238, 176], [181, 177], [105, 160], [0, 166]], color("#8ea5aa", "#4a6174", "#bca6a3"));
      poly(c, [[480, 152], [425, 153], [395, 167], [375, 170], [480, 170]], color("#97adac", "#4e6879", "#c3aaa1"));
      boat(c, 76, 195, 6, true);
    }
    const IDENTITY_FRAME = { scale: 1, x: 0, y: 0 };
    const VENICE_FRAME = { scale: 0.86, x: 34, y: 22, separateBackground: true };
    function framing(key) {
      return key === "venice" ? VENICE_FRAME : IDENTITY_FRAME;
    }
    function projectView(key, u, v, z) {
      const room = window.OFFICE_ROOMS.find((entry) => entry.key === key).room;
      const [x, y] = room.project(u, v, z), f = framing(key);
      return [f.x + x * f.scale, f.y + y * f.scale];
    }
    const seasons = ["\u6625", "\u590F", "\u79CB", "\u51AC"];
    const seasonKeys = ["spring", "summer", "autumn", "winter"];
    const week = [0, 0, 1, 1, 2, 2, 3];
    let season = 0, surface = null, waterSurface = null;
    function seasonForWeekday(day) {
      if (!Number.isInteger(day) || day < 0 || day > 6) throw new RangeError("Expected a Monday-based weekday from 0 to 6");
      return week[day];
    }
    function land(c, pts, ink) {
      poly(c, pts, ink);
      if (surface) poly(surface, pts, "#ffffff");
      if (waterSurface) poly(waterSurface, pts, "#000000");
    }
    function water(c, pts, ink) {
      poly(c, pts, ink);
      if (surface) poly(surface, pts, "#000000");
      if (waterSurface) poly(waterSurface, pts, "#ffffff");
    }
    function terrain(c, type = "grass", start = 225) {
      const tones = {
        grass: ["#b3bc93", "#95aa7d", "#c0ac7c", "#e1e5d9"],
        tropical: ["#a9b987", "#8da979", "#b2aa78", "#97ae8c"],
        stone: ["#d0c9b4", "#d6cbb0", "#cabc9e", "#bfc6bd"],
        sand: ["#dbc6a4", "#e2c59b", "#d6b691", "#cabea4"],
        snow: ["#bcc3a0", "#a2b18b", "#c0ad83", "#e7ece6"]
      };
      const base = tones[type][season];
      const top = color(base, mix(base, "#2a4051", 0.66), mix(base, "#e5bd8e", 0.23));
      gradient(c, top, color(mix(base, "#ece4c4", 0.12), mix(base, "#324856", 0.6), mix(base, "#edc99d", 0.28)), start, H - start);
      if (surface) P(surface, "#ffffff", 0, start, W, H - start);
    }
    function seasonalSky(c, region = "green") {
      sky(c, region === "desert" ? "warm" : region === "coast" ? "sea" : "green");
      if (season === 3 && weather === "clear") {
        const tone = color("#b8c8ca", "#263b4e", "#b5afa9");
        for (const [x, y, w, h] of [[20, 37, 82, 7], [114, 66, 94, 5], [306, 34, 65, 7], [432, 77, 85, 6]]) ell(c, x, y, w, h, tone);
      }
    }
    function seasonalTree(c, x, y, h, seed = 7) {
      if (season === 3) {
        const bark = color("#817e6b", "#43545a", "#8d7a68");
        line(c, [[x, y], [x - 3, y - h * 0.6], [x + 3, y - h]], bark, 3);
        for (let i = 0; i < 6; i++) {
          const side = i % 2 ? -1 : 1, yy = y - h * (0.4 + i * 0.08), xx = x + side * h * (0.23 + i * 0.02);
          line(c, [[x - 2, yy + 10], [xx, yy - h * 0.17], [xx + side * 12, yy - h * 0.34]], bark, 2);
          line(c, [[xx, yy - h * 0.17], [xx - side * 8, yy - h * 0.28]], bark);
          line(c, [[xx - side * 6, yy - h * 0.12], [xx, yy - h * 0.17]], color("#e8eae0", "#9cacb2", "#e8d6bc"), 2);
        }
      } else tree(c, x, y, h, ["cherry", "green", "maple"][season], seed);
    }
    function seasonalDetails(c, type = "temperate", seed = 52) {
      const r = rng(seed);
      if (type === "temperate" && season === 3) {
        for (let i = 0; i < 28; i++) ell(c, r() * W, 490 + r() * 70, 7 + r() * 16, 2, color("#f6f5eb", "#a4b7bf", "#f6e4c9"));
        return;
      }
      const ink = type === "mediterranean" ? color(season === 3 ? "#7f977b" : "#a0a67c", "#4a6355", "#ada77c") : color(["#88a379", "#7d976e", "#a29266", "#7f9d7a"][season], "#435d50", "#b2a178");
      for (let i = 0; i < 120; i++) {
        const x = r() * W, y = 235 + r() * 325;
        P(c, ink, x, y, 1, 2 + r() * 3);
        if (season === 0 && i % 4 === 0) P(c, color(i % 3 ? "#f0e7bd" : "#dcb2a6", "#a4b4a1", "#ecd1ac"), x - 1, y - 2, 3, 2);
        if (season === 2 && type === "temperate" && i % 3 === 0) P(c, color("#b77e54", "#7e6e5c", "#d8a064"), x, y, 3, 1);
      }
    }
    function paving(c, start = 235, ink) {
      const seam = ink || color("#b7b9a7", "#5c6d71", "#c6b297");
      for (let y = start; y < H; y += 26) {
        line(c, [[0, y], [480, y + 2]], seam);
        for (let x = y % 52 ? 22 : 0; x < W; x += 49) line(c, [[x, y], [x - 7, y + 26]], seam);
      }
    }
    function lowWall(c, x, y, w, h = 14) {
      const wall = color("#c8c4ac", "#738184", "#d8bb9b");
      poly(c, [[x, y], [x + w, y + 4], [x + w, y + h], [x, y + h - 4]], wall);
      line(c, [[x, y], [x + w, y + 4]], color("#e0d9c1", "#9aa7a4", "#e8ccaa"), 3);
      for (let k = 10; k < w; k += 19) line(c, [[x + k, y + 3], [x + k, y + h - 1]], color("#b1b2a1", "#63747c", "#bfa68d"));
    }
    function fieldPlots(c, tropical = false) {
      const base = season === 2 ? "#c7b475" : season === 3 && !tropical ? "#a8b199" : ["#9eb67a", "#7f9f65", "#c7b475", "#89a779"][season];
      const ink = color(base, mix(base, "#304e4e", 0.63), mix(base, "#ddbe85", 0.25));
      const rim = color("#c8c49b", "#708573", "#d8c294");
      for (const pts of [
        [[0, 493], [97, 484], [171, 519], [0, 541]],
        [[0, 546], [174, 523], [204, 560], [0, 560]],
        [[342, 489], [480, 478], [480, 537], [371, 548]]
      ]) {
        land(c, pts, ink);
        line(c, [...pts, pts[0]], rim, 2);
        c.save();
        c.beginPath();
        pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
        c.closePath();
        c.clip();
        for (let x = -30; x < W; x += 13) line(c, [[x, 475], [x + 24, 560]], color(mix(base, "#e0dcb0", 0.25), "#5d7866", "#d2bc84"));
        c.restore();
      }
    }
    function flowerShrub(c, x, y, size, ink) {
      leaves(c, x, y, size, [color("#7f956d", "#3c5b4f", "#9d9b72"), color("#9aac7f", "#526c57", "#b5aa7d"), color("#b6be8e", "#71856b", "#c9b98b")], 37);
      const r = rng(36);
      for (let i = 0; i < 45; i++) {
        const xx = x + (r() - 0.5) * size * 1.65, yy = y + (r() - 0.5) * size;
        P(c, ink || color("#c995aa", "#806c86", "#d5a3a3"), xx, yy, 2 + r() * 2, 2);
      }
    }
    function clearRegionalSky(c, top = "#a9d4e4", bottom = "#ecf1df", nightTop = "#172d47", nightBottom = "#627c92") {
      if (weatherSky(c)) return;
      gradient(c, color(top, nightTop, "#c4a6aa"), color(bottom, nightBottom, "#f7d2a0"));
      if (light === "night") {
        const r = rng(45);
        for (let i = 0; i < 35; i++) P(c, i % 4 ? "#b2c6d4" : "#e4e9d3", r() * W, r() * 113, 1, 1);
        ell(c, 407, 45, 11, 11, "#f3e9c6");
        ell(c, 411, 41, 10, 10, "#203952");
      } else {
        ell(c, 397, 48, 12, 12, color("#fff5cd", "", "#ffe2ac"));
        for (const [x, y, w] of [[42, 56, 37], [246, 33, 22], [445, 108, 35]]) {
          ell(c, x, y, w, 3, color("#fbf9e8", "", "#f2dcc6"));
          ell(c, x + w * 0.25, y - 3, w * 0.55, 5, color("#fbf9e8", "", "#f2dcc6"));
        }
      }
    }
    function clipped(c, pts, paint) {
      c.save();
      c.beginPath();
      pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
      c.closePath();
      c.clip();
      paint();
      c.restore();
    }
    function boulder(c, x, y, s = 1, moss = false) {
      const p = [[-17, 4], [-21, -5], [-10, -17], [7, -20], [21, -7], [18, 6], [1, 12]].map(([a, b]) => [x + a * s, y + b * s]);
      poly(c, p, color("#a9aca4", "#596c78", "#b8a78f"));
      poly(c, [[x - 21 * s, y - 5 * s], [x - 10 * s, y - 17 * s], [x + 7 * s, y - 20 * s], [x + 2 * s, y - 3 * s]], color("#c6c8bc", "#82949b", "#d0bea2"));
      poly(c, [[x + 7 * s, y - 20 * s], [x + 21 * s, y - 7 * s], [x + 18 * s, y + 6 * s], [x + 2 * s, y - 3 * s]], color("#909a94", "#425b6b", "#a69581"));
      if (moss) poly(c, [[x - 16 * s, y - 7 * s], [x - 9 * s, y - 16 * s], [x + 6 * s, y - 17 * s], [x + 3 * s, y - 9 * s], [x - 3 * s, y - 4 * s]], color("#7f9565", "#4a6654", "#9f9c6d"));
    }
    function gardenCherry(c, x, y, scale = 1, { snapToPixels = false } = {}) {
      c.save();
      c.translate(x, y);
      const size = snapToPixels ? scale : 1;
      if (!snapToPixels) c.scale(scale, scale);
      const bark = color("#796351", "#43515a", "#8f6c52");
      for (const [points, width] of [
        [[[0, 0], [-2, -59], [-21, -99], [-20, -146]], 5],
        [[[-7, -70], [20, -109], [40, -130]], 3],
        [[[-19, -99], [-48, -121], [-58, -144]], 3]
      ]) {
        line(c, points.map(([px, py]) => [px * size, py * size]), bark, Math.round(width * size));
      }
      if (season !== 3) {
        const tones = season === 0 ? ["#e7afb9", "#f5cbd0", "#fff0df"] : season === 1 ? ["#5d875e", "#87a472", "#aabe8a"] : ["#ac5c42", "#ce7f4a", "#e8ac70"];
        for (const [px, py, rx, ry, k] of [[-49, -136, 26, 18, 0], [-24, -157, 32, 20, 1], [8, -153, 26, 18, 1], [31, -129, 31, 21, 0], [-8, -126, 37, 20, 1], [-47, -115, 20, 13, 1], [16, -111, 22, 13, 2]]) {
          ell(
            c,
            px * size,
            py * size,
            Math.round(rx * size),
            Math.round(ry * size),
            color(tones[k], mix(tones[k], "#344a5b", 0.56), mix(tones[k], "#f6d5a8", 0.18))
          );
        }
        if (season === 0) {
          const r = rng(34);
          for (let i = 0; i < 100; i++) {
            P(c, color("#fff0e4", "#b6a4ae", "#ffe8cd"), (-64 + r() * 114) * size, (-169 + r() * 64) * size, 2 * size, 1);
          }
        }
      }
      c.restore();
    }
    function oak(c, x, y, h, seed = 4, fruit = false) {
      const r = rng(seed), ink = color("#796a4c", "#3e534c", "#8c7450");
      line(c, [[x, y], [x - 3, y - h * 0.49], [x + 3, y - h * 0.78]], ink, 4);
      for (const [dx, dy] of [[-0.34, -0.68], [0.33, -0.73], [-0.12, -0.88], [0.17, -0.87]]) line(c, [[x - 2, y - h * 0.45], [x + dx * h, y + dy * h]], ink, 2);
      const base = fruit && season === 2 ? "#b39a54" : season === 1 ? "#7c8d58" : "#6c8c59";
      for (let i = 0; i < 19; i++) {
        const a = i * 2.4, xx = x + Math.cos(a) * h * (0.21 + r() * 0.1), yy = y - h * 0.73 + Math.sin(a) * h * 0.18, rr = h * (0.12 + r() * 0.065);
        ell(c, xx, yy, rr, rr * 0.73, color(mix(base, i % 3 ? "#b8c281" : "#345c47", i % 3 ? 0.28 : 0.2), i % 3 ? "#4a6854" : "#294a42", mix(base, "#c8b67b", 0.25)));
        if (i % 3 === 0) P(c, color("#bac38e", "#6d8261", "#d0bc89"), xx - rr * 0.3, yy - rr * 0.2, rr * 0.6, 1);
        if (fruit && season === 2) ell(c, xx + 4, yy + 2, 2, 2, color("#bd7e4c", "#8c7355", "#d89955"));
        if (fruit && season === 0) P(c, color("#e8d7c4", "#a5b3a0", "#f1d2ad"), xx + 3, yy - 3, 3, 2);
      }
    }
    function parkRing(c) {
      const cx = 240, cy = 190, rx = 326, ry = 72;
      for (let x = 0; x < W; x++) {
        const u = (x - cx) / rx, roof = cy - ry * Math.sqrt(Math.max(0, 1 - u * u));
        P(c, color("#d4dcd8", "#617e88", "#d7c5ae"), x, roof, 1, 58);
        for (let f = 0; f < 4; f++) {
          P(c, color("#87a8ad", "#365566", "#b2aaa0"), x, roof + 7 + f * 12, 1, 8);
          P(c, color("#e5e8d9", "#849da2", "#ead3b6"), x, roof + f * 12, 1, 3);
        }
        if (x % 9 === 0) P(c, color("#bac9c5", "#5f7c89", "#d4c6b1"), x, roof + 4, 1, 48);
      }
    }
    function drawApplePark(c) {
      clearRegionalSky(c, season === 3 ? "#b9d7df" : "#a4cfe0", "#edf0dd");
      ridge(c, 190, 36, color("#b4c4aa", "#486b65", "#c4b695"), 24);
      parkRing(c);
      const grass = ["#a8bd83", "#b7b885", "#b6ae7b", "#a0b88d"][season];
      gradient(c, color(grass, "#456553", "#c4b582"), color(mix(grass, "#d2c799", 0.15), "#587361", "#d6bf91"), 203, H - 203);
      if (surface) P(surface, "#ffffff", 0, 203, W, H - 203);
      const walkway = [];
      for (let y = 220; y <= H; y += 8) walkway.push([218 + Math.sin((y - 210) / 190) * 100 - (y - 210) * 0.14, y]);
      const other = walkway.map(([x, y]) => [x + 22 + (y - 220) * 0.035, y]).reverse();
      land(c, [...walkway, ...other], color("#dedac7", "#7d938a", "#e5ccaa"));
      line(c, walkway, color("#b2b49b", "#4d6d5d", "#c3ac86"), 1);
      for (const [x, y, h, seed] of [[3, 287, 104, 4], [64, 253, 85, 6], [421, 256, 83, 9], [477, 303, 130, 13], [-8, 455, 93, 22], [460, 528, 99, 32]]) oak(c, x, y, h, seed);
      for (const [x, y, i] of [[26, 508, 0], [91, 536, 1], [430, 368, 2], [458, 427, 3]]) oak(c, x, y, 43 + i % 2 * 6, 50 + i, true);
      const r = rng(117);
      for (let i = 0; i < 170; i++) {
        const x = r() * W, y = 250 + r() * 310;
        P(c, color(season === 3 ? "#88a477" : "#a5ad78", "#3d604c", "#baab79"), x, y, 1, 2);
        if (season === 0 && i % 6 === 0) P(c, color("#e8e4b3", "#9bb29a", "#f3d6a5"), x, y, 2, 1);
      }
      if (season === 3) for (const [x, y] of [[26, 478], [414, 550]]) ell(c, x, y, 19, 2, color("#b5cbc2", "#6b8a83", "#c9c1aa"));
      rainbowStage(c);
    }
    function baiHouse(c, x, y, w, h) {
      house(c, x, y, w, h, "white", Math.round(x));
      poly(c, [[x - 3, y - h], [x + w * 0.5, y - h - 12], [x + w + 3, y - h + 1], [x + w, y - h + 6], [x, y - h + 4]], color("#596e7c", "#324e61", "#797c80"));
      line(c, [[x - 3, y - h], [x + w * 0.5, y - h - 12], [x + w + 3, y - h + 1]], color("#91a4a5", "#6a8794", "#aba497"), 2);
      P(c, color("#6b8691", "#314f66", "#8b9193"), x + w * 0.5 - 3, y - 15, 6, 15);
      P(c, color("#ede6cf", "#a5b7b6", "#f1d3af"), x + 3, y - h + 8, w - 6, 3);
    }
    function gondola(c, x, y) {
      poly(c, [[x - 26, y - 3], [x - 18, y + 3], [x + 17, y + 5], [x + 28, y - 5], [x + 18, y + 8], [x - 16, y + 7]], color("#394950", "#183748", "#696267"));
      P(c, color("#9b6256", "#74535d", "#b97e62"), x - 7, y - 2, 14, 6);
      line(c, [[x + 27, y - 5], [x + 28, y - 12]], color("#c9bb99", "#8eaaae", "#dcc5a1"), 1);
    }
    function jaggedAlp(c, x, y, w, h, ink, snow = true) {
      const pts = [[0, 1], [0.14, 0.72], [0.24, 0.47], [0.31, 0.53], [0.46, 0.1], [0.51, 0.18], [0.56, 0], [0.64, 0.28], [0.69, 0.24], [0.82, 0.67], [1, 1]].map(([a, b]) => [x + a * w, y - h + b * h]);
      poly(c, pts, ink);
      poly(c, [[x + w * 0.56, y - h], [x + w * 0.53, y - h * 0.57], [x + w * 0.66, y - h * 0.38], [x + w * 0.75, y - h * 0.21], [x + w, y]], color("#678eaa", "#2d4d71", "#9d9fac"));
      if (snow) {
        poly(c, [[x + w * 0.24, y - h * 0.53], [x + w * 0.31, y - h * 0.47], [x + w * 0.46, y - h * 0.9], [x + w * 0.51, y - h * 0.82], [x + w * 0.56, y - h], [x + w * 0.64, y - h * 0.72], [x + w * 0.61, y - h * 0.55], [x + w * 0.56, y - h * 0.71], [x + w * 0.49, y - h * 0.63], [x + w * 0.46, y - h * 0.73], [x + w * 0.39, y - h * 0.41], [x + w * 0.33, y - h * 0.33]], color("#f4f5e8", "#abc4d1", "#f5e3ca"));
        line(c, [[x + w * 0.56, y - h], [x + w * 0.53, y - h * 0.57], [x + w * 0.66, y - h * 0.38]], color("#c9dfdf", "#7096b0", "#ddccbb"), 2);
      }
    }
    function drawAlpineSummit(c) {
      clearRegionalSky(c, ["#98c5e0", "#78afd6", "#9dbed8", "#b0cee0"][season], "#d9e6e8");
      jaggedAlp(c, -81, 304, 346, 211, color("#99b7c8", "#466985", "#b8b9be"));
      jaggedAlp(c, 239, 316, 320, 223, color("#9bb9c9", "#4a6b86", "#b4b6bd"));
      jaggedAlp(c, 32, 375, 425, 222, color("#719db7", "#325875", "#99a4b1"));
      gradient(c, color("#a9c8d9", "#3c627f", "#b9b8bf"), color("#c6dce0", "#5d7c93", "#d2c5c0"), 355, H - 355);
      for (const [x, y, rx] of [[-8, 469, 77], [42, 531, 99], [481, 471, 84], [466, 550, 96]]) ell(c, x, y, rx, 13, color("#e0e8e2", "#6f8ca0", "#e5d2c1"));
      const shelf = [[0, 319], [49, 277], [117, 270], [225, 223], [337, 270], [431, 297], [480, 325], [480, 443], [424, 466], [376, 493], [405, 560], [83, 560], [111, 515], [63, 480], [0, 456]];
      const rock = color(["#aab8bb", "#969b98", "#919ca5", "#b9c9cd"][season], "#4c667b", "#b5a99d");
      land(c, shelf, rock);
      poly(c, [[0, 456], [63, 480], [111, 515], [83, 560], [0, 560]], color("#667f91", "#263f5a", "#938c96"));
      poly(c, [[480, 443], [424, 466], [376, 493], [405, 560], [480, 560]], color("#718697", "#2d4760", "#9d949b"));
      clipped(c, shelf, () => {
        const r = rng(73);
        for (let i = 0; i < 135; i++) {
          const x = r() * W, y = 270 + r() * 290;
          line(c, [[x, y], [x + 7 + r() * 15, y - 3], [x + 15 + r() * 13, y + 1]], color("#7f8e92", "#3d5970", "#a4968c"));
        }
        const white = color("#f1f4e9", "#b9ced7", "#f2e0c8");
        const patches = season === 3 ? [
          [[-20, 306], [175, 246], [286, 270], [480, 301], [480, 560], [405, 560], [370, 491], [322, 501], [263, 560], [151, 560], [120, 510], [49, 480], [-20, 458]]
        ] : [
          [[0, 311], [77, 286], [143, 279], [122, 302], [52, 330], [0, 354]],
          [[390, 287], [480, 319], [480, 382], [435, 360], [418, 325], [380, 312]],
          [[0, 416], [49, 445], [80, 482], [39, 482], [0, 458]],
          [[305, 504], [351, 477], [392, 484], [388, 505], [420, 560], [357, 560]]
        ];
        patches.forEach((p) => poly(c, p, white));
        if (season === 0) poly(c, [[0, 399], [68, 430], [119, 487], [188, 502], [185, 560], [0, 560]], white);
        if (season === 2) {
          poly(c, [[135, 520], [189, 506], [258, 518], [286, 560], [164, 560]], color("#dce7e6", "#91adbd", "#e1d3c5"));
          const frost = rng(28);
          for (let i = 0; i < 46; i++) P(c, color("#d4e1df", "#7c9caf", "#d9cfc4"), 20 + frost() * 440, 477 + frost() * 83, 4, 1);
        }
      });
      land(c, [[440, 395], [480, 416], [480, 435], [436, 412]], color("#b3bab5", "#708a99", "#ccbaa5"));
      for (const [x, y] of [[54, 482], [92, 509], [131, 523], [371, 506], [401, 484], [440, 465]]) P(c, color("#9b8972", "#617c8b", "#bc9e7e"), x, y - 17, 3, 19);
      line(c, [[55, 472], [94, 499], [133, 513]], color("#6e7780", "#87a2ad", "#9e9291"), 1);
      line(c, [[372, 496], [402, 474], [441, 455]], color("#6e7780", "#87a2ad", "#9e9291"), 1);
      boulder(c, 182, 537, 0.74);
      boulder(c, 224, 554, 0.55);
      if (season === 1) for (const [x, y] of [[155, 539], [166, 545], [290, 551]]) P(c, color("#b49ebf", "#7e88a9", "#d4b1b7"), x, y, 2, 2);
      if (season === 2) for (const [x, y] of [[148, 532], [271, 548], [181, 551]]) P(c, color("#b6a27c", "#788478", "#c5ab82"), x, y, 3, 1);
    }
    function terraceBougainvillea(c, x, y, scale, facing, seed) {
      const foliage = [
        color("#4e674a", "#324b45", "#66684d"),
        color("#6e8757", "#466353", "#818557"),
        color("#8b9f67", "#60745e", "#a79b68")
      ];
      const pink = ["#cf3a82", "#d22f85", "#c04482", "#a9678b"][season];
      const bloom = color(pink, mix(pink, "#2a3a56", 0.36), mix(pink, "#f3b28f", 0.2));
      const petals = [
        mix(bloom, foliage[0], 0.23),
        bloom,
        mix(bloom, color("#ffa8c9", "#b986ac", "#ffc398"), 0.42)
      ];
      const r = rng(seed);
      const sprays = [[-16, -5, 10], [-11, -14, 12], [0, -22, 11], [10, -15, 14], [21, -8, 9]].map(([dx, dy, size]) => [dx, dy + Math.round((r() - 0.5) * 8), size]);
      c.save();
      c.translate(x, y);
      c.scale(scale * facing, scale);
      ell(c, 3, 0, 24, 4, color("#d4c3a4", "#879aa1", "#d5ac87"));
      for (const [dx, dy, size] of sprays) leaves(c, dx, dy, size, foliage, seed + dx);
      for (const [dx, dy, size] of sprays) {
        for (let i = 0; i < (season === 3 ? 8 : 17); i++) {
          const a = r() * 2 * Math.PI, radius = Math.sqrt(r()) * size * 0.8;
          const bx = Math.round(dx + Math.cos(a) * radius);
          const by = Math.round(dy + Math.sin(a) * radius * 0.72);
          P(c, petals[i % 3], bx, by, 3, 3);
          if (i % 4 === 0) P(c, petals[2], bx + 1, by - 1, 2, 1);
        }
      }
      c.restore();
    }
    function drawBrightSantorini(c) {
      clearRegionalSky(c, season === 3 ? "#74bef0" : "#53b7f3", "#c4ebfc", ["#172e4a", "#132947", "#1b2d48", "#1a304c"][season]);
      gradient(c, color(season === 3 ? "#3c9ed4" : "#268fd4", "#17476b", "#9f98b5"), color("#0876bd", "#103451", "#8689a6"), 155, 128);
      poly(c, [[0, 174], [39, 150], [87, 157], [139, 187], [186, 205], [123, 213], [50, 190], [0, 195]], color("#568db7", "#345976", "#a6a1ae"));
      for (const [x, y] of [[10, 209], [70, 201], [431, 193]]) P(c, color("#a7e2f1", "#577e9e", "#edc9b8"), x, y, 21, 1);
      const edge = [[0, 267], [68, 228], [151, 219], [233, 228], [326, 219], [415, 232], [480, 253]];
      land(c, [...edge, [480, H], [0, H]], color("#f4e7ca", "#a8b6bd", "#f0d2ad"));
      line(c, edge, color("#fff8e4", "#c1d5df", "#ffedcf"), 5);
      line(c, edge.map(([x, y]) => [x, y + 9]), color("#d0bda2", "#718ca2", "#d4b293"), 3);
      for (let i = 0; i < 4; i++) {
        const x = -11 + i * 25, y = 225 + i * 3;
        P(c, color("#fff9e9", "#b9ced8", "#ffe7c6"), x, y - 38, 29, 38);
        P(c, color("#1984d1", "#326f9e", "#758cae"), x + 10, y - 25, 6, 10);
        P(c, color("#e2d5bb", "#809eb0", "#e2be9b"), x + 26, y - 38, 3, 38);
      }
      P(c, color("#fff6df", "#b5ced9", "#ffe5c0"), 15, 153, 29, 38);
      ell(c, 29, 153, 15, 12, color("#087dca", "#225f91", "#6d8eaf"));
      terraceBougainvillea(c, 22, 269, 0.68, -1, 9);
      terraceBougainvillea(c, 98, 241, 0.94, 1, 18);
      terraceBougainvillea(c, 219, 242, 0.66, -1, 27);
      terraceBougainvillea(c, 365, 251, 0.98, -1, 37);
      terraceBougainvillea(c, 445, 276, 1.13, -1, 64);
      land(c, [[65, 367], [88, 364], [111, 409], [155, 455], [205, 494], [279, 560], [222, 560], [167, 508], [123, 472], [86, 420]], color("#f7ecd4", "#adbfca", "#f5d6b2"));
      for (const [x, y, rx, ry, k] of [[87, 388, 18, 7, 4], [103, 413, 21, 8, 7], [127, 441, 25, 9, 10], [159, 468, 27, 10, 3], [193, 495, 31, 12, 8], [225, 525, 33, 12, 5], [254, 553, 36, 13, 11]]) liveSlate(c, x, y, rx, ry, k, true);
      tree(c, 481, 474, 87, "olive", 24);
      greekPlanter(c, 398, 531, 1.05);
      greekPlanter(c, 35, 472, 0.82);
      boat(c, 438, 209, 5, true);
    }
    function liveSlate(c, x, y, rx, ry, seed = 1, warm = false) {
      const r = rng(seed);
      const points = Array.from({ length: 7 }, (_, i) => {
        const a = -Math.PI + 0.18 + i * Math.PI * 2 / 7, k = 0.81 + r() * 0.19;
        return [Math.round(x + Math.cos(a) * rx * k), Math.round(y + Math.sin(a) * ry * k)];
      });
      const base = warm ? ["#e0d4b7", "#eddfc2", "#ddcfb3"][seed % 3] : ["#aeb9b5", "#bbc2b7", "#a6b4b3"][seed % 3];
      const ink = color(base, mix(base, "#344e66", 0.59), mix(base, "#e7c099", 0.22));
      poly(c, points.map(([a, b]) => [a, b + 2]), color(warm ? "#cfbf9f" : "#95a6a2", "#496778", "#b5a28c"));
      land(c, points, ink);
      line(c, points.slice(0, 4), color(mix(base, "#f5eed8", 0.45), "#8da7b2", "#ead2ad"));
      line(c, points.slice(4).concat([points[0]]), color(mix(base, "#6c8580", 0.18), "#486879", "#b5a18b"));
      if (seed % 3 === 0) line(c, [[x - rx * 0.31, y - ry * 0.14], [x - rx * 0.05, y - ry * 0.02], [x + rx * 0.12, y + ry * 0.3]], color(mix(base, "#9ca99f", 0.34), "#64818c", "#c6b499"));
    }
    function zenFuji(c) {
      poly(c, [
        [220, 157],
        [266, 134],
        [297, 114],
        [322, 93],
        [340, 77],
        [352, 65],
        [376, 65],
        [390, 81],
        [412, 98],
        [444, 116],
        [480, 131],
        [480, 202],
        [220, 202]
      ], color("#94afbf", "#3c5876", "#a0a8b8"));
      poly(c, [
        [367, 66],
        [376, 65],
        [390, 81],
        [412, 98],
        [444, 116],
        [480, 131],
        [480, 171],
        [434, 143],
        [399, 131],
        [383, 108]
      ], color("#8ca8b9", "#37516d", "#98a0b3"));
      poly(c, [
        [352, 65],
        [376, 65],
        [390, 81],
        [408, 95],
        [391, 88],
        [395, 95],
        [377, 82],
        [374, 95],
        [365, 78],
        [352, 91],
        [354, 82],
        [333, 94],
        [339, 84],
        [321, 94],
        [340, 77]
      ], color("#f3f2e9", "#a1b7c7", "#f5e2d0"));
      poly(c, [
        [368, 66],
        [376, 66],
        [390, 81],
        [397, 87],
        [383, 81],
        [377, 74]
      ], color("#dce7e8", "#7e9bb2", "#dfcbd0"));
    }
    function zenSpring(c) {
      const rimStones = [
        [132, 512, 0.34],
        [145, 507, 0.44],
        [160, 506, 0.28],
        [176, 507, 0.37],
        [191, 511, 0.44],
        [199, 517, 0.28],
        [128, 521, 0.35],
        [139, 529, 0.38],
        [154, 531, 0.29],
        [172, 531, 0.34],
        [188, 528, 0.37],
        [197, 522, 0.3]
      ];
      poly(c, [
        [114, 519],
        [128, 510],
        [143, 503],
        [165, 502],
        [178, 505],
        [193, 504],
        [204, 513],
        [211, 522],
        [203, 530],
        [190, 533],
        [180, 536],
        [159, 536],
        [144, 533],
        [123, 532]
      ], color("#a3ac86", "#577565", "#afa17c"));
      for (const [x, y, size] of rimStones) boulder(c, x, y, size, x === 191 || x === 139);
      water(c, [
        [134, 515],
        [143, 511],
        [156, 509],
        [174, 509],
        [187, 512],
        [193, 517],
        [188, 521],
        [180, 523],
        [172, 527],
        [155, 527],
        [144, 525],
        [138, 522],
        [132, 519]
      ], color("#7faea8", "#457982", "#8cb8ae"));
      poly(c, [
        [135, 518],
        [148, 517],
        [155, 520],
        [174, 520],
        [185, 517],
        [191, 518],
        [180, 523],
        [172, 527],
        [155, 527],
        [144, 525]
      ], color("#97c1b4", "#528992", "#a0c4b3"));
      poly(c, [
        [135, 515],
        [145, 511],
        [156, 509],
        [168, 509],
        [157, 514],
        [147, 514],
        [141, 518],
        [134, 519]
      ], color("#75a69f", "#426d76", "#87ada2"));
      const reflection = color("#b6d5c6", "#729da3", "#c0d7bf");
      for (const [x, y, width] of [[144, 515, 12], [167, 513, 11], [158, 521, 13], [175, 519, 9]]) {
        P(c, reflection, x, y, width, 1);
      }
      c.save();
      c.globalAlpha *= 0.65;
      line(c, [
        [172, 507],
        [173, 503],
        [177, 498],
        [176, 495],
        [171, 491],
        [170, 487],
        [174, 482]
      ], color("#f6f4e5", "#a0bbc1", "#fff0db"), 2);
      c.restore();
    }
    function rakeZenGravel(c, { x, y, radiusX, radiusY, start, end, bend = 0 }) {
      const ink = color("#d5d0ba", "#7a8e87", "#d8c3a5");
      c.save();
      for (const offset2 of [0, 4, 8]) {
        for (let angle = start; angle < end; angle += 9e-3) {
          const px = x + Math.cos(angle) * (radiusX + offset2);
          const py = y + Math.sin(angle) * (radiusY + offset2) + bend * Math.sin(3 * angle);
          c.globalAlpha = Math.min(1, (angle - start) * 4, (end - angle) * 4);
          P(c, ink, px, py, 1, 1);
        }
      }
      c.restore();
    }
    function zenRockGarden(c) {
      const gravel = [
        [352, 534],
        [359, 521],
        [377, 514],
        [396, 510],
        [420, 509],
        [439, 512],
        [456, 520],
        [467, 530],
        [470, 540],
        [463, 550],
        [445, 556],
        [423, 559],
        [399, 557],
        [375, 553],
        [359, 546]
      ];
      poly(c, gravel, color("#ebe7d5", "#899b91", "#eedec2"));
      clipped(c, gravel, () => rakeZenGravel(c, {
        x: 413,
        y: 533,
        radiusX: 36,
        radiusY: 13,
        start: -0.65,
        end: 3.78
      }));
      ell(c, 414, 540, 26, 4, color("#d6d2bc", "#748980", "#dbc9ac"));
      poly(c, [
        [388, 539],
        [393, 536],
        [400, 536],
        [405, 539],
        [416, 538],
        [424, 537],
        [433, 537],
        [439, 540],
        [433, 543],
        [421, 543],
        [414, 545],
        [403, 544],
        [392, 543]
      ], color("#a5ae8b", "#58746a", "#b1a47e"));
      poly(c, [
        [389, 537],
        [393, 533],
        [400, 528],
        [406, 523],
        [414, 520],
        [423, 521],
        [429, 524],
        [433, 529],
        [436, 535],
        [432, 539],
        [423, 541],
        [412, 542],
        [400, 541],
        [392, 539]
      ], color("#969a90", "#5f757b", "#a39886"));
      poly(c, [
        [391, 536],
        [400, 528],
        [406, 523],
        [414, 520],
        [423, 521],
        [429, 524],
        [432, 530],
        [427, 533],
        [418, 535],
        [410, 535],
        [402, 537],
        [396, 537]
      ], color("#adafa2", "#7b8c8f", "#b8aa94"));
      poly(c, [
        [400, 529],
        [406, 523],
        [414, 520],
        [422, 521],
        [427, 524],
        [424, 527],
        [415, 528],
        [407, 531]
      ], color("#c3c3b3", "#94a4a3", "#cabc9f"));
      poly(c, [
        [391, 537],
        [397, 536],
        [404, 538],
        [410, 539],
        [416, 541],
        [407, 542],
        [399, 542],
        [392, 540]
      ], color("#929e7d", "#5c7869", "#a09774"));
      if (season === 3) {
        poly(
          c,
          [
            [403, 526],
            [408, 522],
            [414, 520],
            [422, 521],
            [427, 524],
            [422, 525],
            [416, 525],
            [411, 527],
            [406, 527]
          ],
          color("#f6f4e7", "#b4c9c9", "#f7e6cd")
        );
      }
    }
    function zenRearGarden(c) {
      const grass = ["#aebc9a", "#9eb591", "#b9b395", "#d2d8cc"][season];
      const moss = ["#8da581", "#809e7d", "#a49e7d", "#b9c6ba"][season];
      land(c, [
        [0, 196],
        [24, 189],
        [46, 193],
        [69, 190],
        [94, 201],
        [126, 204],
        [160, 224],
        [138, 240],
        [92, 252],
        [51, 260],
        [0, 247]
      ], color(grass, "#526e68", "#bab692"));
      poly(c, [
        [0, 219],
        [28, 216],
        [44, 221],
        [66, 213],
        [93, 218],
        [108, 235],
        [83, 246],
        [51, 249],
        [24, 242],
        [0, 243]
      ], color(moss, "#45635d", "#aaa37e"));
      land(c, [
        [304, 222],
        [343, 210],
        [372, 215],
        [399, 204],
        [421, 207],
        [451, 196],
        [480, 200],
        [480, 343],
        [452, 333],
        [419, 325],
        [386, 310],
        [352, 283],
        [330, 255]
      ], color(grass, "#526e68", "#bab692"));
      poly(c, [
        [376, 248],
        [401, 239],
        [427, 240],
        [449, 226],
        [480, 223],
        [480, 314],
        [459, 309],
        [431, 314],
        [408, 301],
        [379, 284]
      ], color(moss, "#45635d", "#aaa37e"));
      poly(c, [
        [412, 227],
        [418, 228],
        [421, 245],
        [418, 262],
        [412, 282],
        [417, 300],
        [435, 322],
        [418, 323],
        [405, 304],
        [401, 283],
        [411, 259],
        [416, 244]
      ], color("#d5d0b4", "#6f8580", "#d5c39e"));
      for (const [x, y, rx, ry, seed] of [
        [418, 244, 4, 2, 4],
        [415, 257, 5, 2, 8],
        [410, 273, 5, 2, 6],
        [407, 289, 6, 3, 10],
        [414, 307, 7, 3, 5]
      ]) {
        liveSlate(c, x, y, rx, ry, seed);
      }
      for (const [x, y, width] of [
        [43, 218, 6],
        [59, 225, 8],
        [389, 266, 10],
        [428, 263, 8],
        [443, 278, 12],
        [459, 295, 11]
      ]) {
        ell(c, x, y, width, 4, color("#769475", "#3c5c55", "#92996e"));
        ell(c, x - 2, y - 2, width - 3, 3, color(grass, "#5f7c6d", "#b0a77e"));
        if (season === 0) {
          for (const dx of [-3, 1, 4]) P(c, color("#e2b4b6", "#a08c9c", "#e4b9a5"), x + dx, y - 2 - dx % 2, 2, 1);
        }
      }
    }
    function restrainedZenGarden(c) {
      clearRegionalSky(c, "#dce6e5", "#f5e6da");
      zenFuji(c);
      poly(c, [
        [307, 163],
        [341, 156],
        [370, 146],
        [396, 148],
        [419, 140],
        [449, 145],
        [480, 141],
        [480, 208],
        [307, 208]
      ], color("#a6bdbb", "#42636e", "#afb2ae"));
      ridge(c, 196, 53, color("#c4d3c5", "#47686b", "#ccc8b4"), 15);
      ridge(c, 237, 35, color("#afc2ad", "#3d605e", "#b8b69e"), 31);
      const sand = season === 3 ? "#e8e9df" : "#e3dfc9";
      gradient(c, color(sand, "#788c88", "#e8d4b1"), color(mix(sand, "#f7f0de", 0.1), "#84958e", "#ecd9ba"), 216, H - 216);
      if (surface) P(surface, "#ffffff", 0, 216, W, H - 216);
      zenRearGarden(c);
      const gravel = [
        [0, 518],
        [24, 510],
        [52, 507],
        [83, 508],
        [106, 503],
        [140, 500],
        [166, 503],
        [190, 503],
        [213, 514],
        [224, 528],
        [217, 539],
        [193, 549],
        [158, 551],
        [125, 555],
        [83, 557],
        [45, 552],
        [14, 553],
        [0, 548]
      ];
      poly(c, gravel, color("#ebe7d5", "#899b91", "#eedec2"));
      const pebble = rng(36);
      clipped(c, gravel, () => {
        for (let i = 0; i < 135; i++) {
          P(c, color("#f5f0e2", "#a1ada1", "#f6e7ce"), pebble() * 226, 500 + pebble() * 56, 1 + pebble(), 1);
        }
        rakeZenGravel(c, {
          x: 99,
          y: 521,
          radiusX: 106,
          radiusY: 24,
          start: 0.22,
          end: 3.02,
          bend: 2
        });
      });
      poly(c, [
        [14, 530],
        [28, 522],
        [50, 521],
        [64, 515],
        [82, 518],
        [105, 517],
        [121, 510],
        [144, 510],
        [154, 518],
        [143, 528],
        [121, 532],
        [100, 537],
        [76, 540],
        [52, 539],
        [34, 542],
        [17, 537]
      ], color("#9da982", "#57765f", "#b0a27a"));
      ell(c, 59, 528, 35, 10, color("#aeb68c", "#68856a", "#bdb08a"));
      zenSpring(c);
      gardenCherry(c, 80, 534, 0.72, { snapToPixels: true });
      boulder(c, 27, 532, 0.65, true);
      boulder(c, 94, 534, 0.46, true);
      boulder(c, 110, 530, 0.3, true);
      poly(c, [
        [349, 560],
        [368, 548],
        [386, 545],
        [407, 534],
        [433, 532],
        [451, 520],
        [480, 513],
        [480, 560]
      ], color("#c2c5a1", "#748c76", "#c8b694"));
      poly(c, [
        [381, 560],
        [398, 549],
        [425, 547],
        [451, 543],
        [480, 531],
        [480, 560]
      ], color("#b9c09a", "#6c846f", "#c0af8a"));
      zenRockGarden(c);
      gardenCherry(c, 502, 322, 1.12);
      for (const [x, y, rx, ry, k] of [[330, 564, 27, 10, 4], [322, 546, 22, 9, 8], [315, 530, 21, 8, 6], [315, 514, 18, 7, 10]]) liveSlate(c, x, y, rx, ry, k);
      if (season === 0) {
        for (const [x, y] of [[35, 520], [56, 530], [69, 519], [100, 523], [113, 511]]) {
          P(c, color("#e6c8c1", "#9c8d91", "#f0d0b6"), x, y, 2, 1);
        }
      }
      if (season === 3) {
        ell(c, 25, 523, 9, 2, color("#f6f4e7", "#b4c9c9", "#f7e6cd"));
        ell(c, 93, 528, 7, 2, color("#f6f4e7", "#b4c9c9", "#f7e6cd"));
      }
    }
    function rainbowStage(c) {
      const x = 395, y = 543, rx = 56, ry = 71;
      ell(c, x, y + 2, 68, 13, color("#8d9b77", "#36534a", "#aa9d77"));
      ell(c, x, y, 65, 11, color("#d9ded3", "#809a9c", "#e3ccad"));
      ell(c, x - 2, y - 3, 62, 9, color("#eef0df", "#a2b8b6", "#f2ddbc"));
      const colors = ["#69a65a", "#e5c84e", "#df9746", "#cf6459", "#a36f9f", "#5a8cbd"];
      colors.forEach((col, i) => {
        const rr = rx - i * 5, hh = ry - i * 5, pts = [];
        for (let a = Math.PI; a >= 0; a -= Math.PI / 80) pts.push([x + Math.cos(a) * rr, y - Math.sin(a) * hh]);
        for (let a = 0; a <= Math.PI; a += Math.PI / 80) pts.push([x + Math.cos(a) * (rr - 5), y - Math.sin(a) * (hh - 5)]);
        poly(c, pts, color(col, mix(col, "#294359", 0.38), mix(col, "#f2bf8e", 0.15)));
        line(c, [[x - rr, y - 1], [x - rr + 4, y - 1]], color(mix(col, "#f5e7cf", 0.3), mix(col, "#81919d", 0.2), mix(col, "#f8d2a7", 0.3)), 1);
      });
      P(c, color("#5d6c65", "#314b55", "#8b8170"), x - 22, y - 3, 44, 3);
    }
    function daliNaturalLane(c) {
      clearRegionalSky(c, "#afd8e5", "#e9ede0");
      gradient(c, color("#8bbfc8", "#3d677c", "#c6baa9"), color("#79b1ba", "#34576c", "#b5ada0"), 163, 125);
      mountain(c, -60, 205, 336, season === 3 ? 150 : 134, true);
      mountain(c, 190, 202, 350, 121, true);
      for (const [x, y, w, h] of [[-3, 232, 37, 43], [33, 244, 43, 52], [407, 236, 38, 42], [444, 250, 42, 58]]) baiHouse(c, x, y, w, h);
      const bed = season === 3 ? "#b8c1b1" : season === 2 ? "#c6bea2" : "#bec5ac";
      gradient(c, color(bed, "#5c7775", "#cbbb9f"), color(mix(bed, "#e5dec4", 0.15), "#73877e", "#dbc7a7"), 245, H - 245);
      if (surface) P(surface, "#ffffff", 0, 245, W, H - 245);
      land(c, [[192, 253], [228, 253], [247, 407], [267, 481], [295, 560], [203, 560], [209, 486], [204, 395]], color("#d5d4be", "#7b918c", "#decaab"));
      for (const [x, y, rx, ry, k] of [[235, 493, 32, 12, 11], [242, 514, 36, 14, 5], [236, 538, 33, 14, 7], [253, 562, 43, 16, 2], [182, 493, 25, 10, 6], [147, 508, 28, 11, 13]]) liveSlate(c, x, y, rx, ry, k);
      for (const [x, y, rx, ry] of [[5, 522, 57, 19], [445, 531, 51, 18]]) ell(c, x, y, rx, ry, color("#98aa80", "#4b6e58", "#b0a57d"));
      tree(c, 465, 351, 112, "olive", 24);
      if (season === 0) gardenCherry(c, 8, 330, 0.82);
      else if (season === 2) tree(c, 0, 335, 127, "maple", 16);
      else tree(c, 0, 335, 127, "olive", 16);
      flowerShrub(c, 20, 532, 20, color(season === 0 ? "#d4a5aa" : season === 3 ? "#bd8589" : "#a0b18b", "#6b8379", "#d4b48e"));
      boulder(c, 456, 546, 0.65, true);
      for (const [x, y] of [[193, 528], [200, 551], [283, 545], [276, 517], [171, 502]]) P(c, color("#8f9f80", "#4e6e5e", "#aaa37d"), x, y, 2, 3);
    }
    const VENICE_BRIDGE = { u: 210, width: 36, v0: 219, v1: 313, rise: 14 };
    function veniceBridge(c, S, stone, canal) {
      const B = VENICE_BRIDGE;
      const q = (pts, ink, walkable = false) => {
        const p = pts.map(([u, v2, z2]) => S(u, v2, z2));
        if (walkable) land(c, p, ink);
        else poly(c, p, ink);
      };
      const v = (t) => B.v0 + (B.v1 - B.v0) * t;
      const z = (t) => -15 + Math.sin(t * Math.PI) * B.rise;
      for (const u of [B.u, B.u + B.width]) {
        const top = Array.from({ length: 25 }, (_, i) => [u, v(i / 24), z(i / 24)]);
        q([...top, [u, B.v1, -28], [u, B.v0, -28]], color(u === B.u ? "#b9b29e" : "#a69f90", "#5c7887", "#c3a98b"));
        const arch = Array.from({ length: 21 }, (_, i) => {
          const t = 0.14 + i * 0.72 / 20;
          return [u, v(t), -25 + Math.sin(i / 20 * Math.PI) * 12];
        });
        q([...arch, [u, v(0.86), -26], [u, v(0.14), -26]], canal);
      }
      for (let i = 0; i < 24; i++) {
        const a = i / 24, b = (i + 1) / 24;
        q([[B.u, v(a), z(a)], [B.u + B.width, v(a), z(a)], [B.u + B.width, v(b), z(b)], [B.u, v(b), z(b)]], stone, true);
        if (i % 3 === 0) line(c, [S(B.u, v(a), z(a) + 0.1), S(B.u + B.width, v(a), z(a) + 0.1)], color("#b1ad98", "#647f8c", "#c2a989"));
      }
      for (const u of [B.u, B.u + B.width]) {
        const upper = [], lower = [];
        for (let i = 0; i <= 24; i++) {
          const t = i / 24;
          upper.push([u, v(t), z(t) + 9]);
          lower.unshift([u, v(t), z(t) + 5]);
        }
        q([...upper, ...lower], color("#e1d7be", "#9fb4b6", "#efd0a8"));
        for (let i = 0; i <= 6; i++) {
          const t = i / 6;
          line(c, [S(u, v(t), z(t) + 1), S(u, v(t), z(t) + 9)], color("#c0bba5", "#7f9aa3", "#d6bb9b"), 2);
        }
      }
    }
    function veniceWorldExterior(c) {
      clearRegionalSky(c, season === 3 ? "#c3d9dc" : "#b5d9df", "#efe8d3");
      const room = window.OFFICE_ROOMS.find((entry) => entry.key === "venice").room, S = room.project;
      const F = framing("venice"), targets = [c, surface, waterSurface].filter(Boolean);
      targets.forEach((ctx) => {
        ctx.save();
        ctx.translate(F.x, F.y);
        ctx.scale(F.scale, F.scale);
      });
      try {
        const q = (pts, ink, type) => {
          const p = pts.map(([u, v, z = -16]) => S(u, v, z));
          if (type === "water") water(c, p, ink);
          else if (type === "land") land(c, p, ink);
          else poly(c, p, ink);
        };
        const canalBase = ["#63b3a7", "#50aaa0", "#79aea0", "#7eaaa9"][season];
        const canal = color(canalBase, mix(canalBase, "#132c4c", 0.69), mix(canalBase, "#d4bc95", 0.56));
        const ripple = color("#b8e1d1", "#688f9d", "#dfc7a7");
        const stoneBase = ["#d5cdb4", "#d8d0b5", "#d0bda0", "#c1c9bf"][season];
        const stone = color(stoneBase, mix(stoneBase, "#38596d", 0.6), mix(stoneBase, "#e6b78b", 0.32));
        for (let y = 194; y < H + 160; y += 3) P(c, mix(stone, color("#ded5bb", "#7f9491", "#e7caab"), (y - 194) / (H - 194)), -150, y, W + 300, 3);
        if (surface) P(surface, "#ffffff", -150, 194, W + 300, H + 160);
        if (waterSurface) P(waterSurface, "#000000", -150, 194, W + 300, H + 160);
        const channels = [
          [[-550, -112, -20], [650, -112, -20], [650, -29, -20], [-550, -29, -20]],
          [[-112, -29, -20], [-29, -29, -20], [-29, 310, -20], [-112, 310, -20]],
          [[-112, 225, -20], [650, 225, -20], [650, 310, -20], [-112, 310, -20]],
          [[255, -29, -20], [370, -29, -20], [370, 225, -20], [255, 225, -20]]
        ];
        channels.forEach((p) => q(p, canal, "water"));
        q([[-550, -300], [650, -300], [650, -114], [-550, -114]], color("#cebea2", "#68828a", "#d8b995"), "land");
        q([[-112, 312], [650, 312], [650, 500], [-112, 500]], stone, "land");
        const quay = [[-22, -22], [248, -22], [248, 219], [-22, 219]];
        for (const edge of [[1, 2], [2, 3]]) {
          const a = quay[edge[0]], b = quay[edge[1]];
          q([[...a, -15], [...b, -15], [...b, -27], [...a, -27]], color(edge[0] === 1 ? "#a6aa99" : "#bab5a0", "#5b7880", "#c0a78a"));
        }
        q(quay.map(([u, v]) => [u, v, -15]), stone, "land");
        for (const [a, b] of [[quay[1], quay[2]], [quay[2], quay[3]]]) line(c, [S(...a, -15), S(...b, -15)], color("#e8dfc5", "#a1b7b7", "#f0d3ae"), 3);
        const inChannel = (u, v) => v >= -108 && v <= -34 || u >= -107 && u <= -34 && v >= -29 && v <= 310 || v >= 230 && v <= 305 || u >= 260 && u <= 365 && v >= -29 && v <= 225;
        for (let u = -500; u < 600; u += 29) for (let v = -100; v < 310; v += 23) if (inChannel(u, v) && inChannel(u + 9, v)) line(c, [S(u, v, -20), S(u + 9, v, -20)], ripple);
        const rim = color("#e7dbc0", "#9bb1b0", "#efcfa7");
        for (const v of [-114, 312]) line(c, [S(-550, v, -14), S(650, v, -14)], rim, 3);
        for (let i = -4; i < 8; i++) {
          const u = -163 + i * 71, v = -133, du = 64, h = 95 + (i + 9) % 3 * 16, k = (i + 9) % 3;
          const face = color(["#d9b093", "#d8c0a2", "#d3a58d"][k], ["#6d7d83", "#7b8586", "#6b7980"][k], "#dfb58f");
          q([[u, v, -16], [u + du, v, -16], [u + du, v, h], [u, v, h]], face);
          q([[u, v, h], [u + du, v, h], [u + du, v - 14, h + 7], [u, v - 14, h + 7]], color("#ab9277", "#526b7b", "#bc9473"));
          line(c, [S(u, v, h), S(u + du, v, h)], rim, 2);
          for (let level = 0; level < 3; level++) for (let col = 0; col < 3; col++) {
            const uu = u + 8 + col * 18, zz = 4 + level * 28;
            q([[uu - 2, v, zz - 2], [uu + 10, v, zz - 2], [uu + 10, v, zz + 20], [uu - 2, v, zz + 20]], color("#ecdfc5", "#a2b2b1", "#efd1a8"));
            q([[uu, v, zz], [uu + 8, v, zz], [uu + 8, v, zz + 17], [uu, v, zz + 17]], color("#5d8172", level === 1 ? "#d1b181" : "#365870", "#8c9275"));
          }
        }
        for (const [u, v] of [[105, -77], [287, 112], [266, 271]]) {
          const [x, y] = S(u, v, -20);
          gondola(c, x, y);
        }
        veniceBridge(c, S, color("#dcd4bd", "#8da6ab", "#ead0ae"), canal);
        for (const [u, v, k] of [[228, 199, 3], [228, 338, 8], [244, 361, 4]]) {
          const [x, y] = S(u, v, -15);
          liveSlate(c, x, y, 22, 8, k, true);
        }
        const [px, py] = S(190, 329, -15);
        const bloom = ["#c39faf", "#93a57d", "#b89a6e", "#899d8c"][season];
        flowerShrub(c, px, py, 18, color(bloom, mix(bloom, "#344f63", 0.57), mix(bloom, "#e6bc91", 0.27)));
        if (season === 3) ell(c, 102, 185, 93, 5, color("#d7e0d6", "#718f9b", "#ded0bf"));
      } finally {
        targets.forEach((ctx) => ctx.restore());
      }
    }
    function daliWaterGarden(c) {
      daliNaturalLane(c);
      const pond = [[10, 503], [32, 489], [80, 484], [129, 491], [165, 505], [172, 522], [151, 538], [103, 546], [51, 541], [21, 532], [8, 519]];
      const outer = pond.map(([x, y]) => [96 + (x - 96) * 1.07, 516 + (y - 516) * 1.14]);
      land(c, outer, color("#82998b", "#3e625e", "#9e9f83"));
      water(c, pond, color(season === 3 ? "#94b6b7" : season === 2 ? "#92b5a8" : "#79aaa5", "#315d68", "#b3b89d"));
      clipped(c, pond, () => {
        for (const [x, y, w] of [[43, 507, 19], [99, 498, 23], [133, 521, 16], [67, 535, 26], [25, 523, 14], [101, 531, 17]]) P(c, color("#c5dacf", "#729d9e", "#ded1ac"), x, y, w, 1);
        ell(c, 81, 518, 32, 3, color("#8dbbb0", "#4d7c82", "#b8bea0"));
      });
      for (const [x, y, s] of [[17, 501, 0.85], [50, 491, 0.48], [130, 496, 0.6], [166, 523, 0.62], [137, 539, 0.45]]) boulder(c, x, y, s, true);
      for (const [x, y, rx] of [[62, 521, 8], [98, 511, 6], [118, 529, 7]]) ell(c, x, y, rx, 3, color("#87a779", "#52795d", "#a4ac7d"));
      const bloom = ["#d8a6b1", "#e4d3b5", "#c8b991", "#bd858d"][season];
      flowerShrub(c, 28, 536, 15, color(bloom, mix(bloom, "#344f63", 0.55), mix(bloom, "#e6bc91", 0.2)));
      flowerShrub(c, 158, 489, 17, color(bloom, mix(bloom, "#344f63", 0.55), mix(bloom, "#e6bc91", 0.2)));
      flowerShrub(c, 426, 526, 22, color(bloom, mix(bloom, "#344f63", 0.55), mix(bloom, "#e6bc91", 0.2)));
      for (const [x, y] of [[37, 494], [142, 508], [151, 535]]) {
        const green = color("#708c67", "#385d51", "#95956b");
        line(c, [[x - 3, y], [x - 7, y - 12], [x - 2, y - 6], [x, y - 20], [x + 2, y - 5], [x + 6, y - 14]], green);
        line(c, [[x, y], [x + 2, y - 19]], green);
        ell(c, x + 2, y - 19, 3, 2, color(bloom, mix(bloom, "#344f63", 0.55), mix(bloom, "#e6bc91", 0.2)));
        P(c, color("#eedcba", "#afae91", "#f2d3aa"), x + 1, y - 20, 2, 1);
      }
    }
    function greekPlanter(c, x, y, s = 1) {
      c.save();
      c.translate(x, y);
      c.scale(s, s);
      ell(c, 2, 2, 18, 5, color("#c5b799", "#647f90", "#d1b18e"));
      const bloom = ["#dc8bb3", "#d15c9c", "#c393a9", "#9cac85"][season];
      flowerShrub(c, 0, -25, 17, color(bloom, mix(bloom, "#29435e", 0.58), mix(bloom, "#edbd99", 0.2)));
      poly(c, [[-14, -13], [14, -13], [11, 0], [-10, 0]], color("#f1e7d1", "#a5bcc9", "#f3d4ad"));
      poly(c, [[6, -13], [14, -13], [11, 0], [5, 1]], color("#d6c6aa", "#7595ab", "#dbb991"));
      ell(c, 0, -13, 14, 4, color("#fff4df", "#bfd1d7", "#ffe4be"));
      ell(c, 0, -14, 10, 2, color("#b6a78a", "#6b8e9c", "#c8ad88"));
      line(c, [[0, -14], [0, -23]], color("#6a8a66", "#3d6759", "#8f9670"), 2);
      c.restore();
    }
    function drawRegional(c, region) {
      const winter = season === 3;
      if (region === "zen") {
        restrainedZenGarden(c);
      } else if (region === "court") {
        drawApplePark(c);
      } else if (region === "ubud") {
        seasonalSky(c);
        mountain(c, 15, 199, 367, 112);
        terraces(c, season === 2);
        if (surface) P(surface, "#ffffff", 0, 210, W, H - 210);
        terrain(c, "tropical", 282);
        land(c, [[0, 280], [142, 269], [298, 282], [480, 267], [480, H], [0, H]], color(["#a2b587", "#91aa7d", "#b9ae7d", "#9bb28e"][season], "#466453", "#b7ad7c"));
        line(c, [[0, 280], [142, 269], [298, 282], [480, 267]], color("#c5c69f", "#789179", "#d7c495"), 3);
        path(c, color(winter ? "#adb5a0" : "#c9c1a0", "#62786c", "#d4bf91"));
        fieldPlots(c, true);
        palm(c, 12, 321, 168);
        palm(c, 473, 332, 189, 21);
        tree(c, -15, 462, 102, "green", 34);
        flowerShrub(c, 472, 518, 30, color("#d3bd9f", "#8caa9d", "#e5c797"));
        seasonalDetails(c, "tropical");
        if (winter) for (let i = 0; i < 15; i++) P(c, color("#bfcdb7", "#648783", "#d5c8aa"), 8 + i * 34, 533 + i % 3 * 5, 11, 1);
      } else if (region === "dali") {
        daliWaterGarden(c);
      } else if (region === "venice") {
        veniceWorldExterior(c);
      } else if (region === "marrakech") {
        seasonalSky(c, "desert");
        mountain(c, -25, 203, 286, 105, winter);
        mountain(c, 206, 202, 306, 111, winter);
        city(c, 231, "earth", 25);
        terrain(c, "sand", 232);
        P(c, color("#bf9276", "#746878", "#d1a17d"), 392, 104, 18, 123);
        P(c, color("#a27866", "#5d5b6c", "#b98b6c"), 389, 99, 24, 6);
        P(c, color("#b68e73", "#6d6c78", "#cba07d"), 397, 80, 8, 19);
        paving(c, 260, color("#c4ab8e", "#646f72", "#c6a17d"));
        palm(c, 15, 328, 151);
        tree(c, 474, 338, 130, "olive", 27);
        lowWall(c, 10, 507, 98, 15);
        lowWall(c, 380, 521, 100, 15);
        if (season === 0) flowerShrub(c, 476, 509, 30, color("#c88099", "#8d6886", "#d995a4"));
        if (season === 1) flowerShrub(c, 476, 509, 28, color("#d5b887", "#9aa78a", "#e5bd89"));
        if (season === 2) flowerShrub(c, 476, 509, 27, color("#c18e5d", "#8c7a66", "#daa467"));
        if (winter) seasonalDetails(c, "mediterranean");
        path(c, color("#e2cfac", "#7b847b", "#e9c89d"), 26);
      } else if (region === "alpine") {
        drawAlpineSummit(c);
      } else if (region === "santorini") {
        drawBrightSantorini(c);
      }
    }
    const titles = {
      zen: ["\u6A31\u82B1\u77F3\u6CC9", "\u590F\u836B\u82D4\u77F3\u5EAD", "\u79CB\u6A31\u77F3\u5EAD", "\u8584\u96EA\u77F3\u5EAD"],
      court: ["\u5F69\u8679\u6625\u56ED", "\u5F69\u8679\u590F\u65E5", "\u5F69\u8679\u91D1\u79CB", "\u5F69\u8679\u51AC\u6674"],
      ubud: ["\u65B0\u79E7\u68AF\u7530", "\u9752\u7EFF\u7A3B\u6D6A", "\u91D1\u8272\u6536\u83B7", "\u96E8\u5B63\u9752\u5C71"],
      dali: ["\u6625\u82B1\u6C34\u9662", "\u6E05\u6C60\u590F\u9662", "\u79CB\u8272\u77F3\u6C34\u9662", "\u96EA\u5C71\u6620\u5C0F\u6C60"],
      venice: ["\u8FDE\u6865\u6625\u6C34\u5DF7", "\u4E34\u6CB3\u590F\u65E5", "\u6696\u5899\u79CB\u8FD0\u6CB3", "\u8584\u96FE\u77F3\u6865"],
      marrakech: ["\u82B1\u5F00\u8001\u57CE", "\u68D5\u6988\u708E\u590F", "\u8D6D\u8272\u79CB\u5EAD", "\u96EA\u5C71\u51AC\u6674"],
      alpine: ["\u96EA\u810A\u521D\u878D", "\u5CA9\u9876\u51B0\u5DDD", "\u9AD8\u5CAD\u79CB\u971C", "\u98CE\u96EA\u4E4B\u5DC5"],
      santorini: ["\u6674\u84DD\u6D77\u5D16", "\u7231\u7434\u6D77\u76DB\u590F", "\u91D1\u5149\u767D\u77F3\u9636", "\u6E05\u900F\u51AC\u6D77"]
    };
    const descriptions = {
      zen: ["\u6625\u6A31\u6620\u7740\u77F3\u6CC9\uFF0C\u8E0F\u77F3\u53E6\u4E00\u4FA7\u7684\u767D\u783E\u6D45\u7EB9\u7ED5\u8FC7\u4E00\u5757\u82D4\u77F3\u3002", "\u6A31\u6811\u590F\u836B\u843D\u5728\u77F3\u6CC9\u65C1\uFF0C\u8E0F\u77F3\u5C0F\u8DEF\u5206\u5F00\u4E24\u7247\u6D45\u6D45\u7684\u767D\u783E\u3002", "\u79CB\u53F6\u7ED9\u6CC9\u8FB9\u6DFB\u4E00\u7B14\u6696\u8272\uFF0C\u6D45\u7EB9\u6CBF\u82D4\u77F3\u7F13\u7F13\u5C55\u5F00\u3002", "\u843D\u53F6\u540E\u7684\u679D\u6761\u900F\u51FA\u8FDC\u666F\uFF0C\u82D4\u77F3\u8986\u7740\u8584\u96EA\uFF0C\u6CC9\u6C34\u4ECD\u5192\u7740\u70ED\u6C14\u3002"],
      court: ["\u5F69\u8679\u821E\u53F0\u5B8C\u6574\u5448\u73B0\u5728\u8349\u5730\u4E0A\uFF0C\u8FDC\u5904\u662F\u73AF\u5F62\u73BB\u7483\u5EFA\u7B51\u4E0E\u679C\u56ED\u3002", "\u516D\u8272\u5F69\u8679\u62F1\u4E0E\u5F2F\u66F2\u6B65\u9053\u886C\u7740\u590F\u8349\uFF0C\u821E\u53F0\u6709\u660E\u786E\u7684\u843D\u5730\u5E73\u53F0\u3002", "\u4FDD\u7559\u5F69\u8679\u3001\u6A61\u6811\u6797\u548C\u679C\u56ED\uFF0C\u8BA9\u79CB\u8272\u56F4\u7ED5\u56ED\u533A\u5C55\u5F00\u3002", "\u5F69\u8679\u821E\u53F0\u548C\u7EFF\u8272\u51AC\u65E5\u56ED\u5730\u76F8\u8FDE\uFF1B\u7528\u51AC\u96E8\u4E0E\u6E7F\u6DA6\u6B65\u9053\u8868\u73B0\u5B63\u8282\uFF0C\u6CA1\u6709\u79EF\u96EA\u3002"],
      ubud: ["\u65B0\u79E7\u6CBF\u5C71\u5761\u6392\u5217\uFF0C\u522B\u5885\u843D\u5728\u68AF\u7530\u65C1\u7684\u5E72\u71E5\u82B1\u56ED\u3002", "\u70ED\u5E26\u7EFF\u610F\u6700\u6D53\uFF0C\u68D5\u6988\u3001\u706B\u5C71\u4E0E\u704C\u6E89\u68AF\u7530\u6784\u6210\u8FDC\u666F\u3002", "\u7A3B\u7530\u8F6C\u91D1\uFF0C\u8FD1\u5904\u4ECD\u662F\u5E72\u5730\u548C\u901A\u5411\u522B\u5885\u7684\u77F3\u5F84\u3002", "\u6309\u4E4C\u5E03\u7684\u96E8\u5B63\u8868\u73B0\uFF1A\u6E7F\u6DA6\u9752\u5C71\u4E0E\u5E38\u7EFF\u68D5\u6988\uFF0C\u4E0D\u4E0B\u96EA\u3002"],
      dali: ["\u82CD\u5C71\u4E0E\u767D\u5899\u7070\u74E6\u524D\uFF0C\u6D45\u6C60\u3001\u5CB8\u77F3\u548C\u6625\u82B1\u56F4\u7740\u81EA\u7136\u77F3\u5F84\u5C55\u5F00\u3002", "\u5165\u53E3\u65C1\u7684\u5C0F\u6C60\u6709\u6D45\u6C34\u690D\u7269\u4E0E\u5CB8\u8FB9\u82B1\u4E1B\uFF0C\u4E2D\u95F4\u7559\u51FA\u5E72\u71E5\u7684\u77F3\u677F\u5C0F\u8DEF\u3002", "\u6696\u79CB\u82B1\u8272\u843D\u5728\u6C60\u8FB9\uFF0C\u77F3\u5934\u3001\u6E05\u6C34\u4E0E\u81EA\u7136\u8FB9\u77F3\u677F\u7EC4\u6210\u5C0F\u6C34\u9662\u3002", "\u96EA\u7559\u5728\u9AD8\u5C71\uFF1B\u8FD1\u5904\u5C0F\u6C60\u4E0D\u7ED3\u51B0\uFF0C\u51AC\u82B1\u548C\u51B7\u7070\u5CB8\u77F3\u886C\u7740\u6E05\u6C34\u3002"],
      venice: ["\u5DE6\u53F3\u652F\u6CB3\u4E0E\u524D\u65B9\u6C34\u9762\u63A5\u901A\uFF0C\u77F3\u62F1\u6865\u628A\u4E66\u623F\u7684\u5E72\u71E5\u77F3\u5CB8\u8FDE\u5230\u8857\u9053\u3002", "\u8FD0\u6CB3\u8FDE\u7EED\u7ED5\u8FC7\u77F3\u5CB8\uFF0C\u8D21\u591A\u62C9\u53EF\u6CBF\u6CB3\u901A\u884C\uFF1B\u7A97\u5185\u5916\u5171\u4EAB\u540C\u4E00\u5E45\u6C34\u666F\u3002", "\u6CBF\u6CB3\u8001\u5B85\u5EF6\u4F38\u51FA\u753B\u9762\uFF0C\u524D\u65B9\u77F3\u6865\u8DE8\u8FC7\u8FDE\u7EED\u6C34\u9762\uFF0C\u6865\u5934\u843D\u5728\u5B9E\u5730\u4E0A\u3002", "\u8584\u96FE\u7559\u5728\u8FDC\u5904\uFF0C\u77F3\u6865\u3001\u4E24\u4FA7\u8FD0\u6CB3\u548C\u7A97\u53E3\u6C34\u666F\u4ECD\u4FDD\u6301\u540C\u4E00\u5957\u7A7A\u95F4\u3002"],
      marrakech: ["\u82B1\u5F00\u7684\u8D6D\u7EA2\u8001\u57CE\uFF0C\u9662\u5916\u662F\u77F3\u94FA\u9053\u8DEF\u548C\u68D5\u6988\u6811\u3002", "\u6696\u6C99\u8272\u8857\u9053\u3001\u6A44\u6984\u4E0E\u68D5\u6988\uFF0C\u57CE\u5E02\u8FDC\u5904\u9732\u51FA\u5C71\u810A\u3002", "\u82B1\u56ED\u4E0E\u8857\u9053\u6362\u6210\u6536\u83B7\u5B63\u7684\u6696\u8272\uFF0C\u4FDD\u7559\u5F53\u5730\u5E38\u7EFF\u690D\u88AB\u3002", "\u8FDC\u5904\u963F\u7279\u62C9\u65AF\u5C71\u79EF\u96EA\uFF0C\u57CE\u91CC\u662F\u6E29\u548C\u51AC\u65E5\u548C\u5E38\u7EFF\u6A44\u6984\u3002"],
      alpine: ["\u6728\u5C4B\u76F4\u63A5\u7ACB\u5728\u9AD8\u5904\u96EA\u810A\u4E0A\uFF0C\u811A\u4E0B\u662F\u878D\u96EA\u5CA9\u53F0\u548C\u4E91\u5C42\u3002", "\u8D8A\u8FC7\u6797\u7EBF\u7684\u963F\u5C14\u5351\u65AF\u5CA9\u9876\uFF0C\u56DB\u5468\u53EF\u89C1\u51B0\u5DDD\u3001\u5CA9\u58C1\u4E0E\u6B8B\u96EA\u3002", "\u9AD8\u5C71\u5CA9\u810A\u4E0A\u8986\u76D6\u8584\u971C\uFF0C\u8FDC\u5CF0\u3001\u51B0\u5DDD\u548C\u4E0B\u65B9\u4E91\u5C42\u5F3A\u8C03\u9AD8\u5EA6\u3002", "\u6728\u5C4B\u7ACB\u5728\u98CE\u5439\u96EA\u810A\u4E0A\uFF0C\u5CA9\u53F0\u3001\u79EF\u96EA\u548C\u9661\u843D\u7684\u5C71\u58C1\u76F8\u8FDE\u3002"],
      santorini: ["\u6674\u84DD\u6D77\u9762\u4E0E\u6696\u767D\u9732\u53F0\u76F8\u63A5\uFF0C\u81EA\u7136\u77F3\u5F84\u4ECE\u5DE6\u4FA7\u5165\u53E3\u5F2F\u5411\u524D\u9662\u3002", "\u660E\u4EAE\u6D77\u84DD\u886C\u7740\u6696\u767D\u524D\u9662\uFF0C\u5929\u7136\u77F3\u677F\u6CBF\u7740\u5165\u6237\u65B9\u5411\u8FDE\u7EED\u94FA\u5F00\u3002", "\u6696\u8272\u77F3\u5F84\u63A5\u4E0A\u5C0F\u5C4B\u843D\u811A\u5904\uFF0C\u4E24\u4FA7\u4EE5\u82B1\u94B5\u548C\u6A44\u6984\u70B9\u51FA\u9662\u843D\u8FB9\u7F18\u3002", "\u6E05\u900F\u51AC\u6D77\u3001\u5E38\u7EFF\u6A44\u6984\u4E0E\u5F2F\u66F2\u77F3\u5F84\uFF0C\u7A97\u5185\u5916\u4FDD\u6301\u540C\u4E00\u5957\u660E\u4EAE\u5149\u7EBF\u3002"]
    };
    const names = { zen: "\u548C\u5BA4", court: "Apple Park", ubud: "\u4E4C\u5E03\u522B\u5885", dali: "\u5927\u7406\u5C0F\u9662", venice: "\u5A01\u5C3C\u65AF\u4E66\u623F", marrakech: "\u9A6C\u62C9\u5580\u4EC0\u5EAD\u9662", alpine: "\u96EA\u5C71\u6728\u5C4B", santorini: "\u5723\u6258\u91CC\u5C3C\u6D77\u8FB9\u5C4B" };
    const variants = Object.fromEntries(Object.keys(names).map((key) => [key, titles[key].map((title, i) => [title, descriptions[key][i], (c) => drawRegional(c, key)])]));
    const cache = /* @__PURE__ */ new Map(), masks = /* @__PURE__ */ new Map(), waterMasks = /* @__PURE__ */ new Map();
    const recordSurfaces = window.LANDSCAPE_RECORD_SURFACES === true;
    const cacheLimit = window.LANDSCAPE_CACHE_SIZE || 4;
    const foregroundPrecipitation = /* @__PURE__ */ new Set(["zen", "court"]);
    let active = null;
    const landscapeKey = (room, variant, time2, outside = "clear") => `${room}-${variant}-${time2}-${outside}`;
    function renderedLandscape(room, variant, time2, reading) {
      const outside = weatherFor(room, reading);
      const key = landscapeKey(room, variant, time2, outside);
      if (!cache.has(key)) {
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const mask = recordSurfaces ? document.createElement("canvas") : null;
        const waterMap = recordSurfaces ? document.createElement("canvas") : null;
        if (mask) {
          mask.width = W;
          mask.height = H;
        }
        if (waterMap) {
          waterMap.width = W;
          waterMap.height = H;
        }
        light = time2;
        season = variant;
        weather = outside;
        surface = mask?.getContext("2d");
        waterSurface = waterMap?.getContext("2d");
        if (waterSurface) P(waterSurface, "#000000", 0, 0, W, H);
        if (surface) P(surface, "#000000", 0, 0, W, H);
        const ctx = canvas.getContext("2d");
        try {
          variants[room][variant][2](ctx);
          weatherOverLandscape(ctx);
        } finally {
          surface = null;
          waterSurface = null;
        }
        let backdrop = canvas;
        if (foregroundPrecipitation.has(room) && hasPrecipitation(outside)) {
          backdrop = document.createElement("canvas");
          backdrop.width = W;
          backdrop.height = H;
          backdrop.getContext("2d").drawImage(canvas, 0, 0);
        }
        drawPrecipitation(ctx, outside, time2);
        cache.set(key, { backdrop, full: canvas });
        if (mask) masks.set(key, mask);
        if (waterMap) waterMasks.set(key, waterMap);
        if (cache.size > cacheLimit) {
          const oldest = cache.keys().next().value;
          cache.delete(oldest);
          masks.delete(oldest);
          waterMasks.delete(oldest);
        }
      } else {
        const layers = cache.get(key);
        cache.delete(key);
        cache.set(key, layers);
      }
      return cache.get(key);
    }
    function background(room, variant, time2, reading) {
      return renderedLandscape(room, variant, time2, reading).full;
    }
    const activeLandscape = () => renderedLandscape(active.room, active.variant, active.time, active.weather);
    CP.P = function(ctx, ink, x, y, w, h) {
      if (active && x === 0 && y === 0 && w === W && h === H && !ctx.roomOcclusionMask) {
        if (!framing(active.room).separateBackground) ctx.drawImage(activeLandscape().backdrop, 0, 0);
      } else P(ctx, ink, x, y, w, h);
    };
    const paintLayers = window.ROOM_PAINTER.layers;
    window.ROOM_PAINTER.layers = function(parts, mask, mk) {
      if (active?.room === "alpine") {
        const { backdrop } = activeLandscape();
        parts = [{ ...parts[0], draw: (c) => c.drawImage(backdrop, 0, 0) }, ...parts.slice(1)];
      }
      return paintLayers(parts, mask, mk);
    };
    window.LANDSCAPES = {
      variants,
      names,
      seasons,
      seasonKeys,
      week,
      seasonForWeekday,
      background,
      framing,
      weatherFor,
      project: projectView,
      sceneKey() {
        return active ? `${active.room}|${active.variant}|${active.time}|${active.weather}` : null;
      },
      clear() {
        cache.clear();
        masks.clear();
        waterMasks.clear();
      },
      drawPrecipitation(ctx) {
        drawPrecipitation(ctx, active.weather, active.time);
      },
      windowView(roomKey, u, width, height, top, v = 0, facing = "v") {
        if (!active || active.room !== roomKey) return null;
        const room = window.OFFICE_ROOMS.find((entry) => entry.key === roomKey).room;
        const view = document.createElement("canvas");
        view.width = width;
        view.height = height;
        const ctx = view.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        const bg = activeLandscape().full, [x, y] = room.project(u, facing === "u" ? v + width : v, top), f = framing(roomKey);
        const slope = facing === "u" ? -1 : 1;
        for (let i = 0; i < width; i++) ctx.drawImage(bg, f.x + (x + i) * f.scale, f.y + (y + slope * Math.ceil(i / 2)) * f.scale, f.scale, height * f.scale, i, 0, 1, height);
        return view;
      },
      waterMask(room, variant, time2) {
        background(room, variant, time2);
        return waterMasks.get(landscapeKey(room, variant, time2));
      },
      bridgeApproaches() {
        const b = VENICE_BRIDGE, u = b.u + b.width / 2;
        return [b.v0 - 6, b.v1 + 6].map((v) => projectView("venice", u, v, -15));
      },
      surfaceAt(room, variant, time2, x, y) {
        background(room, variant, time2);
        if (x < 0 || y < 0 || x >= W || y >= H) return "outside";
        return masks.get(landscapeKey(room, variant, time2)).getContext("2d").getImageData(Math.round(x), Math.round(y), 1, 1).data[0] > 127 ? "land" : "water-or-distance";
      },
      setActive(value) {
        active = value && { ...value, weather: weatherFor(value.room, value.weather) };
      }
    };
  })();
  LANDSCAPES = window.LANDSCAPES;
  (function() {
    "use strict";
    const { P, ell, ramp, mix, glow: paintGlow } = CP;
    const X = CX;
    function glow(ctx, ...args) {
      if (!ctx.roomOcclusionMask) paintGlow(ctx, ...args);
    }
    const OX = 214;
    const OY = 236;
    const RU = 220;
    const RV = 186;
    const H = 150;
    const TH = 6;
    const FL = 6;
    const GU = RU + 34;
    const M = 8;
    const PB = 18;
    const S = (u, v, z) => [OX + u - v, OY + (u + v) / 2 - (z || 0)];
    const q = (ctx, pts, c) => X.poly(ctx, pts.map((p) => S(p[0], p[1], p[2])), c);
    function qa(ctx, pts, c, a) {
      ctx.save();
      ctx.globalAlpha = a;
      q(ctx, pts, c);
      ctx.restore();
    }
    function seg(ctx, a, b, c) {
      const [x0, y0] = S(a[0], a[1], a[2]);
      const [x1, y1] = S(b[0], b[1], b[2]);
      const dx = x1 - x0;
      const dy = y1 - y0;
      const n = Math.max(Math.abs(dx), Math.abs(dy), 1);
      ctx.fillStyle = c;
      for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + dx * i / n), Math.floor(y0 + dy * i / n + 1e-6), 1, 1);
    }
    function box(ctx, u, v, z, du, dv, dz, R, o) {
      o = o || {};
      const t = z + dz;
      if (dz > 0) {
        q(ctx, [[u, v + dv, z], [u + du, v + dv, z], [u + du, v + dv, t], [u, v + dv, t]], o.fv || R.m);
        q(ctx, [[u + du, v, z], [u + du, v + dv, z], [u + du, v + dv, t], [u + du, v, t]], o.fu || R.d);
      }
      q(ctx, [[u, v, t], [u + du, v, t], [u + du, v + dv, t], [u, v + dv, t]], o.top || R.l);
      if (o.edge !== false) {
        seg(ctx, [u, v + dv, t], [u + du, v + dv, t], o.hc || R.h);
        seg(ctx, [u + du, v, t], [u + du, v + dv, t], o.hc || R.h);
      }
    }
    function foot(ctx, u, v, du, dv, a, z) {
      if (ctx.roomOcclusionMask) return;
      qa(ctx, [[u, v, z], [u + du + 3, v, z], [u + du + 3, v + dv + 3, z], [u, v + dv + 3, z]], "#2a2018", a || 0.1);
    }
    function mk(w, h, fn) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d");
      x.imageSmoothingEnabled = false;
      fn(x, w, h);
      return c;
    }
    function onV(ctx, img, u0, vp, zTop) {
      const [x0, y0] = S(u0, vp, zTop);
      for (let i = 0; i < img.width; i++) ctx.drawImage(img, i, 0, 1, img.height, x0 + i, y0 + Math.ceil(i / 2), 1, img.height);
    }
    function onU(ctx, img, up, v0, zTop) {
      const w = img.width;
      const [x0, y0] = S(up, v0 + w, zTop);
      for (let i = 0; i < w; i++) ctx.drawImage(img, i, 0, 1, img.height, x0 + i, y0 - Math.ceil(i / 2), 1, img.height);
    }
    function onFloor(ctx, img, u0, v0, z) {
      const w = img.width;
      const h = img.height;
      const cs = [S(u0, v0, z), S(u0 + w, v0, z), S(u0 + w, v0 + h, z), S(u0, v0 + h, z)];
      const bx = Math.floor(Math.min(...cs.map((c) => c[0])));
      const by = Math.floor(Math.min(...cs.map((c) => c[1])));
      const bw = Math.ceil(Math.max(...cs.map((c) => c[0]))) - bx;
      const bh = Math.ceil(Math.max(...cs.map((c) => c[1]))) - by;
      const src = img.getContext("2d").getImageData(0, 0, w, h).data;
      const dst = ctx.getImageData(bx, by, bw, bh);
      const d = dst.data;
      for (let y = 0; y < bh; y++)
        for (let x = 0; x < bw; x++) {
          const XX = bx + x + 0.5 - OX;
          const YY = by + y + 0.5 - OY + z;
          const uu = (XX + 2 * YY) / 2 - u0;
          const vv = (2 * YY - XX) / 2 - v0;
          if (uu < 0 || vv < 0 || uu >= w || vv >= h) continue;
          const si = ((vv | 0) * w + (uu | 0)) * 4;
          const a = src[si + 3] / 255;
          if (!a) continue;
          const di = (y * bw + x) * 4;
          d[di] = d[di] * (1 - a) + src[si] * a;
          d[di + 1] = d[di + 1] * (1 - a) + src[si + 1] * a;
          d[di + 2] = d[di + 2] * (1 - a) + src[si + 2] * a;
          d[di + 3] = Math.min(255, d[di + 3] + src[si + 3]);
        }
      ctx.putImageData(dst, bx, by);
    }
    function clipTo(ctx, pts, fn, evenodd) {
      ctx.save();
      ctx.beginPath();
      if (evenodd) ctx.rect(0, 0, 480, 560);
      pts.forEach((p, i) => {
        const [x, y] = S(p[0], p[1], p[2]);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.clip(evenodd ? "evenodd" : "nonzero");
      fn();
      ctx.restore();
    }
    function cyl(ctx, cu, cv, z, r, h, R, topC) {
      const rx = Math.round(r * 1.41);
      const ry = Math.max(1, Math.round(rx / 2));
      const [cx, yb] = S(cu, cv, z);
      const yt = yb - h;
      for (let i = -rx; i <= rx; i++) {
        const k = Math.round(ry * Math.sqrt(Math.max(0, 1 - i * i / (rx * rx + 0.3))));
        P(ctx, i < -rx * 0.3 ? R.l : i < rx * 0.35 ? R.m : R.d, cx + i, yt, 1, h + k);
      }
      ell(ctx, cx, yt, rx, ry, topC || R.l);
    }
    const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const mul = (a, b) => {
      const A = hex2(a);
      const B = hex2(b);
      return "#" + A.map((v, i) => Math.round(v * B[i] / 255).toString(16).padStart(2, "0")).join("");
    };
    const BASE = {
      straw: "#d8c98f",
      cedar: "#d9ba8f",
      paper: "#f7f2e8",
      plaster: "#ebe3d3",
      char: "#3b3a38",
      moss: "#7f9a5a",
      stone: "#c3beb4",
      verm: "#d8452a"
    };
    let C = null;
    let CHAR = null;
    function palette(t, w) {
      const n = t === "night";
      const g = t === "golden";
      const inK = n ? "#ab988c" : g ? "#fff0dc" : "#ffffff";
      const outK = n ? w === "rain" ? "#4e5274" : "#5c5f86" : g ? "#ffe0bc" : w === "rain" ? "#c6ccd4" : "#ffffff";
      const tin = (h) => mul(h, inK);
      const tout = (h) => mul(h, outK);
      const actor = {};
      Object.entries(CHAR.pal).forEach(([k, v]) => actor[k] = n ? mul(v, "#e2d2c4") : g ? mul(v, "#fff2e0") : v);
      const snow = w === "snow";
      return {
        n,
        g,
        w,
        bg: n ? w === "rain" ? "#25262f" : "#2c2d36" : g ? "#f3e1cf" : w === "rain" ? "#dcdfe2" : snow ? "#eef1f3" : "#ece8e1",
        STRAW: ramp(tin(BASE.straw)),
        CEDAR: ramp(tin(BASE.cedar)),
        PAPER: ramp(tin(BASE.paper)),
        SHOJI: n ? "#f4cf8e" : g ? "#fde8cc" : "#fbf8f2",
        PLASTER: ramp(tin(BASE.plaster)),
        CHAR: ramp(tin(BASE.char)),
        MOSS: ramp(tin(BASE.moss)),
        VERM: ramp(tin(BASE.verm)),
        STONE: ramp(tout(BASE.stone)),
        GRAVEL: snow ? tout("#f7f8f9") : tout("#e3dfd6"),
        RAKE: snow ? tout("#e6e9ec") : tout("#d0cbc0"),
        PINE: ramp(tout(BASE.moss)),
        ROCK: ramp(tout("#8e8a83")),
        BARK: ramp(tout(BASE.char)),
        MOSSO: ramp(tout(BASE.moss)),
        SNOW: tout("#fbfcfd"),
        actor
      };
    }
    function backdrop(ctx) {
      P(ctx, C.bg, 0, 0, 480, 560);
      for (let k = 0; k < 4; k++) {
        const g = 12 - k * 4;
        qa(ctx, [[-M - g, -M - g, -PB - 40], [GU + g, -M - g, -PB - 40], [GU + g, RV + M + g, -PB - 40], [-M - g, RV + M + g, -PB - 40]], C.n ? "#101018" : "#6a5e50", C.n ? 0.08 : 0.035);
      }
    }
    function plinth(ctx) {
      const R = C.STONE;
      box(ctx, -M, -M, -PB, GU + M, RV + 2 * M, PB, R, { edge: false });
      seg(ctx, [-M, RV + M, 0], [GU, RV + M, 0], C.w === "snow" ? C.SNOW : R.h);
      seg(ctx, [GU, -M, 0], [GU, RV + M, 0], C.w === "snow" ? C.SNOW : R.h);
    }
    const STONE_AT = [RU + 20, 150];
    function gravel(ctx) {
      const u0 = RU + 6;
      const v0 = -M + 4;
      const w = GU - 4 - u0;
      const h = RV + 2 * M - 8;
      onFloor(ctx, mk(w, h, (c) => {
        P(c, C.GRAVEL, 0, 0, w, h);
        for (let y = 0; y < h; y++) if (y % 7 < 1) P(c, C.RAKE, 2, y, w - 4, 1);
        if (C.w === "rain")
          for (let i = 0; i < 18; i++) {
            const x = i * 13 % (w - 6);
            const y = i * 29 % (h - 4);
            P(c, mix(C.GRAVEL, "#8f98a6", 0.4), x, y, 4, 1);
          }
      }), u0, v0, 0);
    }
    function stone(ctx) {
      const [x, y] = S(STONE_AT[0], STONE_AT[1], 0);
      const R = C.ROCK;
      ctx.save();
      ctx.globalAlpha = 0.14;
      ell(ctx, x + 3, y + 2, 14, 5, "#2a2018");
      ctx.restore();
      ell(ctx, x, y - 5, 12, 7, R.d);
      ell(ctx, x - 2, y - 7, 10, 6, R.m);
      ell(ctx, x - 3, y - 9, 7, 4, R.l);
      if (C.w === "snow") ell(ctx, x - 2, y - 11, 8, 3, C.SNOW);
      else ell(ctx, x - 3, y - 10, 5, 2, C.MOSSO.m);
    }
    function pine(ctx) {
      const [x, y] = S(RU + 20, 30, 0);
      const B = C.BARK;
      const G = C.PINE;
      ctx.save();
      ctx.globalAlpha = 0.12;
      ell(ctx, x + 3, y + 1, 16, 5, "#2a2018");
      ctx.restore();
      const limb = (pts, w0, w1) => {
        for (let i = 0; i + 1 < pts.length; i++) {
          const [ax, ay] = pts[i];
          const [bx, by] = pts[i + 1];
          const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
          for (let k = 0; k <= n; k++) {
            const f = (i + k / n) / (pts.length - 1);
            const wdt = Math.round(w0 + (w1 - w0) * f);
            P(ctx, B.m, Math.round(x + ax + (bx - ax) * k / n) - Math.floor(wdt / 2), Math.round(y + ay + (by - ay) * k / n), wdt, 1);
          }
        }
      };
      limb([[0, 0], [-2, -10], [-1, -18], [3, -26], [5, -38], [3, -48]], 5, 2);
      limb([[-1, -18], [-8, -22], [-14, -23]], 3, 2);
      limb([[4, -32], [11, -35], [16, -35]], 2, 2);
      const pad = (px, py, rx) => {
        const ry = Math.round(rx * 0.4);
        ell(ctx, px, py, rx, ry, G.d);
        ell(ctx, px - 1, py - 2, rx - 1, ry - 1, G.m);
        ell(ctx, px - 2, py - 3, Math.round(rx * 0.55), Math.max(1, Math.round(ry * 0.45)), G.l);
        if (C.w === "snow") ell(ctx, px - 1, py - ry, rx - 2, Math.max(1, Math.round(ry * 0.5)), C.SNOW);
      };
      pad(x - 14, y - 25, 11);
      pad(x + 16, y - 37, 10);
      pad(x + 3, y - 51, 11);
    }
    const KAMOI = 34;
    const BOARD = [8, 78];
    const SHOJI0 = 86;
    const SHOJI_W = 34;
    const DOOR_U = SHOJI0 + 3 * SHOJI_W;
    const DOOR_GAP = 28;
    const DOOR_OPEN = [DOOR_U + SHOJI_W - DOOR_GAP, DOOR_U + SHOJI_W];
    function boardImg() {
      const w = BOARD[1] - BOARD[0];
      const h = 60;
      return mk(w, h, (c) => {
        const R = C.CEDAR;
        P(c, R.d, 0, 0, w, h);
        P(c, R.m, 1, 1, w - 2, h - 2);
        P(c, C.PAPER.l, 3, 3, w - 6, h - 6);
        const cw = (w - 6) / 3;
        const heads = [C.STRAW.d, C.MOSS.m, C.CHAR.l];
        for (let k = 0; k < 3; k++) {
          const x = Math.round(3 + k * cw);
          if (k) P(c, C.PAPER.d, x, 6, 1, h - 12);
          P(c, heads[k], x + 3, 6, Math.round(cw) - 6, 3);
          const n = [3, 2, 2][k];
          for (let i = 0; i < n; i++) {
            const y = 13 + i * 13;
            P(c, "rgba(0,0,0,.12)", x + 4, y + 1, Math.round(cw) - 7, 10);
            P(c, k === 2 ? C.MOSS.h : k === 1 ? C.STRAW.h : C.PAPER.h, x + 3, y, Math.round(cw) - 7, 10);
            P(c, C.CHAR.l, x + 5, y + 3, Math.round(cw) - 12, 1);
            P(c, C.CHAR.l, x + 5, y + 6, Math.round(cw) - 15, 1);
            if (k === 2) P(c, C.MOSS.d, x + Math.round(cw) - 8, y + 5, 2, 2);
          }
        }
      });
    }
    function shojiWall(occlusionMask) {
      const R = C.CEDAR;
      return mk(RU, H, (c) => {
        P(c, C.PLASTER.m, 0, 0, RU, H);
        P(c, R.m, 0, KAMOI - 5, RU, 5);
        P(c, R.l, 0, KAMOI - 5, RU, 1);
        const top = KAMOI;
        const base = H - 16;
        c.drawImage(boardImg(), BOARD[0], KAMOI + 10);
        for (let i = 0; i < 4; i++) {
          let x = SHOJI0 + i * SHOJI_W;
          const door = i === 3;
          if (door) {
            const [o0, o1] = DOOR_OPEN;
            const view = !occlusionMask && window.LANDSCAPES?.windowView("zen", o0, o1 - o0, base - top, H - top);
            if (view) {
              c.drawImage(view, o0, top);
            } else {
              P(c, C.n ? "#26283a" : C.w === "rain" ? "#c9ced4" : C.w === "snow" ? "#eef2f4" : "#dde3dc", o0, top, o1 - o0, base - top);
              P(c, C.n ? "#2d3a32" : C.w === "snow" ? "#f8fafb" : mix(BASE.moss, "#dde3dc", 0.35), o0, base - 22, o1 - o0, 22);
            }
            x -= DOOR_GAP;
          }
          const w = SHOJI_W;
          P(c, C.SHOJI, x, top, w, base - top);
          P(c, R.m, x, top, 2, base - top);
          P(c, R.m, x + w - 1, top, 1, base - top);
          P(c, R.l, x + Math.round(w / 2) - 1, top, 1, base - top);
          for (let k = 1; k < 4; k++) P(c, R.l, x, top + Math.round((base - top) * k / 4), w, 1);
          if (door) {
            P(c, R.d, x, top, 1, base - top);
            P(c, R.d, x + w - 1, top, 1, base - top);
          }
        }
        P(c, R.m, 0, base, RU, H - base);
        P(c, R.l, 0, base, RU, 1);
        P(c, R.d, 0, H - 2, RU, 2);
      });
    }
    const LIB = [6, 92];
    const LIB_D = 14;
    const LIB_H = 118;
    const WIN = { v: 160, z: 96, r: 18 };
    function plasterWall() {
      const R = C.PLASTER;
      const CE = C.CEDAR;
      const xv = (v) => RV - v;
      return mk(RV, H, (c) => {
        P(c, R.m, 0, 0, RV, H);
        P(c, CE.m, 0, KAMOI - 5, RV, 5);
        P(c, CE.l, 0, KAMOI - 5, RV, 1);
        const sx = xv(128);
        const sy = KAMOI + 6;
        P(c, C.MOSS.d, sx - 1, sy, 18, 40);
        P(c, C.PAPER.l, sx + 2, sy + 4, 12, 30);
        P(c, C.CHAR.m, sx - 2, sy - 1, 20, 2);
        P(c, C.CHAR.m, sx - 2, sy + 39, 20, 2);
        for (let a = 0; a < Math.PI * 1.78; a += 0.04) P(c, C.CHAR.m, sx + 8 + Math.cos(a - 0.9) * 4, sy + 17 + Math.sin(a - 0.9) * 4, 1, 1);
        P(c, CE.m, 0, H - FL - 3, RV, 3);
        const wx = xv(WIN.v);
        const wy = H - WIN.z;
        for (let y = -WIN.r - 3; y <= WIN.r + 3; y++)
          for (let x = -WIN.r - 3; x <= WIN.r + 3; x++) {
            const d = Math.hypot(x + 0.5, y + 0.5);
            if (d < WIN.r) c.clearRect(wx + x, wy + y, 1, 1);
            else if (d < WIN.r + 3) P(c, d < WIN.r + 1 ? CE.d : CE.m, wx + x, wy + y, 1, 1);
          }
      });
    }
    function viewThroughWindow(ctx) {
      const pts = [];
      for (let k = 0; k < 32; k++) {
        const a = k / 32 * Math.PI * 2;
        pts.push([0, WIN.v + Math.cos(a) * WIN.r, WIN.z + Math.sin(a) * WIN.r]);
      }
      const [x0, y0] = S(0, WIN.v + WIN.r, WIN.z + WIN.r + 12);
      const W2 = WIN.r * 2 + 8;
      const H2 = WIN.r * 3 + 24;
      const windowRadius = WIN.r + 2;
      const v0 = WIN.v - windowRadius;
      const top = WIN.z + windowRadius;
      const view = !ctx.roomOcclusionMask && window.LANDSCAPES?.windowView(
        "zen",
        0,
        windowRadius * 2,
        windowRadius * 2,
        top,
        v0,
        "u"
      );
      clipTo(ctx, pts, () => {
        const [, cy] = S(0, WIN.v, WIN.z);
        if (view) {
          onU(ctx, view, 0, v0, top);
          return;
        }
        if (C.n) {
          P(ctx, "#1e2340", x0 - 4, y0 - 4, W2, H2);
          if (C.w === "clear") {
            ell(ctx, x0 + 24, y0 + 22, 4, 4, "#f6eccb");
            ell(ctx, x0 + 26, y0 + 21, 3, 3, "#1e2340");
          }
        } else {
          const sky = C.g ? "#f6d2a8" : C.w === "rain" ? "#c3c9d1" : C.w === "snow" ? "#e7ecef" : "#dfe7e6";
          P(ctx, sky, x0 - 4, y0 - 4, W2, H2);
          X.ridge(ctx, x0 - 4, W2, cy + 8, 3, 0.12, 3, mix(C.w === "snow" ? "#ffffff" : BASE.moss, sky, 0.5), cy + 60);
          X.ridge(ctx, x0 - 4, W2, cy + 14, 3, 0.15, 7, mix(C.w === "snow" ? "#f2f4f6" : BASE.moss, sky, 0.2), cy + 60);
        }
        weatherIn(ctx, x0 - 4, y0 - 4, W2, H2);
      });
    }
    function library(ctx) {
      const R = C.CEDAR;
      box(ctx, 0, LIB[0], FL, LIB_D, LIB[1] - LIB[0], LIB_H, R, { edge: false, fv: R.m, fu: R.d, top: R.l });
      const w = LIB[1] - LIB[0];
      const cols = [C.CHAR, C.PAPER, C.MOSS, C.STRAW, C.CEDAR, C.CHAR, C.PAPER];
      const face = mk(w, LIB_H, (c) => {
        P(c, R.d, 0, 0, w, LIB_H);
        const shelves = 4;
        const sh = (LIB_H - 6) / shelves;
        for (let s = 0; s < shelves; s++) {
          const y0 = Math.round(3 + s * sh);
          const ih = Math.round(sh) - 4;
          P(c, mix(R.d, R.o, 0.5), 3, y0, w - 6, ih);
          let x2 = 4;
          let i = s * 3;
          while (x2 < w - 8) {
            if (s === 1 && x2 > w * 0.62) {
              P(c, C.STRAW.m, x2, y0 + ih - 10, 14, 10);
              P(c, C.STRAW.d, x2 + 5, y0 + ih - 7, 4, 2);
              break;
            }
            if (s === 3 && x2 > w * 0.55) {
              [C.MOSS.m, C.PAPER.m, C.CHAR.l].forEach((col, k) => P(c, col, x2 + k % 2, y0 + ih - 4 - k * 4, 16, 3));
              break;
            }
            const bw = 3 + i * 7 % 3;
            const bh = ih - 2 - i * 5 % 6;
            const B = cols[i % cols.length];
            P(c, B.m, x2, y0 + ih - bh, bw, bh);
            P(c, B.l, x2, y0 + ih - bh, 1, bh);
            P(c, B.d, x2, y0 + ih - bh + 3, bw, 1);
            x2 += bw + 1;
            i++;
          }
          P(c, R.m, 2, y0 + ih, w - 4, 3);
          P(c, R.l, 2, y0 + ih, w - 4, 1);
        }
      });
      onU(ctx, face, LIB_D, LIB[0], FL + LIB_H);
      cyl(ctx, 7, LIB[0] + 20, FL + LIB_H, 3, 10, C.CHAR);
      const [x, y] = S(7, LIB[0] + 20, FL + LIB_H + 10);
      [[0, 0], [-1, -5], [1, -10], [4, -14], [8, -16]].forEach(([dx, dy]) => P(ctx, C.CHAR.m, x + dx, y + dy, 1, 2));
      [[-2, -7], [4, -14], [9, -18]].forEach(([dx, dy]) => ell(ctx, x + dx, y + dy, 2, 1, C.MOSS.m));
    }
    const PHONE = [196, 24];
    function phoneStand(ctx, inUse) {
      const [u, v] = PHONE;
      const R = C.CEDAR;
      foot(ctx, u, v, 16, 16, 0.12, FL);
      box(ctx, u, v, FL, 16, 16, 14, R);
      box(ctx, u + 3, v + 3, FL + 14, 10, 10, 5, C.CHAR, { edge: false });
      if (!inUse) box(ctx, u + 4, v + 2, FL + 19, 3, 12, 2, C.CHAR, { top: C.CHAR.h, edge: false });
      const [x, y] = S(u + 9, v + 8, FL + 19);
      P(ctx, C.PAPER.m, Math.round(x) - 1, Math.round(y) - 1, 3, 2);
    }
    function walls(ctx) {
      viewThroughWindow(ctx);
      onV(ctx, shojiWall(ctx.roomOcclusionMask), 0, 0, H);
      onU(ctx, plasterWall(), 0, 0, H);
      const CE = C.CEDAR;
      box(ctx, -TH, -TH, H, RU + TH, TH, 0, CE, { top: CE.l, hc: CE.h });
      box(ctx, -TH, 0, H, TH, RV, 0, CE, { top: CE.l, hc: CE.h });
      q(ctx, [[-TH, RV, 0], [0, RV, 0], [0, RV, H], [-TH, RV, H]], CE.m);
      q(ctx, [[RU, -TH, 0], [RU, 0, 0], [RU, 0, H], [RU, -TH, H]], CE.d);
    }
    function post(ctx) {
      const R = C.CEDAR;
      box(ctx, RU, -8, -2, 10, 10, H + 6, R, { top: R.l });
      const face = mk(10, 30, (c) => {
        ell(c, 5, 14, 4, 4, C.CHAR.m);
        ell(c, 5, 14, 3, 3, C.PAPER.l);
        P(c, C.CHAR.m, 5, 11, 1, 3);
        P(c, C.CHAR.m, 5, 14, 2, 1);
      });
      onV(ctx, face, RU, 2, H - 10);
    }
    function floor(ctx) {
      const R = C.STRAW;
      box(ctx, 0, 0, 0, RU, RV, FL, R, { fv: C.CEDAR.m, fu: C.CEDAR.d, edge: false });
      onFloor(ctx, mk(RU, RV, (c) => {
        P(c, R.l, 0, 0, RU, RV);
        const mat = (x, y, w, h) => {
          P(c, R.d, x, y, w, 1);
          P(c, R.d, x, y, 1, h);
        };
        for (let row = 0; row < RV / 37; row++) {
          const y = row * 37;
          const xs = row % 2 ? [0, 37, 111, 185] : [0, 74, 148];
          xs.forEach((x) => mat(x, y, 74, 37));
        }
      }), 0, 0, FL);
      seg(ctx, [0, RV, FL], [RU, RV, FL], R.h);
      seg(ctx, [RU, 0, FL], [RU, RV, FL], R.h);
    }
    function windowLight(ctx) {
      if (C.n) return;
      const a = C.w !== "clear" ? 0.1 : C.g ? 0.32 : 0.24;
      const col = C.g ? "#ffc890" : "#fff3d2";
      const reach = C.g ? 1.5 : 1;
      const [o0, o1] = DOOR_OPEN;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = a;
      q(ctx, [[o0, 2, FL], [o1, 2, FL], [o1 - 30 * reach, 70 * reach, FL], [o0 - 30 * reach, 70 * reach, FL]], col);
      ctx.restore();
    }
    function cushion(ctx, cu, cv, R, h) {
      foot(ctx, cu - 9, cv - 8, 18, 16, 0.1, FL);
      box(ctx, cu - 9, cv - 8, FL, 18, 16, h || 3, R);
    }
    const DESK = [62, 34, 124, 18];
    const DZ = FL + 15;
    const SCREENS = window.OFFICE_SCREENS;
    const MON_W = SCREENS.DESK_W;
    const MON_H = SCREENS.DESK_H;
    const MON_V = DESK[1] + 4;
    const MON_Z = DZ + 4;
    const PAIR_U = DESK[0] + DESK[2] / 2;
    const SEAT = [PAIR_U, 64];
    const FIXTURES = { desk: { facing: "+v", u: PAIR_U, v: MON_V, z: MON_Z, seat: SEAT, keyboard: [PAIR_U - 13, DESK[1] + 11, DZ, 26, 4, 1] } };
    const MONS = SCREENS.deskScreens(FIXTURES.desk).map((m) => m.u0);
    let LINKS = { claude: true, slack: true };
    const linksOf = (l) => ({ claude: !l || l.claude !== false, slack: !l || l.slack !== false });
    const look = (opts) => ({ frame: C.CHAR.o, off: C.CHAR.d, accent: C.VERM.l, body: C.CHAR, bodyOpts: opts });
    function deskStand(ctx, m) {
      const D = C.CHAR;
      box(ctx, m.cu - 4, m.v - 4, DZ, 8, 3, 1, D, { edge: false });
      box(ctx, m.cu - 1, m.v - 4, DZ + 1, 2, 2, m.z - DZ + 6, D, { edge: false });
    }
    function desk(ctx, part) {
      const [u, v, du, dv] = DESK;
      const R = C.CEDAR;
      if (!part || part === "base") {
        foot(ctx, u, v, du, dv, 0.1, FL);
        box(ctx, u + 3, v + 2, FL, 4, dv - 4, 12, R, { edge: false });
        box(ctx, u + du - 7, v + 2, FL, 4, dv - 4, 12, R, { edge: false });
      }
      if (!part || part === "top") box(ctx, u, v, FL + 12, du, dv, 3, R);
      if (!part || part === "screens") {
        SCREENS.placeDesk(ctx, FIXTURES.desk, look({ fv: C.CHAR.d, top: C.CHAR.m }), LINKS, { box, onV, stand: deskStand });
        box(ctx, ...FIXTURES.desk.keyboard, C.CHAR, { top: C.CHAR.l, edge: false });
        cyl(ctx, u + du - 16, v + 10, DZ, 2, 4, C.PAPER, C.MOSS.l);
      }
    }
    const MEET = [20, 109, 72, 34];
    const MZ = FL + 13;
    const MEET_V = MEET[1] + MEET[3] / 2;
    const TV = { u: MEET[0] + 7, z0: MZ + 4 };
    const MSEAT = [MEET[0] + MEET[2] + 14, MEET_V];
    const MSIDE = { u: [MEET[0] + 18, MEET[0] + 54], v: [MEET[1] - 12, MEET[1] + MEET[3] + 12] };
    FIXTURES.meeting = { facing: "+u", u: TV.u, v: MEET_V, z: TV.z0, seat: MSEAT };
    function callStand(ctx, m) {
      const D = C.CHAR;
      box(ctx, m.u - 5, m.v - 4, MZ, 3, 8, 1, D, { edge: false });
      box(ctx, m.u - 5, m.v - 1, MZ + 1, 2, 2, m.z - MZ + 6, D, { edge: false });
    }
    function meetingScreen(ctx) {
      SCREENS.placeCall(ctx, FIXTURES.meeting, look({ fu: C.CHAR.d, top: C.CHAR.m }), !C.n || ST === "meeting", { box, onU, stand: callStand });
    }
    function meeting(ctx) {
      const [u, v, du, dv] = MEET;
      const R = C.CEDAR;
      MSIDE.u.forEach((cu) => cushion(ctx, cu, MSIDE.v[0], C.MOSS));
      foot(ctx, u, v, du, dv, 0.1, FL);
      [[u + 2, v + 2], [u + du - 6, v + 2], [u + du - 6, v + dv - 6], [u + 2, v + dv - 6]].forEach(([a, b]) => box(ctx, a, b, FL, 4, 4, 10, R, { edge: false }));
      box(ctx, u, v, FL + 10, du, dv, 3, R);
      meetingScreen(ctx);
      box(ctx, u + 30, v + 11, MZ, 16, 12, 2, C.CHAR, { edge: false });
      cyl(ctx, u + 35, v + 16, MZ + 2, 2, 4, C.PAPER, C.MOSS.l);
      cyl(ctx, u + 42, v + 18, MZ + 2, 2, 4, C.PAPER, C.MOSS.l);
      cushion(ctx, MSEAT[0], MSEAT[1], C.MOSS);
    }
    function meetingFront(ctx) {
      MSIDE.u.forEach((cu) => cushion(ctx, cu, MSIDE.v[1], C.MOSS));
    }
    const FUT = [124, 120];
    function futon(ctx, laid) {
      const W = C.PAPER;
      const G = C.MOSS;
      if (!laid) {
        const [u2, v2] = [FUT[0] + 46, FUT[1] + 24];
        foot(ctx, u2, v2, 34, 28, 0.12, FL);
        box(ctx, u2, v2, FL, 34, 28, 5, W);
        box(ctx, u2 + 1, v2 + 1, FL + 5, 32, 26, 5, G);
        box(ctx, u2 + 2, v2 + 2, FL + 10, 30, 24, 4, W);
        box(ctx, u2 + 8, v2 + 6, FL + 14, 16, 10, 3, C.STRAW);
        return;
      }
      const [u, v] = FUT;
      foot(ctx, u, v, 84, 40, 0.1, FL);
      box(ctx, u, v, FL, 84, 40, 4, W);
      box(ctx, u + 4, v + 10, FL + 4, 14, 20, 4, C.STRAW);
    }
    function futonCover(ctx) {
      const [u, v] = FUT;
      box(ctx, u + 34, v + 2, FL + 4, 50, 36, 7, C.MOSS);
    }
    const TRAY = [178, 76];
    function tray(ctx, lit) {
      const [u, v] = TRAY;
      const R = C.VERM;
      foot(ctx, u, v, 24, 18, 0.12, FL);
      box(ctx, u, v, FL, 24, 18, 4, R, { top: R.d, hc: R.h });
      box(ctx, u + 2, v + 2, FL + 2, 20, 14, 0, R, { top: R.m, edge: false });
      box(ctx, u + 4, v + 3, FL + 3, 13, 9, 2, C.PAPER);
      box(ctx, u + 7, v + 6, FL + 5, 13, 9, 2, C.PAPER);
    }
    const LAMP = [6, 166];
    function andon(ctx) {
      const [u, v] = LAMP;
      const R = C.CEDAR;
      foot(ctx, u, v, 10, 10, 0.12, FL);
      const paper2 = C.n ? ramp("#ffdba0") : ramp(C.PAPER.h);
      box(ctx, u, v, FL + 3, 10, 10, 20, paper2, { top: R.m, edge: false, fu: C.n ? "#f6c37c" : C.PAPER.d });
      box(ctx, u - 1, v - 1, FL + 23, 12, 12, 1, R, { edge: false });
      box(ctx, u, v, FL, 10, 10, 3, R, { edge: false });
    }
    function weatherIn(ctx, x, y, w, h) {
      if (C.w === "rain") {
        ctx.save();
        ctx.globalAlpha = C.n ? 0.4 : 0.55;
        for (let i = 0; i < w * h / 60; i++) {
          const px = x + i * 37 % w;
          const py = y + i * 53 % h;
          P(ctx, C.n ? "#8e9ac0" : "#9aa4b2", px, py, 1, 4);
        }
        ctx.restore();
      }
      if (C.w === "snow") {
        for (let i = 0; i < w * h / 140; i++) {
          const px = x + i * 41 % w;
          const py = y + i * 29 % h;
          P(ctx, "#ffffff", px, py, 2, 2);
        }
      }
    }
    function weatherOut(ctx) {
      if (C.w !== "rain" && C.w !== "snow") return;
      const room = [[0, 0, H], [RU, 0, H], [RU, 0, 0], [RU, RV, 0], [0, RV, 0], [0, RV, H]];
      clipTo(ctx, room, () => {
        if (window.LANDSCAPES?.sceneKey()) window.LANDSCAPES.drawPrecipitation(ctx);
        else weatherIn(ctx, 0, 0, 480, 560);
      }, true);
    }
    const ACTOR_K = 2;
    const turned = () => window.ROOM_CONTRACT.turnSprite(CHAR, false);
    const turnedL = () => window.ROOM_CONTRACT.turnSprite(CHAR, true);
    function actorAt(ctx, pose, u, v, z) {
      const s = pose === "turn" ? turned() : pose === "turnL" ? turnedL() : CHAR.poses[pose] || CHAR.poses.idle;
      const [x, y] = S(u, v, z);
      const img = sprite(s);
      const w = s.w * (CHAR.k || ACTOR_K);
      const h = s.h * (CHAR.k || ACTOR_K);
      const left = Math.round(x - w / 2);
      const top = Math.round(y) - h + 1;
      ctx.drawImage(img, left, top, w, h);
      return { left, top, w, h, cx: left + w / 2 };
    }
    function holding(ctx, o, what) {
      const hx = Math.round(o.cx);
      const hy = Math.round(o.top + o.h * 0.62);
      if (what === "book") {
        P(ctx, C.CHAR.m, hx - 6, hy - 4, 12, 8);
        P(ctx, C.PAPER.l, hx - 5, hy - 3, 10, 6);
        P(ctx, C.CHAR.m, hx, hy - 3, 1, 6);
      }
      if (what === "slip") {
        P(ctx, C.STRAW.h, o.left + o.w - 4, o.top + 10, 7, 8);
        P(ctx, C.CHAR.l, o.left + o.w - 3, o.top + 13, 5, 1);
      }
      if (what === "handset") {
        P(ctx, C.CHAR.m, o.left + o.w - 8, o.top + 14, 4, 12);
        P(ctx, C.CHAR.m, o.left + o.w - 10, o.top + 13, 4, 3);
        P(ctx, C.CHAR.m, o.left + o.w - 10, o.top + 24, 4, 3);
      }
      if (what === "cup") {
        P(ctx, C.PAPER.d, hx - 4, hy - 2, 8, 7);
        P(ctx, C.PAPER.l, hx - 3, hy - 2, 6, 1);
        P(ctx, C.MOSS.m, hx - 3, hy - 1, 6, 1);
        ctx.save();
        ctx.globalAlpha = 0.5;
        P(ctx, "#ffffff", hx - 1, hy - 7, 1, 3);
        P(ctx, "#ffffff", hx + 1, hy - 9, 1, 3);
        ctx.restore();
      }
      if (what === "attention") {
        const x = hx - 2;
        const y = o.top - 16;
        P(ctx, C.VERM.m, x, y, 4, 9);
        P(ctx, C.VERM.m, x, y + 11, 4, 3);
      }
    }
    let POSE_OVERRIDE = null;
    const STATIONS = ["code", "work", "library", "board", "phone", "meeting", "tea", "handoff", "door", "walk", "sleep"];
    const SLEEP_SURFACE = { u: FUT[0] + 4, v: FUT[1] + 3, z: FL + 9, w: 72, d: 36 };
    const PLACES = {
      code: { u: SEAT[0], v: SEAT[1], z: FL + 3, own: "turn", shared: "turn", sit: true },
      work: { u: SEAT[0], v: SEAT[1], z: FL + 3, own: "turn", shared: "turn", sit: true },
      board: { u: 40, v: 8, z: FL, own: "post", shared: "back", prop: "slip" },
      door: { u: (DOOR_OPEN[0] + DOOR_OPEN[1]) / 2, v: 8, z: FL, own: "wave", shared: "idle" },
      library: { u: 28, v: 52, z: FL, own: "read", shared: "back" },
      phone: { u: 196, v: 54, z: FL, own: "phone", shared: "idle", prop: "handset" },
      // Agent stands just behind the tray, so the tray stays in full view
      handoff: { u: TRAY[0] + 14, v: TRAY[1] - 8, z: FL, own: "attention", shared: "idle", prop: "attention" },
      walk: { u: 150, v: 92, z: FL, own: "walkA", shared: "walkA" },
      meeting: { u: MSEAT[0], v: MSEAT[1], z: FL + 3, own: "turnL", shared: "turnL", sit: true },
      tea: { u: RU + 16, v: 108, z: 0, own: "tea", shared: "type", prop: "cup", sit: true },
      sleep: { ...window.ROOM_PAINTER.sleepPlace(SLEEP_SURFACE), own: "sleep", shared: "sleep", lie: true }
    };
    function parts(station, walking) {
      const asleep = station === "sleep", L = [];
      const add = (draw2, fp, front) => L.push({ draw: draw2, fp, front });
      const contact = (...names) => !walking && names.includes(station) ? false : void 0;
      add(backdrop);
      add(plinth);
      add(gravel);
      add(walls);
      add(floor);
      add(windowLight);
      add(library, [0, LIB[0], LIB_D, LIB[1]]);
      add((c) => phoneStand(c, station === "phone"), [PHONE[0], PHONE[1], PHONE[0] + 16, PHONE[1] + 16]);
      add(post, [RU, -8, RU + 10, 2]);
      add((c) => desk(c, "base"), [DESK[0], DESK[1], DESK[0] + DESK[2], DESK[1] + DESK[3]]);
      add((c) => desk(c, "top"), [DESK[0], DESK[1], DESK[0] + DESK[2], DESK[1] + DESK[3]]);
      add((c) => desk(c, "screens"), [DESK[0], MON_V - 4, DESK[0] + DESK[2], DESK[1] + 15]);
      add((c) => cushion(c, SEAT[0], SEAT[1], C.MOSS), [SEAT[0] - 9, SEAT[1] - 8, SEAT[0] + 9, SEAT[1] + 8], contact("code", "work"));
      add((c) => tray(c, station === "handoff"), [TRAY[0], TRAY[1], TRAY[0] + 24, TRAY[1] + 18]);
      MSIDE.u.forEach((u) => add((c) => cushion(c, u, MSIDE.v[0], C.MOSS), [u - 9, MSIDE.v[0] - 8, u + 9, MSIDE.v[0] + 8]));
      add((c) => {
        const [u, v, du, dv] = MEET;
        foot(c, u, v, du, dv, 0.1, FL);
        [[u + 2, v + 2], [u + du - 6, v + 2], [u + 2, v + dv - 6], [u + du - 6, v + dv - 6]].forEach(([a, b]) => box(c, a, b, FL, 4, 4, 10, C.CEDAR, { edge: false }));
      }, [MEET[0], MEET[1], MEET[0] + MEET[2], MEET[1] + MEET[3]]);
      add((c) => box(c, MEET[0], MEET[1], FL + 10, MEET[2], MEET[3], 3, C.CEDAR), [MEET[0], MEET[1], MEET[0] + MEET[2], MEET[1] + MEET[3]]);
      add(meetingScreen, [TV.u - 5, MEET_V - SCREENS.CALL_W / 2 - 1, TV.u, MEET_V + SCREENS.CALL_W / 2 + 1]);
      add((c) => {
        const [u, v] = MEET;
        box(c, u + 30, v + 11, MZ, 16, 12, 2, C.CHAR, { edge: false });
        cyl(c, u + 35, v + 16, MZ + 2, 2, 4, C.PAPER, C.MOSS.l);
        cyl(c, u + 42, v + 18, MZ + 2, 2, 4, C.PAPER, C.MOSS.l);
      }, [MEET[0] + 30, MEET[1] + 11, MEET[0] + 46, MEET[1] + 23]);
      add((c) => cushion(c, MSEAT[0], MSEAT[1], C.MOSS), [MSEAT[0] - 9, MSEAT[1] - 8, MSEAT[0] + 9, MSEAT[1] + 8], contact("meeting"));
      add((c) => futon(c, asleep), asleep ? [FUT[0], FUT[1], FUT[0] + 84, FUT[1] + 40] : [FUT[0] + 46, FUT[1] + 24, FUT[0] + 80, FUT[1] + 52], contact("sleep"));
      if (asleep && !CHAR.sleepSurface) add(futonCover, [FUT[0] + 34, FUT[1] + 2, FUT[0] + 84, FUT[1] + 38], walking ? void 0 : true);
      MSIDE.u.forEach((u) => add((c) => cushion(c, u, MSIDE.v[1], C.MOSS), [u - 9, MSIDE.v[1] - 8, u + 9, MSIDE.v[1] + 8]));
      add(andon, [LAMP[0] - 1, LAMP[1] - 1, LAMP[0] + 11, LAMP[1] + 11]);
      add(stone, [STONE_AT[0] - 12, STONE_AT[1] - 8, STONE_AT[0] + 12, STONE_AT[1] + 8]);
      add(pine, [RU + 12, 22, RU + 28, 38]);
      return L;
    }
    function slotFor(station, u, v) {
      return window.ROOM_PAINTER.maskFor(parts(station, true), u, v);
    }
    const lyingSprites = /* @__PURE__ */ new WeakMap();
    function drawOri(ctx, place, pose) {
      if (place.lie && CHAR.sleepSurface) {
        const s = CHAR.poses[pose] || CHAR.poses.sleep;
        window.ROOM_PAINTER.sleeper(ctx, sprite(s), S, SLEEP_SURFACE, place);
        return null;
      }
      if (place.lie) {
        const s = CHAR.poses[pose] || CHAR.poses.sleep;
        const K = CHAR.k || ACTOR_K;
        const source = sprite(s);
        let big = lyingSprites.get(source);
        if (!big || big.width !== s.w * K || big.height !== s.h * K) {
          big = mk(s.w * K, s.h * K, (c) => c.drawImage(source, 0, 0, s.w * K, s.h * K));
          lyingSprites.set(source, big);
        }
        onV(ctx, big, place.u, place.v, place.z + big.height - 6);
        return null;
      }
      let o;
      if (CHAR.poses[pose]) o = actorAt(ctx, pose, place.u, place.v, place.z);
      else {
        o = actorAt(ctx, place.shared || "idle", place.u, place.v, place.z);
        if (place.prop) holding(ctx, o, place.prop);
      }
      if (place.glow && !C.n) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.08;
        P(ctx, "#cfe8ff", o.left + 6, o.top + 18, o.w - 12, 12);
        ctx.restore();
      }
      return o;
    }
    let ST = "code";
    function scene2(ctx, station) {
      const place = PLACES[station] || PLACES.code;
      const { back, front } = layers(station);
      ctx.drawImage(back, 0, 0);
      drawOri(ctx, place, POSE_OVERRIDE || place.own);
      ctx.drawImage(front, 0, 0);
    }
    function layers(station, slot2) {
      ST = station;
      const L = parts(station, slot2 !== void 0), place = PLACES[station] || PLACES.code;
      const mask = slot2 === void 0 ? window.ROOM_PAINTER.maskFor(L, place.u, place.v) : slot2;
      const result = window.ROOM_PAINTER.layers(L, mask, mk);
      if (slot2 === void 0 && station === "sleep") {
        const [x, y] = S(FUT[0] + 16, FUT[1] + 24, FL + 40);
        X.zzz(result.front.getContext("2d"), Math.round(x), Math.round(y), C.n ? "#fff4dc" : C.CHAR.m);
      }
      weatherOut(result.front.getContext("2d"));
      return result;
    }
    const NODES = {
      hub: [150, 104],
      mid: [108, 104],
      left: [40, 70],
      back: [44, 22],
      ne: [160, 62],
      edge: [214, 104],
      west: [90, 78],
      futWay: [116, 138],
      // The low cushions are seats, not floor nodes.
      code: [140, SEAT[1]],
      board: [40, 8],
      library: [28, 52],
      phone: [196, 54],
      handoff: [192, 68],
      tea: [236, 108],
      meeting: [122, MSEAT[1]],
      sleep: [116, 138]
    };
    const EDGES = [
      ["hub", "mid"],
      ["mid", "west"],
      ["west", "left"],
      ["left", "back"],
      ["mid", "code"],
      ["back", "board"],
      ["left", "library"],
      ["hub", "ne"],
      ["ne", "phone"],
      ["ne", "handoff"],
      ["hub", "edge"],
      ["edge", "tea"],
      ["mid", "meeting"],
      ["hub", "futWay"],
      ["futWay", "sleep"]
    ];
    const floorAt = (u, v) => u > RU || v > RV ? 0 : FL;
    const SPRITES = /* @__PURE__ */ new WeakMap();
    function sprite(s) {
      let byPal = SPRITES.get(s);
      if (!byPal) SPRITES.set(s, byPal = /* @__PURE__ */ new WeakMap());
      let img = byPal.get(C.actor);
      if (!img) byPal.set(C.actor, img = mk(s.w, s.h, (c) => PX.paint(c, s, C.actor, 0, 0)));
      return img;
    }
    function drawOverlay(ctx, station = ST) {
      if (station === "handoff") {
        const [x, y] = S(TRAY[0] + 12, TRAY[1] + 9, FL + 8);
        glow(ctx, x, y, 22, "#ff9a70", 0.25);
      }
      if (C.n) nightLights(ctx);
    }
    function nightLights(ctx) {
      [[MONS[0], LINKS.slack], [MONS[1], LINKS.claude]].forEach(([u0, ok]) => {
        const [x2, y2] = S(u0 + MON_W / 2, MON_V, MON_Z + MON_H / 2);
        glow(ctx, x2, y2, ok ? 34 : 30, ok ? "#b8d8ff" : "#ff7a40", ok ? 0.16 : 0.24);
      });
      const room = [[0, 0, H], [RU, 0, H], [RU, 0, 0], [RU, RV, 0], [0, RV, 0], [0, RV, H]];
      clipTo(ctx, room, () => {
        let [x2, y2] = S(LAMP[0] + 5, LAMP[1] + 5, FL + 14);
        glow(ctx, x2, y2, 120, "#ffb060", 0.34);
        [x2, y2] = S(RU / 2, 20, 70);
        glow(ctx, x2, y2, 140, "#ffc070", 0.16);
      });
      const [x, y] = S(LAMP[0] + 5, LAMP[1] + 5, FL + 14);
      glow(ctx, x, y, 22, "#fff0c8", 0.35);
    }
    function draw(ctx, m) {
      const t = m.t || "day";
      const station = m.station || (t === "night" ? "sleep" : "code");
      CHAR = m.char || { poses: ACTOR.sprout, pal: X.ORIPAL.sprout };
      POSE_OVERRIDE = m.pose || null;
      LINKS = linksOf(m.links);
      C = palette(t, m.weather || "clear");
      const room = mk(480, 560, (c) => {
        scene2(c, station);
        drawOverlay(c, station);
      });
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(room, 0, 0, 960, 1120);
    }
    CONCEPTS.push({
      key: "min-zen",
      zh: "\u7985\u610F\u548C\u5BA4",
      name: "Zen Room",
      actor: "sprout",
      actorPal: X.ORIPAL.sprout,
      stations: STATIONS,
      angle: "\u4E00\u95F4\u94FA\u7740\u69BB\u69BB\u7C73\u7684\u548C\u5BA4\uFF0C\u653E\u5728\u4E00\u5757\u77F3\u53F0\u4E0A\uFF0C\u65C1\u8FB9\u4E00\u6761\u8019\u51FA\u7EB9\u8DEF\u7684\u767D\u7802\u3002\u4E1C\u897F\u4E0D\u591A\uFF0C\u4F46\u529E\u516C\u5BA4\u8981\u6709\u7684\u6BCF\u4E00\u5904\u90FD\u770B\u5F97\u6E05\uFF1A\u5899\u4E0A\u7684\u4EFB\u52A1\u677F\u3001\u6574\u9762\u4E66\u67B6\u3001\u4F1A\u8BAE\u89D2\u3002",
      why: "\u989C\u8272\u5C11\u3001\u4E1C\u897F\u5C11\uFF0C\u6BCF\u4E00\u4EF6\u90FD\u6E05\u695A\u3002\u767D\u5929\u7EB8\u95E8\u900F\u7740\u67D4\u5149\uFF0C\u62C9\u5F00\u7684\u95E8\u53E3\u5728\u69BB\u69BB\u7C73\u4E0A\u843D\u4E0B\u4E00\u9053\u659C\u659C\u7684\u5149\uFF0COri \u5750\u5728\u77EE\u684C\u524D\u7684\u5750\u57AB\u4E0A\uFF0C\u5BF9\u7740\u4E24\u5757\u5C4F\u5E72\u6D3B\uFF1B\u591C\u91CC\u62C9\u95E8\u6696\u9EC4\uFF0C\u4E00\u76CF\u7EB8\u706F\u7167\u7740\u94FA\u5F00\u7684\u88AB\u8925\u3002\u53EA\u6709\u9700\u8981\u4F60\u7684\u4E1C\u897F\u662F\u6731\u7EA2\u8272\uFF1A\u7B49\u4F60\u786E\u8BA4\u7684\u6258\u76D8\u3001\u5F00\u4F1A\u65F6\u7684\u5F55\u5236\u706F\u3001\u6CA1\u8FDE\u4E0A\u7684\u90A3\u5757\u5C4F\u4E0A\u7684\u8B66\u544A\u3001Ori \u5934\u4E0A\u7684\u300C!\u300D\u3002",
      map: "\u53F3\u540E\u5899 = \u4EFB\u52A1\u677F\uFF08To Do\u3001\u8FDB\u884C\u4E2D\u3001\u5B8C\u6210\u4E09\u5217\uFF09\u3001\u7EB8\u62C9\u95E8\uFF0C\u6700\u53F3\u4E00\u6247\u62C9\u5F00\u5C31\u662F\u95E8\uFF0C\u95E8\u53E3\u900F\u8FDB\u4E00\u9053\u5149\uFF1B\u5899\u89D2\u6728\u67F1 = \u949F\u3002\u5DE6\u540E\u5899 = \u6574\u9762\u4E66\u67B6\uFF08\u4E2A\u4EBA\u56FE\u4E66\u9986\uFF09\u3001\u4E00\u5E45\u5C0F\u6302\u8F74\u3001\u5706\u7A97\u3002\u95E8\u8FB9\u5C0F\u51E0\u4E0A = \u9ED1\u8272\u7535\u8BDD\u3002\u4E2D\u95F4 = \u77EE\u684C\uFF0C\u684C\u5B50\u4E2D\u95F4\u4E24\u5757\u663E\u793A\u5668\u5E76\u6392\u3001\u5C4F\u5E55\u671D\u5916\uFF1A\u5DE6\u8FB9 Slack\uFF0C\u53F3\u8FB9 Claude\uFF0C\u54EA\u4E2A\u6CA1\u8FDE\u4E0A\u90A3\u5757\u5C31\u4EAE\u7740\u6731\u7EA2\u7684\u8B66\u544A\uFF1BOri \u5750\u5728\u684C\u524D\u7684\u5750\u57AB\u4E0A\uFF0C\u8F6C\u8EAB\u6B63\u5BF9\u7740\u5B83\u4EEC\u3002\u5DE6\u524D = \u4F1A\u8BAE\u89D2\uFF1A\u4E00\u5F20\u957F\u77EE\u684C\uFF0C\u9760\u5899\u90A3\u5934\u7684\u684C\u9762\u4E0A\u7ACB\u7740\u901A\u8BDD\u5C4F\uFF08\u50CF\u684C\u4E0A\u7684\u663E\u793A\u5668\u4E00\u6837\uFF0C\u77ED\u811A\u5EA7\uFF1B\u50CF\u89C6\u9891\u4F1A\u8BAE\uFF0C\u56DB\u4E2A\u4EBA\u7684\u753B\u9762\uFF0C\u6709\u5F55\u5236\u706F\uFF09\uFF0C\u957F\u8FB9\u4E24\u4FA7\u5404\u4E24\u4E2A\u5750\u57AB\uFF0C\u684C\u4E0A\u4E00\u76D8\u8336\uFF1BOri \u5750\u5728\u684C\u5B50\u53E6\u4E00\u5934\u7684\u5750\u57AB\u4E0A\uFF0C\u6B63\u5BF9\u7740\u5C4F\u5E55\u3002\u53F3\u524D = \u88AB\u8925\uFF08\u767D\u5929\u53E0\u597D\uFF0C\u591C\u91CC Agent \u7761\u8FD9\uFF09\u3002\u684C\u524D = \u6731\u7EA2\u6258\u76D8\uFF08\u7B49\u4F60\u786E\u8BA4\uFF09\u3002\u95E8\u5916 = \u767D\u7802\u3001\u4E00\u5757\u77F3\u5934\u3001\u4E00\u68F5\u5C0F\u677E\uFF0COri \u559D\u8336\u65F6\u5750\u5728\u8FD9\u91CC\u3002",
      cost: "\u821E\u53F0\u6539\u6210\u659C\u4E0A\u65B9\u770B\u7684\u4E00\u95F4\u623F\uFF0C\u7AD9\u70B9\u4F4D\u7F6E\u6309\u8FD9\u95F4\u623F\u91CD\u6392\uFF1BOri \u653E\u5927\u5230\u73B0\u5728\u7684\u4E24\u500D\uFF1B\u6D88\u606F\u548C\u5199\u4EE3\u7801\u5408\u5728\u4E00\u5F20\u684C\u4E0A\uFF0C\u4E24\u5757\u5C4F\u8DDF\u7740\u7528\u6237\u8FDE\u4E86\u4EC0\u4E48\u53D8\uFF0C\u548C\u5EAD\u9662\u4E00\u89D2\u7684\u5C4F\u5E55\u753B\u9762\u4E00\u6837\u3002",
      draw,
      detail: [0, 120, 480, 420]
    });
    const PALETTES = /* @__PURE__ */ new Map();
    function use(t, weather, char, links) {
      CHAR = char;
      LINKS = linksOf(links);
      POSE_OVERRIDE = null;
      let byChar = PALETTES.get(char);
      if (!byChar) PALETTES.set(char, byChar = /* @__PURE__ */ new Map());
      const key = t + "|" + weather;
      if (!byChar.has(key)) byChar.set(key, palette(t, weather));
      C = byChar.get(key);
    }
    const SPOTS = {
      tasks: [8, -2, 30, 78, 0, 116],
      library: [0, 6, 6, 14, 92, 124],
      meeting: [MEET[0], MSIDE.v[0] - 8, FL, MSEAT[0] + 9, MSIDE.v[1] + 8, TV.z0 + SCREENS.CALL_H],
      handoff: [178, 76, 6, 202, 94, 16],
      phone: [196, 24, 6, 212, 40, 28],
      desk: SCREENS.deskBox(FIXTURES.desk)
    };
    window.ZEN = { STATIONS, PLACES, NODES, EDGES, SPOTS, FIXTURES, floorAt, project: S, use, slotFor, layers, drawOri, drawOverlay };
    window.OFFICE_ROOMS = window.OFFICE_ROOMS || [];
    window.OFFICE_ROOMS.push({ key: "zen", zh: "\u548C\u5BA4", name: "Zen Room", room: window.ZEN });
  })();
  (function() {
    "use strict";
    const { P, ell, ramp, mix, glow: paintGlow, rng } = CP;
    const X = CX;
    function glow(ctx, ...args) {
      if (!ctx.roomOcclusionMask) paintGlow(ctx, ...args);
    }
    const OX = 212;
    const OY = 248;
    const IU0 = -14;
    const IU1 = 244;
    const IV0 = -10;
    const IV1 = 184;
    const IB = 20;
    const PU = 206;
    const PV = 148;
    const FL = 6;
    const H = 150;
    const S = (u, v, z) => [OX + u - v, OY + (u + v) / 2 - (z || 0)];
    const q = (ctx, pts, c) => X.poly(ctx, pts.map((p) => S(p[0], p[1], p[2])), c);
    function qa(ctx, pts, c, a) {
      ctx.save();
      ctx.globalAlpha = a;
      q(ctx, pts, c);
      ctx.restore();
    }
    function seg(ctx, a, b, c) {
      const [x0, y0] = S(a[0], a[1], a[2]);
      const [x1, y1] = S(b[0], b[1], b[2]);
      const dx = x1 - x0;
      const dy = y1 - y0;
      const n = Math.max(Math.abs(dx), Math.abs(dy), 1);
      ctx.fillStyle = c;
      for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + dx * i / n), Math.floor(y0 + dy * i / n + 1e-6), 1, 1);
    }
    function box(ctx, u, v, z, du, dv, dz, R, o) {
      o = o || {};
      const t = z + dz;
      if (dz > 0) {
        q(ctx, [[u, v + dv, z], [u + du, v + dv, z], [u + du, v + dv, t], [u, v + dv, t]], o.fv || R.m);
        q(ctx, [[u + du, v, z], [u + du, v + dv, z], [u + du, v + dv, t], [u + du, v, t]], o.fu || R.d);
      }
      q(ctx, [[u, v, t], [u + du, v, t], [u + du, v + dv, t], [u, v + dv, t]], o.top || R.l);
      if (o.edge !== false) {
        seg(ctx, [u, v + dv, t], [u + du, v + dv, t], o.hc || R.h);
        seg(ctx, [u + du, v, t], [u + du, v + dv, t], o.hc || R.h);
      }
    }
    function circ(cu, cv, r) {
      const n = Math.max(12, Math.round(r * 4));
      const pts = [];
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2;
        pts.push([cu + Math.cos(a) * r, cv + Math.sin(a) * r]);
      }
      return pts;
    }
    function rrect(u0, v0, u1, v1, r) {
      const pts = [];
      const corner = (cu, cv, a0) => {
        for (let k = 0; k <= 3; k++) {
          const a = a0 + k / 3 * (Math.PI / 2);
          pts.push([cu + Math.cos(a) * r, cv + Math.sin(a) * r]);
        }
      };
      corner(u1 - r, v1 - r, 0);
      corner(u0 + r, v1 - r, Math.PI / 2);
      corner(u0 + r, v0 + r, Math.PI);
      corner(u1 - r, v0 + r, Math.PI * 1.5);
      return pts;
    }
    function prism(ctx, pts, z, h, R, o) {
      o = o || {};
      const n = pts.length;
      let cu = 0;
      let cv = 0;
      pts.forEach((p) => {
        cu += p[0] / n;
        cv += p[1] / n;
      });
      if (h > 0)
        for (let i = 0; i < n; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % n];
          let nu = b[1] - a[1];
          let nv = a[0] - b[0];
          if (nu * ((a[0] + b[0]) / 2 - cu) + nv * ((a[1] + b[1]) / 2 - cv) < 0) {
            nu = -nu;
            nv = -nv;
          }
          if (nu + nv <= 0) continue;
          const k = (nu - nv) / (Math.abs(nu) + Math.abs(nv));
          const fv = o.fv || R.m;
          const fu = o.fu || R.d;
          const col = k > 0.4 ? fu : k < -0.4 ? fv : mix(fv, fu, 0.5);
          q(ctx, [[a[0], a[1], z], [b[0], b[1], z], [b[0], b[1], z + h], [a[0], a[1], z + h]], col);
        }
      q(ctx, pts.map((p) => [p[0], p[1], z + h]), o.top || R.l);
    }
    function shadow(ctx, pts, z, a) {
      if (ctx.roomOcclusionMask) return;
      qa(ctx, pts.map((p) => [p[0] + 2, p[1] + 2, z]), "#2a2018", a || 0.1);
    }
    function mk(w, h, fn) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d");
      x.imageSmoothingEnabled = false;
      fn(x, w, h);
      return c;
    }
    function onV(ctx, img, u0, vp, zTop) {
      const [x0, y0] = S(u0, vp, zTop);
      for (let i = 0; i < img.width; i++) ctx.drawImage(img, i, 0, 1, img.height, x0 + i, y0 + Math.ceil(i / 2), 1, img.height);
    }
    function onU(ctx, img, up, v0, zTop) {
      const w = img.width;
      const [x0, y0] = S(up, v0 + w, zTop);
      for (let i = 0; i < w; i++) ctx.drawImage(img, i, 0, 1, img.height, x0 + i, y0 - Math.ceil(i / 2), 1, img.height);
    }
    function onFloor(ctx, img, u0, v0, z) {
      const w = img.width;
      const h = img.height;
      const cs = [S(u0, v0, z), S(u0 + w, v0, z), S(u0 + w, v0 + h, z), S(u0, v0 + h, z)];
      const bx = Math.floor(Math.min(...cs.map((c) => c[0])));
      const by = Math.floor(Math.min(...cs.map((c) => c[1])));
      const bw = Math.ceil(Math.max(...cs.map((c) => c[0]))) - bx;
      const bh = Math.ceil(Math.max(...cs.map((c) => c[1]))) - by;
      const src = img.getContext("2d").getImageData(0, 0, w, h).data;
      const dst = ctx.getImageData(bx, by, bw, bh);
      const d = dst.data;
      for (let y = 0; y < bh; y++)
        for (let x = 0; x < bw; x++) {
          const XX = bx + x + 0.5 - OX;
          const YY = by + y + 0.5 - OY + z;
          const uu = (XX + 2 * YY) / 2 - u0;
          const vv = (2 * YY - XX) / 2 - v0;
          if (uu < 0 || vv < 0 || uu >= w || vv >= h) continue;
          const si = ((vv | 0) * w + (uu | 0)) * 4;
          const a = src[si + 3] / 255;
          if (!a) continue;
          const di = (y * bw + x) * 4;
          d[di] = d[di] * (1 - a) + src[si] * a;
          d[di + 1] = d[di + 1] * (1 - a) + src[si + 1] * a;
          d[di + 2] = d[di + 2] * (1 - a) + src[si + 2] * a;
          d[di + 3] = Math.min(255, d[di + 3] + src[si + 3]);
        }
      ctx.putImageData(dst, bx, by);
    }
    function clipTo(ctx, polys, fn) {
      ctx.save();
      ctx.beginPath();
      polys.forEach((pts) => {
        pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.closePath();
      });
      ctx.clip("nonzero");
      fn();
      ctx.restore();
    }
    function cyl(ctx, cu, cv, z, r, h, R, topC) {
      const rx = Math.max(1, Math.round(r * 1.41));
      const ry = Math.max(1, Math.round(rx / 2));
      const [cx, yb] = S(cu, cv, z);
      const yt = yb - h;
      for (let i = -rx; i <= rx; i++) {
        const k = Math.round(ry * Math.sqrt(Math.max(0, 1 - i * i / (rx * rx + 0.3))));
        P(ctx, i < -rx * 0.3 ? R.l : i < rx * 0.35 ? R.m : R.d, cx + i, yt, 1, h + k);
      }
      ell(ctx, cx, yt, rx, ry, topC || R.l);
    }
    function pole(ctx, u, v, z0, z1, c) {
      seg(ctx, [u, v, z0], [u, v, z1], c);
    }
    const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const isHex = (h) => typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h);
    const mul = (a, b) => {
      if (!isHex(a)) return a;
      const A = hex2(a);
      const B = hex2(b);
      return "#" + A.map((v, i) => Math.round(v * B[i] / 255).toString(16).padStart(2, "0")).join("");
    };
    const BASE = {
      white: "#f6f5f1",
      stone: "#dcd9d1",
      oak: "#d9b98a",
      glass: "#b4c4cc",
      black: "#36373a",
      alu: "#c3c7ca",
      sage: "#a2b595",
      shell: "#8a9f7e",
      rug: "#cbc7bf",
      grass: "#b0c983",
      leaf: "#7fa35c",
      soil: "#c4b294",
      accent: "#ec6f2d"
    };
    let C = null;
    let CHAR = null;
    function palette(t, w) {
      const n = t === "night";
      const g = t === "golden";
      const snow = w === "snow";
      const inK = n ? "#b09e90" : g ? "#fff0dc" : "#ffffff";
      const outK = n ? w === "rain" ? "#4e5274" : "#5c5f86" : g ? "#ffe2c0" : w === "rain" ? "#c9ced5" : "#ffffff";
      const tin = (h) => mul(h, inK);
      const tout = (h) => mul(h, outK);
      const actor = {};
      Object.entries(CHAR.pal).forEach(([k, v]) => actor[k] = n ? mul(v, "#c9b8aa") : g ? mul(v, "#fff2e0") : v);
      return {
        n,
        g,
        w,
        bg: n ? w === "rain" ? "#25262f" : "#2b2d38" : g ? "#f5e3cd" : w === "rain" ? "#dde0e3" : snow ? "#eef1f3" : "#f0e7d8",
        WHITE: ramp(tin(BASE.white)),
        STONE: ramp(tin(BASE.stone)),
        OAK: ramp(tin(BASE.oak)),
        GLASS: ramp(tin(BASE.glass)),
        BLACK: ramp(tin(BASE.black)),
        ALU: ramp(tin(BASE.alu)),
        SAGE: ramp(tin(BASE.sage)),
        SHELL: ramp(tin(BASE.shell)),
        RUG: ramp(tin(BASE.rug)),
        LEAFI: ramp(tin(BASE.leaf)),
        ACC: ramp(tin(BASE.accent)),
        GRASS: ramp(snow ? tout("#f2f4f5") : tout(BASE.grass)),
        LEAF: ramp(tout(BASE.leaf)),
        SOIL: ramp(tout(BASE.soil)),
        TRUNK: ramp(tout("#a08a6c")),
        PATH: ramp(snow ? tout("#e4e7ea") : tout("#eee8dc")),
        SNOW: tout("#fbfcfd"),
        actor
      };
    }
    function backdrop(ctx) {
      P(ctx, C.bg, 0, 0, 480, 560);
      for (let k = 0; k < 4; k++) {
        const g = 12 - k * 4;
        qa(ctx, [[IU0 - g, IV0 - g, -IB - 34], [IU1 + g, IV0 - g, -IB - 34], [IU1 + g, IV1 + g, -IB - 34], [IU0 - g, IV1 + g, -IB - 34]], C.n ? "#101018" : "#6a5e50", C.n ? 0.08 : 0.035);
      }
    }
    function island(ctx) {
      const R = C.SOIL;
      box(ctx, IU0, IV0, -IB, IU1 - IU0, IV1 - IV0, IB, R, { top: C.GRASS.m, edge: false });
      q(ctx, [[IU0, IV1, -3], [IU1, IV1, -3], [IU1, IV1, 0], [IU0, IV1, 0]], C.GRASS.d);
      q(ctx, [[IU1, IV0, -3], [IU1, IV1, -3], [IU1, IV1, 0], [IU1, IV0, 0]], C.GRASS.o);
      seg(ctx, [IU0, IV1, 0], [IU1, IV1, 0], C.GRASS.l);
      seg(ctx, [IU1, IV0, 0], [IU1, IV1, 0], C.GRASS.l);
    }
    const PATHPTS = [[PU - 2, 106], [218, 108], [229, 118], [233, 134], [231, 154], [226, IV1 + 2]];
    function pathAt(u, v) {
      let best = 1e9;
      for (let i = 0; i + 1 < PATHPTS.length; i++) {
        const [ax, ay] = PATHPTS[i];
        const [bx, by] = PATHPTS[i + 1];
        const dx = bx - ax;
        const dy = by - ay;
        const k = Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy)));
        best = Math.min(best, Math.hypot(u - ax - dx * k, v - ay - dy * k));
      }
      return best;
    }
    function path(ctx) {
      const u0 = PU - 4;
      const v0 = 94;
      const w = IU1 - u0;
      const h = IV1 - v0;
      onFloor(ctx, mk(w, h, (c) => {
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const d = pathAt(u0 + x + 0.5, v0 + y + 0.5);
            if (d < 6.5) P(c, d > 5.5 ? C.PATH.m : C.PATH.l, x, y, 1, 1);
          }
      }), u0, v0, 0);
    }
    function platform(ctx) {
      const R = C.STONE;
      box(ctx, 0, 0, 0, PU, PV, FL, R, { top: R.l, edge: false });
      const J = mix(R.l, R.d, 0.3);
      for (let u = 46; u < PU; u += 46) seg(ctx, [u, 0, FL], [u, PV, FL], J);
      for (let v = 50; v < PV; v += 50) seg(ctx, [0, v, FL], [PU, v, FL], J);
      seg(ctx, [0, PV, FL], [PU, PV, FL], C.w === "snow" ? C.SNOW : R.h);
      seg(ctx, [PU, 0, FL], [PU, PV, FL], C.w === "snow" ? C.SNOW : R.h);
      box(ctx, PU, 98, 0, 8, 16, 3, R, { top: R.l });
    }
    function sunlight(ctx) {
      if (C.n) return;
      const a = C.w !== "clear" ? 0.06 : C.g ? 0.22 : 0.14;
      const col = C.g ? "#ffc890" : "#fff6dc";
      const reach = C.g ? 44 : 26;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = a;
      for (let i = 0; i < 4; i++) {
        const v0 = 6 + i * 37;
        q(ctx, [[2, v0, FL], [2, v0 + 24, FL], [reach, v0 + 24 + reach * 0.4, FL], [reach, v0 + reach * 0.4, FL]], col);
      }
      ctx.restore();
    }
    function viewImg(w, h, seed) {
      return mk(w, h, (c) => {
        const rain = C.w === "rain";
        const snow = C.w === "snow";
        const sky = C.n ? rain ? "#1c2032" : "#1e2442" : C.g ? "#f4d2a8" : rain ? "#c4cad2" : snow ? "#e4eaee" : "#d6e6ee";
        P(c, sky, 0, 0, w, h);
        if (C.n && C.w === "clear") {
          if (seed === 5) {
            ell(c, w - 40, 30, 4, 4, "#f6eccb");
            ell(c, w - 38, 29, 3, 3, sky);
          }
          [[14, 20], [40, 44], [70, 16], [96, 52], [58, 64], [130, 24]].forEach(([x, y]) => x < w && P(c, "#c8cde8", x, y, 1, 1));
        }
        const leaf = C.n ? "#2b3640" : snow ? "#eef2f4" : C.g ? mix(BASE.leaf, "#e9a86a", 0.25) : BASE.leaf;
        const far = mix(leaf, sky, C.n ? 0.35 : 0.55);
        const near = mix(leaf, sky, C.n ? 0.1 : 0.2);
        const r = rng(seed);
        for (let x = -6; x < w + 8; x += 11) ell(c, x, h - 42 + Math.round(r() * 6), 8 + Math.floor(r() * 4), 7, far);
        for (let x = 2; x < w + 8; x += 17) {
          const ry = 9 + Math.floor(r() * 5);
          ell(c, x, h - 30 + Math.round(r() * 4), 10 + Math.floor(r() * 4), ry, near);
          if (snow) ell(c, x - 1, h - 30 - ry + 3, 7, 2, C.n ? "#7d84a6" : "#ffffff");
        }
        P(c, near, 0, h - 28, w, 28);
        const grass = C.n ? "#29322f" : snow ? "#f6f8f9" : mix(BASE.leaf, "#d9e2c8", C.g ? 0.35 : 0.45);
        P(c, grass, 0, h - 14, w, 14);
        weatherIn(c, 0, 0, w, h);
      });
    }
    function glassImg(len, panels, seed, view, occlusionMask) {
      const h = H - FL;
      const A = C.ALU;
      const pw = len / panels;
      return mk(len, h, (c) => {
        if (occlusionMask) P(c, "#ffffff", 0, 0, len, h);
        else if (view) c.drawImage(view, 0, 0);
        else {
          c.drawImage(viewImg(len, h, seed), 0, 0);
          const tint = C.n ? "rgba(255,214,160,0.07)" : C.g ? "rgba(214,170,140,0.26)" : "rgba(132,160,178,0.3)";
          P(c, tint, 0, 0, len, h);
        }
        const refl = C.n ? "rgba(255,220,170,0.08)" : "rgba(255,255,255,0.32)";
        for (let i = 0; i < panels; i++) {
          const x0 = Math.round(i * pw);
          const x1 = Math.round((i + 1) * pw);
          c.fillStyle = refl;
          for (let y = 3; y < h - 3; y++) {
            const a = Math.round(x1 - 8 - y * 0.5 + i % 2 * 6);
            [[a, 5], [a - 12, 2]].forEach(([bx, bw]) => {
              const xa = Math.max(x0 + 2, bx);
              const xb = Math.min(x1 - 1, bx + bw);
              if (xb > xa) c.fillRect(xa, y, xb - xa, 1);
            });
          }
          P(c, A.m, x0, 0, 2, h);
          P(c, A.l, x0, 0, 1, h);
        }
        P(c, A.m, len - 2, 0, 2, h);
        P(c, A.m, 0, 0, len, 3);
        P(c, A.l, 0, 0, len, 1);
        P(c, A.d, 0, h - 3, len, 3);
        P(c, A.m, 0, h - 3, len, 1);
      });
    }
    function walls(ctx) {
      const landscape = ctx.roomOcclusionMask ? null : window.LANDSCAPES;
      const back = landscape?.windowView("court", 0, PU, H - FL, H);
      const left = landscape?.windowView("court", 0, PV, H - FL, H, 0, "u");
      onV(ctx, glassImg(PU, 6, 5, back, ctx.roomOcclusionMask), 0, 0, H);
      onU(ctx, glassImg(PV, 4, 9, left, ctx.roomOcclusionMask), 0, 0, H);
      const A = C.ALU;
      box(ctx, -2, -2, H, PU + 2, 2, 0, A, { top: A.l, hc: A.h });
      box(ctx, -2, 0, H, 2, PV, 0, A, { top: A.l, hc: A.h });
      box(ctx, -2, -2, FL, 2, 2, H - FL, A, { top: A.l, edge: false });
      box(ctx, PU - 1, -2, 0, 3, 2, H, A, { top: A.l, edge: false });
      box(ctx, -2, PV - 1, 0, 2, 3, H, A, { top: A.l, edge: false });
    }
    const LIB = [14, 70];
    const LIB_U = [2, 14];
    const LIB_LEVELS = [FL + 1, FL + 23, FL + 45, FL + 67, FL + 89];
    function library(ctx) {
      const [v0, v1] = LIB;
      const [u0, u1] = LIB_U;
      const K = C.BLACK;
      const cols = [C.BLACK, C.WHITE, C.SAGE, C.OAK, C.GLASS, C.BLACK, C.WHITE, C.SHELL, C.ALU, C.OAK, C.BLACK];
      shadow(ctx, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], FL, 0.08);
      pole(ctx, u0, v0, FL, LIB_LEVELS[4], K.m);
      pole(ctx, u0, v1, FL, LIB_LEVELS[4], K.m);
      LIB_LEVELS.forEach((z, s) => {
        box(ctx, u0, v0, z, u1 - u0, v1 - v0, 1, K, { top: K.l, edge: false });
        if (s === LIB_LEVELS.length - 1) return;
        let v = v0 + 2;
        let i = s * 4 + 1;
        while (v < v1 - 4) {
          if (s === 1 && v > v0 + 32) {
            cyl(ctx, u0 + 6, v + 6, z + 1, 3, 9, C.WHITE);
            break;
          }
          if (s === 3 && v > v0 + 34) {
            [C.OAK, C.WHITE, C.BLACK].forEach((B2, k) => box(ctx, u0 + 1, v + k % 2, z + 1 + k * 2, 9, 12, 2, B2, { edge: false }));
            break;
          }
          const bw = 2 + i * 7 % 2;
          const bh = 12 + i * 5 % 7;
          const B = cols[i % cols.length];
          box(ctx, u0 + 1, v, z + 1, 9, bw, bh, B, { edge: false, fu: B.m, fv: B.d });
          v += bw + (i * 3 % 5 === 0 ? 2 : 0);
          i++;
        }
      });
      cyl(ctx, u0 + 5, v1 - 10, LIB_LEVELS[4] + 1, 3, 7, C.WHITE);
      const [x, y] = S(u0 + 5, v1 - 10, LIB_LEVELS[4] + 8);
      [[0, 0], [1, -4], [3, -7]].forEach(([dx, dy]) => P(ctx, C.BLACK.m, x + dx, y + dy, 1, 3));
      ell(ctx, x + 4, y - 8, 3, 2, C.LEAFI.m);
      pole(ctx, u1, v0, FL, LIB_LEVELS[4] + 1, K.m);
      pole(ctx, u1, v1, FL, LIB_LEVELS[4] + 1, K.m);
    }
    const FIG = [8, 6];
    function fig(ctx) {
      const [cu, cv] = FIG;
      shadow(ctx, circ(cu, cv, 5), FL, 0.1);
      cyl(ctx, cu, cv, FL, 5, 11, C.WHITE);
      const [x, y] = S(cu, cv, FL + 11);
      P(ctx, C.TRUNK.d, x, y - 26, 1, 26);
      const leaves = [[-5, -14], [4, -18], [-3, -24], [5, -28], [-6, -32], [1, -36], [-2, -42], [4, -40]];
      leaves.forEach(([dx, dy], i) => {
        ell(ctx, x + dx, y + dy, 4, 3, i % 3 === 0 ? C.LEAFI.d : C.LEAFI.m);
        ell(ctx, x + dx - 1, y + dy - 1, 2, 1, C.LEAFI.l);
      });
    }
    const SOFA = [112, 112, 176, 136];
    const RUGC = [144, 124, 24];
    function rug(ctx) {
      const [cu, cv, r] = RUGC;
      q(ctx, circ(cu, cv, r).map((p) => [p[0], p[1], FL]), C.RUG.m);
      q(ctx, circ(cu, cv, r - 3).map((p) => [p[0], p[1], FL]), C.RUG.l);
    }
    function sofa(ctx, part) {
      const [u0, v0, u1, v1] = SOFA;
      const G = C.SAGE;
      if (!part || part === "shadow") shadow(ctx, rrect(u0, v0, u1, v1, 5), FL, 0.1);
      if (!part || part === "arm") prism(ctx, rrect(u0, v0, u0 + 8, v1, 4), FL + 2, 14, G);
      if (!part || part === "back") prism(ctx, rrect(u0 + 8, v0, u1 - 8, v0 + 8, 3), FL + 2, 24, G);
      if (!part || part === "seat") {
        prism(ctx, rrect(u0 + 8, v0 + 8, u1 - 8, v1, 3), FL + 2, 7, G, { top: G.m });
        const mid = Math.round((u0 + u1) / 2);
        prism(ctx, rrect(u0 + 9, v0 + 9, mid - 1, v1 - 1, 3), FL + 9, 3, G);
        prism(ctx, rrect(mid, v0 + 9, u1 - 9, v1 - 1, 3), FL + 9, 3, G);
      }
      if (!part || part === "pillow")
        prism(ctx, rrect(u0 + 9, v0 + 9, u0 + 19, v0 + 14, 2), FL + 12, 8, C.RUG);
      if (!part || part === "feet") [[u0 + 2, v1 - 2], [u1 - 10, v1 - 2]].forEach(([a, b]) => pole(ctx, a, b, FL, FL + 2, C.BLACK.m));
    }
    function sofaFront(ctx) {
      const [, v0, u1, v1] = SOFA;
      prism(ctx, rrect(u1 - 8, v0, u1, v1, 4), FL + 2, 14, C.SAGE);
      pole(ctx, u1 - 2, v1 - 2, FL, FL + 2, C.BLACK.m);
    }
    function throwBlanket(ctx) {
      const [, v0, u1, v1] = SOFA;
      prism(ctx, rrect(u1 - 24, v0 + 10, u1 - 10, v1 - 2, 2), FL + 12, 3, C.OAK, { top: mix(C.OAK.l, C.WHITE.l, 0.5) });
    }
    const ARC_BASE = [181, 130];
    const ARC_HEAD = [171, 127, FL + 50];
    function arcLamp(ctx) {
      const [bu, bv] = ARC_BASE;
      const [hu, hv, hz] = ARC_HEAD;
      prism(ctx, circ(bu, bv, 3), FL, 2, C.BLACK);
      const top = hz + 10;
      pole(ctx, bu, bv, FL + 2, top - 4, C.BLACK.m);
      let prev = [bu, bv, top - 4];
      for (let k = 1; k <= 8; k++) {
        const a = k / 8 * (Math.PI / 2);
        const pt = [bu + (hu - bu) * Math.sin(a), bv + (hv - bv) * Math.sin(a), top - 4 + Math.sin(a * 2) * 3 - (top - 4 - hz - 4) * (1 - Math.cos(a))];
        seg(ctx, prev, pt, C.BLACK.m);
        prev = pt;
      }
      const [x, y] = S(hu, hv, hz + 4);
      ell(ctx, x, y, 6, 4, C.BLACK.m);
      P(ctx, C.BLACK.m, x - 6, y, 13, 1);
      ell(ctx, x - 1, y - 1, 4, 2, C.BLACK.l);
      P(ctx, C.n ? "#fff2cc" : C.WHITE.m, x - 4, y + 1, 9, 1);
    }
    const LAMP = [8, 82];
    function floorLamp(ctx) {
      const [u, v] = LAMP;
      prism(ctx, circ(u, v, 3), FL, 1, C.BLACK);
      pole(ctx, u, v, FL + 1, FL + 80, C.BLACK.m);
      cyl(ctx, u, v, FL + 80, 4, 10, C.n ? ramp("#ffe2b0") : C.WHITE, C.n ? "#fff2d0" : C.WHITE.h);
    }
    const BOARD = [22, 74];
    const BV = 8;
    const BZ = [36, 92];
    function boardImg() {
      const w = BOARD[1] - BOARD[0];
      const h = BZ[1] - BZ[0];
      return mk(w, h, (c) => {
        P(c, C.ALU.d, 0, 0, w, h);
        P(c, C.WHITE.h, 1, 1, w - 2, h - 2);
        [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].forEach(([x, y]) => c.clearRect(x, y, 1, 1));
        const cw = Math.floor((w - 6) / 3);
        const heads = [C.BLACK.m, C.OAK.d, C.SAGE.o];
        const notes = ["#f1df94", mix(C.GLASS.l, "#ffffff", 0.1), mix(C.SAGE.l, "#ffffff", 0.15)];
        for (let k = 0; k < 3; k++) {
          const x = 3 + k * cw;
          if (k) P(c, C.ALU.m, x - 1, 5, 1, h - 10);
          P(c, heads[k], x + 2, 5, cw - 5, 2);
          const n = [3, 2, 2][k];
          for (let i = 0; i < n; i++) {
            const y = 11 + i * 14;
            P(c, "rgba(0,0,0,.14)", x + 3, y + 1, cw - 6, 11);
            P(c, notes[k], x + 2, y, cw - 6, 11);
            P(c, C.BLACK.l, x + 4, y + 3, cw - 11, 1);
            P(c, C.BLACK.l, x + 4, y + 6, cw - 14, 1);
            if (k === 2) P(c, C.SAGE.o, x + cw - 9, y + 6, 2, 2);
          }
        }
      });
    }
    function board2(ctx) {
      const [u0, u1] = BOARD;
      [u0 + 4, u1 - 4].forEach((lu) => {
        box(ctx, lu - 1, BV - 5, FL, 2, 10, 1, C.BLACK, { edge: false });
        pole(ctx, lu, BV, FL + 1, BZ[0], C.BLACK.m);
      });
      box(ctx, u0, BV - 1, BZ[0], u1 - u0, 1, BZ[1] - BZ[0], C.ALU, { edge: false });
      onV(ctx, boardImg(), u0, BV, BZ[1]);
    }
    const DESK = [66, 34, 112, 18];
    const DZ = FL + 22;
    const MON_W = window.OFFICE_SCREENS.DESK_W;
    const MON_H = window.OFFICE_SCREENS.DESK_H;
    const MON_V = DESK[1] + 5;
    const MON_Z = DZ + 4;
    const PAIR_U = DESK[0] + DESK[2] / 2;
    const SEAT = [PAIR_U, 62];
    const FIXTURES = { desk: { facing: "+v", u: PAIR_U, v: MON_V, z: MON_Z, seat: SEAT, keyboard: [PAIR_U - 13, DESK[1] + 11, DZ, 26, 4, 1] } };
    const MONS = window.OFFICE_SCREENS.deskScreens(FIXTURES.desk).map((m) => m.u0);
    let LINKS = { claude: true, slack: true };
    const linksOf = (l) => ({ claude: !l || l.claude !== false, slack: !l || l.slack !== false });
    const SCREENS = window.OFFICE_SCREENS;
    const look = () => ({ frame: C.BLACK.d, off: C.BLACK.m, accent: C.ACC.l, body: C.BLACK });
    function deskStand(ctx, m) {
      box(ctx, m.cu - 4, m.v - 5, DZ, 8, 4, 1, C.BLACK, { edge: false });
      pole(ctx, m.cu, m.v - 2, DZ + 1, m.z + 8, C.ALU.d);
    }
    function chairBase(ctx) {
      const [cu, cv] = SEAT;
      shadow(ctx, circ(cu, cv, 6), FL, 0.08);
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * Math.PI * 2 - Math.PI / 2;
        const e = [cu + Math.cos(a) * 6, cv + Math.sin(a) * 6, FL + 1];
        seg(ctx, [cu, cv, FL + 2], e, C.BLACK.m);
      }
      pole(ctx, cu, cv, FL + 2, FL + 9, C.ALU.d);
      prism(ctx, circ(cu, cv, 6), FL + 9, 3, C.BLACK);
    }
    function chairBack(ctx) {
      const [cu, cv] = SEAT;
      const bv = cv + 6;
      const z0 = FL + 11;
      const z1 = FL + 22;
      const K = C.BLACK.m;
      seg(ctx, [cu, cv + 2, FL + 10], [cu, bv, z0], K);
      seg(ctx, [cu - 7, bv, z0], [cu - 7, bv, z1], K);
      seg(ctx, [cu + 7, bv, z0], [cu + 7, bv, z1], K);
      seg(ctx, [cu - 7, bv, z1], [cu + 7, bv, z1], K);
    }
    function desk(ctx, part) {
      const [u, v, du, dv] = DESK;
      if (!part || part === "base") {
        shadow(ctx, [[u, v], [u + du, v], [u + du, v + dv], [u, v + dv]], FL, 0.07);
        [u + 4, u + du - 6].forEach((lu) => {
          box(ctx, lu, v + 1, FL, 2, dv - 2, 1, C.BLACK, { edge: false });
          box(ctx, lu, v + dv / 2 - 1, FL + 1, 2, 2, DZ - FL - 3, C.BLACK, { edge: false });
        });
      }
      if (!part || part === "top") {
        box(ctx, u, v, DZ - 2, du, dv, 2, C.WHITE, { fv: C.ALU.l, fu: C.ALU.m });
        cyl(ctx, u + 6, v + 9, DZ, 3, 5, C.WHITE);
        const [px, py] = S(u + 6, v + 9, DZ + 5);
        ell(ctx, px, py - 3, 4, 3, C.LEAFI.m);
        ell(ctx, px - 1, py - 4, 2, 1, C.LEAFI.l);
        cyl(ctx, u + du - 18, v + 12, DZ, 2, 4, C.WHITE, C.OAK.d);
      }
      if (!part || part === "screens") {
        SCREENS.placeDesk(ctx, FIXTURES.desk, look(), LINKS, { box, onV, stand: deskStand });
        box(ctx, ...FIXTURES.desk.keyboard, C.ALU, { edge: false });
        const lu = u + du - 4;
        const lv = v + 8;
        prism(ctx, circ(lu, lv, 2), DZ, 1, C.BLACK);
        seg(ctx, [lu, lv, DZ + 1], [lu + 1, lv - 2, DZ + 22], C.BLACK.m);
        seg(ctx, [lu + 1, lv - 2, DZ + 22], [lu + 5, lv - 4, DZ + 18], C.BLACK.m);
        const [x, y] = S(lu + 5, lv - 4, DZ + 18);
        P(ctx, C.BLACK.m, x - 3, y, 6, 2);
        if (C.n) P(ctx, "#fff2cc", x - 2, y + 2, 4, 1);
      }
    }
    const PHONE = [188, 22];
    function phoneTable(ctx, inUse) {
      const [u, v] = PHONE;
      const z = FL + 20;
      shadow(ctx, circ(u, v, 7), FL, 0.1);
      [0.6, 2.7, 4.8].forEach((a) => seg(ctx, [u + Math.cos(a) * 5, v + Math.sin(a) * 5, z], [u + Math.cos(a) * 7, v + Math.sin(a) * 7, FL], C.BLACK.m));
      prism(ctx, circ(u, v, 8), z, 1, C.WHITE, { fv: C.ALU.m, fu: C.ALU.d });
      prism(ctx, rrect(u - 4, v - 3, u + 4, v + 4, 2), z + 1, 3, C.BLACK);
      if (!inUse) {
        box(ctx, u - 2, v - 1, z + 4, 3, 4, 13, C.BLACK, { edge: false, top: C.BLACK.l });
        const [x, y] = S(u - 1, v + 3, z + 15);
        P(ctx, "#9fd0e6", x - 1, y, 2, 3);
      }
    }
    const MEET = [50, 118, 30, 14];
    const MZ = FL + 20;
    function racetrack() {
      const [cu, cv, a, b] = MEET;
      const pts = [];
      for (let k = 0; k <= 10; k++) {
        const t = -Math.PI / 2 + k / 10 * Math.PI;
        pts.push([cu + a - b + Math.cos(t) * b, cv + Math.sin(t) * b]);
      }
      for (let k = 0; k <= 10; k++) {
        const t = Math.PI / 2 + k / 10 * Math.PI;
        pts.push([cu - a + b + Math.cos(t) * b, cv + Math.sin(t) * b]);
      }
      return pts;
    }
    const SCREEN = { u: 5, v0: MEET[1] - 23, z0: FL + 30 };
    function callStand(ctx, m) {
      [m.v0 + 4, m.v0 + 42].forEach((lv) => {
        box(ctx, m.u - 4, lv - 1, FL, 9, 2, 1, C.BLACK, { edge: false });
        pole(ctx, m.u - 1, lv, FL + 1, m.z, C.BLACK.m);
      });
    }
    function meetingScreen(ctx) {
      SCREENS.placeCall(ctx, FIXTURES.meeting, look(), !C.n || ST === "meeting", { box, onU, stand: callStand });
    }
    function shell(ctx, cu, cv, back, z0, part, R) {
      const zs = z0 + 9;
      const SH = R || C.SHELL;
      const backImg = (inner2) => mk(10, 10, (c) => {
        P(c, inner2 ? SH.l : SH.m, 0, 0, 10, 10);
        P(c, inner2 ? SH.m : SH.d, 0, 9, 10, 1);
        [[0, 0], [9, 0], [0, 1], [9, 1], [1, 0], [8, 0]].forEach(([x, y]) => c.clearRect(x, y, 1, 1));
      });
      const drawBack = () => {
        if (back === "v-") onV(ctx, backImg(true), cu - 5, cv - 5, zs + 12);
        if (back === "u-") onU(ctx, backImg(true), cu - 5, cv - 5, zs + 12);
        if (back === "v+") onV(ctx, backImg(false), cu - 5, cv + 5, zs + 12);
        if (back === "u+") onU(ctx, backImg(false), cu + 5, cv - 5, zs + 12);
      };
      const inner = back === "v-" || back === "u-";
      if (part === "back" && inner) {
        drawBack();
        return;
      }
      if (part !== "back") {
        if (part !== "cushion") {
          shadow(ctx, circ(cu, cv, 5), z0, 0.1);
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => seg(ctx, [cu + a * 3, cv + b * 3, zs], [cu + a * 5, cv + b * 5, z0], C.BLACK.m));
        }
        if (part === "base") return;
        if (inner && !part) drawBack();
        prism(ctx, rrect(cu - 5, cv - 5, cu + 5, cv + 5, 3), zs, 2, SH);
      }
      if (part !== "seat" && part !== "cushion" && !inner) drawBack();
    }
    const BACK_CHAIRS = [[MEET[0] - 14, MEET[1] - MEET[3] - 9], [MEET[0] + 14, MEET[1] - MEET[3] - 9]];
    const FRONT_CHAIRS = [[MEET[0] - 14, MEET[1] + MEET[3] + 9], [MEET[0] + 14, MEET[1] + MEET[3] + 9]];
    const END_SEAT = [MEET[0] + MEET[2] + 10, MEET[1]];
    FIXTURES.meeting = { facing: "+u", u: SCREEN.u, v: SCREEN.v0 + SCREENS.CALL_W / 2, z: SCREEN.z0, seat: END_SEAT };
    function table(ctx, part) {
      const [cu, cv, a] = MEET;
      if (!part || part === "base") {
        shadow(ctx, racetrack(), FL, 0.1);
        [cu - a / 2, cu + a / 2].forEach((pu) => {
          prism(ctx, circ(pu, cv, 5), FL, 1, C.BLACK);
          cyl(ctx, pu, cv, FL + 1, 1.5, MZ - FL - 3, C.BLACK);
        });
      }
      if (!part || part === "top") {
        prism(ctx, racetrack(), MZ - 2, 2, C.WHITE, { fv: C.ALU.m, fu: C.ALU.d });
        const [x, y] = S(cu, cv, MZ);
        prism(ctx, circ(cu, cv, 2), MZ, 1, C.BLACK);
        P(ctx, C.BLACK.m, x, y - 9, 1, 8);
        ell(ctx, x, y - 14, 6, 6, C.n ? "#c89a60" : C.ALU.d);
        ell(ctx, x, y - 14, 5, 5, C.n ? "#ffe8b8" : C.WHITE.m);
        ell(ctx, x - 2, y - 16, 2, 2, C.n ? "#fffaf0" : C.WHITE.h);
        cyl(ctx, cu + 16, cv + 4, MZ, 2, 4, C.WHITE, C.OAK.d);
        cyl(ctx, cu - 18, cv - 3, MZ, 2, 4, C.WHITE, C.OAK.d);
        box(ctx, cu + 4, cv - 9, MZ, 10, 7, 1, C.BLACK, { edge: false });
      }
    }
    const TRAY = [188, 58];
    function tray(ctx, lit) {
      const [u, v] = TRAY;
      const z = FL + 15;
      shadow(ctx, circ(u, v, 9), FL, 0.1);
      prism(ctx, circ(u, v, 5), FL, 1, C.BLACK);
      cyl(ctx, u, v, FL + 1, 1.2, z - FL - 1, C.BLACK);
      prism(ctx, circ(u, v, 10), z, 1, C.WHITE, { fv: C.ALU.m, fu: C.ALU.d });
      const R = C.ACC;
      prism(ctx, rrect(u - 7, v - 6, u + 7, v + 6, 2), z + 1, 3, R, { top: R.d });
      q(ctx, rrect(u - 6, v - 5, u + 6, v + 5, 1.5).map((p) => [p[0], p[1], z + 4]), R.m);
      prism(ctx, rrect(u - 5, v - 4, u + 3, v + 2, 1), z + 3, 2, C.WHITE, { top: C.WHITE.h });
      prism(ctx, rrect(u - 2, v - 2, u + 6, v + 4, 1), z + 5, 2, C.WHITE, { top: C.WHITE.h });
    }
    function tree(ctx, u, v, r, th) {
      const [x, y] = S(u, v, 0);
      const G = C.LEAF;
      ctx.save();
      ctx.globalAlpha = 0.13;
      ell(ctx, x + 4, y + 1, r + 2, Math.round(r * 0.45), "#24301c");
      ctx.restore();
      P(ctx, C.TRUNK.m, x - 1, y - th, 3, th + 1);
      P(ctx, C.TRUNK.d, x + 1, y - th, 1, th + 1);
      const cy = y - th - Math.round(r * 0.8);
      ell(ctx, x, cy, r, Math.round(r * 0.92), G.d);
      ell(ctx, x - 2, cy - 2, r - 2, Math.round(r * 0.92) - 2, G.m);
      ell(ctx, x - Math.round(r * 0.35), cy - Math.round(r * 0.4), Math.round(r * 0.42), Math.round(r * 0.36), G.l);
      if (C.w === "snow") ell(ctx, x - 1, cy - Math.round(r * 0.62), Math.round(r * 0.7), Math.round(r * 0.3), C.SNOW);
    }
    const BIG_TREE = [228, 22, 19, 22];
    const SIDE_TREE = [238, 92, 9, 10];
    const FRONT_TREES = [[28, 170, 12, 10], [198, 174, 9, 8]];
    function frontTrees(ctx) {
      FRONT_TREES.forEach(([u, v, r, th]) => tree(ctx, u, v, r, th));
    }
    const CAFE = [233, 50];
    const CAFE_CHAIR = [216, 64];
    const CAFE_CHAIR2 = [236, 34];
    function cafeTable(ctx) {
      const [u, v] = CAFE;
      shadow(ctx, circ(u, v, 9), 0, 0.14);
      prism(ctx, circ(u, v, 5), 0, 1, C.BLACK);
      cyl(ctx, u, v, 1, 1.5, 18, C.BLACK);
      prism(ctx, circ(u, v, 10), 19, 1, C.WHITE, { fv: C.ALU.m, fu: C.ALU.d });
      cyl(ctx, u + 3, v + 2, 20, 2, 5, C.WHITE, C.OAK.d);
      cyl(ctx, u - 4, v - 3, 20, 2, 5, C.WHITE, C.OAK.d);
    }
    function weatherIn(ctx, x, y, w, h) {
      const r = rng(w * 7 + h);
      if (C.w === "rain") {
        ctx.save();
        ctx.globalAlpha = C.n ? 0.35 : 0.45;
        for (let i = 0; i < w * h / 70; i++) P(ctx, C.n ? "#8e9ac0" : "#9aa4b2", x + Math.floor(r() * w), y + Math.floor(r() * h), 1, 4);
        ctx.restore();
      }
      if (C.w === "snow") {
        for (let i = 0; i < w * h / 150; i++) P(ctx, C.n ? "#dfe3f2" : "#ffffff", x + Math.floor(r() * w), y + Math.floor(r() * h), 2, 2);
      }
    }
    const ROOM = () => [S(0, 0, H), S(PU, 0, H), S(PU, 0, 0), S(PU, PV, 0), S(0, PV, 0), S(0, PV, H)];
    function weatherOut(ctx) {
      if (C.w !== "rain" && C.w !== "snow") return;
      const sheet = mk(480, 560, (c) => {
        if (window.LANDSCAPES?.sceneKey()) window.LANDSCAPES.drawPrecipitation(c);
        else weatherIn(c, 0, 0, 480, 560);
        c.globalCompositeOperation = "destination-out";
        X.poly(c, ROOM(), "#000");
      });
      ctx.drawImage(sheet, 0, 0);
    }
    const ACTOR_K = 2;
    const STAND_BACK = /* @__PURE__ */ new WeakMap();
    function standBack(poses) {
      let s = STAND_BACK.get(poses);
      if (!s) {
        const b = poses.back;
        const i = poses.idle;
        s = b && i && i.h > b.h ? PX.sprite(b.rows.concat(i.rows.slice(b.h))) : b || i;
        STAND_BACK.set(poses, s);
      }
      return s;
    }
    const turned = () => window.ROOM_CONTRACT.turnSprite(CHAR, false);
    const turnedL = () => window.ROOM_CONTRACT.turnSprite(CHAR, true);
    function actorAt(ctx, pose, u, v, z, stand) {
      let s = pose === "turn" ? turned() : pose === "turnL" ? turnedL() : CHAR.poses[pose] || CHAR.poses.idle;
      if (stand && pose === "back") s = standBack(CHAR.poses);
      const [x, y] = S(u, v, z);
      const img = sprite(s);
      const w = s.w * (CHAR.k || ACTOR_K);
      const h = s.h * (CHAR.k || ACTOR_K);
      const left = Math.round(x - w / 2);
      const top = Math.round(y) - h + 1;
      ctx.drawImage(img, left, top, w, h);
      return { left, top, w, h, cx: left + w / 2 };
    }
    function holding(ctx, o, what) {
      const hx = Math.round(o.cx);
      const hy = Math.round(o.top + o.h * 0.62);
      if (what === "slip") {
        P(ctx, "#f1df94", o.left + o.w - 4, o.top + 10, 7, 8);
        P(ctx, C.BLACK.l, o.left + o.w - 3, o.top + 13, 5, 1);
      }
      if (what === "handset") {
        P(ctx, C.BLACK.m, o.left + o.w - 8, o.top + 13, 4, 13);
        P(ctx, "#9fd0e6", o.left + o.w - 7, o.top + 15, 2, 2);
      }
      if (what === "cup") {
        P(ctx, C.WHITE.d, hx - 4, hy - 2, 8, 7);
        P(ctx, C.WHITE.l, hx - 3, hy - 2, 6, 1);
        P(ctx, C.OAK.d, hx - 3, hy - 1, 6, 1);
        ctx.save();
        ctx.globalAlpha = 0.5;
        P(ctx, "#ffffff", hx - 1, hy - 7, 1, 3);
        P(ctx, "#ffffff", hx + 1, hy - 9, 1, 3);
        ctx.restore();
      }
      if (what === "attention") {
        const x = hx - 2;
        const y = o.top - 16;
        P(ctx, C.ACC.m, x, y, 4, 9);
        P(ctx, C.ACC.m, x, y + 11, 4, 3);
      }
    }
    let POSE_OVERRIDE = null;
    const STATIONS = ["code", "work", "library", "board", "phone", "meeting", "tea", "handoff", "door", "walk", "sleep"];
    const SLEEP_SURFACE = { u: SOFA[0] + 9, v: SOFA[1] + 6, z: FL + 20, w: 46, d: 20 };
    const PLACES = {
      code: { u: SEAT[0], v: SEAT[1], z: FL + 12, own: "turn", shared: "turn", sit: true },
      work: { u: SEAT[0], v: SEAT[1], z: FL + 12, own: "turn", shared: "turn", sit: true },
      board: { u: 38, v: 14, z: FL, own: "post", shared: "back", prop: "slip", stand: true },
      library: { u: 30, v: 46, z: FL, own: "read", shared: "back", stand: true },
      // just behind the phone's table and the tray's table, so both stay in view
      phone: { u: 184, v: 8, z: FL, own: "phone", shared: "idle", prop: "handset" },
      handoff: { u: 184, v: 44, z: FL, own: "attention", shared: "idle", prop: "attention" },
      walk: { u: 116, v: 80, z: FL, own: "walkA", shared: "walkA" },
      meeting: { u: END_SEAT[0], v: END_SEAT[1], z: FL + 11, own: "turnL", shared: "turnL", sit: true },
      tea: { u: CAFE_CHAIR[0], v: CAFE_CHAIR[1], z: 11, own: "tea", shared: "type", prop: "cup", sit: true },
      door: { u: 230, v: 150, z: 0, own: "wave", shared: "idle" },
      sleep: { ...window.ROOM_PAINTER.sleepPlace(SLEEP_SURFACE), cu: 144, own: "sleep", shared: "sleep", lie: true }
    };
    function parts(station, walking) {
      const asleep = station === "sleep", L = [];
      const add = (draw2, fp, front) => L.push({ draw: draw2, fp, front });
      const contact = (...names) => !walking && names.includes(station) ? false : void 0;
      const chair = (u, v, back, z, R, own) => {
        const fp = [u - 5, v - 5, u + 5, v + 5], inner = back === "u-" || back === "v-";
        const backFp = back[0] === "u" ? [back[1] === "-" ? u - 5 : u + 5, v - 5, back[1] === "-" ? u - 5 : u + 5, v + 5] : [u - 5, back[1] === "-" ? v - 5 : v + 5, u + 5, back[1] === "-" ? v - 5 : v + 5];
        const seat = () => add((c) => shell(c, u, v, back, z, "cushion", R), fp, own ? contact(own) : void 0);
        const rear = () => add((c) => shell(c, u, v, back, z, "back", R), backFp, !inner && own && !walking && station === own ? true : void 0);
        add((c) => shell(c, u, v, back, z, "base", R), fp, own ? contact(own) : void 0);
        if (inner) {
          rear();
          seat();
        } else {
          seat();
          rear();
        }
      };
      add(backdrop);
      add(island);
      add(path);
      add(platform);
      add(sunlight);
      add(rug);
      add(walls);
      add(fig, [FIG[0] - 5, FIG[1] - 5, FIG[0] + 5, FIG[1] + 5]);
      add(library, [LIB_U[0], LIB[0], LIB_U[1], LIB[1]]);
      add(board2, [BOARD[0], BV - 5, BOARD[1], BV + 1]);
      add((c) => phoneTable(c, station === "phone"), [PHONE[0] - 8, PHONE[1] - 8, PHONE[0] + 8, PHONE[1] + 8]);
      add((c) => desk(c, "base"), [DESK[0], DESK[1], DESK[0] + DESK[2], DESK[1] + DESK[3]]);
      add((c) => desk(c, "top"), [DESK[0], DESK[1], DESK[0] + DESK[2], DESK[1] + DESK[3]]);
      add((c) => desk(c, "screens"), [DESK[0], MON_V - 5, DESK[0] + DESK[2] + 7, DESK[1] + 15]);
      add(chairBase, [SEAT[0] - 6, SEAT[1] - 6, SEAT[0] + 6, SEAT[1] + 6], contact("code", "work"));
      add(chairBack, [SEAT[0] - 7, SEAT[1] + 6, SEAT[0] + 7, SEAT[1] + 6], !walking && ["code", "work"].includes(station) ? true : void 0);
      add((c) => tray(c, station === "handoff"), [TRAY[0] - 10, TRAY[1] - 10, TRAY[0] + 10, TRAY[1] + 10]);
      add(floorLamp, [LAMP[0] - 4, LAMP[1] - 4, LAMP[0] + 4, LAMP[1] + 4]);
      add(meetingScreen, [SCREEN.u - 4, SCREEN.v0, SCREEN.u + 5, SCREEN.v0 + 46]);
      BACK_CHAIRS.forEach(([u, v]) => chair(u, v, "v-", FL));
      const tableFp = [MEET[0] - MEET[2], MEET[1] - MEET[3], MEET[0] + MEET[2], MEET[1] + MEET[3]];
      add((c) => table(c, "base"), tableFp);
      add((c) => table(c, "top"), tableFp);
      FRONT_CHAIRS.forEach(([u, v]) => chair(u, v, "v+", FL));
      chair(...END_SEAT, "u+", FL, void 0, "meeting");
      add((c) => sofa(c, "shadow"));
      add((c) => sofa(c, "arm"), [112, 112, 120, 136]);
      add((c) => sofa(c, "back"), [120, 112, 168, 120]);
      add((c) => sofa(c, "seat"), [120, 120, 168, 136], contact("sleep"));
      add((c) => sofa(c, "pillow"), [121, 121, 131, 126], contact("sleep"));
      add((c) => sofa(c, "feet"), [112, 112, 168, 136], contact("sleep"));
      if (!asleep) add(throwBlanket, [152, 122, 166, 134]);
      add(sofaFront, [168, 112, 176, 136], !walking && asleep ? true : void 0);
      add(arcLamp, [ARC_HEAD[0] - 6, ARC_HEAD[1] - 4, ARC_BASE[0] + 3, ARC_BASE[1] + 3]);
      add((c) => tree(c, ...BIG_TREE), [BIG_TREE[0] - 3, BIG_TREE[1] - 3, BIG_TREE[0] + 3, BIG_TREE[1] + 3]);
      chair(...CAFE_CHAIR2, "v-", 0, C.BLACK);
      add(cafeTable, [CAFE[0] - 10, CAFE[1] - 10, CAFE[0] + 10, CAFE[1] + 10]);
      chair(...CAFE_CHAIR, "u-", 0, C.BLACK, "tea");
      add((c) => tree(c, ...SIDE_TREE), [SIDE_TREE[0] - 3, SIDE_TREE[1] - 3, SIDE_TREE[0] + 3, SIDE_TREE[1] + 3]);
      add(frontTrees, [0, 164, IU1, IV1]);
      return L;
    }
    function slotFor(station, u, v) {
      return window.ROOM_PAINTER.maskFor(parts(station, true), u, v);
    }
    const tuckedSprites = /* @__PURE__ */ new WeakMap();
    function tucked(s, K) {
      const w = s.w * K;
      const h = s.h * K;
      const source = sprite(s);
      const cached = tuckedSprites.get(source);
      if (cached && cached.width === w && cached.height === h) return cached;
      const image = mk(w, h, (c) => {
        c.drawImage(source, 0, 0, w, h);
        if (s.rows.some((r) => /[qQ]/.test(r))) return;
        const d = c.getImageData(0, 0, w, h).data;
        const x0 = Math.round(w * 0.4);
        const cloth = mix(C.OAK.l, C.WHITE.l, 0.45);
        const hem = mix(C.OAK.m, C.WHITE.m, 0.3);
        for (let x = x0; x < w; x++) {
          let top = -1;
          for (let y = 0; y < h; y++)
            if (d[(y * w + x) * 4 + 3] > 0) {
              top = y;
              break;
            }
          if (top < 0) continue;
          const t = Math.max(0, top - 1);
          P(c, cloth, x, t, 1, h - t);
          P(c, hem, x, t, 1, 1);
        }
        for (let x = x0; x < x0 + 3; x++) {
          let top = -1;
          for (let y = 0; y < h; y++)
            if (d[(y * w + x) * 4 + 3] > 0) {
              top = y;
              break;
            }
          if (top >= 0) P(c, x === x0 ? hem : C.WHITE.l, x, Math.max(0, top - 1), 1, h - top + 1);
        }
      });
      tuckedSprites.set(source, image);
      return image;
    }
    function drawOri(ctx, place, pose) {
      if (place.lie && CHAR.sleepSurface) {
        const s = CHAR.poses[pose] || CHAR.poses.sleep;
        window.ROOM_PAINTER.sleeper(ctx, sprite(s), S, SLEEP_SURFACE, place);
        return null;
      }
      if (place.lie) {
        const s = CHAR.poses[pose] || CHAR.poses.sleep;
        const K = CHAR.k || ACTOR_K;
        const big = tucked(s, K);
        const u = place.cu !== void 0 ? Math.round(place.cu - big.width / 2) : place.u;
        onV(ctx, big, u, place.v, place.z + big.height - 4);
        return null;
      }
      let o;
      if (CHAR.poses[pose]) o = actorAt(ctx, pose, place.u, place.v, place.z, place.stand);
      else {
        o = actorAt(ctx, place.shared || "idle", place.u, place.v, place.z, place.stand);
        if (place.prop) holding(ctx, o, place.prop);
      }
      if (place.glow && !C.n) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.07;
        P(ctx, "#cfe8ff", o.left + 6, o.top + 18, o.w - 12, 12);
        ctx.restore();
      }
      return o;
    }
    let ST = "code";
    function scene2(ctx, station) {
      const place = PLACES[station] || PLACES.code, { back, front } = layers(station);
      ctx.drawImage(back, 0, 0);
      drawOri(ctx, place, POSE_OVERRIDE || place.own);
      ctx.drawImage(front, 0, 0);
    }
    function layers(station, slot2) {
      ST = station;
      const L = parts(station, slot2 !== void 0), place = PLACES[station] || PLACES.code;
      const mask = slot2 === void 0 ? window.ROOM_PAINTER.maskFor(L, place.u, place.v) : slot2;
      const result = window.ROOM_PAINTER.layers(L, mask, mk), front = result.front.getContext("2d");
      if (slot2 === void 0 && station === "sleep") {
        const [x, y] = S(SOFA[0] + 12, SOFA[1] + 14, FL + 52);
        X.zzz(front, Math.round(x), Math.round(y), C.n ? "#e8dcc4" : C.BLACK.m);
      }
      weatherOut(front);
      return result;
    }
    const NODES = {
      hub: [112, 78],
      walk: [116, 80],
      west: [28, 84],
      library: [30, 46],
      board: [38, 14],
      // Floor arrivals stay beside the seats; PLACES retains the seated anchors.
      codeWay: [137, 78],
      code: [137, SEAT[1]],
      east: [196, 80],
      eastBack: [204, 36],
      glassEnd: [202, 10],
      phone: [184, 8],
      handoff: [184, 44],
      meetWay: [98, 104],
      meeting: [END_SEAT[0], 104],
      bedWay: [104, 144],
      // Approach on the floor in front of the daybed, then settle on it.
      sleep: [144, 144],
      exit: [202, 106],
      step: [210, 106],
      lawn: [222, 112],
      teaWay: [208, 80],
      tea: [CAFE_CHAIR[0], 80],
      pathMid: [232, 132],
      door: [230, 150]
    };
    const EDGES = [
      ["hub", "walk"],
      ["hub", "west"],
      ["west", "library"],
      ["library", "board"],
      ["hub", "codeWay"],
      ["codeWay", "code"],
      ["hub", "east"],
      ["east", "eastBack"],
      ["eastBack", "glassEnd"],
      ["glassEnd", "phone"],
      ["eastBack", "handoff"],
      ["hub", "meetWay"],
      ["meetWay", "meeting"],
      ["meetWay", "bedWay"],
      ["bedWay", "sleep"],
      ["east", "exit"],
      ["exit", "step"],
      ["step", "lawn"],
      ["lawn", "teaWay"],
      ["teaWay", "tea"],
      ["lawn", "pathMid"],
      ["pathMid", "door"]
    ];
    const floorAt = (u, v) => u >= 0 && v >= 0 && u <= PU && v <= PV ? FL : 0;
    const SPRITES = /* @__PURE__ */ new WeakMap();
    function sprite(s) {
      let byPal = SPRITES.get(s);
      if (!byPal) SPRITES.set(s, byPal = /* @__PURE__ */ new WeakMap());
      let img = byPal.get(C.actor);
      if (!img) byPal.set(C.actor, img = mk(s.w, s.h, (c) => PX.paint(c, s, C.actor, 0, 0)));
      return img;
    }
    function drawOverlay(ctx, station = ST) {
      if (station === "handoff") {
        const [x, y] = S(TRAY[0], TRAY[1], FL + 21);
        glow(ctx, x, y, 24, "#ffa060", 0.25);
      }
      if (C.n) nightLights(ctx);
    }
    function nightLights(ctx) {
      [[MONS[0], LINKS.slack], [MONS[1], LINKS.claude]].forEach(([u0, ok]) => {
        const [x, y] = S(u0 + MON_W / 2, MON_V, MON_Z + MON_H / 2);
        glow(ctx, x, y, ok ? 34 : 30, ok ? "#b8d8ff" : "#ff7a40", ok ? 0.16 : 0.24);
      });
      const lit = [
        [[0, 0, FL], [PU, 0, FL], [PU, PV, FL], [0, PV, FL]],
        [[0, 0, FL], [PU, 0, FL], [PU, 0, H], [0, 0, H]],
        [[0, 0, FL], [0, PV, FL], [0, PV, H], [0, 0, H]]
      ].map((poly) => poly.map((p) => S(p[0], p[1], p[2])));
      const lamps = [
        [ARC_HEAD, 90, 0.32],
        [[LAMP[0], LAMP[1], FL + 84], 80, 0.26],
        [[DESK[0] + DESK[2] + 1, DESK[1] + 4, DZ + 18], 64, 0.24],
        [[MEET[0], MEET[1], MZ + 14], 90, 0.26]
      ];
      clipTo(ctx, lit, () => {
        lamps.forEach(([[u, v, z], r, a]) => {
          const [x, y] = S(u, v, z);
          glow(ctx, x, y, r, "#ffb868", a);
        });
      });
      lamps.forEach(([[u, v, z]]) => {
        const [x, y] = S(u, v, z);
        glow(ctx, x, y, 12, "#fff0c8", 0.35);
      });
    }
    function draw(ctx, m) {
      const t = m.t || "day";
      const station = m.station || (t === "night" ? "sleep" : "code");
      CHAR = m.char || { poses: ACTOR.sprout, pal: X.ORIPAL.sprout };
      POSE_OVERRIDE = m.pose || null;
      LINKS = linksOf(m.links);
      C = palette(t, m.weather || "clear");
      const room = mk(480, 560, (c) => {
        scene2(c, station);
        drawOverlay(c, station);
      });
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(room, 0, 0, 960, 1120);
    }
    CONCEPTS.push({
      key: "park-court",
      zh: "Apple Park",
      name: "Apple Park",
      actor: "sprout",
      actorPal: X.ORIPAL.sprout,
      stations: STATIONS,
      angle: "\u8349\u5730\u4E0A\u4E00\u5757\u6D45\u8272\u77F3\u53F0\uFF0C\u540E\u9762\u4E24\u9762\u73BB\u7483\u5899\uFF0C\u900F\u8FC7\u73BB\u7483\u770B\u5F97\u89C1\u5929\u7A7A\u548C\u6811\uFF0C\u5934\u9876\u5C31\u662F\u5929\u7A7A\uFF1B\u91CC\u9762\u6446\u7684\u662F\u73B0\u4EE3\u8BBE\u8BA1\u5DE5\u4F5C\u5BA4\u7684\u5BB6\u5177\u3002",
      why: "\u50CF\u5728\u52A0\u5DDE\u9633\u5149\u4E0B\u7684\u56ED\u533A\u9662\u5B50\u91CC\u529E\u516C\uFF1A\u4E24\u9762\u6DE1\u84DD\u7070\u7684\u73BB\u7483\uFF0C\u5706\u89D2\u7684\u684C\u5B50\u3001\u7EC6\u9ED1\u817F\u7684\u6905\u5B50\u3001\u9F20\u5C3E\u8349\u7EFF\u7684\u5E03\u6C99\u53D1\uFF0C\u65C1\u8FB9\u5C31\u662F\u8349\u5730\u548C\u5706\u5706\u7684\u6811\u3002\u989C\u8272\u53EA\u6709\u767D\u3001\u6D45\u77F3\u3001\u73BB\u7483\u7070\u84DD\u3001\u9ED1\u7EC6\u7EBF\u548C\u7EFF\uFF0C\u53EA\u6709\u9700\u8981\u4F60\u7684\u4E1C\u897F\u662F\u6A59\u8272\uFF1A\u7B49\u4F60\u786E\u8BA4\u7684\u6258\u76D8\u3001\u5F00\u4F1A\u65F6\u7684\u5F55\u5236\u706F\u3001Ori \u5934\u4E0A\u7684\u300C!\u300D\u3002",
      map: "\u540E\u89D2 = \u767D\u76C6\u7434\u53F6\u6995\uFF1B\u5DE6\u73BB\u7483\u524D\u4E00\u6392\u9ED1\u8272\u7EC6\u94A2\u6846\u5F00\u653E\u4E66\u67B6\uFF08\u4E2A\u4EBA\u56FE\u4E66\u9986\uFF09\uFF1B\u53F3\u73BB\u7483\u524D\u7EC6\u817F\u767D\u677F\uFF0C\u4FBF\u7B7E\u5206\u300CTo Do / \u8FDB\u884C\u4E2D / \u5B8C\u6210\u300D\u4E09\u5217\uFF08\u4EFB\u52A1\u677F\uFF09\u3002\u4E2D\u540E = \u4E00\u5F20\u5E73\u884C\u4E8E\u53F3\u73BB\u7483\u7684\u957F\u4E66\u684C\uFF0C\u684C\u5B50\u4E2D\u95F4\u4E24\u5757\u663E\u793A\u5668\u5E76\u6392\u3001\u548C\u684C\u5B50\u5E73\u884C\uFF0C\u5C4F\u5E55\u671D\u5916\uFF08\u5DE6\u8FB9\u804A\u5929\u3001\u53F3\u8FB9\u4EE3\u7801\uFF09\uFF1BOri \u5750\u5728\u684C\u524D\u7684\u7F51\u6905\u4E0A\uFF0C\u8F6C\u8EAB\u6B63\u5BF9\u7740\u4E24\u5757\u5C4F\uFF1B\u684C\u5B50\u53F3\u7AEF\u4E24\u5F20\u5706\u8FB9\u51E0\uFF0C\u4E00\u5F20\u653E\u65E0\u7EF3\u7535\u8BDD\uFF0C\u4E00\u5F20\u653E\u6A59\u8272\u6258\u76D8\uFF08\u7B49\u4F60\u786E\u8BA4\uFF09\u3002\u5DE6\u524D = \u8DD1\u9053\u5F62\u767D\u8272\u4F1A\u8BAE\u684C\u548C\u4E00\u5708\u9F20\u5C3E\u8349\u7EFF\u58F3\u6905\uFF0C\u901A\u8BDD\u5927\u5C4F\uFF08\u6709\u5F55\u5236\u706F\uFF09\u7ACB\u5728\u5DE6\u73BB\u7483\u524D\u7684\u7EC6\u652F\u67B6\u4E0A\uFF0C\u684C\u4E0A\u4E00\u76CF\u7403\u5F62\u706F\uFF1B\u4E66\u67B6\u8FB9\u4E00\u76CF\u7EC6\u9AD8\u843D\u5730\u706F\u3002\u524D\u4E2D = \u5706\u5730\u6BEF\u4E0A\u7684\u9F20\u5C3E\u8349\u7EFF\u5706\u89D2\u6C99\u53D1\u548C\u5F27\u5F62\u843D\u5730\u706F\uFF08\u591C\u91CC Agent \u76D6\u7740\u6BEF\u5B50\u7761\u5728\u8FD9\uFF09\u3002\u8349\u5730\u4E0A = \u5927\u5706\u6811\u4E0B\u7684\u5496\u5561\u684C\u548C\u4E24\u628A\u9ED1\u8272\u58F3\u6905\uFF08Ori \u559D\u8336\u7684\u5730\u65B9\uFF09\u3001\u5F2F\u5F2F\u7684\u5C0F\u8DEF\uFF08Ori \u8FDB\u51FA\uFF09\u3001\u51E0\u68F5\u5C0F\u5706\u6811\u3002",
      cost: "\u821E\u53F0\u6539\u6210\u659C\u4E0A\u65B9\u770B\u7684\u9732\u5929\u77F3\u53F0\uFF0C\u4E24\u9762\u73BB\u7483\u5899\uFF0C\u7AD9\u70B9\u6309\u8FD9\u5757\u53F0\u5B50\u91CD\u6392\uFF1B\u5BB6\u5177\u5168\u90E8\u6362\u6210\u73B0\u4EE3\u6B3E\uFF1BOri \u5199\u4EE3\u7801\u65F6\u5750\u5728\u684C\u524D\u8F6C\u8EAB\u6B63\u5BF9\u7740\u5C4F\u5E55\uFF08\u4FA7\u540E\u80CC\u5F71\uFF09\uFF0C\u5F00\u4F1A\u65F6\u5750\u5728\u4F1A\u8BAE\u684C\u4E00\u5934\uFF0C\u8F6C\u8EAB\u6B63\u5BF9\u7740\u901A\u8BDD\u5C4F\uFF0C\u7761\u89C9\u8EBA\u5728\u6C99\u53D1\u4E0A\u76D6\u6BEF\u5B50\u3002",
      draw,
      detail: [0, 120, 480, 420]
    });
    const PALETTES = /* @__PURE__ */ new Map();
    function use(t, weather, char, links) {
      CHAR = char;
      LINKS = linksOf(links);
      POSE_OVERRIDE = null;
      let byChar = PALETTES.get(char);
      if (!byChar) PALETTES.set(char, byChar = /* @__PURE__ */ new Map());
      const key = t + "|" + weather;
      if (!byChar.has(key)) byChar.set(key, palette(t, weather));
      C = byChar.get(key);
    }
    const SPOTS = {
      tasks: [BOARD[0], BV - 5, FL, BOARD[1], BV + 1, BZ[1]],
      library: [LIB_U[0], LIB[0], FL, LIB_U[1], LIB[1], LIB_LEVELS[4] + 2],
      meeting: [0, SCREEN.v0, FL, MEET[0] + MEET[2] + 12, MEET[1] + MEET[3] + 8, SCREEN.z0 + 28],
      handoff: [TRAY[0] - 10, TRAY[1] - 10, FL, TRAY[0] + 10, TRAY[1] + 10, FL + 22],
      phone: [PHONE[0] - 8, PHONE[1] - 8, FL, PHONE[0] + 8, PHONE[1] + 8, FL + 40],
      desk: SCREENS.deskBox(FIXTURES.desk)
    };
    window.PARK_COURT = { STATIONS, PLACES, NODES, EDGES, SPOTS, FIXTURES, floorAt, project: S, use, slotFor, layers, drawOri, drawOverlay };
    window.OFFICE_ROOMS = window.OFFICE_ROOMS || [];
    window.OFFICE_ROOMS.push({ key: "court", zh: "Apple Park", name: "Apple Park", room: window.PARK_COURT });
  })();
  (function() {
    "use strict";
    const { P, ell, ramp, mix, glow } = CP;
    const X = CX;
    const SCREENS = window.OFFICE_SCREENS;
    const CONTRACT = window.ROOM_CONTRACT;
    const OX = 232;
    const OY = 238;
    const RU = 220;
    const RV = 168;
    const FL = 6;
    const H = 140;
    const S = (u, v, z) => [OX + u - v, OY + (u + v) / 2 - (z || 0)];
    const q = (ctx, pts, color) => X.poly(ctx, pts.map((p) => S(p[0], p[1], p[2])), color);
    function qa(ctx, pts, color, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      q(ctx, pts, color);
      ctx.restore();
    }
    function seg(ctx, a, b, color) {
      const [ax, ay] = S(...a);
      const [bx, by] = S(...b);
      const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
      ctx.fillStyle = color;
      for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(ax + (bx - ax) * i / n), Math.floor(ay + (by - ay) * i / n + 1e-6), 1, 1);
    }
    function box(ctx, u, v, z, du, dv, dz, R, opts) {
      const o = opts || {};
      const top = z + dz;
      if (dz > 0) {
        q(ctx, [[u, v + dv, z], [u + du, v + dv, z], [u + du, v + dv, top], [u, v + dv, top]], o.fv || R.m);
        q(ctx, [[u + du, v, z], [u + du, v + dv, z], [u + du, v + dv, top], [u + du, v, top]], o.fu || R.d);
      }
      q(ctx, [[u, v, top], [u + du, v, top], [u + du, v + dv, top], [u, v + dv, top]], o.top || R.l);
      if (o.edge !== false) {
        seg(ctx, [u, v + dv, top], [u + du, v + dv, top], o.hc || R.h);
        seg(ctx, [u + du, v, top], [u + du, v + dv, top], o.hc || R.h);
      }
    }
    const bounds = (u, v, du, dv) => [u, v, u + du, v + dv];
    function slab(ctx, b, z, height, R, opts) {
      box(ctx, b[0], b[1], z, b[2] - b[0], b[3] - b[1], height, R, opts);
    }
    function shadow(ctx, b, alpha) {
      qa(ctx, [[b[0], b[1], FL], [b[2] + 2, b[1], FL], [b[2] + 2, b[3] + 2, FL], [b[0], b[3] + 2, FL]], "#322b21", alpha || 0.1);
    }
    function mk(w, h, paint) {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      paint(ctx, w, h);
      return canvas;
    }
    function onV(ctx, image, u, v, top) {
      const [x, y] = S(u, v, top);
      for (let i = 0; i < image.width; i++) ctx.drawImage(image, i, 0, 1, image.height, x + i, y + Math.ceil(i / 2), 1, image.height);
    }
    function onU(ctx, image, u, v, top) {
      const [x, y] = S(u, v + image.width, top);
      for (let i = 0; i < image.width; i++) ctx.drawImage(image, i, 0, 1, image.height, x + i, y - Math.ceil(i / 2), 1, image.height);
    }
    function onFloor(ctx, image, u0, v0, z) {
      const w = image.width;
      const h = image.height;
      const corners = [S(u0, v0, z), S(u0 + w, v0, z), S(u0 + w, v0 + h, z), S(u0, v0 + h, z)];
      const x0 = Math.floor(Math.min(...corners.map((p) => p[0])));
      const y0 = Math.floor(Math.min(...corners.map((p) => p[1])));
      const width = Math.ceil(Math.max(...corners.map((p) => p[0]))) - x0;
      const height = Math.ceil(Math.max(...corners.map((p) => p[1]))) - y0;
      const source = image.getContext("2d").getImageData(0, 0, w, h).data;
      const target = ctx.getImageData(x0, y0, width, height);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const xx = x0 + x + 0.5 - OX;
        const yy = y0 + y + 0.5 - OY + z;
        const u = (xx + 2 * yy) / 2 - u0;
        const v = (2 * yy - xx) / 2 - v0;
        if (u < 0 || v < 0 || u >= w || v >= h) continue;
        const si = (Math.floor(v) * w + Math.floor(u)) * 4;
        const a = source[si + 3] / 255;
        if (!a) continue;
        const di = (y * width + x) * 4;
        const da = target.data[di + 3] / 255;
        const outA = a + da * (1 - a);
        for (let i = 0; i < 3; i++) target.data[di + i] = (source[si + i] * a + target.data[di + i] * da * (1 - a)) / outA;
        target.data[di + 3] = outA * 255;
      }
      ctx.putImageData(target, x0, y0);
    }
    function circle(u, v, r) {
      return Array.from({ length: 20 }, (_, i) => {
        const a = i * Math.PI / 10;
        return [u + Math.cos(a) * r, v + Math.sin(a) * r];
      });
    }
    function prism(ctx, pts, z, height, R) {
      const cu = pts.reduce((n, p) => n + p[0], 0) / pts.length;
      const cv = pts.reduce((n, p) => n + p[1], 0) / pts.length;
      pts.forEach((a, i) => {
        const b = pts[(i + 1) % pts.length];
        let nu = b[1] - a[1];
        let nv = a[0] - b[0];
        if (nu * ((a[0] + b[0]) / 2 - cu) + nv * ((a[1] + b[1]) / 2 - cv) < 0) {
          nu = -nu;
          nv = -nv;
        }
        if (height > 0 && nu + nv > 0) q(ctx, [[a[0], a[1], z], [b[0], b[1], z], [b[0], b[1], z + height], [a[0], a[1], z + height]], nu > nv ? R.d : R.m);
      });
      q(ctx, pts.map(([u, v]) => [u, v, z + height]), R.l);
    }
    function cyl(ctx, u, v, z, radius, height, R, topColor) {
      const [x, y] = S(u, v, z);
      const rx = Math.max(1, Math.round(radius * 1.4));
      const ry = Math.max(1, Math.round(rx / 2));
      for (let i = -rx; i <= rx; i++) {
        const edge = Math.round(ry * Math.sqrt(Math.max(0, 1 - i * i / (rx * rx + 0.3))));
        P(ctx, i < -rx / 3 ? R.l : i < rx / 3 ? R.m : R.d, x + i, y - height, 1, height + edge);
      }
      ell(ctx, x, y - height, rx, ry, topColor || R.l);
    }
    const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
    function mul(a, b) {
      if (!/^#[0-9a-f]{6}$/i.test(a)) return a;
      const A = hex(a);
      const B = hex(b);
      return "#" + A.map((n, i) => Math.round(n * B[i] / 255).toString(16).padStart(2, "0")).join("");
    }
    let C;
    let CHAR;
    let ST = "code";
    let LINKS = { claude: true, slack: true };
    function palette(t, weather) {
      const n = t === "night";
      const golden = t === "golden";
      const k = n ? "#92959e" : golden ? "#ffe7c6" : "#ffffff";
      const tone = (color) => ramp(mul(color, k));
      const actor = {};
      Object.entries(CHAR.pal).forEach(([key, color]) => actor[key] = n ? mul(color, "#d0c5b4") : golden ? mul(color, "#fff0db") : color);
      return {
        n,
        golden,
        weather,
        bg: n ? "#252a35" : golden ? "#f0ddbf" : "#efe8da",
        FLOOR: tone("#e5ddc9"),
        WALL: tone("#f0e6ce"),
        WOOD: tone("#a96b3d"),
        CANE: tone("#c89c62"),
        STONE: tone("#858782"),
        DARK: tone("#333a3c"),
        PAPER: tone("#f6f1de"),
        SAGE: tone("#a9b78b"),
        RUG: tone("#d6c09a"),
        WATER: ramp(n ? "#427170" : golden ? "#77aaa0" : "#84beb0"),
        LEAF: ramp(n ? "#425d55" : golden ? "#76904d" : "#739c4a"),
        DEEP: ramp(n ? "#2a4240" : "#427654"),
        ACC: tone("#e66a30"),
        actor
      };
    }
    const POOLS = [bounds(-18, 78, 18, 42), bounds(-18, 144, 18, 44), bounds(0, RV, 82, 20), bounds(108, RV, RU - 108, 20)];
    const ENTRY_BRIDGE = bounds(82, RV, 26, 26);
    const GATE_BRIDGE = bounds(-22, 120, 27, 24);
    const DESK = bounds(87, 26, 106, 22);
    const DZ = FL + 25;
    const LIB = bounds(8, 2, 58, 14);
    const BOARD = bounds(4, 35, 7, 48);
    const PHONE = bounds(198, 25, 18, 20);
    const MEET = bounds(26, 99, 50, 27);
    const MZ = FL + 22;
    const BED = bounds(140, 117, 78, 44);
    const TEA = { u: 117, v: 143, r: 9, bounds: bounds(108, 134, 18, 18) };
    const TEA_SEAT = [98, 143];
    const TRAY = bounds(62, 154, 16, 12);
    const POTS = [
      { u: 77, v: 8, r: 5, h: 38, bounds: bounds(72, 3, 10, 10) },
      { u: 8, v: 89, r: 5, h: 34, bounds: bounds(3, 84, 10, 10) },
      { u: 212, v: 81, r: 5, h: 38, bounds: bounds(207, 76, 10, 10) }
    ];
    const FIXTURES = {
      desk: { facing: "+v", u: (DESK[0] + DESK[2]) / 2, v: DESK[1] + 5, z: DZ + 4, seat: [(DESK[0] + DESK[2]) / 2, 62], keyboard: [(DESK[0] + DESK[2]) / 2 - 13, DESK[3] - 6, DZ, 26, 5, 1] },
      meeting: { facing: "+u", u: 7, v: (MEET[1] + MEET[3]) / 2, z: FL + 34, seat: [92, (MEET[1] + MEET[3]) / 2] }
    };
    const SEAT = FIXTURES.desk.seat;
    const MSEAT = FIXTURES.meeting.seat;
    const GUEST = { u: 57, v: 141, f: [-0.87, -0.5] };
    const MEETING_CHAIR = { u: MSEAT[0], v: MSEAT[1], f: [-1, 0] };
    function rattanChairFoot(chair) {
      const corners = [[-8, -7], [8, -7], [8, 7], [-8, 7]].map(([side, forward]) => chairPoint(chair, side, forward, FL));
      return [Math.min(...corners.map((p) => p[0])), Math.min(...corners.map((p) => p[1])), Math.max(...corners.map((p) => p[0])), Math.max(...corners.map((p) => p[1]))];
    }
    const SEAT_FOOT = bounds(SEAT[0] - 10, SEAT[1] - 8, 20, 16);
    const MSEAT_FOOT = rattanChairFoot(MEETING_CHAIR);
    const GUEST_FOOT = rattanChairFoot(GUEST);
    const TEA_SEAT_FOOT = bounds(TEA_SEAT[0] - 6, TEA_SEAT[1] - 6, 12, 12);
    const OBSTACLES = [
      { key: "desk", bounds: DESK },
      { key: "library", bounds: LIB },
      { key: "task-board", bounds: BOARD },
      { key: "phone-cabinet", bounds: PHONE },
      { key: "meeting-table", bounds: MEET },
      { key: "tea-table", bounds: TEA.bounds },
      { key: "desk-chair", bounds: SEAT_FOOT, entryStops: ["code"] },
      { key: "meeting-chair", bounds: MSEAT_FOOT, entryStops: ["meeting"] },
      { key: "meeting-guest-chair", bounds: GUEST_FOOT },
      { key: "tea-stool", bounds: TEA_SEAT_FOOT, entryStops: ["tea"] },
      { key: "handoff-table", bounds: TRAY },
      { key: "daybed", bounds: BED, entryStops: ["sleep"] },
      ...POOLS.map((b, i) => ({ key: "water-" + i, bounds: b })),
      ...POTS.map((p, i) => ({ key: "plant-" + i, bounds: p.bounds }))
    ];
    function backdrop(ctx) {
      P(ctx, C.bg, 0, 0, 480, 560);
      for (let i = 0; i < 3; i++) qa(ctx, [[-21 - i * 4, -4, -33], [226, -4, -33], [226, 197 + i * 4, -33], [-21 - i * 4, 197 + i * 4, -33]], C.n ? "#11151f" : "#8c806b", 0.035);
    }
    function floor(ctx) {
      box(ctx, -20, -4, -13, RU + 24, RV + 26, 13, C.STONE, { top: C.STONE.m, edge: false });
      box(ctx, 0, 0, 0, RU, RV, FL, C.FLOOR, { edge: false });
      const joint = mix(C.FLOOR.m, C.FLOOR.l, 0.55);
      for (let u = 36; u < RU; u += 36) seg(ctx, [u, 0, FL], [u, RV, FL], joint);
      for (let v = 28; v < RV; v += 28) seg(ctx, [0, v, FL], [RU, v, FL], joint);
      slab(ctx, ENTRY_BRIDGE, 0, FL, C.STONE);
      slab(ctx, GATE_BRIDGE, 0, FL, C.STONE);
      box(ctx, ENTRY_BRIDGE[0], ENTRY_BRIDGE[3] - 4, -4, 26, 8, 4, C.STONE, { edge: false });
      [174, 182, 190].forEach((v) => seg(ctx, [82, v, FL], [108, v, FL], C.STONE.m));
      [126, 134, 142].forEach((v) => seg(ctx, [-22, v, FL], [4, v, FL], C.STONE.m));
    }
    function water(ctx) {
      POOLS.forEach((b, i) => {
        slab(ctx, b, -5, 4, C.WATER, { top: C.WATER.m, edge: false });
        box(ctx, b[0], b[1], -1, b[2] - b[0], 2, FL, C.STONE, { edge: false });
        box(ctx, b[0], b[1], -1, 2, b[3] - b[1], FL, C.STONE, { edge: false });
        box(ctx, b[0], b[3] - 2, -1, b[2] - b[0], 2, FL, C.STONE, { edge: false });
        const cu = (b[0] + b[2]) / 2;
        const cv = (b[1] + b[3]) / 2;
        const [x2, y2] = S(cu, cv, 0);
        ell(ctx, x2 - 3, y2, i < 2 ? 5 : 10, 2, C.WATER.l);
        ell(ctx, x2 + 3, y2 - 1, 4, 2, C.LEAF.m);
        P(ctx, C.WATER.m, x2 + 3, y2 - 1, 3, 1);
      });
      box(ctx, -16, 150, -1, 11, 8, 24, C.DARK);
      box(ctx, -12, 154, 16, 11, 3, 4, C.DARK, { top: C.DARK.l });
      const [x, y] = S(-1, 156, 17);
      P(ctx, C.WATER.l, x, y, 2, 17);
      P(ctx, C.PAPER.m, x, y, 1, 16);
      ell(ctx, x, y + 18, 6, 2, C.WATER.l);
    }
    function leafFan(ctx, u, v, z, height) {
      const [x, y] = S(u, v, z);
      const leaves = [[-0.4, -0.78, 0.26], [-0.17, -1.03, 0.24], [0.24, -0.91, 0.27], [0.51, -0.6, 0.3], [-0.52, -0.49, 0.3], [0.21, -0.4, 0.24]];
      seg(ctx, [u, v, z], [u + 1, v, z + height - 8], C.WOOD.d);
      leaves.forEach(([dx, dy, breadth], i) => {
        const start = [x, y - height * 0.25];
        const tip = [x + dx * height, y + dy * height];
        const lx = tip[0] - start[0];
        const ly = tip[1] - start[1];
        const length = Math.max(1, Math.hypot(lx, ly));
        const side = [-ly / length, lx / length];
        const at2 = (t, a) => [start[0] + lx * t + side[0] * a * breadth * height, start[1] + ly * t + side[1] * a * breadth * height];
        X.poly(ctx, [start, at2(0.3, 0.45), at2(0.65, 0.48), tip, at2(0.72, -0.3), at2(0.3, -0.32)], i % 2 ? C.LEAF.m : C.DEEP.m);
        X.poly(ctx, [start, at2(0.45, 0.22), tip, at2(0.5, 0)], i % 2 ? C.LEAF.l : C.LEAF.m);
      });
    }
    function garden(ctx) {
      [[-10, 25, 92], [-11, 65, 101], [-16, 107, 74], [-10, 171, 36]].forEach(([u, v, h]) => leafFan(ctx, u, v, 0, h));
    }
    function pot(ctx, p) {
      shadow(ctx, p.bounds);
      cyl(ctx, p.u, p.v, FL, p.r, 10, C.WALL, C.DARK.d);
      leafFan(ctx, p.u, p.v, FL + 10, p.h);
    }
    function carvedStrip(w) {
      return mk(w, 10, (ctx) => {
        P(ctx, C.WOOD.m, 0, 0, w, 10);
        P(ctx, C.WOOD.l, 0, 0, w, 1);
        P(ctx, C.WOOD.d, 0, 8, w, 2);
        for (let x = 3; x < w - 2; x += 9) {
          P(ctx, C.WOOD.d, x, 3, 5, 4);
          P(ctx, C.CANE.m, x + 2, 2, 2, 3);
          P(ctx, C.WOOD.l, x + 1, 6, 3, 1);
        }
      });
    }
    function walls(ctx) {
      q(ctx, [[0, 0, FL], [RU, 0, FL], [RU, 0, H - 10], [0, 0, H - 10]], C.WALL.m);
      box(ctx, 0, 0, FL, RU, 2, 4, C.WOOD, { edge: false });
      box(ctx, -1, 0, FL + 22, 3, RV - 3, 3, C.WOOD);
      for (let v = 7; v < RV - 5; v += 15) box(ctx, -1, v, FL + 3, 3, 2, 20, C.WOOD, { edge: false });
      box(ctx, -2, -3, H - 8, RU + 5, 6, 8, C.WOOD);
      box(ctx, -3, 0, H - 8, 6, RV, 8, C.WOOD);
      onV(ctx, carvedStrip(RU), 0, 3, H - 9);
      onU(ctx, carvedStrip(RV), 3, 0, H - 9);
      [[-3, -3], [RU - 4, -3], [-3, RV - 7]].forEach(([u, v]) => {
        box(ctx, u, v, FL, 7, 7, H - FL, C.WOOD);
        box(ctx, u - 1, v - 1, H, 9, 9, 3, C.WOOD);
      });
      const curtain = mk(24, 92, (c) => {
        P(c, C.PAPER.l, 1, 0, 22, 92);
        P(c, C.WALL.m, 6, 0, 3, 92);
        P(c, C.PAPER.h, 13, 0, 2, 92);
        P(c, C.WALL.d, 19, 0, 2, 92);
        P(c, C.CANE.d, 1, 60, 22, 3);
        c.clearRect(0, 63, 4, 29);
        c.clearRect(20, 63, 4, 29);
      });
      onU(ctx, curtain, 4, 9, H - 18);
    }
    function gate(ctx) {
      const u = -21;
      const v = 122;
      [v, v + 20].forEach((p) => {
        box(ctx, u - 2, p - 2, FL, 6, 5, 52, C.STONE);
        for (let i = 0; i < 4; i++) box(ctx, u - 3 - i, p - 3 + i, FL + 52 + i * 5, 8, 7 - i, 5, C.STONE, { edge: false });
      });
      box(ctx, u - 2, v, FL + 45, 6, 23, 6, C.STONE);
      const door = mk(16, 44, (c) => {
        P(c, C.WOOD.d, 0, 0, 16, 44);
        [2, 6, 10, 14].forEach((x) => P(c, C.WOOD.l, x, 1, 1, 42));
        P(c, C.CANE.l, 12, 23, 2, 2);
      });
      onU(ctx, door, u + 4, v + 2, FL + 44);
    }
    function sunlight(ctx) {
      if (C.n) return;
      for (let i = 0; i < 4; i++) {
        const v = 18 + i * 35;
        qa(ctx, [[3, v, FL], [3, v + 20, FL], [38, v + 31, FL], [38, v + 11, FL]], C.golden ? "#ffd391" : "#fff8dc", C.golden ? 0.26 : 0.18);
      }
    }
    function library(ctx) {
      shadow(ctx, LIB);
      slab(ctx, LIB, FL, 4, C.WOOD);
      box(ctx, LIB[0], LIB[1], FL, LIB[2] - LIB[0], 2, 94, C.WOOD, { edge: false });
      [LIB[0], LIB[2] - 3].forEach((u) => box(ctx, u, LIB[1], FL, 3, LIB[3] - LIB[1], 94, C.WOOD));
      for (let shelf = 0; shelf < 4; shelf++) {
        const z = FL + 4 + shelf * 22;
        box(ctx, LIB[0] + 2, LIB[1] + 2, z, LIB[2] - LIB[0] - 4, 12, 2, C.WOOD);
        let u = LIB[0] + 5;
        for (let i = 0; i < 11; i++) {
          const width = 3 + i % 2;
          const R = [C.PAPER, C.SAGE, C.CANE, C.DARK][(i + shelf) % 4];
          const height = 13 + (i * 3 + shelf) % 5;
          box(ctx, u, LIB[1] + 5, z + 2, width, 8, height, R, { edge: false });
          seg(ctx, [u + 1, LIB[3] - 1, z + 5], [u + width - 1, LIB[3] - 1, z + 5], R.h);
          u += width + 1;
        }
      }
      slab(ctx, LIB, FL + 92, 3, C.WOOD);
      cyl(ctx, 54, 9, FL + 95, 3, 6, C.PAPER);
      leafFan(ctx, 54, 9, FL + 101, 13);
    }
    function board2(ctx) {
      [BOARD[1] + 4, BOARD[3] - 4].forEach((v) => {
        box(ctx, BOARD[0], v - 1, FL, BOARD[2] - BOARD[0], 2, 2, C.WOOD);
        seg(ctx, [BOARD[0] + 3, v, FL + 2], [BOARD[0] + 3, v, FL + 40], C.WOOD.d);
      });
      const image = mk(BOARD[3] - BOARD[1], 52, (c, w, h) => {
        P(c, C.WOOD.d, 0, 0, w, h);
        P(c, C.PAPER.l, 2, 2, w - 4, h - 4);
        const columns = [C.CANE.l, ramp(mul("#a5c5ce", C.n ? "#a4a9b2" : "#ffffff")).l, C.SAGE.l];
        for (let k = 0; k < 3; k++) {
          const x = 4 + k * 14;
          if (k) P(c, C.FLOOR.m, x - 2, 6, 1, 41);
          P(c, columns[k], x, 6, 11, 3);
          for (let j = 0; j < 3 - (k === 2 ? 1 : 0); j++) {
            P(c, columns[k], x, 13 + j * 10, 10, 8);
            P(c, C.DARK.l, x + 2, 15 + j * 10, 5, 1);
          }
        }
      });
      onU(ctx, image, BOARD[2], BOARD[1], FL + 94);
    }
    const screenLook = () => ({ frame: C.DARK.o, off: C.DARK.d, accent: C.ACC.l, body: C.DARK });
    function deskStand(ctx, m) {
      box(ctx, m.cu - 4, m.v - 3, DZ, 8, 3, 1, C.DARK, { edge: false });
      seg(ctx, [m.cu, m.v - 1, DZ + 1], [m.cu, m.v - 1, m.z + 7], C.DARK.m);
    }
    function desk(ctx) {
      shadow(ctx, DESK);
      [[DESK[0] + 3, DESK[1] + 3], [DESK[2] - 6, DESK[1] + 3], [DESK[0] + 3, DESK[3] - 6], [DESK[2] - 6, DESK[3] - 6]].forEach(([u, v]) => box(ctx, u, v, FL, 3, 3, DZ - FL - 3, C.WOOD, { edge: false }));
      slab(ctx, DESK, DZ - 3, 3, C.WOOD);
      SCREENS.placeDesk(ctx, FIXTURES.desk, screenLook(), LINKS, { box, onV, stand: deskStand });
      const ku = FIXTURES.desk.u - 13;
      const kv = DESK[3] - 6;
      box(ctx, ...FIXTURES.desk.keyboard, C.DARK, { top: C.STONE.l, edge: false });
      for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) box(ctx, ku + 1 + i * 2.5, kv + row * 2, DZ + 1, 1.5, 1, 0, C.PAPER, { top: C.PAPER.m, edge: false });
      box(ctx, ku + 31, kv, DZ, 4, 6, 1, C.DARK, { top: C.DARK.l, edge: false });
      seg(ctx, [ku + 33, kv + 1, DZ + 2], [ku + 33, kv + 3, DZ + 2], C.PAPER.m);
      cyl(ctx, DESK[2] - 8, DESK[3] - 5, DZ, 2.5, 5, C.PAPER, C.WOOD.d);
      const [lx, ly] = S(DESK[2] - 7, DESK[1] + 5, DZ);
      ell(ctx, lx, ly, 5, 2, C.WOOD.m);
      P(ctx, C.WOOD.l, lx, ly - 14, 1, 14);
      P(ctx, C.CANE.m, lx - 6, ly - 23, 13, 9);
      P(ctx, C.n ? "#f1d3a3" : C.CANE.l, lx - 5, ly - 22, 11, 7);
      for (let i = -3; i <= 3; i += 3) P(ctx, C.CANE.m, lx + i, ly - 22, 1, 7);
    }
    function workChair(ctx, part) {
      const [u, v] = SEAT;
      if (part !== "back") {
        for (let k = 0; k < 5; k++) {
          const a = k * Math.PI * 2 / 5;
          seg(ctx, [u, v, FL + 3], [u + Math.cos(a) * 8, v + Math.sin(a) * 8, FL + 1], C.DARK.m);
        }
        seg(ctx, [u, v, FL + 2], [u, v, FL + 12], C.DARK.m);
        box(ctx, u - 9, v - 7, FL + 11, 18, 14, 3, C.SAGE);
      }
      if (part !== "seat") {
        box(ctx, u - 9, v + 6, FL + 13, 18, 2, 14, C.SAGE);
        for (let i = -5; i <= 5; i += 5) seg(ctx, [u + i, v + 8, FL + 15], [u + i, v + 8, FL + 25], C.SAGE.m);
      }
    }
    function phone(ctx, inUse) {
      shadow(ctx, PHONE);
      slab(ctx, PHONE, FL, 21, C.WOOD);
      const mid = (PHONE[0] + PHONE[2]) / 2;
      seg(ctx, [mid, PHONE[3], FL + 2], [mid, PHONE[3], FL + 20], C.WOOD.d);
      const u = PHONE[0] + 4;
      const v = PHONE[1] + 5;
      box(ctx, u, v, FL + 21, 10, 10, 4, C.DARK);
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) box(ctx, u + 3 + i * 2, v + 4 + j * 1.5, FL + 25, 1, 1, 0, C.PAPER, { edge: false });
      if (!inUse) {
        box(ctx, u - 1, v, FL + 26, 3, 12, 3, C.DARK);
        box(ctx, u - 1, v, FL + 26, 8, 3, 3, C.DARK);
        box(ctx, u - 1, v + 9, FL + 26, 8, 3, 3, C.DARK);
      }
    }
    function chairPoint(chair, side, forward, z) {
      const f = chair.f;
      return [chair.u - f[1] * side + f[0] * forward, chair.v + f[0] * side + f[1] * forward, z];
    }
    function rattanChair(ctx, chair, part) {
      const Z = FL + 12;
      const p = (side, forward, z) => chairPoint(chair, side, forward, z);
      if (part !== "back") {
        [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([a, b]) => seg(ctx, p(a, b, Z), p(a * 1.1, b * 1.1, FL), C.WOOD.d));
        prism(ctx, [p(-8, -7, 0), p(8, -7, 0), p(8, 7, 0), p(-8, 7, 0)].map(([u, v]) => [u, v]), Z - 2, 2, C.CANE);
        q(ctx, [p(-6, -5, Z + 1), p(6, -5, Z + 1), p(6, 6, Z + 1), p(-6, 6, Z + 1)], C.PAPER.l);
        [-8, 8].forEach((a) => {
          seg(ctx, p(a, -6, Z), p(a, -6, Z + 8), C.CANE.d);
          seg(ctx, p(a, -6, Z + 8), p(a, 5, Z + 8), C.CANE.l);
          seg(ctx, p(a, 5, Z + 8), p(a, 5, Z), C.CANE.m);
        });
      }
      if (part !== "seat") {
        q(ctx, [p(-6, -7, Z + 4), p(6, -7, Z + 4), p(6, -7, Z + 12), p(-6, -7, Z + 12)], C.SAGE.m);
        [-8, 8].forEach((a) => seg(ctx, p(a, -7, Z), p(a, -7, Z + 14), C.WOOD.m));
        seg(ctx, p(-8, -7, Z + 14), p(8, -7, Z + 14), C.CANE.l);
        seg(ctx, p(-8, -7, Z + 3), p(8, -7, Z + 3), C.CANE.m);
        [-4, 0, 4].forEach((a) => seg(ctx, p(a, -7, Z + 3), p(a, -7, Z + 13), C.CANE.m));
      }
    }
    function callStand(ctx, m) {
      [m.v0 + 4, m.v0 + m.w - 4].forEach((v) => {
        box(ctx, m.u - 4, v - 1, FL, 10, 2, 2, C.DARK, { edge: false });
        seg(ctx, [m.u, v, FL + 2], [m.u, v, m.z], C.DARK.m);
      });
    }
    function meetingScreen(ctx) {
      SCREENS.placeCall(ctx, FIXTURES.meeting, screenLook(), !C.n || ST === "meeting", { box, onU, stand: callStand });
    }
    function meeting(ctx) {
      shadow(ctx, MEET);
      [[MEET[0] + 3, MEET[1] + 3], [MEET[2] - 6, MEET[1] + 3], [MEET[0] + 3, MEET[3] - 6], [MEET[2] - 6, MEET[3] - 6]].forEach(([u, v]) => box(ctx, u, v, FL, 3, 3, MZ - FL - 3, C.WOOD, { edge: false }));
      slab(ctx, MEET, MZ - 3, 3, C.WOOD);
      cyl(ctx, 49, 109, MZ, 2.5, 5, C.PAPER);
      leafFan(ctx, 49, 109, MZ + 5, 12);
      box(ctx, 59, 115, MZ, 10, 7, 2, C.DARK, { fv: C.PAPER.m });
    }
    function meetingRug(ctx) {
      box(ctx, 21, 94, FL, 85, 58, 0, C.RUG, { edge: false });
      for (let v = 97; v < 150; v += 5) seg(ctx, [23, v, FL], [104, v, FL], C.RUG.m);
    }
    function handoff(ctx) {
      const z = FL + 17;
      shadow(ctx, TRAY);
      [[TRAY[0] + 2, TRAY[1] + 2], [TRAY[2] - 4, TRAY[1] + 2], [TRAY[0] + 2, TRAY[3] - 4], [TRAY[2] - 4, TRAY[3] - 4]].forEach(([u, v]) => box(ctx, u, v, FL, 2, 2, z - FL - 2, C.WOOD, { edge: false }));
      slab(ctx, TRAY, z - 2, 2, C.WOOD);
      box(ctx, TRAY[0] + 1, TRAY[1] + 1, z, 14, 10, 2, C.ACC, { top: C.ACC.d });
      box(ctx, TRAY[0] + 3, TRAY[1] + 3, z + 2, 9, 6, 2, C.PAPER);
      for (let i = 0; i < 3; i++) seg(ctx, [TRAY[0] + 4, TRAY[1] + 4 + i, z + 4], [TRAY[0] + 10, TRAY[1] + 4 + i, z + 4], C.PAPER.m);
      if (ST === "handoff") {
        const [x, y] = S(TRAY[0] + 8, TRAY[1] + 6, z + 3);
        glow(ctx, x, y, 21, "#ffae70", 0.22);
      }
    }
    function entryPost(ctx, u) {
      box(ctx, u, 164, FL, 4, 4, 29, C.WOOD);
      box(ctx, u - 1, 163, FL + 29, 6, 6, 3, C.WOOD);
    }
    function teaTable(ctx) {
      const { u, v, r } = TEA;
      const z = FL + 16;
      [[-5, -4], [5, -4], [0, 6]].forEach(([a, b]) => seg(ctx, [u + a, v + b, z], [u + a * 1.2, v + b * 1.2, FL], C.WOOD.m));
      prism(ctx, circle(u, v, r), z - 2, 2, C.WOOD);
      const pot2 = [u + 1, v - 1];
      cyl(ctx, pot2[0], pot2[1], z, 3.5, 6, C.WOOD);
      cyl(ctx, pot2[0], pot2[1], z + 6, 2, 1, C.CANE);
      cyl(ctx, pot2[0], pot2[1], z + 7, 0.8, 1, C.WOOD);
      q(ctx, [[pot2[0] + 2, pot2[1], z + 2], [pot2[0] + 8, pot2[1], z + 6], [pot2[0] + 8, pot2[1] - 1, z + 7], [pot2[0] + 2, pot2[1] - 1, z + 5]], C.WOOD.l);
      const [px, py] = S(pot2[0] - 5, pot2[1], z + 3);
      ell(ctx, px, py, 3, 4, C.WOOD.d);
      ell(ctx, px, py, 1, 2, C.WOOD.l);
      [[u - 5, v + 3], [u + 3, v + 5]].forEach(([a, b]) => {
        cyl(ctx, a, b, z, 2, 4, C.PAPER, C.WOOD.d);
        const [x, y] = S(a + 2, b, z + 2);
        P(ctx, C.PAPER.m, x, y - 1, 2, 3);
      });
    }
    function teaStool(ctx) {
      const [u, v] = TEA_SEAT;
      [[-4, -4], [4, -4], [-4, 4], [4, 4]].forEach(([a, b]) => seg(ctx, [u + a, v + b, FL], [u + a, v + b, FL + 8], C.WOOD.m));
      cyl(ctx, u, v, FL + 8, 6, 3, C.CANE);
    }
    function bed(ctx) {
      shadow(ctx, BED);
      [[BED[0] + 3, BED[1] + 3], [BED[2] - 5, BED[1] + 3], [BED[0] + 3, BED[3] - 5], [BED[2] - 5, BED[3] - 5]].forEach(([u, v]) => box(ctx, u, v, FL, 2, 2, 6, C.WOOD));
      slab(ctx, BED, FL + 5, 4, C.CANE);
      box(ctx, BED[0] + 3, BED[1] + 3, FL + 9, BED[2] - BED[0] - 6, BED[3] - BED[1] - 6, 4, C.PAPER);
      box(ctx, BED[0], BED[1], FL + 7, BED[2] - BED[0], 3, 12, C.CANE);
      for (let u = BED[0] + 5; u < BED[2]; u += 7) box(ctx, u, BED[1], FL + 10, 1, 3, 8, C.WOOD, { edge: false });
      box(ctx, BED[0] + 4, BED[1] + 7, FL + 13, 14, 19, 4, C.PAPER, { top: C.PAPER.h });
    }
    function bedFront(ctx) {
      box(ctx, BED[0], BED[3] - 3, FL + 7, BED[2] - BED[0], 3, 5, C.CANE);
      for (let u = BED[0] + 4; u < BED[2]; u += 7) seg(ctx, [u, BED[3], FL + 7], [u, BED[3], FL + 11], C.WOOD.d);
      box(ctx, BED[2] - 3, BED[1], FL + 7, 3, BED[3] - BED[1], 13, C.CANE);
    }
    function foldedBlanket(ctx) {
      box(ctx, BED[2] - 24, BED[1] + 5, FL + 13, 18, BED[3] - BED[1] - 10, 3, C.SAGE);
      seg(ctx, [BED[2] - 20, BED[1] + 5, FL + 17], [BED[2] - 20, BED[3] - 5, FL + 17], C.SAGE.l);
    }
    function lantern(ctx) {
      const u = 78;
      const v = 3;
      seg(ctx, [u, v, H - 9], [u, v, H - 29], C.DARK.m);
      cyl(ctx, u, v, H - 46, 6, 17, C.n ? ramp("#eac482") : C.CANE);
      const [x, y] = S(u, v, H - 46);
      for (let i = -4; i <= 4; i += 3) P(ctx, C.CANE.d, x + i, y - 15, 1, 13);
      P(ctx, C.n ? "#fff0bd" : C.PAPER.m, x - 4, y, 8, 1);
    }
    const SPRITES = /* @__PURE__ */ new WeakMap();
    function sprite(s) {
      let byPal = SPRITES.get(s);
      if (!byPal) SPRITES.set(s, byPal = /* @__PURE__ */ new WeakMap());
      let image = byPal.get(C.actor);
      if (!image) byPal.set(C.actor, image = mk(s.w, s.h, (ctx) => PX.paint(ctx, s, C.actor, 0, 0)));
      return image;
    }
    function poseSprite(pose) {
      if (pose === "turn") return CONTRACT.turnSprite(CHAR, false);
      if (pose === "turnL") return CONTRACT.turnSprite(CHAR, true);
      return CHAR.poses[pose] || CHAR.poses.idle;
    }
    function actorAt(ctx, pose, u, v, z) {
      const s = poseSprite(pose);
      const [x, y] = S(u, v, z);
      const k = CHAR.k || 2;
      const w = s.w * k;
      const h = s.h * k;
      const left = Math.round(x - w / 2);
      const top = Math.round(y) - h + 1;
      ctx.drawImage(sprite(s), left, top, w, h);
      return { left, top, w, h };
    }
    const STATIONS = CONTRACT.STATIONS;
    const PLACES = {
      code: { u: SEAT[0], v: SEAT[1], z: FL + 14, own: "turn", shared: "turn", sit: true },
      work: { u: SEAT[0], v: SEAT[1], z: FL + 14, own: "turn", shared: "turn", sit: true },
      meeting: { u: MSEAT[0], v: MSEAT[1], z: FL + 14, own: "turnL", shared: "turnL", sit: true },
      board: { u: 28, v: 58, z: FL, own: "post", shared: "back" },
      library: { u: 43, v: 31, z: FL, own: "read", shared: "back" },
      phone: { u: 201, v: 62, z: FL, own: "phone", shared: "idle" },
      handoff: { u: 85, v: 157, z: FL, own: "attention", shared: "idle", bang: true },
      tea: { u: TEA_SEAT[0], v: TEA_SEAT[1], z: FL + 11, own: "tea", shared: "type", sit: true },
      door: { u: 95, v: 185, z: FL, own: "wave", shared: "idle" },
      walk: { u: 118, v: 91, z: FL, own: "walkA", shared: "walkA" },
      sleep: { u: 179, cu: 179, v: 139, z: FL + 14, own: "sleep", shared: "sleep", lie: true }
    };
    const TUCKED = /* @__PURE__ */ new WeakMap();
    function tucked(s) {
      const source = sprite(s);
      let image = TUCKED.get(source);
      if (image) return image;
      const k = CHAR.k || 2;
      const w = s.w * k;
      const h = s.h * k;
      image = mk(w, h, (ctx) => {
        ctx.drawImage(source, 0, 0, w, h);
        if (s.rows.some((row) => /[qQ]/.test(row))) return;
        const pixels = ctx.getImageData(0, 0, w, h).data;
        for (let x = Math.round(w * 0.43); x < w; x++) {
          let top = -1;
          for (let y = 0; y < h; y++) if (pixels[(y * w + x) * 4 + 3]) {
            top = y;
            break;
          }
          if (top < 0) continue;
          P(ctx, C.SAGE.l, x, Math.max(0, top - 1), 1, h - top + 1);
          P(ctx, C.SAGE.m, x, Math.max(0, top - 1), 1, 1);
        }
      });
      TUCKED.set(source, image);
      return image;
    }
    function drawOri(ctx, place, pose) {
      if (place.lie) {
        const s = CHAR.poses[pose] || CHAR.poses.sleep;
        const image = tucked(s);
        window.ROOM_PAINTER.sleeper(ctx, image, S, { u: place.cu - image.width / 2, v: place.v - image.height / 2, z: place.z, w: image.width, d: image.height });
        return null;
      }
      const own = pose === "turn" || pose === "turnL" || CHAR.poses[pose];
      const at2 = actorAt(ctx, own ? pose : place.shared, place.u, place.v, place.z);
      if (place.bang && !CHAR.poses[pose]) {
        P(ctx, C.ACC.m, at2.left + at2.w / 2 - 2, at2.top - 14, 4, 8);
        P(ctx, C.ACC.m, at2.left + at2.w / 2 - 2, at2.top - 4, 4, 3);
      }
      return at2;
    }
    function steps(station, walking) {
      const L = [];
      const add = (draw2, fp) => L.push({ draw: draw2, fp });
      const actor = () => L.push({ actor: true });
      const at2 = (...names) => !walking && names.includes(station);
      const westPost = (ctx) => entryPost(ctx, 78);
      add(backdrop);
      add(floor);
      add(water);
      add(garden);
      add(walls);
      add(gate);
      add(sunlight);
      add(meetingRug);
      add(library, LIB);
      add(board2, BOARD);
      add(lantern);
      if (at2("board", "library")) actor();
      add((ctx) => pot(ctx, POTS[0]), POTS[0].bounds);
      add((ctx) => pot(ctx, POTS[1]), POTS[1].bounds);
      add(desk, DESK);
      add((ctx) => workChair(ctx, "seat"), SEAT_FOOT);
      if (at2("code", "work")) actor();
      add((ctx) => workChair(ctx, "back"), SEAT_FOOT);
      add((ctx) => phone(ctx, ST === "phone"), PHONE);
      if (at2("phone")) actor();
      add((ctx) => pot(ctx, POTS[2]), POTS[2].bounds);
      add(meetingScreen, [2, FIXTURES.meeting.v - SCREENS.CALL_W / 2, 13, FIXTURES.meeting.v + SCREENS.CALL_W / 2]);
      add(meeting, MEET);
      add((ctx) => rattanChair(ctx, GUEST), GUEST_FOOT);
      add((ctx) => rattanChair(ctx, MEETING_CHAIR, "seat"), MSEAT_FOOT);
      if (at2("meeting")) actor();
      add((ctx) => rattanChair(ctx, MEETING_CHAIR, "back"), MSEAT_FOOT);
      if (at2("walk")) actor();
      add(teaStool, TEA_SEAT_FOOT);
      if (at2("tea")) actor();
      add(teaTable, TEA.bounds);
      add(bed, BED);
      if (at2("sleep")) actor();
      else add(foldedBlanket, BED);
      add(bedFront, BED);
      add(handoff, TRAY);
      if (at2("handoff")) actor();
      add(westPost, bounds(77, 163, 6, 6));
      add((ctx) => entryPost(ctx, 108), bounds(107, 163, 6, 6));
      if (at2("door")) actor();
      if (walking) {
        const post = L.splice(L.findIndex((step) => step.draw === westPost), 1)[0];
        const tray = L.splice(L.findIndex((step) => step.draw === handoff), 1)[0];
        const stool = L.findIndex((step) => step.draw === teaStool);
        L.splice(stool, 0, tray, post);
      }
      return L;
    }
    let WALK_EXTENTS;
    function slotFor(station, u, v) {
      const L = steps(station, true);
      if (!WALK_EXTENTS) {
        ST = station;
        WALK_EXTENTS = L.map((step) => {
          if (!step.fp) return null;
          const image = mk(480, 560, step.draw);
          const pixels = image.getContext("2d").getImageData(0, 0, 480, 560).data;
          let left2 = 480, top2 = 560, right = 0, bottom = 0;
          for (let y2 = 0; y2 < 560; y2++) for (let x2 = 0; x2 < 480; x2++) {
            if (!pixels[(y2 * 480 + x2) * 4 + 3]) continue;
            left2 = Math.min(left2, x2);
            right = Math.max(right, x2 + 1);
            top2 = Math.min(top2, y2);
            bottom = Math.max(bottom, y2 + 1);
          }
          return [left2, top2, right, bottom];
        });
      }
      const poses = ["idle", ...CHAR.anim.walk || ["walkA", "walkB", "walkC", "walkD"]].map((pose) => CHAR.poses[pose]).filter(Boolean);
      const k = CHAR.k || 2;
      const width = Math.max(...poses.map((pose) => pose.w)) * k;
      const height = Math.max(...poses.map((pose) => pose.h)) * k;
      let z = 0;
      for (let i = -6; i <= 6; i++) z += floorAt(u + i, v) / 13;
      const [x, y] = S(u, v, z);
      const left = Math.round(x - width / 2), top = Math.round(y) - height + 1;
      let behind = L.findIndex((step) => step.fp), ahead = L.length;
      L.forEach((step, i) => {
        const b = WALK_EXTENTS[i];
        if (!b || left >= b[2] || left + width <= b[0] || top >= b[3] || top + height <= b[1]) return;
        if (u > step.fp[2] || v > step.fp[3]) behind = Math.max(behind, i + 1);
        else ahead = Math.min(ahead, i);
      });
      return Math.min(behind, ahead);
    }
    function nightLights(ctx) {
      [[78, 3, H - 38, 100, 0.24], [DESK[2] - 7, DESK[1] + 5, DZ + 18, 88, 0.25], [183, 135, FL + 25, 68, 0.13]].forEach(([u, v, z, r, a]) => {
        const [x, y] = S(u, v, z);
        glow(ctx, x, y, r, "#ffc882", a);
      });
      SCREENS.deskScreens(FIXTURES.desk).forEach((m) => {
        const [x, y] = S(m.cu, m.v, m.z + m.h / 2);
        glow(ctx, x, y, 28, LINKS[m.kind] === false ? "#ff9a63" : "#c3dcf3", 0.14);
      });
    }
    function layers(station, slot2) {
      const walking = slot2 !== void 0;
      ST = station;
      const L = steps(station, walking);
      const marker = L.findIndex((s) => s.actor);
      const cut = walking ? slot2 : marker < 0 ? L.length : marker;
      const back = mk(480, 560, (ctx) => L.slice(0, cut).forEach((s) => s.actor || s.draw(ctx)));
      const front = mk(480, 560, (ctx) => {
        L.slice(cut).forEach((s) => s.actor || s.draw(ctx));
      });
      return { back, front };
    }
    function drawOverlay(ctx) {
      if (C.n) nightLights(ctx);
    }
    const NODES = {
      hub: [118, 91],
      walk: [118, 91],
      west: [55, 75],
      boardWay: [28, 75],
      board: [PLACES.board.u, PLACES.board.v],
      libraryWay: [43, 75],
      library: [PLACES.library.u, PLACES.library.v],
      // Floor arrivals stay beside the furniture; PLACES retains its seat anchors.
      deskWay: [155, 83],
      code: [155, SEAT[1]],
      east: [199, 88],
      phone: [PLACES.phone.u, PLACES.phone.v],
      meetWay: [MSEAT[0], 90],
      meeting: [107, MSEAT[1]],
      entryWay: [105, 132],
      handoffWay: [86, 146],
      handoff: [PLACES.handoff.u, PLACES.handoff.v],
      teaWay: [105, 156],
      tea: [TEA_SEAT[0], 156],
      entryTurn: [85, 137],
      threshold: [95, 161],
      bridge: [95, 174],
      door: [PLACES.door.u, PLACES.door.v],
      bedWay: [133, 107],
      sleep: [133, PLACES.sleep.v]
    };
    const EDGES = [
      ["hub", "walk"],
      ["hub", "west"],
      ["west", "boardWay"],
      ["boardWay", "board"],
      ["west", "libraryWay"],
      ["libraryWay", "library"],
      ["hub", "deskWay"],
      ["deskWay", "code"],
      ["hub", "east"],
      ["east", "phone"],
      ["hub", "meetWay"],
      ["meetWay", "meeting"],
      ["hub", "entryWay"],
      ["entryTurn", "handoffWay"],
      ["handoffWay", "handoff"],
      ["entryWay", "teaWay"],
      ["teaWay", "tea"],
      ["entryWay", "entryTurn"],
      ["entryTurn", "threshold"],
      ["threshold", "bridge"],
      ["bridge", "door"],
      ["hub", "bedWay"],
      ["bedWay", "sleep"]
    ];
    const inside = (u, v, b) => u >= b[0] && u <= b[2] && v >= b[1] && v <= b[3];
    const floorAt = (u, v) => inside(u, v, [0, 0, RU, RV]) || inside(u, v, ENTRY_BRIDGE) || inside(u, v, GATE_BRIDGE) ? FL : 0;
    const callBox = SCREENS.callBox(FIXTURES.meeting);
    const SPOTS = {
      desk: SCREENS.deskBox(FIXTURES.desk),
      meeting: [Math.min(callBox[0], MEET[0]), Math.min(callBox[1], MEET[1]), FL, MSEAT[0] + 10, Math.max(callBox[4], MEET[3]) + 4, callBox[5]],
      library: [LIB[0], LIB[1], FL, LIB[2], LIB[3], FL + 96],
      tasks: [BOARD[0], BOARD[1], FL, BOARD[2] + 1, BOARD[3], FL + 94],
      phone: [PHONE[0], PHONE[1], FL, PHONE[2], PHONE[3], FL + 32],
      handoff: [TRAY[0], TRAY[1], FL, TRAY[2], TRAY[3], FL + 23]
    };
    const PALETTES = /* @__PURE__ */ new Map();
    function use(t, weather, char, links) {
      CHAR = char;
      LINKS = { claude: !links || links.claude !== false, slack: !links || links.slack !== false };
      let byChar = PALETTES.get(char);
      if (!byChar) PALETTES.set(char, byChar = /* @__PURE__ */ new Map());
      const key = t + "|" + weather;
      if (!byChar.has(key)) byChar.set(key, palette(t, weather));
      C = byChar.get(key);
    }
    function draw(ctx, m) {
      const t = m.t || "day";
      const station = m.station || (t === "night" ? "sleep" : "code");
      use(t, m.weather || "clear", m.char || { poses: ACTOR.sprout, pal: X.ORIPAL.sprout }, m.links);
      ST = station;
      const place = PLACES[station] || PLACES.code;
      const image = mk(480, 560, (c) => {
        steps(station, false).forEach((s) => s.actor ? drawOri(c, place, m.pose || place.own) : s.draw(c));
        if (station === "sleep") {
          const [x, y] = S(BED[0] + 10, BED[1] + 8, FL + 52);
          X.zzz(c, Math.round(x), Math.round(y), C.n ? C.PAPER.l : C.DARK.m);
        }
        if (C.n) nightLights(c);
      });
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0, 960, 1120);
    }
    const room = { STATIONS, PLACES, NODES, EDGES, SPOTS, FIXTURES, OBSTACLES, floorAt, project: S, use, slotFor, layers, drawOri, drawOverlay };
    window.OFFICE_ROOMS = window.OFFICE_ROOMS || [];
    window.OFFICE_ROOMS.push({ key: "ubud", zh: "\u4E4C\u5E03\u522B\u5885", name: "Ubud villa", room });
    CONCEPTS.push({
      key: "ubud",
      zh: "\u4E4C\u5E03\u522B\u5885",
      name: "Ubud villa",
      actor: "sprout",
      actorPal: X.ORIPAL.sprout,
      stations: STATIONS,
      angle: "\u6696\u6728\u5ECA\u4E0B\u7684\u4E00\u95F4\u4E4C\u5E03\u5C0F\u529E\u516C\u5BA4\uFF0C\u5DE6\u8FB9\u662F\u70ED\u5E26\u5EAD\u9662\u548C\u706B\u5C71\u77F3\u6C34\u5EAD\uFF0C\u5165\u53E3\u6709\u4E00\u5EA7\u5E72\u77F3\u6865\u3002",
      why: "\u6728\u5ECA\u3001\u8584\u5E18\u3001\u85E4\u7F16\u548C\u6C34\u5EAD\u628A\u529E\u516C\u5BA4\u5B89\u653E\u5728\u4E00\u5904\u80FD\u6162\u4E0B\u6765\u751F\u6D3B\u7684\u5C0F\u9662\u91CC\uFF0C\u5DE5\u4F5C\u3001\u5F00\u4F1A\u3001\u559D\u8336\u548C\u4F11\u606F\u5404\u6709\u4F4D\u7F6E\u3002",
      map: "\u53F3\u540E\u53CC\u5C4F\u5171\u7528\u4E00\u5957\u952E\u9F20\uFF0C\u65C1\u8FB9\u662F\u7535\u8BDD\uFF1B\u540E\u89D2\u4E66\u67B6\uFF0C\u5DE6\u8FB9\u72EC\u7ACB\u4E09\u5217\u4EFB\u52A1\u677F\uFF1B\u5DE6\u4E2D\u4E24\u5E2D\u4F1A\u8BAE\u533A\u6B63\u5BF9\u901A\u8BDD\u5C4F\uFF1B\u5165\u53E3\u65C1\u6A59\u7EA2\u7EB8\u6258\u76D8\uFF0C\u524D\u65B9\u8336\u58F6\u53CC\u676F\uFF0C\u53F3\u524D\u65B9\u6795\u6BEF\u85E4\u69BB\u3002",
      cost: "\u539F\u751F\u50CF\u7D20\u51E0\u4F55\u4E0E\u5171\u7528\u5C4F\u5E55\u7EC4\u4EF6\uFF0C11\u7AD9\u70B9\u6CBF\u4E2D\u592E\u5E72\u5730\u9762\u8FDE\u901A\uFF0C\u6700\u540E\u4E00\u6BB5\u8DEF\u7EBF\u624D\u8FDB\u5165\u8EBA\u69BB\u3002",
      draw,
      detail: [0, 90, 480, 450]
    });
  })();
  (function() {
    "use strict";
    const { P, ell, ramp, glow } = CP;
    const X = CX;
    const SCREENS = window.OFFICE_SCREENS;
    const CONTRACT = window.ROOM_CONTRACT;
    const OX = 214, OY = 242, RU = 238, RV = 184, H = 144, FL = 6, PB = 16;
    const S = (u, v, z) => [OX + u - v, OY + (u + v) / 2 - (z || 0)];
    const q = (c, pts, col) => X.poly(c, pts.map((p) => S(p[0], p[1], p[2])), col);
    const bounds = ([u, v, du, dv]) => [u, v, u + du, v + dv];
    function mk(w, h, fn) {
      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      const c = out.getContext("2d");
      c.imageSmoothingEnabled = false;
      fn(c);
      return out;
    }
    function seg(c, a, b, col) {
      const p = S(...a), r = S(...b);
      const n = Math.max(Math.abs(r[0] - p[0]), Math.abs(r[1] - p[1]), 1);
      c.fillStyle = col;
      for (let i = 0; i <= n; i++) c.fillRect(Math.round(p[0] + (r[0] - p[0]) * i / n), Math.floor(p[1] + (r[1] - p[1]) * i / n + 1e-6), 1, 1);
    }
    function box(c, u, v, z, du, dv, dz, R, o) {
      o = o || {};
      const t = z + dz;
      if (dz > 0) {
        q(c, [[u, v + dv, z], [u + du, v + dv, z], [u + du, v + dv, t], [u, v + dv, t]], o.fv || R.m);
        q(c, [[u + du, v, z], [u + du, v + dv, z], [u + du, v + dv, t], [u + du, v, t]], o.fu || R.d);
      }
      q(c, [[u, v, t], [u + du, v, t], [u + du, v + dv, t], [u, v + dv, t]], o.top || R.l);
      if (o.edge !== false) {
        seg(c, [u, v + dv, t], [u + du, v + dv, t], o.hc || R.h);
        seg(c, [u + du, v, t], [u + du, v + dv, t], o.hc || R.h);
      }
    }
    function foot(c, r) {
      const [u, v, du, dv] = r;
      c.save();
      c.globalAlpha = 0.11;
      q(c, [[u + 2, v + 2, FL], [u + du + 3, v + 2, FL], [u + du + 3, v + dv + 3, FL], [u + 2, v + dv + 3, FL]], "#39291f");
      c.restore();
    }
    function onV(c, img, u, v, z) {
      const [x, y] = S(u, v, z);
      for (let i = 0; i < img.width; i++) c.drawImage(img, i, 0, 1, img.height, x + i, y + Math.ceil(i / 2), 1, img.height);
    }
    function onU(c, img, u, v, z) {
      const [x, y] = S(u, v + img.width, z);
      for (let i = 0; i < img.width; i++) c.drawImage(img, i, 0, 1, img.height, x + i, y - Math.ceil(i / 2), 1, img.height);
    }
    function onFloor(c, img, u0, v0, z) {
      const w = img.width, h = img.height;
      const corners = [S(u0, v0, z), S(u0 + w, v0, z), S(u0 + w, v0 + h, z), S(u0, v0 + h, z)];
      const x0 = Math.floor(Math.min(...corners.map((p) => p[0]))), y0 = Math.floor(Math.min(...corners.map((p) => p[1])));
      const width = Math.ceil(Math.max(...corners.map((p) => p[0]))) - x0, height = Math.ceil(Math.max(...corners.map((p) => p[1]))) - y0;
      const source = img.getContext("2d").getImageData(0, 0, w, h).data, target = c.getImageData(x0, y0, width, height);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const xx = x0 + x + 0.5 - OX, yy = y0 + y + 0.5 - OY + z, u = (xx + 2 * yy) / 2 - u0, v = (2 * yy - xx) / 2 - v0;
        if (u < 0 || v < 0 || u >= w || v >= h) continue;
        const si = (Math.floor(v) * w + Math.floor(u)) * 4, a = source[si + 3] / 255;
        if (!a) continue;
        const di = (y * width + x) * 4, da = target.data[di + 3] / 255, outA = a + da * (1 - a);
        for (let i = 0; i < 3; i++) target.data[di + i] = (source[si + i] * a + target.data[di + i] * da * (1 - a)) / outA;
        target.data[di + 3] = outA * 255;
      }
      c.putImageData(target, x0, y0);
    }
    const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
    function mul(a, b) {
      if (!/^#[0-9a-f]{6}$/i.test(a)) return a;
      const A = hex(a), B2 = hex(b);
      return "#" + A.map((v, i) => Math.round(v * B2[i] / 255).toString(16).padStart(2, "0")).join("");
    }
    let CHAR, C, ST = "code", LINKS = { claude: true, slack: true };
    function palette(t) {
      const n = t === "night", golden = t === "golden";
      const tint = n ? "#9290aa" : golden ? "#fff0d8" : "#ffffff";
      const tin = (h) => ramp(mul(h, tint));
      const actor = {};
      Object.entries(CHAR.pal).forEach(([k, v]) => actor[k] = n ? mul(v, "#d3bda8") : v);
      return {
        n,
        actor,
        bg: n ? "#282b36" : golden ? "#f0dfcb" : "#eee7dc",
        FLOOR: tin("#e6d2b2"),
        WALL: tin("#c98160"),
        WOOD: tin("#a77548"),
        CEDAR: tin("#765039"),
        TEAL: tin("#548a88"),
        WATER: tin("#83b7b3"),
        PAPER: tin("#f6ebd8"),
        SOFT: tin("#8fa376"),
        DARK: tin("#323431"),
        RUST: tin("#bd6446"),
        CLAY: tin("#b57e56"),
        LEAF: tin("#4f794d"),
        ORANGE: tin("#e8a03d"),
        BRASS: tin("#ad8b49"),
        ACC: tin("#e15c31")
      };
    }
    const SHELF = [0, 14, 18, 58];
    const BOARD = [26, 12, 46, 4];
    const BOARD_Z = FL + 34, BOARD_H = 47;
    const DESK = [78, 20, 84, 23], DZ = FL + 24;
    const PHONE = [164, 42, 14, 16], PHONE_Z = FL + 20;
    const MEET = [30, 98, 60, 32], MZ = FL + 19;
    const COURT = [180, 0, 32, 70];
    const FOUNTAIN = { u: 202, v: 46, r: 11, h: 7 };
    const ORANGE = { u: 201, v: 14, r: 5 };
    const PLANT = [6, 152, 10, 10];
    const TRAY = [188, 86, 18, 16], TZ = FL + 22;
    const TEA = { u: 184, v: 132, r: 12 };
    const TEA_SEAT = [164, 140];
    const BED = [78, 138, 78, 44];
    const DOOR = [214, 238];
    const B = {
      shelf: bounds(SHELF),
      board: bounds(BOARD),
      desk: bounds(DESK),
      phone: bounds(PHONE),
      meeting: bounds(MEET),
      court: bounds(COURT),
      tray: bounds(TRAY),
      bed: bounds(BED),
      plant: bounds(PLANT),
      fountain: [FOUNTAIN.u - FOUNTAIN.r, FOUNTAIN.v - FOUNTAIN.r, FOUNTAIN.u + FOUNTAIN.r, FOUNTAIN.v + FOUNTAIN.r],
      orange: [ORANGE.u - ORANGE.r, ORANGE.v - ORANGE.r, ORANGE.u + ORANGE.r, ORANGE.v + ORANGE.r],
      tea: [TEA.u - TEA.r, TEA.v - TEA.r, TEA.u + TEA.r, TEA.v + TEA.r]
    };
    const FIXTURES = {
      desk: { facing: "+v", u: DESK[0] + DESK[2] / 2, v: DESK[1] + 6, z: DZ + 5, seat: [DESK[0] + DESK[2] / 2, 54], keyboard: [DESK[0] + DESK[2] / 2 - 12, DESK[1] + 15, DZ, 24, 5, 1] },
      meeting: { facing: "+u", u: 11, v: MEET[1] + 14, z: FL + 35, seat: [MEET[0] + MEET[2] + 18, MEET[1] + 14] }
    };
    const SEAT = FIXTURES.desk.seat, MSEAT = FIXTURES.meeting.seat;
    const SIDE_SEAT = [68, 146];
    const chairFoot = ([u, v], desk2) => desk2 ? [u - 7, v - 6, u + 7, v + 8] : [u - 7, v - 7, u + 8, v + 7];
    const SEAT_FOOT = chairFoot(SEAT, true), MSEAT_FOOT = chairFoot(MSEAT), SIDE_SEAT_FOOT = chairFoot(SIDE_SEAT);
    const TEA_SEAT_FOOT = [TEA_SEAT[0] - 7, TEA_SEAT[1] - 6, TEA_SEAT[0] + 7, TEA_SEAT[1] + 6];
    function backdrop(c) {
      P(c, C.bg, 0, 0, 480, 560);
    }
    function diamond(c, u, v, r, z, col) {
      q(c, [[u - r, v, z], [u, v - r, z], [u + r, v, z], [u, v + r, z]], col);
    }
    function floor(c) {
      box(c, -6, -6, -PB, RU + 12, RV + 12, PB, C.FLOOR, { fv: C.FLOOR.d, fu: C.FLOOR.o, edge: false });
      box(c, 0, 0, 0, RU, RV, FL, C.FLOOR, { edge: false });
      for (let u2 = 22; u2 < RU; u2 += 22) seg(c, [u2, 0, FL], [u2, RV, FL], C.FLOOR.m);
      for (let v2 = 22; v2 < RV; v2 += 22) seg(c, [0, v2, FL], [RU, v2, FL], C.FLOOR.m);
      [[4, 4, RU - 8, 8], [4, RV - 12, RU - 8, 8], [4, 12, 8, RV - 24], [RU - 12, 12, 8, RV - 24]].forEach(([u2, v2, du2, dv2]) => box(c, u2, v2, FL, du2, dv2, 0, C.PAPER, { edge: false }));
      for (let u2 = 12; u2 < RU - 8; u2 += 12) [8, RV - 8].forEach((v2) => diamond(c, u2, v2, 3, FL + 0.1, C.TEAL.m));
      for (let v2 = 20; v2 < RV - 14; v2 += 12) [8, RU - 8].forEach((u2) => diamond(c, u2, v2, 3, FL + 0.1, C.TEAL.m));
      const [u, v, du, dv] = COURT;
      for (let a = 0; a < du; a += 8) for (let b = 0; b < dv; b += 8) box(c, u + a, v + b, FL, Math.min(8, du - a), Math.min(8, dv - b), 0, (a / 8 + b / 8) % 2 ? C.PAPER : C.TEAL, { edge: false });
      box(c, 20, 88, FL, 96, 66, 0, C.RUST, { top: C.RUST.m, edge: false });
      [[22, 90, 92, 62], [25, 93, 86, 56]].forEach(([a, b, w, h], i) => {
        const col = i ? C.RUST.l : C.PAPER.m;
        [[a, b, a + w, b], [a + w, b, a + w, b + h], [a + w, b + h, a, b + h], [a, b + h, a, b]].forEach(([x, y, xx, yy]) => seg(c, [x, y, FL + 0.2], [xx, yy, FL + 0.2], col));
      });
    }
    function archImage(w, h) {
      return mk(w, h, (c) => {
        const shape = (x0, y0, ww, hh, col) => {
          const r = ww / 2;
          for (let y = 0; y < hh; y++) {
            const half = y < r * 1.55 ? Math.sqrt(Math.max(0, 1 - ((y - r) / r) ** 2)) * r : r * 0.81;
            const a = Math.ceil(x0 + r - half), b = Math.floor(x0 + r + half);
            if (b >= a) P(c, col, a, y + y0, b - a + 1, 1);
          }
        };
        shape(0, 0, w, h, C.PAPER.m);
        shape(4, 5, w - 8, h - 5, C.n ? C.WALL.o : C.FLOOR.m);
        P(c, C.PAPER.l, Math.round(w * 0.09), Math.round(w * 0.8), 3, h - Math.round(w * 0.8));
      });
    }
    function walls(c) {
      q(c, [[0, 0, FL], [RU, 0, FL], [RU, 0, H], [0, 0, H]], C.WALL.m);
      q(c, [[0, 0, FL], [0, RV, FL], [0, RV, H], [0, 0, H]], C.WALL.d);
      box(c, -4, -4, H, RU + 4, 4, 3, C.WALL, { edge: false });
      box(c, -4, 0, H, 4, RV, 3, C.WALL, { edge: false });
      seg(c, [0, 0, FL + 4], [RU, 0, FL + 4], C.WALL.l);
      seg(c, [0, 0, FL + 4], [0, RV, FL + 4], C.WALL.m);
      onU(c, archImage(70, 120), 0, 8, FL + 126);
      onV(c, archImage(38, 114), 176, 0, FL + 122);
      const [a, b] = DOOR;
      q(c, [[a, 0, FL], [b, 0, FL], [b, 0, FL + 88], [a, 0, FL + 88]], C.CEDAR.o);
      const open = ST === "door";
      if (!open) {
        box(c, a + 2, 0, FL + 1, b - a - 4, 1, 85, C.CEDAR, { top: C.CEDAR.l, edge: false });
        for (let u = a + 5; u < b - 2; u += 5) seg(c, [u, 1, FL + 3], [u, 1, FL + 84], C.CEDAR.d);
        [24, 65].forEach((z) => box(c, a + 3, 1, FL + z, b - a - 6, 1, 2, C.DARK, { edge: false }));
        box(c, a + 5, 2, FL + 42, 2, 1, 3, C.BRASS, { edge: false });
      } else {
        const top = FL + 85;
        const view = !c.roomOcclusionMask && window.LANDSCAPES?.windowView("marrakech", a + 2, b - a - 4, 84, top);
        if (view) onV(c, view, a + 2, 0, top);
        else q(c, [[a + 2, 0, FL + 1], [b - 2, 0, FL + 1], [b - 2, 0, top], [a + 2, 0, top]], C.n ? "#393b48" : "#c2b393");
        box(c, b - 2, 0, FL + 1, 1, 20, 85, C.CEDAR, { fv: C.CEDAR.d, fu: C.CEDAR.m, edge: false });
        box(c, b - 1, 16, FL + 42, 1, 2, 3, C.BRASS, { edge: false });
      }
      seg(c, [a, 1, FL], [b, 1, FL], C.PAPER.l);
      const textile = mk(34, 58, (x) => {
        P(x, C.PAPER.m, 0, 0, 34, 58);
        P(x, C.RUST.m, 2, 2, 30, 54);
        P(x, C.PAPER.l, 4, 4, 26, 50);
        for (let y = 0; y < 22; y++) {
          const hw = Math.min(y, 21 - y);
          P(x, C.TEAL.m, 16 - hw, 17 + y, hw * 2 + 1, 1);
        }
        P(x, C.PAPER.l, 14, 25, 5, 6);
        for (let i = 1; i < 34; i += 4) P(x, C.PAPER.m, i, 56, 1, 4);
      });
      onU(c, textile, 1, 116, FL + 123);
    }
    function library(c) {
      const [u, v, du, dv] = SHELF;
      foot(c, SHELF);
      box(c, u, v, FL, du, dv, 102, C.CEDAR);
      const books = mk(dv, 100, (x) => {
        P(x, C.CEDAR.o, 0, 0, dv, 100);
        for (let row = 0; row < 4; row++) {
          const y = 1 + row * 25;
          for (let k = 0; k < 10; k++) {
            const R = [C.PAPER, C.SOFT, C.WOOD, C.TEAL][(k + row) % 4];
            const ht = 15 + (k * 3 + row) % 7, xx = 3 + k * 5;
            P(x, R.m, xx, y + 22 - ht, 4, ht);
            P(x, R.l, xx, y + 22 - ht, 1, ht);
            if (k % 3 === 0) P(x, R.h, xx + 1, y + 24 - ht, 2, 1);
          }
          P(x, C.WOOD.l, 0, y + 23, dv, 2);
        }
      });
      onU(c, books, u + du + 0.1, v, FL + 101);
      seg(c, [u + du + 0.2, v + 4, FL + 99], [u + du + 0.2, v + dv - 4, FL + 99], C.n ? "#cfb486" : C.WOOD.l);
      box(c, u + du - 1, v, FL, 2, dv, 3, C.CEDAR, { edge: false });
    }
    function board2(c) {
      const [u, v, w, d] = BOARD;
      [u + 3, u + w - 4].forEach((a) => {
        box(c, a, v - 2, FL, 2, d + 6, 1, C.DARK, { edge: false });
        box(c, a, v, FL, 1, 1, BOARD_Z - FL + 2, C.CEDAR, { edge: false });
      });
      const img = mk(w, BOARD_H, (x) => {
        P(x, C.CEDAR.m, 0, 0, w, BOARD_H);
        P(x, C.PAPER.l, 2, 2, w - 4, BOARD_H - 4);
        const colW = 12;
        for (let k = 0; k < 3; k++) {
          const a = 4 + k * 13;
          if (k) P(x, C.FLOOR.d, a - 2, 5, 1, BOARD_H - 10);
          P(x, [C.RUST.m, C.TEAL.m, C.SOFT.m][k], a, 5, colW - 2, 2);
          for (let j = 0; j < (k === 2 ? 2 : 3); j++) {
            P(x, [C.FLOOR.l, C.WATER.l, C.SOFT.l][k], a, 11 + j * 10, colW - 2, 8);
            P(x, C.CEDAR.l, a + 2, 14 + j * 10, colW - 6, 1);
          }
        }
      });
      box(c, u, v, BOARD_Z, w, 2, BOARD_H, C.CEDAR, { edge: false });
      onV(c, img, u, v + 2, BOARD_Z + BOARD_H);
    }
    function octagon(u, v, r) {
      return Array.from({ length: 8 }, (_, i) => {
        const a = Math.PI / 8 + i * Math.PI / 4;
        return [u + Math.cos(a) * r, v + Math.sin(a) * r];
      });
    }
    function prism(c, pts, z, h, R) {
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if (b[0] - a[0] > b[1] - a[1]) continue;
        const nu = b[1] - a[1], nv = a[0] - b[0];
        q(c, [[...a, z], [...b, z], [...b, z + h], [...a, z + h]], nu > nv ? R.d : R.m);
      }
      q(c, pts.map(([u, v]) => [u, v, z + h]), R.l);
    }
    function fountain(c) {
      const { u, v, r, h } = FOUNTAIN;
      prism(c, octagon(u, v, r), FL, h, C.PAPER);
      q(c, octagon(u, v, r - 2).map(([a, b]) => [a, b, FL + h]), C.TEAL.m);
      q(c, octagon(u, v, r - 3).map(([a, b]) => [a, b, FL + h + 0.1]), C.WATER.m);
      const [x, y] = S(u, v, FL + h + 1);
      ell(c, x, y, 6, 3, C.WATER.l);
      ell(c, x, y, 4, 2, C.WATER.m);
      box(c, u - 1, v - 1, FL + h, 2, 2, 8, C.PAPER, { edge: false });
      ell(c, x, y - 8, 2, 2, C.PAPER.l);
      [0, 2, 4, 6].forEach((i) => {
        const a = i * Math.PI / 4, uu = u + Math.cos(a) * (r - 1), vv = v + Math.sin(a) * (r - 1);
        box(c, uu - 1, vv - 1, FL + 1, 2, 2, h - 2, C.TEAL, { edge: false });
      });
    }
    function orangeTree(c) {
      const { u, v, r } = ORANGE;
      const pp = [u - r, v - r, r * 2, r * 2];
      foot(c, pp);
      prism(c, octagon(u, v, r), FL, 11, C.CLAY);
      box(c, u - 1, v - 1, FL + 10, 2, 2, 28, C.CEDAR, { edge: false });
      const [x, y] = S(u, v, FL + 44);
      [[-5, 1, 9, 9], [5, 0, 9, 10], [0, -8, 9, 8], [1, 9, 8, 7]].forEach(([dx, dy, rx, ry], i) => ell(c, x + dx, y + dy, rx, ry, i % 2 ? C.LEAF.m : C.LEAF.d));
      [[-5, -4], [3, -9], [7, 2], [-3, 7]].forEach(([dx, dy]) => {
        P(c, C.ORANGE.m, x + dx, y + dy, 3, 3);
        P(c, C.ORANGE.l, x + dx, y + dy, 2, 1);
      });
    }
    function plant(c) {
      const [u, v, du, dv] = PLANT, cu = u + du / 2, cv = v + dv / 2;
      foot(c, PLANT);
      prism(c, octagon(cu, cv, 5), FL, 9, C.CLAY);
      const [x, y] = S(cu, cv, FL + 10);
      [[-6, -13], [-2, -20], [4, -17], [8, -10]].forEach(([dx, dy], i) => {
        seg(c, [cu, cv, FL + 8], [cu + dx / 2, cv, FL + 10 - dy], C.LEAF.m);
        ell(c, x + dx, y + dy, 3, 7, i % 2 ? C.LEAF.l : C.LEAF.m);
      });
    }
    function lantern(c) {
      const [x, y] = S(77, 2, H - 10);
      P(c, C.BRASS.d, x + 4, y, 1, 14);
      P(c, C.BRASS.m, x + 1, y + 14, 7, 2);
      P(c, C.BRASS.d, x, y + 17, 9, 14);
      P(c, C.n ? "#f2c777" : C.PAPER.m, x + 2, y + 19, 5, 10);
      P(c, C.BRASS.m, x + 4, y + 18, 1, 13);
      P(c, C.BRASS.m, x + 1, y + 30, 7, 2);
      P(c, C.BRASS.l, x + 3, y + 33, 3, 2);
    }
    const look = (opts) => ({ frame: C.DARK.o, off: C.DARK.d, accent: C.ACC.l, body: C.DARK, bodyOpts: opts });
    function deskStand(c, m) {
      box(c, m.cu - 4, m.v - 3, DZ, 8, 4, 1, C.DARK, { edge: false });
      box(c, m.cu - 1, m.v - 3, DZ + 1, 2, 2, m.z - DZ + 5, C.DARK, { edge: false });
    }
    function desk(c) {
      const [u, v, du, dv] = DESK;
      foot(c, DESK);
      [[u + 2, v + 2], [u + du - 5, v + 2], [u + 2, v + dv - 5], [u + du - 5, v + dv - 5]].forEach(([a, b]) => box(c, a, b, FL, 3, 3, DZ - FL - 3, C.CEDAR, { edge: false }));
      box(c, u, v, DZ - 3, du, dv, 3, C.WOOD);
      SCREENS.placeDesk(c, FIXTURES.desk, look({ fv: C.DARK.d, top: C.DARK.m }), LINKS, { box, onV, stand: deskStand });
      box(c, ...FIXTURES.desk.keyboard, C.DARK, { edge: false });
      for (let i = 0; i < 8; i++) seg(c, [FIXTURES.desk.u - 10 + i * 3, v + 16, DZ + 1], [FIXTURES.desk.u - 10 + i * 3, v + 18, DZ + 1], C.DARK.l);
      const [mx, my] = S(FIXTURES.desk.u + 19, v + 17, DZ + 1);
      ell(c, mx, my, 3, 2, C.DARK.m);
      P(c, C.DARK.l, mx, my - 1, 1, 1);
      const [lx, ly] = S(u + du - 7, v + 5, DZ);
      ell(c, lx, ly, 4, 2, C.BRASS.m);
      P(c, C.BRASS.m, lx, ly - 14, 1, 14);
      P(c, C.BRASS.d, lx - 5, ly - 23, 11, 9);
      P(c, C.n ? "#f2d3a0" : C.PAPER.m, lx - 4, ly - 22, 9, 7);
      P(c, C.BRASS.m, lx, ly - 22, 1, 7);
    }
    function chairSeat(c, u, v) {
      foot(c, [u - 7, v - 6, 14, 12]);
      [[u - 6, v - 5], [u + 4, v - 5], [u - 6, v + 3], [u + 4, v + 3]].forEach(([a, b]) => box(c, a, b, FL, 2, 2, 10, C.CEDAR, { edge: false }));
      box(c, u - 7, v - 6, FL + 10, 14, 12, 3, C.PAPER);
    }
    function chairBack(c, u, v, facing) {
      if (facing === "desk") box(c, u - 7, v + 6, FL + 12, 14, 2, 17, C.CEDAR, { fv: C.CEDAR.m, fu: C.CEDAR.d });
      else box(c, u + 6, v - 7, FL + 12, 2, 14, 17, C.CEDAR, { fv: C.CEDAR.m, fu: C.CEDAR.d });
    }
    function phone(c, inUse) {
      const [u, v, du, dv] = PHONE;
      foot(c, PHONE);
      box(c, u, v, FL, du, dv, PHONE_Z - FL, C.CEDAR);
      [7, 14].forEach((z) => seg(c, [u + 1, v + dv, FL + z], [u + du - 1, v + dv, FL + z], C.WOOD.m));
      box(c, u + 2, v + 3, PHONE_Z, 10, 10, 3, C.DARK, { edge: false });
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) box(c, u + 7 + a, v + 5 + b * 2, PHONE_Z + 3, 0.7, 0.7, 0, C.PAPER, { edge: false });
      if (!inUse) {
        box(c, u + 3, v + 2, PHONE_Z + 3, 2, 11, 2, C.DARK, { edge: false });
        box(c, u + 2, v + 2, PHONE_Z + 3, 4, 2, 3, C.DARK, { edge: false });
        box(c, u + 2, v + 11, PHONE_Z + 3, 4, 2, 3, C.DARK, { edge: false });
      }
    }
    function meetingScreen(c) {
      SCREENS.placeCall(c, FIXTURES.meeting, look({ fu: C.DARK.d, top: C.DARK.m }), !C.n || ST === "meeting", { box, onU, stand: (x, m) => {
        [m.v0 + 5, m.v0 + m.w - 5].forEach((v) => {
          box(x, m.u - 3, v - 2, FL, 6, 4, 1, C.DARK, { edge: false });
          box(x, m.u - 1, v - 1, FL + 1, 1, 2, m.z - FL + 2, C.DARK, { edge: false });
        });
      } });
    }
    function meetingTable(c) {
      const [u, v, du, dv] = MEET;
      foot(c, MEET);
      [[u + 3, v + 3], [u + du - 6, v + 3], [u + 3, v + dv - 6], [u + du - 6, v + dv - 6]].forEach(([a, b]) => box(c, a, b, FL, 3, 3, MZ - FL - 3, C.CEDAR, { edge: false }));
      box(c, u, v, MZ - 3, du, dv, 3, C.WOOD);
      box(c, u + 24, v + 11, MZ, 14, 9, 2, C.SOFT, { edge: false });
      box(c, u + 24, v + 11, MZ + 2, 14, 8, 1, C.PAPER, { edge: false });
    }
    function handoff(c, lit) {
      const [u, v, du, dv] = TRAY;
      foot(c, TRAY);
      box(c, u, v, FL, du, dv, TZ - FL, C.CEDAR);
      box(c, u + 1, v + 2, TZ, du - 2, dv - 4, 1, C.ACC, { edge: false });
      box(c, u + 1, v + 2, TZ + 1, du - 2, 1, 4, C.ACC, { edge: false });
      box(c, u + 1, v + 2, TZ + 1, 1, dv - 4, 4, C.ACC, { edge: false });
      box(c, u + du - 2, v + 2, TZ + 1, 1, dv - 4, 4, C.ACC, { edge: false });
      box(c, u + 4, v + 4, TZ + 1, du - 7, dv - 7, 2, C.PAPER, { edge: false });
      seg(c, [u + 6, v + 6, TZ + 3], [u + du - 5, v + 6, TZ + 3], C.FLOOR.d);
      if (lit) {
        const [x, y] = S(u + du / 2, v + dv / 2, TZ + 5);
        glow(c, x, y, 24, "#f29654", 0.2);
      }
    }
    function teaTable(c) {
      const { u, v, r } = TEA;
      foot(c, [u - r, v - r, r * 2, r * 2]);
      [[u - 7, v - 7], [u + 5, v - 7], [u - 7, v + 5], [u + 5, v + 5]].forEach(([a, b]) => box(c, a, b, FL, 2, 2, 16, C.CEDAR, { edge: false }));
      prism(c, octagon(u, v, r), FL + 16, 3, C.WOOD);
      const [x, y] = S(u - 2, v - 1, FL + 22);
      ell(c, x, y - 3, 5, 4, C.DARK.m);
      P(c, C.DARK.d, x - 4, y - 3, 8, 6);
      ell(c, x, y - 6, 4, 2, C.DARK.l);
      P(c, C.DARK.m, x - 1, y - 9, 2, 2);
      P(c, C.DARK.m, x + 5, y - 5, 2, 6);
      P(c, C.DARK.m, x + 3, y - 6, 3, 1);
      P(c, C.DARK.m, x + 3, y, 3, 1);
      P(c, C.DARK.m, x - 7, y - 4, 3, 2);
      P(c, C.DARK.m, x - 9, y - 6, 2, 2);
      [[u + 5, v + 4], [u - 5, v + 6], [u + 6, v - 5]].forEach(([a, b]) => {
        const [xx, yy] = S(a, b, FL + 21);
        P(c, C.PAPER.m, xx - 2, yy - 2, 4, 4);
        P(c, C.PAPER.l, xx - 2, yy - 3, 4, 1);
        P(c, C.CEDAR.m, xx - 1, yy - 2, 2, 1);
        P(c, C.PAPER.m, xx + 2, yy - 1, 1, 2);
      });
    }
    function teaSeat(c) {
      box(c, TEA_SEAT[0] - 7, TEA_SEAT[1] - 6, FL, 14, 12, 4, C.SOFT);
    }
    function bed(c) {
      const [u, v, du, dv] = BED;
      foot(c, BED);
      [[u + 2, v + 2], [u + du - 5, v + 2], [u + 2, v + dv - 5], [u + du - 5, v + dv - 5]].forEach(([a, b]) => box(c, a, b, FL, 3, 3, 8, C.CEDAR, { edge: false }));
      box(c, u, v, FL + 6, du, dv, 3, C.CEDAR);
      box(c, u + 3, v + 2, FL + 9, du - 6, dv - 4, 4, C.PAPER);
      box(c, u + 5, v + 6, FL + 13, 13, dv - 12, 3, C.SOFT);
      box(c, u, v, FL + 8, 3, dv, 12, C.CEDAR);
    }
    function blanket(c) {
      const [u, v, du, dv] = BED;
      box(c, u + 29, v + 2, FL + 13, du - 33, dv - 4, 2, C.RUST);
      [u + 32, u + 36].forEach((a) => box(c, a, v + 2, FL + 15, 1, dv - 4, 0, C.PAPER, { edge: false }));
    }
    function bedFront(c) {
      const [u, v, du, dv] = BED;
      box(c, u + du - 3, v, FL + 7, 3, dv, 7, C.CEDAR);
      box(c, u, v + dv - 2, FL + 7, du, 2, 4, C.CEDAR);
    }
    const ACTOR_K = 2, SPRITES = /* @__PURE__ */ new WeakMap(), TUCKED = /* @__PURE__ */ new WeakMap();
    function sprite(s) {
      let a = SPRITES.get(s);
      if (!a) SPRITES.set(s, a = /* @__PURE__ */ new WeakMap());
      let img = a.get(C.actor);
      if (!img) a.set(C.actor, img = mk(s.w, s.h, (c) => PX.paint(c, s, C.actor, 0, 0)));
      return img;
    }
    function poseSprite(pose) {
      if (pose === "turn") return CONTRACT.turnSprite(CHAR, false);
      if (pose === "turnL") return CONTRACT.turnSprite(CHAR, true);
      return CHAR.poses[pose] || CHAR.poses.idle;
    }
    function tucked(s, K) {
      const source = sprite(s), w = s.w * K, h = s.h * K;
      const cached = TUCKED.get(source);
      if (cached && cached.width === w && cached.height === h) return cached;
      const image = mk(w, h, (c) => {
        c.drawImage(source, 0, 0, w, h);
        if (s.rows.some((r) => /[qQ]/.test(r))) return;
        const pixels = c.getImageData(0, 0, w, h).data;
        const eyeEnd = Math.max(...s.rows.map((row) => row.lastIndexOf("e"))) + 1;
        const fold = Math.max(Math.round(w * 0.48), (eyeEnd + 3) * K);
        for (let x = fold; x < w; x++) {
          let top = -1;
          for (let y = 0; y < h; y++) if (pixels[(y * w + x) * 4 + 3]) {
            top = y;
            break;
          }
          if (top < 0) continue;
          P(c, C.RUST.m, x, Math.max(0, top - 1), 1, h - top + 1);
          P(c, C.PAPER.m, x, Math.max(0, top - 1), 1, 1);
        }
      });
      TUCKED.set(source, image);
      return image;
    }
    const STATIONS = CONTRACT.STATIONS;
    const PLACES = {
      code: { u: SEAT[0], v: SEAT[1], z: FL + 13, own: "turn", shared: "turn", sit: true },
      work: { u: SEAT[0], v: SEAT[1], z: FL + 13, own: "turn", shared: "turn", sit: true },
      meeting: { u: MSEAT[0], v: MSEAT[1], z: FL + 13, own: "turnL", shared: "turnL", sit: true },
      library: { u: 32, v: 46, z: FL, own: "read", shared: "back" },
      board: { u: 49, v: 32, z: FL, own: "post", shared: "back" },
      phone: { u: 174, v: 74, z: FL, own: "phone", shared: "idle" },
      handoff: { u: 194, v: 114, z: FL, own: "attention", shared: "idle", bang: true },
      tea: { u: TEA_SEAT[0], v: TEA_SEAT[1], z: FL + 4, own: "tea", shared: "type", sit: true },
      sleep: { u: BED[0] + BED[2] / 2, v: BED[1] + BED[3] / 2, z: FL + 14, own: "sleep", shared: "sleep", lie: true },
      walk: { u: 124, v: 92, z: FL, own: "walkA", shared: "walkA" },
      door: { u: (DOOR[0] + DOOR[1]) / 2, v: 8, z: FL, own: "wave", shared: "idle" }
    };
    function drawOri(c, place, pose) {
      if (place.lie) {
        const s2 = CHAR.poses[pose] || CHAR.poses.sleep, K2 = CHAR.k || ACTOR_K, img = tucked(s2, K2);
        window.ROOM_PAINTER.sleeper(c, img, S, { u: place.u - img.width / 2, v: place.v - img.height / 2, z: place.z, w: img.width, d: img.height });
        return null;
      }
      const s = poseSprite(pose), K = CHAR.k || ACTOR_K, [x, y] = S(place.u, place.v, place.z);
      const w = s.w * K, h = s.h * K, left = Math.round(x - w / 2), top = Math.round(y) - h + 1;
      c.drawImage(sprite(s), left, top, w, h);
      if (place.bang && !CHAR.poses[pose]) {
        P(c, C.ACC.m, Math.round(x) - 2, top - 16, 4, 9);
        P(c, C.ACC.m, Math.round(x) - 2, top - 5, 4, 3);
      }
      return { left, top, w, h };
    }
    function steps(station, walking) {
      const L = [], add = (draw2, fp) => L.push({ draw: draw2, fp }), actor = () => L.push({ actor: true });
      const at2 = (...s) => !walking && s.includes(station);
      add(backdrop);
      add(floor);
      add(walls);
      add(lantern);
      add(fountain, B.fountain);
      add(orangeTree, B.orange);
      add(library, B.shelf);
      add(board2, B.board);
      if (at2("library", "board", "door")) actor();
      add(meetingScreen, [9, FIXTURES.meeting.v - SCREENS.CALL_W / 2, 14, FIXTURES.meeting.v + SCREENS.CALL_W / 2]);
      add(desk, B.desk);
      add((c) => chairSeat(c, ...SEAT), SEAT_FOOT);
      if (at2("code", "work")) actor();
      add((c) => chairBack(c, ...SEAT, "desk"), SEAT_FOOT);
      add((c) => phone(c, station === "phone"), B.phone);
      if (at2("phone")) actor();
      add(meetingTable, B.meeting);
      add((c) => {
        chairSeat(c, ...SIDE_SEAT);
        chairBack(c, ...SIDE_SEAT, "meeting");
      }, SIDE_SEAT_FOOT);
      add((c) => chairSeat(c, ...MSEAT), MSEAT_FOOT);
      if (at2("meeting")) actor();
      add((c) => chairBack(c, ...MSEAT, "meeting"), MSEAT_FOOT);
      add((c) => handoff(c, station === "handoff"), B.tray);
      if (at2("handoff", "walk")) actor();
      add(plant, B.plant);
      add(bed, B.bed);
      if (at2("sleep")) actor();
      else add(blanket, B.bed);
      add(bedFront, B.bed);
      add(teaSeat, TEA_SEAT_FOOT);
      add(teaTable, B.tea);
      if (at2("tea")) actor();
      return L;
    }
    let WALK_EXTENTS;
    function slotFor(station, u, v) {
      const L = steps(station, true);
      if (!WALK_EXTENTS) {
        ST = station;
        WALK_EXTENTS = L.map((step) => {
          if (!step.fp) return null;
          const image = mk(480, 560, step.draw);
          const pixels = image.getContext("2d").getImageData(0, 0, 480, 560).data;
          let left2 = 480, top2 = 560, right = 0, bottom = 0;
          for (let y2 = 0; y2 < 560; y2++) for (let x2 = 0; x2 < 480; x2++) {
            if (!pixels[(y2 * 480 + x2) * 4 + 3]) continue;
            left2 = Math.min(left2, x2);
            right = Math.max(right, x2 + 1);
            top2 = Math.min(top2, y2);
            bottom = Math.max(bottom, y2 + 1);
          }
          return [left2, top2, right, bottom];
        });
      }
      const poses = ["idle", ...CHAR.anim.walk || ["walkA", "walkB", "walkC", "walkD"]].map((pose) => CHAR.poses[pose]).filter(Boolean);
      const k = CHAR.k || 2;
      const width = Math.max(...poses.map((pose) => pose.w)) * k;
      const height = Math.max(...poses.map((pose) => pose.h)) * k;
      let z = 0;
      for (let i = -6; i <= 6; i++) z += floorAt(u + i, v) / 13;
      const [x, y] = S(u, v, z);
      const left = Math.round(x - width / 2), top = Math.round(y) - height + 1;
      let behind = L.findIndex((step) => step.fp), ahead = L.length;
      L.forEach((step, i) => {
        const b = WALK_EXTENTS[i];
        if (!b || left >= b[2] || left + width <= b[0] || top >= b[3] || top + height <= b[1]) return;
        if (u >= step.fp[2] || v >= step.fp[3]) behind = Math.max(behind, i + 1);
        else ahead = Math.min(ahead, i);
      });
      return Math.min(behind, ahead);
    }
    function nightLights(c) {
      [[77, 2, H - 35, 96], [SHELF[0] + SHELF[2], SHELF[1] + SHELF[3] / 2, FL + 78, 70], [DESK[0] + DESK[2] - 7, DESK[1] + 5, DZ + 18, 86], [TEA.u, TEA.v, FL + 24, 62]].forEach(([u, v, z, r]) => {
        const [x, y] = S(u, v, z);
        glow(c, x, y, r, "#ffc378", 0.19);
      });
      SCREENS.deskScreens(FIXTURES.desk).forEach((m) => {
        const ok = LINKS[m.kind] !== false, [x, y] = S(m.cu, m.v, m.z + m.h / 2);
        glow(c, x, y, 30, ok ? "#b8d8ff" : "#ff7a40", ok ? 0.13 : 0.2);
      });
    }
    function drawOverlay(c) {
      if (C.n) nightLights(c);
    }
    function layers(station, slot2) {
      ST = station;
      const walking = slot2 !== void 0, L = steps(station, walking), cut = walking ? slot2 : L.findIndex((s) => s.actor);
      const back = mk(480, 560, (c) => L.slice(0, cut).forEach((s) => s.actor || s.draw(c)));
      const front = mk(480, 560, (c) => L.slice(cut).forEach((s) => s.actor || s.draw(c)));
      return { back, front };
    }
    const NODES = {
      hub: [124, 92],
      walk: [124, 92],
      west: [32, 80],
      boardWay: [62, 60],
      // Floor arrivals stay beside the furniture; seated PLACES are unchanged.
      library: [PLACES.library.u, PLACES.library.v],
      board: [PLACES.board.u, PLACES.board.v],
      code: [136, SEAT[1]],
      eastWay: [164, 110],
      east: [220, 114],
      phoneWay: [170, 78],
      phone: [PLACES.phone.u, PLACES.phone.v],
      handoff: [PLACES.handoff.u, PLACES.handoff.v],
      doorWay: [226, 78],
      door: [PLACES.door.u, PLACES.door.v],
      meetWay: [123, 104],
      meeting: [123, MSEAT[1]],
      tea: [TEA_SEAT[0], 126],
      sleepWay: [112, 134],
      sleep: [117, 134]
    };
    const EDGES = [
      ["hub", "walk"],
      ["hub", "boardWay"],
      ["boardWay", "west"],
      ["west", "library"],
      ["boardWay", "board"],
      ["hub", "code"],
      ["hub", "eastWay"],
      ["eastWay", "east"],
      ["eastWay", "phoneWay"],
      ["phoneWay", "phone"],
      ["east", "handoff"],
      ["east", "doorWay"],
      ["doorWay", "door"],
      ["hub", "meetWay"],
      ["meetWay", "meeting"],
      ["eastWay", "tea"],
      ["hub", "sleepWay"],
      ["sleepWay", "sleep"]
    ];
    const OBSTACLES = [
      { key: "desk", bounds: B.desk },
      { key: "meeting-table", bounds: B.meeting },
      { key: "desk-chair", bounds: SEAT_FOOT, entryStops: ["code"] },
      { key: "meeting-chair", bounds: MSEAT_FOOT, entryStops: ["meeting"] },
      { key: "meeting-guest-chair", bounds: SIDE_SEAT_FOOT },
      { key: "tea-cushion", bounds: TEA_SEAT_FOOT, entryStops: ["tea"] },
      { key: "bookshelf", bounds: B.shelf },
      { key: "board", bounds: B.board },
      { key: "phone-cabinet", bounds: B.phone },
      { key: "handoff-cabinet", bounds: B.tray },
      { key: "tea-table", bounds: B.tea },
      { key: "water-court", bounds: B.court },
      { key: "fountain", bounds: B.fountain },
      { key: "orange-pot", bounds: B.orange },
      { key: "plant", bounds: B.plant },
      { key: "bed", bounds: B.bed, entryStops: ["sleep"] }
    ];
    const floorAt = (u, v) => u >= 0 && v >= 0 && u <= RU && v <= RV ? FL : 0;
    const cb = SCREENS.callBox(FIXTURES.meeting);
    const SPOTS = {
      desk: SCREENS.deskBox(FIXTURES.desk),
      tasks: [B.board[0], B.board[1], BOARD_Z, B.board[2], B.board[3], BOARD_Z + BOARD_H],
      library: [...B.shelf.slice(0, 2), FL, ...B.shelf.slice(2), FL + 102],
      meeting: [Math.min(cb[0], B.meeting[0]), Math.min(cb[1], B.meeting[1]), FL, Math.max(cb[3], MSEAT[0] + 8), Math.max(cb[4], B.meeting[3]), cb[5]],
      phone: [PHONE[0], PHONE[1], FL, PHONE[0] + PHONE[2], PHONE[1] + PHONE[3], PHONE_Z + 7],
      handoff: [TRAY[0], TRAY[1], FL, TRAY[0] + TRAY[2], TRAY[1] + TRAY[3], TZ + 5]
    };
    const PALETTES = /* @__PURE__ */ new Map();
    function use(t, weather, char, links) {
      CHAR = char;
      LINKS = { claude: !links || links.claude !== false, slack: !links || links.slack !== false };
      let byChar = PALETTES.get(char);
      if (!byChar) PALETTES.set(char, byChar = /* @__PURE__ */ new Map());
      if (!byChar.has(t)) byChar.set(t, palette(t));
      C = byChar.get(t);
    }
    function draw(c, m) {
      const t = m.t || "day", station = m.station || (t === "night" ? "sleep" : "code");
      use(t, m.weather || "clear", m.char || { poses: ACTOR.sprout, pal: X.ORIPAL.sprout }, m.links);
      ST = station;
      const place = PLACES[station] || PLACES.code;
      const image = mk(480, 560, (x) => {
        steps(station, false).forEach((s) => s.actor ? drawOri(x, place, m.pose || place.own) : s.draw(x));
        drawOverlay(x);
      });
      c.imageSmoothingEnabled = false;
      c.drawImage(image, 0, 0, 960, 1120);
    }
    const room = { STATIONS, PLACES, NODES, EDGES, SPOTS, FIXTURES, OBSTACLES, floorAt, project: S, use, slotFor, layers, drawOri, drawOverlay };
    window.OFFICE_ROOMS = window.OFFICE_ROOMS || [];
    window.OFFICE_ROOMS.push({ key: "marrakech", zh: "\u9A6C\u62C9\u5580\u4EC0\u5EAD\u9662", name: "Marrakech courtyard", room });
    CONCEPTS.push({
      key: "marrakech",
      zh: "\u9A6C\u62C9\u5580\u4EC0\u5EAD\u9662",
      name: "Marrakech courtyard",
      actor: "sprout",
      actorPal: X.ORIPAL.sprout,
      stations: STATIONS,
      angle: "\u8D6D\u7EA2\u9A6C\u8E44\u62F1\u5ECA\u56F4\u51FA\u4E00\u95F4\u5B89\u9759\u7684\u529E\u516C\u5BA4\uFF0C\u84DD\u7EFF\u82B1\u7816\u6CBF\u7740\u6D45\u77F3\u5730\u9762\uFF0C\u4E00\u4FA7\u5C0F\u6C34\u5EAD\u91CC\u6709\u55B7\u6CC9\u548C\u6A58\u5B50\u6811\u3002",
      why: "\u5728\u9A6C\u62C9\u5580\u4EC0\u7684\u79C1\u5BB6\u5EAD\u9662\u91CC\u5DE5\u4F5C\uFF1A\u6728\u4E66\u67B6\u3001\u72EC\u7ACB\u4FBF\u7B7E\u677F\u548C\u4E24\u5E2D\u4F1A\u8BAE\u684C\u56F4\u7740\u6E05\u695A\u7684\u4E2D\u95F4\u8D70\u9053\uFF0C\u95E8\u53E3\u5E72\u71E5\uFF0C\u5DE5\u4F5C\u4E0E\u4F11\u606F\u5404\u6709\u4F4D\u7F6E\u3002",
      map: "\u5DE6\u540E\u62F1\u9F9B\u662F\u4E66\u67B6\uFF0C\u65C1\u8FB9\u662F\u53EF\u8D70\u8FD1\u7684\u4E09\u5217\u4EFB\u52A1\u677F\uFF1B\u4E2D\u540E\u53CC\u5C4F\u5DE5\u4F5C\u684C\u548C\u7535\u8BDD\u67DC\uFF1B\u5DE6\u524D\u662F\u4E24\u5E2D\u671D\u5C4F\u4F1A\u8BAE\u684C\uFF1B\u53F3\u540E\u662F\u5355\u55B7\u6CC9\u548C\u6A58\u5B50\u6811\uFF0C\u6700\u53F3\u4E3A\u5E72\u71E5\u5165\u53E3\uFF1B\u6A59\u7EA2\u4EA4\u63A5\u6258\u76D8\u9760\u5165\u53E3\uFF0C\u53F3\u524D\u8336\u684C\uFF0C\u524D\u666F\u957F\u69BB\u53EF\u76D6\u6BEF\u7761\u89C9\u3002",
      cost: "\u72EC\u7ACB\u539F\u751F\u50CF\u7D20\u623F\u95F4\uFF0C\u5C4F\u5E55\u4E0E\u5750\u59FF\u6CBF\u7528\u516C\u5171\u5408\u540C\uFF0C\u8DEF\u7EBF\u7ED5\u5F00\u5BB6\u5177\u548C\u6C34\u5EAD\u3002",
      draw,
      detail: [0, 100, 480, 420]
    });
  })();
  (function() {
    "use strict";
    const { P, ell, ramp, mix, glow } = CP;
    const X = CX;
    const SCREENS = window.OFFICE_SCREENS;
    const CONTRACT = window.ROOM_CONTRACT;
    const OX = 225;
    const OY = 245;
    const RU = 220;
    const RV = 190;
    const H = 154;
    const FL = 5;
    const PB = 15;
    const S = (u, v, z) => [OX + u - v, OY + (u + v) / 2 - (z || 0)];
    const q = (ctx, pts, col) => X.poly(ctx, pts.map((p) => S(...p)), col);
    function qa(ctx, pts, col, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      q(ctx, pts, col);
      ctx.restore();
    }
    function seg(ctx, a, b, col) {
      const [x0, y0] = S(...a);
      const [x1, y1] = S(...b);
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      ctx.fillStyle = col;
      for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.floor(y0 + (y1 - y0) * i / n + 1e-6), 1, 1);
    }
    function box(ctx, u, v, z, du, dv, dz, R, opts) {
      const o = opts || {};
      const t = z + dz;
      if (dz > 0) {
        q(ctx, [[u, v + dv, z], [u + du, v + dv, z], [u + du, v + dv, t], [u, v + dv, t]], o.fv || R.m);
        q(ctx, [[u + du, v, z], [u + du, v + dv, z], [u + du, v + dv, t], [u + du, v, t]], o.fu || R.d);
      }
      q(ctx, [[u, v, t], [u + du, v, t], [u + du, v + dv, t], [u, v + dv, t]], o.top || R.l);
      if (o.edge !== false) {
        seg(ctx, [u, v + dv, t], [u + du, v + dv, t], o.hc || R.h);
        seg(ctx, [u + du, v, t], [u + du, v + dv, t], o.hc || R.h);
      }
    }
    function mk(w, h, fn) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      fn(ctx, w, h);
      return c;
    }
    function onV(ctx, img, u, v, top) {
      const [x, y] = S(u, v, top);
      for (let i = 0; i < img.width; i++) ctx.drawImage(img, i, 0, 1, img.height, x + i, y + Math.ceil(i / 2), 1, img.height);
    }
    function onU(ctx, img, u, v, top) {
      const [x, y] = S(u, v + img.width, top);
      for (let i = 0; i < img.width; i++) ctx.drawImage(img, i, 0, 1, img.height, x + i, y - Math.ceil(i / 2), 1, img.height);
    }
    function onFloor(ctx, img, u0, v0, z) {
      const w = img.width, h = img.height;
      const corners = [S(u0, v0, z), S(u0 + w, v0, z), S(u0 + w, v0 + h, z), S(u0, v0 + h, z)];
      const x0 = Math.floor(Math.min(...corners.map((p) => p[0])));
      const y0 = Math.floor(Math.min(...corners.map((p) => p[1])));
      const width = Math.ceil(Math.max(...corners.map((p) => p[0]))) - x0;
      const height = Math.ceil(Math.max(...corners.map((p) => p[1]))) - y0;
      const source = img.getContext("2d").getImageData(0, 0, w, h).data;
      const target = ctx.getImageData(x0, y0, width, height);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const xx = x0 + x + 0.5 - OX, yy = y0 + y + 0.5 - OY + z;
        const u = (xx + 2 * yy) / 2 - u0, v = (2 * yy - xx) / 2 - v0;
        if (u < 0 || v < 0 || u >= w || v >= h) continue;
        const si = (Math.floor(v) * w + Math.floor(u)) * 4, a = source[si + 3] / 255;
        if (!a) continue;
        const di = (y * width + x) * 4, da = target.data[di + 3] / 255, outA = a + da * (1 - a);
        for (let i = 0; i < 3; i++) target.data[di + i] = (source[si + i] * a + target.data[di + i] * da * (1 - a)) / outA;
        target.data[di + 3] = outA * 255;
      }
      ctx.putImageData(target, x0, y0);
    }
    function foot(ctx, bounds) {
      const [u0, v0, u1, v1] = bounds;
      qa(ctx, [[u0 + 2, v0 + 2, FL], [u1 + 3, v0 + 2, FL], [u1 + 3, v1 + 3, FL], [u0 + 2, v1 + 3, FL]], "#30231e", 0.1);
    }
    function cyl(ctx, u, v, z, radius, height, R, top) {
      const [x, bottom] = S(u, v, z);
      const rx = Math.max(1, Math.round(radius * 1.4));
      const ry = Math.max(1, Math.round(rx / 2));
      for (let i = -rx; i <= rx; i++) {
        const d = Math.round(ry * Math.sqrt(Math.max(0, 1 - i * i / (rx * rx + 0.3))));
        P(ctx, i < -rx / 3 ? R.l : i < rx / 3 ? R.m : R.d, x + i, bottom - height, 1, height + d);
      }
      ell(ctx, x, bottom - height, rx, ry, top || R.l);
    }
    const boundsOf = ([u, v, du, dv]) => [u, v, u + du, v + dv];
    const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    function mul(a, b) {
      if (!/^#[0-9a-f]{6}$/i.test(a)) return a;
      const B = hex(b);
      return "#" + hex(a).map((v, i) => Math.round(v * B[i] / 255).toString(16).padStart(2, "0")).join("");
    }
    let C;
    let CHAR;
    let ST = "code";
    let LINKS = { claude: true, slack: true };
    function palette(time2, weather) {
      const n = time2 === "night";
      const g = time2 === "golden";
      const indoor = n ? "#a79891" : g ? "#fff0db" : "#ffffff";
      const out = n ? "#485775" : g ? "#f8d5a5" : weather === "rain" ? "#bdc7cf" : "#ffffff";
      const tone = (c) => ramp(mul(c, indoor));
      const outside = (c) => mul(c, out);
      const actor = {};
      Object.entries(CHAR.pal).forEach(([key, value]) => actor[key] = n ? mul(value, "#cdbda9") : g ? mul(value, "#fff2e0") : value);
      return {
        n,
        g,
        weather,
        bg: n ? "#292a34" : g ? "#f1e0ca" : "#eee8de",
        WALL: tone("#ecd5ba"),
        PLASTER: tone("#d9ad8e"),
        STONE: tone("#d4c5af"),
        FLOOR: tone("#e5d4b9"),
        WOOD: tone("#92643f"),
        RED: tone("#984147"),
        PAPER: tone("#f4ecda"),
        DARK: tone("#363335"),
        GOLD: tone("#b58b49"),
        LEAF: tone("#70845a"),
        SAGE: tone("#acb08a"),
        BLUE: tone("#819b9a"),
        ACC: tone("#e96532"),
        sky: outside("#c8dedb"),
        facade: outside("#e4ad8d"),
        canal: outside("#5aada5"),
        ripple: outside("#b8e1d1"),
        actor
      };
    }
    const SHELF = [0, 12, 18, 62];
    const BOARD = [25, 89];
    const BZ = [FL + 40, FL + 96];
    const WINDOWS = [104, 167];
    const WINDOW_W = 46;
    const WINDOW_H = 104;
    const WINDOW_TOP = H - 2;
    const DOOR = [151, 183];
    const DESK = [94, 20, 110, 23];
    const DZ = FL + 24;
    const MEET = [26, 104, 52, 32];
    const MZ = FL + 23;
    const PHONE = [200, 51, 16, 17];
    const PHONE_Z = FL + 22;
    const TRAY = [28, 157, 20, 16];
    const TRAY_Z = FL + 16;
    const TEA = [194, 104];
    const TEA_RADIUS = 10;
    const TEA_SEAT = [175, 106];
    const TEA_OTHER = [211, 104];
    const BED = [125, 140, 82, 44];
    const BED_Z = FL + 11;
    const LAMP = [214, 133];
    const PLANT = [87, 7, 4];
    const PAIR_U = DESK[0] + DESK[2] / 2;
    const FIXTURES = {
      desk: { facing: "+v", u: PAIR_U, v: DESK[1] + 7, z: DZ + 5, seat: [PAIR_U, 52], keyboard: [PAIR_U - 13, DESK[1] + 15, DZ, 26, 5, 1] },
      meeting: { facing: "+u", u: 8, v: MEET[1] + MEET[3] / 2, z: FL + 40, seat: [MEET[0] + MEET[2] + 15, MEET[1] + MEET[3] / 2] }
    };
    const SEAT = FIXTURES.desk.seat;
    const MSEAT = FIXTURES.meeting.seat;
    const SIDE_SEAT = [74, 90];
    const chairFoot = ([u, v]) => [u - 6, v - 6, u + 8, v + 8];
    const SEAT_FOOT = chairFoot(SEAT);
    const MSEAT_FOOT = chairFoot(MSEAT);
    const SIDE_SEAT_FOOT = chairFoot(SIDE_SEAT);
    const TEA_SEAT_FOOT = chairFoot(TEA_SEAT);
    const TEA_OTHER_FOOT = chairFoot(TEA_OTHER);
    const CALL_FOOT = [3, FIXTURES.meeting.v - SCREENS.CALL_W / 2, 14, FIXTURES.meeting.v + SCREENS.CALL_W / 2];
    const TEA_FOOT = [TEA[0] - TEA_RADIUS, TEA[1] - TEA_RADIUS, TEA[0] + TEA_RADIUS, TEA[1] + TEA_RADIUS];
    const PLANT_FOOT = [PLANT[0] - PLANT[2], PLANT[1] - PLANT[2], PLANT[0] + PLANT[2], PLANT[1] + PLANT[2]];
    const LAMP_FOOT = [LAMP[0] - 3, LAMP[1] - 3, LAMP[0] + 3, LAMP[1] + 3];
    function backdrop(ctx) {
      P(ctx, C.bg, 0, 0, 480, 560);
      qa(ctx, [[-3, -3, -PB - 8], [RU + 10, -3, -PB - 8], [RU + 10, RV + 10, -PB - 8], [-3, RV + 10, -PB - 8]], "#49372c", C.n ? 0.12 : 0.055);
    }
    function floor(ctx) {
      box(ctx, -5, -5, -PB, RU + 10, RV + 10, PB, C.STONE, { edge: false });
      box(ctx, 0, 0, 0, RU, RV, FL, C.FLOOR, { edge: false });
      const seam = mix(C.FLOOR.l, C.FLOOR.m, 0.55);
      for (let u2 = 26; u2 < RU; u2 += 26) seg(ctx, [u2, 0, FL], [u2, RV, FL], seam);
      for (let v2 = 24; v2 < RV; v2 += 24) seg(ctx, [0, v2, FL], [RU, v2, FL], seam);
      if (!C.n) {
        const light = C.g ? "#ffe0a0" : "#fff7d6";
        WINDOWS.forEach((u2) => {
          qa(ctx, [[u2 - 18, 46, FL], [u2 + 5, 46, FL], [u2 - 12, 79, FL], [u2 - 35, 79, FL]], light, C.weather === "clear" ? 0.3 : 0.12);
          qa(ctx, [[u2 - 18, 46, FL], [u2 - 10, 46, FL], [u2 - 27, 79, FL], [u2 - 35, 79, FL]], C.ripple, 0.18);
        });
      }
      box(ctx, BED[0] - 8, BED[1] - 9, FL, BED[2] + 10, BED[3] + 13, 0, C.RED, { top: C.RED.m, edge: false });
      const [u, v, du, dv] = BED;
      [[u - 5, v - 6, u + du - 1, v - 6], [u - 5, v - 6, u - 5, v + dv + 1], [u - 5, v + dv + 1, u + du - 1, v + dv + 1]].forEach(([a, b, c, d]) => seg(ctx, [a, b, FL], [c, d, FL], C.GOLD.l));
    }
    function archSpan(y, width, cap) {
      const middle = (width - 1) / 2;
      const half = y >= cap ? middle : Math.floor(middle * Math.pow(Math.max(0, y) / cap, 0.62));
      return [Math.ceil(middle - half), Math.floor(middle + half)];
    }
    function archFill(ctx, width, height, cap, col, inset) {
      for (let y = inset; y < height - inset; y++) {
        const [a, b] = archSpan(y - inset, width - inset * 2, cap - inset);
        P(ctx, col, inset + a, y, b - a + 1, 1);
      }
    }
    function canalView(width, height, boat) {
      return mk(width, height, (ctx) => {
        P(ctx, C.sky, 0, 0, width, height);
        P(ctx, C.facade, 0, 14, width, 59);
        P(ctx, mix(C.facade, C.WALL.m, 0.35), 3, 17, 15, 54);
        P(ctx, C.STONE.l, 0, 70, width, 5);
        [8, 30].forEach((x) => {
          P(ctx, C.PAPER.d, x - 2, 31, 11, 23);
          P(ctx, C.n ? "#b99469" : "#526f62", x, 33, 7, 18);
          P(ctx, C.PAPER.l, x - 2, 53, 11, 2);
          P(ctx, C.LEAF.d, x, 51, 7, 2);
        });
        P(ctx, C.canal, 0, 75, width, height - 75);
        for (let k = 0; k < 9; k++) P(ctx, k % 3 ? C.ripple : mix(C.canal, C.sky, 0.25), (k * 13 + 4) % width, 77 + k * 7 % 25, 4 + k % 3, 1);
        if (boat) {
          X.poly(ctx, [[8, 91], [15, 94], [33, 93], [39, 88], [33, 96], [14, 97]], C.DARK.o);
          P(ctx, C.RED.m, 20, 92, 9, 2);
          P(ctx, C.WOOD.l, 19, 88, 11, 2);
          for (let k = 0; k < 11; k++) P(ctx, C.GOLD.m, 29 + Math.floor(k / 2), 85 + k, 1, 1);
        }
        if (C.weather === "rain") for (let k = 0; k < 18; k++) P(ctx, mix(C.sky, "#9baaba", 0.45), (k * 17 + 2) % width, (k * 23 + 7) % height, 1, 3);
        if (C.weather === "snow") for (let k = 0; k < 10; k++) P(ctx, C.PAPER.l, (k * 19 + 3) % width, (k * 29 + 4) % height, 1, 1);
      });
    }
    function windowImage(boat, open) {
      return mk(WINDOW_W, WINDOW_H, (ctx) => {
        archFill(ctx, WINDOW_W, WINDOW_H, 23, C.STONE.l, 0);
        archFill(ctx, WINDOW_W, WINDOW_H, 23, C.WOOD.d, 2);
        if (!open) {
          const view = canalView(WINDOW_W, WINDOW_H, boat);
          for (let y = 5; y < WINDOW_H - 5; y++) {
            const [a, b] = archSpan(y - 5, WINDOW_W - 10, 18);
            const x = a + 5;
            ctx.drawImage(view, x, y, b - a + 1, 1, x, y, b - a + 1, 1);
          }
        }
        P(ctx, C.WOOD.l, 4, 28, 1, WINDOW_H - 33);
        P(ctx, C.WOOD.o, WINDOW_W - 5, 28, 1, WINDOW_H - 33);
        P(ctx, C.STONE.h, 1, WINDOW_H - 3, WINDOW_W - 2, 2);
      });
    }
    function doorway(ctx) {
      const width = DOOR[1] - DOOR[0];
      const height = 86;
      const img = mk(width, height, (c) => {
        archFill(c, width, height, 17, C.STONE.d, 0);
        archFill(c, width, height, 17, C.WOOD.d, 2);
        archFill(c, width, height, 17, C.WOOD.m, 4);
        for (let x = 9; x < width - 4; x += 7) P(c, C.WOOD.d, x, 23, 1, height - 27);
        P(c, C.WOOD.l, 5, 28, width - 10, 1);
        P(c, C.WOOD.d, 5, 64, width - 10, 2);
        P(c, C.GOLD.l, 7, 48, 2, 5);
        P(c, C.GOLD.d, 8, 49, 1, 3);
      });
      onU(ctx, img, 0, DOOR[0], FL + height);
      box(ctx, 2, DOOR[0] + 3, FL, 14, width - 6, 0, C.RED, { top: C.RED.m, edge: false });
      seg(ctx, [4, DOOR[0] + 5, FL], [14, DOOR[0] + 5, FL], C.GOLD.l);
      seg(ctx, [14, DOOR[0] + 5, FL], [14, DOOR[1] - 5, FL], C.GOLD.l);
    }
    function paintWalls(ctx, opening) {
      q(ctx, [[0, 0, FL], [RU, 0, FL], [RU, 0, H], [0, 0, H]], C.WALL.m);
      q(ctx, [[0, 0, FL], [0, RV, FL], [0, RV, H], [0, 0, H]], C.WALL.d);
      [[36, 130, 11, 15], [94, 115, 9, 24], [158, 137, 6, 12], [211, 67, 7, 25]].forEach(([u, z, w, h]) => {
        q(ctx, [[u, 0, z], [u + w, 0, z - 2], [u + w - 2, 0, z + h - 4], [u + 2, 0, z + h]], C.PLASTER.l);
      });
      WINDOWS.forEach((u, i) => {
        onV(ctx, windowImage(i === 1, opening), u, 0, WINDOW_TOP);
        if (opening) {
          ctx.save();
          ctx.globalCompositeOperation = "destination-out";
          onV(ctx, opening, u, 0, WINDOW_TOP);
          ctx.restore();
        }
        box(ctx, u - 1, 0, WINDOW_TOP - WINDOW_H - 2, WINDOW_W + 2, 4, 2, C.STONE);
      });
      box(ctx, -3, -3, H, RU + 3, 3, 2, C.STONE, { top: C.STONE.h });
      box(ctx, -3, 0, H, 3, RV, 2, C.STONE, { top: C.STONE.h });
      seg(ctx, [0, 0, FL + 3], [RU, 0, FL + 3], C.STONE.l);
      seg(ctx, [0, 0, FL + 3], [0, RV, FL + 3], C.STONE.m);
      doorway(ctx);
    }
    function walls(ctx) {
      if (window.LANDSCAPES?.sceneKey()?.startsWith("venice|")) {
        const opening = mk(WINDOW_W, WINDOW_H, (c) => archFill(c, WINDOW_W, WINDOW_H, 23, "#ffffff", 5));
        const wall = mk(480, 560, (c) => paintWalls(c, opening));
        ctx.drawImage(wall, 0, 0);
      } else paintWalls(ctx, null);
    }
    function board2(ctx) {
      const width = BOARD[1] - BOARD[0];
      const height = BZ[1] - BZ[0];
      const img = mk(width, height, (c) => {
        P(c, C.WOOD.m, 0, 0, width, height);
        P(c, C.PAPER.l, 2, 2, width - 4, height - 4);
        const cw = Math.floor((width - 7) / 3);
        for (let k = 0; k < 3; k++) {
          const x = 4 + k * cw;
          if (k) P(c, C.STONE.m, x - 1, 5, 1, height - 10);
          P(c, C.LEAF.m, x + 2, 6, cw - 6, 2);
          for (let row = 0; row < 3 - (k === 2 ? 1 : 0); row++) {
            const y = 13 + row * 12;
            P(c, k === 1 ? C.SAGE.l : row % 2 ? C.SAGE.m : "#e5ce89", x + 2, y, cw - 6, 9);
            P(c, C.WOOD.l, x + 4, y + 3, cw - 11, 1);
          }
        }
      });
      onV(ctx, img, BOARD[0], 0, BZ[1]);
    }
    function plant(ctx, u, v, z, radius) {
      cyl(ctx, u, v, z, radius, 7, C.PAPER);
      const [x, y] = S(u, v, z + 7);
      P(ctx, C.WOOD.d, x, y - 16, 1, 16);
      [[-4, -6], [4, -10], [-3, -14], [2, -19]].forEach(([dx, dy], i) => {
        ell(ctx, x + dx, y + dy, 4, 3, i % 2 ? C.LEAF.m : C.LEAF.d);
        P(ctx, C.LEAF.l, x + dx - 1, y + dy - 1, 2, 1);
      });
    }
    function shelf(ctx) {
      const [u, v, du, dv] = SHELF;
      foot(ctx, boundsOf(SHELF));
      box(ctx, u, v, FL, du - 2, dv, 108, C.WOOD);
      const colors = [C.PAPER, C.SAGE, C.BLUE, C.WOOD, C.PAPER, C.RED];
      for (let level = 0; level < 4; level++) {
        const z = FL + 5 + level * 25;
        for (let b = 0; b < 10; b++) {
          const R = colors[(b + level * 2) % colors.length];
          const bh = 15 + (b * 3 + level) % 6;
          box(ctx, u + 8, v + 3 + b * 5.6, z, du - 9, 3 + b % 2, bh, R, { edge: false, fu: R.m });
        }
        box(ctx, u + du - 2, v + 1, z + 22, 2, dv - 2, 2, C.WOOD);
      }
      box(ctx, u + du - 2, v, FL, 2, 2, 108, C.WOOD);
      box(ctx, u + du - 2, v + dv - 2, FL, 2, 2, 108, C.WOOD);
      plant(ctx, u + 8, v + 13, FL + 108, 3);
      seg(ctx, [u + du, v + 4, FL + 104], [u + du, v + dv - 4, FL + 104], C.n ? "#d4b98c" : C.WOOD.h);
    }
    const look = () => ({ frame: C.DARK.o, off: C.DARK.d, accent: C.ACC.l, body: C.DARK });
    function legs(ctx, rect, top) {
      const [u, v, du, dv] = rect;
      [[u + 2, v + 2], [u + du - 5, v + 2], [u + 2, v + dv - 5], [u + du - 5, v + dv - 5]].forEach(([a, b]) => box(ctx, a, b, FL, 3, 3, top - FL - 2, C.WOOD, { edge: false }));
    }
    function deskStand(ctx, m) {
      box(ctx, m.cu - 4, m.v - 4, DZ, 8, 4, 1, C.DARK, { edge: false });
      box(ctx, m.cu - 1, m.v - 3, DZ + 1, 2, 2, m.z - DZ + 5, C.DARK, { edge: false });
    }
    function brassLamp(ctx, u, v, z) {
      cyl(ctx, u, v, z, 3, 1, C.GOLD);
      seg(ctx, [u, v, z + 1], [u, v, z + 24], C.GOLD.m);
      seg(ctx, [u, v, z + 24], [u - 6, v, z + 20], C.GOLD.l);
      const [x, y] = S(u - 6, v, z + 20);
      ell(ctx, x, y, 5, 3, C.GOLD.m);
      P(ctx, C.n ? "#ffebba" : C.GOLD.l, x - 4, y + 1, 9, 1);
      P(ctx, C.GOLD.h, x - 2, y - 2, 2, 1);
    }
    function desk(ctx) {
      const [u, v, du, dv] = DESK;
      foot(ctx, boundsOf(DESK));
      legs(ctx, DESK, DZ);
      box(ctx, u, v, DZ - 3, du, dv, 3, C.WOOD);
      SCREENS.placeDesk(ctx, FIXTURES.desk, look(), LINKS, { box, onV, stand: deskStand });
      box(ctx, ...FIXTURES.desk.keyboard, C.DARK, { edge: false, top: C.DARK.l });
      for (let row = 0; row < 2; row++) for (let col = 0; col < 8; col++) box(ctx, PAIR_U - 11 + col * 3, v + 16 + row * 2, DZ + 1, 1, 1, 0, C.DARK, { top: C.DARK.m, edge: false });
      box(ctx, PAIR_U + 18, v + 16, DZ, 3, 4, 1, C.DARK, { edge: false });
      plant(ctx, u + 7, v + 8, DZ, 2);
      brassLamp(ctx, u + du - 5, v + 9, DZ);
    }
    function chair(ctx, u, v, back, part, upholstered) {
      const R = upholstered ? C.RED : C.DARK;
      const z = FL + 11;
      const backU = back[0] === "u";
      const far = back[1] === "-";
      const offset2 = far ? -6 : 7;
      function drawBack() {
        const a = backU ? [u + offset2, v - 6, z] : [u - 6, v + offset2, z];
        const b = backU ? [u + offset2, v + 7, z] : [u + 7, v + offset2, z];
        seg(ctx, a, [a[0], a[1], z + 13], C.WOOD.m);
        seg(ctx, b, [b[0], b[1], z + 13], C.WOOD.m);
        seg(ctx, [a[0], a[1], z + 13], [b[0], b[1], z + 13], R.l);
        if (upholstered) {
          const inset = backU ? [[u + offset2, v - 4, z + 4], [u + offset2, v + 5, z + 4], [u + offset2, v + 5, z + 12], [u + offset2, v - 4, z + 12]] : [[u - 4, v + offset2, z + 4], [u + 5, v + offset2, z + 4], [u + 5, v + offset2, z + 12], [u - 4, v + offset2, z + 12]];
          q(ctx, inset, far ? R.l : R.m);
        }
      }
      if (part !== "back") {
        [[-5, -5], [5, -5], [-5, 5], [5, 5]].forEach(([a, b]) => box(ctx, u + a, v + b, FL, 2, 2, 10, C.WOOD, { edge: false }));
        if (far) drawBack();
        box(ctx, u - 6, v - 6, z - 2, 14, 14, 3, R);
      }
      if (part !== "seat" && !far) drawBack();
    }
    function callStand(ctx, m) {
      [m.v0 + 4, m.v0 + m.w - 4].forEach((v) => {
        box(ctx, m.u - 5, v - 1, FL, 10, 2, 1, C.DARK, { edge: false });
        seg(ctx, [m.u - 1, v, FL + 1], [m.u - 1, v, m.z + 4], C.DARK.m);
      });
    }
    function meetingScreen(ctx) {
      SCREENS.placeCall(ctx, FIXTURES.meeting, look(), !C.n || ST === "meeting", { box, onU, stand: callStand });
    }
    function meetingTable(ctx) {
      const [u, v, du, dv] = MEET;
      foot(ctx, boundsOf(MEET));
      legs(ctx, MEET, MZ);
      box(ctx, u, v, MZ - 3, du, dv, 3, C.WOOD);
      box(ctx, u + du - 19, v + 8, MZ, 11, 8, 1, C.SAGE, { edge: false });
      box(ctx, u + du - 18, v + 9, MZ + 1, 10, 6, 0, C.PAPER, { edge: false });
      plant(ctx, u + 13, v + dv / 2, MZ, 2);
    }
    function phone(ctx, inUse) {
      const [u, v, du, dv] = PHONE;
      foot(ctx, boundsOf(PHONE));
      box(ctx, u, v, FL, du, dv, PHONE_Z - FL, C.WOOD);
      seg(ctx, [u + 7, v + dv, FL + 3], [u + 7, v + dv, PHONE_Z - 3], C.WOOD.d);
      box(ctx, u + 2, v + 3, PHONE_Z, 12, 10, 3, C.DARK, { edge: false });
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) box(ctx, u + 8 + a * 2, v + 6 + b * 2, PHONE_Z + 3, 1, 1, 0, C.PAPER, { edge: false });
      if (!inUse) {
        box(ctx, u + 3, v + 3, PHONE_Z + 3, 3, 10, 2, C.DARK, { edge: false });
        box(ctx, u + 2, v + 3, PHONE_Z + 4, 5, 3, 2, C.DARK, { edge: false });
        box(ctx, u + 2, v + 10, PHONE_Z + 4, 5, 3, 2, C.DARK, { edge: false });
      }
    }
    function tray(ctx, lit) {
      const [u, v, du, dv] = TRAY;
      foot(ctx, boundsOf(TRAY));
      legs(ctx, TRAY, TRAY_Z);
      box(ctx, u, v, TRAY_Z - 2, du, dv, 2, C.WOOD);
      box(ctx, u + 1, v + 1, TRAY_Z, du - 2, dv - 2, 3, C.ACC, { top: C.ACC.d });
      box(ctx, u + 3, v + 3, TRAY_Z + 3, du - 6, dv - 6, 1, C.PAPER);
      box(ctx, u + 4, v + 4, TRAY_Z + 4, du - 7, dv - 7, 1, C.PAPER);
      if (lit) {
        const [x, y] = S(u + du / 2, v + dv / 2, TRAY_Z + 5);
        glow(ctx, x, y, 20, "#ffab72", 0.2);
      }
    }
    function teaTable(ctx) {
      const [u, v] = TEA;
      const z = FL + 22;
      cyl(ctx, u, v, FL, 4, 1, C.WOOD);
      cyl(ctx, u, v, FL + 1, 1.5, z - FL - 1, C.WOOD);
      cyl(ctx, u, v, z, TEA_RADIUS, 2, C.WOOD);
      cyl(ctx, u, v, z + 2, 3, 6, C.PAPER);
      cyl(ctx, u, v, z + 8, 2, 1, C.PAPER);
      seg(ctx, [u - 2, v, z + 6], [u - 6, v, z + 9], C.PAPER.l);
      seg(ctx, [u - 6, v, z + 9], [u - 7, v, z + 9], C.PAPER.d);
      [[u + 3, v, z + 4, u + 5, v, z + 4], [u + 5, v, z + 4, u + 5, v, z + 8], [u + 5, v, z + 8, u + 3, v, z + 8]].forEach(([a, b, c, d, e, f]) => seg(ctx, [a, b, c], [d, e, f], C.PAPER.m));
      [[u - 3, v + 6], [u + 5, v - 4]].forEach(([a, b]) => cyl(ctx, a, b, z + 2, 1.5, 3, C.PAPER, C.WOOD.d));
    }
    function bed(ctx) {
      const [u, v, du, dv] = BED;
      foot(ctx, boundsOf(BED));
      [[u + 3, v + 3], [u + du - 6, v + 3], [u + 3, v + dv - 6], [u + du - 6, v + dv - 6]].forEach(([a, b]) => box(ctx, a, b, FL, 3, 3, 5, C.WOOD));
      box(ctx, u, v, FL + 4, du, dv, 4, C.WOOD);
      box(ctx, u + 2, v + 3, FL + 8, du - 4, dv - 5, 3, C.RED);
      box(ctx, u + 2, v, FL + 7, du - 4, 4, 14, C.RED);
      box(ctx, u, v + 1, FL + 7, 4, dv - 1, 11, C.RED);
      box(ctx, u + 7, v + 6, BED_Z, 19, dv - 12, 3, C.PAPER);
    }
    function bedFront(ctx) {
      const [u, v, du, dv] = BED;
      box(ctx, u + du - 4, v + 1, FL + 7, 4, dv - 1, 11, C.RED);
    }
    function foldedThrow(ctx) {
      const [u, v, du, dv] = BED;
      box(ctx, u + du - 30, v + 6, BED_Z, 23, dv - 8, 3, C.PAPER);
      box(ctx, u + du - 28, v + 7, BED_Z + 3, 3, dv - 9, 0, C.GOLD, { edge: false, top: C.GOLD.l });
    }
    function floorLamp(ctx) {
      const [u, v] = LAMP;
      cyl(ctx, u, v, FL, 3, 1, C.GOLD);
      seg(ctx, [u, v, FL + 1], [u, v, FL + 58], C.GOLD.m);
      const [x, y] = S(u, v, FL + 58);
      for (let row = 0; row < 13; row++) P(ctx, C.n ? "#f6d69a" : C.PAPER.l, x - 4 - Math.floor(row / 4), y + row, 9 + Math.floor(row / 4) * 2, 1);
      P(ctx, C.GOLD.m, x - 7, y + 13, 15, 1);
    }
    const ACTOR_K = 2;
    const SPRITES = /* @__PURE__ */ new WeakMap();
    const TUCKED = /* @__PURE__ */ new WeakMap();
    function sprite(s) {
      let byPal = SPRITES.get(s);
      if (!byPal) SPRITES.set(s, byPal = /* @__PURE__ */ new WeakMap());
      let img = byPal.get(C.actor);
      if (!img) byPal.set(C.actor, img = mk(s.w, s.h, (ctx) => PX.paint(ctx, s, C.actor, 0, 0)));
      return img;
    }
    function poseSprite(pose) {
      if (pose === "turn") return CONTRACT.turnSprite(CHAR, false);
      if (pose === "turnL") return CONTRACT.turnSprite(CHAR, true);
      return CHAR.poses[pose] || CHAR.poses.idle;
    }
    function tucked(s, K) {
      const source = sprite(s), w = s.w * K, h = s.h * K;
      let img = TUCKED.get(source);
      if (img) return img;
      img = mk(w, h, (ctx) => {
        ctx.drawImage(source, 0, 0, w, h);
        if (s.rows.some((row) => /[qQ]/.test(row))) return;
        const pixels = ctx.getImageData(0, 0, w, h).data;
        const eyeEnd = Math.max(...s.rows.map((row) => row.lastIndexOf("e"))) + 1;
        const fold = Math.max(Math.round(w * 0.48), (eyeEnd + 3) * K);
        for (let x = fold; x < w; x++) {
          let top = -1;
          for (let y = 0; y < h; y++) if (pixels[(y * w + x) * 4 + 3]) {
            top = y;
            break;
          }
          if (top < 0) continue;
          P(ctx, C.PAPER.l, x, Math.max(0, top - 1), 1, h - top + 1);
          P(ctx, C.GOLD.l, x, Math.max(0, top - 1), 1, 1);
        }
      });
      TUCKED.set(source, img);
      return img;
    }
    function drawOri(ctx, place, pose) {
      const s = poseSprite(pose);
      const K = CHAR.k || ACTOR_K;
      if (place.lie) {
        const img = tucked(s, K);
        window.ROOM_PAINTER.sleeper(ctx, img, S, { u: place.u - img.width / 2, v: place.v - img.height / 2, z: place.z, w: img.width, d: img.height });
        return null;
      }
      const [x, y] = S(place.u, place.v, place.z);
      const w = s.w * K;
      const h = s.h * K;
      const left = Math.round(x - w / 2);
      const top = Math.round(y) - h + 1;
      ctx.drawImage(sprite(s), left, top, w, h);
      return { left, top, w, h };
    }
    const STATIONS = CONTRACT.STATIONS;
    const PLACES = {
      code: { u: SEAT[0], v: SEAT[1], z: FL + 12, own: "turn", shared: "turn", sit: true },
      work: { u: SEAT[0], v: SEAT[1], z: FL + 12, own: "turn", shared: "turn", sit: true },
      meeting: { u: MSEAT[0], v: MSEAT[1], z: FL + 12, own: "turnL", shared: "turnL", sit: true },
      library: { u: 30, v: 43, z: FL, own: "read", shared: "back" },
      board: { u: 60, v: 16, z: FL, own: "post", shared: "back" },
      phone: { u: 201, v: 80, z: FL, own: "phone", shared: "idle" },
      handoff: { u: 60, v: 164, z: FL, own: "attention", shared: "idle", bang: true },
      tea: { u: TEA_SEAT[0], v: TEA_SEAT[1], z: FL + 12, own: "tea", shared: "tea", sit: true },
      door: { u: 12, v: 170, z: FL, own: "wave", shared: "idle" },
      walk: { u: 120, v: 96, z: FL, own: "walkA", shared: "walkA" },
      sleep: { u: BED[0] + BED[2] / 2, v: BED[1] + BED[3] / 2, z: BED_Z + 1, own: "sleep", shared: "sleep", lie: true }
    };
    function steps(station, walking) {
      const L = [];
      const add = (draw2, fp) => L.push({ draw: draw2, fp });
      const actor = () => L.push({ actor: true });
      const at2 = (...names) => !walking && names.includes(station);
      add(backdrop);
      add(floor);
      add(walls);
      add(board2);
      add(shelf, boundsOf(SHELF));
      add((c) => plant(c, PLANT[0], PLANT[1], FL, PLANT[2]), PLANT_FOOT);
      if (at2("library", "board")) actor();
      add(desk, boundsOf(DESK));
      add((c) => chair(c, SEAT[0], SEAT[1], "v+", "seat", false), SEAT_FOOT);
      if (at2("code", "work")) actor();
      add((c) => chair(c, SEAT[0], SEAT[1], "v+", "back", false), SEAT_FOOT);
      add((c) => phone(c, station === "phone"), boundsOf(PHONE));
      if (at2("phone")) actor();
      add(meetingScreen, CALL_FOOT);
      add(meetingTable, boundsOf(MEET));
      add((c) => chair(c, SIDE_SEAT[0], SIDE_SEAT[1], "u+", null, true), SIDE_SEAT_FOOT);
      add((c) => chair(c, MSEAT[0], MSEAT[1], "u+", "seat", true), MSEAT_FOOT);
      if (at2("meeting")) actor();
      add((c) => chair(c, MSEAT[0], MSEAT[1], "u+", "back", true), MSEAT_FOOT);
      if (at2("walk", "door")) actor();
      add((c) => tray(c, station === "handoff"), boundsOf(TRAY));
      if (at2("handoff")) actor();
      add((c) => chair(c, TEA_OTHER[0], TEA_OTHER[1], "u+", null, true), TEA_OTHER_FOOT);
      add(teaTable, TEA_FOOT);
      add((c) => chair(c, TEA_SEAT[0], TEA_SEAT[1], "u-", "seat", true), TEA_SEAT_FOOT);
      if (at2("tea")) actor();
      add((c) => chair(c, TEA_SEAT[0], TEA_SEAT[1], "u-", "back", true), TEA_SEAT_FOOT);
      add(bed, boundsOf(BED));
      if (at2("sleep")) {
        actor();
      } else add(foldedThrow, boundsOf(BED));
      add(bedFront, [BED[0] + BED[2] - 4, BED[1], BED[0] + BED[2], BED[1] + BED[3]]);
      add(floorLamp, LAMP_FOOT);
      return L;
    }
    let WALK_EXTENTS;
    function slotFor(station, u, v) {
      const L = steps(station, true);
      if (!WALK_EXTENTS) {
        ST = station;
        WALK_EXTENTS = L.map((step) => {
          if (!step.fp) return null;
          const image = mk(480, 560, step.draw);
          const pixels = image.getContext("2d").getImageData(0, 0, 480, 560).data;
          let left2 = 480, top2 = 560, right = 0, bottom = 0;
          for (let y2 = 0; y2 < 560; y2++) for (let x2 = 0; x2 < 480; x2++) {
            if (!pixels[(y2 * 480 + x2) * 4 + 3]) continue;
            left2 = Math.min(left2, x2);
            right = Math.max(right, x2 + 1);
            top2 = Math.min(top2, y2);
            bottom = Math.max(bottom, y2 + 1);
          }
          return [left2, top2, right, bottom];
        });
      }
      const poses = ["idle", ...CHAR.anim.walk || ["walkA", "walkB", "walkC", "walkD"]].map((pose) => CHAR.poses[pose]).filter(Boolean);
      const k = CHAR.k || 2;
      const width = Math.max(...poses.map((pose) => pose.w)) * k;
      const height = Math.max(...poses.map((pose) => pose.h)) * k;
      let z = 0;
      for (let i = -6; i <= 6; i++) z += floorAt(u + i, v) / 13;
      const [x, y] = S(u, v, z);
      const left = Math.round(x - width / 2), top = Math.round(y) - height + 1;
      let behind = L.findIndex((step) => step.fp), ahead = L.length;
      L.forEach((step, i) => {
        const b = WALK_EXTENTS[i];
        if (!b || left >= b[2] || left + width <= b[0] || top >= b[3] || top + height <= b[1]) return;
        if (u >= step.fp[2] || v >= step.fp[3]) behind = Math.max(behind, i + 1);
        else ahead = Math.min(ahead, i);
      });
      return Math.min(behind, ahead);
    }
    function nightLights(ctx) {
      [[DESK[0] + DESK[2] - 11, DESK[1] + 9, DZ + 20, 76, 0.2], [LAMP[0], LAMP[1], FL + 63, 83, 0.25], [SHELF[0] + SHELF[2], SHELF[1] + SHELF[3] / 2, FL + 85, 82, 0.16]].forEach(([u, v, z, radius, alpha]) => {
        const [x, y] = S(u, v, z);
        glow(ctx, x, y, radius, "#ffd29b", alpha);
      });
      SCREENS.deskScreens(FIXTURES.desk).forEach((m) => {
        const [x, y] = S(m.cu, m.v, m.z + m.h / 2);
        glow(ctx, x, y, 28, LINKS[m.kind] ? "#bfd5ef" : "#ff925c", 0.13);
      });
    }
    function drawOverlay(ctx) {
      if (C.n) nightLights(ctx);
    }
    function layers(station, slot2) {
      ST = station;
      const walking = slot2 !== void 0;
      const L = steps(station, walking);
      const cut = walking ? slot2 : L.findIndex((s) => s.actor);
      const back = mk(480, 560, (c) => L.slice(0, cut).forEach((s) => s.actor || s.draw(c)));
      const front = mk(480, 560, (c) => {
        L.slice(cut).forEach((s) => s.actor || s.draw(c));
      });
      return { back, front };
    }
    const NODES = {
      hub: [120, 95],
      walk: [PLACES.walk.u, PLACES.walk.v],
      deskWay: [PAIR_U, 82],
      code: [164, SEAT[1]],
      boardWay: [62, 76],
      board: [PLACES.board.u, PLACES.board.v],
      library: [PLACES.library.u, PLACES.library.v],
      east: [180, 78],
      phone: [PLACES.phone.u, PLACES.phone.v],
      west: [93, 95],
      meeting: [108, MSEAT[1]],
      southWest: [93, 148],
      entrance: [17, 148],
      door: [PLACES.door.u, PLACES.door.v],
      trayWay: [60, 148],
      handoff: [PLACES.handoff.u, PLACES.handoff.v],
      teaWay: [171, 126],
      tea: [160, TEA_SEAT[1]],
      bedWay: [119, 141],
      sleep: [119, PLACES.sleep.v]
    };
    const EDGES = [
      ["hub", "walk"],
      ["hub", "deskWay"],
      ["deskWay", "code"],
      ["hub", "boardWay"],
      ["boardWay", "library"],
      ["boardWay", "board"],
      ["hub", "east"],
      ["east", "phone"],
      ["hub", "west"],
      ["west", "meeting"],
      ["hub", "southWest"],
      ["southWest", "entrance"],
      ["entrance", "door"],
      ["southWest", "trayWay"],
      ["trayWay", "handoff"],
      ["hub", "teaWay"],
      ["teaWay", "tea"],
      ["hub", "bedWay"],
      ["bedWay", "sleep"]
    ];
    const OBSTACLES = [
      { key: "library", bounds: boundsOf(SHELF) },
      { key: "desk", bounds: boundsOf(DESK) },
      { key: "meeting-table", bounds: boundsOf(MEET) },
      { key: "desk-chair", bounds: SEAT_FOOT, entryStops: ["code"] },
      { key: "meeting-chair", bounds: MSEAT_FOOT, entryStops: ["meeting"] },
      { key: "meeting-guest-chair", bounds: SIDE_SEAT_FOOT },
      { key: "tea-chair", bounds: TEA_SEAT_FOOT, entryStops: ["tea"] },
      { key: "tea-guest-chair", bounds: TEA_OTHER_FOOT },
      { key: "call-stand", bounds: CALL_FOOT },
      { key: "phone", bounds: boundsOf(PHONE) },
      { key: "handoff", bounds: boundsOf(TRAY) },
      { key: "tea-table", bounds: TEA_FOOT },
      { key: "daybed", bounds: boundsOf(BED), entryStops: ["sleep"] },
      { key: "plant", bounds: PLANT_FOOT },
      { key: "floor-lamp", bounds: LAMP_FOOT }
    ];
    const floorAt = (u, v) => u >= 0 && v >= 0 && u <= RU && v <= RV ? FL : 0;
    const callBox = SCREENS.callBox(FIXTURES.meeting);
    const SPOTS = {
      desk: SCREENS.deskBox(FIXTURES.desk),
      tasks: [BOARD[0], -1, BZ[0], BOARD[1], 1, BZ[1]],
      library: [SHELF[0], SHELF[1], FL, SHELF[0] + SHELF[2], SHELF[1] + SHELF[3], FL + 110],
      meeting: [callBox[0], callBox[1], FL, MSEAT[0] + 8, Math.max(callBox[4], MEET[1] + MEET[3]), callBox[5]],
      phone: [PHONE[0], PHONE[1], FL, PHONE[0] + PHONE[2], PHONE[1] + PHONE[3], PHONE_Z + 8],
      handoff: [TRAY[0], TRAY[1], FL, TRAY[0] + TRAY[2], TRAY[1] + TRAY[3], TRAY_Z + 6]
    };
    const PALETTES = /* @__PURE__ */ new WeakMap();
    function use(time2, weather, char, links) {
      CHAR = char;
      LINKS = { claude: !links || links.claude !== false, slack: !links || links.slack !== false };
      let byTime = PALETTES.get(char);
      if (!byTime) PALETTES.set(char, byTime = /* @__PURE__ */ new Map());
      const key = time2 + "|" + weather;
      if (!byTime.has(key)) byTime.set(key, palette(time2, weather));
      C = byTime.get(key);
    }
    function draw(ctx, m) {
      const time2 = m.t || "day";
      const station = m.station || (time2 === "night" ? "sleep" : "code");
      use(time2, m.weather || "clear", m.char || { poses: ACTOR.sprout, pal: X.ORIPAL.sprout }, m.links);
      ST = station;
      const place = PLACES[station] || PLACES.code;
      const image = mk(480, 560, (c) => {
        steps(station, false).forEach((s) => s.actor ? drawOri(c, place, m.pose || place.own) : s.draw(c));
        if (station === "sleep") {
          const [x, y] = S(BED[0] + 9, BED[1] + 12, FL + 45);
          X.zzz(c, x, y, C.n ? C.PAPER.l : C.WOOD.d);
        }
        drawOverlay(c);
      });
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0, 960, 1120);
    }
    const room = { STATIONS, PLACES, NODES, EDGES, SPOTS, FIXTURES, OBSTACLES, floorAt, project: S, use, slotFor, layers, drawOri, drawOverlay };
    window.OFFICE_ROOMS = window.OFFICE_ROOMS || [];
    window.OFFICE_ROOMS.push({ key: "venice", zh: "\u5A01\u5C3C\u65AF\u8FD0\u6CB3\u4E66\u623F", name: "Venetian canal study", room });
    CONCEPTS.push({
      key: "venice",
      zh: "\u5A01\u5C3C\u65AF\u8FD0\u6CB3\u4E66\u623F",
      name: "Venetian canal study",
      actor: "sprout",
      actorPal: X.ORIPAL.sprout,
      stations: STATIONS,
      angle: "\u5A01\u5C3C\u65AF\u5C16\u62F1\u9AD8\u7A97\u4E0B\u7684\u80E1\u6843\u6728\u4E66\u623F\uFF0C\u7A97\u5916\u662F\u78A7\u7EFF\u8FD0\u6CB3\u3001\u5BF9\u5CB8\u65E7\u697C\u548C\u4E00\u8258\u5C0F\u8239\u3002",
      why: "\u6696\u7070\u6CE5\u3001\u6697\u7EA2\u7EC7\u7269\u548C\u9EC4\u94DC\u706F\u56F4\u6210\u4E00\u95F4\u53EF\u4EE5\u5DE5\u4F5C\u3001\u5F00\u4F1A\u3001\u559D\u8336\u548C\u8EBA\u4E0B\u4F11\u606F\u7684\u5C0F\u529E\u516C\u5BA4\u3002",
      map: "\u5DE6\u540E\u662F\u4E66\u67B6\u4E0E\u5165\u53E3\uFF0C\u5DE6\u4FA7\u4F1A\u8BAE\u5C4F\u524D\u53EA\u6709\u4E24\u5E2D\uFF1B\u53F3\u540E\u662F\u4E09\u5217\u4EFB\u52A1\u677F\u3001\u53CC\u5C4F\u4E66\u684C\u4E0E\u7535\u8BDD\u3002\u5165\u53E3\u4FA7\u662F\u6A59\u7EA2\u4EA4\u63A5\u6258\u76D8\uFF0C\u53F3\u524D\u662F\u72EC\u7ACB\u8336\u684C\u548C\u6795\u6BEF\u8EBA\u69BB\uFF0C\u4E2D\u592E\u7559\u51FA\u8D70\u9053\u3002",
      cost: "\u623F\u95F4\u5BB6\u5177\u3001\u7A97\u666F\u548C\u8DEF\u7EBF\u72EC\u7ACB\u7ED8\u5236\uFF0C\u5C4F\u5E55\u753B\u9762\u3001\u5C4F\u5E55\u671D\u5411\u548C\u5EA7\u4F4D\u4ECD\u4F7F\u7528\u529E\u516C\u5BA4\u5171\u7528\u5408\u540C\u3002",
      draw,
      detail: [0, 110, 480, 440]
    });
  })();
  (function() {
    "use strict";
    const { P, ell, ramp, glow } = CP;
    const X = CX;
    const SCREENS = window.OFFICE_SCREENS;
    const CONTRACT = window.ROOM_CONTRACT;
    const OX = 230, OY = 230, RU = 228, RV = 204, H = 136, FL = 4, PB = 14;
    const S = (u, v, z) => [OX + u - v, OY + (u + v) / 2 - (z || 0)];
    const q = (ctx, pts, c) => X.poly(ctx, pts.map((p) => S(p[0], p[1], p[2])), c);
    function qa(ctx, pts, c, a) {
      ctx.save();
      ctx.globalAlpha = a;
      q(ctx, pts, c);
      ctx.restore();
    }
    function seg(ctx, a, b, c) {
      const [x0, y0] = S(a[0], a[1], a[2]);
      const [x1, y1] = S(b[0], b[1], b[2]);
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      ctx.fillStyle = c;
      for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.floor(y0 + (y1 - y0) * i / n + 1e-6), 1, 1);
    }
    function box(ctx, u, v, z, du, dv, dz, R, o) {
      o = o || {};
      const t = z + dz;
      if (dz > 0) {
        q(ctx, [[u, v + dv, z], [u + du, v + dv, z], [u + du, v + dv, t], [u, v + dv, t]], o.fv || R.m);
        q(ctx, [[u + du, v, z], [u + du, v + dv, z], [u + du, v + dv, t], [u + du, v, t]], o.fu || R.d);
      }
      q(ctx, [[u, v, t], [u + du, v, t], [u + du, v + dv, t], [u, v + dv, t]], o.top || R.l);
      if (o.edge !== false) {
        seg(ctx, [u, v + dv, t], [u + du, v + dv, t], o.hc || R.h);
        seg(ctx, [u + du, v, t], [u + du, v + dv, t], o.hc || R.h);
      }
    }
    function foot(ctx, u, v, du, dv, z) {
      qa(ctx, [[u, v, z], [u + du + 3, v, z], [u + du + 3, v + dv + 3, z], [u, v + dv + 3, z]], "#2a2018", 0.1);
    }
    function mk(w, h, fn) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d");
      x.imageSmoothingEnabled = false;
      fn(x, w, h);
      return c;
    }
    function onV(ctx, img, u0, vp, zTop) {
      const [x0, y0] = S(u0, vp, zTop);
      for (let i = 0; i < img.width; i++) ctx.drawImage(img, i, 0, 1, img.height, x0 + i, y0 + Math.ceil(i / 2), 1, img.height);
    }
    function onU(ctx, img, up, v0, zTop) {
      const w = img.width;
      const [x0, y0] = S(up, v0 + w, zTop);
      for (let i = 0; i < w; i++) ctx.drawImage(img, i, 0, 1, img.height, x0 + i, y0 - Math.ceil(i / 2), 1, img.height);
    }
    let C, CHAR, ST = "walk", LINKS = { claude: true, slack: true };
    const colors = {
      FLOOR: "#d5d4ca",
      WALL: "#f3eddd",
      WOOD: "#a05e31",
      DARK: "#363a3d",
      BLUE: "#28598b",
      GREEN: "#78954b",
      PAPER: "#f7f1df",
      ACC: "#e96b36",
      ROOF: "#606872"
    };
    function tint(hex, night, golden) {
      const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      const k = night ? [0.55, 0.58, 0.7] : golden ? [1, 0.92, 0.78] : [1, 1, 1];
      return "#" + channels.map((n, i) => Math.round(n * k[i]).toString(16).padStart(2, "0")).join("");
    }
    function palette(t) {
      const n = t === "night", golden = t === "golden";
      const result = { n, bg: n ? "#303743" : golden ? "#eee1d0" : "#f0ece3", actor: {} };
      for (const [key, value] of Object.entries(colors)) result[key] = ramp(tint(value, n, golden));
      for (const [key, value] of Object.entries(CHAR.pal)) result.actor[key] = tint(value, n, golden);
      return result;
    }
    const DOOR = [158, 196];
    const SHELF = [2, 22, 16, 64];
    const BOARD = [18, 78];
    const DESK = [92, 12, 112, 27], DZ = FL + 28;
    const MEET = [30, 103, 34, 34], MZ = FL + 24;
    const BED = [188, 103, 34, 88], BZ = FL + 12;
    const PHONE = [206, 12, 20, 26];
    const TRAY = [9, 146, 18, 10];
    const TEA = { u: 98, v: 181, radius: 17, seats: [[70, 181], [126, 181]], seatRadius: 8 };
    const teaBounds = [TEA.u - TEA.radius, TEA.v - TEA.radius, TEA.u + TEA.radius, TEA.v + TEA.radius];
    const stoolBounds = ([u, v]) => [u - TEA.seatRadius, v - TEA.seatRadius, u + TEA.seatRadius, v + TEA.seatRadius];
    const FIXTURES = {
      desk: { facing: "+v", u: 148, v: 22, z: DZ + 9, seat: [148, 53], keyboard: [135, 34, DZ, 26, 5, 1] },
      meeting: { facing: "+u", u: 9, v: 120, z: FL + 45, seat: [83, 120] }
    };
    const SEAT = FIXTURES.desk.seat, MSEAT = FIXTURES.meeting.seat;
    const chair = {
      desk: { seat: [SEAT[0] - 10, SEAT[1] - 9, 20, 18], back: [SEAT[0] - 10, SEAT[1] + 9, 20, 3], axis: "v" },
      meeting: { seat: [74, 111, 18, 18], back: [92, 111, 3, 18], axis: "u" }
    };
    const rect = ([u, v, du, dv]) => [u, v, u + du, v + dv];
    const solids = [
      { name: "library", box: rect(SHELF) },
      { name: "desk", box: rect(DESK) },
      { name: "work seat", box: rect(chair.desk.seat), access: "code" },
      { name: "work back", box: rect(chair.desk.back) },
      { name: "meeting screen", box: [5, 95, 14, 145] },
      { name: "meeting table", box: rect(MEET) },
      { name: "meeting seat", box: rect(chair.meeting.seat), access: "meeting" },
      { name: "meeting back", box: rect(chair.meeting.back) },
      { name: "phone cabinet", box: rect(PHONE) },
      { name: "handoff cabinet", box: rect(TRAY) },
      { name: "daybed", box: rect(BED) },
      { name: "tea table", box: teaBounds },
      { name: "tea seat", box: stoolBounds(TEA.seats[0]), access: "tea" },
      { name: "guest stool", box: stoolBounds(TEA.seats[1]) },
      { name: "corner plant", box: [20, 6, 28, 14] },
      { name: "floor flowers", box: [216, 71, 224, 79] }
    ];
    function backdrop(ctx) {
      P(ctx, C.bg, 0, 0, 480, 560);
    }
    function floor(ctx) {
      box(ctx, -14, -4, -PB, RU + 18, RV + 12, PB, C.FLOOR, { edge: false });
      box(ctx, -12, 0, 0, RU + 12, RV, FL, C.FLOOR, { edge: false });
      for (let u = 0; u < RU; u += 22) seg(ctx, [u, 0, FL], [u, RV, FL], C.FLOOR.m);
      for (let v = 0; v < RV; v += 22) seg(ctx, [-12, v, FL], [RU, v, FL], C.FLOOR.m);
      for (let v = 160; v < 200; v += 8)
        for (let u = -12; u < 0; u += 6)
          box(ctx, u, v, FL, 5, 7, 0, C.FLOOR, { top: (v + u) % 3 ? C.FLOOR.l : C.FLOOR.d, edge: false });
    }
    function mountains(c, w, h) {
      P(c, C.n ? "#34465d" : "#b9d9e5", 0, 0, w, h);
      const poly = (pts, color) => X.poly(c, pts, color);
      poly([[0, 38], [14, 30], [23, 34], [43, 9], [54, 18], [64, 5], [77, 22], [88, 16], [w, 39], [w, h], [0, h]], C.n ? "#4b6178" : "#82a3bc");
      poly([[14, 50], [36, 32], [48, 21], [62, 38], [76, 25], [94, 45], [w, 40], [w, h], [0, h]], C.n ? "#536e83" : "#7197b0");
      poly([[37, 15], [43, 9], [54, 18], [49, 18], [44, 14], [39, 21]], C.PAPER.l);
      poly([[58, 12], [64, 5], [77, 22], [68, 15], [64, 12], [60, 16]], C.PAPER.l);
      P(c, C.WALL.m, 0, h - 12, w, 12);
      P(c, C.ROOF.d, 0, h - 16, w, 4);
      for (let x = 0; x < w; x += 6) {
        P(c, C.ROOF.l, x, h - 18, 4, 3);
        P(c, C.ROOF.m, x + 1, h - 19, 2, 2);
      }
      P(c, C.WOOD.d, 13, h - 31, 3, 31);
      P(c, C.WOOD.d, 8, h - 28, 8, 2);
      for (const [x, y] of [[3, h - 25], [11, h - 34], [21, h - 27], [28, h - 17], [9, h - 15], [44, h - 9], [68, h - 5], [99, h - 7]])
        blossom(c, x, y, 7);
    }
    function blossom(c, x, y, size) {
      P(c, C.GREEN.d, x - size, y - 2, size * 2, 6);
      P(c, C.GREEN.m, x - size + 2, y - 5, size * 2 - 3, 7);
      P(c, C.GREEN.l, x - 3, y - 7, 5, 4);
      for (const [dx, dy] of [[-4, -2], [2, 2]]) {
        P(c, C.PAPER.l, x + dx - 2, y + dy - 1, 5, 3);
        P(c, C.PAPER.l, x + dx - 1, y + dy - 2, 3, 5);
        P(c, "#e4c568", x + dx, y + dy, 1, 1);
      }
    }
    function garden(c, w, h) {
      P(c, C.n ? "#38465a" : "#c4dbe0", 0, 0, w, h);
      P(c, C.WALL.l, 0, h - 42, w, 42);
      for (let x = 0; x < w; x += 5) {
        P(c, C.ROOF.d, x, h - 46, 5, 4);
        P(c, C.ROOF.l, x + 1, h - 48, 3, 3);
      }
      P(c, C.FLOOR.l, 0, h - 17, w, 17);
      for (let y = h - 15; y < h; y += 6)
        for (let x = 0; x < w; x += 7) P(c, C.FLOOR.d, x + y % 2, y, 5, 1);
      P(c, C.WOOD.d, 18, 23, 4, h - 39);
      P(c, C.WOOD.m, 10, 32, 11, 3);
      P(c, C.WOOD.m, 20, 27, 11, 3);
      for (const [x, y] of [[7, 24], [15, 17], [25, 19], [31, 29], [11, 35], [24, 37], [18, 27]]) blossom(c, x, y, 7);
      blossom(c, 4, h - 16, 5);
    }
    function baiBand(w, h, vertical) {
      return mk(w, h, (c) => {
        P(c, C.BLUE.d, 0, 0, w, h);
        P(c, C.PAPER.l, 0, 1, w, 1);
        P(c, C.PAPER.l, 0, h - 2, w, 1);
        const diamond = (x, y) => [[0, -2], [-1, -1], [1, -1], [-2, 0], [2, 0], [-1, 1], [1, 1], [0, 2]].forEach(([dx, dy]) => P(c, C.PAPER.l, x + dx, y + dy, 1, 1));
        if (vertical) {
          for (let y = 7; y < h - 4; y += 12) {
            diamond(Math.floor(w / 2), y);
            P(c, C.PAPER.l, Math.floor(w / 2), y + 5, 1, 2);
          }
        } else for (let x = 5; x < w - 3; x += 10) diamond(x, Math.floor(h / 2));
      });
    }
    function tiledEave(ctx, length, origin, axis) {
      const toWorld = (a, b, z) => axis === "u" ? [origin[0] + a, origin[1] + b, origin[2] + z] : [origin[0] + b, origin[1] + a, origin[2] + z];
      const face = (points, color) => q(ctx, points.map(([a, b, z]) => toWorld(a, b, z)), color);
      const profile = [[0, 0], [0, 1], [1, 3], [3, 4], [5, 4], [7, 3], [8, 1], [8, 0]];
      face([[0, -5, -1], [length, -5, -1], [length, 8, -1], [0, 8, -1]], C.ROOF.d);
      for (let a = 0; a < length; a += 9) {
        for (const [b, rise] of [[-5, 2], [1, 0]]) {
          for (let i = 1; i < profile.length - 2; i++) {
            const [x0, z0] = profile[i], [x1, z1] = profile[i + 1];
            face([[a + x0, b, z0 + rise + 2], [a + x1, b, z1 + rise + 2], [a + x1, b + 7, z1 + rise], [a + x0, b + 7, z0 + rise]], i < 3 ? C.ROOF.l : C.ROOF.m);
          }
          face(profile.map(([x, z]) => [a + x, b + 7, z + rise]), C.ROOF.d);
          seg(ctx, toWorld(a + 1, b + 7, rise + 1), toWorld(a + 7, b + 7, rise + 1), C.ROOF.m);
        }
      }
    }
    function walls(ctx) {
      q(ctx, [[0, 0, FL], [RU, 0, FL], [RU, 0, H], [0, 0, H]], C.WALL.l);
      q(ctx, [[0, 0, FL], [0, DOOR[0], FL], [0, DOOR[0], H], [0, 0, H]], C.WALL.m);
      q(ctx, [[0, DOOR[1], FL], [0, RV, FL], [0, RV, H], [0, DOOR[1], H]], C.WALL.m);
      q(ctx, [[0, DOOR[0], FL + 90], [0, DOOR[1], FL + 90], [0, DOOR[1], H], [0, DOOR[0], H]], C.WALL.m);
      box(ctx, 0, 0, FL, RU, 2, 4, C.FLOOR, { edge: false });
      box(ctx, 0, 0, FL, 2, DOOR[0], 4, C.FLOOR, { edge: false });
      box(ctx, 0, DOOR[1], FL, 2, RV - DOOR[1], 4, C.FLOOR, { edge: false });
      for (const [u, v] of [[0, 0], [0, RV - 6], [RU - 6, 0]]) {
        box(ctx, u, v, FL, 6, 6, H - FL, C.WOOD);
        box(ctx, u - 1, v - 1, H - 13, 8, 8, 6, C.WOOD);
      }
      box(ctx, 0, 92, FL, 4, 4, H - FL, C.WOOD);
      box(ctx, 85, 0, FL, 6, 4, H - FL, C.WOOD);
      box(ctx, 0, 0, H - 8, RU, 6, 8, C.WOOD);
      box(ctx, 0, 0, H - 8, 6, RV, 8, C.WOOD);
      onV(ctx, window.LANDSCAPES?.windowView("dali", 94, 116, 74, FL + 124) || mk(116, 74, mountains), 94, 0, FL + 124);
      for (const u of [91, 210]) box(ctx, u, 0, FL + 44, 4, 4, 83, C.WOOD);
      for (const z of [FL + 43, FL + 124]) box(ctx, 91, 0, z, 123, 4, 4, C.WOOD);
      for (const u of [97, 203]) {
        box(ctx, u, 1, FL + 48, 2, 2, 72, C.WOOD);
        for (const z of [FL + 56, FL + 64, FL + 106, FL + 114]) box(ctx, u - 4, 1, z, 10, 2, 2, C.WOOD);
      }
      onV(ctx, mk(17, 68, (c) => {
        for (let y = 0; y < 68; y++) {
          const x = Math.max(0, Math.round(6 - y / 12 + Math.sin(y / 18) * 3));
          P(c, C.PAPER.m, x, y, 8, 1);
          P(c, C.PAPER.l, x + 2, y, 3, 1);
        }
      }), 98, 5, FL + 122);
      onV(ctx, baiBand(6, 45, true), RU - 6, 6, H - 19);
      onU(ctx, baiBand(6, 45, true), RU, 0, H - 19);
      onV(ctx, baiBand(6, 32, true), 85, 4, H - 19);
      onU(ctx, window.LANDSCAPES?.windowView("dali", -1, 38, 86, FL + 88, DOOR[0], "u") || mk(38, 86, garden), -1, DOOR[0], FL + 88);
      for (const v of [DOOR[0] - 3, DOOR[1]])
        box(ctx, 0, v, FL, 5, 3, 92, C.WOOD);
      box(ctx, 0, DOOR[0] - 3, FL + 90, 5, 44, 5, C.WOOD);
      onU(ctx, baiBand(44, 11), 2, DOOR[0] - 3, FL + 123);
      box(ctx, -5, DOOR[1], FL, 3, 15, 85, C.WOOD);
      for (let z = 18; z < 80; z += 23) box(ctx, -2, DOOR[1] + 2, FL + z, 1, 11, 2, C.WOOD, { top: C.WOOD.h, edge: false });
      tiledEave(ctx, RU + 8, [-4, 0, H], "u");
      tiledEave(ctx, RV + 4, [0, 4, H], "v");
      tiledEave(ctx, 49, [0, DOOR[0] - 5, FL + 96], "v");
    }
    function board2(ctx) {
      const w = BOARD[1] - BOARD[0];
      const image = mk(w, 46, (c) => {
        P(c, C.WOOD.d, 0, 0, w, 46);
        P(c, C.PAPER.l, 2, 2, w - 4, 42);
        for (let k = 0; k < 3; k++) {
          const x = 5 + 18 * k;
          P(c, C.BLUE.m, x, 5, 12, 2);
          P(c, C.FLOOR.d, x + 15, 5, 1, 36);
          for (let j = 0; j < 3; j++) P(c, (k + j) % 2 ? C.GREEN.l : "#e4cc7b", x, 11 + j * 10, 12, 7);
        }
      });
      onV(ctx, image, BOARD[0], 2, FL + 108);
    }
    function plant(ctx, u, v, z, flowers) {
      if (flowers) {
        roundBody(ctx, u, v, 4, z, 9, C.PAPER);
        roundTop(ctx, u, v, 3, z + 9, { l: C.WOOD.d });
        const [x2, y2] = S(u, v, z + 9);
        P(ctx, C.BLUE.m, x2 - 4, y2 + 4, 8, 1);
        P(ctx, C.BLUE.m, x2 - 3, y2 + 6, 2, 2);
        P(ctx, C.BLUE.m, x2 + 1, y2 + 6, 2, 2);
        P(ctx, C.BLUE.m, x2, y2 + 7, 1, 1);
        P(ctx, C.WOOD.d, x2 - 1, y2 - 15, 2, 15);
        for (const [dx, dy] of [[-5, -9], [4, -13], [-1, -19]]) blossom(ctx, x2 + dx, y2 + dy, 6);
        return;
      }
      box(ctx, u - 3, v - 3, z, 6, 6, 7, C.PAPER);
      const [x, y] = S(u, v, z + 7);
      P(ctx, C.BLUE.m, x - 2, y + 2, 3, 2);
      P(ctx, C.WOOD.d, x, y - 9, 1, 9);
      for (const [dx, dy] of [[-4, -7], [2, -11], [-1, -15], [4, -5], [-5, -13]]) {
        P(ctx, C.GREEN.d, x + dx - 1, y + dy, 6, 4);
        P(ctx, C.GREEN.m, x + dx, y + dy - 2, 5, 4);
        P(ctx, C.GREEN.l, x + dx + 1, y + dy - 2, 2, 2);
      }
    }
    function shelf(ctx) {
      const [u, v, du, dv] = SHELF;
      foot(ctx, u, v, du, dv, FL);
      box(ctx, u, v, FL, du, dv, 94, C.WOOD);
      const image = mk(dv, 94, (c) => {
        P(c, C.WOOD.d, 0, 0, dv, 94);
        const bookColors = [C.PAPER.l, C.GREEN.m, C.BLUE.m, C.FLOOR.d];
        for (let row = 0; row < 4; row++) {
          const base = 90 - row * 22;
          for (let j = 0; j < 10; j++) {
            const x = 3 + j * 6, height = 14 + (j + row) % 5;
            P(c, bookColors[(j + row) % bookColors.length], x, base - height, 4, height);
            P(c, C.PAPER.m, x, base - 3, 3, 1);
          }
          P(c, C.WOOD.l, 0, base + 1, dv, 3);
        }
        P(c, C.WOOD.l, 0, 0, dv, 3);
        P(c, C.WOOD.m, 0, 0, 3, 94);
        P(c, C.WOOD.m, dv - 3, 0, 3, 94);
        for (let y = 0; y < 55; y += 6) P(c, y % 12 ? C.GREEN.m : C.GREEN.l, dv - 11 + y % 3, y, 4, 5);
      });
      onU(ctx, image, u + du, v, FL + 94);
      plant(ctx, u + 8, v + 11, FL + 94, false);
      seg(ctx, [u + du, v + 4, FL + 91], [u + du, v + dv - 4, FL + 91], C.n ? "#d9bd86" : C.WOOD.h);
    }
    const look = () => ({ frame: C.DARK.o, off: C.DARK.d, accent: C.ACC.m, body: C.DARK, bodyOpts: { edge: false } });
    function legs(ctx, r, top, R) {
      const [u, v, du, dv] = r;
      for (const [a, b] of [[u + 2, v + 2], [u + du - 5, v + 2], [u + 2, v + dv - 5], [u + du - 5, v + dv - 5]])
        box(ctx, a, b, FL, 3, 3, top - FL - 3, R, { edge: false });
    }
    function desk(ctx) {
      const [u, v, du, dv] = DESK;
      foot(ctx, u, v, du, dv, FL);
      box(ctx, u + 2, v + 2, FL, 10, dv - 4, DZ - FL - 3, C.WOOD);
      box(ctx, u + du - 15, v + 2, FL, 12, dv - 4, DZ - FL - 3, C.WOOD);
      box(ctx, u, v, DZ - 3, du, dv, 3, C.WOOD);
      SCREENS.placeDesk(ctx, FIXTURES.desk, look(), LINKS, { box, onV, stand(c, m) {
        box(c, m.cu - 4, m.v - 2, DZ, 8, 5, 1, C.DARK, { edge: false });
        box(c, m.cu - 1, m.v - 2, DZ + 1, 2, 2, m.z - DZ + 3, C.DARK, { edge: false });
      } });
      box(ctx, ...FIXTURES.desk.keyboard, C.DARK, { edge: false });
      for (let u2 = 137; u2 < 160; u2 += 3) seg(ctx, [u2, 35, DZ + 1], [u2, 37, DZ + 1], C.DARK.m);
      box(ctx, 169, 33, DZ, 4, 5, 2, C.DARK, { edge: false });
      plant(ctx, 98, 19, DZ, false);
      const [x, y] = S(196, 20, DZ);
      P(ctx, C.WOOD.h, x, y - 18, 1, 18);
      ell(ctx, x, y - 18, 5, 3, C.WOOD.h);
      P(ctx, C.PAPER.h, x - 2, y - 17, 4, 2);
    }
    function callScreen(ctx) {
      SCREENS.placeCall(ctx, FIXTURES.meeting, look(), !C.n || ST === "meeting", { box, onU, stand(c, m) {
        for (const v of [m.v - 17, m.v + 17]) {
          box(c, m.u - 4, v - 4, FL, 9, 8, 1, C.DARK, { edge: false });
          box(c, m.u - 1, v - 1, FL + 1, 2, 2, m.z - FL + 3, C.DARK, { edge: false });
        }
      } });
    }
    function meeting(ctx) {
      foot(ctx, ...MEET, FL);
      legs(ctx, MEET, MZ, C.WOOD);
      box(ctx, MEET[0], MEET[1], MZ - 3, MEET[2], MEET[3], 3, C.WOOD);
      plant(ctx, 43, 120, MZ, false);
      box(ctx, 53, 116, MZ, 8, 9, 2, C.GREEN);
      box(ctx, 53, 116, MZ + 1, 8, 8, 1, C.PAPER, { edge: false });
    }
    function seat(ctx, kind) {
      const [u, v, du, dv] = chair[kind].seat;
      foot(ctx, u, v, du, dv, FL);
      legs(ctx, [u, v, du, dv], FL + 14, C.WOOD);
      box(ctx, u, v, FL + 11, du, dv, 2, C.WOOD);
      box(ctx, u + 1, v + 1, FL + 13, du - 2, dv - 2, 3, kind === "desk" ? C.PAPER : C.BLUE);
    }
    function back(ctx, kind) {
      const [u, v, du, dv] = chair[kind].back;
      if (chair[kind].axis === "v") {
        box(ctx, u, v, FL, 3, dv, 32, C.WOOD);
        box(ctx, u + du - 3, v, FL, 3, dv, 32, C.WOOD);
        box(ctx, u + 2, v, FL + 17, du - 4, dv, 14, C.PAPER);
      } else {
        box(ctx, u, v, FL, du, 3, 32, C.WOOD);
        box(ctx, u, v + dv - 3, FL, du, 3, 32, C.WOOD);
        box(ctx, u, v + 2, FL + 17, du, dv - 4, 14, C.BLUE);
      }
    }
    function phone(ctx) {
      const [u, v, du, dv] = PHONE;
      foot(ctx, u, v, du, dv, FL);
      box(ctx, u, v, FL, du, dv, 25, C.WOOD);
      box(ctx, u + 2, v + 13, FL + 25, 10, 10, 3, C.DARK);
      if (ST !== "phone") box(ctx, u + 2, v + 13, FL + 28, 2, 9, 2, C.DARK);
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++)
        box(ctx, u + 5 + a * 2, v + 15 + b * 2, FL + 28, 1, 1, 1, C.PAPER, { edge: false });
      plant(ctx, u + 15, v + 6, FL + 25, true);
    }
    function tray(ctx) {
      const [u, v, du, dv] = TRAY;
      legs(ctx, TRAY, FL + 17, C.WOOD);
      box(ctx, u, v, FL + 14, du, dv, 3, C.WOOD);
      box(ctx, u + 1, v + 1, FL + 17, du - 2, dv - 2, 2, C.ACC);
      box(ctx, u + 3, v + 3, FL + 19, du - 6, dv - 6, 1, C.PAPER);
      box(ctx, u + 1, v + 1, FL + 19, 2, dv - 2, 2, C.ACC);
      box(ctx, u + 1, v + 1, FL + 19, du - 2, 2, 2, C.ACC);
    }
    function roundTop(ctx, u, v, radius, z, R) {
      const pts = [];
      for (let i = 0; i < 16; i++) pts.push([u + Math.cos(i * Math.PI / 8) * radius, v + Math.sin(i * Math.PI / 8) * radius, z]);
      q(ctx, pts, R.l);
    }
    function roundBody(ctx, u, v, radius, z, height, R) {
      for (let i = -2; i < 6; i++) {
        const a = i * Math.PI / 8, b = (i + 1) * Math.PI / 8;
        const x0 = u + Math.cos(a) * radius, y0 = v + Math.sin(a) * radius;
        const x1 = u + Math.cos(b) * radius, y1 = v + Math.sin(b) * radius;
        q(ctx, [[x0, y0, z], [x1, y1, z], [x1, y1, z + height], [x0, y0, z + height]], i < 2 ? R.d : R.m);
      }
      roundTop(ctx, u, v, radius, z + height, R);
    }
    function stool(ctx, u, v) {
      const r = TEA.seatRadius;
      legs(ctx, [u - r, v - r, r * 2, r * 2], FL + 12, C.WOOD);
      roundBody(ctx, u, v, r, FL + 10, 2, C.WOOD);
      roundBody(ctx, u, v, r - 1, FL + 12, 2, C.BLUE);
    }
    function tea(ctx) {
      const { u, v, radius } = TEA, z = FL + 24;
      foot(ctx, u - radius, v - radius, radius * 2, radius * 2, FL);
      roundBody(ctx, u, v, 10, FL, 3, C.WOOD);
      box(ctx, u - 3, v - 3, FL + 3, 6, 6, 18, C.WOOD);
      roundBody(ctx, u, v, radius, z - 3, 3, C.WOOD);
      const [x, y] = S(u, v, z);
      ell(ctx, x, y - 6, 6, 5, C.PAPER.l);
      P(ctx, C.BLUE.m, x - 4, y - 3, 8, 1);
      for (const dx of [-3, 2]) {
        P(ctx, C.BLUE.m, x + dx, y - 7, 2, 3);
        P(ctx, C.BLUE.m, x + dx - 1, y - 6, 4, 1);
      }
      P(ctx, C.PAPER.l, x - 8, y - 11, 2, 7);
      P(ctx, C.PAPER.l, x - 10, y - 12, 4, 2);
      P(ctx, C.DARK.d, x - 10, y - 12, 1, 1);
      P(ctx, C.PAPER.m, x + 6, y - 9, 4, 2);
      P(ctx, C.PAPER.m, x + 9, y - 7, 2, 3);
      P(ctx, C.PAPER.m, x + 6, y - 4, 4, 2);
      P(ctx, C.BLUE.m, x - 3, y - 11, 6, 1);
      P(ctx, C.PAPER.l, x - 3, y - 12, 6, 1);
      P(ctx, C.BLUE.m, x - 1, y - 14, 2, 2);
      for (const [a, b] of [[u - 11, v + 3], [u + 8, v + 6]]) {
        const [cx, cy] = S(a, b, z);
        ell(ctx, cx, cy, 4, 2, C.BLUE.d);
        P(ctx, C.PAPER.l, cx - 2, cy - 4, 5, 4);
        P(ctx, C.WOOD.d, cx - 1, cy - 4, 3, 1);
        P(ctx, C.BLUE.m, cx - 1, cy - 1, 3, 1);
      }
    }
    function bed(ctx) {
      const [u, v, du, dv] = BED;
      foot(ctx, u, v, du, dv, FL);
      legs(ctx, BED, FL + 10, C.WOOD);
      box(ctx, u, v, FL + 7, du, dv, 4, C.WOOD);
      box(ctx, u + 2, v + 2, FL + 11, du - 4, dv - 4, 4, C.BLUE);
      box(ctx, u, v, FL + 11, du, 3, 10, C.WOOD);
      box(ctx, u + 6, v + dv - 22, BZ + 3, du - 12, 12, 4, C.PAPER);
    }
    function blanket(ctx) {
      if (ST === "sleep" && CHAR.sleepSurface) return;
      const [u, v, du] = BED;
      box(ctx, u + 2, v + 7, BZ + 4, du - 4, 42, 2, C.PAPER);
      for (const offset2 of [11, 25]) box(ctx, u + 2, v + offset2, BZ + 6, du - 4, 1, 0, C.BLUE, { edge: false });
      box(ctx, u + 2, v + 14, BZ + 6, du - 4, 8, 0, C.BLUE, { edge: false });
      for (let a = u + 6; a < u + du - 3; a += 7) {
        q(ctx, [[a, v + 15, BZ + 6], [a + 3, v + 18, BZ + 6], [a, v + 21, BZ + 6], [a - 3, v + 18, BZ + 6]], C.PAPER.l);
        q(ctx, [[a, v + 17, BZ + 6], [a + 1, v + 18, BZ + 6], [a, v + 19, BZ + 6], [a - 1, v + 18, BZ + 6]], C.BLUE.m);
      }
      for (let a = u + 3; a < u + du - 3; a += 3) seg(ctx, [a, v + 7, BZ + 6], [a, v + 7, BZ + 3], C.PAPER.m);
    }
    function bedFront(ctx) {
      const [u, v, du, dv] = BED;
      box(ctx, u + du - 2, v + 2, FL + 6, 2, dv - 4, 7, C.WOOD);
      box(ctx, u + 1, v + dv - 3, FL + 5, du - 2, 3, 8, C.WOOD);
    }
    const ACTOR_K = 2;
    const SPRITES = /* @__PURE__ */ new WeakMap();
    function sprite(s) {
      let byPal = SPRITES.get(s);
      if (!byPal) SPRITES.set(s, byPal = /* @__PURE__ */ new WeakMap());
      let img = byPal.get(C.actor);
      if (!img) byPal.set(C.actor, img = mk(s.w, s.h, (c) => PX.paint(c, s, C.actor, 0, 0)));
      return img;
    }
    function poseSprite(pose) {
      if (pose === "turn") return CONTRACT.turnSprite(CHAR, false);
      if (pose === "turnL") return CONTRACT.turnSprite(CHAR, true);
      return CHAR.poses[pose] || CHAR.poses.idle;
    }
    function actorAt(ctx, pose, u, v, z) {
      const s = poseSprite(pose);
      const [x, y] = S(u, v, z);
      const K = CHAR.k || ACTOR_K;
      const w = s.w * K;
      const h = s.h * K;
      const left = Math.round(x - w / 2);
      const top = Math.round(y) - h + 1;
      ctx.drawImage(sprite(s), left, top, w, h);
      return { left, top, w, h };
    }
    const STATIONS = CONTRACT.STATIONS;
    const SLEEP_SURFACE = { u: BED[0], v: BED[1] + BED[3] - 6, z: BZ + 8, w: 72, d: 34, alongV: true };
    const PLACES = {
      code: { u: SEAT[0], v: SEAT[1], z: FL + 16, own: "turn", shared: "turn", sit: true },
      work: { u: SEAT[0], v: SEAT[1], z: FL + 16, own: "turn", shared: "turn", sit: true },
      meeting: { u: MSEAT[0], v: MSEAT[1], z: FL + 16, own: "turnL", shared: "turnL", sit: true },
      board: { u: 48, v: 22, z: FL, own: "post", shared: "back" },
      library: { u: 28, v: 52, z: FL, own: "read", shared: "back" },
      phone: { u: 215, v: 48, z: FL, own: "phone", shared: "idle" },
      handoff: { u: 37, v: 151, z: FL, own: "attention", shared: "idle" },
      tea: { u: TEA.seats[0][0], v: TEA.seats[0][1], z: FL + 14, own: "tea", shared: "type", sit: true },
      door: { u: 7, v: 177, z: FL, own: "wave", shared: "idle" },
      walk: { u: 112, v: 91, z: FL, own: "idle", shared: "idle" },
      sleep: { ...window.ROOM_PAINTER.sleepPlace(SLEEP_SURFACE), own: "sleep", shared: "sleep", lie: true }
    };
    const SLEEP_HEADS = /* @__PURE__ */ new WeakMap();
    function sleepHead(s) {
      const source = sprite(s), k = CHAR.k || ACTOR_K;
      let image = SLEEP_HEADS.get(source);
      if (!image) {
        image = mk(s.w * k, s.h * k, (c) => {
          c.drawImage(source, 0, 0, s.w * k, s.h * k);
          c.clearRect(Math.ceil(s.w * k * 0.4), 0, s.w * k, s.h * k);
        });
        SLEEP_HEADS.set(source, image);
      }
      return image;
    }
    function drawOri(ctx, place, pose) {
      if (place.lie && CHAR.sleepSurface) {
        const s = CHAR.poses[pose] || CHAR.poses.sleep;
        window.ROOM_PAINTER.sleeper(ctx, sprite(s), S, SLEEP_SURFACE, place);
        return null;
      }
      if (place.lie) {
        const s = CHAR.poses[pose] || CHAR.poses.sleep;
        const image = sleepHead(s);
        onU(ctx, image, BED[0] + BED[2] / 2, BED[1] + BED[3] - 10 - image.width, BZ + image.height - 2);
        return null;
      }
      return actorAt(ctx, pose, place.u, place.v, place.z);
    }
    function furniture() {
      const a = [];
      const add = (draw2, fp, owner, part) => a.push({ draw: draw2, fp, owner, part });
      add(shelf, rect(SHELF));
      add(desk, rect(DESK));
      add(callScreen, [5, 95, 14, 145]);
      add(meeting, rect(MEET));
      add(phone, rect(PHONE));
      add(tray, rect(TRAY));
      for (const kind of ["desk", "meeting"]) {
        add((c) => seat(c, kind), rect(chair[kind].seat), kind, "under");
        add((c) => back(c, kind), rect(chair[kind].back), kind, "over");
      }
      add((c) => plant(c, 24, 10, FL, false), [20, 6, 28, 14]);
      add((c) => plant(c, 220, 75, FL, true), [216, 71, 224, 79]);
      add(tea, teaBounds);
      add((c) => stool(c, ...TEA.seats[0]), stoolBounds(TEA.seats[0]), "tea", "under");
      add((c) => stool(c, ...TEA.seats[1]), stoolBounds(TEA.seats[1]));
      add(bed, rect(BED), "sleep", "under");
      add(blanket, rect(BED), "sleep", "over");
      add(bedFront, rect(BED), "sleep", "over");
      const before = (x, y) => x.fp[2] <= y.fp[0] || x.fp[3] <= y.fp[1];
      const remaining = a.map((_, i) => i), ordered = [];
      while (remaining.length) {
        const candidates = remaining.filter((i2) => !remaining.some((j) => j !== i2 && before(a[j], a[i2]) && !before(a[i2], a[j])));
        if (!candidates.length) throw new Error("Dali furniture has a cyclic depth order");
        candidates.sort((i2, j) => a[i2].fp[0] + a[i2].fp[1] - (a[j].fp[0] + a[j].fp[1]) || i2 - j);
        const i = candidates[0];
        ordered.push(a[i]);
        remaining.splice(remaining.indexOf(i), 1);
      }
      return ordered;
    }
    const FURNITURE = furniture();
    function foregroundAt(u, v, station) {
      const owner = station === "code" || station === "work" ? "desk" : station;
      let bits = 0;
      FURNITURE.forEach((item2, i) => {
        const inFront = item2.owner === owner ? item2.part === "over" : u < item2.fp[2] && v < item2.fp[3];
        if (inFront) bits |= 1 << i;
      });
      return bits;
    }
    function slotFor(station, u, v) {
      return foregroundAt(u, v, "walk");
    }
    let scenery;
    function sceneryFor(station) {
      const state = station === "sleep" && CHAR.sleepSurface ? "sleep" : station === "phone" || station === "meeting" ? station : "idle";
      const links = String(LINKS.claude) + "|" + String(LINKS.slack);
      const landscape = window.LANDSCAPES?.sceneKey();
      if (scenery && scenery.palette === C && scenery.state === state && scenery.links === links && scenery.landscape === landscape) return scenery;
      const back2 = mk(480, 560, (c) => {
        backdrop(c);
        floor(c);
        walls(c);
        board2(c);
      });
      const bg = back2.getContext("2d");
      const scratch = mk(480, 560, () => {
      }), g = scratch.getContext("2d");
      const parts = FURNITURE.map((item2) => {
        g.clearRect(0, 0, 480, 560);
        item2.draw(g);
        item2.draw(bg);
        const pixels = g.getImageData(0, 0, 480, 560).data, opaque = [];
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 127) opaque.push((i - 3) / 4);
        return Uint32Array.from(opaque);
      });
      scenery = { palette: C, state, links, landscape, back: back2, parts };
      return scenery;
    }
    function layers(station, slot2) {
      ST = station;
      const place = PLACES[station] || PLACES.walk;
      const bits = slot2 === void 0 ? foregroundAt(place.u, place.v, station) : slot2;
      const scene2 = sceneryFor(station);
      const visible = new Uint8Array(480 * 560);
      scene2.parts.forEach((pixels, i) => {
        const front = (bits & 1 << i) !== 0 ? 1 : 0;
        for (const pixel of pixels) visible[pixel] = front;
      });
      return {
        back: scene2.back,
        front: mk(480, 560, (c) => {
          const pixels = scene2.back.getContext("2d").getImageData(0, 0, 480, 560);
          for (let i = 0; i < visible.length; i++) if (!visible[i]) pixels.data[i * 4 + 3] = 0;
          c.putImageData(pixels, 0, 0);
        })
      };
    }
    function drawOverlay(ctx) {
      if (C.n) nightLights(ctx);
    }
    let lightOverlay;
    function nightLights(ctx) {
      if (!lightOverlay) lightOverlay = mk(480, 560, (c) => {
        const [x, y] = S(196, 20, DZ + 18);
        glow(c, x, y, 94, "#f5ca91", 0.25);
        const [sx, sy] = S(SHELF[0] + SHELF[2], SHELF[1] + SHELF[3] / 2, FL + 76);
        glow(c, sx, sy, 82, "#f2d4a3", 0.18);
      });
      ctx.drawImage(lightOverlay, 0, 0);
    }
    const NODES = {
      hub: [112, 91],
      walk: [112, 91],
      west: [38, 79],
      library: [28, 52],
      boardWay: [38, 22],
      board: [48, 22],
      codeWay: [130, SEAT[1]],
      code: [133, SEAT[1]],
      phoneWay: [194, 66],
      phone: [215, 48],
      front: [112, 145],
      meetWay: [83, 145],
      meeting: [83, 134],
      teaWay: [TEA.seats[0][0], 158],
      tea: [TEA.seats[0][0], 163],
      entrance: [43, 177],
      door: [7, 177],
      handoff: [37, 151],
      bedWay: [174, 91],
      bedSide: [178, 166],
      sleep: [182, 173]
    };
    const EDGES = [
      ["hub", "walk"],
      ["hub", "west"],
      ["west", "library"],
      ["library", "boardWay"],
      ["boardWay", "board"],
      ["hub", "codeWay"],
      ["codeWay", "code"],
      ["hub", "phoneWay"],
      ["phoneWay", "phone"],
      ["hub", "front"],
      ["front", "meetWay"],
      ["meetWay", "meeting"],
      ["front", "teaWay"],
      ["teaWay", "tea"],
      ["front", "entrance"],
      ["entrance", "door"],
      ["entrance", "handoff"],
      ["hub", "bedWay"],
      ["bedWay", "bedSide"],
      ["bedSide", "sleep"]
    ];
    const floorAt = (u, v) => u >= -12 && u <= RU && v >= 0 && v <= RV ? FL : 0;
    const SPOTS = {
      tasks: [BOARD[0], 0, FL + 62, BOARD[1], 3, FL + 108],
      library: [SHELF[0], SHELF[1], FL, SHELF[0] + SHELF[2], SHELF[1] + SHELF[3], FL + 94],
      meeting: [5, 95, FL, 96, 145, FIXTURES.meeting.z + SCREENS.CALL_H],
      handoff: [TRAY[0], TRAY[1], FL, TRAY[0] + TRAY[2], TRAY[1] + TRAY[3], FL + 22],
      phone: [PHONE[0], PHONE[1], FL, PHONE[0] + PHONE[2], PHONE[1] + PHONE[3], FL + 36],
      desk: SCREENS.deskBox(FIXTURES.desk)
    };
    const PALETTES = /* @__PURE__ */ new WeakMap();
    function use(t, weather, char, links) {
      CHAR = char;
      LINKS = { claude: !links || links.claude !== false, slack: !links || links.slack !== false };
      let cache = PALETTES.get(char);
      if (!cache) PALETTES.set(char, cache = /* @__PURE__ */ new Map());
      if (!cache.has(t)) cache.set(t, palette(t));
      C = cache.get(t);
    }
    function draw(ctx, m) {
      ST = m.station || "walk";
      use(m.t || "day", m.weather || "clear", m.char || { poses: ACTOR.sprout, pal: X.ORIPAL.sprout }, m.links);
      const place = PLACES[ST] || PLACES.walk;
      const image = mk(480, 560, (c) => {
        const scene2 = layers(ST);
        c.drawImage(scene2.back, 0, 0);
        drawOri(c, place, m.pose || place.own);
        c.drawImage(scene2.front, 0, 0);
        drawOverlay(c);
      });
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0, 960, 1120);
    }
    const room = { STATIONS, PLACES, NODES, EDGES, SPOTS, FIXTURES, floorAt, project: S, use, slotFor, layers, drawOri, drawOverlay, solids };
    window.OFFICE_ROOMS = window.OFFICE_ROOMS || [];
    window.OFFICE_ROOMS.push({ key: "dali", zh: "\u5927\u7406\u767D\u65CF\u5C0F\u9662", name: "Dali Courtyard", room });
    CONCEPTS.push({
      key: "dali",
      zh: "\u5927\u7406\u767D\u65CF\u5C0F\u9662",
      name: "Dali Courtyard",
      actor: "sprout",
      actorPal: X.ORIPAL.sprout,
      stations: STATIONS,
      angle: "\u767D\u5899\u7070\u74E6\u3001\u6DF1\u6728\u5ECA\u67F1\u4E0E\u82CD\u5C71\u7A97\u666F\u7684\u5C0F\u529E\u516C\u5BA4\u3002",
      why: "\u5728\u660E\u4EAE\u5B89\u9759\u7684\u767D\u65CF\u5C0F\u9662\u91CC\u5DE5\u4F5C\uFF0C\u84DD\u767D\u5E03\u827A\u3001\u5F00\u82B1\u6811\u548C\u77F3\u5730\u9762\u7559\u51FA\u957F\u4F4F\u7684\u4ECE\u5BB9\u3002",
      map: "\u5DE6\u5899\u662F\u5165\u53E3\u3001\u4F1A\u8BAE\u5C4F\u4E0E\u4E66\u67B6\uFF1B\u53F3\u5899\u662F\u4EFB\u52A1\u677F\u3001\u53CC\u5C4F\u5DE5\u4F5C\u684C\u53CA\u7535\u8BDD\uFF1B\u4E2D\u592E\u7559\u767D\uFF0C\u524D\u65B9\u662F\u8336\u6B47\u4E0E\u8EBA\u69BB\u3002",
      cost: "\u590D\u7528\u623F\u95F4\u5408\u540C\u3001\u5171\u4EAB\u5C4F\u5E55\u3001\u4EBA\u7269\u4E0E\u821E\u53F0\uFF0C\u4EC5\u589E\u52A0\u5F00\u53D1\u8005\u53EF\u9009\u7684\u623F\u95F4\u3002",
      draw,
      detail: [0, 90, 480, 430]
    });
  })();
  (function() {
    "use strict";
    const { P, ell, ramp, mix, glow: paintGlow, rng, vgrad } = CP;
    const X = CX;
    function glow(ctx, ...args) {
      if (!ctx.roomOcclusionMask) paintGlow(ctx, ...args);
    }
    const SCREENS = window.OFFICE_SCREENS;
    const CONTRACT = window.ROOM_CONTRACT;
    const OX = 225;
    const OY = 250;
    const RU = 244;
    const RV = 220;
    const H = 124;
    const FL = 4;
    const PB = 14;
    const S = (u, v, z) => [OX + u - v, OY + (u + v) / 2 - (z || 0)];
    const q = (ctx, pts, c) => X.poly(ctx, pts.map((p) => S(p[0], p[1], p[2])), c);
    function qa(ctx, pts, c, a) {
      ctx.save();
      ctx.globalAlpha = a;
      q(ctx, pts, c);
      ctx.restore();
    }
    function seg(ctx, a, b, c) {
      const [x0, y0] = S(a[0], a[1], a[2]);
      const [x1, y1] = S(b[0], b[1], b[2]);
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      ctx.fillStyle = c;
      for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.floor(y0 + (y1 - y0) * i / n + 1e-6), 1, 1);
    }
    function box(ctx, u, v, z, du, dv, dz, R, o) {
      o = o || {};
      const t = z + dz;
      if (dz > 0) {
        q(ctx, [[u, v + dv, z], [u + du, v + dv, z], [u + du, v + dv, t], [u, v + dv, t]], o.fv || R.m);
        q(ctx, [[u + du, v, z], [u + du, v + dv, z], [u + du, v + dv, t], [u + du, v, t]], o.fu || R.d);
      }
      q(ctx, [[u, v, t], [u + du, v, t], [u + du, v + dv, t], [u, v + dv, t]], o.top || R.l);
      if (o.edge !== false) {
        seg(ctx, [u, v + dv, t], [u + du, v + dv, t], o.hc || R.h);
        seg(ctx, [u + du, v, t], [u + du, v + dv, t], o.hc || R.h);
      }
    }
    function foot(ctx, u, v, du, dv, z) {
      if (ctx.roomOcclusionMask) return;
      qa(ctx, [[u, v, z], [u + du + 3, v, z], [u + du + 3, v + dv + 3, z], [u, v + dv + 3, z]], "#2a2018", 0.1);
    }
    function mk(w, h, fn) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d");
      x.imageSmoothingEnabled = false;
      fn(x, w, h);
      return c;
    }
    function onV(ctx, img, u0, vp, zTop) {
      const [x0, y0] = S(u0, vp, zTop);
      for (let i = 0; i < img.width; i++) ctx.drawImage(img, i, 0, 1, img.height, x0 + i, y0 + Math.ceil(i / 2), 1, img.height);
    }
    function onU(ctx, img, up, v0, zTop) {
      const w = img.width;
      const [x0, y0] = S(up, v0 + w, zTop);
      for (let i = 0; i < w; i++) ctx.drawImage(img, i, 0, 1, img.height, x0 + i, y0 - Math.ceil(i / 2), 1, img.height);
    }
    const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const mul = (a, b) => {
      if (!/^#[0-9a-f]{6}$/i.test(a)) return a;
      const A = hex2(a);
      const B = hex2(b);
      return "#" + A.map((v, i) => Math.round(v * B[i] / 255).toString(16).padStart(2, "0")).join("");
    };
    let C = null;
    let CHAR = null;
    let FIRE_TIME = 0;
    function palette(t) {
      const n = t === "night";
      const k = n ? "#a2978c" : t === "golden" ? "#fff0dc" : "#ffffff";
      const tin = (h) => ramp(mul(h, k));
      const actor = {};
      Object.entries(CHAR.pal).forEach(([key, v]) => actor[key] = n ? mul(v, "#c9b8aa") : v);
      return {
        n,
        bg: n ? "#2c2d36" : t === "golden" ? "#f3e1cf" : "#ecebe8",
        FLOOR: tin("#dccdb5"),
        WALL: tin("#dfc9aa"),
        WOOD: tin("#ab7d50"),
        FURN: tin("#bd966b"),
        UPHOL: tin("#cebaa0"),
        LINEN: tin("#dbc9a5"),
        RUG: { ...tin("#c8c6bb"), h: tin("#afb1a6").m },
        BOOKS: ["#e6dcc9", "#99abb1", "#b78973", "#a0a782", "#cab795", "#b7b2a7"].map(tin),
        DARK: tin("#3b3c3e"),
        SOFT: tin("#ab9580"),
        ACC: tin("#e0552c"),
        PAPER: tin("#f7f4ec"),
        actor
      };
    }
    const FLOOR = [[0, 0], [220, 0], [220, 169], [186, 190], [-4, 190], [-4, 170]];
    const pointIn = (u, v, poly) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i], b = poly[j];
        if (a[1] > v !== b[1] > v && u < (b[0] - a[0]) * (v - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
      }
      return inside;
    };
    function clip(ctx, poly, z, fn) {
      ctx.save();
      ctx.beginPath();
      poly.map(([u, v]) => S(u, v, z)).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      ctx.clip();
      fn();
      ctx.restore();
    }
    function mountains(ctx, x, y, w, h) {
      const img = mk(w, h, (c) => {
        const sky = C.n ? ["#20364b", "#4e6c7c", "#8ba0a7"] : ["#a8cbdc", "#d7e4e5", "#f1eee0"];
        for (let y2 = 0; y2 < h; y2 += 4) {
          const t = y2 / h * (sky.length - 1), i = Math.min(sky.length - 2, Math.floor(t));
          P(c, mix(sky[i], sky[i + 1], t - i), 0, y2, w, 4);
        }
        const poly = (pts, color) => X.poly(c, pts.map(([a, b]) => [a * w, b * h]), color);
        poly([[0, 0.57], [0.09, 0.48], [0.18, 0.32], [0.28, 0.38], [0.41, 0.2], [0.51, 0.27], [0.62, 0.22], [0.75, 0.38], [0.88, 0.35], [1, 0.49], [1, 1], [0, 1]], C.n ? "#6e879d" : "#acc6d2");
        poly([[-0.12, 1], [0.08, 0.68], [0.21, 0.39], [0.31, 0.27], [0.37, 0.34], [0.46, 0.21], [0.55, 0.43], [0.63, 0.51], [0.78, 1]], C.n ? "#a1b2bf" : "#edf1eb");
        poly([[0.31, 0.27], [0.34, 0.48], [0.41, 0.56], [0.46, 0.51], [0.55, 0.7], [0.63, 0.74], [0.78, 1], [0.44, 1]], C.n ? "#4c6a87" : "#88adbf");
        poly([[0.46, 0.21], [0.48, 0.44], [0.55, 0.43], [0.53, 0.35]], C.n ? "#66849b" : "#b0c6d1");
        poly([[0.08, 0.68], [0.21, 0.39], [0.25, 0.48], [0.31, 0.27], [0.27, 0.51], [0.22, 0.55], [0.16, 0.68]], C.n ? "#b5c1c7" : "#faf5e5");
        poly([[0.35, 1], [0.51, 0.68], [0.61, 0.55], [0.7, 0.31], [0.78, 0.39], [0.87, 0.34], [1.1, 0.74], [1.1, 1]], C.n ? "#9cabb7" : "#e1e9e9");
        poly([[0.7, 0.31], [0.73, 0.54], [0.81, 0.64], [0.85, 0.6], [1.1, 0.91], [1.1, 1], [0.82, 1]], C.n ? "#4b6881" : "#88a8bb");
        poly([[0.61, 0.55], [0.7, 0.31], [0.75, 0.46], [0.78, 0.39], [0.82, 0.49], [0.87, 0.34], [0.93, 0.5], [0.88, 0.47], [0.83, 0.56], [0.73, 0.49], [0.68, 0.62]], C.n ? "#bdc7c9" : "#fbf6e9");
        X.poly(c, [[0, h], [0, h * 0.8], [w * 0.18, h * 0.69], [w * 0.42, h * 0.81], [w * 0.67, h * 0.67], [w, h * 0.79], [w, h]], C.n ? "#557682" : "#c1d7dc");
        for (let i = 0; i < w / 11; i++) {
          const tx = 5 + i * 11, ty = h * (0.81 + i % 4 * 0.04), th = 10 + i % 3 * 5;
          const col = C.n ? "#324d5a" : "#60888b";
          X.poly(c, [[tx, ty - th], [tx - th * 0.32, ty], [tx + th * 0.32, ty]], col);
          X.poly(c, [[tx, ty - th], [tx - th * 0.2, ty - th * 0.32], [tx + th * 0.14, ty - th * 0.32]], C.n ? "#b9c8cc" : "#f2f3eb");
        }
      });
      ctx.drawImage(img, x, y);
    }
    function backdrop(ctx) {
      mountains(ctx, 0, 0, 480, 560);
      if (C.n) {
        ell(ctx, 415, 57, 11, 11, "#f2e9c9");
        ell(ctx, 420, 52, 10, 10, "#243b53");
      }
      X.poly(ctx, [[0, 404], [55, 385], [143, 427], [309, 422], [447, 391], [480, 420], [480, 560], [0, 560]], C.n ? "#678393" : "#e7edf0");
      X.poly(ctx, [[0, 456], [104, 440], [200, 487], [360, 462], [480, 477], [480, 560], [0, 560]], C.n ? "#8099a4" : "#f3f3eb");
      const r = rng(28);
      for (let i = 0; i < 32; i++) P(ctx, C.n ? "#bfd0d4" : "#ffffff", r() * 480, 440 + r() * 119, 2, 1);
    }
    function floor(ctx) {
      for (let i = 0; i < FLOOR.length; i++) {
        const a = FLOOR[i], b = FLOOR[(i + 1) % FLOOR.length];
        const side = b[1] < a[1] ? C.WOOD.d : i % 2 ? C.WOOD.d : C.WOOD.m;
        q(ctx, [[...a, -18], [...b, -18], [...b, FL], [...a, FL]], side);
      }
      q(ctx, FLOOR.map(([u, v]) => [u, v, FL]), C.FLOOR.l);
      clip(ctx, FLOOR, FL, () => {
        const r = rng(19);
        for (let v = 2; v < 194; v += 11) {
          seg(ctx, [-5, v, FL], [225, v, FL], C.FLOOR.m);
          for (let u = v % 22 ? 5 : 28; u < 225; u += 48) {
            seg(ctx, [u, v, FL], [u, v + 10, FL], C.FLOOR.m);
            const [x, y] = S(u + 14, v + 7, FL);
            P(ctx, C.FLOOR.m, x, y, 4 + r() * 8, 1);
          }
        }
        q(ctx, [[32, 123, FL + 0.1], [128, 123, FL + 0.1], [128, 184, FL + 0.1], [32, 184, FL + 0.1]], C.RUG.m);
        for (const v of [126, 129, 178, 181]) seg(ctx, [34, v, FL + 0.2], [126, v, FL + 0.2], C.RUG.h);
        for (const u of [35, 38, 122, 125]) seg(ctx, [u, 124, FL + 0.3], [u, 183, FL + 0.3], C.RUG.h);
        if (!C.n) qa(ctx, [[65, 0, FL], [134, 0, FL], [198, 100, FL], [130, 100, FL]], "#fff1c2", 0.33);
      });
    }
    function walls(ctx, nearPost) {
      if (nearPost === true) {
        box(ctx, -3, 178, FL, 5, 5, 125, C.WOOD);
        return;
      }
      const corner = { u: -3, v: 0, w: 5, d: 5 }, rightInner = 216, postW = 3;
      const leftInner = corner.u + corner.w;
      const clear2 = (rightInner - leftInner - 3 * postW) / 4;
      const middlePosts = [1, 2, 3].map((n) => leftInner + n * clear2 + (n - 1) * postW);
      [...middlePosts, rightInner].forEach((u) => box(ctx, u, -2, 23, postW, 4, 115, C.WOOD));
      box(ctx, 2, -2, FL, 218, 6, 19, C.WOOD);
      box(ctx, 2, -2, 138, 218, 6, 7, C.WOOD);
      q(ctx, [[0, 0, FL], [0, 182, FL], [0, 182, 128], [0, 74, 190], [0, 0, 140]], C.WALL.m);
      for (let v = 0; v < 180; v += 14) seg(ctx, [0, v, FL], [0, v, 125], C.WOOD.l);
      box(ctx, corner.u, corner.v, FL, corner.w, corner.d, 141, C.WOOD);
      roofBand(ctx, -6, -1, false);
      box(ctx, 7, -3, 144, 215, 11, 4, C.PAPER, { edge: false });
    }
    function roofBand(ctx, u0, u1, front) {
      const roof = ramp(C.n ? "#5c4a43" : "#77594a");
      q(ctx, [[u0, -8, 141], [u1, -8, 141], [u1, 74, 193], [u0, 74, 193]], roof.m);
      q(ctx, [[u0, 74, 193], [u1, 74, 193], [u1, 190, 129], [u0, 190, 129]], roof.d);
      for (let v = -5; v < 188; v += 10) {
        const z = v < 74 ? 141 + (v + 8) * 52 / 82 : 193 - (v - 74) * 64 / 116;
        seg(ctx, [u0, v, z + 1], [u1, v, z + 1], roof.o);
      }
      if (front) for (let off = 0; off < 5; off++) {
        seg(ctx, [31 + off, -8, 141], [31 + off, 74, 193], C.WOOD.m);
        seg(ctx, [31 + off, 74, 193], [31 + off, 190, 129], C.WOOD.m);
      }
      seg(ctx, [u0, 74, 195], [u1 + (front ? 1 : 0), 74, 195], C.PAPER.l);
    }
    function roofFront(ctx) {
      roofBand(ctx, -1, 31, true);
    }
    function fireplace(ctx) {
      const R = ramp(C.n ? "#8c8173" : "#bcb5a4");
      box(ctx, 0, 110, 76, 25, 2, 5, C.WOOD);
      box(ctx, 3, 109, FL, 22, 3, 5, R);
      box(ctx, -1, 112, FL, 25, 65, 132, R, { fv: R.d, fu: R.m, edge: false });
      for (let z = 6; z < 132; z += 11) for (let v = 114 + (z % 22 ? 0 : 6); v < 176; v += 14) {
        box(ctx, 24, v, z, 1, Math.min(12, 177 - v), 9, R, { fu: (z + v) % 3 ? R.l : R.m, edge: false });
      }
      walls(ctx, true);
      const fire = mk(54, 58, (c) => {
        P(c, "#352923", 0, 0, 54, 58);
        const breathe = Math.sin(FIRE_TIME * 4.5), flicker = Math.sin(FIRE_TIME * 5.3), sway = Math.sin(FIRE_TIME * 3.2) * 1.5;
        const flame = (pts, color) => X.poly(c, pts.map(([x, y]) => [Math.round(x), Math.round(y)]), color);
        flame([[3, 52], [9, 30 + breathe * 2], [17, 38], [26 + sway, 7 - breathe * 4], [30, 29], [40 - sway, 18 + flicker * 2], [49, 52]], mix("#c9672f", "#dc853e", Math.max(0, breathe) * 0.28));
        flame([[12, 52], [18 - sway, 28 + flicker * 2], [23, 39], [30 + sway, 22 - flicker * 4], [38, 43], [43, 52]], mix("#f5b75d", "#ffcf75", Math.max(0, flicker) * 0.3));
        flame([[21, 52], [26 - sway, 38 - Math.sin(FIRE_TIME * 5.9) * 3], [31, 45], [35, 52]], mix("#ffe3a0", "#fff2c8", Math.max(0, breathe) * 0.3));
        P(c, "#79523a", 5, 51, 44, 5);
        P(c, "#4e372b", 12, 49, 28, 3);
      });
      onU(ctx, fire, 25, 117, 72);
      box(ctx, 2, 177, 76, 23, 3, 5, C.WOOD);
      box(ctx, 25, 110, 76, 6, 70, 5, C.WOOD);
      box(ctx, 3, 177, FL, 22, 4, 5, R);
      box(ctx, 25, 109, FL, 5, 72, 5, R);
      [119, 165].forEach((v) => box(ctx, 26, v, 81, 5, 5, 9, C.PAPER, { fv: C.n ? "#ffdd9c" : C.PAPER.l }));
      for (let k = 0; k < 4; k++) box(ctx, 28, 167 + k * 3, FL, 11, 2, 4 + k % 2, C.WOOD);
    }
    const SHELF = [0, 8, 14, 63];
    function shelf(ctx) {
      box(ctx, 0, 8, FL, 12, 63, 91, C.FURN, { fu: C.FURN.d });
      box(ctx, 12, 8, FL + 89, 2, 63, 2, C.FURN);
      const bindings2 = [[0, 1, 2, 0, 3, 4, 4, 5, 1], [4, 3, 0, 1, 1, 5, 2, 0, 4], [5, 2, 0, 3, 4, 1, 0, 0, 3], [0, 4, 3, 5, 2, 2, 0, 1, 4]];
      for (let row = 0; row < 4; row++) {
        box(ctx, 12, 8, FL + row * 22, 2, 63, 2, C.FURN);
        box(ctx, 14, 8, FL + row * 22, 2, 63, 2, C.FURN);
        for (let b = 0; b < 9; b++) box(ctx, 12, 11 + b * 6, FL + row * 22 + 2, 5, 4, 15 + (b * 3 + row) % 5, C.BOOKS[bindings2[row][b]], { edge: false });
      }
      shelfPlants(ctx);
    }
    function shelfPlants(ctx) {
      const [x, y] = S(8, 48, FL + 91);
      const tint = (c) => C.n ? mul(c, "#b5a58e") : c;
      const greens = ["#385d43", "#638653", "#99b071"].map(tint);
      const cream = ["#b8ae95", "#e2d6bd", "#f7ecd5"].map(tint);
      const heart = [[0, -2], [-1, -3], [-3, -3], [-4, -1], [-4, 1], [-2, 3], [0, 5], [3, 2], [4, 0], [4, -2], [2, -3], [1, -3]];
      function leaf(dx, dy, angle, tone, scale) {
        const cs = Math.cos(angle), sn = Math.sin(angle);
        const tr = ([u, v]) => [Math.round(x + dx + (u * cs - v * sn) * scale), Math.round(y + dy + (u * sn + v * cs) * scale)];
        X.poly(ctx, heart.map(tr), greens[0]);
        X.poly(ctx, heart.map(([u, v]) => tr([u * 0.8, v * 0.8])), greens[tone]);
        X.poly(ctx, heart.slice(0, 7).map(([u, v]) => tr([u * 0.65, v * 0.65])), greens[Math.min(2, tone + 1)]);
        const [vx, vy] = tr([0, 0]), [tx, ty] = tr([0, 3]);
        P(ctx, greens[0], vx, vy, 1, 1);
        P(ctx, greens[Math.min(2, tone + 1)], tx, ty, 1, 1);
      }
      const crown = [[-6, -18, 0.8, 0, 0.95], [4, -21, -0.5, 1, 1.05], [10, -15, -0.9, 0, 1.1], [-11, -11, 1.3, 1, 1.05], [2, -13, -0.15, 2, 1.1], [-5, -10, 0.45, 1, 1.15], [9, -8, -0.45, 1, 0.95], [0, -18, 2.7, 1, 0.85]];
      for (const [dx, dy] of crown) {
        X.poly(ctx, [[x, y - 8], [x + dx, y + dy], [x + dx + 1, y + dy], [x + 1, y - 8]], greens[0]);
      }
      crown.forEach((args) => leaf(...args));
      P(ctx, cream[0], x - 5, y - 7, 10, 4);
      P(ctx, cream[1], x - 4, y - 5, 8, 4);
      P(ctx, cream[1], x - 3, y - 2, 6, 2);
      P(ctx, cream[2], x - 4, y - 6, 3, 4);
      P(ctx, cream[0], x + 3, y - 6, 2, 3);
      ell(ctx, x, y - 8, 6, 2, cream[2]);
      ell(ctx, x, y - 8, 4, 1, tint("#5c6345"));
      leaf(-3, -6, 0.5, 1, 0.9);
      leaf(5, -6, -0.7, 2, 0.9);
      X.poly(ctx, [[x + 6, y - 7], [x + 8, y - 5], [x + 10, y - 1], [x + 9, y - 1], [x + 7, y - 5]], greens[0]);
      leaf(10, 0, 0.3, 1, 0.7);
    }
    const BOARD = [22, 74], BV = 8, BZ = [36, 92];
    function board2(ctx) {
      const [u0, u1] = BOARD, w = u1 - u0, h = BZ[1] - BZ[0];
      [u0 + 4, u1 - 4].forEach((u) => {
        box(ctx, u - 1, BV - 5, FL, 2, 10, 1, C.DARK, { edge: false });
        box(ctx, u - 0.5, BV - 0.5, FL + 1, 1, 1, BZ[0] - FL - 1, C.DARK, { edge: false });
      });
      box(ctx, u0, BV - 1, BZ[0], w, 1, h, C.PAPER, { edge: false });
      const pic = mk(w, h, (c) => {
        P(c, C.DARK.m, 0, 0, w, h);
        P(c, C.PAPER.l, 1, 1, w - 2, h - 2);
        const cw = Math.floor((w - 6) / 3);
        const heads = [C.DARK.m, C.WOOD.d, C.SOFT.o];
        const notes = ["#ead799", "#d1dfe0", "#c9d3ba"];
        for (let k = 0; k < 3; k++) {
          const x = 3 + k * cw;
          if (k) P(c, C.WALL.m, x - 1, 5, 1, h - 10);
          P(c, heads[k], x + 2, 5, cw - 5, 2);
          for (let j = 0; j < [3, 2, 2][k]; j++) {
            const y = 11 + j * 14;
            P(c, C.WALL.m, x + 3, y + 1, cw - 6, 11);
            P(c, C.n ? mul(notes[k], "#c9b8aa") : notes[k], x + 2, y, cw - 6, 11);
            P(c, C.DARK.l, x + 4, y + 3, cw - 11, 1);
            P(c, C.DARK.l, x + 4, y + 6, cw - 14, 1);
          }
        }
      });
      onV(ctx, pic, u0, BV, BZ[1]);
    }
    const DESK = [67, 26, 126, 24], DZ = FL + 30;
    const FIXTURES = { desk: { facing: "+v", u: 130, v: 33, z: DZ + 5, seat: [130, 60], keyboard: [117, 43, DZ, 26, 4, 1] } };
    const SEAT = FIXTURES.desk.seat;
    const look = (opts) => ({ frame: C.DARK.o, off: C.DARK.d, accent: C.ACC.l, body: C.DARK, bodyOpts: opts });
    function deskStand(ctx, m) {
      box(ctx, m.cu - 4, m.v - 4, DZ, 8, 3, 1, C.DARK, { edge: false });
      box(ctx, m.cu - 1, m.v - 4, DZ + 1, 2, 2, m.z - DZ + 4, C.DARK, { edge: false });
      box(ctx, m.cu - 1, m.v - 2, DZ + 8, 2, 1, 2, C.DARK, { edge: false });
    }
    function desk(ctx, part) {
      const [u, v, w, d] = DESK, R = C.FURN;
      if (!part || part === "base") {
        foot(ctx, u - 1, v - 1, w + 2, d + 2, FL);
        box(ctx, u + 3, v + 2, FL, 18, d - 4, DZ - FL - 3, R);
        [[u + w - 8, v + 3], [u + w - 8, v + d - 7]].forEach(([a, b]) => box(ctx, a, b, FL, 4, 4, DZ - FL - 3, R));
        box(ctx, u + 20, v + 3, DZ - 9, w - 26, 3, 6, R, { edge: false });
      }
      if (!part || part === "top") {
        box(ctx, u - 2, v - 1, DZ - 3, w + 4, d + 2, 3, R, { hc: R.h });
        for (let k = 0; k < 3; k++) {
          seg(ctx, [u + 5, v + d - 2, FL + 7 + k * 7], [u + 19, v + d - 2, FL + 7 + k * 7], R.o);
          box(ctx, u + 10, v + d - 1, FL + 10 + k * 7, 4, 1, 1, C.WOOD, { edge: false });
        }
        seg(ctx, [u + 5, v + 4, DZ + 0.1], [u + w - 4, v + 4, DZ + 0.1], R.l);
      }
      if (!part || part === "screens") {
        SCREENS.placeDesk(ctx, FIXTURES.desk, look({ fv: C.DARK.d, top: C.DARK.m }), LINKS, { box, onV, stand: deskStand });
        box(ctx, ...FIXTURES.desk.keyboard, C.DARK, { edge: false });
        cup(ctx, 177, 41, DZ);
      }
    }
    function cushion(ctx, u, v, w, d, facing, part) {
      w = w || 18;
      d = d || 16;
      const x = u - w / 2, y = v - d / 2, R = C.FURN;
      if (part !== "back") {
        foot(ctx, x, y, w, d, FL);
        [[x + 2, y + 2], [x + w - 5, y + 2], [x + 2, y + d - 5], [x + w - 5, y + d - 5]].forEach(([a, b]) => box(ctx, a, b, FL, 3, 3, 14, R, { edge: false }));
        box(ctx, x, y, FL + 14, w, d, 2, R);
        box(ctx, x + 1, y + 1, FL + 16, w - 2, d - 2, 2, C.UPHOL);
      }
      if (part === "seat") return;
      if (facing === "+u") {
        box(ctx, x + w - 4, y + 2, FL + 19, 1, d - 4, 17, C.UPHOL, { edge: false });
        box(ctx, x + w - 3, y, FL + 16, 3, d, 23, R);
      } else {
        box(ctx, x + 2, y + d - 4, FL + 19, w - 4, 1, 17, C.UPHOL, { edge: false });
        box(ctx, x, y + d - 3, FL + 16, w, 3, 23, R);
      }
    }
    const PHONE = [205, 23];
    function phone(ctx, active) {
      foot(ctx, 204, 14, 15, 14, FL);
      box(ctx, 206, 15, FL, 12, 12, 27, C.FURN);
      box(ctx, 204, 14, FL + 27, 15, 14, 3, C.FURN);
      box(ctx, 218, 20, FL + 16, 1, 4, 1, C.WOOD, { edge: false });
      box(ctx, 209, 17, FL + 30, 9, 9, 3, C.DARK);
      if (!active) box(ctx, 209, 15, FL + 33, 10, 3, 2, C.DARK);
    }
    const TRAY = [207, 83];
    function tray(ctx, lit) {
      foot(ctx, 204, 81, 15, 19, FL);
      box(ctx, 206, 82, FL, 12, 17, 27, C.FURN);
      box(ctx, 204, 81, FL + 27, 15, 19, 3, C.FURN);
      box(ctx, 218, 89, FL + 16, 1, 4, 1, C.WOOD, { edge: false });
      box(ctx, 207, 83, FL + 30, 12, 16, 3, C.ACC);
      box(ctx, 209, 85, FL + 33, 8, 12, 1, C.PAPER);
    }
    const MEET = [134, 128, 48, 30], MZ = FL + 30;
    FIXTURES.meeting = { facing: "+u", u: 140, v: 143, z: MZ + 5, seat: [196, 143] };
    const MSEAT = FIXTURES.meeting.seat;
    function callStand(ctx, m) {
      box(ctx, m.u - 5, m.v - 4, MZ, 3, 8, 1, C.DARK, { edge: false });
      box(ctx, m.u - 5, m.v - 1, MZ + 1, 2, 2, m.z - MZ + 4, C.DARK, { edge: false });
      box(ctx, m.u - 3, m.v - 1, MZ + 8, 2, 2, 2, C.DARK, { edge: false });
    }
    function meeting(ctx, part) {
      const [u, v, w, d] = MEET;
      if (!part || part === "base") {
        [[u + 4, v + 4], [u + w - 8, v + 4], [u + 4, v + d - 8], [u + w - 8, v + d - 8]].forEach(([a, b]) => box(ctx, a, b, FL, 4, 4, MZ - FL - 3, C.FURN));
        foot(ctx, u, v, w, d, FL);
        box(ctx, u + 4, v + 4, MZ - 8, w - 8, 3, 5, C.FURN, { edge: false });
      }
      if (!part || part === "top") box(ctx, u, v, MZ - 3, w, d, 3, C.FURN, { hc: C.FURN.h });
      if (!part || part === "screen") SCREENS.placeCall(ctx, FIXTURES.meeting, look({ fu: C.DARK.d, top: C.DARK.m }), !C.n || ST === "meeting", { box, onU, stand: callStand });
      if (!part || part === "seat") cushion(ctx, 196, 143, 18, 16, "+u", "seat");
      if (!part || part === "cup") cup(ctx, 165, 142, MZ);
    }
    function meetingFront(ctx) {
      cushion(ctx, 158, 171, 19, 14);
    }
    const BED = [39, 102, 58, 33], TEA = [88, 116];
    function bedBase(ctx) {
      foot(ctx, 37, 99, 63, 40, FL);
      [[39, 102], [94, 102], [39, 133], [94, 133]].forEach(([u, v]) => box(ctx, u, v, FL, 4, 4, 5, C.FURN));
      box(ctx, 37, 99, FL + 5, 63, 40, 5, C.FURN);
    }
    function bedBack(ctx) {
      box(ctx, 45, 100, FL + 10, 23, 6, 20, C.UPHOL);
      box(ctx, 69, 100, FL + 10, 23, 6, 20, C.UPHOL);
    }
    function bedFarArm(ctx) {
      box(ctx, 38, 100, FL + 10, 7, 38, 17, C.SOFT);
      seg(ctx, [39, 102, FL + 27.1], [39, 136, FL + 27.1], C.UPHOL.h);
    }
    function bedSeats(ctx) {
      box(ctx, 45, 107, FL + 10, 23, 31, 7, C.UPHOL);
      box(ctx, 69, 107, FL + 10, 23, 31, 7, C.UPHOL);
      seg(ctx, [47, 137, FL + 17.1], [66, 137, FL + 17.1], C.UPHOL.h);
      seg(ctx, [71, 137, FL + 17.1], [90, 137, FL + 17.1], C.UPHOL.h);
    }
    function bedPillow(ctx) {
      box(ctx, 49, 107, FL + 17, 13, 7, 10, C.LINEN);
    }
    function bedNearArm(ctx) {
      box(ctx, 92, 100, FL + 10, 8, 38, 17, C.SOFT);
      seg(ctx, [98, 102, FL + 27.1], [98, 136, FL + 27.1], C.UPHOL.h);
    }
    function bed(ctx) {
      bedBase(ctx);
      bedFarArm(ctx);
      bedBack(ctx);
      bedSeats(ctx);
      bedPillow(ctx);
      blanket(ctx);
    }
    function blanket(ctx) {
      q(ctx, [[70, 113, FL + 17.8], [90, 113, FL + 17.8], [90, 138.1, FL + 17.8], [70, 138.1, FL + 17.8]], C.LINEN.l);
      q(ctx, [[70, 138.1, FL + 10.5], [90, 138.1, FL + 10.5], [90, 138.1, FL + 17.8], [70, 138.1, FL + 17.8]], C.LINEN.m);
      for (let u = 73; u < 90; u += 6) seg(ctx, [u, 113, FL + 17.9], [u, 138, FL + 17.9], C.SOFT.m);
      for (let v = 116; v < 137; v += 6) seg(ctx, [70, v, FL + 17.9], [90, v, FL + 17.9], C.SOFT.m);
    }
    function cup(ctx, u, v, z) {
      const [x, y] = S(u, v, z);
      P(ctx, C.PAPER.m, x - 2, y - 4, 5, 5);
      ell(ctx, x, y - 4, 3, 2, C.PAPER.l);
      ell(ctx, x, y - 4, 2, 1, C.WOOD.d);
      P(ctx, C.PAPER.l, x + 3, y - 3, 2, 3);
    }
    function teaSeat() {
    }
    function teaTray(ctx) {
      foot(ctx, 56, 149, 25, 21, FL);
      [[58, 151], [77, 151], [58, 166], [77, 166]].forEach(([u, v]) => box(ctx, u, v, FL, 3, 3, 14, C.FURN));
      box(ctx, 56, 149, FL + 14, 25, 21, 3, C.FURN);
      cup(ctx, 77, 153, FL + 17);
      const [x, y] = S(64, 152, FL + 18);
      ell(ctx, x, y - 4, 5, 4, C.WALL.m);
      ell(ctx, x, y - 7, 4, 2, C.WALL.l);
      P(ctx, C.WOOD.d, x - 1, y - 10, 2, 2);
      P(ctx, C.WALL.l, x - 8, y - 5, 4, 2);
      const binding = ramp(C.n ? "#596e6d" : "#708b87");
      box(ctx, 58, 158, FL + 17, 15, 10, 0.6, binding, { edge: false });
      box(ctx, 58.8, 158.5, FL + 17.6, 13.6, 8.8, 1.8, C.PAPER, { edge: false });
      box(ctx, 58, 158, FL + 17.6, 0.8, 10, 1.8, binding, { edge: false });
      box(ctx, 58, 158, FL + 19.4, 15, 10, 0.6, binding, { edge: false });
      seg(ctx, [60, 158.8, FL + 20.1], [60, 167, FL + 20.1], binding.d);
      seg(ctx, [62, 163, FL + 20.1], [70, 163, FL + 20.1], C.PAPER.m);
      seg(ctx, [60, 167.35, FL + 18.3], [71, 167.35, FL + 18.3], C.WALL.m);
    }
    const STAIRS = { u0: 220, u1: 242, u2: 264, v0: 30, v1: 62, upper: -7, lower: -18, snow: -18 };
    function entryStairs(ctx) {
      const { u0, u1, u2, v0, v1, upper, lower, snow } = STAIRS;
      q(ctx, [[238, 25, snow], [269, 25, snow], [273, 36, snow], [270, 66, snow], [261, 69, snow], [238, 65, snow]], C.n ? "#678393" : "#e7edf0");
      box(ctx, u0, v0, snow, u1 - u0, v1 - v0, upper - snow, C.FURN);
      box(ctx, u1, v0, lower, u2 - u1, v1 - v0, 0, C.FURN);
    }
    const ACTOR_K = 2;
    const SPRITES = /* @__PURE__ */ new WeakMap();
    function sprite(s) {
      let byPal = SPRITES.get(s);
      if (!byPal) SPRITES.set(s, byPal = /* @__PURE__ */ new WeakMap());
      let img = byPal.get(C.actor);
      if (!img) byPal.set(C.actor, img = mk(s.w, s.h, (c) => PX.paint(c, s, C.actor, 0, 0)));
      return img;
    }
    function poseSprite(pose) {
      if (pose === "turn") return CONTRACT.turnSprite(CHAR, false);
      if (pose === "turnL") return CONTRACT.turnSprite(CHAR, true);
      return CHAR.poses[pose] || CHAR.poses.idle;
    }
    function actorAt(ctx, pose, u, v, z) {
      const s = poseSprite(pose);
      const [x, y] = S(u, v, z);
      const K = CHAR.k || ACTOR_K;
      const w = s.w * K;
      const h = s.h * K;
      const left = Math.round(x - w / 2);
      const top = Math.round(y) - h + 1;
      ctx.drawImage(sprite(s), left, top, w, h);
      return { left, top, w, h };
    }
    const STATIONS = CONTRACT.STATIONS;
    const SLEEP_SURFACE = { u: BED[0] + 7, v: BED[1] + 4, z: FL + 24, w: 44, d: 30 };
    const PLACES = {
      code: { u: SEAT[0], v: SEAT[1], z: FL + 18, own: "turn", shared: "turn", sit: true },
      work: { u: SEAT[0], v: SEAT[1], z: FL + 18, own: "turn", shared: "turn", sit: true },
      meeting: { u: 196, v: 143, z: FL + 18, own: "turnL", shared: "turnL", sit: true },
      board: { u: 38, v: 14, z: FL, own: "post", shared: "back" },
      library: { u: 28, v: 50, z: FL, own: "read", shared: "back" },
      phone: { u: 200, v: 58, z: FL, own: "phone", shared: "idle" },
      handoff: { u: 196, v: 91, z: FL, own: "attention", shared: "idle", bang: true },
      tea: { u: 88, v: 116, z: FL + 17, own: "tea", shared: "idle", sit: true },
      door: { u: 214, v: 40, z: FL, own: "wave", shared: "idle" },
      walk: { u: 116, v: 90, z: FL, own: "walkA", shared: "walkA" },
      sleep: { ...window.ROOM_PAINTER.sleepPlace(SLEEP_SURFACE), own: "sleep", shared: "sleep", lie: true }
    };
    function drawOri(ctx, place, pose) {
      if (place.lie && CHAR.sleepSurface) {
        const s = CHAR.poses[pose] || CHAR.poses.sleep;
        window.ROOM_PAINTER.sleeper(ctx, sprite(s), S, SLEEP_SURFACE, place);
        return null;
      }
      if (place.lie) {
        const s = CHAR.poses[pose] || CHAR.poses.sleep;
        const K = CHAR.k || ACTOR_K;
        const big = mk(s.w * K, s.h * K, (c) => c.drawImage(sprite(s), 0, 0, s.w * K, s.h * K));
        onV(ctx, big, place.u, place.v, place.z + big.height - 6);
        return null;
      }
      const own = pose === "turn" || pose === "turnL" || CHAR.poses[pose];
      const o = actorAt(ctx, own ? pose : place.shared, place.u, place.v, place.z);
      if (place.bang && !CHAR.poses[pose]) {
        const x = Math.round(o.left + o.w / 2) - 2;
        P(ctx, C.ACC.m, x, o.top - 16, 4, 9);
        P(ctx, C.ACC.m, x, o.top - 5, 4, 3);
      }
      return o;
    }
    let ST = "code";
    function parts(station, walking) {
      const L = [], add = (draw2, fp, front) => L.push({ draw: draw2, fp, front });
      const contact = (...names) => !walking && names.includes(station) ? false : void 0;
      add(backdrop);
      add(floor);
      add(walls, [-6, -8, 2, 183]);
      add(fireplace, [-1, 109, 39, 181]);
      add(roofFront, [-6, -8, 2, 183]);
      add(shelf, [0, 8, 17, 71]);
      add(board2, [BOARD[0], BV - 5, BOARD[1], BV + 1]);
      add((c) => desk(c, "base"), [65, 25, 195, 51]);
      add((c) => desk(c, "top"), [65, 25, 195, 51]);
      add((c) => desk(c, "screens"), [67, 29, 193, 47]);
      add((c) => phone(c, station === "phone"), [204, 14, 219, 28]);
      add((c) => cushion(c, ...SEAT, 18, 16, "+v", "seat"), [SEAT[0] - 9, SEAT[1] - 8, SEAT[0] + 9, SEAT[1] + 8], contact("code", "work"));
      add((c) => cushion(c, ...SEAT, 18, 16, "+v", "back"), [SEAT[0] - 9, SEAT[1] + 5, SEAT[0] + 9, SEAT[1] + 8], !walking && ["code", "work"].includes(station) ? true : void 0);
      add((c) => tray(c, station === "handoff"), [204, 81, 219, 100]);
      add(bedBase, [37, 99, 100, 139], contact("tea", "sleep"));
      add(bedFarArm, [38, 100, 45, 138]);
      add(bedBack, [45, 100, 92, 106]);
      add(bedSeats, [45, 107, 92, 138], contact("tea", "sleep"));
      add(bedPillow, [49, 107, 62, 114], contact("sleep"));
      add(blanket, [70, 113, 90, 138.1], contact("tea", "sleep"));
      if (station === "sleep" && !CHAR.sleepSurface) add(blanket, [70, 113, 90, 138.1], walking ? void 0 : true);
      add(bedNearArm, [92, 100, 100, 138], !walking && ["tea", "sleep"].includes(station) ? true : void 0);
      add(teaTray, [56, 149, 81, 170]);
      add((c) => meeting(c, "base"), [134, 128, 182, 158]);
      add((c) => meeting(c, "top"), [134, 128, 182, 158]);
      add((c) => meeting(c, "screen"), [134, 117, 140, 166]);
      add((c) => meeting(c, "seat"), [187, 135, 205, 151], contact("meeting"));
      add((c) => meeting(c, "cup"), [162, 139, 170, 145]);
      add((c) => cushion(c, 196, 143, 18, 16, "+u", "back"), [202, 135, 205, 151], !walking && station === "meeting" ? true : void 0);
      add((c) => cushion(c, 158, 171, 19, 14, void 0, "seat"), [148.5, 164, 167.5, 178]);
      add((c) => cushion(c, 158, 171, 19, 14, void 0, "back"), [148.5, 175, 167.5, 178]);
      add(entryStairs, [STAIRS.u0, STAIRS.v0, STAIRS.u2, STAIRS.v1]);
      return L;
    }
    function slotFor(station, u, v) {
      return window.ROOM_PAINTER.maskFor(parts(station, true), u, v);
    }
    function layers(station, slot2, seconds = 0) {
      FIRE_TIME = Number.isFinite(seconds) ? seconds : 0;
      ST = station;
      const L = parts(station, slot2 !== void 0), place = PLACES[station] || PLACES.code;
      const mask = slot2 === void 0 ? window.ROOM_PAINTER.maskFor(L, place.u, place.v) : slot2;
      const result = window.ROOM_PAINTER.layers(L, mask, mk);
      if (slot2 === void 0 && station === "sleep") sleepMarks(result.front.getContext("2d"));
      return result;
    }
    function sleepMarks(ctx) {
      const [x, y] = S(BED[0] + 16, BED[1] + 18, FL + 44);
      X.zzz(ctx, Math.round(x), Math.round(y), C.n ? "#fff4dc" : C.DARK.m);
    }
    function drawOverlay(ctx, station = ST) {
      if (station === "handoff") {
        const [x, y] = S(213, 91, FL + 37);
        glow(ctx, x, y, 20, "#ffc986", 0.35);
      }
      if (C.n) nightLights(ctx);
    }
    function nightLights(ctx) {
      const [fx, fy] = S(26, 144, 43);
      glow(ctx, fx, fy, 150, "#ffac52", 0.4);
      glow(ctx, fx, fy, 48, "#ffd18b", 0.28);
      const [dx, dy] = S(180, 25, 64);
      glow(ctx, dx, dy, 98, "#ffcf87", 0.28);
      SCREENS.deskScreens(FIXTURES.desk).forEach((m) => {
        const [x, y] = S(m.cu, m.v, m.z + m.h / 2);
        glow(ctx, x, y, 27, LINKS[m.kind] === false ? "#ff9d59" : "#cadfec", 0.16);
      });
    }
    const NODES = {
      // Approach beside each chair, rise to its cushion, then settle on the
      // fixture seat through the shared stage's arrival transition.
      hub: [116, 100],
      walk: [116, 90],
      code: [SEAT[0] + 18, SEAT[1]],
      codeRear: [146, 100],
      codeSide: [146, SEAT[1]],
      loungeWay: [105, 92],
      rearWay: [105, 64],
      left: [50, 64],
      library: [28, 50],
      board: [38, 14],
      phoneWay: [195, 64],
      phone: [200, 58],
      doorWay: [199, 50],
      door: [214, 40],
      handoff: [196, 91],
      // Floor walks end outside the sofa. The seated/lying PLACES stay on
      // the cushions; only the arrival transition transfers Agent onto them.
      teaWay: [104, 130],
      teaFront: [104, 143],
      tea: [88, 143],
      sleep: [46, 143],
      meetingWay: [150, 113],
      front: [196, 116],
      meeting: [MSEAT[0], MSEAT[1] - 19]
    };
    const EDGES = [
      ["hub", "walk"],
      ["hub", "codeRear"],
      ["codeRear", "codeSide"],
      ["codeSide", "code"],
      ["hub", "loungeWay"],
      ["loungeWay", "rearWay"],
      ["rearWay", "left"],
      ["left", "library"],
      ["left", "board"],
      ["hub", "phoneWay"],
      ["phoneWay", "phone"],
      ["phoneWay", "handoff"],
      ["phoneWay", "doorWay"],
      ["doorWay", "door"],
      ["hub", "teaWay"],
      ["teaWay", "teaFront"],
      ["teaFront", "tea"],
      ["tea", "sleep"],
      ["hub", "meetingWay"],
      ["meetingWay", "front"],
      ["front", "meeting"]
    ];
    const floorAt = (u, v) => {
      if (u >= STAIRS.u0 && u < STAIRS.u1 && v >= STAIRS.v0 && v <= STAIRS.v1) return STAIRS.upper;
      if (u >= STAIRS.u1 && u <= STAIRS.u2 && v >= STAIRS.v0 && v <= STAIRS.v1) return STAIRS.lower;
      return pointIn(u, v, FLOOR) ? FL : 0;
    };
    const SPOTS = {
      tasks: [BOARD[0], BV - 5, FL, BOARD[1], BV + 1, BZ[1]],
      library: [0, 8, FL, 17, 71, FL + 91],
      meeting: [133, 117, FL, 206, 179, FIXTURES.meeting.z + SCREENS.CALL_H],
      handoff: [207, 83, FL + 30, 219, 100, FL + 35],
      phone: [207, 14, FL + 30, 219, 28, FL + 37],
      desk: SCREENS.deskBox(FIXTURES.desk)
    };
    let LINKS = { claude: true, slack: true };
    const linksOf = (l) => ({ claude: !l || l.claude !== false, slack: !l || l.slack !== false });
    const PALETTES = /* @__PURE__ */ new Map();
    function use(t, weather, char, links) {
      CHAR = char;
      LINKS = linksOf(links);
      let byChar = PALETTES.get(char);
      if (!byChar) PALETTES.set(char, byChar = /* @__PURE__ */ new Map());
      if (!byChar.has(t)) byChar.set(t, palette(t));
      C = byChar.get(t);
    }
    function draw(ctx, m) {
      FIRE_TIME = Number.isFinite(m.fireTime) ? m.fireTime : 0;
      const t = m.t || "day";
      const station = m.station || (t === "night" ? "sleep" : "code");
      use(t, m.weather || "clear", m.char || (window.ACTOR_FINAL || []).find((c) => c.key === "fin-paper") || { poses: ACTOR.sprout, pal: X.ORIPAL.sprout }, m.links);
      ST = station;
      const place = PLACES[station] || PLACES.code;
      const room2 = mk(480, 560, (c) => {
        const { back, front } = layers(station, void 0, FIRE_TIME);
        c.drawImage(back, 0, 0);
        drawOri(c, place, m.pose || place.own);
        c.drawImage(front, 0, 0);
        drawOverlay(c, station);
      });
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(room2, 0, 0, 960, 1120);
    }
    const room = { STATIONS, PLACES, NODES, EDGES, SPOTS, FIXTURES, floorAt, project: S, use, slotFor, layers, drawOri, drawOverlay, animationFrameMs: 1e3 / 12 };
    window.OFFICE_ROOMS = window.OFFICE_ROOMS || [];
    window.OFFICE_ROOMS.push({ key: "alpine", zh: "\u96EA\u5C71\u6728\u5C4B", name: "Alpine chalet", room });
    CONCEPTS.push({
      key: "room-alpine",
      zh: "\u96EA\u5C71\u6728\u5C4B",
      name: "Alpine chalet",
      actor: "fin-paper",
      actorPal: X.ORIPAL.sprout,
      stations: STATIONS,
      angle: "\u4F4F\u5728\u96EA\u5CF0\u524D\uFF1A\u6574\u5E45\u5C71\u666F\u7A97\u3001\u539A\u6728\u6881\u659C\u9876\u4E0E\u4E00\u5EA7\u771F\u6B63\u5360\u4E3B\u89D2\u7684\u77F3\u58C1\u7089\uFF0C\u56F4\u51FA\u6696\u6728\u8272\u7684\u9AD8\u5C71\u5C0F\u5C4B\u3002",
      why: "\u7A97\u5916\u662F\u8FBD\u9614\u96EA\u84DD\uFF0C\u5C4B\u91CC\u662F\u706B\u5149\u3001\u6DF1\u8F6F\u6C99\u53D1\u3001\u683C\u7EB9\u6BEF\u548C\u5192\u70ED\u6C14\u7684\u8336\uFF1B\u5DE5\u4F5C\u53F0\u6CBF\u7A97\uFF0C\u4F1A\u8BAE\u89D2\u7559\u5728\u53E6\u4E00\u4FA7\u3002",
      map: "\u7A97\u8FB9\u5DE5\u4F5C\u53F0\u3001\u540E\u89D2\u4EFB\u52A1\u677F\u4E0E\u4E66\u67B6\u3001\u77F3\u58C1\u7089\u548C\u6C99\u53D1\u3001\u65C1\u684C\u4E0A\u7684\u4E66\u4E0E\u8336\u3001\u53F3\u524D\u4F1A\u8BAE\u684C\uFF0C\u5F00\u655E\u5165\u53E3\u65C1\u662F\u7535\u8BDD\u548C\u4EA4\u63A5\u53F0\u3002",
      cost: "\u4E0E\u4EA7\u54C1\u5171\u7528\u623F\u95F4\u6E90\u3001\u5C4F\u5E55\u548C\u89D2\u8272\u63A5\u53E3\uFF1B\u7089\u706B\u6309\u4F20\u5165\u7684\u573A\u666F\u65F6\u95F4\u8F7B\u5FAE\u8D77\u4F0F\u3002",
      draw,
      detail: [0, 120, 480, 420]
    });
  })();
  (function() {
    "use strict";
    const { P, ell, ramp, mix, glow } = CP;
    const X = CX;
    const SCREENS = window.OFFICE_SCREENS;
    const CONTRACT = window.ROOM_CONTRACT;
    const OX = 224;
    const OY = 246;
    const RU = 336;
    const RV = 252;
    const H = 174;
    const FL = 4;
    const PB = 20;
    const S = (u, v, z) => [OX + u - v, OY + (u + v) / 2 - (z || 0)];
    const VIEW = { k: 0.72, x: 65, y: 45 };
    const project = (u, v, z) => S(u, v, z).map((n, i) => n * VIEW.k + (i ? VIEW.y : VIEW.x));
    function camera(ctx) {
      ctx.translate(VIEW.x, VIEW.y);
      ctx.scale(VIEW.k, VIEW.k);
    }
    const q = (ctx, pts, c) => {
      const p = pts.map((a) => S(a[0], a[1], a[2]));
      ctx.fillStyle = c;
      ctx.beginPath();
      p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      ctx.fill();
    };
    const noise = (a, b) => {
      const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
      return n - Math.floor(n);
    };
    function qa(ctx, pts, c, a) {
      ctx.save();
      ctx.globalAlpha = a;
      q(ctx, pts, c);
      ctx.restore();
    }
    function seg(ctx, a, b, c) {
      const [x0, y0] = S(a[0], a[1], a[2]);
      const [x1, y1] = S(b[0], b[1], b[2]);
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      ctx.fillStyle = c;
      for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.floor(y0 + (y1 - y0) * i / n + 1e-6), 1, 1);
    }
    function box(ctx, u, v, z, du, dv, dz, R, o) {
      o = o || {};
      const t = z + dz;
      if (dz > 0) {
        const [sx, sy] = S(u, v, t);
        const shade = (top, bottom) => {
          const g = ctx.createLinearGradient(sx, sy, sx, sy + Math.max(2, dz));
          g.addColorStop(0, top);
          g.addColorStop(1, bottom);
          return g;
        };
        q(ctx, [[u, v + dv, z], [u + du, v + dv, z], [u + du, v + dv, t], [u, v + dv, t]], o.fv || shade(R.m, mix(R.m, R.d, 0.26)));
        q(ctx, [[u + du, v, z], [u + du, v + dv, z], [u + du, v + dv, t], [u + du, v, t]], o.fu || shade(R.d, mix(R.d, R.o, 0.16)));
      }
      q(ctx, [[u, v, t], [u + du, v, t], [u + du, v + dv, t], [u, v + dv, t]], o.top || R.l);
      if (o.edge !== false) {
        seg(ctx, [u, v + dv, t], [u + du, v + dv, t], o.hc || R.h);
        seg(ctx, [u + du, v, t], [u + du, v + dv, t], o.hc || R.h);
      }
    }
    function foot(ctx, u, v, du, dv, z) {
      if (ctx.roomOcclusionMask) return;
      const [x, y] = S(u + du / 2 + 2, v + dv / 2 + 2, z);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale((du + dv) * 0.62 + 5, (du + dv) * 0.28 + 3);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, "rgba(83,55,30,.18)");
      g.addColorStop(0.55, "rgba(83,55,30,.08)");
      g.addColorStop(1, "rgba(83,55,30,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }
    function mk(w, h, fn) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d");
      x.imageSmoothingEnabled = false;
      fn(x, w, h);
      return c;
    }
    function onV(ctx, img, u0, vp, zTop) {
      const [x0, y0] = S(u0, vp, zTop);
      ctx.save();
      ctx.transform(1, 0.5, 0, 1, x0, y0);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    }
    function onU(ctx, img, up, v0, zTop, opening) {
      const w = img.width;
      const [x0, y0] = S(up, v0 + w, zTop);
      ctx.save();
      ctx.transform(1, -0.5, 0, 1, x0, y0);
      ctx.drawImage(img, 0, 0);
      if (opening) paintExterior(ctx, opening);
      ctx.restore();
    }
    const LANDING = [22, RV, 142, RV + 76];
    const DOOR = { left: 22, right: 82, v: RV + 3, height: 92 };
    const PORTAL_H = 106;
    const DESK = [142, 26, 94, 26];
    const DZ = FL + 30;
    const MEET = [88, 116, 48, 72];
    const MZ = FL + 24;
    const SEAT = [189, 60];
    const MSEAT = [150, 148];
    const PHONE = [244, 76, 20, 18];
    const TRAY = [88, RV + 10, 22, 16];
    const BED = [210, 172, 80, 40];
    const TEA = [286, 132];
    const TEA_TABLE = [308, 124];
    const BOARD = [46, 110];
    const FIXTURES = {
      desk: { facing: "+v", u: SEAT[0], v: 32, z: DZ + 4, seat: SEAT, keyboard: [SEAT[0] - 13, 44, DZ, 26, 5, 1] },
      meeting: { facing: "+u", u: 98, v: MSEAT[1], z: MZ + 6, seat: MSEAT }
    };
    let C, CHAR;
    let LINKS = { slack: true, claude: true };
    let ST = "code";
    const ART_FRAMES = {
      shelf: [103, 9, 387, 616],
      flowers: [614, 28, 331, 548],
      olive: [1104, 96, 370, 488],
      desk: [44, 640, 441, 346],
      bed: [566, 635, 492, 365],
      tea: [1165, 689, 275, 282],
      wallLeft: [49, 210, 386, 615],
      wallRight: [467, 197, 632, 738],
      planter: [1131, 537, 392, 349]
    };
    const RIGHT_WINDOW_OPENINGS = `
    M91.5 154 C92 131 102 116 118 116.5 C145 116.5 170 154 178 195 L178 372.5 L91.5 328 Z
    M285.5 254 C285.5 228 298 211.5 315 211.5 C340 211.5 367 247 376 294 L376 474 L285.5 424 Z
    M478.5 347.5 C478.5 325 491 309.5 506 310.5 C528 311.5 551 348 560 386 L560 570.5 L478.5 524 Z`;
    const LEFT_WINDOW_OPENING = `
    M30.7 24.6 C35.5 8.7 52.8 1.6 62 2.9 C70.3 3.5 77.2 12.4 78.9 18.5
    L79 27.6 L70.4 25.7 L70.4 82 L30.7 81.8 Z`;
    function paintExterior(ctx, opening) {
      if (ctx.roomOcclusionMask || !window.LANDSCAPES?.sceneKey()?.startsWith("santorini|")) return;
      ctx.save();
      ctx.clip(new Path2D(opening));
      ctx.resetTransform();
      P(ctx, C.bg, 0, 0, 480, 560);
      ctx.restore();
    }
    let artImage, floorImage, architectureImage, leftWallImage, artPromise, artLoaded = false;
    const artPictures = /* @__PURE__ */ new Map();
    const floorPictures = /* @__PURE__ */ new Map();
    function ready() {
      const load = (source) => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Santorini artwork could not load"));
        image.src = source;
      });
      if (!artPromise) artPromise = Promise.all([
        load(window.SANTORINI_ART_SOURCE || "../../../packages/actor-office/assets/santorini-props.webp"),
        load(window.SANTORINI_FLOOR_SOURCE || "../../../packages/actor-office/assets/santorini-floor.webp"),
        load(window.SANTORINI_ARCHITECTURE_SOURCE || "../../../packages/actor-office/assets/santorini-architecture.webp"),
        load(window.SANTORINI_LEFT_WALL_SOURCE || "../../../packages/actor-office/assets/santorini-wall-left.webp")
      ]).then(([props, stones, walls2, leftWall]) => {
        artImage = props;
        floorImage = stones;
        architectureImage = walls2;
        leftWallImage = leftWall;
        artLoaded = true;
      });
      return artPromise;
    }
    function artPicture(key) {
      const cacheKey = `${key}|${C.n}`;
      if (!artPictures.has(cacheKey)) {
        const [sx, sy, sw, sh] = ART_FRAMES[key];
        artPictures.set(cacheKey, mk(sw, sh, (c) => {
          const source = key.startsWith("wall") || key === "planter" ? architectureImage : artImage;
          if (key === "wallLeft") c.drawImage(leftWallImage, 0, 0);
          else c.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
          if (C.n) {
            c.globalCompositeOperation = "source-atop";
            c.fillStyle = "rgba(29,49,76,.48)";
            c.fillRect(0, 0, sw, sh);
          }
        }));
      }
      return artPictures.get(cacheKey);
    }
    function art(ctx, key, x, bottom, width, height, mirror = false) {
      if (!artLoaded) return false;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      if (mirror) {
        ctx.translate(x + width, bottom - height);
        ctx.scale(-1, 1);
      } else ctx.translate(x, bottom - height);
      ctx.drawImage(artPicture(key), 0, 0, width, height);
      ctx.restore();
      return true;
    }
    function artBox(ctx, key, u, v, du, dv, height, mirror = false) {
      const [left] = S(u, v + dv, FL);
      const [, bottom] = S(u + du, v + dv, FL);
      return art(ctx, key, left, bottom + 1, du + dv, (du + dv) / 2 + height, mirror);
    }
    function artPlane(ctx, key, source, world) {
      if (!artLoaded) return false;
      const [frameX, frameY] = ART_FRAMES[key];
      const [a, b, c] = source.map(([x, y]) => [x - frameX, y - frameY]);
      const [A, B, D] = world.map((p) => S(...p));
      const bx = b[0] - a[0], by = b[1] - a[1], cx = c[0] - a[0], cy = c[1] - a[1];
      const determinant = bx * cy - cx * by;
      const xx = ((B[0] - A[0]) * cy - (D[0] - A[0]) * by) / determinant;
      const xy = ((D[0] - A[0]) * bx - (B[0] - A[0]) * cx) / determinant;
      const yx = ((B[1] - A[1]) * cy - (D[1] - A[1]) * by) / determinant;
      const yy = ((D[1] - A[1]) * bx - (B[1] - A[1]) * cx) / determinant;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.transform(xx, yx, xy, yy, A[0] - xx * a[0] - xy * a[1], A[1] - yx * a[0] - yy * a[1]);
      ctx.drawImage(artPicture(key), 0, 0);
      ctx.restore();
      return true;
    }
    function rightWall(ctx) {
      const a = [468, 213], b = [1070, 512], c = [468, 599];
      const frame = ART_FRAMES.wallRight, A = S(0, 0, H), B = S(RU, 0, H), D = S(0, 0, FL);
      const sy = (D[1] - A[1]) / (c[1] - a[1]);
      const sx = (B[0] - A[0]) / (b[0] - a[0]);
      const skew = (B[1] - A[1] - sy * (b[1] - a[1])) / (b[0] - a[0]);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.transform(sx, skew, 0, sy, A[0] - sx * (a[0] - frame[0]), A[1] - skew * (a[0] - frame[0]) - sy * (a[1] - frame[1]));
      ctx.drawImage(artPicture("wallRight"), 0, 0);
      paintExterior(ctx, RIGHT_WINDOW_OPENINGS);
      ctx.restore();
    }
    function palette(t) {
      const n = t === "night";
      const tint = (hex) => ramp(n ? mix(hex, "#273b58", 0.52) : t === "golden" ? mix(hex, "#efbd87", 0.16) : hex);
      const wall = { l: "#fffcf6", m: "#f7f3ec", d: "#e7e0d6", o: "#c9bdad", h: "#ffffff" };
      return {
        n,
        bg: n ? "#293343" : "#f6eee2",
        FLOOR: tint("#e9ddcb"),
        WALL: Object.fromEntries(Object.entries(wall).map(([k, v]) => [k, n ? mix(v, "#273b58", 0.52) : v])),
        WOOD: tint("#ce945e"),
        BLUE: tint("#1760ac"),
        DARK: tint("#3e403f"),
        PAPER: tint("#fffaf0"),
        GREEN: tint("#788052"),
        TERRA: tint("#d38b50"),
        PINK: tint("#d52e7d"),
        ACC: tint("#e8592c"),
        SKY: n ? "#263c5b" : "#b5def0",
        SEA: n ? "#264c71" : "#3e96bd",
        actor: Object.fromEntries(Object.entries(CHAR.pal).map(([k, v]) => [k, n && /^#[0-9a-f]{6}$/i.test(v) ? mix(v, "#6e82a0", 0.3) : v]))
      };
    }
    function picture(w, h, fn) {
      return mk(w, h, fn);
    }
    function stone(ctx, u, v, du, dv) {
      box(ctx, u, v, -PB, du, dv, PB + FL, C.WALL, { edge: false, top: C.WALL.l });
      if (artLoaded) {
        if (!floorPictures.has(C.n)) floorPictures.set(C.n, mk(384, 384, (c) => {
          c.imageSmoothingEnabled = true;
          c.drawImage(floorImage, 0, 0, 384, 384);
          if (C.n) {
            c.fillStyle = "rgba(29,49,76,.48)";
            c.fillRect(0, 0, 384, 384);
          }
        }));
        ctx.save();
        ctx.transform(1, 0.5, -1, 0.5, OX, OY - FL);
        ctx.fillStyle = ctx.createPattern(floorPictures.get(C.n), "repeat");
        ctx.fillRect(u, v, du, dv);
        ctx.restore();
        return;
      }
      const shades = ["#e9ddcd", "#efe5d7", "#e5d6c2", "#f4ebdf", "#eadfce"];
      for (let row = 0, b = v; b < v + dv; row++, b += 23) {
        for (let a = u - row % 2 * 14; a < u + du; a += 31) {
          const l = Math.max(u, a) + 0.9, r = Math.min(u + du, a + 31) - 0.9;
          const top = b + 0.9, bottom = Math.min(v + dv, b + 23) - 0.9;
          if (r <= l || bottom <= top) continue;
          const k = noise(a, b), cut = 2.3 + k * 1.5;
          const color = C.n ? mix(shades[Math.floor(k * shades.length)], "#273b58", 0.52) : shades[Math.floor(k * shades.length)];
          q(ctx, [[l + cut, top, FL + 0.1], [r - cut, top, FL + 0.1], [r, top + cut, FL + 0.1], [r, bottom - cut, FL + 0.1], [r - cut, bottom, FL + 0.1], [l + cut, bottom, FL + 0.1], [l, bottom - cut, FL + 0.1], [l, top + cut, FL + 0.1]], color);
          for (let j = 0; j < 4; j++) {
            const x = l + 3 + noise(a + j, b) * Math.max(0, r - l - 6);
            const y = top + 2 + noise(b + j, a) * Math.max(0, bottom - top - 4);
            const [px, py] = S(x, y, FL + 0.2);
            P(ctx, C.n ? "#84909b" : "#fffaf1", px, py, 0.7, 0.45);
          }
        }
      }
    }
    function floor(ctx) {
      foot(ctx, 0, 0, RU, RV + 22, -PB - 1);
      stone(ctx, 0, 0, RU, RV);
      stone(ctx, 0, RV, LANDING[0], 24);
      stone(ctx, LANDING[0], LANDING[1], LANDING[2] - LANDING[0], LANDING[3] - LANDING[1]);
      meetingRug(ctx);
      if (!C.n)
        [[92, 41], [150, 69], [196, 93]].forEach(([u, v]) => qa(ctx, [[u, v, FL + 0.5], [u + 25, v, FL + 0.5], [u + 53, v + 49, FL + 0.5], [u + 28, v + 49, FL + 0.5]], "#fff9dd", 0.25));
    }
    function archTop(i, w) {
      const r = w / 2;
      return r - Math.sqrt(Math.max(0, r * r - (i - r) * (i - r)));
    }
    function seaWindow(w, h) {
      return picture(w, h, (c) => {
        const r = w / 2;
        c.save();
        c.beginPath();
        c.moveTo(0, h);
        c.lineTo(0, r);
        c.arc(r, r, r, Math.PI, 0);
        c.lineTo(w, h);
        c.closePath();
        c.clip();
        const sky = c.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, C.n ? "#263b59" : "#5cbdf0");
        sky.addColorStop(0.49, C.n ? "#334e6e" : "#b6e5f8");
        sky.addColorStop(0.5, C.n ? "#244e72" : "#2696d4");
        sky.addColorStop(1, C.n ? "#153751" : "#075da0");
        c.fillStyle = sky;
        c.fillRect(0, 0, w, h);
        if (!C.n) {
          for (const [x, y, rw] of [[8, 43, 7], [14, 42, 6], [19, 46, 8]]) ell(c, x, y, rw, 2.5, "#f7fcfd");
          for (let k = 0; k < 8; k++) P(c, k % 2 ? "#5db5de" : "#98d9ed", 1 + k % 3 * 7, h * 0.58 + k * 3, 12 - k / 2, 0.55);
        }
        X.poly(c, [[w, h * 0.55], [w - 8, h * 0.67], [w - 11, h * 0.79], [w - 26, h], [w, h]], C.n ? "#4e5e61" : "#c7aa8c");
        for (let k = 0; k < 9; k++) {
          const x = w - 7 - k % 3 * 7, y = h - 12 - Math.floor(k / 3) * 11 - k % 3 * 3;
          P(c, C.WALL.d, x + 1, y + 2, 7, 9);
          P(c, C.WALL.h, x, y, 6, 9);
          P(c, C.BLUE.m, x + 2, y + 3, 1.5, 3);
          if (k % 3 === 0) ell(c, x + 3, y, 3, 2, C.BLUE.m);
          else P(c, C.PAPER.l, x - 1, y - 1, 8, 1);
        }
        for (let k = 0; k < 13; k++) {
          const x = w - 4 - noise(k, 3) * 9, y = h - noise(k, 4) * 18;
          ell(c, x, y, 2, 2.5, k % 3 ? C.PINK.m : C.GREEN.d);
        }
        c.restore();
        c.strokeStyle = C.WALL.d;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(1, h);
        c.lineTo(1, r);
        c.arc(r, r, r - 1, Math.PI, 0);
        c.lineTo(w - 1, h);
        c.stroke();
      });
    }
    function shutter(w, h) {
      return picture(w, h, (c) => {
        c.save();
        c.beginPath();
        c.roundRect(0, 0, w, h, [w / 2, w / 2, 0, 0]);
        c.clip();
        const g = c.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, C.BLUE.d);
        g.addColorStop(0.5, C.BLUE.m);
        g.addColorStop(1, C.BLUE.l);
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        for (let i = 2; i < w; i += 3) P(c, C.BLUE.d, i, 0, 0.6, h);
        for (const y of [h * 0.32, h * 0.79]) {
          P(c, C.DARK.o, 0, y, 3, 2);
          P(c, C.DARK.l, 0.5, y, 1, 1);
        }
        c.restore();
      });
    }
    const windowPictures = /* @__PURE__ */ new Map();
    function roundedPlan(u, v, du, dv, r) {
      const points = [];
      for (const [x, y, a] of [
        [u + du - r, v + r, -Math.PI / 2],
        [u + du - r, v + dv - r, 0],
        [u + r, v + dv - r, Math.PI / 2],
        [u + r, v + r, Math.PI]
      ])
        for (let i = 0; i <= 12; i++) {
          const angle = a + i * Math.PI / 24;
          points.push([x + Math.cos(angle) * r, y + Math.sin(angle) * r]);
        }
      return points;
    }
    function roundedMeetingTable(ctx, z) {
      const [u, v, du, dv] = MEET, points = roundedPlan(u, v, du, dv, 16);
      foot(ctx, u, v, du, dv, FL);
      for (const [a, b] of [
        [u + 6, v + 6],
        [u + du - 9, v + 6],
        [u + 6, v + dv - 9],
        [u + du - 9, v + dv - 9]
      ])
        box(ctx, a, b, FL, 3, 3, z - FL - 3, C.WOOD, { edge: false });
      box(ctx, u + 6, v + 6, z - 7, du - 12, dv - 12, 4, C.WOOD, { edge: false });
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length], dx = b[0] - a[0], dy = b[1] - a[1];
        if (dy - dx >= -1e-3)
          q(
            ctx,
            [
              [...a, z - 3],
              [...b, z - 3],
              [...b, z],
              [...a, z]
            ],
            dy > Math.abs(dx) ? C.WOOD.d : C.WOOD.m
          );
      }
      q(
        ctx,
        points.map((p) => [...p, z]),
        C.WOOD.l
      );
      ctx.save();
      ctx.beginPath();
      points.map((p) => S(...p, z)).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      ctx.clip();
      artPlane(
        ctx,
        "desk",
        [
          [193, 641],
          [484, 804],
          [46, 726]
        ],
        [
          [u, v + dv, z],
          [u, v, z],
          [u + du, v + dv, z]
        ]
      );
      ctx.globalAlpha = 0.12;
      for (let n = 0; n < du; n += 2) seg(ctx, [u + n, v, z + 0.05], [u + n, v + dv, z + 0.05], C.WOOD.d);
      ctx.restore();
    }
    function meetingRug(ctx) {
      const points = roundedPlan(80, 106, 90, 92, 8);
      q(
        ctx,
        points.map((p) => [...p, FL + 0.2]),
        C.n ? "#7e7b72" : "#e4d2b4"
      );
      ctx.save();
      ctx.globalAlpha = 0.24;
      for (let v = 109; v < 196; v += 2) seg(ctx, [84, v, FL + 0.3], [166, v, FL + 0.3], C.n ? "#a9a08f" : "#bca784");
      for (let u = 84; u < 168; u += 3) seg(ctx, [u, 109, FL + 0.3], [u, 194, FL + 0.3], C.n ? "#6a6c69" : "#fff4de");
      ctx.restore();
    }
    function compactWindow(ctx) {
      const cache = "compact-window|" + C.n;
      if (!windowPictures.has(cache)) {
        const flat = mk(RV, H - FL, (c) => {
          const kx = RV / 355, ky = (H - FL) / 399, slope = 187 / 355;
          c.transform(-kx, -ky * slope, 0, ky, RV + kx, -16 * ky + ky * slope);
          c.drawImage(leftWallImage, 0, 0);
        });
        const g = flat.getContext("2d"), pixels = g.getImageData(0, 0, RV, H - FL);
        for (let y = 0; y < H - FL; y++)
          for (let x = 0; x < RV; x++) {
            const i = (y * RV + x) * 4, r = pixels.data[i], green = pixels.data[i + 1], b = pixels.data[i + 2];
            const opening = x >= 84 && x <= 151 && y >= 17 + archTop(x - 84, 67) && y <= 133;
            const blue = b > r + 12 && b >= green - 8;
            const hinge = r < 115 && green < 115 && b < 115;
            if (!(x >= 44 && x <= 202 && y >= 12 && y <= 137 && (opening || blue || hinge))) pixels.data[i + 3] = 0;
          }
        g.putImageData(pixels, 0, 0);
        const image = mk(118, 95, (c) => {
          c.imageSmoothingEnabled = true;
          c.drawImage(flat, 44, 12, 158, 125, 0, 0, 118, 95);
          if (C.n) {
            c.globalCompositeOperation = "source-atop";
            c.fillStyle = "rgba(29,49,76,.48)";
            c.fillRect(0, 0, 118, 95);
          }
        });
        windowPictures.set(cache, image);
      }
      onU(ctx, windowPictures.get(cache), 0.5, 104, 150, LEFT_WINDOW_OPENING);
      box(ctx, 0, 141, 52, 4, 53, 3, C.WALL, { edge: false });
    }
    function plasterWall(ctx) {
      const image = mk(RV, H - FL, (c) => {
        const gradient = c.createLinearGradient(0, 0, RV, H - FL);
        gradient.addColorStop(0, C.n ? "#919ca8" : "#f2eee7");
        gradient.addColorStop(0.6, C.n ? "#9ba5ae" : "#fbf8f2");
        gradient.addColorStop(1, C.n ? "#8a96a4" : "#eee8de");
        c.fillStyle = gradient;
        c.fillRect(0, 0, RV, H - FL);
        c.globalAlpha = 0.13;
        for (let i = 0; i < 750; i++) {
          c.fillStyle = i % 2 ? "#ffffff" : "#c8beae";
          c.fillRect(noise(i, 25) * RV, noise(i, 26) * (H - FL), 0.6, 0.6);
        }
      });
      onU(ctx, image, 0, 0, H);
      box(ctx, -8, 0, H, 8, RV, 2, C.WALL, { edge: false, top: C.WALL.h });
      q(
        ctx,
        [
          [-8, RV, FL],
          [0, RV, FL],
          [0, RV, H],
          [-8, RV, H]
        ],
        C.WALL.d
      );
    }
    function readingBench(ctx) {
      box(ctx, 2, 132, FL, 24, 70, 12, C.WALL, { edge: false });
      box(ctx, 4, 134, FL + 12, 20, 66, 3, C.BLUE, { edge: false });
      box(ctx, 2, 132, FL + 12, 3, 70, 13, C.WALL, { edge: false });
      box(ctx, 7, 137, FL + 15, 10, 13, 3, C.PAPER, { edge: false });
      box(ctx, 7, 184, FL + 15, 10, 13, 3, C.PAPER, { edge: false });
    }
    function walls(ctx) {
      if (artLoaded) {
        plasterWall(ctx);
        compactWindow(ctx);
        rightWall(ctx);
        q(ctx, [[-14, -11, H], [0, -11, H], [0, 0, H], [-14, 0, H]], C.WALL.h);
        return;
      }
      const light = ctx.createLinearGradient(OX, OY - H, OX, OY);
      light.addColorStop(0, C.WALL.h);
      light.addColorStop(1, C.WALL.m);
      const shade = ctx.createLinearGradient(OX, OY - H, OX, OY + 90);
      shade.addColorStop(0, C.WALL.m);
      shade.addColorStop(1, C.WALL.d);
      q(ctx, [[0, 0, FL], [RU, 0, FL], [RU, 0, H], [0, 0, H]], light);
      q(ctx, [[0, 0, FL], [0, RV, FL], [0, RV, H], [0, 0, H]], shade);
      ctx.save();
      ctx.filter = "blur(3px)";
      qa(ctx, [[0, 8, FL], [0, 78, FL], [0, 78, 134], [0, 8, 134]], "#72573e", 0.1);
      ctx.restore();
      box(ctx, -8, -8, H, RU + 8, 8, 2, C.WALL, { edge: false, top: C.WALL.h });
      box(ctx, -8, 0, H, 8, RV, 2, C.WALL, { edge: false, top: C.WALL.h });
      for (let k = 0; k < 170; k++) {
        const u = noise(k, 4) * RU, z = 8 + noise(k, 5) * (H - 12);
        const [x, y] = S(u, 0, z);
        P(ctx, C.WALL.l, x, y, 1 + noise(k, 6), 0.5);
      }
      for (const u of [30, 98, 166]) {
        onV(ctx, seaWindow(42, 124), u, 0, 164);
        onV(ctx, shutter(9, 122), u - 10, 1, 163);
        onV(ctx, shutter(9, 122), u + 43, 1, 163);
        box(ctx, u - 3, 0, 36, 48, 6, 4, C.WALL, { top: C.WALL.h });
      }
      onU(ctx, seaWindow(49, 123), 0, 91, 163);
      onU(ctx, shutter(9, 121), 1, 141, 162);
      box(ctx, 0, 88, 36, 6, 55, 4, C.WALL, { top: C.WALL.h });
    }
    function board2(ctx) {
      const w = BOARD[1] - BOARD[0], v = 4;
      for (const u of [BOARD[0] + 3, BOARD[1] - 3]) {
        box(ctx, u - 1, v, FL, 2, 2, 112, C.DARK, { edge: false });
        box(ctx, u - 2, v - 2, FL, 4, 14, 2, C.DARK, { edge: false });
      }
      onV(ctx, picture(w, 65, (c) => {
        P(c, C.WALL.d, 0, 0, w, 65);
        P(c, C.WALL.h, 1, 1, w - 2, 62);
        for (let col = 0; col < 3; col++) {
          const x = 5 + col * 20;
          P(c, [C.TERRA.m, C.PINK.m, C.GREEN.m][col], x, 6, 14, 3);
          if (col) P(c, C.FLOOR.d, x - 3, 12, 0.5, 46);
          for (let row = 0; row < 3; row++) {
            const y = 14 + row * 14;
            P(c, col === 0 ? "#edc18e" : col === 2 ? C.GREEN.l : C.PAPER.m, x, y, 13, 10);
            P(c, C.WOOD.d, x + 3, y + 3, 6, 1);
            P(c, C.WOOD.d, x + 3, y + 6, 4, 0.6);
          }
        }
      }), BOARD[0], v, FL + 114);
      box(ctx, BOARD[0], v, FL + 49, w, 5, 2, C.WALL, { top: C.WALL.h });
    }
    function shelf(ctx) {
      if (artBox(ctx, "shelf", 0, 10, 19, 65, 123)) return;
      foot(ctx, 0, 10, 17, 65, FL);
      box(ctx, 0, 10, FL + 2, 3, 64, 126, C.WOOD);
      box(ctx, 0, 10, FL, 17, 3, 130, C.WOOD);
      box(ctx, 0, 71, FL, 17, 3, 130, C.WOOD);
      for (let row = 0; row < 4; row++) {
        const z = FL + row * 31;
        box(ctx, 0, 10, z, 18, 64, 3, C.WOOD);
        let v = 15;
        for (let b = 0; b < 9; b++) {
          const R = [C.PAPER, C.BLUE, C.GREEN, C.WOOD, C.FLOOR][(row * 3 + b) % 5];
          const width = 3 + (b + row) % 4, height = 19 + (b * 7 + row) % 8;
          box(ctx, 7, v, z + 3, 8, width, height, R, { edge: false });
          seg(ctx, [15.2, v + 0.6, z + height - 1], [15.2, v + width - 0.6, z + height - 1], C.PAPER.l);
          seg(ctx, [15.2, v + 0.6, z + 8], [15.2, v + width - 0.6, z + 8], R.h);
          v += width + 1.5;
        }
      }
      box(ctx, 0, 10, FL + 127, 19, 66, 4, C.WOOD);
      plant(ctx, 8, 31, false, FL + 131, 0.5);
      plant(ctx, 8, 60, false, FL + 131, 0.4);
    }
    function plant(ctx, u, v, flowers, base = FL, scale = 1) {
      const [x, y] = S(u, v, base), h = 15 * scale, w = 8 * scale;
      if (base === FL && art(ctx, flowers ? "flowers" : "olive", x - 24 * scale, y + 2, 48 * scale, (flowers ? 80 : 63) * scale)) return;
      foot(ctx, u - 5 * scale, v - 5 * scale, 10 * scale, 10 * scale, base);
      const clay = ctx.createLinearGradient(x - w, y, x + w, y);
      clay.addColorStop(0, C.TERRA.d);
      clay.addColorStop(0.4, C.TERRA.l);
      clay.addColorStop(1, C.TERRA.m);
      ctx.fillStyle = clay;
      ctx.beginPath();
      ctx.moveTo(x - w, y - h);
      ctx.lineTo(x + w, y - h);
      ctx.lineTo(x + w * 0.65, y);
      ctx.quadraticCurveTo(x, y + 4 * scale, x - w * 0.65, y);
      ctx.closePath();
      ctx.fill();
      ell(ctx, x, y - h, w + scale, 3 * scale, C.TERRA.l);
      ell(ctx, x, y - h, w - scale, 2 * scale, C.WOOD.o);
      const count = flowers ? 65 : 30;
      for (let k = 0; k < count; k++) {
        const a = noise(k, 17) * Math.PI * 2, r = Math.sqrt(noise(k, 18));
        const dx = Math.cos(a) * r * (flowers ? 24 : 19) * scale;
        const dy = Math.sin(a) * r * 24 * scale;
        const cy = y - h - 23 * scale + dy;
        if (k % 3 === 0) {
          ctx.strokeStyle = C.WOOD.d;
          ctx.lineWidth = 0.8 * scale;
          ctx.beginPath();
          ctx.moveTo(x, y - h);
          ctx.lineTo(x + dx, cy);
          ctx.stroke();
        }
        ctx.save();
        ctx.translate(x + dx, cy);
        ctx.rotate(a * 0.5);
        ell(ctx, 0, 0, (flowers ? 3.5 : 4) * scale, 1.7 * scale, [C.GREEN.d, C.GREEN.m, C.GREEN.l][k % 3]);
        ctx.restore();
        if (flowers && k % 4 !== 0) {
          for (let j = 0; j < 3; j++) ell(ctx, x + dx + (j - 1) * 1.4 * scale, cy - 2 * scale + j % 2 * 2 * scale, 2.1 * scale, 1.8 * scale, j % 2 ? C.PINK.l : C.PINK.m);
        }
      }
    }
    function floorLamp(ctx) {
      foot(ctx, 11, 81, 11, 11, FL);
      box(ctx, 12, 82, FL, 9, 9, 2, C.DARK, { edge: false });
      box(ctx, 16, 86, FL + 2, 1.5, 1.5, 108, C.DARK, { edge: false });
      box(ctx, 10, 80, FL + 110, 14, 14, 17, C.PAPER, { top: C.WALL.h, fv: C.n ? "#ffe2ab" : C.WALL.l });
    }
    const look = () => ({ frame: C.DARK.o, off: C.DARK.d, accent: "#d8452a", body: C.DARK });
    function deskStand(ctx, m) {
      box(ctx, m.cu - 4, m.v - 3, DZ, 8, 5, 1, C.DARK, { edge: false });
      box(ctx, m.cu - 1, m.v - 1, DZ + 1, 2, 2, m.z - DZ + 4, C.DARK, { edge: false });
    }
    function table(ctx, dims, z) {
      if (dims === MEET) return roundedMeetingTable(ctx, z);
      const [u, v, du, dv] = dims;
      foot(ctx, u, v, du, dv, FL);
      for (const [a, b] of [[u + 3, v + 3], [u + du - 6, v + 3], [u + 3, v + dv - 6], [u + du - 6, v + dv - 6]])
        box(ctx, a, b, FL, 3, 3, z - FL - 3, C.WOOD, { edge: false });
      box(ctx, u + 1, v + 1, z - 7, du - 2, dv - 2, 4, C.WOOD, { edge: false });
      box(ctx, u, v, z - 3, du, dv, 3, C.WOOD);
      if (dims === DESK || dims === MEET) {
        const plane = dims === DESK ? [[u, v, z], [u + du, v, z], [u, v + dv, z]] : [[u, v + dv, z], [u, v, z], [u + du, v + dv, z]];
        ctx.save();
        ctx.beginPath();
        [[u, v, z], [u + du, v, z], [u + du, v + dv, z], [u, v + dv, z]].map((p) => S(...p)).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.closePath();
        ctx.clip();
        artPlane(ctx, "desk", [[193, 641], [484, 804], [46, 726]], plane);
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = 0.2;
      for (let k = 0; k < Math.floor(dv * 1.1); k++) {
        const a = v + 0.7 + k * 0.9;
        seg(ctx, [u + 1 + noise(k, u) * 4, a, z + 0.1], [u + du - 1 - noise(k, v) * 4, a + 0.3, z + 0.1], k % 3 ? C.WOOD.h : C.WOOD.d);
      }
      ctx.restore();
    }
    function deskTop(ctx) {
      table(ctx, DESK, DZ);
      box(ctx, ...FIXTURES.desk.keyboard, C.DARK, { edge: false });
      for (let i = 0; i < 8; i++) seg(ctx, [SEAT[0] - 11 + i * 3, 44, DZ + 1], [SEAT[0] - 11 + i * 3, 48, DZ + 1], C.DARK.l);
      const [x, y] = S(SEAT[0] + 22, 46, DZ + 1);
      ell(ctx, x, y, 3, 2, C.DARK.o);
      P(ctx, C.DARK.l, x, y - 1, 1, 2);
      plant(ctx, DESK[0] + 9, 44, false, DZ + 0.5, 0.24);
      plant(ctx, DESK[0] + DESK[2] - 5, 44, false, DZ + 0.5, 0.24);
    }
    function chairCore(ctx, u, v, kind = "office") {
      const R = kind === "work" ? C.DARK : C.BLUE;
      foot(ctx, u - 10, v - 9, 20, 18, FL);
      if (kind === "tea") {
        for (const [a, b] of [[-8, -7], [6, -7], [-8, 6], [6, 6]]) box(ctx, u + a, v + b, FL, 2, 2, 13, C.WOOD, { edge: false });
        box(ctx, u - 10, v - 9, FL + 11, 20, 18, 3, C.WOOD);
        box(ctx, u - 8, v - 7, FL + 14, 16, 14, 2, C.BLUE, { edge: false });
      } else {
        for (let k = 0; k < 5; k++) {
          const a = k * Math.PI * 2 / 5, du = Math.cos(a) * 10, dv = Math.sin(a) * 10;
          seg(ctx, [u, v, FL + 3], [u + du, v + dv, FL + 2], C.DARK.o);
          const [x, y] = S(u + du, v + dv, FL + 2);
          ell(ctx, x, y, 2, 2.5, C.DARK.o);
          ell(ctx, x - 0.5, y - 0.5, 0.7, 1.3, C.DARK.l);
        }
        box(ctx, u - 1, v - 1, FL + 3, 2, 2, 10, C.DARK, { edge: false });
        box(ctx, u - 10, v - 9, FL + 12, 20, 18, 3, R, { edge: false });
      }
    }
    function chairArm(ctx, u, v, du) {
      box(ctx, u + du, v - 1, FL + 13, 1.5, 6, 9, C.DARK, { edge: false });
      box(ctx, u + du - 1, v - 3, FL + 22, 3, 11, 2, C.DARK, { edge: false });
    }
    function chairBack(ctx, u, v, facing, kind = "office") {
      const R = kind === "work" ? C.DARK : C.BLUE;
      const vertical = facing.endsWith("v"), positive = facing[0] === "+";
      const width = vertical ? 22 : 18;
      const image = picture(width, 29, (c) => {
        c.fillStyle = kind === "tea" ? C.WOOD.m : R.d;
        c.beginPath();
        c.roundRect(0, 0, width, 29, [3, 3, 2, 2]);
        c.fill();
        const g = c.createLinearGradient(0, 0, width, 26);
        g.addColorStop(0, R.l);
        g.addColorStop(1, R.m);
        c.fillStyle = g;
        c.beginPath();
        c.roundRect(2, 2, width - 4, 23, 2);
        c.fill();
        P(c, R.h, 3, 3, width - 6, 0.6);
        if (kind === "work") P(c, R.d, 3, 17, width - 6, 1);
      });
      if (vertical) onV(ctx, image, u - 11, v + (positive ? 9 : -9), FL + 43);
      else onU(ctx, image, u + (positive ? 9 : -9), v - 9, FL + 43);
    }
    function meetingScreen(ctx) {
      const stand = (c, m) => {
        box(c, m.u - 3, m.v - 7, MZ, 6, 14, 1, C.DARK, { edge: false });
        box(c, m.u - 1, m.v - 1, MZ + 1, 2, 2, m.z - MZ + 4, C.DARK, { edge: false });
      };
      SCREENS.placeCall(ctx, FIXTURES.meeting, look(), !C.n || ST === "meeting", { box, onU, stand });
    }
    function meetingTop(ctx) {
      table(ctx, MEET, MZ);
      box(ctx, MEET[0] + 22, MSEAT[1] + 4, MZ, 13, 10, 2, C.BLUE);
      box(ctx, MEET[0] + 23, MSEAT[1] + 5, MZ + 2, 11, 8, 1, C.PAPER);
    }
    function phone(ctx) {
      const [u, v, du, dv] = PHONE;
      foot(ctx, u, v, du, dv, FL);
      box(ctx, u, v, FL, du, dv, 26, C.WOOD);
      box(ctx, u + 3, v + 2, FL + 26, 14, 14, 3, C.DARK);
      if (ST !== "phone") {
        box(ctx, u + 4, v + 3, FL + 30, 2, 10, 2, C.DARK);
        box(ctx, u + 3, v + 2, FL + 30, 4, 3, 3, C.DARK);
        box(ctx, u + 3, v + 11, FL + 30, 4, 3, 3, C.DARK);
      }
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++)
        box(ctx, u + 9 + a * 2, v + 6 + b * 2, FL + 29, 1, 1, 1, C.PAPER, { edge: false });
    }
    function notification(ctx) {
      const [u, v, du, dv] = TRAY;
      foot(ctx, u, v, du, dv, FL);
      box(ctx, u + 1, v + 1, FL, du - 2, dv - 2, 22, C.WOOD);
      if (artLoaded) {
        const door = picture(du - 2, 22, (c) => {
          c.imageSmoothingEnabled = true;
          c.drawImage(artImage, 220, 730, 120, 30, 0, 0, du - 2, 22);
          if (C.n) {
            c.fillStyle = "rgba(29,49,76,.48)";
            c.fillRect(0, 0, du - 2, 22);
          }
          c.strokeStyle = C.WOOD.d;
          c.lineWidth = 0.6;
          c.strokeRect(2, 2, du - 6, 18);
          ell(c, (du - 2) / 2, 13, 1, 1.3, C.WOOD.o);
        });
        onV(ctx, door, u + 1, v + dv - 1, FL + 22);
      }
      box(ctx, u, v, FL + 22, du, dv, 3, C.ACC);
      box(ctx, u + 3, v + 3, FL + 25, du - 6, dv - 6, 2, C.PAPER);
      seg(ctx, [u + 3, v + dv, FL + 10], [u + du - 3, v + dv, FL + 10], C.WOOD.d);
      const [x, y] = S(u + du / 2, v + dv, FL + 15);
      P(ctx, C.WOOD.o, x, y, 2, 2);
    }
    function bed(ctx) {
      if (artPlane(ctx, "bed", [[690, 670], [1040, 853], [590, 734]], [[BED[0], BED[1], FL + 18], [BED[0] + BED[2], BED[1], FL + 18], [BED[0], BED[1] + BED[3], FL + 18]])) return;
      table(ctx, BED, FL + 11);
      box(ctx, BED[0], BED[1], FL + 11, BED[2], BED[3], 7, C.PAPER, { fv: C.WALL.l, fu: C.FLOOR.m });
      seg(ctx, [BED[0], BED[1] + BED[3], FL + 14], [BED[0] + BED[2], BED[1] + BED[3], FL + 14], C.WALL.d);
      for (const [u, v, R] of [[BED[0] + 5, BED[1] + 5, C.BLUE], [BED[0] + 7, BED[1] + 17, C.PAPER]]) {
        box(ctx, u, v, FL + 18, 13, 11, 4, R, { edge: false });
        seg(ctx, [u + 1, v + 1, FL + 22], [u + 11, v + 1, FL + 22], R.h);
      }
    }
    function blanket(ctx) {
      if (ST === "sleep" && CHAR.sleepSurface) return;
      if (artLoaded) {
        const u2 = BED[0] + 43, v2 = BED[1], end = BED[0] + BED[2], front = v2 + BED[3];
        ctx.save();
        ctx.beginPath();
        [[u2, v2, FL + 25], [end, v2, FL + 25], [end, front, FL + 25], [end, front, FL], [u2, front, FL]].map((p) => S(...p)).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.closePath();
        ctx.clip();
        bed(ctx);
        ctx.restore();
        return;
      }
      const u = BED[0] + 43, v = BED[1] + 1;
      box(ctx, u, v, FL + 18, 28, BED[3] - 2, 2, C.BLUE, { edge: false });
      box(ctx, u, BED[1] + BED[3] - 1, FL + 6, 28, 2, 14, C.BLUE, { edge: false });
      for (let k = 0; k < 6; k++) seg(ctx, [u + 2 + k * 4, BED[1] + BED[3] + 1, FL + 7], [u + 2 + k * 4, BED[1] + BED[3] + 1, FL + 18], k % 2 ? C.BLUE.l : C.BLUE.m);
      seg(ctx, [u + 1, v, FL + 21], [u + 1, BED[1] + BED[3], FL + 21], C.BLUE.h);
    }
    function tea(ctx) {
      const [u, v] = TEA_TABLE, z = FL + 21, radius = 13;
      const [tx, ty] = S(u, v, FL);
      if (art(ctx, "tea", tx - 20, ty + 10, 40, 42)) return;
      foot(ctx, u - radius, v - radius, radius * 2, radius * 2, FL);
      for (const [a, b] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) box(ctx, u + a, v + b, FL, 2, 2, z - FL - 2, C.WOOD, { edge: false });
      const points = Array.from({ length: 48 }, (_, i) => [u + Math.cos(i * Math.PI / 24) * radius, v + Math.sin(i * Math.PI / 24) * radius]);
      q(ctx, points.map(([a, b]) => [a, b, z - 2]), C.WOOD.d);
      q(ctx, points.map(([a, b]) => [a, b, z]), C.WOOD.l);
      for (let r = 3; r < 13; r += 3) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 40; i++) {
          const a = i * Math.PI / 20, b = (i + 1) * Math.PI / 20;
          seg(ctx, [u + Math.cos(a) * r, v + Math.sin(a) * r, z + 0.1], [u + Math.cos(b) * r, v + Math.sin(b) * r, z + 0.1], C.WOOD.m);
        }
        ctx.restore();
      }
      const [x, y] = S(u, v, z + 1);
      ell(ctx, x, y - 4, 5, 4, C.WALL.l);
      ell(ctx, x, y - 8, 3, 1.5, C.WALL.h);
      P(ctx, C.WALL.m, x - 1, y - 10, 2, 2);
      ell(ctx, x + 5, y - 4, 3, 3, C.PAPER.m);
      ell(ctx, x + 5, y - 4, 1.5, 1.5, C.WOOD.l);
      X.poly(ctx, [[x - 4, y - 3], [x - 9, y - 10], [x - 6, y - 9], [x - 2, y - 5]], C.WALL.l);
      for (const [a, b] of [[u - 6, v + 8], [u + 7, v - 4]]) {
        const [cx, cy] = S(a, b, z + 1);
        ell(ctx, cx, cy, 4, 2, C.PAPER.m);
        ell(ctx, cx, cy - 1, 2, 1, C.WOOD.d);
        ell(ctx, cx + 3, cy - 1, 1.7, 1.5, C.WALL.l);
      }
    }
    function portal(ctx) {
      for (let u = 0; u < 96; u++) {
        const inside = u >= DOOR.left && u < DOOR.right;
        const cut = inside ? DOOR.height - archTop(u - DOOR.left + 0.5, DOOR.right - DOOR.left) : 0;
        box(ctx, u, RV - 6, FL + cut, 1, 9, PORTAL_H - FL - cut, C.WALL, { edge: false });
      }
      box(ctx, 0, RV - 6, PORTAL_H, 96, 9, 2, C.WALL, { edge: false, top: C.WALL.h });
      for (let k = 0; k < 16; k++) {
        const [x, y] = S(13, DOOR.v, FL + 16 + k * 6);
        const dx = -5 + k % 3 * 3;
        ell(ctx, x + dx, y, 5, 4, C.GREEN.m);
        ell(ctx, x + dx - 2, y - 2, 3, 3, k % 2 ? C.PINK.l : C.PINK.m);
      }
    }
    function openDoor(ctx) {
      const w = DOOR.right - DOOR.left;
      const img = picture(w, DOOR.height, (c) => {
        for (let i = 0; i < w; i++) {
          const top = Math.ceil(archTop(i + 0.5, w));
          P(c, i % 10 === 0 ? C.BLUE.d : mix(C.BLUE.m, C.BLUE.l, i / w * 0.5), i, top, 1, DOOR.height - top);
        }
        if (artLoaded) {
          c.globalCompositeOperation = "source-atop";
          c.imageSmoothingEnabled = true;
          c.drawImage(architectureImage, 495, 371, 32, 120, 0, 0, w, DOOR.height);
          if (C.n) {
            c.fillStyle = "rgba(29,49,76,.48)";
            c.fillRect(0, 0, w, DOOR.height);
          }
          c.globalCompositeOperation = "source-over";
        }
        for (let k = 0; k < 70; k++) {
          const x = 2 + noise(k, 12) * (w - 4), y = 25 + noise(k, 14) * 62;
          P(c, C.BLUE.l, x, y, 0.4, 1 + noise(k, 13) * 6);
        }
        ell(c, 12, 66, 3, 4, C.DARK.o);
        ell(c, 12, 66, 1, 2, C.BLUE.m);
        P(c, C.DARK.m, w - 3, 30, 3, 5);
        P(c, C.DARK.m, w - 3, 73, 3, 5);
      });
      onU(ctx, img, DOOR.left, DOOR.v, FL + DOOR.height);
      seg(ctx, [DOOR.left, DOOR.v, FL], [DOOR.left, DOOR.v, FL + 61], C.BLUE.o);
    }
    function parapet(ctx) {
      if (artBox(ctx, "planter", 96, RV - 4, RU - 96, 7, 28)) return;
      box(ctx, 96, RV - 4, FL, RU - 96, 7, 13, C.WALL, { top: C.WALL.h });
      for (let k = 0; k < 80; k++) {
        const u = 103 + noise(k, 22) * (RU - 108), v = RV - 1 + noise(k, 23) * 7;
        const [x, y] = S(u, v, FL + 17 + noise(k, 24) * 10);
        ell(ctx, x, y + 1, 3.5, 2.3, k % 3 ? C.GREEN.m : C.GREEN.d);
        if (k % 4) for (let j = 0; j < 3; j++) ell(ctx, x + j - 1, y - 3 + j % 2, 2, 2, j % 2 ? C.PINK.l : C.PINK.m);
      }
    }
    const STATIONS = CONTRACT.STATIONS;
    const SLEEP_SURFACE = { u: BED[0] + 4, v: BED[1] + 2, z: FL + 19, w: BED[2] - 8, d: BED[3] - 4 };
    const PLACES = {
      code: { u: SEAT[0], v: SEAT[1], z: FL + 15, own: "turn", shared: "turn", sit: true },
      work: { u: SEAT[0], v: SEAT[1], z: FL + 15, own: "turn", shared: "turn", sit: true },
      meeting: { u: MSEAT[0], v: MSEAT[1], z: FL + 15, own: "turnL", shared: "turnL", sit: true },
      library: { u: 27, v: 46, z: FL, own: "read", shared: "back" },
      board: { u: 82, v: 16, z: FL, own: "post", shared: "back" },
      phone: { u: 254, v: 106, z: FL, own: "phone", shared: "idle" },
      tea: { u: TEA[0], v: TEA[1], z: FL + 16, own: "tea", shared: "type", sit: true },
      handoff: { u: 68, v: RV + 18, z: FL, own: "attention", shared: "idle", bang: true },
      door: { u: 68, v: DOOR.v, z: FL, own: "wave", shared: "idle" },
      walk: { u: 206, v: 142, z: FL, own: "walkA", shared: "idle" },
      sleep: { ...window.ROOM_PAINTER.sleepPlace(SLEEP_SURFACE), own: "sleep", shared: "sleep", lie: true, sit: true }
    };
    const NODES = {
      hub: [206, 142],
      walk: [206, 142],
      west: [64, 94],
      east: [252, 154],
      codeWay: [158, 72],
      code: [173, SEAT[1]],
      board: [82, 16],
      library: [27, 46],
      phone: [254, 106],
      phoneWay: [232, 106],
      northEast: [206, 94],
      north: [112, 94],
      southEast: [300, 164],
      south: [300, 226],
      meeting: [MSEAT[0], 164],
      tea: [268, TEA[1]],
      corridor: [64, 226],
      meetingSide: [180, 164],
      meetingWay: [174, 164],
      entranceWay: [96, 220],
      doorInside: [68, RV - 12],
      door: [68, DOOR.v],
      landing: [68, RV + 18],
      handoff: [68, RV + 18],
      sleepWay: [184, 226],
      sleep: [BED[0] - 16, BED[1] + BED[3] / 2]
    };
    const EDGES = [
      ["hub", "walk"],
      ["west", "board"],
      ["west", "library"],
      ["west", "corridor"],
      ["meetingSide", "meetingWay"],
      ["meetingWay", "meeting"],
      ["hub", "east"],
      ["east", "phoneWay"],
      ["east", "tea"],
      ["phone", "phoneWay"],
      ["hub", "codeWay"],
      ["codeWay", "code"],
      ["corridor", "entranceWay"],
      ["entranceWay", "doorInside"],
      ["doorInside", "door"],
      ["door", "landing"],
      ["landing", "handoff"],
      ["entranceWay", "sleepWay"],
      ["sleepWay", "sleep"],
      ["hub", "northEast"],
      ["northEast", "north"],
      ["north", "west"],
      ["hub", "southEast"],
      ["southEast", "south"],
      ["south", "corridor"],
      ["hub", "meetingSide"],
      ["phoneWay", "hub"],
      ["hub", "sleep"],
      ["meetingWay", "sleep"]
    ];
    const floorAt = (u, v) => u >= 0 && v >= 0 && u <= RU && v <= RV || u >= 0 && u <= LANDING[0] && v >= RV && v <= RV + 24 || u >= LANDING[0] && v >= LANDING[1] && u <= LANDING[2] && v <= LANDING[3] ? FL : 0;
    const SPOTS = {
      tasks: [BOARD[0], 4, FL + 49, BOARD[1], 6, FL + 114],
      library: [0, 10, FL, 19, 75, FL + 123],
      desk: SCREENS.deskBox(FIXTURES.desk),
      meeting: [MEET[0], MEET[1] - 2, FL, MSEAT[0] + 18, MEET[1] + MEET[3], FIXTURES.meeting.z + SCREENS.CALL_H],
      phone: [PHONE[0], PHONE[1], FL, PHONE[0] + PHONE[2], PHONE[1] + PHONE[3], FL + 35],
      handoff: [TRAY[0], TRAY[1], FL, TRAY[0] + TRAY[2], TRAY[1] + TRAY[3], FL + 28]
    };
    function pieces() {
      const list = [];
      const add = (draw2, fp, seated) => list.push({ draw: draw2, fp, seated });
      add(shelf, [0, 10, 19, 75]);
      add(floorLamp, [10, 80, 24, 94]);
      add(readingBench, [2, 132, 26, 202]);
      add(deskTop, [DESK[0], DESK[1], DESK[0] + DESK[2], DESK[1] + DESK[3]]);
      const db = SCREENS.deskBox(FIXTURES.desk);
      add((c) => SCREENS.placeDesk(c, FIXTURES.desk, look(), LINKS, { box, onV, stand: deskStand }), [db[0], db[1], db[3], db[4]]);
      add(meetingTop, [MEET[0], MEET[1], MEET[0] + MEET[2], MEET[1] + MEET[3]]);
      add(meetingScreen, [FIXTURES.meeting.u - 2, MSEAT[1] - 26, FIXTURES.meeting.u + 2, MSEAT[1] + 26]);
      add(phone, [PHONE[0], PHONE[1], PHONE[0] + PHONE[2], PHONE[1] + PHONE[3]]);
      add((c) => chairCore(c, ...SEAT, "work"), [SEAT[0] - 10, SEAT[1] - 9, SEAT[0] + 10, SEAT[1] + 9], ["code", "work"]);
      for (const du of [-10, 9]) add((c) => chairArm(c, ...SEAT, du), [SEAT[0] + du - 1, SEAT[1] - 3, SEAT[0] + du + 2, SEAT[1] + 8]);
      add((c) => chairBack(c, ...SEAT, "+v", "work"), [SEAT[0] - 11, SEAT[1] + 9, SEAT[0] + 11, SEAT[1] + 9]);
      add((c) => chairCore(c, ...MSEAT), [MSEAT[0] - 10, MSEAT[1] - 9, MSEAT[0] + 10, MSEAT[1] + 9], ["meeting"]);
      add((c) => chairBack(c, ...MSEAT, "+u"), [MSEAT[0] + 9, MSEAT[1] - 9, MSEAT[0] + 9, MSEAT[1] + 9]);
      add(bed, BED.map((n, i) => i < 2 ? n : n + BED[i - 2]), ["sleep"]);
      add(blanket, [BED[0] + 43, BED[1], BED[0] + BED[2], BED[1] + BED[3]]);
      add(tea, [TEA_TABLE[0] - 13, TEA_TABLE[1] - 13, TEA_TABLE[0] + 13, TEA_TABLE[1] + 13]);
      add((c) => chairCore(c, ...TEA, "tea"), [TEA[0] - 10, TEA[1] - 9, TEA[0] + 10, TEA[1] + 9], ["tea"]);
      add((c) => chairBack(c, ...TEA, "-u", "tea"), [TEA[0] - 9, TEA[1] - 9, TEA[0] - 9, TEA[1] + 9]);
      for (const [u, v, facing] of [[316, 100, "-v"], [318, 144, "+v"]]) {
        add((c) => chairCore(c, u, v, "tea"), [u - 10, v - 9, u + 10, v + 9]);
        add((c) => chairBack(c, u, v, facing, "tea"), [u - 11, v + (facing === "+v" ? 9 : -9), u + 11, v + (facing === "+v" ? 9 : -9)]);
      }
      add((c) => plant(c, 324, 24, false, FL, 1.1), [318, 18, 330, 30]);
      add(portal, [0, RV - 6, 96, DOOR.v]);
      add(openDoor, [DOOR.left - 1, DOOR.v, DOOR.left + 1, DOOR.v + DOOR.right - DOOR.left]);
      add(parapet, [96, RV, RU, RV + 3]);
      add((c) => plant(c, 36, RV + 42, true, FL, 1.1), [30, RV + 36, 42, RV + 48]);
      add(notification, [TRAY[0], TRAY[1], TRAY[0] + TRAY[2], TRAY[1] + TRAY[3]]);
      add((c) => box(c, LANDING[0], LANDING[3] - 3, FL, LANDING[2] - LANDING[0], 3, 8, C.WALL), [LANDING[0], LANDING[3] - 3, LANDING[2], LANDING[3]]);
      add((c) => box(c, LANDING[2] - 3, RV + 8, FL, 3, LANDING[3] - RV - 8, 8, C.WALL), [LANDING[2] - 3, RV + 8, LANDING[2], LANDING[3]]);
      return list;
    }
    function sceneParts(station, walking) {
      const viewed = (draw2) => (ctx) => {
        ctx.save();
        camera(ctx);
        draw2(ctx);
        ctx.restore();
      };
      return [
        { draw: (c) => {
          P(c, C.bg, 0, 0, 480, 560);
          viewed((g) => {
            floor(g);
            walls(g);
            board2(g);
          })(c);
        } },
        ...pieces().map((part) => ({
          fp: part.fp,
          front: !walking && part.seated?.includes(station) ? false : void 0,
          draw: viewed(part.draw)
        }))
      ];
    }
    const slotFor = (station, u, v) => window.ROOM_PAINTER.maskFor(sceneParts(station, true), u, v);
    function nightLights(ctx) {
      if (!C.n) return;
      const [x, y] = S(16, 86, FL + 119);
      glow(ctx, x, y, 80, "#ffc77f", 0.22);
      for (const m of SCREENS.deskScreens(FIXTURES.desk)) {
        const [sx, sy] = S(m.cu, m.v, m.z + m.h / 2);
        glow(ctx, sx, sy, 28, "#b5dcf3", 0.14);
      }
    }
    function layers(station, slot2) {
      const state = { palette: C, character: CHAR, links: LINKS };
      const back = mk(480, 560, () => {
      }), front = mk(480, 560, () => {
      });
      const paint = () => {
        const previous = { palette: C, character: CHAR, links: LINKS, station: ST };
        C = state.palette;
        CHAR = state.character;
        LINKS = state.links;
        ST = station;
        const parts = sceneParts(station, slot2 !== void 0), p = PLACES[station];
        const mask = slot2 === void 0 ? window.ROOM_PAINTER.maskFor(parts, p.u, p.v) : slot2;
        const pair = window.ROOM_PAINTER.layers(parts, mask, mk);
        const illumination = mk(480, 560, (c) => {
          camera(c);
          nightLights(c);
        });
        pair.front.getContext("2d").drawImage(illumination, 0, 0);
        for (const [target, source] of [[back, pair.back], [front, pair.front]]) {
          const c = target.getContext("2d");
          c.clearRect(0, 0, 480, 560);
          c.drawImage(source, 0, 0);
        }
        C = previous.palette;
        CHAR = previous.character;
        LINKS = previous.links;
        ST = previous.station;
      };
      paint();
      if (!artLoaded) ready().then(paint).catch((error) => console.error(error));
      return { back, front };
    }
    const SPRITES = /* @__PURE__ */ new WeakMap();
    function sprite(s) {
      let colors = SPRITES.get(s);
      if (!colors) SPRITES.set(s, colors = /* @__PURE__ */ new WeakMap());
      let image = colors.get(C.actor);
      if (!image) colors.set(C.actor, image = mk(s.w, s.h, (c) => PX.paint(c, s, C.actor, 0, 0)));
      return image;
    }
    function drawOri(ctx, place, pose) {
      if (place.lie && CHAR.sleepSurface) {
        const s2 = CHAR.poses[pose] || CHAR.poses.sleep;
        window.ROOM_PAINTER.sleeper(ctx, sprite(s2), project, SLEEP_SURFACE, place);
        return;
      }
      ctx.save();
      camera(ctx);
      const s = pose === "turn" || pose === "turnL" ? CONTRACT.turnSprite(CHAR, pose === "turnL") : CHAR.poses[pose] || CHAR.poses[place.shared] || CHAR.poses.idle;
      const k = CHAR.k || 2;
      if (place.lie) {
        const image = mk(s.w * k, s.h * k, (c) => {
          c.drawImage(sprite(s), 0, 0, s.w * k, s.h * k);
          c.clearRect(Math.ceil(s.w * k * 0.4), 0, s.w * k, s.h * k);
        });
        const [x, y] = S(place.u, place.v, place.z + 1);
        ctx.transform(1, 0.5, -1, 0.5, x, y);
        ctx.drawImage(image, 0, -image.height / 2);
      } else {
        const [x, y] = S(place.u, place.v, place.z);
        ctx.drawImage(sprite(s), Math.round(x - s.w * k / 2), Math.round(y) - s.h * k + 1, s.w * k, s.h * k);
      }
      ctx.restore();
    }
    const PALETTES = /* @__PURE__ */ new Map();
    function use(t, weather, char, links) {
      CHAR = char;
      LINKS = { claude: !links || links.claude !== false, slack: !links || links.slack !== false };
      let lights = PALETTES.get(char);
      if (!lights) PALETTES.set(char, lights = /* @__PURE__ */ new Map());
      if (!lights.has(t)) lights.set(t, palette(t));
      C = lights.get(t);
    }
    function draw(ctx, m) {
      const t = m.t || "day";
      const station = m.station || (t === "night" ? "sleep" : "code");
      use(t, m.weather || "clear", m.char || { poses: ACTOR.sprout, pal: X.ORIPAL.sprout }, m.links);
      const pair = layers(station);
      const frame = mk(480, 560, (c) => {
        c.drawImage(pair.back, 0, 0);
        drawOri(c, PLACES[station], m.pose || PLACES[station].own);
        c.drawImage(pair.front, 0, 0);
      });
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(frame, 0, 0, 960, 1120);
    }
    const room = { STATIONS, PLACES, NODES, EDGES, SPOTS, FIXTURES, floorAt, project, use, slotFor, layers, drawOri, ready };
    window.OFFICE_ROOMS = window.OFFICE_ROOMS || [];
    window.OFFICE_ROOMS.push({ key: "santorini", zh: "\u5723\u6258\u91CC\u5C3C\u6D77\u8FB9\u5C4B", name: "Santorini seaside house", room });
    CONCEPTS.push({
      key: "santorini",
      zh: "\u5723\u6258\u91CC\u5C3C\u6D77\u8FB9\u5C4B",
      name: "Santorini seaside house",
      actor: "sprout",
      actorPal: X.ORIPAL.sprout,
      stations: STATIONS,
      draw,
      detail: [0, 120, 480, 420],
      angle: "\u767D\u5899\u84DD\u95E8\u3001\u62F1\u7A97\u4E0E\u7231\u7434\u6D77\u7684\u5C0F\u529E\u516C\u5BA4\u3002",
      why: "\u6CBF\u7528\u5171\u7528\u5C4F\u5E55\u4E0E\u5F62\u8C61\uFF0C\u901A\u77E5\u6258\u76D8\u5728\u95E8\u5916\uFF0C\u901A\u8FC7\u6253\u5F00\u7684\u84DD\u95E8\u8D70\u8FC7\u53BB\u3002",
      map: "\u540E\u65B9\u4E66\u67B6\u3001\u770B\u677F\u548C\u53CC\u5C4F\u5DE5\u4F4D\uFF1B\u5DE6\u4FA7\u4F1A\u8BAE\uFF0C\u524D\u65B9\u8EBA\u69BB\uFF0C\u53F3\u4FA7\u8336\u6B47\u3002\u95E8\u5916\u5E72\u5730\u4E0A\u662F\u901A\u77E5\u6258\u76D8\u3002",
      cost: "\u623F\u95F4\u72EC\u7ACB\u5206\u5C42\u4E0E\u8DEF\u5F84\uFF0C\u6574\u95F4\u623F\u7EDF\u4E00\u53D6\u666F\uFF0C\u884C\u8D70\u6309\u955C\u5934\u6BD4\u4F8B\u6362\u7B97\u3002"
    });
  })();
  (function() {
    "use strict";
    window.ACTOR_TURN = window.ACTOR_TURN || {};
    window.ACTOR_TURN["sprout"] = [
      "..........lll................",
      ".........lllll...LLL.........",
      "...........lll..LLLLL........",
      "..............oLLLLLLL.......",
      "..............o.LLLL.........",
      "..............o..............",
      "..........ooooooooo..........",
      "........oobbbbbbbbboo........",
      ".......obbbbbbbbbbbbbo.......",
      "......obbbbbbbbbbbbbbbo......",
      ".....obbbbbbbbbbbbbbbbbo.....",
      ".....obbbbbbbbbbbbbbbbbo.....",
      ".....obbbbbbbbbbbbbbbebbo....",
      ".....obbbbbbbbbbbbbbbebbo....",
      ".....obbbbbbbbbbbbbbbbcco....",
      ".....obbbbbbbbbbbbbbbbbbo.oo.",
      ".....obbbbbbbbbbbbbbbboooobbo",
      ".....oaaaaaaaaaaaaaaaobbbbbbo",
      ".....oaaaaaaaaaaappppobbbbbo.",
      ".....oaaaaaaaaaaapaaaaooooo..",
      ".....oaaaaaaaaaaappppppo.....",
      "......oaaaaaaaaaaaaaaao......",
      ".......ooooooooooooooo......."
    ];
  })();
  (function() {
    "use strict";
    window.ACTOR_TURN = window.ACTOR_TURN || {};
    window.ACTOR_TURN["fin-kokeshi"] = [
      "..........oooooo........",
      "........ooKKkkkkoo......",
      "......ooKKkkkkkkkkoo....",
      ".....oKKkkkkkkkkkkkko...",
      "....okKkkkkkkkkkkkkkko..",
      "....okkkkkkkkkkkkkkkko..",
      "....okkkkkkkkkkkkkkkfo..",
      "....okkkkkkkkkkkkkkkfo..",
      "....okkkkkkkkkkkkkkffo..",
      "....okkkkkkkkkkkkkfffo..",
      ".....okkkkkkkkkkfccfo...",
      "......okkkkkfffffffo....",
      "......oooffffffoooo.....",
      "......oooooooooooo...oo.",
      "......ohppppppppfooooffo",
      "......ohppppppppPopppffo",
      "......ohmpmmppppPoPPooo.",
      "......ohmmmmppppPooo....",
      ".....ohpmpmmppppPPo.....",
      ".....ohpppppppppPPo.....",
      ".....ohpppppppppPPo....."
    ];
  })();
  (function() {
    "use strict";
    window.ACTOR_TURN = window.ACTOR_TURN || {};
    window.ACTOR_TURN["fin-neko"] = [
      ".....................oo.....",
      "...........oo.......obbo....",
      "..........oiio.....obbpo....",
      ".........oiiioooooobbbpo....",
      "........oiiiiibbbbbbbbbo....",
      ".......oiiiiibbbbbbbbbbo....",
      ".......oiiiibbbbbbbbbbso....",
      ".......oiibbbbbbbbbbbbso..u.",
      ".......obbbbbbbbbbbbbbssou..",
      ".......obbbbbbbbbbbbbbccou..",
      ".......obbbbbbbbbbbbbbbso.u.",
      ".......obbbbbbbbbbbbbsso....",
      ".......oiiiiiiiiiiiiiiio.oo.",
      "......obiiibbbbbbbbbgoooobbo",
      "..ooo.obibibbbbbbbbbobbbbbbo",
      ".oiiiobbbbbbbbbbbbbobbbbbsso",
      ".obboobbbbbbbbbbbbbobbssooo.",
      "obbo.obbbbbbbbbbbbbbooooso..",
      ".obbobbbbbbbbbbbbbbbbbbsso..",
      "..osbbbbbbbbbbbbbbbbbbbsso..",
      "...oooooooooooooooooooooo..."
    ];
  })();
  (function() {
    "use strict";
    window.ACTOR_TURN = window.ACTOR_TURN || {};
    window.ACTOR_TURN["fin-onigiri"] = [
      ".............................",
      "..............ooooo..........",
      ".............owwssso.........",
      ".............owwssso.........",
      "............owwwssso.........",
      "............owwwsssso........",
      "...........owswwsssso........",
      "..........owwwwwsssso........",
      "..........owwwwwwsssso.......",
      ".........owwswwwwsseso.......",
      ".........owwwwwwwsseso.oo....",
      "........owwwwwwwwwssccowwo...",
      ".......owwswwwwwwwsssowwwo...",
      ".......ownnnNnnnnnnnsowwso...",
      "......ownnnnNnnnnnnnnsooo....",
      "......ownnnnNnnnnnnnnsso.....",
      ".....owwnnnnNnnnnnnnnsso.....",
      ".....owwnnnnNnnnnnnnnsso.....",
      ".....owwnnnnNnnnnnnnnsso.....",
      "......ooooooooooooooooo......"
    ];
  })();
  (function() {
    "use strict";
    window.ACTOR_TURN = window.ACTOR_TURN || {};
    window.ACTOR_TURN["fin-paper"] = [
      "..........ooooo...............",
      "........oogggggooooo..........",
      "........ogggggggggggooo.......",
      ".......ogggggggggggggggo......",
      ".......ogggggggggggggwwwo.....",
      ".......ogggggggggggggwwwo.....",
      ".......ogggggggggggggwwwo.....",
      ".......ogggggggggggggwwwo.....",
      ".......ogggggggggggggwwwo.....",
      ".......ogggggggggggggwwwo.....",
      ".......ogggggggggggggwwwo.....",
      ".......ogggggggggggggwewo.....",
      ".......ogggggggggggggwewo..oo.",
      ".......ogggggggggggggwwwo.oggo",
      ".......ogggggggggggggwwwoogggo",
      ".......ogggggggggggggwwwoGggo.",
      ".......ogggggggggggggwwwoGgo..",
      ".......ogggggggggggggwwwogo...",
      ".......ogggggggggggggwwwoo....",
      "........oggggggggggggwwwo.....",
      "........oogggggggggggwwwo.....",
      "..........oooooggggggwwwo.....",
      "...............ooooogwwo......",
      "....................ooo......."
    ];
  })();
  (function() {
    "use strict";
    window.ACTOR_FINAL = window.ACTOR_FINAL || [];
    const sleeping = ACTOR.sleep([
      ".............",
      "....oooooo...",
      "...okkkkkko..",
      "..okkkfffffo.",
      "..okkkffffcfo",
      ".okkkkfeffcfo",
      ".okkkkffefffo",
      "okkkkkffefffo",
      "okkkkkfeffffo",
      "okkkkkffffufo",
      "okkkkkffffufo",
      "oKkkkkfeffffo",
      "oKkkkkffefffo",
      ".oKkkkffefffo",
      ".oKkkkfeffcfo",
      "..oKkkffffcfo",
      "..oKKkfffffoo",
      "...okkkkkko..",
      "....oooooo...",
      "............."
    ], [[[".oooo.", "opfffo", "ohfffo", ".oPPo.", "..oo.."], 13, 14]]);
    ACTOR_FINAL.push({
      key: "fin-kokeshi",
      zh: "\u5C0F\u82A5\u5B50\u6728\u5076",
      name: "Kokeshi",
      idea: "\u65E5\u672C\u6E29\u6CC9\u4E61\u7684\u4F20\u7EDF\u6728\u5934\u5A03\u5A03\u300C\u5C0F\u82A5\u5B50\u300D\uFF1A\u4E00\u4E2A\u5706\u5934\u52A0\u4E00\u6839\u8F66\u5E8A\u65CB\u51FA\u6765\u7684\u5706\u6728\u8EAB\u5B50\uFF0C\u7528\u7B14\u753B\u4E0A\u9ED1\u8272\u9F50\u5218\u6D77\u3001\u5976\u767D\u8272\u7684\u9886\u5B50\u548C\u4E00\u6735\u83CA\u82B1\uFF0C\u5E95\u4E0B\u4E00\u5708\u82D4\u7EFF\uFF0C\u6700\u5E95\u662F\u6CA1\u4E0A\u6F06\u7684\u539F\u6728\u3002\u8EAB\u5B50\u5237\u6210\u85E4\u7D2B\u8272\u3002",
      why: "\u5C0F\u82A5\u5B50\u6CA1\u6709\u624B\u811A\uFF0C\u603B\u662F\u5B89\u5B89\u9759\u9759\u5730\u7AD9\u7740\uFF0C\u50CF\u4E00\u4E2A\u8E0F\u5B9E\u3001\u8BDD\u4E0D\u591A\u7684\u540C\u4E8B\uFF1B\u6728\u5934\u505A\u7684\uFF0C\u548C\u6749\u6728\u77EE\u684C\u3001\u7EB8\u62C9\u95E8\u662F\u4E00\u5BB6\u4EBA\uFF0C\u85E4\u7D2B\u8272\u5728\u623F\u95F4\u91CC\u72EC\u4E00\u4EFD\u3002\u5B83\u4E0D\u957F\u817F\uFF1A\u8D70\u8DEF\u65F6\u5DE6\u53F3\u8F6E\u6D41\u7528\u5E95\u5EA7\u7684\u4E00\u8FB9\u7740\u5730\uFF0C\u4E2D\u95F4\u8F7B\u8F7B\u4E00\u8DF3\uFF0C\u4E00\u6643\u4E00\u6643\u5730\u5F80\u524D\u632A\uFF1B\u8981\u5E72\u6D3B\u65F6\u624D\u4ECE\u8896\u53E3\u4F38\u51FA\u4E24\u53EA\u5706\u5706\u7684\u5C0F\u624B\uFF0C\u5E73\u65F6\u6536\u7740\uFF0C\u8F6E\u5ED3\u8FD8\u662F\u90A3\u6839\u5E72\u51C0\u7684\u6728\u5076\u3002\u7B49\u4F60\u62CD\u677F\u65F6\u5B83\u7AD9\u5B9A\u770B\u7740\u4F60\uFF0C\u5934\u9876\u4E00\u4E2A\u6731\u7EA2\u300C!\u300D\uFF08\u63CF\u4E86\u4E00\u5708\u767D\u8FB9\uFF0C\u843D\u5728\u9ED1\u5C4F\u5E55\u524D\u4E5F\u770B\u5F97\u6E05\uFF09\uFF1B\u529E\u5B8C\u4E86\u53EA\u662F\u5C0F\u8DF3\u4E00\u4E0B\u3001\u4E3E\u4E3E\u8896\u5B50\u3002\u548C\u7B2C\u4E5D\u8F6E\u6BD4\u6539\u4E86\u56DB\u5904\uFF1A\u53BB\u6389\u4E86\u5E95\u4E0B\u90A3\u4E24\u53EA\u5C0F\u811A\uFF08\u6728\u5076\u672C\u6765\u6CA1\u6709\u811A\uFF0C\u6447\u7740\u8D70\u66F4\u50CF\u5B83\uFF09\uFF1B\u80F8\u524D\u7684\u82B1\u6539\u6210\u4E00\u6735\u5706\u5706\u7684\u83CA\u82B1\uFF0C\u5728\u623F\u95F4\u91CC\u770B\u5F97\u51FA\u662F\u82B1\uFF1B\u8EAB\u5B50\u52A0\u4E86\u4E00\u9053\u8F66\u5E8A\u65CB\u51FA\u6765\u7684\u6D45\u7D2B\u9AD8\u5149\uFF1B\u4FA7\u680F\u56FE\u6807\u5355\u72EC\u753B\u6210\u5927\u5934\u50CF\uFF0C\u5934\u53D1\u5916\u5708\u52A0\u4E00\u9053\u6D45\u7070\u8FB9\uFF0C\u6DF1\u8272\u4FA7\u680F\u91CC\u9F50\u5218\u6D77\u4E5F\u4E0D\u4F1A\u6D88\u5931\u3002",
      pal: { ...sleeping.pal, "o": "#2d2420", "k": "#29231f", "K": "#5a524c", "f": "#f6e6c8", "p": "#7a64a4", "P": "#5d4b84", "h": "#9a87c2", "y": "#f6e7b4", "m": "#7f9a5a", "d": "#b88a58", "e": "#29231f", "u": "#29231f", "c": "#f0a7a0", "z": "rgba(70,50,30,0.22)", "r": "#d8452a", "w": "#fbf7ee", "b": "#4a6383", "n": "#f2d77e", "t": "#8a8079", "q": "#7f9a5a", "Q": "#647f43", "g": "#8b817a" },
      k: 2,
      sleepSurface: true,
      poses: ACTOR.make({
        poses: {
          idle: [
            ".........oooooo.........",
            ".......ooKKkkkkoo.......",
            ".....ooKKkkkkkkkkoo.....",
            "....oKKkkkkkkkkkkkko....",
            "...okKkkkkkkkkkkkkkko...",
            "...okkkkkkkkkkkkkkkko...",
            "...okffffffffffffffko...",
            "...okfffeeffffeefffko...",
            "...okfffeeffffeefffko...",
            "...okffffffffffffffko...",
            "....ofccfffuufffccfo....",
            ".....offffffffffffo.....",
            "......oooffffffooo......",
            "......oooooooooooo......",
            "......ohffppppffPo......",
            "......ohpffppffpPo......",
            "......ohppffffppPo......",
            "......ohppppppppPo......",
            ".....ohppppyypppPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppppyypppPPo.....",
            ".....ommmmmmmmmmmmo.....",
            ".....oddddddddddddo.....",
            "......oooooooooooo......",
            "......zzzzzzzzzzzz......"
          ],
          blink: [
            ".........oooooo.........",
            ".......ooKKkkkkoo.......",
            ".....ooKKkkkkkkkkoo.....",
            "....oKKkkkkkkkkkkkko....",
            "...okKkkkkkkkkkkkkkko...",
            "...okkkkkkkkkkkkkkkko...",
            "...okffffffffffffffko...",
            "...okffffffffffffffko...",
            "...okfffeeffffeefffko...",
            "...okffffffffffffffko...",
            "....ofccfffuufffccfo....",
            ".....offffffffffffo.....",
            "......oooffffffooo......",
            "......oooooooooooo......",
            "......ohffppppffPo......",
            "......ohpffppffpPo......",
            "......ohppffffppPo......",
            "......ohppppppppPo......",
            ".....ohppppyypppPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppppyypppPPo.....",
            ".....ommmmmmmmmmmmo.....",
            ".....oddddddddddddo.....",
            "......oooooooooooo......",
            "......zzzzzzzzzzzz......"
          ],
          walkA: [
            ".......oooooo...........",
            ".....ooKKkkkkoo.........",
            "...ooKKkkkkkkkkoo.......",
            "..oKKkkkkkkkkkkkko......",
            ".okKkkkkkkkkkkkkkko.....",
            ".okkkkkkkkkkkkkkkko.....",
            ".okffffffffffffffko.....",
            ".okfffeeffffeefffko.....",
            ".okfffeeffffeefffko.....",
            ".okffffffffffffffko.....",
            "..ofccfffuufffccfo......",
            "...offffffffffffo.......",
            "....oooffffffooo........",
            ".....oooooooooooo.......",
            ".....ohffppppffPo.......",
            ".....ohpffppffpPo.......",
            ".....ohppffffppPo.......",
            ".....ohppppppppPo.......",
            "....ohppppyypppPPo......",
            "....ohpppyyyyppPPo......",
            "....ohppyymmyypPPo......",
            "....ohppyymmyypPPo......",
            "....ohpppyyyyppPPo......",
            "....ohppppyypppPPo......",
            "....ommmmmmmmmmmmo......",
            "....oddddddddooooo......",
            ".....oooooooo...........",
            "....zzzzzzzzzzzz........"
          ],
          walkB: [
            ".........oooooo.........",
            ".......ooKKkkkkoo.......",
            ".....ooKKkkkkkkkkoo.....",
            "....oKKkkkkkkkkkkkko....",
            "...okKkkkkkkkkkkkkkko...",
            "...okkkkkkkkkkkkkkkko...",
            "...okffffffffffffffko...",
            "...okfffeeffffeefffko...",
            "...okfffeeffffeefffko...",
            "...okffffffffffffffko...",
            "....ofccfffuufffccfo....",
            ".....offffffffffffo.....",
            "......oooffffffooo......",
            "......oooooooooooo......",
            "......ohffppppffPo......",
            "......ohpffppffpPo......",
            "......ohppffffppPo......",
            "......ohppppppppPo......",
            ".....ohppppyypppPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppppyypppPPo.....",
            ".....ommmmmmmmmmmmo.....",
            ".....oddddddddddddo.....",
            "......oooooooooooo......",
            "........................",
            "........zzzzzzzz........"
          ],
          walkC: [
            "...........oooooo.......",
            ".........ooKKkkkkoo.....",
            ".......ooKKkkkkkkkkoo...",
            "......oKKkkkkkkkkkkkko..",
            ".....okKkkkkkkkkkkkkkko.",
            ".....okkkkkkkkkkkkkkkko.",
            ".....okffffffffffffffko.",
            ".....okfffeeffffeefffko.",
            ".....okfffeeffffeefffko.",
            ".....okffffffffffffffko.",
            "......ofccfffuufffccfo..",
            ".......offffffffffffo...",
            "........oooffffffooo....",
            ".......oooooooooooo.....",
            ".......ohffppppffPo.....",
            ".......ohpffppffpPo.....",
            ".......ohppffffppPo.....",
            ".......ohppppppppPo.....",
            "......ohppppyypppPPo....",
            "......ohpppyyyyppPPo....",
            "......ohppyymmyypPPo....",
            "......ohppyymmyypPPo....",
            "......ohpppyyyyppPPo....",
            "......ohppppyypppPPo....",
            "......ommmmmmmmmmmmo....",
            "......oooooddddddddo....",
            "...........oooooooo.....",
            "........zzzzzzzzzzzz...."
          ],
          walkD: [
            ".........oooooo.........",
            ".......ooKKkkkkoo.......",
            ".....ooKKkkkkkkkkoo.....",
            "....oKKkkkkkkkkkkkko....",
            "...okKkkkkkkkkkkkkkko...",
            "...okkkkkkkkkkkkkkkko...",
            "...okffffffffffffffko...",
            "...okfffeeffffeefffko...",
            "...okfffeeffffeefffko...",
            "...okffffffffffffffko...",
            "....ofccfffuufffccfo....",
            ".....offffffffffffo.....",
            "......oooooooooooo......",
            "......ohffppppffPo......",
            "......ohpffppffpPo......",
            "......ohppffffppPo......",
            "......ohppppppppPo......",
            ".....ohppppyypppPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppppyypppPPo.....",
            ".....ommmmmmmmmmmmo.....",
            ".....oddddddddddddo.....",
            "......oooooooooooo......",
            ".....zzzzzzzzzzzzzz....."
          ],
          type: [
            ".........oooooo.........",
            ".......ooKKkkkkoo.......",
            ".....ooKKkkkkkkkkoo.....",
            "....oKKkkkkkkkkkkkko....",
            "...okKkkkkkkkkkkkkkko...",
            "...okkkkkkkkkkkkkkkko...",
            "...okffffffffffffffko...",
            "...okffffffffffffffko...",
            "...okfffeeffffeefffko...",
            "...okfffeeffffeefffko...",
            "....ofccfffuufffccfo....",
            ".....offffffffffffo.....",
            "......oooffffffooo......",
            "......oooooooooooo......",
            "......ohffppppffPo......",
            "....ooohpffppffpPooo....",
            "...ohpohppffffppPopPo...",
            "...ohpohppppppppPopPo...",
            "...ohpoppppyypppPoffo...",
            "...offopppyyyyppPooo....",
            "....oooppyymmyypPPo....."
          ],
          type2: [
            ".........oooooo.........",
            ".......ooKKkkkkoo.......",
            ".....ooKKkkkkkkkkoo.....",
            "....oKKkkkkkkkkkkkko....",
            "...okKkkkkkkkkkkkkkko...",
            "...okkkkkkkkkkkkkkkko...",
            "...okffffffffffffffko...",
            "...okffffffffffffffko...",
            "...okfffeeffffeefffko...",
            "...okfffeeffffeefffko...",
            "....ofccfffuufffccfo....",
            ".....offffffffffffo.....",
            "......oooffffffooo......",
            "......oooooooooooo......",
            "......ohffppppffPo......",
            "....ooohpffppffpPooo....",
            "...ohpohppffffppPopPo...",
            "...ohpohppppppppPopPo...",
            "...offoppppyypppPopPo...",
            "....ooopppyyyyppPoffo...",
            ".....ohppyymmyypPooo...."
          ],
          back: [
            ".........oooooo.........",
            ".......ooKKkkkkoo.......",
            ".....ooKKkkkkkkkkoo.....",
            "....oKKkkkkkkkkkkkko....",
            "...okKkkkkkkkkkkkkkko...",
            "...okkkkkkkkkkkkkkkko...",
            "...okkkkkkkkkkkkkkkko...",
            "...okkkkkkkkkkkkkkkko...",
            "...okkkkkkkkkkkkkkkko...",
            "...okkkkkkkkkkkkkkkko...",
            "....okkkkkkkkkkkkkko....",
            ".....offffffffffffo.....",
            "......oooffffffooo......",
            "......oooooooooooo......",
            "......ohppppppppPo......",
            "......ohppppppppPo......",
            "......ohpmmppmmpPo......",
            "......ohpmmmmmmpPo......",
            ".....ohppmmppmmpPPo.....",
            ".....ohpppppppppPPo.....",
            ".....ohpppppppppPPo....."
          ],
          read: [
            ".........oooooo.........",
            ".......ooKKkkkkoo.......",
            ".....ooKKkkkkkkkkoo.....",
            "....oKKkkkkkkkkkkkko....",
            "...okKkkkkkkkkkkkkkko...",
            "...okkkkkkkkkkkkkkkko...",
            "...offffffffffffkkkko...",
            "...offffffffffffkkkko...",
            "...offeeffffeeffkkkko...",
            "...offeeffffeeffkkkko...",
            "....occffuuffccfkkko....",
            ".....offfffffffkkko.....",
            "......oooffffffooo......",
            "......oooooooooooo......",
            "......ohffppppffPo......",
            "...ooooopooooofpPo......",
            "..owwwwwowwwwwopPo......",
            "..owtttwowtttwopPo......",
            "..owwwwwowwwwwopPPo.....",
            ".offtttwowtttffoPPo.....",
            ".offbbbbbbbbbffoPPo.....",
            "..ooooooooooooopPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppppyypppPPo.....",
            ".....ommmmmmmmmmmmo.....",
            ".....oddddddddddddo.....",
            "......oooooooooooo......",
            "......zzzzzzzzzzzz......"
          ],
          post: [
            ".................oooooo.",
            ".................onnnno.",
            ".................onnnno.",
            ".................onffno.",
            ".................ooffoo.",
            ".........oooooo...opPo..",
            ".......ooKKkkkkoo.opPo..",
            ".....ooKKkkkkkkkkoppPPo.",
            "....oKKkkkkkkkkkkoppPPo.",
            "...okKkkkkkkkkkkkoppPPo.",
            "...okkkkkkkkkkkkoppPPo..",
            "...okkkkkkkkkkkkoppPPo..",
            "...okkkkkkkkkkkoppPPo...",
            "...okkkkkkkkkkkoppPPo...",
            "...okkkkkkkkkkoppPPoo...",
            "....okkkkkkkkkoppPPo....",
            ".....offffffffoppPPo....",
            "......ooofffffoppPPo....",
            "......oooooooooooo......",
            "......ohppppppppPo......",
            "......ohppppppppPo......",
            "......ohpmmppmmpPo......",
            "......ohpmmmmmmpPo......",
            ".....ohppmmppmmpPPo.....",
            ".....ohpppppppppPPo.....",
            ".....ohpppppppppPPo.....",
            ".....ohpppppppppPPo.....",
            ".....ohpppppppppPPo.....",
            ".....ohpppppppppPPo.....",
            ".....ommmmmmmmmmmmo.....",
            ".....oddddddddddddo.....",
            "......oooooooooooo......",
            "......zzzzzzzzzzzz......"
          ],
          phone: [
            ".........oooooo.........",
            ".......ooKKkkkkoo.......",
            ".....ooKKkkkkkkkkoo.....",
            "....oKKkkkkkkkkkkkko....",
            "...okKkkkkkkkkkkkkkooo..",
            "...okkkkkkkkkkkkkkoKKKo.",
            "...okfffffffffffffoKKo..",
            "...okfffeeffffeefffoKo..",
            "...okfffeeffffeefffoKo..",
            "...okfffffffffffffofffo.",
            "....ofccfffuufffccofffo.",
            ".....offfffuufffffoKKo..",
            "......oooffffffoooKKoPo.",
            "......oooooooooooooopPo.",
            "......ohffppppffPo.opPo.",
            "......ohpffppffpPoopPo..",
            "......ohppffffppPopPo...",
            "......ohppppppppPo......",
            ".....ohppppyypppPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppppyypppPPo.....",
            ".....ommmmmmmmmmmmo.....",
            ".....oddddddddddddo.....",
            "......oooooooooooo......",
            "......zzzzzzzzzzzz......"
          ],
          tea: [
            ".........oooooo.........",
            ".......ooKKkkkkoo.......",
            ".....ooKKkkkkkkkkoo.....",
            "....oKKkkkkkkkkkkkko....",
            "...okKkkkkkkkkkkkkkko...",
            "...okkkkkkkkkkkkkkkko...",
            "...okffffffffffffffko...",
            "...okfffeeffffeefffko...",
            "...okffeffeffeffeffko...",
            "...okffffffffffffffko...",
            "....ofccfffuufffccfo....",
            ".....offffffffffffo.....",
            "......oooffffffooo......",
            "......oooooooooooo......",
            "......ohffppppffPo......",
            "......ohpffppffpPo......",
            "......ohppffffppPo......",
            "......ohpoooooopPo......",
            ".....ohoooommooooPo.....",
            ".....ooffowwwwoffoo.....",
            ".....ooffowwwwoffoo.....",
            ".....ohooowwwwoooPo.....",
            ".....ohppoooooopPPo.....",
            ".....ohppppyypppPPo.....",
            ".....ommmmmmmmmmmmo.....",
            "..oqqoddddddddddddoqqo..",
            ".oqqqqooooooooooooqqqqo.",
            ".oqqqqqqqqqqqqqqqqqqqqo.",
            ".oQQQQQQQQQQQQQQQQQQQQo.",
            "..oooooooooooooooooooo.."
          ],
          wave: [
            ".........oooooo.........",
            ".......ooKKkkkkoo.......",
            ".....ooKKkkkkkkkkoo.oo..",
            "....oKKkkkkkkkkkkkkoffo.",
            "...okKkkkkkkkkkkkkkoffo.",
            "...okkkkkkkkkkkkkkkkopPo",
            "...okffffffffffffffkopPo",
            "...okfffeeffffeefffkopPo",
            "...okfffeeffffeefffkopPo",
            "...okffffffffffffffkopPo",
            "....ofccffuffuffccfoopPo",
            ".....offfffuufffffoopPo.",
            "......oooffffffoooopPo..",
            "......oooooooooooopPo...",
            "......ohffppppffPo......",
            "......ohpffppffpPo......",
            "......ohppffffppPo......",
            "......ohppppppppPo......",
            ".....ohppppyypppPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppppyypppPPo.....",
            ".....ommmmmmmmmmmmo.....",
            ".....oddddddddddddo.....",
            "......oooooooooooo......",
            "......zzzzzzzzzzzz......"
          ],
          wave2: [
            ".........oooooo.........",
            ".......ooKKkkkkoo.......",
            ".....ooKKkkkkkkkkoo.....",
            "....oKKkkkkkkkkkkkko.oo.",
            "...okKkkkkkkkkkkkkkkoffo",
            "...okkkkkkkkkkkkkkkkoffo",
            "...okffffffffffffffkopPo",
            "...okfffeeffffeefffkopPo",
            "...okfffeeffffeefffkopPo",
            "...okffffffffffffffkopPo",
            "....ofccffuffuffccfoopPo",
            ".....offfffuufffffoopPo.",
            "......oooffffffoooopPo..",
            "......oooooooooooopPo...",
            "......ohffppppffPo......",
            "......ohpffppffpPo......",
            "......ohppffffppPo......",
            "......ohppppppppPo......",
            ".....ohppppyypppPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppppyypppPPo.....",
            ".....ommmmmmmmmmmmo.....",
            ".....oddddddddddddo.....",
            "......oooooooooooo......",
            "......zzzzzzzzzzzz......"
          ],
          attention: [
            "..........wwww..........",
            "..........wrrw..........",
            "..........wrrw..........",
            "..........wrrw..........",
            "..........wrrw..........",
            "..........wwww..........",
            "..........wrrw..........",
            "..........wwww..........",
            "........................",
            ".........oooooo.........",
            ".......ooKKkkkkoo.......",
            ".....ooKKkkkkkkkkoo.....",
            "....oKKkkkkkkkkkkkko....",
            "...okKkkkkkkkkkkkkkko...",
            "...okkkkkkkkkkkkkkkko...",
            "...okffffffffffffffko...",
            "...okfffeeffffeefffko...",
            "...okfffeeffffeefffko...",
            "...okffffffffffffffko...",
            "....ofccfffuufffccfo....",
            ".....offffffffffffo.....",
            "......oooffffffooo......",
            "......oooooooooooo......",
            "......ohffppppffPo......",
            "......ohpffppffpPo......",
            "......ohppffffppPo......",
            "......ohppppppppPo......",
            ".....ohppppyypppPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppppyypppPPo.....",
            ".....ommmmmmmmmmmmo.....",
            ".....oddddddddddddo.....",
            "......oooooooooooo......",
            "......zzzzzzzzzzzz......"
          ],
          cheer: [
            ".........oooooo.........",
            ".......ooKKkkkkoo.......",
            ".....ooKKkkkkkkkkoo.....",
            "....oKKkkkkkkkkkkkko....",
            "...okKkkkkkkkkkkkkkko...",
            "...okkkkkkkkkkkkkkkko...",
            "...okffffffffffffffko...",
            "...okfffeeffffeefffko...",
            "...okffeffeffeffeffko...",
            ".oookffffffffffffffkooo.",
            "offoofccffuffuffccfooffo",
            "offo.offfffuufffffo.offo",
            ".opPo.oooffffffooo.oPpo.",
            "..opPooooooooooooooPpo..",
            "...opPohffppppffPoPpo...",
            "......ohpffppffpPo......",
            "......ohppffffppPo......",
            "......ohppppppppPo......",
            ".....ohppppyypppPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppppyypppPPo.....",
            ".....ommmmmmmmmmmmo.....",
            ".....oddddddddddddo.....",
            "......oooooooooooo......",
            "........................",
            "........................",
            "........zzzzzzzz........"
          ],
          think: [
            ".........oooooo.........",
            ".......ooKKkkkkoo.....tt",
            ".....ooKKkkkkkkkkoo...tt",
            "....oKKkkkkkkkkkkkko....",
            "...okKkkkkkkkkkkkkkkot..",
            "...okkkkkkkkkkkkkkkko...",
            "...okffffeeffffeeffko...",
            "...okffffeeffffeeffko...",
            "...okffffffffffffffko...",
            "...okffffffffffffffko...",
            "....ofccffffuoooccfo....",
            ".....offffffofffofo.....",
            "......ooofffofffoo......",
            "......ooooooooPpPo......",
            "......ohffppppopPo......",
            "......ohpffppffopPo.....",
            "......ohppffffppopPo....",
            "......ohppppppppPo......",
            ".....ohppppyypppPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohppyymmyypPPo.....",
            ".....ohpppyyyyppPPo.....",
            ".....ohppppyypppPPo.....",
            ".....ommmmmmmmmmmmo.....",
            ".....oddddddddddddo.....",
            "......oooooooooooo......",
            "......zzzzzzzzzzzz......"
          ],
          sleep: sleeping.sleep,
          sleep2: sleeping.sleep2,
          icon24: [
            "........gggggggg........",
            "......ggKKKkkkkkgg......",
            "....ggKKkkkkkkkkkkgg....",
            "...gKKkkkkkkkkkkkkkkg...",
            "..gKkkkkkkkkkkkkkkkkkg..",
            "..gkkkkkkkkkkkkkkkkkkg..",
            ".gkkkkkkkkkkkkkkkkkkkkg.",
            ".gkkffffffffffffffffkkg.",
            ".gkkffffffffffffffffkkg.",
            ".gkkfffeeffffffeefffkkg.",
            ".gkkfffeeffffffeefffkkg.",
            ".gkkffffffffffffffffkkg.",
            "..gkfccffffuuffffccfkg..",
            "...gffffffffffffffffg...",
            ".....oooffffffffooo.....",
            ".....oooooooooooooo.....",
            "....ohffppppppppffPo....",
            "....ohpffppppppffpPo....",
            "...ohpppffppppffpppPo...",
            "...ohppppffppffppppPo...",
            "...ohpppppffffpppppPo...",
            "...ohppppppyypppppPPo...",
            "...ohpppppyyyyppppPPo...",
            "...oooooooooooooooooo..."
          ],
          icon16: [
            ".....gggggg.....",
            "...ggKKkkkkgg...",
            "..gKkkkkkkkkkg..",
            ".gKkkkkkkkkkkkg.",
            ".gkkkkkkkkkkkkg.",
            ".gkffffffffffkg.",
            ".gkffeffffeffkg.",
            ".gkffeffffeffkg.",
            "..gfcffuuffcfg..",
            "...offffffffo...",
            "....oooooooo....",
            "....offppffo....",
            "...ohffppffPo...",
            "..ohpppffpppPo..",
            "..ohppppppppPo..",
            "..oooooooooooo.."
          ]
        }
      }),
      anim: { "idle": ["idle", "idle", "idle", "idle", "idle", "idle", "idle", "blink"], "walk": ["walkA", "walkB", "walkC", "walkD"], "type": ["type", "type2"], "sleep": sleeping.loop, "wave": ["wave", "wave2", "wave", "wave2"], "cheer": ["cheer2", "cheer", "cheer", "cheer2"], "think": ["think"] }
    });
  })();
  (function() {
    "use strict";
    window.ACTOR_FINAL = window.ACTOR_FINAL || [];
    const W = 28;
    const blank = (n, w) => Array.from({ length: n }, () => ".".repeat(w || W));
    function put(rows, patch, x, y) {
      const out = rows.slice();
      patch.forEach((p, j) => {
        const r = out[y + j].split("");
        p.split("").forEach((ch, i) => {
          if (ch !== ".") r[x + i] = ch;
        });
        out[y + j] = r.join("");
      });
      return out;
    }
    const lay = (rows, ...patches) => patches.reduce((a, [p, x, y]) => put(a, p, x, y), rows);
    const EARS = [
      ".oo............oo.",
      ".obo..........oio.",
      ".obpo........oIio.",
      ".obppooooooooIIio.",
      "obbbbbbbbbbbiiiiio",
      "obbbbbbbbbbbbiiiio"
    ];
    const FACE = {
      // eyes 2×2; a small dark-rose nose with a closed "ω" smile under it
      // (thin strokes, nothing filled, so it never reads as an open mouth)
      open: [
        "obbbbbbbbbbbbbiiio",
        "obbbeebbbbbbeebbbo",
        "obbbeebbbbbbeebbbo",
        "obccbbbbnnbbbbccso",
        "obbbbbubuububbbbso",
        "obbbbbbubbubbbbbso"
      ],
      blink: [
        "obbbbbbbbbbbbbiiio",
        "obbbbbbbbbbbbbbbbo",
        "obbbeebbbbbbeebbbo",
        "obccbbbbnnbbbbccso",
        "obbbbbubuububbbbso",
        "obbbbbbubbubbbbbso"
      ],
      down: [
        "obbbbbbbbbbbbbiiio",
        "obbbbbbbbbbbbbbbbo",
        "obbbeebbbbbbeebbbo",
        "occbeebbnnbbeebcco",
        "obbbbbubuububbbbso",
        "obbbbbbubbubbbbbso"
      ],
      up: [
        "obbeebbbbbbeebiiio",
        "obbeebbbbbbeebbbbo",
        "obbbbbbbbbbbbbbbbo",
        "obccbbbbnnbbbbccso",
        "obbbbbubuububbbbso",
        "obbbbbbubbubbbbbso"
      ],
      happy: [
        "obbbbbbbbbbbbbiiio",
        "obbbebbbbbbbbebbbo",
        "obbebebbbbbbebebbo",
        "obccbbbbnnbbbbccso",
        "obbbbbubuububbbbso",
        "obbbbbbubbubbbbbso"
      ],
      sleep: [
        "obbbbbbbbbbbbbiiio",
        "obbbbbbbbbbbbbbbbo",
        "obbeeebbbbbbeeebbo",
        "obccbbbbnnbbbbccso",
        "obbbbbubuububbbbso",
        "obbbbbbubbubbbbbso"
      ]
    };
    const BACKHEAD = [
      ".oo............oo.",
      ".oio..........obo.",
      ".oiio........obbo.",
      ".oiiioooooooobbbo.",
      "oiiiiibbbbbbbbbbbo",
      "oiiiibbbbbbbbbbbbo",
      "oiiibbbbbbbbbbbbbo",
      "obbbbbbbbbbbbbbbso",
      "obbbbbbbbbbbbbbbso",
      "obbbbbbbbbbbbbbbso",
      "obbbbbbbbbbbbbbbso",
      "obbbbbbbbbbbbbbbso"
    ];
    const head = (face) => EARS.concat(FACE[face]);
    const headRows = (h) => h.map((r) => "....." + r + ".....");
    const TORSO = [
      ".....oiiiiiiiiiiiiiiiio.....",
      "....obbbiiiiiggiiiiibbbo....",
      "....obbbbbiiiGGiiibbbbbo....",
      "....obbbbbbbiiiibbbbbbbo....",
      "....obbbbbbbbiibbbbbbbbo....",
      "....obbbbbbbbbbbbbbbbbso....",
      "....obbbbbbbbbbbbbbbbbso....",
      "....obbbbbbbbbbbbbbbbbso....",
      "....osbbbbbbbbbbbbbbbbso....",
      "....osbbbbbbbbbbbbbbbsso....",
      ".....osbbbbbbbbbbbbbsso.....",
      "......oooooooooooooooo......"
    ];
    const FEET = ["......obbbbo....obbbbo......", "......oooooo....oooooo......"];
    const TORSO_BACK = [
      ".....oiiiiiiiiiiiiiiiio.....",
      "....obbbbbbbiiiibbbbbbbo....",
      "....obbbbbbbibbibbbbbbbo....",
      "....obbbbbbbbbbbbbbbbbbo....",
      "....obbbbbbbbbbbbbbbbbbo....",
      "....obbbbbbbbbbbbbbbbbso....",
      "....obbbbbbbbbbbbbbbbbso....",
      "....obbbbbbbbbbbbbbbbbso....",
      "....osbbbbbbbbbbbbbbbbso....",
      "....osbbbbbbbbbbbbbbbsso....",
      ".....osbbbbbbbbbbbbbsso.....",
      "......oooooooooooooooo......"
    ];
    const TAIL = ["..ooo.", ".oiiio", ".obboo", "obbo..", "obbo..", ".obbo.", "..obbo"];
    const SEAT = [
      ".....oiiiiiiiiiiiiiiiio.....",
      "....obbbiiiiiggiiiiibbbo....",
      "....obbbbbiiiGGiiibbbbbo....",
      "....obbbbbbbiiiibbbbbbbo....",
      "....obbbbbbbbiibbbbbbbbo....",
      "...obbbbbbbbbbbbbbbbbbbso...",
      "..obbbbbbbbbbbbbbbbbbbbsso..",
      "..osbbbbbbbobbbbobbbbbssso..",
      "...oooooooooooooooooooooo..."
    ];
    const SEAT_BACK = [
      ".....oiiiiiiiiiiiiiiiio.....",
      "....obbbbbbbiiiibbbbbbbo....",
      "....obbbbbbbibbibbbbbbbo....",
      "....obbbbbbbbbbbbbbbbbbo....",
      "....obbbbbbbbbbbbbbbbbso....",
      "...obbbbbbbbbbbbbbbbbbbso...",
      "..obbbbbbbbbbbbbbbbbbbbsso..",
      "..osbbbbbbbbbbbbbbbbbbssso..",
      "...oooooooooooooooooooooo..."
    ];
    const ARM_UP = [
      ".ooo.",
      "obbbo",
      "obpbo",
      "obbbs",
      "obbbs",
      "obbbs",
      "obbbs",
      "obbbs",
      "obbbs",
      "obbbs",
      "obbbs",
      ".obbs",
      "..obb",
      "...ob"
    ];
    const ARM_BECKON = [
      ".....",
      ".....",
      ".ooo.",
      "obbbo",
      "osssb",
      "oooos",
      "obbbs",
      "obbbs",
      "obbbs",
      "obbbs",
      ".obbs",
      "..obb",
      "...ob"
    ];
    const ARM_DOWN = [".oo.", "obbo", "obbo", "obbo", "obso", ".oo."];
    const mirror = (p) => p.map((r) => r.split("").reverse().join(""));
    const LETTER = ["ooooooo", "olwwwlo", "owlwlwo", "owwgwwo", "ooooooo"];
    const PAW_HOLD = [".ooo.", "obbbo", "obbbo", ".ooo."];
    const BIG_LETTER = ["oooooooooo", "olwwwwwwlo", "owlwwwwlwo", "owwlwwlwwo", "owwwggwwwo", "oooooooooo"];
    const PAW_L = [".ooo", "obbb", "obbb", ".ooo"];
    const PAW_R = mirror(PAW_L);
    const standFront = (face) => headRows(head(face)).concat(TORSO, FEET);
    const holdLetter = (rows, dy) => lay(rows, [LETTER, 19, 16 + (dy || 0)], [PAW_HOLD, 16, 17 + (dy || 0)]);
    const idleWith = (face) => holdLetter(lay(standFront(face), [ARM_UP, 0, 1]));
    const FOOT_UP = [".obbo.", ".oooo.", "......"];
    const FOOT_PLANT = ["obbbbo", "obbbbo", "oooooo"];
    function walk(lift, armDy) {
      let rows = headRows(head("open")).concat(TORSO);
      rows = lay(rows, [ARM_DOWN, 1, 14 + armDy]);
      rows = holdLetter(rows);
      if (!lift) return rows.concat(FEET);
      const feet = blank(3);
      const l = lift === "left" ? FOOT_UP : FOOT_PLANT;
      const r = lift === "left" ? FOOT_PLANT : FOOT_UP;
      return rows.concat(lay(feet, [l, 6, 0], [r, 16, 0]));
    }
    function type(leftUp) {
      const rows = headRows(head("open")).concat(TORSO.slice(0, 7));
      const paw = [".oooo.", "obbbbo", "obpbbo", "oooooo"];
      return lay(rows, [paw, 4, leftUp ? 14 : 15], [mirror(paw), 18, leftUp ? 15 : 14]);
    }
    const poses = {};
    poses.idle = idleWith("open");
    poses.blink = idleWith("blink");
    poses.wave = holdLetter(lay(standFront("open"), [ARM_BECKON, 0, 2]));
    poses.walkA = walk("left", 0);
    poses.walkB = walk(null, 1);
    poses.walkC = walk("right", 2);
    poses.walkD = walk(null, 1);
    poses.type = type(true);
    poses.type2 = type(false);
    poses.back = lay(headRows(BACKHEAD).concat(SEAT_BACK), [TAIL, 17, 13]);
    const BOOK = [".ooooo.ooooo.", "owwwwwowwwwwo", "owllwwowllwwo", "owwwwwowwwwwo", "owllwwowllwwo", "ommmmmommmmmo", ".ooooo.ooooo."];
    poses.read = lay(standFront("down"), [BOOK, 7, 15], [PAW_L, 5, 18], [PAW_R, 19, 18]);
    const NOTE = ["oooooo", "oyyyyo", "oyyyyo", "oyyyyo", "oooooo"];
    const ARM_POST = ["obbbo", "obbbo", "obbbo", "obbbo"].concat(Array(8).fill(".bbbo"), [".bbo.", ".bo.."]);
    poses.post = lay(blank(3).concat(headRows(BACKHEAD), TORSO_BACK, FEET), [NOTE, 22, 0], [ARM_POST, 22, 3]);
    const HANDSET = [".kkkk", "kkkkk", "kk...", "kk...", "kk...", "kkkkk", ".kkkk"];
    const ARM_PHONE = [".ooo.", "obbbo", "obbbo", "obbbs", "obbbs", "obbbs", ".obbs", "..obb", "...ob"];
    poses.phone = lay(standFront("open"), [ARM_PHONE, 0, 6], [HANDSET, 4, 5], [mirror(ARM_DOWN), 23, 14]);
    const CUP = ["oooooo", "ommmmo", "okkkko", "okkkko", "okkkko", ".oooo."];
    const STEAM = [".w", "w.", ".w"];
    poses.tea = lay(headRows(head("down")).concat(SEAT), [CUP, 11, 15], [PAW_L, 8, 16], [PAW_R, 16, 16], [STEAM, 13, 12]);
    const BANG = ["rr", "rr", "rr", "rr", "..", "rr"];
    poses.attention = lay(blank(5).concat(standFront("open")), [BANG, 13, 0], [BIG_LETTER, 9, 20], [PAW_L, 7, 23], [PAW_R, 17, 23]);
    const ARM_CHEER = [".ooo.", "obbbo", "obpbo", "obbbs", "obbbs", "obbbs", ".obbs", "..obb", "...ob"];
    const GLINT = [".g.", "ggg", ".g."];
    const cheer = (glint) => lay(standFront("happy"), [ARM_CHEER, 0, 6], [mirror(ARM_CHEER), 23, 6], [glint, 24, 0]);
    poses.cheer = cheer(GLINT);
    poses.cheer2 = cheer(["...", ".g.", "..."]).concat(["."]);
    const ARM_CHIN = [".ooo..", "obbbo.", "obbbo.", ".obbbo", "..obbo", "..obbo", "..obbo"];
    const DOTS = ["uu....", "uu....", "...u..", "......", ".....u"];
    const think = (dots) => lay(standFront("up"), [ARM_CHIN, 15, 10], [ARM_DOWN, 1, 14], [dots, 0, 0]);
    poses.think = think(DOTS);
    poses.think2 = think(["......", "......", "...u..", "......", ".....u"]);
    const sleeping = ACTOR.sleep([
      "....oooooooo",
      "ooooiiibbsss",
      "oiiiiiibbcbo",
      ".oIIiiibecbo",
      "..oIiibbebbo",
      "...oibbbebbb",
      "...obbbbbbub",
      "...obbbbbbbu",
      "...obbbbbnub",
      "...obbbbbnub",
      "...obbbbbbbu",
      "...obbbbbbub",
      "...obbbbebbb",
      "..opbbbbebbb",
      ".oppbbbbecbb",
      "obbbbbbbbcbb",
      "oooobbbbbbbb",
      "....oooooooo"
    ], [[["iigii", "iiGii"], 12, 10], [[".ooo.", "obpbo", "obpbo", ".ooo."], 13, 15]]);
    poses.sleep = sleeping.sleep;
    poses.sleep2 = sleeping.sleep2;
    poses.icon24 = [
      "......oo............oo..",
      ".ooo..obo..........oio..",
      "obbbo.obpo........oIio..",
      "obpbo.obppooooooooIIio..",
      "obbbsobbbbbbbbbbbbiiiiio",
      "obbbsobbbbbbbbbbbbbiiiio",
      "obbbsobbbbbbbbbbbbbbiiio",
      "obbbsobbbeebbbbbbeebbbbo",
      "obbbsobbbeebbbbbbeebbbbo",
      "obbbsobccbbbbnnbbbbccbso",
      "obbbsobbbbbubuububbbbbso",
      ".obbsobbbbbbubbubbbbbbso",
      "..obboiiiiiiiggiiiiiiiio",
      "...obbbbbbiiiGGiiibbbbbo",
      "....obbbbbbiiiiiibbbbbbo",
      "....obbbbbbbiiiibbbbbbso",
      "....obbbbbbbbiibbbbbbbso",
      "....osbbbbbbbbbbbbbbbbso",
      ".....oooooooooooooooooo."
    ];
    poses.icon16 = [
      ".oo..o.......o..",
      "obboobo.....oio.",
      "obpobpoooooooIio",
      "obbobbbbbbbbiiio",
      "obbobbbbbbbbbiio",
      "obbobbebbbbbebbo",
      "obbobbebbbbbebbo",
      "obbobcbbbnbbbcbo",
      ".obobbbbbbbbbbbo",
      "..ooiiiiigiiiiio",
      "...obbbiiGiibbbo",
      "...obbbbiiibbbbo",
      "...obbbbbibbbbso",
      "....ooooooooooo."
    ];
    const sprites = {};
    Object.entries(poses).forEach(([k, rows]) => sprites[k] = rows);
    ACTOR_FINAL.push({
      key: "fin-neko",
      zh: "\u62DB\u8D22\u732B",
      name: "Maneki-neko",
      idea: "\u65E5\u672C\u5E97\u95E8\u53E3\u4E3E\u7740\u4E00\u53EA\u722A\u5B50\u62DB\u624B\u7684\u62DB\u8D22\u732B\uFF0C\u505A\u6210\u4F60\u7684\u79D8\u4E66\uFF1A\u5976\u6CB9\u767D\u7684\u8EAB\u5B50\uFF0C\u4E00\u53EA\u8033\u6735\u8FDE\u7740\u5934\u9876\u662F\u4E00\u5757\u975B\u84DD\u6591\uFF0C\u975B\u84DD\u56F4\u515C\u4E0A\u6302\u4E00\u4E2A\u5C0F\u91D1\u94C3\u94DB\u3002\u539F\u7248\u53E6\u4E00\u53EA\u722A\u5B50\u62B1\u91D1\u5E01\uFF0C\u5B83\u62B1\u7684\u662F\u4E00\u5C01\u4FE1\u3002",
      why: "\u4E3E\u8D77\u7684\u722A\u5B50\u5C31\u662F\u300C\u6B22\u8FCE\u3001\u8BF7\u8FDB\u300D\uFF1A\u6709\u4EBA\u8FDB\u95E8\u3001\u4F60\u5728\u4FA7\u680F\u78B0\u5230\u5B83\uFF0C\u5B83\u5C31\u628A\u722A\u5B50\u5F80\u4E0B\u4E00\u62DB\u3002\u5E73\u65F6\u5B83\u628A\u4FE1\u5939\u5728\u8EAB\u4FA7\uFF0C\u6709\u4E8B\u7B49\u4F60\u62CD\u677F\u65F6\u53CC\u624B\u628A\u4FE1\u9012\u5230\u4F60\u9762\u524D\u3001\u5934\u9876\u4EAE\u4E00\u4E2A\u6731\u7EA2\u7684\u300C!\u300D\uFF0C\u4E8B\u60C5\u529E\u5B8C\u624D\u628A\u4FE1\u653E\u4E0B\u3001\u53CC\u624B\u4E00\u4E3E\u3002\u6539\u4E86\u539F\u7248\u51E0\u5904\uFF1A\u7AD9\u7740\u548C\u5750\u4E0B\u65F6\u5934\u4E0D\u518D\u5DE6\u53F3\u9519\u5F00\u4E00\u50CF\u7D20\uFF1B\u5634\u6539\u6210\u9F3B\u5B50\u4E0B\u9762\u4E00\u4E2A\u7EC6\u7EBF\u7684\u300C\u03C9\u300D\uFF0C\u95ED\u7740\u5634\u5FAE\u7B11\uFF0C\u4E0D\u518D\u50CF\u5F20\u7740\u5634\uFF1B\u80CC\u5F71\u7684\u975B\u84DD\u8033\u6735\u6362\u5230\u53E6\u4E00\u8FB9\uFF08\u4ECE\u80CC\u540E\u770B\u672C\u6765\u5C31\u5728\u5DE6\u8FB9\uFF09\uFF0C\u5F00\u4F1A\u5750\u7740\u7684\u80CC\u5F71\u591A\u4E86\u4E00\u6761\u975B\u84DD\u5C16\u7684\u77ED\u5C3E\u5DF4\u3002\u5B83\u662F\u540C\u4E8B\u4E0D\u662F\u62DB\u8D22\u6446\u4EF6\uFF1A\u4FE1\u3001\u56F4\u515C\u548C\u633A\u76F4\u7AD9\u7740\u7684\u6837\u5B50\u90FD\u5728\u8BF4\u300C\u6211\u5728\u66FF\u4F60\u529E\u4E8B\u300D\u3002",
      pal: {
        ...sleeping.pal,
        o: "#3a3448",
        b: "#f8f0e0",
        s: "#e0d3ba",
        p: "#eeb0a6",
        n: "#c9787a",
        u: "#8a6a78",
        e: "#2a2433",
        c: "#f4b4aa",
        i: "#34497a",
        I: "#5a72a6",
        g: "#e2b84e",
        G: "#a9842e",
        w: "#ffffff",
        l: "#b8c2d6",
        r: "#d8452a",
        k: "#3b3a38",
        y: "#f1dc8a",
        m: "#7f9a5a"
      },
      k: 2,
      sleepSurface: true,
      poses: ACTOR.make({ poses: sprites }),
      anim: {
        idle: ["idle", "idle", "idle", "idle", "idle", "idle", "blink", "idle"],
        walk: ["walkA", "walkB", "walkC", "walkD"],
        type: ["type", "type2"],
        sleep: sleeping.loop,
        wave: ["idle", "wave", "idle", "wave", "idle", "idle"],
        cheer: ["cheer", "cheer", "cheer2", "cheer2"],
        think: ["think2", "think2", "think", "think", "think", "think"]
      }
    });
  })();
  (function() {
    "use strict";
    window.ACTOR_FINAL = window.ACTOR_FINAL || [];
    const grid = (w, h) => Array.from({ length: h }, () => Array(w).fill("."));
    const out = (g) => g.map((r) => r.join(""));
    const at2 = (g, x, y) => y < 0 || y >= g.length || x < 0 || x >= g[0].length ? "." : g[y][x];
    const set2 = (g, x, y, ch) => {
      if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = ch;
    };
    function fill(g, test, ch, on) {
      for (let y = 0; y < g.length; y++)
        for (let x = 0; x < g[0].length; x++)
          if (test(x + 0.5, y + 0.5) && (!on || on.includes(g[y][x]))) g[y][x] = ch;
    }
    const rect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
    function segDist(px, py, a, b) {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy);
    }
    function inTri(px, py, a, b, c) {
      const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
      const P2 = [px, py];
      const d1 = s(P2, a, b);
      const d2 = s(P2, b, c);
      const d3 = s(P2, c, a);
      return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
    }
    const roundTri = (a, b, c, r) => (x, y) => inTri(x, y, a, b, c) || segDist(x, y, a, b) <= r || segDist(x, y, b, c) <= r || segDist(x, y, c, a) <= r;
    function edge(g, line) {
      const hit = [];
      for (let y = 0; y < g.length; y++)
        for (let x = 0; x < g[0].length; x++) {
          if (g[y][x] === ".") continue;
          if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at2(g, x + dx, y + dy) === ".")) hit.push([x, y]);
        }
      hit.forEach(([x, y]) => g[y][x] = line || "o");
    }
    function stamp(g, x, y, art) {
      art.forEach(
        (r, j) => r.split("").forEach((ch, i) => {
          if (ch !== ".") set2(g, x + i, y + j, ch === "_" ? "." : ch);
        })
      );
    }
    const place = (g, part, x, y) => stamp(g, x, y, out(part));
    const BW = 23;
    const BH = 20;
    const FW = 29;
    const BX = 3;
    const FACES = {
      // eyes at body columns 8 and 14, rows 9-10; mouth under them
      open: ["..e.....e..", "..e.....e..", "cc..u.u..cc", ".....u....."],
      blink: ["...........", ".eee...eee.", "cc..u.u..cc", ".....u....."],
      happy: ["..e.....e..", ".e.e...e.e.", "cc..u.u..cc", ".....u....."],
      down: ["...........", "..e.....e..", "cc.......cc", ".....u....."],
      up: ["...e.....e.", "...e.....e.", "cc.......cc", "......u...."],
      talk: ["...e.....e.", "...e.....e.", "cc...uu..cc", ".....uu...."],
      sleep: ["...........", ".e.e...e.e.", "cc.e.u.e.cc", "..........."]
    };
    function rice(face) {
      const g = grid(BW, BH);
      fill(g, roundTri([11.5, 3.9], [3.9, 16.6], [19.1, 16.6], 3.3), "w");
      edge(g);
      fill(g, rect(6, 13, 17, 19), "n", "w");
      for (let y = 0; y < BH; y++)
        for (let x = 12; x < BW; x++) if (g[y][x] === "w" && (at2(g, x + 1, y) === "o" || at2(g, x + 1, y + 1) === "o")) g[y][x] = "s";
      if (face === "back") {
        fill(g, rect(11, 13, 12, 19), "N", "n");
        [[9, 5], [14, 8], [7, 11]].forEach(([x, y]) => set2(g, x, y, "s"));
        return g;
      }
      [[9, 4], [5, 12]].forEach(([x, y]) => set2(g, x, y, "s"));
      stamp(g, 7, 14, ["NN", "N"]);
      if (FACES[face]) stamp(g, 6, 9, FACES[face]);
      return g;
    }
    const HAND = [".oo.", "owwo", "owso", ".oo."];
    const FOOT = ["owwwo", ".ooo."];
    const LEG = ["owwwo", "owwwo", ".ooo."];
    const frame = (h) => grid(FW, h);
    function stand(face, opt) {
      opt = opt || {};
      const extra = opt.extra || 0;
      const lift = opt.lift || 0;
      const H = extra + BH + 2 + lift;
      const g = frame(H);
      const top = extra;
      place(g, rice(face), BX, top);
      const fy = top + BH;
      const feet = opt.feet || [[9, 0], [15, 0]];
      feet.forEach(([x, dy]) => stamp(g, x, fy + dy, lift ? LEG : FOOT));
      return { g, top };
    }
    const P = {};
    {
      const s = stand("open");
      stamp(s.g, 3, 14, HAND);
      stamp(s.g, 22, 14, HAND);
      P.idle = out(s.g);
    }
    {
      const s = stand("blink");
      stamp(s.g, 3, 14, HAND);
      stamp(s.g, 22, 14, HAND);
      P.blink = out(s.g);
    }
    {
      const a = stand("open", { feet: [[8, 0], [16, -1]] });
      stamp(a.g, 3, 13, HAND);
      stamp(a.g, 22, 15, HAND);
      P.walkA = out(a.g).concat(["."]);
      const b = stand("open", { lift: 1, feet: [[10, 0], [14, 0]] });
      stamp(b.g, 3, 14, HAND);
      stamp(b.g, 22, 14, HAND);
      P.walkB = out(b.g);
      const c = stand("open", { feet: [[8, -1], [16, 0]] });
      stamp(c.g, 3, 15, HAND);
      stamp(c.g, 22, 13, HAND);
      P.walkC = out(c.g).concat(["."]);
      P.walkD = P.walkB;
    }
    function seated(face) {
      const g = frame(BH + 1);
      place(g, rice(face), BX, 0);
      return g;
    }
    {
      const a = seated("down");
      stamp(a, 7, 16, HAND);
      stamp(a, 18, 16, HAND);
      P.type = out(a);
      const b = seated("down");
      stamp(b, 7, 15, HAND);
      stamp(b, 18, 17, HAND);
      P.type2 = out(b);
    }
    {
      const g = frame(BH);
      place(g, rice("back"), BX, 0);
      stamp(g, 3, 14, HAND);
      stamp(g, 22, 14, HAND);
      P.back = out(g);
    }
    {
      const s = stand("down");
      stamp(s.g, 7, 13, [
        ".oooooo.oooooo.",
        "oppppppoppppppo",
        "oplllppoplllppo",
        "oppppppoppppppo",
        "opllllpopllllpo",
        "obbbbbbobbbbbbo",
        ".ooooooooooooo."
      ]);
      stamp(s.g, 4, 15, HAND);
      stamp(s.g, 21, 15, HAND);
      P.read = out(s.g);
    }
    {
      const s = stand("back", { extra: 3 });
      stamp(s.g, 17, 0, [
        "oooooo",
        "oyyyyo",
        "oyyyyo",
        "oyyyYo",
        "oYYYYo",
        "oooooo"
      ]);
      stamp(s.g, 17, 5, HAND);
      stamp(s.g, 3, 17, HAND);
      P.post = out(s.g);
    }
    {
      const s = stand("talk");
      stamp(s.g, 19, 3, [
        ".oooo.",
        "okKkko",
        "okkkko",
        ".okko.",
        ".okko.",
        ".okko.",
        ".okko.",
        "okkkko",
        "okkkko",
        ".oooo."
      ]);
      stamp(s.g, 20, 6, HAND);
      stamp(s.g, 3, 14, HAND);
      P.phone = out(s.g);
    }
    {
      const g = frame(BH + 2);
      place(g, rice("blink"), BX, 0);
      stamp(g, 9, 20, FOOT);
      stamp(g, 15, 20, FOOT);
      stamp(g, 11, 15, [
        "ooooooo",
        "ogtttgo",
        "ogggGGo",
        "ogggGGo",
        ".ooooo."
      ]);
      stamp(g, 8, 15, HAND);
      stamp(g, 17, 15, HAND);
      P.tea = out(g);
    }
    {
      const a = stand("happy");
      stamp(a.g, 20, 4, HAND);
      stamp(a.g, 3, 14, HAND);
      P.wave = out(a.g);
      const b = stand("happy");
      stamp(b.g, 21, 3, HAND);
      stamp(b.g, 3, 14, HAND);
      P.wave2 = out(b.g);
    }
    {
      const s = stand("open", { extra: 7 });
      stamp(s.g, 13, 0, ["rrr", "rrr", "rrr", ".r.", "...", ".r."]);
      stamp(s.g, 3, 7 + 13, HAND);
      stamp(s.g, 22, 7 + 13, HAND);
      P.attention = out(s.g);
    }
    {
      const h = stand("happy", { extra: 1 });
      stamp(h.g, 3, 11, HAND);
      stamp(h.g, 22, 11, HAND);
      stamp(h.g, 3, 5, ["x"]);
      stamp(h.g, 25, 4, ["x"]);
      P.cheer1 = out(h.g);
    }
    {
      const s = stand("happy", { lift: 1, extra: 1 });
      stamp(s.g, 4, 8, HAND);
      stamp(s.g, 21, 8, HAND);
      stamp(s.g, 2, 3, [".x.", "xxx", ".x."]);
      stamp(s.g, 24, 2, [".x.", "xxx", ".x."]);
      P.cheer = out(s.g);
    }
    {
      const s = stand("up");
      stamp(s.g, 8, 11, HAND);
      stamp(s.g, 22, 14, HAND);
      stamp(s.g, 21, 4, ["o"]);
      P.think1 = out(s.g);
      stamp(s.g, 23, 2, ["oo", "oo"]);
      P.think2 = out(s.g);
      stamp(s.g, 25, 0, ["oo", "oo"]);
      P.think = out(s.g);
    }
    const sleeping = ACTOR.sleep([
      "..................",
      "...........oooooo.",
      "..........ownNnwo.",
      ".........owwnNnwo.",
      "........owcwnNnwo.",
      ".......oewwwnNnwo.",
      "......owwewwnNnwo.",
      "....oowwwewwnNnwo.",
      "...owwwwewwwnNnwo.",
      "..owwwwwwwwwnNnwo.",
      ".owwwwwwwwuwnNnwo.",
      "..owwwwwwwwwnNnwo.",
      "...owwwwewwwnNnwo.",
      "....oowwwewwnNnwo.",
      "......owwewwnNnwo.",
      ".......oewwwnNnwo.",
      "........owcwnNnwo.",
      ".........owwnNnwo.",
      "..........ooooooo.",
      ".................."
    ], [[[".ooo.", "owwwo", ".oso.", "..o.."], 13, 16]]);
    P.sleep = sleeping.sleep;
    P.sleep2 = sleeping.sleep2;
    P.icon24 = [
      "..........oooo..........",
      ".........owwwwo.........",
      "........owwwwwso........",
      ".......owwwwwwwso.......",
      ".......owwwwwwwso.......",
      "......owwwwwwwwwso......",
      "......owwwwwwwwwso......",
      ".....owwwwwwwwwwwso.....",
      ".....owwwewwwwewwso.....",
      "....owwwwewwwwewwwso....",
      "....owccwwwwwwwwccso....",
      "...owwwwwwwuuwwwwwwso...",
      "...owwwnnnnnnnnnnwwso...",
      "..owwwwnnnnnnnnnnwwwso..",
      "..owwwwnNnnnnnnnnwwwso..",
      ".owwwwwnNnnnnnnnnwwwwso.",
      ".owwwwwnnnnnnnnnnwwwwso.",
      ".owwwwwnnnnnnnnnnwwwsso.",
      "..oowwwwwwwwwwwwwsssoo..",
      "....oooooooooooooooo...."
    ];
    P.icon16 = [
      "......oooo......",
      ".....owwwso.....",
      "....owwwwwso....",
      "....owwwwwso....",
      "...owwwwwwwso...",
      "...owwwwwwwso...",
      "..owwewwwwewso..",
      "..owwewwwwewso..",
      ".owcwwwwwwwcwso.",
      ".owwnnnnnnnnwso.",
      "owwwnnnnnnnnwwso",
      "owwwnnnnnnnnwwso",
      "owwwnnnnnnnnwsso",
      ".oowwwwwwwwssoo.",
      "..oooooooooooo.."
    ];
    ACTOR_FINAL.push({
      key: "fin-onigiri",
      zh: "\u996D\u56E2",
      name: "Onigiri",
      idea: "\u4E00\u4E2A\u767D\u767D\u7684\u4E09\u89D2\u996D\u56E2\uFF0C\u4E0B\u534A\u622A\u88F9\u7740\u4E00\u6761\u6D77\u82D4\uFF0C\u50CF\u7CFB\u4E86\u4E00\u6761\u6DF1\u8272\u56F4\u88D9\u3002\u8FD9\u4E00\u8F6E\u7ED9\u5B83\u52A0\u4E86\u4E00\u53CC\u7C73\u7C92\u634F\u6210\u7684\u5C0F\u624B\u548C\u5C0F\u811A\uFF1A\u6367\u4E66\u3001\u8D34\u4FBF\u7B7E\u3001\u63E1\u542C\u7B52\u3001\u7AEF\u8336\u676F\u90FD\u9760\u8FD9\u53CC\u5C0F\u767D\u624B\uFF0C\u4E00\u770B\u5C31\u77E5\u9053\u5B83\u5728\u5E72\u4EC0\u4E48\u3002",
      why: "\u996D\u56E2\u662F\u300C\u5E2E\u4F60\u628A\u4E00\u987F\u996D\u6253\u5305\u597D\u300D\u7684\u4E1C\u897F\uFF1A\u4E0D\u8D77\u773C\u3001\u9760\u5F97\u4F4F\u3001\u4EC0\u4E48\u65F6\u5019\u90FD\u5728\uFF0C\u50CF\u4E00\u4E2A\u8E0F\u5B9E\u7684\u540C\u4E8B\u3002\u767D\u7C73\u914D\u6D77\u82D4\u5728\u69BB\u69BB\u7C73\u548C\u6749\u6728\u4E4B\u95F4\u5F88\u9192\u76EE\uFF0C\u53C8\u548C\u7EB8\u62C9\u95E8\u3001\u70AD\u9ED1\u7EBF\u6761\u662F\u4E00\u4E2A\u8C03\u5B50\uFF1B\u4E09\u89D2\u5F62\u8F6E\u5ED3\u5728\u6BCF\u4E2A\u52A8\u4F5C\u91CC\u90FD\u4E0D\u53D8\uFF0C\u7F29\u6210\u4FA7\u680F\u56FE\u6807\u4E5F\u4E00\u773C\u8BA4\u5F97\u3002\u548C\u539F\u7A3F\u6BD4\u6539\u4E86\u4E09\u5904\uFF1A\u4E09\u89D2\u7684\u5706\u89D2\u6536\u7D27\u4E00\u70B9\uFF0C\u8F6E\u5ED3\u66F4\u5229\u843D\uFF1B\u539F\u6765\u6DF1\u8272\u7684\u5C0F\u811A\u6362\u6210\u767D\u7C73\u5C0F\u811A\uFF0C\u548C\u5C0F\u624B\u914D\u5957\uFF1B\u7761\u89C9\u91CD\u753B\u6210\u6795\u7740\u6795\u5934\u3001\u6D77\u82D4\u9732\u5728\u88AB\u5B50\u5916\u9762\u4E00\u622A\uFF0C\u8EBA\u7740\u4E5F\u8BA4\u5F97\u51FA\u662F\u996D\u56E2\u3002\u4FA7\u680F\u56FE\u6807\u5728\u6D77\u82D4\u4E0B\u9762\u7559\u4E86\u4E00\u9053\u767D\u7C73\u8FB9\uFF0C\u653E\u5728\u6DF1\u8272\u4FA7\u680F\u91CC\u4E09\u89D2\u5F62\u4E5F\u662F\u5B8C\u6574\u7684\u3002",
      pal: {
        o: "#3d3833",
        w: "#fbf8f1",
        s: "#e3dac8",
        n: "#27322b",
        N: "#4a5c4f",
        e: "#2a2522",
        u: "#3d3833",
        c: "#f1a99e",
        b: "#4d6380",
        p: "#efe6d2",
        k: "#34322f",
        K: "#5d5852",
        y: "#f3d98a",
        Y: "#d8b75e",
        g: "#c99a6e",
        G: "#a77b55",
        l: "#b9ae9a",
        t: "#7f9a5a",
        v: "#ffffff",
        r: "#d8452a",
        x: "#e2b54a",
        F: "#f6f1e6",
        ...sleeping.pal
      },
      poses: ACTOR.make({ poses: P }),
      k: 2,
      sleepSurface: true,
      anim: {
        idle: ["idle", "idle", "idle", "idle", "idle", "idle", "idle", "blink"],
        walk: ["walkA", "walkB", "walkC", "walkD"],
        type: ["type", "type2"],
        sleep: sleeping.loop,
        wave: ["wave", "wave2", "wave", "wave2"],
        cheer: ["idle", "cheer1", "cheer", "cheer", "cheer", "cheer1", "idle", "idle"],
        think: ["think1", "think1", "think2", "think2", "think", "think", "think", "think"]
      }
    });
  })();
  (function() {
    "use strict";
    window.ACTOR_FINAL = window.ACTOR_FINAL || [];
    const grid = (w, h) => Array.from({ length: h }, () => Array(w).fill("."));
    const out = (g) => g.map((r) => r.join(""));
    const set2 = (g, x, y, ch) => {
      if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = ch;
    };
    function stamp(g, x, y, art) {
      art.forEach(
        (r, j) => r.split("").forEach((ch, i) => {
          if (ch !== ".") set2(g, x + i, y + j, ch === "_" ? "." : ch);
        })
      );
    }
    function lean(g, y0, y1, dx) {
      for (let y = y0; y < y1; y++) {
        const r = g[y].slice();
        for (let x = 0; x < r.length; x++) g[y][x] = r[x - dx] || ".";
      }
    }
    const BW = 22;
    const BH = 24;
    const PAGE = [
      "...oooooooooooooooo...",
      ".oowwwwwwwwwwwwwwwwoo.",
      ".owwwwwwwwwwwwwwwwwwo.",
      "owwwwwwwwwwwwwwwwwwwwo",
      "owwwwwwwwwwwwwwwwwwwwo",
      "owwwwwwwwwwwwwwwwwwwwo",
      "owwwwwwwwwwwwwwwwwwwwo",
      "owwwwwwwwwwwwwwwwwwwwo",
      "owwwwwwwwwwwwwwwwwwwwo",
      "owwwwwwwwwwwwwwwwwwwwo",
      "owwwwwwwwwwwwwwwwwwwwo",
      "owwwwwwwwwwwwwwwwwwwwo",
      "owwwwwwwwwwwwwwwwwwwwo",
      "owwwwwwwwwwwwwwwwwwwwo",
      "owwwwwwwwwwwwwwwwwwwwo",
      "owwwwwwwwwwwwwwwwooooo",
      "owwwwwwwwwwwwwwwo.....",
      "owwwwwwwwwwwwwwoo.....",
      "owwwwwwwwwwwwwwo......",
      "owwwwwwwwwwwwwwo......",
      "owwwwwwwwwwwwwwo......",
      ".owwwwwwwwwwwwwo......",
      ".oowwwwwwwwwwwwo......",
      "...ooooooooooooo......"
    ];
    const REST = [
      "...ooooo",
      "...Ggggo",
      "...Ggggo",
      "..Gggggo",
      "..Ggggo.",
      "..Gggo..",
      ".Gggo...",
      ".Goo....",
      ".o......"
    ];
    const EYES = {
      open: [7, 9, ["ee...ee", "ee...ee", "ee...ee"]],
      blink: [7, 11, ["ee...ee"]],
      down: [7, 11, ["ee...ee", "ee...ee"]],
      happy: [6, 9, [".e....e.", "e.e..e.e"]],
      shut: [6, 10, ["e.e..e.e", ".e....e."]],
      up: [6, 8, ["ee...ee", "ee...ee", "ee...ee"]],
      right: [8, 9, ["ee...ee", "ee...ee", "ee...ee"]]
    };
    function page(g, x, y, face, rest) {
      stamp(g, x, y, PAGE);
      if (face && EYES[face]) {
        const [ex, ey, art] = EYES[face];
        stamp(g, x + ex, y + ey, art);
      }
      if (rest) stamp(g, x + 14, y + 15, REST);
    }
    function hand(g, root, ctrl, tip, r0, r1) {
      const pts = [];
      for (let i = 0; i <= 48; i++) {
        const t = i / 48;
        const a = (1 - t) * (1 - t);
        const b = 2 * (1 - t) * t;
        const c = t * t;
        pts.push([a * root[0] + b * ctrl[0] + c * tip[0], a * root[1] + b * ctrl[1] + c * tip[1], r0 + (r1 - r0) * t]);
      }
      const H = g.length;
      const W = g[0].length;
      const m = grid(W, H);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if (pts.some(([px, py, r]) => Math.hypot(x + 0.5 - px, y + 0.5 - py) <= r)) m[y][x] = 1;
      const inM = (x, y) => y >= 0 && y < H && x >= 0 && x < W && m[y][x] === 1;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          if (!inM(x, y)) continue;
          const edge = !inM(x + 1, y) || !inM(x - 1, y) || !inM(x, y + 1) || !inM(x, y - 1);
          g[y][x] = edge ? "o" : "g";
        }
    }
    const FW = 30;
    const BX = 4;
    function stand(face, rest, opt) {
      opt = opt || {};
      const extra = opt.extra || 0;
      const lift = opt.lift || 0;
      const H = extra + BH + lift + 1;
      const g = grid(FW, H);
      page(g, BX, extra, face, rest);
      const sw = opt.shadow != null ? opt.shadow : 18;
      const sx = Math.round((FW - sw) / 2);
      for (let x = sx; x < sx + sw; x++) set2(g, x, H - 1, "z");
      return { g, top: extra, X: (px) => BX + px, Y: (py) => extra + py };
    }
    const P = {};
    P.idle = out(stand("open", true).g);
    P.blink = out(stand("blink", true).g);
    {
      const a = stand("open", true);
      lean(a.g, 0, 12, -1);
      P.walkA = out(a.g);
      const b = stand("open", false, { lift: 1, shadow: 14 });
      hand(b.g, [b.X(16), b.Y(20)], [b.X(19.5), b.Y(19.5)], [b.X(21.5), b.Y(15.2)], 2.4, 1.7);
      P.walkB = out(b.g);
      const c = stand("open", true);
      lean(c.g, 0, 12, 1);
      P.walkC = out(c.g);
      P.walkD = out(stand("open", true).g);
    }
    function typing(dy) {
      const g = grid(FW, 21);
      page(g, BX, 0, "down", false);
      hand(g, [BX + 16.5, 21], [BX + 23.5, 17.5], [BX + 20.5, 14 + dy], 2.4, 1.8);
      return out(g);
    }
    P.type = typing(1.5);
    P.type2 = typing(0);
    const BACK = PAGE.map((r) => r.split("").reverse().join("").replace(/w/g, "g"));
    const BACK_CURL = REST.map((r) => r.padEnd(8, ".").split("").reverse().join("").replace(/[gG]/g, "w"));
    {
      const g = grid(FW, BH);
      stamp(g, BX, 0, BACK);
      stamp(g, BX, 15, BACK_CURL);
      P.back = out(g);
    }
    {
      const s = stand("down", false);
      stamp(s.g, s.X(2), s.Y(15), [
        ".oooooo.oooooo.",
        "owwwwwwowwwwwwo",
        "owttttwowttttwo",
        "owwwwwwowwwwwwo",
        "owtttwwowtttwwo",
        "obbbbbbobbbbbbo",
        ".ooooooooooooo."
      ]);
      hand(s.g, [s.X(15.5), s.Y(22.5)], [s.X(20), s.Y(21)], [s.X(17), s.Y(16.5)], 2.4, 1.8);
      P.read = out(s.g);
    }
    {
      const H = 4 + BH + 2 + 1;
      const g = grid(FW, H);
      stamp(g, BX, 4, BACK);
      hand(g, [BX + 6, 4 + 20.5], [BX - 3.5, 4 + 18], [BX - 1.5, 4 + 6], 2.4, 1.8);
      stamp(g, BX - 4, 0, ["oooooo", "onnnno", "onnnno", "onnnNo", "oNNNNo", "oooooo"]);
      for (let x = 8; x < 22; x++) set2(g, x, H - 1, "z");
      P.post = out(g);
    }
    {
      const s = stand("right", false, { extra: 2 });
      stamp(s.g, s.X(19), s.Y(1), [
        ".oooo.",
        "oKkkko",
        "okkkko",
        ".okko.",
        ".okko.",
        ".okko.",
        ".okko.",
        "okkkko",
        "okkkko",
        ".oooo."
      ]);
      hand(s.g, [s.X(16), s.Y(20)], [s.X(24), s.Y(19)], [s.X(22.5), s.Y(10.5)], 2.4, 1.8);
      P.phone = out(s.g);
    }
    {
      const H = 3 + BH + 2;
      const g = grid(FW, H);
      page(g, BX, 3, "shut", false);
      stamp(g, 1, H - 4, [
        "..oooooooooooooooooooooooo..",
        ".oqqqqqqqqqqqqqqqqqqqqqqqqo.",
        "oqqqqqqqqqqqqqqqqqqqqqqqqqqo",
        ".oQQQQQQQQQQQQQQQQQQQQQQQQo."
      ]);
      stamp(g, BX, 3 + 21, PAGE.slice(21));
      stamp(g, BX + 8, 3 + 13, [
        ".oooooo.",
        "ommmmmmo",
        "oddddDDo",
        "oddddDDo",
        ".oddDDo.",
        "..oooo.."
      ]);
      hand(g, [BX + 15.5, 3 + 21.5], [BX + 20, 3 + 18.5], [BX + 15, 3 + 16.5], 2.4, 1.8);
      P.tea = out(g);
    }
    {
      const a = stand("happy", false);
      hand(a.g, [a.X(16), a.Y(20)], [a.X(23.5), a.Y(19)], [a.X(23.5), a.Y(10)], 2.4, 1.8);
      P.wave = out(a.g);
      const b = stand("happy", false);
      hand(b.g, [b.X(16), b.Y(20)], [b.X(22), b.Y(17)], [b.X(25.5), b.Y(11)], 2.4, 1.8);
      P.wave2 = out(b.g);
    }
    {
      const s = stand("open", true, { extra: 10 });
      stamp(s.g, 13, 0, ["wwww", "wrrw", "wrrw", "wrrw", "wrrw", "wwww", "wrrw", "wwww"]);
      P.attention = out(s.g);
    }
    {
      const a = stand("happy", false);
      hand(a.g, [a.X(16), a.Y(20)], [a.X(19.5), a.Y(19.5)], [a.X(21.5), a.Y(15.2)], 2.4, 1.7);
      P.cheer1 = out(a.g);
      const b = stand("happy", false, { extra: 2, lift: 2, shadow: 12 });
      hand(b.g, [b.X(16), b.Y(20)], [b.X(22.5), b.Y(19)], [b.X(23.5), b.Y(13)], 2.4, 1.8);
      stamp(b.g, 26, 0, [".o.", "ooo", ".o."]);
      P.cheer = out(b.g);
    }
    {
      const s = stand("up", false, { extra: 3 });
      hand(s.g, [s.X(16), s.Y(20)], [s.X(23), s.Y(18)], [s.X(20.5), s.Y(12)], 2.4, 1.8);
      lean(s.g, 0, s.Y(12), 1);
      stamp(s.g, 2, 0, ["tt.", "tt.", "..t"]);
      P.think = out(s.g);
    }
    function sleeper(breath) {
      const g = grid(36, 22);
      stamp(g, 0, 3, [
        "..PPPPPPPPPPP...",
        ".PpppppppppppP..",
        "PpppppppppppppP.",
        "PpppppppppppppP.",
        "PpppppppppppppP.",
        "PpppppppppppppP.",
        "PpppppppppppppP.",
        "PpppppppppppppP.",
        "PpppppppppppppP.",
        "PpppppppppppppP.",
        "PpppppppppppppP.",
        "PpppppppppppppP.",
        "PpppppppppppppP.",
        "PpppppppppppppP.",
        ".PpppppppppppP..",
        "..PPPPPPPPPPP..."
      ]);
      stamp(g, 3, 4, [
        "..oooooooooooooooooo..",
        ".owwwwwwwwwwwwwwwwwwo.",
        "owwwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwwwwwwwo",
        ".owwwwwwwwwwwwwwwwwwo.",
        "..oooooooooooooooooo.."
      ]);
      stamp(g, 9, 6, ["e.", ".e", ".e", "e."]);
      stamp(g, 9, 13, ["e.", ".e", ".e", "e."]);
      const edges = [
        [18, 30],
        [16, 32],
        [15, 33],
        [15, 34],
        [15, 34],
        [15, 34],
        [15, 34],
        [15, 34],
        [15, 34],
        [15, 34],
        [15, 34],
        [15, 34],
        [15, 34],
        [15, 34],
        [15, 34],
        [16, 33],
        [17, 32],
        [19, 30]
      ];
      edges.forEach(([left, right], row) => {
        const y = row + 2;
        for (let x = left; x <= right; x++)
          set2(g, x, y, x === right || row === edges.length - 1 ? "Q" : x === left ? "P" : x < left + 3 ? "s" : row === 0 || x === left + 3 ? "h" : "q");
      });
      if (breath) {
        for (let x = 22; x < 30; x++) set2(g, x, 1, "h");
        for (let x = 22; x < 30; x++) set2(g, x, 2, "q");
      }
      stamp(g, 12, 15, ["....oo.", "...oGgo", "..oGggo", ".oGggo.", "ooooo.."]);
      return g;
    }
    P.sleep = out(sleeper(0));
    P.sleep2 = out(sleeper(1));
    {
      const g = grid(24, 24);
      const rows = PAGE.filter((r, j) => j !== 5 && j !== 13);
      stamp(g, 1, 1, rows);
      stamp(g, 8, 8, ["ee...ee", "ee...ee", "ee...ee"]);
      stamp(g, 15, 14, REST);
      P.icon24 = out(g);
    }
    P.icon16 = [
      "...oooooooooo...",
      "..owwwwwwwwwwo..",
      ".owwwwwwwwwwwwo.",
      ".owwwwwwwwwwwwo.",
      ".owwwwwwwwwwwwo.",
      ".owwwwwwwwwwwwo.",
      ".owweewwweewwwo.",
      ".owweewwweewwwo.",
      ".owwwwwwwwwwwwo.",
      ".owwwwwwwwwwwwo.",
      ".owwwwwwwwwoooo.",
      ".owwwwwwwwoGggo.",
      ".owwwwwwwwoGgo..",
      "..owwwwwwwoGo...",
      "...ooooooooo....",
      "................"
    ];
    ACTOR_FINAL.push({
      key: "fin-paper",
      zh: "\u5377\u89D2\u5C0F\u7EB8",
      name: "Curled page",
      idea: "\u4E00\u5F20\u5706\u89D2\u7684\u5C0F\u7EB8\uFF0C\u4E24\u9897\u5C0F\u9ED1\u773C\u775B\uFF0C\u53F3\u4E0B\u89D2\u5377\u8D77\u4E00\u4E2A\u5C0F\u89D2\u3002\u8FD9\u5C31\u662F\u4EA7\u54C1\u91CC\u5DF2\u7ECF\u5B9A\u4E0B\u7684 Agent\uFF1A\u5750\u5728\u4F60\u65C1\u8FB9\u542C\u4F60\u8BF4\u3001\u5E2E\u4F60\u8BB0\uFF0C\u50CF\u4E00\u5F20\u968F\u65F6\u53EF\u4EE5\u5199\u5B57\u7684\u7EB8\u3002",
      why: "\u5B83\u662F\u4EA7\u54C1\u91CC\u5DF2\u7ECF\u786E\u8BA4\u7684\u5F62\u8C61\uFF0C\u4FA7\u680F\u548C\u804A\u5929\u9875\u7528\u7684\u90FD\u662F\u5B83\uFF0C\u623F\u95F4\u91CC\u4E5F\u5C31\u662F\u540C\u4E00\u4E2A\u5B83\uFF1A\u8F6E\u5ED3\u7167\u5B9A\u7A3F\u753B\uFF0C\u9ED1\u767D\u5E73\u6D82\uFF0C\u6CA1\u6709\u52A0\u816E\u7EA2\uFF08\u5B9A\u7A3F\u91CC\u6CA1\u6709\uFF09\u3002\u767D\u7EB8\u548C\u7EB8\u62C9\u95E8\u3001\u6749\u6728\u662F\u4E00\u5BB6\u4EBA\uFF0C\u4E00\u5708\u9ED1\u63CF\u8FB9\u53C8\u8BA9\u5B83\u5728\u7A3B\u8349\u9EC4\u7684\u69BB\u69BB\u7C73\u4E0A\u4E00\u773C\u8DF3\u51FA\u6765\u3002\u5B83\u6CA1\u6709\u624B\u811A\uFF0C\u53F3\u4E0B\u7684\u5377\u89D2\u5C31\u662F\u5B83\u7684\u624B\uFF1A\u6253\u5B57\u65F6\u4ECE\u684C\u6CBF\u4F38\u4E0A\u6765\u70B9\u952E\u76D8\uFF0C\u770B\u4E66\u65F6\u6258\u7740\u4E66\uFF0C\u6253\u7535\u8BDD\u65F6\u6258\u7740\u542C\u7B52\uFF0C\u559D\u8336\u65F6\u6367\u7740\u676F\u5B50\uFF0C\u8D34\u4FBF\u7B7E\u65F6\u6CBF\u7740\u7EB8\u8FB9\u4E3E\u9AD8\uFF0C\u6325\u624B\u65F6\u5377\u89D2\u62AC\u8D77\u6765\u6447\u4E00\u6447\uFF1B\u5377\u89D2\u62AC\u8D77\u540E\uFF0C\u90A3\u91CC\u7684\u7EB8\u8FB9\u5C31\u662F\u539F\u6765\u7684\u6298\u7EBF\uFF0C\u8F6E\u5ED3\u4E0D\u53D8\u3002\u8D70\u8DEF\u50CF\u4E00\u5F20\u7EB8\u90A3\u6837\uFF0C\u5DE6\u53F3\u4E24\u4E2A\u5E95\u89D2\u8F6E\u6D41\u7740\u5730\u8F7B\u8F7B\u4E00\u6643\uFF0C\u4E2D\u95F4\u5C0F\u5C0F\u4E00\u8DF3\uFF0C\u5730\u4E0A\u6709\u5F71\u5B50\u3002\u80CC\u5F71\u6574\u5F20\u662F\u7EB8\u7684\u80CC\u9762\uFF0C\u548C\u5377\u89D2\u540C\u4E00\u4E2A\u6D45\u6696\u7070\uFF0C\u5377\u89D2\u5728\u5DE6\u4E0B\u9732\u51FA\u767D\u8272\u7684\u6B63\u9762\uFF0C\u4E00\u770B\u5C31\u77E5\u9053\u662F\u8F6C\u8FC7\u8EAB\u53BB\u4E86\u3002\u7B49\u4F60\u62CD\u677F\u65F6\u5B83\u7AD9\u5B9A\u770B\u7740\u4F60\uFF0C\u5934\u9876\u4E00\u4E2A\u63CF\u4E86\u767D\u8FB9\u7684\u6731\u7EA2\u300C!\u300D\uFF1B\u529E\u5B8C\u4E86\u53EA\u662F\u5C0F\u8DF3\u4E00\u4E0B\u3001\u5F2F\u5F2F\u773C\u775B\u3002\u7761\u89C9\u65F6\u6574\u5F20\u7EB8\u6CBF\u5E8A\u9762\u8EBA\u5E73\uFF0C\u5934\u6795\u5728\u6D45\u8272\u6795\u5934\u4E0A\uFF0C\u95ED\u7740\u773C\u775B\uFF0C\u5706\u6DA6\u7684\u76D6\u6BEF\u968F\u547C\u5438\u8F7B\u8F7B\u8D77\u4F0F\uFF0C\u5377\u89D2\u9732\u5728\u88AB\u6CBF\u4E0A\u3002",
      pal: {
        o: "#2a2622",
        w: "#fdfbf6",
        g: "#e4ddd1",
        G: "#cdc4b5",
        e: "#2a2622",
        z: "rgba(70,50,30,0.22)",
        r: "#d8452a",
        b: "#4a6383",
        n: "#f2d77e",
        N: "#d9b95a",
        k: "#3b3a38",
        K: "#6a6460",
        d: "#b88a58",
        D: "#94683e",
        m: "#7f9a5a",
        t: "#8a8079",
        q: "#7f9a5a",
        Q: "#647f43",
        h: "#b8c7a6",
        s: "#f5efdf",
        p: "#ebe2d2",
        P: "#c3b7a2"
      },
      k: 2,
      sleepSurface: true,
      poses: ACTOR.make({ poses: P }),
      anim: {
        idle: ["idle", "idle", "idle", "idle", "idle", "idle", "idle", "blink"],
        walk: ["walkA", "walkB", "walkC", "walkD"],
        type: ["type", "type2"],
        sleep: [...Array(16).fill("sleep"), ...Array(16).fill("sleep2")],
        wave: ["wave", "wave2", "wave", "wave2"],
        cheer: ["cheer1", "cheer", "cheer", "cheer1"],
        think: ["think"]
      }
    });
  })();
  (function() {
    "use strict";
    const hands = {
      "fin-paper": [25, 12, 19],
      "fin-kokeshi": [20, 13, 18],
      "fin-neko": [23, 12, 18],
      "fin-onigiri": [22, 10, 15]
    };
    for (const character of window.ACTOR_FINAL) {
      const rows = window.ACTOR_TURN[character.key];
      if (!rows || !hands[character.key]) continue;
      const [hx, hy, end] = hands[character.key];
      const width = Math.max(...rows.map((row) => row.length));
      const source = rows.map((row) => row.padEnd(width, ".").split(""));
      [[0, 0], [0, 1], [1, 1], [1, 0]].forEach(([lean, tap], phase) => {
        const grid = source.map((row) => row.slice());
        for (let y = 0; y < hy; y++)
          grid[y] = source[y].map((_, x) => source[y][x - lean] || ".");
        for (let y = hy; y < end; y++)
          for (let x = hx; x < width; x++) grid[y][x] = ".";
        for (let y = hy; y < end; y++)
          for (let x = hx; x < width; x++)
            if (source[y][x] !== ".") grid[y - tap][x] = source[y][x];
        const sprite = window.PX.sprite(grid.map((row) => row.join("")));
        character.poses["turn" + phase] = sprite;
      });
      character.anim.turn = ["turn0", "turn1", "turn0", "turn1", "turn2", "turn3", "turn2", "turn3", "turn0", "turn0", "turn0", "turn0"];
    }
  })();
  return {
    // every registered room ({ key, zh, name, room }), the contract they
    // keep, the characters and their seated turn poses
    rooms: window.OFFICE_ROOMS,
    contract: window.ROOM_CONTRACT,
    characters: window.ACTOR_FINAL,
    turns: window.ACTOR_TURN,
    landscapes: window.LANDSCAPES
  };
}

var zenRooms = [
  "zen",
  "court",
  "ubud",
  "marrakech",
  "venice",
  "dali",
  "alpine",
  "santorini"
];
var zenLooks = ["kokeshi", "neko", "onigiri", "paper"];

var zenSceneSize = { width: 480, height: 560 };
var frameMs = 1e3 / 30;
var poseMs = 125;
var coffeeCycleMs = cycleDuration("coffee");
var pace = 110;
var turnMs = 200;
var lightFadeMs = 1500;
var stillPollMs = 1e3;
var keptLayers = 4;
function gestureAt(stop) {
  if (!stop.startsWith("gesture:")) return;
  const [, station, action] = stop.split(":");
  return { station, action };
}
function characterFor(characters, look) {
  const found = characters.find((character) => character.key === `fin-${look}`);
  if (!found) throw new Error(`No zen character for ${look}`);
  return found;
}
function lightAt(date, night) {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (night === true || night === "local-time" && (hour >= 19 || hour < 7))
    return "night";
  return night === "local-time" && hour >= 16.5 ? "golden" : "day";
}
var connected = { claude: true, slack: true };
function mountZenOffice(canvas, options) {
  const screen = canvas.getContext("2d");
  const inert = {
    setVisible: () => void 0,
    setPaused: () => void 0,
    setNight: () => void 0,
    setFocus: () => void 0,
    point: () => void 0,
    poke: () => void 0,
    setTour: () => void 0,
    setWeather: () => void 0,
    setLinks: () => void 0,
    dispose: () => void 0
  };
  let kit, character;
  try {
    kit = createZenKit();
    character = options.customCharacter ?? characterFor(kit.characters, options.look);
    if (options.customCharacter) kit.turns[character.key] = character.poses.turn.rows;
  } catch (error) {
    options.onError?.(error);
    return inert;
  }
  if (!screen) {
    options.onError?.(new Error("Canvas 2D unavailable"));
    return inert;
  }
  const view = screen;
  const roomName = options.room ?? "zen";
  const room = roomIn(kit, roomName);
  const landscapes = kit.landscapes;
  const loadAssets = room.ready?.bind(room);
  let assetsReady = loadAssets === void 0;
  let links = options.links ?? connected;
  const graph = { nodes: room.NODES, edges: room.EDGES };
  const floorOrigin = room.project(0, 0, 0);
  const floorUnit = room.project(1, 0, 0);
  const walkingPace = pace * Math.hypot(1, 0.5) / Math.hypot(floorUnit[0] - floorOrigin[0], floorUnit[1] - floorOrigin[1]);
  const sheet = () => {
    const c = document.createElement("canvas");
    c.width = zenSceneSize.width;
    c.height = zenSceneSize.height;
    const g = c.getContext("2d");
    if (!g) throw new Error("Canvas 2D unavailable");
    g.imageSmoothingEnabled = false;
    return { canvas: c, g };
  };
  const picture = sheet(), blend = sheet(), fade2 = sheet();
  const environmentTimeline = createEnvironmentTimeline();
  const environment = options.environment === false ? void 0 : publicEnvironmentSpace(roomName, room, landscapes);
  let wildlife;
  const wildlifeMasks = /* @__PURE__ */ new Map();
  const director = options.director ?? createDirector();
  const today = options.today ?? (() => /* @__PURE__ */ new Date()), southern = southernTimeZone(
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""
  );
  let reading = options.weather ?? weatherOn(localDay2(today()), southern), hostWeather = options.weather !== void 0, nightMode = options.night ?? "local-time";
  const motionQuery = options.reducedMotion === "system" || options.reducedMotion === void 0 ? matchMedia("(prefers-reduced-motion: reduce)") : void 0;
  let reduced = motionQuery ? motionQuery.matches : options.reducedMotion === true;
  let clock = 0, clockFrom;
  const now = () => clock + (clockFrom === void 0 ? 0 : Math.max(0, performance.now() - clockFrom));
  let frame, emitted, target = "work", motion, scenery, fading, paused = false, visible = options.visible ?? true, disposed = false, failed = false, sized = hasSize(canvas.getBoundingClientRect()), upscale = 1, raf = 0, poll;
  const budget = createFrameBudget(frameMs);
  const layers = /* @__PURE__ */ new Map();
  function layersFor(look, t, station, slot2) {
    const interval = room.animationFrameMs ?? 0;
    const roomFrame = Number.isFinite(interval) && interval > 0 ? Math.floor((reduced ? 0 : t) / interval) : void 0;
    const key = `${look.light}|${look.weather}|${look.season}|${station}|${slot2 ?? ""}|${String(links.claude)}|${String(links.slack)}${roomFrame === void 0 ? "" : `|${String(roomFrame)}`}`;
    let found = layers.get(key);
    if (found) layers.delete(key);
    else
      found = roomFrame === void 0 ? room.layers(station, slot2) : room.layers(station, slot2, roomFrame * interval / 1e3);
    layers.set(key, found);
    if (layers.size > keptLayers) {
      const oldest = layers.keys().next().value;
      if (oldest !== void 0) layers.delete(oldest);
    }
    return found;
  }
  function fail(error) {
    if (failed || disposed) return;
    failed = true;
    stop();
    options.onError?.(error);
  }
  function safely(fn) {
    try {
      fn();
    } catch (error) {
      fail(error);
    }
  }
  const nodeFor = (stop2) => stop2 === "hello" ? nearestNode([room.PLACES.walk.u, room.PLACES.walk.v]) : stopNode[gestureAt(stop2)?.station ?? stop2];
  const nodePoint = (stop2) => graph.nodes[nodeFor(stop2)];
  const floorUnder = (u, v) => {
    let sum = 0;
    for (let k = -6; k <= 6; k++) sum += room.floorAt(u + k, v);
    return sum / 13;
  };
  const loop = (name, t) => {
    const frames = character.anim[name];
    if (!frames?.length) return name;
    const holdMs = name === "tea" ? coffeeCycleMs / frames.length : poseMs;
    return frames[reduced ? 0 : Math.floor(t / holdMs) % frames.length] ?? name;
  };
  function settledShot(stop2, t) {
    const gesture = gestureAt(stop2);
    if (gesture) {
      const [u, v] = nodePoint(stop2);
      return standingShot(u, v, loop(gesture.action, t));
    }
    if (stop2 === "hello") {
      const [u, v] = nodePoint(stop2);
      return standingShot(u, v, loop("wave", t));
    }
    const place = room.PLACES[stop2];
    const pose = stop2 === "code" || stop2 === "work" ? loop(place.own ?? "type", t) : stop2 === "sleep" ? loop("sleep", t) : loop(place.own ?? "idle", t);
    const lift = reduced ? 0 : frame?.pose.lift ?? 0;
    return {
      station: stop2,
      place: lift ? { ...place, z: place.z + lift } : place,
      pose
    };
  }
  function standingShot(u, v, pose) {
    return {
      station: "walk",
      slot: room.slotFor("walk", u, v),
      place: { u, v, z: floorUnder(u, v) },
      pose
    };
  }
  function nearestNode(point) {
    let best = stopNode.work, gap = Infinity;
    for (const node of Object.keys(graph.nodes)) {
      const [u, v] = graph.nodes[node];
      const d = Math.hypot(u - point[0], v - point[1]);
      if (d < gap) {
        gap = d;
        best = node;
      }
    }
    return best;
  }
  function walkTo(from2, to, at2) {
    return {
      kind: "walking",
      walk: walkAlong(
        graph,
        from2,
        route(graph, nearestNode(from2), nodeFor(to))
      ),
      at: at2,
      to
    };
  }
  function advance(t) {
    if (!motion || reduced) {
      motion = { kind: "settled", stop: target };
      return;
    }
    for (let guard = 0; guard < 8; guard++) {
      const m = motion;
      if (!m) return;
      if (m.kind === "settled") {
        if (m.stop !== target)
          motion = { kind: "leaving", stop: m.stop, at: t };
        return;
      }
      if (m.kind === "leaving") {
        const done2 = (t - m.at) / turnMs;
        if (m.stop === target) {
          motion = {
            kind: "arriving",
            stop: m.stop,
            at: t - Math.max(0, 1 - done2) * turnMs
          };
          continue;
        }
        if (done2 < 1) return;
        motion = walkTo(nodePoint(m.stop), target, m.at + turnMs);
        continue;
      }
      if (m.kind === "walking") {
        const covered = (t - m.at) / 1e3 * walkingPace;
        if (m.to !== target) {
          const { point, ahead } = walkAt(m.walk, covered);
          const next = m.walk.nodes[ahead - 1] ?? nearestNode(point);
          motion = {
            kind: "walking",
            walk: walkAlong(graph, point, route(graph, next, nodeFor(target))),
            at: t,
            to: target
          };
          return;
        }
        if (covered < m.walk.length) return;
        motion = {
          kind: "arriving",
          stop: m.to,
          at: m.at + m.walk.length / walkingPace * 1e3
        };
        continue;
      }
      const done = (t - m.at) / turnMs;
      if (m.stop !== target) {
        motion = {
          kind: "leaving",
          stop: m.stop,
          at: t - Math.max(0, 1 - done) * turnMs
        };
        continue;
      }
      if (done >= 1) motion = { kind: "settled", stop: m.stop };
      return;
    }
  }
  function shots(t) {
    const m = motion ?? { kind: "settled", stop: target };
    if (m.kind === "settled") return { a: settledShot(m.stop, t), mix: 0 };
    if (m.kind === "walking") {
      const { point, ahead } = walkAt(
        m.walk,
        (t - m.at) / 1e3 * walkingPace
      );
      const next = m.walk.points.slice(ahead).find(
        ([u2, v2]) => Math.hypot(u2 - point[0], v2 - point[1]) > 1e-6
      ) ?? point;
      const from2 = room.project(point[0], point[1], 0);
      const to = room.project(next[0], next[1], 0);
      const action = walkingAnimation(
        [to[0] - from2[0], to[1] - from2[1]],
        character.anim
      );
      return { a: standingShot(point[0], point[1], loop(action, t)), mix: 0 };
    }
    const [u, v] = nodePoint(m.stop);
    let standing = standingShot(u, v, loop("idle", t));
    const done = Math.min(1, Math.max(0, (t - m.at) / turnMs));
    let settled = settledShot(m.stop, t);
    if (settled.place.lie) {
      const progress = m.kind === "leaving" ? 1 - done : done;
      const smooth = (x) => x * x * (3 - 2 * x);
      const lift = smooth(Math.min(1, progress * 4));
      const across = smooth(Math.max(0, Math.min(1, progress * 4 - 1)));
      const place = {
        u: u + (settled.place.u - u) * across,
        v: v + (settled.place.v - v) * across,
        z: standing.place.z + (settled.place.z - standing.place.z) * lift
      };
      standing = {
        ...standing,
        place,
        // Once lifted to the mattress, use its contact layers instead of
        // walking behind the complete bed and disappearing into its side.
        station: progress >= 0.25 ? "sleep" : "walk",
        slot: progress >= 0.25 ? void 0 : room.slotFor("walk", place.u, place.v)
      };
      if (progress <= 0.5) return { a: standing, mix: 0 };
      return { a: standing, b: settled, mix: (progress - 0.5) * 2 };
    }
    if (settled.place.sit) {
      const progress = m.kind === "leaving" ? 1 - done : done;
      const smooth = (x) => x * x * (3 - 2 * x);
      const lift = smooth(Math.min(1, progress * 2));
      const across = smooth(Math.max(0, progress * 2 - 1));
      const anchor2 = {
        u: u + (settled.place.u - u) * across,
        v: v + (settled.place.v - v) * across,
        z: standing.place.z + (settled.place.z - standing.place.z) * lift
      };
      standing = {
        ...standing,
        place: anchor2,
        slot: room.slotFor("walk", anchor2.u, anchor2.v)
      };
      settled = { ...settled, place: { ...settled.place, ...anchor2 } };
    }
    return m.kind === "leaving" ? { a: settled, b: standing, mix: done } : { a: standing, b: settled, mix: done };
  }
  function compose(g, look, shot, t) {
    landscapes.setActive({
      room: roomName,
      variant: look.season,
      time: look.light,
      weather: look.weather
    });
    g.save();
    try {
      room.use(look.light, look.weather, character, links);
      const { back, front } = layersFor(look, t, shot.station, shot.slot);
      g.clearRect(0, 0, zenSceneSize.width, zenSceneSize.height);
      const frame2 = landscapes.framing(roomName);
      if (frame2.separateBackground)
        g.drawImage(
          landscapes.background(
            roomName,
            look.season,
            look.light,
            look.weather
          ),
          0,
          0
        );
      g.translate(frame2.x, frame2.y);
      g.scale(frame2.scale, frame2.scale);
      g.drawImage(back, 0, 0);
      room.drawOri(g, shot.place, shot.pose);
      g.drawImage(front, 0, 0);
      room.drawOverlay?.(g, shot.station);
    } finally {
      g.restore();
      landscapes.setActive(null);
    }
  }
  function paint(g, look, t) {
    const { a, b, mix } = shots(t);
    compose(g, look, a, t);
    if (b && mix > 0) {
      compose(blend.g, look, b, t);
      g.save();
      g.globalAlpha = mix;
      g.drawImage(blend.canvas, 0, 0);
      g.restore();
    }
  }
  function currentScenery(at2) {
    const date = today();
    if (!hostWeather && localDay2(date) !== reading.day)
      reading = weatherOn(localDay2(date), southern);
    const next = {
      light: lightAt(date, nightMode),
      weather: landscapes.weatherFor(roomName, reading.weather),
      season: landscapes.seasonForWeekday((date.getDay() + 6) % 7)
    };
    if (scenery && (scenery.light !== next.light || scenery.weather !== next.weather || scenery.season !== next.season))
      fading = reduced ? void 0 : { from: scenery, at: at2 };
    if (!scenery || scenery.light !== next.light || scenery.weather !== next.weather || scenery.season !== next.season) {
      scenery = next;
      wildlifeMasks.clear();
    }
    return scenery;
  }
  function fitCanvas() {
    const css = canvas.getBoundingClientRect().width || zenSceneSize.width;
    const ratio = globalThis.devicePixelRatio || 1;
    const next = Math.max(1, Math.ceil(css * ratio / zenSceneSize.width));
    if (next === upscale && canvas.width === zenSceneSize.width * next) return;
    upscale = next;
    canvas.width = zenSceneSize.width * upscale;
    canvas.height = zenSceneSize.height * upscale;
  }
  const spotlight = createSpotlight();
  let lightAtTime;
  let tourLayers;
  let tourBoxes;
  let lightKey = "";
  let ink = "#16191d", inkAt = -Infinity;
  function anchor(t) {
    const { a, b, mix } = shots(t);
    const project = (shot) => landscapes.project(roomName, shot.place.u, shot.place.v, shot.place.z);
    const [x, y] = project(a);
    if (!b) return { x, y };
    const [bx, by] = project(b);
    return { x: x + (bx - x) * mix, y: y + (by - y) * mix };
  }
  function tourLight(t, look, at2) {
    const state = spotlight.step({
      at: anchor(t),
      on: frame?.tourStop !== void 0,
      ...frame?.tourStop && frame.tourStop !== "hello" ? { stop: frame.tourStop } : {},
      dtMs: lightAtTime === void 0 ? 0 : t - lightAtTime,
      reduced
    });
    lightAtTime = t;
    if (state.level <= 0) return state;
    tourLayers ??= { mask: sheet(), dim: sheet(), lit: sheet() };
    if (!tourBoxes) {
      const boxes = zenSpotBoxes(roomName);
      tourBoxes = new Map(
        Object.entries({
          ...boxes,
          work: boxes.desk,
          code: boxes.desk
        }).flatMap(
          ([name, box]) => box ? [
            [
              name,
              { x: box.x, y: box.y, w: box.width, h: box.height }
            ]
          ] : []
        )
      );
    }
    if (at2 - inkAt >= 250) {
      ink = options.spotlightInk?.() || ink;
      inkAt = at2;
    }
    const lights = topLights(state, tourBoxes);
    const key = ink + lights.map((l) => [l.cx, l.floorY, l.floorHalf, l.strength].join(",")).join(";");
    const { mask, dim, lit } = tourLayers;
    if (key !== lightKey) {
      const m = mask.g;
      m.clearRect(0, 0, zenSceneSize.width, zenSceneSize.height);
      m.save();
      m.filter = "blur(4px)";
      for (const l of lights) {
        const gradient = m.createLinearGradient(0, l.top, 0, l.floorY);
        const share = (y) => Math.min(1, Math.max(0, (y - l.top) / (l.floorY - l.top)));
        gradient.addColorStop(0, `rgba(0,0,0,${0.18 * l.strength})`);
        gradient.addColorStop(
          share(l.litFrom - 18),
          `rgba(0,0,0,${0.24 * l.strength})`
        );
        gradient.addColorStop(
          share(l.litFrom),
          `rgba(0,0,0,${0.9 * l.strength})`
        );
        gradient.addColorStop(1, `rgba(0,0,0,${l.strength})`);
        m.fillStyle = gradient;
        m.beginPath();
        m.moveTo(l.cx - l.topHalf, l.top);
        m.lineTo(l.cx + l.topHalf, l.top);
        m.lineTo(l.cx + l.floorHalf, l.floorY);
        m.lineTo(l.cx - l.floorHalf, l.floorY);
        m.closePath();
        m.fill();
        m.fillStyle = `rgba(0,0,0,${l.strength})`;
        m.beginPath();
        m.ellipse(
          l.cx,
          l.floorY,
          l.floorHalf,
          Math.min(20, Math.max(8, l.floorHalf * 0.3)),
          0,
          0,
          Math.PI * 2
        );
        m.fill();
      }
      m.restore();
      dim.g.clearRect(0, 0, zenSceneSize.width, zenSceneSize.height);
      dim.g.fillStyle = ink;
      dim.g.fillRect(0, 0, zenSceneSize.width, zenSceneSize.height);
      dim.g.globalCompositeOperation = "destination-out";
      dim.g.drawImage(mask.canvas, 0, 0);
      dim.g.globalCompositeOperation = "source-over";
      lightKey = key;
    }
    picture.g.save();
    picture.g.globalAlpha = (look.light === "night" ? 0.42 : 0.5) * state.level;
    picture.g.drawImage(dim.canvas, 0, 0);
    if (look.light === "night") {
      paint(lit.g, { ...look, light: "day" }, t);
      lit.g.globalCompositeOperation = "destination-in";
      lit.g.drawImage(mask.canvas, 0, 0);
      lit.g.globalCompositeOperation = "source-over";
      picture.g.globalAlpha = 0.9 * state.level;
      picture.g.drawImage(lit.canvas, 0, 0);
    }
    picture.g.restore();
    return state;
  }
  let draws = 0;
  function draw() {
    if (!drawing()) return;
    const t = now(), at2 = performance.now(), look = currentScenery(at2);
    paint(picture.g, look, t);
    if (fading) {
      const done = (at2 - fading.at) / lightFadeMs;
      if (done >= 1) fading = void 0;
      else {
        paint(fade2.g, fading.from, t);
        fade2.g.save();
        fade2.g.globalAlpha = done;
        fade2.g.drawImage(picture.canvas, 0, 0);
        fade2.g.restore();
        picture.g.clearRect(0, 0, zenSceneSize.width, zenSceneSize.height);
        picture.g.drawImage(fade2.canvas, 0, 0);
      }
    }
    const light = tourLight(t, look, at2);
    const { story: detail, elapsedMs: environmentElapsed } = environmentTimeline(today(), t);
    const encounter = environment ? drawEnvironmentStory(picture.g, detail, environment, {
      night: look.light === "night",
      elapsedMs: environmentElapsed,
      reduced,
      actor(world, paintAnimal) {
        wildlife ??= sheet();
        const g = wildlife.g;
        g.clearRect(0, 0, zenSceneSize.width, zenSceneSize.height);
        paintAnimal(g);
        const slot2 = room.slotFor("walk", world[0], world[1]);
        let mask = wildlifeMasks.get(slot2);
        if (!mask) {
          landscapes.setActive({
            room: roomName,
            variant: look.season,
            time: look.light,
            weather: look.weather
          });
          try {
            room.use(look.light, look.weather, character, links);
            mask = room.layers("walk", slot2, reduced ? 0 : t / 1e3).front;
          } finally {
            landscapes.setActive(null);
          }
          wildlifeMasks.set(slot2, mask);
          if (wildlifeMasks.size > 4) {
            const oldest = wildlifeMasks.keys().next().value;
            if (oldest !== void 0) wildlifeMasks.delete(oldest);
          }
        }
        g.save();
        g.globalCompositeOperation = "destination-out";
        const framing = landscapes.framing(roomName);
        g.translate(framing.x, framing.y);
        g.scale(framing.scale, framing.scale);
        g.drawImage(mask, 0, 0);
        const ori2 = shots(t).a;
        if (ori2.place.u + ori2.place.v > world[0] + world[1])
          room.drawOri(g, ori2.place, ori2.pose);
        g.restore();
        picture.g.drawImage(wildlife.canvas, 0, 0);
      }
    }) : void 0;
    canvas.dataset.dailyDetail = encounter ? detail.id : "";
    canvas.dataset.environmentSupports = JSON.stringify(
      encounter?.supports ?? []
    );
    canvas.dataset.environmentAnimal = encounter?.animal?.join(",") ?? "";
    canvas.dataset.dailyDetailDay = localDay2(today());
    fitCanvas();
    view.imageSmoothingEnabled = false;
    view.clearRect(0, 0, canvas.width, canvas.height);
    view.drawImage(picture.canvas, 0, 0, canvas.width, canvas.height);
    canvas.dataset.tour = frame?.tourStop ?? "";
    canvas.dataset.spotlight = light.level > 0 ? light.level.toFixed(2) : "0";
    canvas.dataset.spotlightPlaces = Object.entries(light.places).filter(([, level]) => level >= 0.5).map(([place]) => place).join(" ");
    const point = anchor(t);
    const actor = `${Math.round(point.x)},${Math.round(point.y)}`;
    if (canvas.dataset.actor !== actor) canvas.dataset.actorAt = String(at2);
    canvas.dataset.actor = actor;
    canvas.dataset.pose = shots(t).a.pose;
    canvas.dataset.room = roomName;
    canvas.dataset.look = options.look ?? "kokeshi";
    canvas.dataset.draws = String(++draws);
    canvas.dataset.stage = frame?.pose.stage ?? "";
    canvas.dataset.motion = motion?.kind ?? "";
    canvas.dataset.station = frame?.activeStation ?? "";
    canvas.dataset.availability = frame?.availability ?? "";
    canvas.dataset.pendingUserCount = String(frame?.pendingUserCount ?? 0);
  }
  function step() {
    const t = now();
    frame = director.frameAt(t);
    const night = lightAt(today(), nightMode) === "night";
    let next = frame.tourStop === "hello" ? "hello" : zenStop(
      frame.activeStation ?? frame.heading ?? frame.pose.station,
      frame.pose.asset === "actor-sleep",
      night
    );
    const action = clipOf(frame.pose.frame)?.name;
    const gesture = action === "alert" ? "attention" : action === "cheer" || action === "think" || action === "wave" ? action : void 0;
    if (next && next !== "hello" && frame.pose.asset !== "actor-sleep" && gesture && character.anim[gesture]?.length)
      next = `gesture:${next}:${gesture}`;
    if (next) target = next;
    advance(t);
    emit();
  }
  function emit() {
    if (!frame) return;
    const next = {
      station: frame.activeStation,
      focusActivityId: frame.focusActivityId,
      availability: frame.availability
    };
    if (emitted && emitted.station === next.station && emitted.focusActivityId === next.focusActivityId && emitted.availability === next.availability)
      return;
    emitted = next;
    options.onFrame?.(next);
  }
  function drawing() {
    return !disposed && !failed && assetsReady && visible && !paused && sized && document.visibilityState !== "hidden";
  }
  const animating = () => drawing() && !reduced;
  function tick(at2) {
    raf = 0;
    if (animating() && budget.due(at2))
      safely(() => {
        step();
        draw();
      });
    if (animating()) raf = requestAnimationFrame(tick);
  }
  function stop() {
    clock = now();
    clockFrom = void 0;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (poll !== void 0) clearInterval(poll);
    poll = void 0;
  }
  function schedule() {
    stop();
    if (!drawing()) return;
    budget.reset(performance.now());
    safely(() => {
      step();
      draw();
    });
    if (animating()) {
      clockFrom = performance.now();
      raf = requestAnimationFrame(tick);
    } else
      poll = setInterval(
        () => safely(() => {
          clock += stillPollMs;
          step();
          draw();
        }),
        stillPollMs
      );
  }
  function redraw() {
    if (drawing() && !animating()) safely(draw);
  }
  const unwatch = options.source.watch((state) => {
    director.accept(state, now());
  });
  const resize = new ResizeObserver((entries) => {
    const box = entries.at(-1)?.contentRect;
    const next = box ? hasSize(box) : sized;
    if (next !== sized) {
      sized = next;
      schedule();
    } else redraw();
  });
  resize.observe(canvas);
  const onVisibility = () => schedule();
  document.addEventListener("visibilitychange", onVisibility);
  const onMotion = () => {
    reduced = !!motionQuery?.matches;
    schedule();
  };
  motionQuery?.addEventListener("change", onMotion);
  if (loadAssets)
    safely(() => {
      void loadAssets().then(() => {
        if (disposed || failed) return;
        assetsReady = true;
        schedule();
      }, fail);
    });
  schedule();
  return {
    setVisible(next) {
      if (next === visible || disposed) return;
      visible = next;
      schedule();
    },
    setPaused(next) {
      paused = next;
      schedule();
    },
    setNight(next) {
      nightMode = next;
      redraw();
    },
    setFocus: () => void 0,
    point: () => void 0,
    poke: () => void 0,
    setTour(next) {
      if (disposed || failed || !director.tour) return;
      safely(() => director.tour?.(next, now()));
      redraw();
    },
    setWeather(next) {
      hostWeather = next !== void 0;
      reading = next ?? weatherOn(localDay2(today()), southern);
      redraw();
    },
    setLinks(next) {
      if (next.claude === links.claude && next.slack === links.slack) return;
      links = next;
      redraw();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      unwatch();
      resize.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      motionQuery?.removeEventListener("change", onMotion);
      layers.clear();
      wildlifeMasks.clear();
      wildlife = void 0;
      tourLayers = void 0;
      tourBoxes = void 0;
      landscapes.clear();
    }
  };
}
function zenSpotBoxes(name = "zen") {
  const kit = createZenKit(), room = roomIn(kit, name);
  const box = (u0, v0, z0, u1, v1, z1) => {
    const xs = [], ys = [];
    for (const u of [u0, u1])
      for (const v of [v0, v1])
        for (const z of [z0, z1]) {
          const [x2, y2] = kit.landscapes.project(name, u, v, z);
          xs.push(x2);
          ys.push(y2);
        }
    const x = Math.floor(Math.min(...xs)), y = Math.floor(Math.min(...ys));
    return {
      x,
      y,
      width: Math.ceil(Math.max(...xs)) - x,
      height: Math.ceil(Math.max(...ys)) - y
    };
  };
  const boxes = {};
  for (const [spot, [u0, v0, z0, u1, v1, z1]] of Object.entries(room.SPOTS))
    boxes[spot] = box(u0, v0, z0, u1, v1, z1);
  return boxes;
}
function roomIn(kit, name) {
  const entry = kit.rooms.find((candidate) => candidate.key === name);
  if (!entry) throw new Error(`No room ${name} on the board`);
  return entry.room;
}
function hasSize(box) {
  return box.width > 0 && box.height > 0;
}

function inspectPixelCatalog() {
  const kit = createZenKit();
  return { rooms: kit.rooms.map((room) => room.key), characters: kit.characters.map((character) => character.key), turns: Object.keys(kit.turns) };
}
export {
  createDirector,
  inspectPixelCatalog,
  mountZenOffice as mountPixelStage,
  zenLooks as pixelCharacters,
  zenRooms as pixelRooms
};
