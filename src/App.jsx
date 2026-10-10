import React, { useEffect, useRef, useState } from "react";
import { Game, newState, TILE, COLS, ROWS } from "./game/engine.js";
import { objective } from "./game/world.js";
import { SCROLLS } from "./game/scrolls.js";
import { LESSONS } from "./game/lessons.js";
import { expToNext } from "./game/battle.js";
import BattleScreen from "./BattleScreen.jsx";

// localStorage key — your progress is saved in the browser under this name.
const SAVE_KEY = "rune-of-logic-rpg-v2";

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { ...newState(), ...JSON.parse(raw) };
  } catch (e) {
    // corrupt save or storage blocked — start fresh
  }
  return null;
}

function writeSave(s) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch (e) {
    /* storage blocked — the game still works, it just won't persist */
  }
}

export default function App() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const stateRef = useRef(null);
  const blockingRef = useRef(false);
  const [started, setStarted] = useState(false);
  const [, setVersion] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [banner, setBanner] = useState(null);
  const [toast, setToast] = useState(null);
  const [journal, setJournal] = useState(false);
  const [victory, setVictory] = useState(false);
  const [battle, setBattle] = useState(null);
  const hasSave = useRef(loadSave() !== null);

  blockingRef.current = journal || victory;

  // The bridge between the game engine and React's screens.
  const ui = useRef(null);
  if (!ui.current) {
    let bannerTimer, toastTimer;
    ui.current = {
      say: (who, text, code, style) =>
        new Promise((resolve) => setDialog({ type: "say", who, text, code, style, resolve, at: Date.now() })),
      choose: (who, text, options, code) =>
        new Promise((resolve) => setDialog({ type: "choose", who, text, options, code, resolve, at: Date.now() })),
      assemble: (opts) =>
        new Promise((resolve) => setDialog({ type: "assemble", ...opts, resolve, at: Date.now() })),
      changed: () => setVersion((v) => v + 1),
      save: writeSave,
      isBlocking: () => blockingRef.current,
      toggleJournal: () => setJournal((j) => !j),
      victory: () => setVictory(true),
      battle: (opts) => new Promise((resolve) => setBattle({ ...opts, resolve })),
      banner: (name) => {
        setBanner(name);
        clearTimeout(bannerTimer);
        bannerTimer = setTimeout(() => setBanner(null), 2200);
      },
      toast: (text) => {
        setToast(text);
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => setToast(null), 3200);
      },
    };
  }

  function begin(fresh) {
    const s = (!fresh && loadSave()) || newState();
    stateRef.current = s;
    const game = new Game(canvasRef.current, s, ui.current);
    gameRef.current = game;
    setStarted(true);
    game.start();
  }

  useEffect(() => () => gameRef.current?.stop(), []);

  // Journal & victory close with Escape / J.
  useEffect(() => {
    function onKey(e) {
      if (journal && (e.code === "Escape" || e.code === "KeyL")) setJournal(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [journal]);

  function answer(value) {
    const r = dialog.resolve;
    setDialog(null);
    r(value);
  }

  function resetGame() {
    if (window.confirm("Erase your save and start over?")) {
      localStorage.removeItem(SAVE_KEY);
      window.location.reload();
    }
  }

  const s = stateRef.current;

  return (
    <div className="app">
      <header className="header">
        <div className="title">⚔️ Rune of Logic</div>
        {s && <Hud s={s} />}
        <div className="header-btns">
          {s && <button className="link-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => setJournal(true)}>📜 Journal (L)</button>}
          <button className="link-btn danger" onMouseDown={(e) => e.preventDefault()} onClick={resetGame}>↺ Reset</button>
        </div>
      </header>

      {s && (
        <div className="objective">
          <span className="obj-label">QUEST</span> {objective(s)}
        </div>
      )}

      <div className="layout">
        <div className="stage">
          <canvas ref={canvasRef} width={COLS * TILE} height={ROWS * TILE} className="screen" />
          {banner && <div className="banner" key={banner}>{banner}</div>}
          {toast && <div className="toast">{toast}</div>}
          {dialog && dialog.type !== "assemble" && <DialogBox dialog={dialog} onAnswer={answer} />}
          {dialog && dialog.type === "assemble" && <AssembleBox dialog={dialog} onAnswer={answer} />}
          {!started && <TitleScreen hasSave={hasSave.current} onStart={begin} />}
          {journal && s && <Journal s={s} onClose={() => setJournal(false)} />}
          {victory && s && <Victory s={s} onClose={() => setVictory(false)} />}
          {battle && s && (
            <BattleScreen
              battle={battle}
              s={s}
              changed={() => setVersion((v) => v + 1)}
              onDone={(result) => {
                const r = battle.resolve;
                setBattle(null);
                r(result);
              }}
            />
          )}
        </div>

        {s && (
          <aside className="side">
            <HeroJava s={s} />
            <Console log={s.log} />
            <div className="keys">
              <b>Move</b> WASD / arrows · <b>Talk/use</b> J · <b>Zap</b> K
              {s.learned.args && <> · <b>Argument</b> 1 2 3</>} · <b>Journal</b> L
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
function Hud({ s }) {
  const pct = (s.hp / s.maxHp) * 100;
  return (
    <div className="stats">
      <span className="stat">
        ❤️
        <span className="hpbar"><span className="hpfill" style={{ width: `${pct}%` }} /></span>
        {s.hp}/{s.maxHp}
      </span>
      <span className="stat">💧 MP {s.mp}/{s.maxMp}</span>
      <span className="stat lvl">⭐ Lv {s.level} <span className="muted">({s.exp}/{expToNext(s.level)} EXP)</span></span>
      <span className="stat">🪙 {s.coins}</span>
      {s.learned.zap && (
        <span className="stat spell">
          ✨ zap({s.learned.args ? s.power : 1}) → {(s.learned.args ? s.power : 1) * 2}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
function TitleScreen({ hasSave, onStart }) {
  return (
    <div className="overlay title-screen">
      <div className="title-card">
        <div className="title-emoji">🍥✨🐛</div>
        <h1>Rune of Logic</h1>
        <p className="tagline">Chapter 1: The Encapsulated Kingdom</p>
        <p className="tagline">A tiny RPG where Java is magic.</p>
        <p>
          Build spells out of <b>methods</b>. Open gates with <b>arguments</b>.
          Light lanterns to learn <b>static</b>. Guard a vault with <b>encapsulation</b>.
          Then defeat <b>The Leaky Class</b>.
        </p>
        <div className="row center">
          {hasSave && (
            <button className="btn primary" onMouseDown={(e) => e.preventDefault()} onClick={() => onStart(false)}>
              ▶ Continue
            </button>
          )}
          <button className={`btn ${hasSave ? "" : "primary"}`} onMouseDown={(e) => e.preventDefault()} onClick={() => onStart(true)}>
            {hasSave ? "New game" : "▶ Start adventure"}
          </button>
        </div>
        <p className="small-print">Arrows/WASD to walk · J to talk · K to zap · L for journal</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
//  Dialogue box with a typewriter effect. Space / Enter / J advance;
//  number keys pick a choice.
// ---------------------------------------------------------------------
function DialogBox({ dialog, onAnswer }) {
  const [shown, setShown] = useState(0);
  const full = dialog.text || "";
  const done = shown >= full.length;

  useEffect(() => {
    setShown(0);
    const id = setInterval(() => {
      setShown((n) => {
        if (n >= full.length) {
          clearInterval(id);
          return n;
        }
        return n + 2;
      });
    }, 14);
    return () => clearInterval(id);
  }, [dialog, full]);

  useEffect(() => {
    function onKey(e) {
      if (e.repeat || Date.now() - dialog.at < 200) return;
      const advance = ["Space", "Enter", "KeyJ"].includes(e.code);
      if (!done) {
        if (advance) setShown(full.length);
        return;
      }
      if (dialog.type === "say" && advance) onAnswer(true);
      if (dialog.type === "choose") {
        const n = Number(e.key);
        if (n >= 1 && n <= dialog.options.length) onAnswer(n - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, done, full, onAnswer]);

  return (
    <div
      className={`dialog ${dialog.style === "error" ? "is-error" : ""}`}
      onClick={() => {
        if (!done) setShown(full.length);
        else if (dialog.type === "say") onAnswer(true);
      }}
    >
      <div className="speaker">{dialog.who}</div>
      {dialog.code && (
        <pre className={`code ${dialog.style === "error" ? "code-error" : ""}`}>{dialog.code}</pre>
      )}
      <p className="dialog-text">{full.slice(0, shown)}</p>
      {done && dialog.type === "say" && <div className="next">▼ J / Space</div>}
      {done && dialog.type === "choose" && (
        <div className="choices">
          {dialog.options.map((o, i) => (
            <button
              key={i}
              className="choice"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                onAnswer(i);
              }}
            >
              <span className="choice-num">{i + 1}</span>
              <span className="choice-code">{o}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
//  The Compiler Stone: click fragments to build a line of code.
// ---------------------------------------------------------------------
function AssembleBox({ dialog, onAnswer }) {
  const [order, setOrder] = useState([]); // indexes into dialog.pieces
  const pieces = dialog.pieces;
  const line = order.map((i) => pieces[i]).join(" ");

  useEffect(() => {
    function onKey(e) {
      if (e.code === "Escape") onAnswer(null);
      if (e.code === "Backspace") setOrder((o) => o.slice(0, -1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAnswer]);

  const noFocus = (e) => e.preventDefault();

  return (
    <div className="overlay">
      <div className="assemble">
        <div className="speaker">🗿 {dialog.title}</div>
        <p className="hint">Click the fragments in order. Click a placed one to take it back.<br />{dialog.hint}</p>
        <div className="slots">
          {Array.from({ length: dialog.slots }).map((_, k) => (
            <button
              key={k}
              className={`slot ${order[k] !== undefined ? "filled" : ""}`}
              onMouseDown={noFocus}
              onClick={() => order[k] !== undefined && setOrder((o) => o.filter((_, j) => j !== k))}
            >
              {order[k] !== undefined ? pieces[order[k]] : k + 1}
            </button>
          ))}
        </div>
        <pre className="code">{line || "// your method appears here"}</pre>
        <div className="pieces">
          {pieces.map((p, i) => (
            <button
              key={i}
              className="piece"
              disabled={order.includes(i) || order.length >= dialog.slots}
              onMouseDown={noFocus}
              onClick={() => setOrder((o) => [...o, i])}
            >
              ✦ {p}
            </button>
          ))}
        </div>
        <div className="row">
          <button className="btn primary" disabled={order.length === 0} onMouseDown={noFocus}
            onClick={() => onAnswer(order.map((i) => pieces[i]))}>
            ▶ Compile
          </button>
          <button className="btn ghost" onMouseDown={noFocus} onClick={() => onAnswer(null)}>Walk away</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
//  YOU, as a Java class. It grows as you learn.
// ---------------------------------------------------------------------
function heroLines(s) {
  const q = (v) => `"${v}"`;
  const L = [];
  const add = (code, note) => L.push({ code, note });
  add("public class Hero {");
  add(`    private int hp = ${s.hp};`);
  add(`    private int level = ${s.level};`);
  add(`    private int mp = ${s.mp};`);
  add(`    private int coins = ${s.coins};`);
  if (s.atkBonus) add(`    private String weapon = "Encapsulated Blade";  // +${s.atkBonus} attack`, "new");
  add(`    private String[] bag = {${s.bag.map(q).join(", ")}};`);
  if (s.fragments.length) add(`    // fragments: ${s.fragments.join(" | ")}`, "frag");
  if (s.args.length) add(`    // arguments: ${s.args.map((a) => a.value).join(", ")}`, "arg");
  add("");
  if (!s.learned.zap) {
    add("    // no methods yet...", "dim");
    add("    // (Old Tamsin can help)", "dim");
  } else {
    add("    public int zap(int power) {", "new");
    add("        return power * 2;", "new");
    add("    }", "new");
    if (s.learned.args) add(`    // next cast: zap(${s.power})`, "dim");
  }
  if (s.scrolls.includes("encap")) {
    add("");
    add("    public int getHp() { return hp; }", "new");
  }
  add("}");
  return L;
}

function HeroJava({ s }) {
  return (
    <div className="card">
      <div className="card-title">📄 Hero.java <span className="muted">— that's you</span></div>
      <pre className="code hero-code">
        {heroLines(s).map((l, i) => (
          <div key={i} className={`ln ${l.note || ""}`}>{l.code || " "}</div>
        ))}
      </pre>
    </div>
  );
}

function Console({ log }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log.length]);
  return (
    <div className="card">
      <div className="card-title">🖥️ Console</div>
      <div className="console" ref={ref}>
        {log.length === 0 && <div className="log dim">// actions you take appear here as Java</div>}
        {log.map((l, i) => (
          <div key={i} className={`log ${l.kind}`}>{l.kind === "cmd" ? "> " : ""}{l.text}</div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
function Journal({ s, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="journal" onClick={(e) => e.stopPropagation()}>
        <h2>📜 Journal</h2>
        <div className="scroll-card quest">
          <div className="scroll-title">Current quest</div>
          <p>{objective(s)}</p>
        </div>
        <h3 className="j-head">📋 Lessons read ({Object.keys(LESSONS).filter((id) => s.flags["read:" + id]).length}/{Object.keys(LESSONS).length})</h3>
        {Object.keys(LESSONS).filter((id) => s.flags["read:" + id]).length === 0 && (
          <p className="empty">No lessons yet. Look for notice boards 📋 with a yellow "!" and press J.</p>
        )}
        {Object.entries(LESSONS).filter(([id]) => s.flags["read:" + id]).map(([id, L]) => (
          <details className="lesson" key={id}>
            <summary>{L.title} <span className="muted">— {L.area}</span></summary>
            {L.pages.map((pg, i) => (
              <div key={i} className="lesson-page">
                <p>{pg.text}</p>
                {pg.code && <pre className="code">{pg.code}</pre>}
              </div>
            ))}
          </details>
        ))}
        <h3 className="j-head">📜 Scrolls</h3>
        {s.scrolls.length === 0 && <p className="empty">No scrolls yet. Pass a Keeper's trial to earn one.</p>}
        {s.scrolls.map((id) => (
          <div className="scroll-card" key={id}>
            <div className="scroll-title">{SCROLLS[id].title}</div>
            <ul>{SCROLLS[id].lines.map((l, j) => <li key={j}>{l}</li>)}</ul>
          </div>
        ))}
        <p className="muted small">Want to practise for real? Open the <b>java-lab</b> folder — each area has a real Java file to run and modify.</p>
        <button className="btn" onMouseDown={(e) => e.preventDefault()} onClick={onClose}>Close (L)</button>
      </div>
    </div>
  );
}

function Victory({ s, onClose }) {
  return (
    <div className="overlay">
      <div className="journal center">
        <div className="burst">✦ 🏆 ✦</div>
        <h2>The Kingdom is Encapsulated!</h2>
        <p>You built a method, passed arguments, tamed static, and guarded a vault.</p>
        <div className="victory-stats">
          <div><b>{s.stats.zapped}</b><span>Bugs zapped</span></div>
          <div><b>{s.stats.errors}</b><span>Compile errors read</span></div>
          <div><b>{s.stats.right || 0}</b><span>Battle answers right</span></div>
          <div><b>{s.stats.examRight || 0}</b><span>🎓 Exam-style right</span></div>
          <div><b>Lv {s.level}</b><span>Final level</span></div>
        </div>
        <p className="muted">Every error you read taught you something. That's how real programmers learn too.</p>
        <p><b>Next quest:</b> open <code>java-lab/</code> and run the real Java versions of everything you just did.</p>
        <button className="btn primary" onMouseDown={(e) => e.preventDefault()} onClick={onClose}>Keep exploring</button>
      </div>
    </div>
  );
}
