# The Encapsulated Kingdom

A small top-down RPG where **Java is magic**. You walk around as Rook, an
apprentice coder, and every quest *is* a Java idea:

| Area | What you do | What you learn |
|---|---|---|
| 🏘️ Method Village | Collect glowing code fragments and assemble your first spell at the Compiler Stone. One fragment is a liar. | Method anatomy, return types, `void` |
| 🌾 Parameter Plains | Brannoc doubles your coins (they don't change!) and adds a gem to your bag (it does!). Then feed the right *arguments* into a gate's *parameter* slots. | Parameters vs. arguments, pass-by-value, types |
| 🗼 Static Spire | Light lanterns one by one, watch the shared counter, then light them all with one call on the class. | `static` vs. instance |
| 🏰 Encapsulation Castle | You can't walk into the private vault. Larry the Leak abuses the setter, so you patch it with a guard. | `private`, getters, setters, validation |
| 👾 The Leaky Class | Boss fight: dodge bugs and seal four leaks by fixing its code. | All of it at once |

Every Keeper (Tamsin, Brannoc, Orrin, Vessa) works the same way:

1. **Teach.** They explain the idea with real code.
2. **Quest.** They give you a hands-on task in the world (📜 YOUR QUEST).
3. **Trial.** You come back and answer their 3–4 question quiz. If you get one
   wrong, they explain why and ask it again later. First-try answers earn
   coins. You can't leave an area until you pass its trial, and passing gives
   you that area's cheat-sheet scroll.

**📋 Lesson boards** stand all over the map. Walk up to any board with a
yellow **!** and press J to read a definition, an explanation and code
examples. Every board you read is saved in your Journal (L).

**⚔️ Battles work like Final Fantasy.** Walk into an enemy (or zap it with
K for a first strike) and a turn-based battle starts:

- **Attack / Magic:** you must answer a Java question. A right answer hits;
  a wrong answer misses, and you see the correct answer and why.
- **Magic** casts `zap(N)`. A bigger argument (keys 1–3) does more damage
  but costs more MP.
- **Item** uses Bread (+8 HP) or a Gem (+6 MP). **Defend** reduces damage.
  **Run** might work.
- Winning gives EXP and coins, and leveling up raises your max HP and MP.
  Talk to any Keeper to heal.

Enemies ask about their own area's topic, plus some review questions from
earlier areas.

While you play, the **Hero.java** panel shows *you* as a Java object. Your
fields update live and the methods you learn get added to it. The **Console**
shows each of your actions as Java code.

Built with **React + Vite**. No backend needed, and progress saves in your browser.

---

## 1. Run the game

You need **Node.js 18+** (https://nodejs.org, pick LTS). Then, in this folder:

```
npm install      (first time only)
npm run dev
```

Open the `http://localhost:5173/` link it prints. Press `Ctrl + C` in the
terminal to stop.

## 2. Controls

| Key | Action |
|---|---|
| Arrows / WASD | Walk |
| J (or Enter) | Talk / use the thing you're facing (look for the yellow **J** bubble) |
| K | Cast `zap()` at an enemy for a first strike (once you've built it) |
| Space / J | Advance dialogue |
| 1 2 3 | Choose the argument you pass: `zap(1)`, `zap(2)`, `zap(3)` (once Brannoc teaches you) |
| L | Journal: current quest, lessons and scrolls |

If your HP hits 0 you see a fake stack trace and respawn at the area entrance.
You never lose progress.

## 3. Then write the real thing: `java-lab/`

The game teaches the ideas. The `java-lab` folder makes you **type real
Java**. There's one file per area, and each has TODO challenges:

```
cd java-lab
java Quest1_Methods.java
```

(With Java 11+ you can run a single `.java` file directly, no `javac` step needed.)

| File | Challenge |
|---|---|
| `Quest1_Methods.java` | Write your own `heal(int amount)` method |
| `Quest2_Parameters.java` | Predict the output, then break the gate on purpose |
| `Quest3_Static.java` | Make lanterns, add a static method |
| `Quest4_Encapsulation.java` | Guard the vault so Larry loses |
| `Quest5_LeakyClass.java` | **Doesn't compile.** Fix all four leaks until it prints `BOSS DEFEATED` |

## 4. How the code is organized

```
src/
├── main.jsx            Entry point: drops <App/> into index.html
├── App.jsx             The screens: dialogue boxes, Hero.java panel, journal
├── styles.css          The look
└── game/
    ├── engine.js       Walking, collision, drawing, zapping (no story here)
    ├── world.js        Maps, characters, quests, dialogue, trials
    ├── lessons.js      The text on every lesson board 📋
    ├── questions.js    The battle question bank (add your own!)
    ├── battle.js       Enemies, damage, EXP and level-up rules
    └── scrolls.js      The cheat-sheet rules you earn
BattleScreen.jsx        The Final Fantasy style battle screen
```

The engine doesn't know anything about the story, and the story doesn't know
how drawing works. Keeping those apart is the same idea as encapsulation.

## 5. Make it your own

Everything fun lives in `src/game/world.js`:

- **Edit a map.** Each map is 14 strings of 20 characters, and the legend is at
  the top of the file. Turn a `.` into a `T` and save. A tree appears.
- **Add a character.** Copy an `npc` line (like Mochi the cat) and change
  `x`, `y`, `emoji`, and its `onUse` script. Scripts are just
  `await api.say(...)` and `await api.choose(...)`.
- **Add a fragment, an argument, or a bug.** Use the `frag(...)`, `arg(...)`
  and `bug(...)` helpers.
- **Add a new area** for your next lessons (constructors, `this`,
  inheritance). Copy a whole map object, add it to `MAPS`, and connect it
  with a `warp(...)`.

If something breaks, check the terminal and the browser console (F12). They
name the file and the line.

## 6. Common hiccups

- **`npm: command not found`**: Node isn't installed, or the terminal needs a restart.
- **Blank page after editing `world.js`**: usually a missing comma or brace. F12 shows the line.
- **Want to restart?** Click **↺ Reset** in the top-right corner.

Have fun, and good luck on your exam.
