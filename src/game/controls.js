// =====================================================================
//  CONTROLS — the story text talks about keys ("press J"). On a phone
//  there are no keys, so forDevice() rewrites those hints to name the
//  on-screen buttons instead ("tap 💬 TALK"). On a computer the text
//  is left exactly as written.
// =====================================================================

export function isTouch() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(hover: none) and (pointer: coarse)").matches;
}

const tap = (p) => (p === "P" ? "Tap" : "tap");

const TOUCH_RULES = [
  [/Arrows \/ WASD — walk/g, "🕹️ Joystick — walk"],
  [/the ARROW KEYS or WASD/g, "the JOYSTICK 🕹️"],
  [/^J — /gm, "💬 TALK — "],
  [/^K — /gm, "✨ ZAP — "],
  [/^L — /gm, "📜 button — "],
  [/\b([Pp])ress J\b/g, (_, p) => `${tap(p)} 💬 TALK`],
  [/\bwith J\b/g, "with 💬 TALK"],
  [/\b([Pp])ress K\b/g, (_, p) => `${tap(p)} ✨ ZAP`],
  [/\bwith K\b/g, "with ✨ ZAP"],
  [/\(press L\)/g, "(tap 📜)"],
  [/\(L\)/g, "(📜)"],
  [/\bwith L\b/g, "with the 📜 button"],
  [/\b([Pp])ress 1, 2 or 3\b/g, (_, p) => `${tap(p)} 1, 2 or 3`],
];

export function forDevice(text) {
  if (!text || !isTouch()) return text;
  return TOUCH_RULES.reduce((t, [pattern, to]) => t.replace(pattern, to), text);
}
