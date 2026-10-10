// =====================================================================
//  RUNE OF LOGIC — the world (Chapter 1: The Encapsulated Kingdom)
// ---------------------------------------------------------------------
//  Every map, character, item and quest lives here as data + small
//  "scripts". The engine (engine.js) only knows how to walk, draw and
//  collide — all the story and teaching is in this file.
//
//  TILE LEGEND (each map is 20 columns x 14 rows):
//    .  grass        ,  dirt path     f  flowers      s  sand
//    T  tree*        ~  water*        b  bridge       r  rock*
//    H  house*       W  wall*         _  stone floor  $  gold pile
//   town tiles:
//    p  pavement     ^  stairs        R  roof*        B  building wall*
//    D  door*        o  barrel*       g  planter*
//    (* = solid, you can't walk through it)
//
//  ENTITY KINDS:
//    npc    someone to talk to (face them, press J)  -> onUse
//    obj    a thing to use (signs, terminals, ...)   -> onUse / onBump
//    item   picked up by walking over it             -> onPick
//    bug    an enemy. Touch it (or zap it) to start a turn-based battle
//    board  a lesson notice board 📋 (text lives in lessons.js)
//    warp   stepping on it moves you to another map
//    gate   a door that is solid until a quest opens it
//
//  A SCRIPT is an async function that receives `api`:
//    await api.say(who, text, code?)            show a dialogue line
//    await api.choose(who, text, options, code?) -> index picked
//    await api.error(who, compilerError, why)    show a red compile error
//    api.s                                       the saved game state
//    api.log(text, kind)  api.toast(text)  api.scroll(id)  api.flag(name)
// =====================================================================

import { SCROLLS } from "./scrolls.js";
import { ENEMIES } from "./battle.js";
import { LESSONS } from "./lessons.js";
import { EXAM } from "./exam.js";
import { QUESTIONS, CLUE_STONES } from "./questions.js";

// ---------------------------------------------------------------------
//  Small factories so the maps below stay readable.
// ---------------------------------------------------------------------
const frag = (id, x, y, value) => ({
  id, kind: "item", x, y, emoji: "✦", label: value, color: "#f4c95d",
  visible: (s) => !s.flags["got:" + id],
  onPick: (api) => {
    api.s.fragments.push(value);
    api.log(`hero.pickUp("${value}");`, "cmd");
    api.toast(`Method fragment: ${value}`);
  },
});

// An enemy on the map. `enemy` is a key in ENEMIES (battle.js): it sets the
// name, stats and which questions it asks in battle.
const bug = (id, x, y, opts = {}) => ({
  id, kind: "bug", x, y, solid: true,
  enemy: opts.enemy ?? "bug",
  roam: opts.roam ?? true,
  emoji: ENEMIES[opts.enemy ?? "bug"].emoji,
  sprite: ENEMIES[opts.enemy ?? "bug"].sprite,
  persist: !!opts.persist, // persistent enemies stay dead forever
  visible: opts.visible ?? (opts.persist ? (s) => !s.flags["dead:" + id] : undefined),
  requires: opts.requires,
  onBump: opts.onBump,
});

// A lesson board. Reading every page saves the lesson to your Journal.
const board = (id, x, y) => ({
  id: "board_" + id, kind: "board", x, y, solid: true,
  unread: (s) => !s.flags["read:" + id],
  onUse: async (api) => {
    const L = LESSONS[id];
    api.log(`// reading: ${L.title}`, "out");
    for (let i = 0; i < L.pages.length; i++) {
      const p = L.pages[i];
      await api.say(`📋 ${L.title}   (${i + 1}/${L.pages.length})`, p.text, p.code);
    }
    if (!api.s.flags["read:" + id]) {
      api.s.flags["read:" + id] = true;
      api.toast("📋 Lesson saved to your Journal (L)");
    }
  },
});

// A Clue Stone 🪨: a hint for the area's hardest battle question. Its spot
// and the question both live in questions.js (CLUE_STONES / `hard: true`).
const clueStone = (topic) => {
  const spot = CLUE_STONES[topic];
  const q = QUESTIONS[topic].find((x) => x.hard);
  return {
    id: "clue_" + topic, kind: "obj", x: spot.x, y: spot.y, emoji: "🪨", solid: true,
    tag: (s) => (s.flags["clue:" + topic] ? "clue read" : "CLUE"),
    onUse: async (api) => {
      api.log(`// reading the Clue Stone of ${spot.area}`, "out");
      await api.say("🪨 Clue Stone", `Words are carved into the stone — the answer to the hardest riddle of ${spot.area}:\n\n${q.prompt}`, q.code);
      await api.say("🪨 Clue Stone", `💡 ${q.clue}`);
      if (!api.s.flags["clue:" + topic]) {
        api.flag("clue:" + topic);
        api.toast("💡 Clue learned! It will show up in battle too.");
      }
    },
  };
};

// A warp can be locked: `when(s)` must be true to pass, otherwise `onBlocked` runs.
const warp = (x, y, to, tx, ty, lock = {}) => ({ kind: "warp", x, y, to, tx, ty, ...lock });

// ---------------------------------------------------------------------
//  THE KEEPER'S TRIAL — every Keeper follows the same pattern:
//    1. TEACH  the idea (dialogue + code)
//    2. QUEST  you do it with your own hands in the world
//    3. TRIAL  you come back and answer their quiz
//  In each question, options[0] is the correct answer (they get shuffled
//  on screen). A wrong answer is explained, then asked again later.
// ---------------------------------------------------------------------
function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function trial(api, who, key, questions, opts = {}) {
  const { s } = api;
  // The Keeper's own questions in RANDOM order, then one random
  // 1Z0-808 exam-style question on the same topic as the final test.
  const examCount = opts.exams ?? 1;
  const exams = shuffle(EXAM[key]).slice(0, examCount);
  const all = [...shuffle(questions), ...exams];
  const total = all.length;
  const tail = examCount === 1 ? "The last one is" : `The last ${examCount} are`;
  await api.say(who, `📝 KEEPER'S TRIAL — ${total} questions. ${tail} exam-style (Java SE 8, 1Z0-808).\n\nIf you get one wrong, I'll explain why and ask it again later. Answer right on the first try to earn coins.`);
  const queue = all.map((q, i) => ({ ...q, i }));
  const missed = new Set();
  let passed = 0;
  while (queue.length) {
    const q = queue.shift();
    const order = shuffle(q.options.map((_, i) => i));
    const title = `${who} · Trial ${passed + 1}/${total}${q.exam ? "  🎓 EXAM-STYLE" : ""}`;
    const pick = await api.choose(title, q.prompt, order.map((i) => q.options[i]), q.code);
    if (order[pick] === 0) {
      passed++;
      api.log(`trial ${passed}/${total}: correct`, "ok");
      await api.say(who, `✅ Correct!\n\n${q.why}`);
    } else {
      missed.add(q.i);
      queue.push(q);
      s.stats.wrong = (s.stats.wrong || 0) + 1;
      api.log(`trial: wrong — "${q.options[order[pick]]}"`, "err");
      await api.say(who, `❌ Not quite. You picked: ${q.options[order[pick]]}\n\n${q.why}\n\n(I'll ask this one again.)`, undefined, "error");
    }
  }
  const perfect = total - missed.size;
  const reward = perfect * 2;
  s.coins += reward;
  s.flags["trial:" + (opts.flag ?? key)] = true;
  api.log(`TRIAL PASSED (${perfect}/${total} first try, +${reward} coins)`, "ok");
  await api.say(who, `🏅 TRIAL PASSED!\n\nFirst-try answers: ${perfect}/${total}  →  +${reward} 🪙`);
}

export function sealedCount(s) {
  return [1, 2, 3, 4].filter((n) => s.flags["leak" + n]).length;
}

// =====================================================================
//  1. METHOD VILLAGE — build your first method (the zap spell)
// =====================================================================
const ZAP_ORDER = ["public", "int", "zap", "(int power)", "{ return power * 2; }"];
const ZAP_CODE = "public int zap(int power) {\n    return power * 2;\n}";

function checkZap(order) {
  const code = order.join(" ");
  if (order.length < 5) {
    return {
      msg: `🗿 The stone rejects it: only ${order.length} of 5 parts\n    ${code}`,
      why: "This spell needs all five parts: modifier, return type, name, (parameters), { body }. (In real Java the modifier is optional, but the return type, name, ( ) and { } are always required.)",
    };
  }
  if (order.includes("void")) {
    return {
      msg: "Hero.java:13: error: incompatible types: unexpected return value\n        return power * 2;\n                     ^",
      why: "'void' promises the method returns NOTHING — but the body says 'return power * 2;'. The method breaks its own promise. 'void' was the liar. The return type should be 'int'.",
    };
  }
  const names = [
    "the access modifier (public)",
    "the return type (int)",
    "the method name (zap)",
    "the parameters (int power)",
    "the body { ... }",
  ];
  for (let i = 0; i < 5; i++) {
    if (order[i] !== ZAP_ORDER[i]) {
      return {
        msg: `Hero.java:12: error: <identifier> expected\n    ${code}\n    ^`,
        why: `Slot ${i + 1} should be ${names[i]}. Java expects a method in this order: modifier(s) → return type → name → (parameters) → { body }.`,
      };
    }
  }
  return null;
}

async function tamsin(api) {
  const { s } = api;
  const who = "👵 Old Tamsin";
  api.log("tamsin.talk();", "cmd");
  if (!s.flags.metTamsin) {
    await api.say(who, "So. The Rune of Logic chose a village apprentice. Hmph. Then you'd better learn what a METHOD is, child.");
    await api.say(who, "A method is a named block of instructions. Look at its shape:", "public int add(int a, int b) {\n    return a + b;\n}");
    await api.say(who, "'public' is the access modifier.\n'int' is the RETURN TYPE — what the method hands back.\n'add' is its NAME.\n'(int a, int b)' are its PARAMETERS.\nThe body lives between the { braces }.");
    await api.say(who, "A method that promises 'int' MUST return an int. A method that says 'void' returns nothing at all. Break that promise and the compiler refuses you.");
    await api.say(who, "Now listen. The bridge east is held by two NULL KNIGHTS, cursed guards who answer to the Leaky Class. You need a SPELL — and in this kingdom, a spell is just a method.");
    await api.say(who, "📜 YOUR QUEST: my zap spell blew apart in last night's storm. Six glowing fragments ✦ are scattered around the village. Five belong to the spell. One of them is a liar.");
    await api.say(who, "Walk over them to pick them up, then bring them to the Compiler Stone 🗿 just east of here. Put them in order:\n\nmodifier → return type → name → (parameters) → { body }\n\nThen use your spell to clear the bridge, and come back to me for your trial.");
    api.flag("metTamsin");
    return;
  }
  if (!s.learned.zap) {
    const n = s.fragments.length;
    await api.say(who, n === 0
      ? "Fragments ✦ glow on the grass. Walk over them to pick them up. Six in all."
      : `You've found ${n} of 6 fragments. Remember: one is a liar. A method whose body says 'return power * 2;' can't promise to return nothing...`);
    return;
  }
  if (!(s.flags["dead:bb1"] && s.flags["dead:bb2"])) {
    await api.say(who, "Well? Walk up to the Null Knights on the bridge (or zap them with K for a first strike) to battle them.\n\nIn battle, every attack is a question. Answer right and you hit. Read the notice boards 📋 first if you're unsure!\n\nCome back when the bridge is clear.");
    return;
  }
  if (!s.flags["trial:methods"]) {
    await api.say(who, "Hmph. You built a method AND used it. Not bad for a village brat.\n\nBut building isn't understanding. Before you cross that bridge, you face my trial.");
    await trial(api, who, "methods", [...METHOD_TRIAL, ...shuffle(PARAM_TRIAL).slice(0, 2)]);
    api.scroll("methods");
    api.scroll("params");
    s.learned.args = true;
    api.log("Hero can now pass arguments: zap(1), zap(2), zap(3)", "ok");
    await api.say(who, "Take these scrolls: the rules of methods and of parameters. Read them any time with L.");
    await api.say("✨ Upgrade", "Press 1, 2 or 3 to choose the ARGUMENT you pass to zap().\n\nIn battle, ✨ Magic casts zap(N): a bigger argument hits harder but costs more MP (N × 2). Same method, different argument, different result.");
    await api.say(who, "Now go. Brannoc the Smith works his forge in the Private Wilds, past the bridge. He'll teach you to PROTECT your code. Watch for cobras.");
    return;
  }
  await api.say(who, "Off you go. Brannoc the Smith works his forge in the Private Wilds, past the bridge.");
}

// Parameters are taught in Method Village too, so Tamsin's trial mixes these in.
const PARAM_TRIAL = [
  {
    prompt: "What does this print?",
    code: "static void doubleIt(int x) {\n    x = x * 2;\n}\n\nint coins = 5;\ndoubleIt(coins);\nSystem.out.println(coins);",
    options: ["5", "10", "0", "It doesn't compile"],
    why: "Java passed a COPY of coins into x. Doubling x changes only the copy, so coins is still 5. Pass-by-value — just like your pockets.",
  },
  {
    prompt: "In the call  add(3, 4)  — what are 3 and 4?",
    code: "static int add(int a, int b) {\n    return a + b;\n}\n\nadd(3, 4);",
    options: ["Arguments", "Parameters", "Return types", "Fields"],
    why: "a and b are the PARAMETERS (slots in the definition). 3 and 4 are the ARGUMENTS (real values you pass when you call it).",
  },
  {
    prompt: "Which call compiles?",
    code: "static void open(int code, String word) { ... }",
    options: ['open(7, "oak");', 'open("oak", 7);', "open(7);", 'open(7.5, "oak");'],
    why: "Arguments must match the parameters in NUMBER, TYPE and ORDER: first an int, then a String. 7.5 is a double, so it can't go in an int slot.",
  },
  {
    prompt: "What does this print?",
    code: 'static void addGem(ArrayList<String> bag) {\n    bag.add("gem");\n}\n\nArrayList<String> bag = new ArrayList<>();\nbag.add("bread");\naddGem(bag);\nSystem.out.println(bag);',
    options: ["[bread, gem]", "[bread]", "[gem]", "[]"],
    why: "The method got a copy of the REFERENCE — an address pointing at the same list. bag.add() changed that one shared list, so the caller sees the gem.",
  },
];

const METHOD_TRIAL = [
  {
    prompt: "What is the RETURN TYPE of this method?",
    code: "public double area(double r) {\n    return 3.14 * r * r;\n}",
    options: ["double", "area", "public", "(double r)"],
    why: "The return type sits right before the name. 'public' is the access modifier, 'area' is the name, '(double r)' is the parameter list.",
  },
  {
    prompt: "What does this print?",
    code: "static int twice(int n) {\n    return n * 2;\n}\n\nSystem.out.println(twice(4) + 1);",
    options: ["9", "8", "5", "41"],
    why: "twice(4) RETURNS 8. That returned value is used right where the call was, so it becomes 8 + 1 = 9.",
  },
  {
    prompt: "Why does this NOT compile?",
    code: "public void hello() {\n    return 5;\n}",
    options: [
      "void means it returns nothing, but it tries to return 5",
      "Methods named hello are reserved",
      "It needs a parameter",
      "return must be the first line",
    ],
    why: "'void' promises to return NOTHING. 'return 5;' breaks that promise — exactly the liar fragment from the Compiler Stone.",
  },
];

async function compilerStone(api) {
  const { s } = api;
  const who = "🗿 Compiler Stone";
  if (s.learned.zap) {
    await api.say(who, "BUILD SUCCESSFUL. Your zap() method lives in Hero.java now.", ZAP_CODE);
    return;
  }
  if (!s.flags.metTamsin) {
    await api.say(who, "The stone hums: \"javac is waiting...\"\n\nMaybe Old Tamsin knows what it wants.");
    return;
  }
  if (s.fragments.length < 5) {
    await api.say(who, `The stone hums. You carry ${s.fragments.length} fragment(s). A method needs 5 parts: modifier, return type, name, (parameters), { body }. Keep looking.`);
    return;
  }
  for (;;) {
    const order = await api.assemble({
      title: "Compiler Stone — build the zap method",
      hint: "modifier → return type → name → (parameters) → { body }",
      pieces: [...s.fragments],
      slots: 5,
    });
    if (!order) return;
    api.log("javac Hero.java", "cmd");
    const err = checkZap(order);
    if (!err) break;
    await api.error(who, err.msg, err.why);
    const again = await api.choose(who, "The stone cools. Try again?", ["Rearrange the fragments", "Walk away"]);
    if (again !== 0) return;
  }
  s.learned.zap = true;
  s.fragments = [];
  api.log("BUILD SUCCESSFUL — method Hero.zap(int) added", "ok");
  await api.say(who, "BUILD SUCCESSFUL.\n\nThe fragments fuse into light and sink into your hand.", ZAP_CODE);
  await api.say("✨ New ability", "Press K to cast zap(1) at an enemy for a FIRST STRIKE before battle.\n\nIn battle, ✨ Magic casts zap() too. The method RETURNS power * 2 — that returned number becomes the damage.\n\nLook at your Hero.java panel: the method is now part of YOU.\n\nNow defeat the two Null Knights guarding the bridge, then report back to Old Tamsin.");
}

async function mochi(api) {
  const who = "🐈 Mochi the cat";
  const i = await api.choose(who, "A fluffy cat. It looks suspiciously like an object with methods.",
    ["mochi.meow()", "mochi.pet()", "Leave"],
    "public String meow() { return \"meow\"; }\npublic void   pet()  { purr(); }");
  if (i === 0) {
    api.log('mochi.meow();  // returned "meow"', "cmd");
    await api.say(who, "\"meow\"\n\nmeow() RETURNS a String. You can catch what it returns in a variable:", 'String sound = mochi.meow();   // sound is now "meow"');
  } else if (i === 1) {
    api.log("mochi.pet();  // void: returns nothing", "cmd");
    await api.say(who, "Prrrrrr...\n\npet() is VOID. It DOES something (purring) but hands nothing back. So this would NOT compile:",
      "String x = mochi.pet();\n// error: incompatible types: void cannot be converted to String");
  }
}

const village = {
  name: "Method Village",
  theme: "grass",
  tiles: [
    "RRRRRRRRRBBDBBB~~RRR",
    "RRRRRRRRRpppppp~~BDB",
    "BBBBDBBBBpppppp~~ppB",
    "gpopppppppppppp~~opB",
    "gppppppppppppgp~~ppB",
    "gppppppppppppppbbppp",
    "gpppppppppppRRR~~ppB",
    "gppppppRRRRpRRR~~goB",
    "gppppppRRRRpBDB~~ppB",
    "gRRRpppBDBBpopp~~ppB",
    "gBDBppppppppppp~~ppB",
    "gpppppppp^^pppo~~ogB",
    "gpppogpppppppgp~~ppB",
    "ggggggggggggggg~~ggg",
  ],
  spawn: { x: 6, y: 6 },
  entities: () => [
    { id: "tamsin", kind: "npc", x: 6, y: 3, emoji: "👵", body: "granny", name: "Old Tamsin", heals: true, solid: true, onUse: tamsin },
    { id: "stone", kind: "obj", x: 12, y: 4, emoji: "🗿", solid: true, onUse: compilerStone },
    { id: "mochi", kind: "npc", x: 5, y: 8, emoji: "🐈", solid: true, onUse: mochi },
    {
      id: "sign", kind: "obj", x: 8, y: 6, emoji: "🪧", solid: true,
      onUse: (api) => api.say("🪧 Signpost",
        "WELCOME TO METHOD VILLAGE\n\nArrows / WASD — walk\nJ — talk / use (face it first)\nK — cast a spell (once you know one)\nL — Journal (quests, lessons, scrolls)\n\n📋 Read the NOTICE BOARDS around town — they teach you.\n⚔️ Enemies ask Java questions in battle. Answer right to hit!\n\nThe Hero.java panel shows YOU as a Java object. Watch it change."),
    },
    board("m1", 3, 3),
    board("m2", 10, 2),
    board("m3", 5, 10),
    board("p1", 9, 4),
    board("p2", 6, 12),
    board("p3", 12, 10),
    clueStone("params"),
    clueStone("methods"),
    bug("beetle", 9, 12, { enemy: "beetle", visible: (s) => s.learned.zap }),
    frag("f_public", 2, 12, "public"),
    frag("f_int", 13, 1, "int"),
    frag("f_void", 7, 11, "void"),
    frag("f_zap", 11, 9, "zap"),
    frag("f_params", 1, 7, "(int power)"),
    frag("f_body", 13, 11, "{ return power * 2; }"),
    ...["bb1", "bb2"].map((id, i) => bug(id, 15 + i, 5, {
      roam: false, persist: true, enemy: "knight",
      requires: (s) => s.learned.zap,
      onBump: async (api) => {
        if (!api.s.learned.zap) {
          await api.say("⚔️ Null Knight", "The knight lowers his longsword across the bridge. Behind the visor, two cold lights flicker.\n\n\"None shall pass... without a METHOD.\"\n\nYou'll need a spell first. (Talk to Old Tamsin.)");
        }
      },
    })),
    warp(19, 5, "plains", 1, 5, {
      when: (s) => !!s.flags["trial:methods"],
      onBlocked: (api) => api.say("👵 Old Tamsin (shouting)", "OI! Not so fast! You haven't taken my trial yet. Come back here!"),
    }),
  ],
  onEnter: async (api) => {
    if (api.s.flags.intro) return;
    api.flag("intro");
    await api.say("📖 The Land of Codex", "You are Rook, an apprentice in the land of Codex.\n\nLast night a monster called THE LEAKY CLASS broke loose. Its public fields spilled Bugs across the kingdom.");
    await api.say("📖 The Land of Codex", "This morning your hand began to glow with the Rune of Logic. In Codex, that means one thing: you can write code — and code is magic.");
    await api.say("📖 The Land of Codex", "Old Tamsin 👵 is waiting near the house to the north.\n\nWalk with the ARROW KEYS or WASD. Face her and press J.");
  },
};

// =====================================================================
//  2. THE PRIVATE WILDS — encapsulation basics with Brannoc the Smith
//     (the map id stays "plains" so old saves and warps keep working)
// =====================================================================

// The Forge class, as far as the player has rewritten it.
const forgeCode = (s) => `public class Forge {
    ${s.flags.forge1 ? "private int heat;             // ✔ hidden" : "public int heat;              // ✘ anyone can touch this"}
${s.flags.forge2 ? `
    public int getHeat() {            // ✔ read access
        return heat;
    }
` : "\n    // getter: ???\n"}${s.flags.forge3 ? `
    public void setHeat(int heat) {   // ✔ guarded write access
        if (heat < 0 || heat > 1500) return;
        this.heat = heat;
    }
` : "\n    // setter: ???\n"}}`;

const runesDone = (s) => [1, 2, 3].filter((n) => s.flags["forge" + n]).length;

async function brannoc(api) {
  const { s } = api;
  const who = "⚒️ Brannoc the Smith";
  api.log("brannoc.talk();", "cmd");
  if (!s.flags.metBrannoc) {
    await api.say(who, "*CLANG* ... *CLANG* ...\n\nHm. Tamsin's apprentice. You've got the look of someone who just learned methods and thinks that makes them dangerous.");
    await api.say(who, "Let me tell you what happened to my forge. This is how it was built:", "public class Forge {\n    public int heat;\n}");
    await api.say(who, "Last night a cobra slid out of the river and set  forge.heat = -40.  Froze it solid.\n\nAn hour later some bandit cranked it to 99999 and cracked my anvil.\n\nNobody broke in. Nobody had to. The field was PUBLIC.");
    await api.say(who, "That's the law of the Wilds: ENCAPSULATION.\n\nHide your data. Make everyone go through methods YOU control. A field nobody can touch is a field nobody can break.");
    await api.say(who, "I've nailed everything I know to boards around these woods 📋. Eight of them. One is on the island past the stepping stones, if you've got the nerve.\n\nRead them. The cobras out there will test you on every word.");
    await api.say(who, "📜 YOUR QUEST: my forge's blueprint is carved into three Forge Runes 🔶 hidden in the Wilds. Rewrite the Forge class at each one:\n\n1. The Field Rune: hide the heat\n2. The Getter Rune: let people READ it\n3. The Setter Rune: let people CHANGE it, safely\n\nFix all three and my fire comes back. Then you face my trial.", forgeCode(s));
    api.flag("metBrannoc");
    return;
  }
  if (runesDone(s) < 3) {
    await api.say(who, `${runesDone(s)} of 3 runes rewritten. Here's the Forge so far:`, forgeCode(s));
    await api.say(who, "Stuck? The boards 📋 explain every step. And watch the cobras: they bite.");
    return;
  }
  if (!s.flags.forgeLit) {
    s.flags.forgeLit = true;
    s.atkBonus = 2;
    api.log("forge.setHeat(1200);   // accepted", "cmd");
    api.log("forge.setHeat(-40);    // REJECTED by the guard", "err");
    await api.say(who, "Let's test it.\n\nforge.setHeat(1200);  ... accepted.\nforge.setHeat(-40);   ... REJECTED.\nforge.heat = 99999;   ... won't even compile.\n\n*WHOOSH* — the forge roars back to life!", forgeCode(s));
    await api.say("⚔️ New weapon", "Brannoc hammers out a blade on the anvil and hands it to you, still glowing.\n\nENCAPSULATED BLADE: your Attack is now +2.\n\n\"A good blade is like a good class. Nobody gets inside it without your say-so.\"");
  }
  if (!s.flags["trial:forge"]) {
    await api.say(who, "Now. A smith tests every blade before it leaves the forge. You get the same treatment.\n\nThe easy ones first. The last two are the kind of questions Oracle puts on the real exam.");
    await trial(api, who, "encap", FORGE_TRIAL, { flag: "forge", exams: 2 });
    api.scroll("forge");
    await api.say(who, "Here: the Smith's Code. Keep it with your scrolls (L).\n\nThe gate east is open now. Sage Orrin lives in the Static Spire beyond. Strange old man. Never leaves his tower. You'll see why.");
    return;
  }
  await api.say(who, "Gate's open. Sage Orrin is up in the Static Spire. Mind the cobras on the way out.");
}

const FORGE_TRIAL = [
  {
    prompt: "Which keyword makes a field visible ONLY inside its own class?",
    code: "public class Forge {\n    ???? int heat;\n}",
    options: ["private", "public", "protected", "static"],
    why: "private: only code inside Forge can touch heat. Everyone else has to use the methods you provide.",
  },
  {
    prompt: "Which is a correct getter for this field?",
    code: "private double price;",
    options: [
      "public double getPrice() { return price; }",
      "public void getPrice() { return price; }",
      "public double getPrice(double price) { return price; }",
      "private double getPrice() { return price; }",
    ],
    why: "A getter is public, returns the field's type, takes no parameters, and returns the FIELD. The third one returns its own argument, not the field.",
  },
  {
    prompt: "After p.setScore(50), what does p.getScore() return?",
    code: "private int score;\n\npublic void setScore(int score) {\n    score = score;\n}\npublic int getScore() { return score; }",
    options: ["0", "50", "Compilation fails", "null"],
    why: "The parameter shadows the field, so score = score copies the parameter onto itself. The field keeps its default, 0. Fix: this.score = score;",
  },
  {
    prompt: "Which setter keeps heat between 0 and 1500?",
    code: "private int heat;",
    options: [
      "if (h < 0 || h > 1500) return;\nheat = h;",
      "if (h > 0 && h < 1500) return;\nheat = h;",
      "heat = h;\nif (h < 0) return;",
      "heat = Math.abs(h);",
    ],
    why: "Check FIRST, then assign. The second one rejects every GOOD value; the third assigns before checking; the fourth turns -40 into 40 instead of rejecting it.",
  },
  {
    prompt: "What is the main reason to make fields private?",
    code: null,
    options: [
      "So the class controls every change and keeps its data valid",
      "So the program runs faster",
      "Because Java requires all fields to be private",
      "So the fields can't be read at all",
    ],
    why: "Private fields + public methods = the class decides what's allowed. Getters still let people read; nothing about it is faster or required.",
  },
];

// The three Forge Runes: each one asks you to rewrite part of the Forge class.
const RUNES = {
  forge1: {
    name: "Field Rune", done: "private int heat",
    prompt: "The heat field is wide open. Which declaration HIDES it?",
    code: "public class Forge {\n    ????            // the heat field\n}",
    options: ["private int heat;", "public int heat;", "static int heat;", "final int heat;"],
    errs: [
      null,
      ["ForgeTest: FAILED — `forge.heat = -40;` still compiles from outside", "public is exactly what got us here. Any class can still write forge.heat = -40."],
      ["ForgeTest: FAILED — heat is shared by EVERY forge, and still visible", "static makes ONE heat for all forges (and it's still package-visible). Hiding a field takes private."],
      ["Forge.java:5: error: cannot assign a value to final variable heat", "final means heat can NEVER change after it's set. A forge whose heat can't change is useless. We want to CONTROL changes, not forbid them."],
    ],
  },
  forge2: {
    name: "Getter Rune", done: "getHeat()",
    prompt: "People need to READ the heat. Which getter is right?",
    code: "private int heat;\n\n????",
    options: [
      "public int getHeat() { return heat; }",
      "public void getHeat() { return heat; }",
      "private int getHeat() { return heat; }",
      "public int getHeat(int heat) { return heat; }",
    ],
    errs: [
      null,
      ["Forge.java:4: error: incompatible types: unexpected return value", "void promises to return NOTHING, so it can't return heat. A getter returns the field's type: int."],
      ["Smithy.java:9: error: getHeat() has private access in Forge", "A private getter can't be called from outside the class, which makes it pointless. Getters are public."],
      ["ForgeTest: FAILED — getHeat(5) returned 5, but heat is 800", "The parameter shadows the field, so this returns whatever you pass in. A getter takes NO parameters and returns the field."],
    ],
  },
  forge3: {
    name: "Setter Rune", done: "setHeat(int)",
    prompt: "People need to CHANGE the heat, but only to 0–1500. Which setter is right?",
    code: "private int heat;\n\n????",
    options: [
      "public void setHeat(int heat) {\n    if (heat < 0 || heat > 1500) return;\n    this.heat = heat;\n}",
      "public void setHeat(int heat) {\n    if (heat < 0 || heat > 1500) return;\n    heat = heat;\n}",
      "public void setHeat(int heat) {\n    this.heat = heat;\n}",
      "public int setHeat(int heat) {\n    return this.heat;\n}",
    ],
    errs: [
      null,
      ["ForgeTest: FAILED — setHeat(800) left heat at 0", "heat = heat assigns the PARAMETER to itself (it shadows the field). The field never changes. Use this.heat = heat;"],
      ["ForgeTest: FAILED — setHeat(-40) was accepted", "No guard! This setter lets any value in. It's a public field wearing a disguise. The cobra freezes your forge again."],
      ["ForgeTest: FAILED — setHeat(800) never changed heat", "This 'setter' never assigns anything; it just returns the old value. A setter is void and assigns the field."],
    ],
  },
};

const rune = (id, x, y) => ({
  id, kind: "rune", x, y, solid: true,
  solved: (s) => !!s.flags[id],
  tag: (s) => (s.flags[id] ? `✔ ${RUNES[id].done}` : RUNES[id].name),
  onUse: async (api) => {
    const { s } = api;
    const R = RUNES[id];
    const who = `🔶 ${R.name}`;
    if (s.flags[id]) {
      await api.say(who, "This rune glows green. Your fix is carved into it.", forgeCode(s));
      return;
    }
    if (!s.flags.metBrannoc) {
      await api.say(who, "A standing stone carved with Java. Half the code has been scratched out.\n\nThe smith at the forge might know what it means.");
      return;
    }
    const order = shuffle(R.options.map((_, i) => i));
    const pick = await api.choose(who, R.prompt, order.map((i) => R.options[i]), R.code);
    const chosen = order[pick];
    if (chosen !== 0) {
      await api.error(who, R.errs[chosen][0], R.errs[chosen][1]);
      return;
    }
    s.flags[id] = true;
    api.log(`Forge rewritten: ${R.done}`, "ok");
    await api.say(who, "The carving flares green. The Forge class rewrites itself:", forgeCode(s));
    if (runesDone(s) === 3) api.toast("All 3 Forge Runes rewritten! Return to Brannoc.");
  },
});

const plains = {
  name: "The Private Wilds",
  theme: "wilds",
  tiles: [
    "TTTTTTTTTTTTTTTTTTTT",
    "T.......r..h..TT.TTT",
    "T.h,,,,,,,,,,...h.TT",
    "T..,...ff....,..r..T",
    "T..,..hff....,.....T",
    ",,,,.........,,,,..T",
    "T..h......r...h.,,,,",
    "CCCCC^CCCCCCCC^CCCCC",
    "~~~..,....h...,..TTT",
    "~~~~.,..r.....,.h.TT",
    "T~~~SS~~,,,,,,,..h.T",
    "T~~~SS~~~~.....r...T",
    "T.h.S~~~~~..h....rTT",
    "TTTTTTTTTTTTTTTTTTTT",
  ],
  spawn: { x: 1, y: 5 },
  entities: () => [
    { id: "brannoc", kind: "npc", sprite: "smith", x: 3, y: 1, name: "Brannoc", heals: true, solid: true, onUse: brannoc },
    {
      id: "forge", kind: "forge", x: 1, y: 1, solid: true, lit: (s) => !!s.flags.forgeLit,
      onUse: (api) => api.say("🔥 The Forge", api.s.flags.forgeLit
        ? "Roaring hot, and safe. Nobody can set its heat to anything silly anymore."
        : "Stone cold, with frost on the bricks. Someone set its heat to -40.", forgeCode(api.s)),
    },
    {
      id: "anvil", kind: "anvil", x: 2, y: 1, solid: true,
      onUse: (api) => api.say("⚒️ Anvil", api.s.flags.forgeLit ? "Your Encapsulated Blade was forged here." : "Cracked clean through the middle. Someone set the forge to 99999."),
    },
    {
      id: "wildsign", kind: "obj", x: 2, y: 6, emoji: "🪧", solid: true,
      onUse: (api) => api.say("🪧 Weathered sign", "THE PRIVATE WILDS\n\nCobras in the grass. Cliffs to the south: take the stone stairs.\n\nThe smith's forge is to the north-west."),
    },
    rune("forge1", 17, 2),
    rune("forge2", 10, 11),
    rune("forge3", 17, 9),
    board("w1", 6, 1),
    board("w2", 9, 3),
    board("w3", 15, 4),
    board("w4", 11, 6),
    board("w5", 7, 8),
    board("w6", 12, 9),
    board("w7", 16, 11),
    board("w8", 1, 12),
    bug("cobra1", 8, 4, { enemy: "cobra" }),
    bug("cobra2", 11, 10, { enemy: "cobra" }),
    bug("cobra3", 16, 8, { enemy: "cobra" }),
    clueStone("encap"),
    {
      id: "gate", kind: "gate", x: 19, y: 6, solid: (s) => !s.flags["trial:forge"],
      onBump: (api) => api.say("⛩️ The East Gate", "Barred. A plate on the bars reads:", "private boolean open;   // only Brannoc can change this"),
    },
    warp(0, 5, "village", 18, 5),
    warp(19, 6, "spire", 1, 5, {
      when: (s) => !!s.flags["trial:forge"],
      onBlocked: (api) => api.say("⚒️ Brannoc (shouting)", "Oi! That gate stays shut until you've passed my trial!"),
    }),
  ],
};

// =====================================================================
//  3. STATIC SPIRE — static (shared by the class) vs instance (per object)
// =====================================================================
const LANTERN_CLASS = `public class Lantern {
    boolean lit;            // instance: each lantern has its OWN
    static int litCount;    // static: ONE copy, shared by all

    void light() { lit = true; litCount++; }
    static void lightAll() { /* lights every lantern */ }
}`;

function lightLantern(api, name) {
  const { s } = api;
  if (s.flags["lit:" + name]) return false;
  s.flags["lit:" + name] = true;
  s.flags.litCount = (s.flags.litCount || 0) + 1;
  return true;
}

const lantern = (name, x, y, extra = {}) => ({
  id: "lantern_" + name, kind: "lantern", name, x, y, solid: true,
  lit: (s) => !!s.flags["lit:" + name],
  tag: (s) => `${name}.lit = ${!!s.flags["lit:" + name]}`,
  ...extra,
  onUse: async (api) => {
    const { s } = api;
    const who = `🏮 Lantern ${name}`;
    if (s.flags["lit:" + name]) {
      await api.say(who, `${name}.lit is already true. This lantern's own field — the others keep their own.`);
      return;
    }
    const i = await api.choose(who, `An object of class Lantern, named '${name}'. Its own field: ${name}.lit = false`,
      [`${name}.light();`, "Leave it"]);
    if (i !== 0) return;
    lightLantern(api, name);
    api.log(`${name}.light();   // ${name}.lit = true, Lantern.litCount = ${s.flags.litCount}`, "cmd");
    await api.say(who, `${name}.lit is now TRUE.\n\nOnly ${name} changed — the other lanterns are separate objects with their own 'lit'.\n\nBut look at the plaque: Lantern.litCount is now ${s.flags.litCount}. That number is static — shared by every lantern.`);
  },
});

async function orrin(api) {
  const { s } = api;
  const who = "🧙‍♂️ Sage Orrin";
  api.log("orrin.talk();", "cmd");
  if (!s.flags.metOrrin) {
    await api.say(who, "Hm? Why would I come down to greet you? I don't belong to any one visitor. I belong to the Spire itself.\n\nThat, apprentice, is what STATIC means.");
    await api.say(who, "Behold the blueprint of these lanterns:", LANTERN_CLASS);
    await api.say(who, "Three lanterns stand here: a, b and c. Each is an OBJECT — an INSTANCE built from the Lantern class with 'new Lantern()'. Each has its OWN 'lit' field.");
    await api.say(who, "But litCount is marked 'static'. There is only ONE litCount, owned by the class itself and shared by everybody. Watch the number on the plaque 📜.");
    await api.say(who, "📜 YOUR QUEST: light lantern b. Only b. Walk up to it and press J.");
    api.flag("metOrrin");
    return;
  }
  if (!s.flags["lit:b"]) {
    await api.say(who, s.flags["lit:a"] || s.flags["lit:c"]
      ? "That's not b! See? Lighting one object changes only THAT object's field. Now light b."
      : "Lantern b. The middle one. Face it, press J.");
    return;
  }
  if (!s.flags.usedLightAll) {
    if (!s.flags.orrinStep2) {
      await api.say(who, "Good. b.lit is true, but a and c are still dark — separate objects, separate fields.\n\nYet Lantern.litCount went up. One shared static number.");
      await api.say(who, "Now — lighting lanterns one by one is for peasants. Go to the CLASS plaque 📜 and light all of them with a single call on the class itself.");
      api.flag("orrinStep2");
    } else {
      await api.say(who, "The plaque, apprentice. A static method is called on the CLASS name, not on an object.");
    }
    return;
  }
  if (!s.flags.orrinDone) {
    await api.say(who, "Lantern.lightAll() — called on the class, no object needed. Like Math.max(3, 9). Nobody ever writes 'new Math()'.");
    await api.say(who, "And your program's main method? The classic one is static too. When Java starts, no objects exist yet, so main belongs to the class.\n\n(Very new Java also allows a simpler main without static, but this is the standard form, and the one on the exam.)", "public static void main(String[] args)");
    await api.say(who, "Now. Nobody climbs my Spire without passing my trial.");
    await trial(api, who, "static", STATIC_TRIAL);
    api.scroll("static");
    await api.say(who, "Adequate. Take this scroll on static and instance.\n\nThe door is open — Encapsulation Castle lies beyond.");
    api.flag("orrinDone");
    return;
  }
  await api.say(who, "Off with you. Static things stay put. Instances wander. You're clearly an instance.");
}

const STATIC_TRIAL = [
  {
    prompt: "After this runs, what are a.lit and Lantern.litCount?",
    code: "Lantern a = new Lantern();\nLantern b = new Lantern();\nb.light();",
    options: ["a.lit = false,  litCount = 1", "a.lit = true,  litCount = 1", "a.lit = false,  litCount = 0", "a.lit = true,  litCount = 2"],
    why: "b.light() only changes b's OWN 'lit' — a is a separate object, still false. But litCount is static: one shared number, now 1.",
  },
  {
    prompt: "Inside  static void lightAll()  — can you write  lit = true;  directly?",
    code: "static void lightAll() {\n    lit = true;   // ???\n}",
    options: [
      "No — a static method has no object, so which lantern's 'lit'?",
      "Yes — static methods can use any field",
      "Yes, but only if lit is public",
      "Only inside main",
    ],
    why: "lightAll() belongs to the CLASS and isn't running 'inside' any one lantern. A bare 'lit' means nothing there: error: non-static variable lit cannot be referenced from a static context.",
  },
  {
    prompt: "Why can you write  Math.max(3, 9)  without  new Math()?",
    code: "int biggest = Math.max(3, 9);",
    options: ["max is a static method — it belongs to the Math class", "Java creates a Math object automatically", "max is a field, not a method", "Math is a keyword"],
    why: "Static methods are called on the CLASS name. No object needed — just like Lantern.lightAll().",
  },
  {
    prompt: "Why is  main  declared static?",
    code: "public static void main(String[] args)",
    options: ["So Java can run it before any object exists", "So it can return a value", "So other classes can't call it", "It makes the program faster"],
    why: "When your program starts, there are no objects yet. A static main belongs to the class, so Java can call it immediately. (Java 25+ also allows an instance main, but the classic static form is the standard.)",
  },
];

async function plaque(api) {
  const { s } = api;
  const who = "📜 class Lantern";
  const opts = ["Lantern.light();", "Lantern.lightAll();", "new Lantern();", "Leave"];
  const i = await api.choose(who, `The class itself. One static field lives here:\nLantern.litCount = ${s.flags.litCount || 0}`, opts, LANTERN_CLASS);
  if (i === 0) {
    api.log("Lantern.light();", "cmd");
    await api.error(who, "Spire.java:9: error: non-static method light() cannot be referenced from a static context\n    Lantern.light();\n           ^",
      "light() is an INSTANCE method — it lights ONE lantern. Called on the class name, Java asks: \"which lantern?\" Instance methods need an object: b.light();");
  } else if (i === 1) {
    api.log("Lantern.lightAll();", "cmd");
    const names = ["a", "b", "c", ...(s.flags.madeD ? ["d"] : [])];
    const lit = names.filter((n) => lightLantern(api, n));
    s.flags.usedLightAll = true;
    api.log(`// lit: ${lit.join(", ") || "(all were lit)"}  Lantern.litCount = ${s.flags.litCount}`, "ok");
    await api.say(who, `WHOOSH. Every lantern blazes.\n\nlightAll() is STATIC — it belongs to the class, so you called it on the class name. No object needed.\n\nLantern.litCount = ${s.flags.litCount}`);
  } else if (i === 2) {
    if (s.flags.madeD) {
      await api.say(who, "You already built lantern d. One new object is enough to make the point!");
      return;
    }
    s.flags.madeD = true;
    api.log("Lantern d = new Lantern();", "cmd");
    await api.say(who, `POP! A brand-new lantern appears: d.\n\nA new OBJECT, with its own d.lit = false. Notice litCount didn't change (still ${s.flags.litCount || 0}) — creating an object isn't the same as lighting it.`);
  }
}

const spire = {
  name: "Static Spire",
  theme: "spire",
  tiles: [
    "WWWWWWWWW_WWWWWWWWWW",
    "W__________________W",
    "W__WW__________WW__W",
    "W__WW__________WW__W",
    "W__________________W",
    "___________________W",
    "W__________________W",
    "W__WW__________WW__W",
    "W__WW__________WW__W",
    "W__________________W",
    "W__________________W",
    "W__________________W",
    "W__________________W",
    "WWWWWWWWWWWWWWWWWWWW",
  ],
  spawn: { x: 1, y: 5 },
  entities: () => [
    { id: "orrin", kind: "npc", x: 11, y: 2, emoji: "🧙‍♂️", name: "Sage Orrin", heals: true, solid: true, onUse: orrin },
    lantern("a", 7, 6),
    lantern("b", 10, 6),
    lantern("c", 13, 6),
    lantern("d", 12, 10, { visible: (s) => !!s.flags.madeD }),
    { id: "plaque", kind: "obj", x: 9, y: 10, emoji: "📜", solid: true, onUse: plaque,
      tag: (s) => `Lantern.litCount = ${s.flags.litCount || 0}` },
    {
      id: "spiredoor", kind: "gate", x: 9, y: 1, solid: (s) => !s.flags.orrinDone,
      onBump: (api) => api.say("🚪 Spire door", "Sealed. Sage Orrin holds the key — finish his lesson."),
    },
    board("s1", 2, 9),
    board("s2", 17, 5),
    board("s3", 6, 11),
    clueStone("static"),
    bug("ghost1", 5, 12, { enemy: "ghost" }),
    bug("ghost2", 15, 10, { enemy: "ghost" }),
    warp(0, 5, "plains", 18, 6),
    warp(9, 0, "castle", 9, 12),
  ],
};

// =====================================================================
//  4. ENCAPSULATION CASTLE — private fields, getters, setters, guards
// =====================================================================
const vaultCode = (s) => `public class Vault {
    private int gold = 100;

    public int getGold() {          // getter: read
        return gold;
    }

    public void setGold(int amount) {   // setter: write
${s.flags.guard ? "        if (amount < 0) return;     // the guard!\n" : ""}        gold = amount;
    }
}`;

async function vessa(api) {
  const { s } = api;
  const who = "💂 Captain Vessa";
  api.log("vessa.talk();", "cmd");
  if (!s.flags.metVessa) {
    await api.say(who, "Halt. Nobody touches what's inside that vault without going through the proper doors.\n\nThat's ENCAPSULATION.");
    await api.say(who, "Here's how the vault is built:", vaultCode(s));
    await api.say(who, "'private' means ONLY code inside the Vault class can touch gold. Everyone else must use the public doors: getGold() to read, setGold() to write.");
    await api.say(who, "📜 YOUR QUEST: I've got a problem. That shady fellow by the east wall — Larry the Leak — keeps hanging around the setter terminal. Go see what he's up to.");
    api.flag("metVessa");
    return;
  }
  if (!s.flags.larryHacked) {
    await api.say(who, "Larry. East wall. Find out what he's doing.");
    return;
  }
  if (!s.flags.vessaFix) {
    await api.say(who, `Gold is ${s.flags.gold}?! NEGATIVE gold? That's impossible in the real world — and now it's in my vault!`);
    await api.say(who, "The field is private, so he couldn't touch it directly. But my setter lets ANY value through. A door with no guard is barely better than no door.");
    await api.say(who, "Go to the setter terminal ⌨️ and edit setGold(). Add a guard that rejects bad values.");
    api.flag("vessaFix");
    return;
  }
  if (!s.flags.guard) {
    await api.say(who, "The setter terminal ⌨️, right of the vault door. Edit setGold() so it refuses negative amounts.");
    return;
  }
  if (!s.flags.larryFoiled) {
    await api.say(who, "Guard's in place. Let's see Larry try his trick now.");
    return;
  }
  if (!s.flags.castleDone) {
    await api.say(who, "Ha! Did you see his face? THAT is why we hide data behind methods: the class gets to say NO.");
    await api.say(who, "private field + public getter + guarded setter = a class nobody can corrupt.", vaultCode(s));
    await api.say(who, "Before I open the north gate, soldier, you'll pass my trial. The Leaky Class won't go easy on you, so neither will I.");
    await trial(api, who, "encap", ENCAP_TRIAL);
    api.scroll("encap");
    await api.say(who, "Take this scroll — the rules of encapsulation.\n\nThe north gate is open. The Leaky Class waits beyond. Its fields are public. Its methods lie. Everything you've learned, you'll need at once.");
    api.flag("castleDone");
    return;
  }
  await api.say(who, "North gate. Go seal that monster.");
}

const ENCAP_TRIAL = [
  {
    prompt: "Which modifier hides 'gold' so outside code can't touch it directly?",
    code: "public class Vault {\n    ??? int gold;\n}",
    options: ["private", "public", "static", "void"],
    why: "'private' means only code inside the Vault class can see gold. Everyone else must go through methods.",
  },
  {
    prompt: "Which one is a correct GETTER for gold?",
    code: "private int gold;",
    options: [
      "public int getGold() { return gold; }",
      "public void getGold() { return gold; }",
      "public int getGold(int gold) { }",
      "private int gold() { return gold; }",
    ],
    why: "A getter takes no parameters and RETURNS the field's type. A void getter can't return anything, and a private one is no use to outsiders.",
  },
  {
    prompt: "gold starts at 100. What does getGold() return after this?",
    code: "public void setGold(int amount) {\n    if (amount < 0) return;\n    gold = amount;\n}\n\nvault.setGold(-5);\nvault.getGold();",
    options: ["100", "-5", "0", "95"],
    why: "The guard sees -5 < 0 and returns early, before 'gold = amount' runs. gold stays 100. That's the whole point of a setter.",
  },
  {
    prompt: "Access modifiers from MOST open to MOST restrictive:",
    code: null,
    options: [
      "public → protected → (default) → private",
      "private → protected → public",
      "public → private → protected",
      "protected → public → private",
    ],
    why: "public: everyone. protected: same package + subclasses. default (no keyword): same package. private: only the class itself.",
  },
];

async function larry(api) {
  const { s } = api;
  const who = "🦹 Larry the Leak";
  api.log("larry.talk();", "cmd");
  if (!s.flags.metVessa) {
    await api.say(who, "*whistles innocently* Nothin' to see here, pal.");
    return;
  }
  if (!s.flags.larryHacked) {
    await api.say(who, "Heh. So the gold's 'private'. Can't touch vault.gold directly. Fine.\n\nBut that setter? It lets in ANYTHING. Watch this...");
    api.log("vault.setGold(-999);", "cmd");
    s.flags.gold = -999;
    api.flag("larryHacked");
    await api.say(who, "vault.setGold(-999);\n\nHAHA! Your vault now holds MINUS nine hundred ninety-nine gold. Check the getter if you don't believe me!");
    return;
  }
  if (!s.flags.guard) {
    await api.say(who, "What? I used the public method. Totally legal. Not MY fault the setter doesn't check anything.");
    return;
  }
  if (!s.flags.larryFoiled) {
    await api.say(who, "Back for more? Watch me do it again...");
    api.log("vault.setGold(-999);   // REJECTED by the guard", "err");
    await api.say(who, "vault.setGold(-999);\n\n...\n\nWhat?! Nothing happened! The gold's still 100!", "if (amount < 0) return;   // the guard said no");
    await api.say(who, "Curses! ENCAPSULATED! I'm outta here!");
    api.flag("larryFoiled");
    return;
  }
}

async function getterTerminal(api) {
  const { s } = api;
  const gold = s.flags.gold ?? 100;
  api.log(`vault.getGold();   // returned ${gold}`, "cmd");
  await api.say("📟 Getter terminal", `vault.getGold() returned ${gold}.${gold < 0 ? "\n\nNEGATIVE gold. The vault is in an invalid state!" : ""}\n\nA getter lets you READ a private field without being able to touch it.`,
    "public int getGold() {\n    return gold;\n}");
}

async function setterTerminal(api) {
  const { s } = api;
  const who = "⌨️ Setter terminal";
  const opts = ["vault.setGold(150);", "vault.setGold(-5);"];
  if (s.flags.vessaFix && !s.flags.guard) opts.push("✎ Edit the setGold() code");
  opts.push("Leave");
  const i = await api.choose(who, "Call the setter, or edit it.", opts, vaultCode(s));
  const choice = opts[i];
  if (choice === "Leave") return;
  if (choice.startsWith("vault.setGold")) {
    const amount = choice.includes("-5") ? -5 : 150;
    api.log(choice, "cmd");
    if (amount < 0 && s.flags.guard) {
      api.log("// rejected: amount < 0", "err");
      await api.say(who, `The guard REJECTS it. gold stays ${s.flags.gold ?? 100}.\n\nThe class protects itself.`);
      return;
    }
    s.flags.gold = amount;
    await api.say(who, `gold is now ${amount}.${amount < 0 ? "\n\nUh oh. The setter let a negative value straight in. Nothing stopped it." : ""}`);
    return;
  }
  // Editing the setter.
  for (;;) {
    const j = await api.choose(who, "Which line goes at the top of setGold(int amount)?", [
      "if (amount < 0) return;",
      "if (amount > 0) return;",
      "gold = -amount;",
      "Make the field public instead",
    ], "public void setGold(int amount) {\n    ????\n    gold = amount;\n}");
    if (j === 0) break;
    const why = [
      null,
      "That rejects every POSITIVE amount and lets negatives through — exactly backwards! Larry would love it.",
      "That flips the sign of everything. setGold(150) would store -150. The guard should reject bad values, not mangle good ones.",
      "Making gold public removes the door entirely — then Larry could write vault.gold = -999 without even using a method. That's the opposite of encapsulation.",
    ][j];
    await api.error(who, "Test failed: VaultTest.rejectsNegativeGold", why);
  }
  s.flags.guard = true;
  s.flags.gold = 100;
  api.log("setGold() patched: if (amount < 0) return;", "ok");
  await api.say(who, "Patched! Vessa refills the vault to 100.\n\nNow the setter is a real door with a real guard.", vaultCode(s));
}

const castle = {
  name: "Encapsulation Castle",
  theme: "castle",
  tiles: [
    "WWWWWWWWW_WWWWWWWWWW",
    "W__________________W",
    "W__________________W",
    "W__WWWWWWWWWWWWW___W",
    "W__W$$$$$$$$$$$W___W",
    "W__W$$$$$$$$$$$W___W",
    "W__W$$$$$$$$$$$W___W",
    "W__WWWWWW_WWWWWW___W",
    "W__________________W",
    "W__________________W",
    "W__________________W",
    "W__________________W",
    "W__________________W",
    "WWWWWWWWW_WWWWWWWWWW",
  ],
  spawn: { x: 9, y: 12 },
  entities: () => [
    { id: "vessa", kind: "npc", x: 5, y: 10, emoji: "💂", name: "Captain Vessa", heals: true, solid: true, onUse: vessa },
    { id: "larry", kind: "npc", x: 15, y: 10, emoji: "🦹", solid: true, onUse: larry,
      visible: (s) => !s.flags.larryFoiled },
    {
      id: "vaultdoor", kind: "obj", x: 9, y: 7, emoji: "🔒", solid: true,
      tag: (s) => `private int gold`,
      onBump: async (api) => {
        api.log("vault.gold = 1000;", "cmd");
        await api.error("🔒 Vault door", "Castle.java:7: error: gold has private access in Vault\n    vault.gold = 1000;\n         ^",
          "You tried to reach straight into a PRIVATE field. Only code inside the Vault class may touch 'gold'. Outsiders must use the public methods: getGold() and setGold().");
      },
    },
    { id: "getter", kind: "obj", x: 7, y: 8, emoji: "📟", solid: true, onUse: getterTerminal,
      tag: () => "getGold()" },
    { id: "setter", kind: "obj", x: 11, y: 8, emoji: "⌨️", solid: true, onUse: setterTerminal,
      tag: () => "setGold()" },
    {
      id: "castlegate", kind: "gate", x: 9, y: 1, solid: (s) => !s.flags.castleDone,
      onBump: (api) => api.say("⛩️ North gate", "A chill seeps through the bars. Something big, and leaky, waits beyond.\n\nCaptain Vessa won't open it until the vault is safe."),
    },
    board("e1", 2, 9),
    board("e2", 17, 4),
    board("e3", 13, 12),
    board("e4", 4, 1),
    bug("slime1", 17, 6, { enemy: "slime" }),
    bug("slime2", 2, 5, { enemy: "slime" }),
    warp(9, 13, "spire", 9, 2),
    warp(9, 0, "boss", 9, 12),
  ],
};

// =====================================================================
//  5. THE LEAKY CLASS — boss arena. Seal 4 leaks while dodging bugs.
// =====================================================================
const LEAKS = [
  {
    n: 1, x: 3, y: 6, title: "Leak #1: the public field",
    code: "public class Account {\n    public double balance;\n}",
    prompt: "Anyone can write  account.balance = -1000000;  How do you seal it?",
    options: ["Make balance private, add getBalance() / setBalance()", "Make balance static", "Rename it to money"],
    why: ["", "static would make ONE balance shared by every account — and it'd still be public. Worse!", "A new name doesn't stop anyone from writing to it. The problem is the access, not the name."],
  },
  {
    n: 2, x: 16, y: 6, title: "Leak #2: the lying getter",
    code: "public double getBalance() {\n    return;\n}",
    prompt: "This method promises a double but returns nothing. Fix it:",
    options: ["return balance;", "Change it to void and keep 'return;'", "Delete the return line"],
    why: ["", "A void getter can't give anything back — then nobody can read the balance at all. A getter's whole job is to return the value.", "Without a return, a method that promises 'double' won't compile: missing return statement."],
  },
  {
    n: 3, x: 5, y: 10, title: "Leak #3: the useless deposit",
    code: "void deposit(double amount) {\n    amount = amount + 10;\n}",
    prompt: "deposit() only changes its own copy of 'amount'. Fix it:",
    options: ["balance = balance + amount;", "amount = amount * 2;", "return amount;"],
    why: ["", "Still only changes the local copy of the parameter. Pass-by-value: the caller and the balance never see it.", "deposit is void — it can't return a value. And returning wouldn't update the balance anyway."],
  },
  {
    n: 4, x: 14, y: 10, title: "Leak #4: the confused static",
    code: "public static void addInterest() {\n    balance = balance * 1.05;\n}",
    prompt: "error: non-static variable balance cannot be referenced from a static context. Fix it:",
    options: ["Remove 'static' — interest belongs to each account", "Make balance public", "Change 1.05 to 1"],
    why: ["", "The access level isn't the problem. A static method has no object, so it can't know WHICH account's balance to use.", "That makes the interest do nothing, and the compile error is still there."],
  },
];

const leak = (L) => ({
  id: "leak" + L.n, kind: "leak", x: L.x, y: L.y, solid: true,
  sealed: (s) => !!s.flags["leak" + L.n],
  tag: (s) => (s.flags["leak" + L.n] ? "sealed" : "LEAK"),
  onUse: async (api) => {
    const { s } = api;
    const who = "💧 " + L.title;
    if (s.flags["leak" + L.n]) {
      await api.say(who, "Sealed tight. The code here is honest now.");
      return;
    }
    const i = await api.choose(who, L.prompt, L.options, L.code);
    if (i !== 0) {
      api.hurt(3);
      await api.error("👾 The Leaky Class", "HAHAHA! *the leak sprays you* (-3 HP)", L.why[i]);
      return;
    }
    s.flags["leak" + L.n] = true;
    api.log(`leak #${L.n} sealed: ${L.options[0]}`, "ok");
    api.bossHit();
    const left = 4 - sealedCount(s);
    if (left > 0) {
      await api.say("👾 The Leaky Class", ["", "ARGH! You patched me! ...Three leaks remain!", "NO! My methods are telling the TRUTH! Two left!", "STOP! I'm becoming... READABLE!"][4 - left] || "ARGH!");
      return;
    }
    await api.say("👾 The Leaky Class", "No... my fields are private... my getters return... my statics are... sensible...\n\nI'm... I'm just... a good class now...");
    s.flags.bossDead = true;
    api.log("The Leaky Class has been refactored.", "ok");
    await api.say("📖 Victory", "The Leaky Class shrinks, flickers, and settles into something small and tidy: a well-encapsulated Account class.\n\nThe Bugs across Codex vanish with a soft *pop*.");
    api.scroll("final");
    api.victory();
  },
});

const boss = {
  name: "The Leaky Class",
  theme: "boss",
  tiles: [
    "WWWWWWWWWWWWWWWWWWWW",
    "W__________________W",
    "W__________________W",
    "W__________________W",
    "W__________________W",
    "W__________________W",
    "W__________________W",
    "W__________________W",
    "W__________________W",
    "W__________________W",
    "W__________________W",
    "W__________________W",
    "W__________________W",
    "WWWWWWWWW_WWWWWWWWWW",
  ],
  spawn: { x: 9, y: 12 },
  entities: () => [
    {
      id: "leaky", kind: "boss", x: 9.5, y: 2, vx: 2.4, t: 0, spawnT: 4, emoji: "👾",
      visible: (s) => !s.flags.bossDead,
      update(dt, g) {
        if (!g.s.flags.bossIntro) return;
        const sealed = sealedCount(g.s);
        this.x += this.vx * (1 + sealed * 0.25) * dt;
        if (this.x < 2.5) { this.x = 2.5; this.vx = Math.abs(this.vx); }
        if (this.x > 16.5) { this.x = 16.5; this.vx = -Math.abs(this.vx); }
        this.t += dt;
        if (this.t > 1.3 - sealed * 0.2) {
          this.t = 0;
          g.spawn({ kind: "shot", fx: this.x, fy: 3, vx: 0, vy: 4.5 + sealed * 0.6, dmg: 3, emoji: "🐞" });
        }
        this.spawnT -= dt;
        if (this.spawnT <= 0) {
          this.spawnT = 7;
          const bugs = g.entities.filter((e) => e.kind === "bug" && !e.dead).length;
          const x = Math.round(this.x);
          if (bugs < 2 && !g.blocked(x, 4)) {
            g.spawn(bug("minion" + Math.random(), x, 4, { enemy: "minion" }));
          }
        }
      },
    },
    ...LEAKS.map(leak),
    board("x1", 11, 12),
    warp(9, 13, "castle", 9, 2),
  ],
  onEnter: async (api) => {
    if (api.s.flags.bossIntro) return;
    await api.say("👾 The Leaky Class", "I AM THE LEAKY CLASS!\n\nMy fields are PUBLIC! My getters LIE! My statics are CONFUSED! Anyone may corrupt me — and I LOVE it!");
    await api.say("👾 The Leaky Class", "You can't zap away bad design, apprentice. Your little spells will bounce right off me!");
    await api.say("💡 How to win", "Four LEAKS 💧 spray bad code around the arena. Walk up to each one and press J to fix its code.\n\nDodge the falling 🐞! The 🪲 minions will battle you with questions on EVERYTHING you've learned.");
    api.flag("bossIntro");
  },
};

// =====================================================================
export const MAPS = { village, plains, spire, castle, boss };

// The objective shown at the top of the screen, worked out from flags.
export function objective(s) {
  const f = s.flags;
  const steps = [
    [f.metTamsin, "Talk to Old Tamsin 👵 — walk up to her and press J."],
    [s.learned.zap, `Collect method fragments ✦ (${s.fragments.length}/6), then compile them at the Compiler Stone 🗿.`],
    [f["dead:bb1"] && f["dead:bb2"], "Defeat the two Null Knights ⚔️ guarding the bridge: walk into them (or zap them for a first strike)."],
    [f["trial:methods"], "📝 Return to Old Tamsin 👵 and pass her trial."],
    [f.metBrannoc, "Cross the bridge east into the Private Wilds and find Brannoc the Smith at his forge."],
    [f.forge1 && f.forge2 && f.forge3, `Rewrite the 3 Forge Runes 🔶 (${[1, 2, 3].filter((n) => f["forge" + n]).length}/3). Stuck? Read the boards 📋.`],
    [f["trial:forge"], "📝 Return to Brannoc ⚒️: relight the forge and pass his trial."],
    [f.metOrrin, "Go through the gate to the Static Spire and talk to Sage Orrin 🧙‍♂️."],
    [f["lit:b"], "Light lantern b — and ONLY b."],
    [f.usedLightAll, f.orrinStep2 ? "Use the class plaque 📜 to light every lantern with ONE static call." : "Talk to Sage Orrin again."],
    [f.orrinDone, "📝 Return to Sage Orrin 🧙‍♂️ and pass his trial."],
    [f.metVessa, "Go through the Spire door to Encapsulation Castle. Talk to Captain Vessa 💂."],
    [f.larryHacked, "Find out what Larry the Leak 🦹 is up to."],
    [f.vessaFix, "Tell Captain Vessa what Larry did."],
    [f.guard, "Edit setGold() at the setter terminal ⌨️ so it rejects bad values."],
    [f.larryFoiled, "Let Larry try his trick again."],
    [f.castleDone, "📝 Return to Captain Vessa 💂 and pass her trial."],
    [f.bossIntro, "Go north through the castle gate. The Leaky Class awaits."],
    [f.bossDead, `Seal the leaks 💧 (${sealedCount(s)}/4) with J. Dodge the 🐞!`],
  ];
  for (const [done, text] of steps) if (!done) return text;
  return "Codex is safe! Now try the REAL Java quests in the java-lab folder.";
}

export function scrollById(id) {
  return SCROLLS[id];
}
