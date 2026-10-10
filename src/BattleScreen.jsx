import React, { useEffect, useRef, useState } from "react";
import { paintNinja } from "./game/engine.js";
import {
  ITEMS, pickQuestion, attackDamage, magicPower, magicCost, magicDamage,
  enemyDamage, gainExp, expToNext, shuffle,
} from "./game/battle.js";
import { CLUE_STONES } from "./game/questions.js";

// =====================================================================
//  A Final Fantasy style turn-based battle.
//  ATTACK and MAGIC ask a Java question: right = you hit, wrong = you miss.
//  Then the enemy takes its turn. Resolves with "win" | "lose" | "run".
// =====================================================================

const COMMANDS = [
  { id: "attack", label: "⚔️ Attack" },
  { id: "magic", label: "✨ Magic" },
  { id: "item", label: "🎒 Item" },
  { id: "defend", label: "🛡️ Defend" },
  { id: "run", label: "🏃 Run" },
];

export default function BattleScreen({ battle, s, changed, onDone }) {
  const enemy = battle.enemy;
  const [view, setView] = useState({ kind: "msg", text: "" });
  const [cursor, setCursor] = useState(0);
  const [enemyHp, setEnemyHp] = useState(enemy.hp);
  const [fx, setFx] = useState(null);
  const [foeAnim, setFoeAnim] = useState("enter");
  const [heroAnim, setHeroAnim] = useState("");
  const resolver = useRef(null);
  const started = useRef(false);

  // ---- tiny "director" helpers: each one shows something and waits for the player
  const wait = (v) => new Promise((r) => { resolver.current = r; setView({ ...v, at: Date.now() }); });
  const show = (text, style) => wait({ kind: "msg", text, style });
  const answer = (value) => { const r = resolver.current; resolver.current = null; if (r) r(value); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pop = (who, text, color) => setFx({ who, text, color, key: Math.random() });
  const anim = async (setter, name, ms = 450) => { setter(name); await sleep(ms); setter(""); };

  async function ask(q, label) {
    const order = shuffle(q.options.map((_, i) => i));
    const pick = await wait({ kind: "ask", q, order, label });
    return { ok: order[pick] === 0, picked: q.options[order[pick]] };
  }

  async function run() {
    let hp = enemy.hp;
    const used = new Set();
    const hit = async (dmg) => {
      hp = Math.max(0, hp - dmg);
      setEnemyHp(hp);
      pop("foe", `-${dmg}`, "#fff3a0");
      await anim(setFoeAnim, "hurt");
    };

    await sleep(500);
    setFoeAnim("");
    await show(`A wild ${enemy.name} appears!`);
    if (battle.first > 0) {
      await anim(setHeroAnim, "cast");
      await hit(battle.first);
      await show(`⚡ First strike! Your zap hits for ${battle.first} damage.`);
    }

    for (;;) {
      if (hp <= 0) break;
      // ---------------- player turn
      setCursor(0);
      const cmd = COMMANDS[await wait({ kind: "menu" })].id;
      let defending = false;

      if (cmd === "attack" || cmd === "magic") {
        if (cmd === "magic") {
          if (!s.learned.zap) { await show("You don't know any magic yet."); continue; }
          if (s.mp < magicCost(s)) { await show(`Not enough MP! zap(${magicPower(s)}) costs ${magicCost(s)} MP.\nUse a 💎 Gem, or lower the argument with 1/2/3 outside battle.`); continue; }
        }
        const label = cmd === "attack" ? "⚔️ ATTACK — answer to strike!" : `✨ MAGIC: zap(${magicPower(s)}) — answer to cast!`;
        const q = pickQuestion(s, enemy.topic, used);
        const { ok, picked } = await ask(q, label);
        if (cmd === "magic") { s.mp -= magicCost(s); changed(); }
        if (ok) {
          s.stats.right = (s.stats.right || 0) + 1;
          const base = cmd === "attack" ? attackDamage(s) : magicDamage(s);
          const dmg = q.exam ? Math.ceil(base * 1.5) : base; // exam-level answers are critical hits
          if (q.exam) s.stats.examRight = (s.stats.examRight || 0) + 1;
          await anim(setHeroAnim, cmd === "attack" ? "lunge" : "cast", 300);
          await hit(dmg);
          // every right answer also heals one heart
          const heal = s.hp < s.maxHp ? 1 : 0;
          s.hp += heal;
          if (heal) pop("hero", "+1 ❤️", "#7bd88f");
          await show(`✅ Correct! ${cmd === "attack" ? "Rook strikes" : `zap(${magicPower(s)}) blasts`} for ${dmg} damage!${q.exam ? "  🎓 CRITICAL — exam-level answer!" : ""}${heal ? "   ❤️ +1 HP" : ""}\n\n${q.why}`);
        } else {
          s.stats.wrong = (s.stats.wrong || 0) + 1;
          pop("foe", "MISS", "#c9c9d6");
          const stone = q.hard && !s.flags["clue:" + q.topic] ? CLUE_STONES[q.topic] : null;
          const seek = stone ? `\n\n🪨 That was the hardest riddle of ${stone.area}. Stuck? Seek the Clue Stone in ${stone.where}.` : "";
          await show(`❌ Wrong — your ${cmd === "attack" ? "attack" : "spell"} fizzles!\n\nYou picked: ${picked}\nCorrect:    ${q.options[0]}\n\n${q.why}${seek}`, "error");
        }
        changed();
      } else if (cmd === "item") {
        const usable = s.bag.filter((b) => ITEMS[b]);
        if (usable.length === 0) { await show("Your bag has nothing usable."); continue; }
        const choice = await wait({ kind: "items", items: usable });
        if (choice < 0) continue;
        const key = usable[choice];
        s.bag.splice(s.bag.indexOf(key), 1);
        const result = ITEMS[key].use(s);
        changed();
        pop("hero", result, "#7bd88f");
        await show(`Rook uses ${ITEMS[key].icon} ${ITEMS[key].name}. ${result}!`);
      } else if (cmd === "defend") {
        defending = true;
        await show("🛡️ Rook braces for the attack. (Damage reduced this turn.)");
      } else if (cmd === "run") {
        if (Math.random() < 0.6) {
          await show("🏃 Got away safely!");
          return "run";
        }
        await show("Couldn't escape!");
      }

      if (hp <= 0) break;

      // ---------------- enemy turn
      await anim(setFoeAnim, "attack", 350);
      const dmg = enemyDamage(enemy, defending);
      s.hp = Math.max(0, s.hp - dmg);
      changed();
      pop("hero", `-${dmg}`, "#ff8a95");
      await anim(setHeroAnim, "hurt");
      await show(`${enemy.name} attacks! Rook takes ${dmg} damage.`);
      if (s.hp <= 0) {
        await show("💀 Rook collapses...");
        return "lose";
      }
    }

    // ---------------- victory
    setFoeAnim("dead");
    s.coins += enemy.gold;
    const ups = gainExp(s, enemy.exp);
    let drop = "";
    if (Math.random() < 0.3) { s.bag.push("bread"); drop = "\nIt dropped a 🍞 Bread!"; }
    changed();
    await show(`🏆 Victory! ${enemy.name} is defeated.\n\n+${enemy.exp} EXP   +${enemy.gold} 🪙${drop}`);
    for (const m of ups) await show(m);
    return "win";
  }

  useEffect(() => {
    if (started.current) return; // React StrictMode runs effects twice in dev
    started.current = true;
    run().then(onDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- keyboard
  useEffect(() => {
    function onKey(e) {
      if (e.repeat || Date.now() - (view.at || 0) < 220) return;
      const ok = ["Space", "Enter", "KeyJ"].includes(e.code);
      const n = Number(e.key);
      if (view.kind === "msg" && ok) answer(true);
      if (view.kind === "menu") {
        if (["ArrowUp", "KeyW"].includes(e.code)) setCursor((c) => (c + COMMANDS.length - 1) % COMMANDS.length);
        if (["ArrowDown", "KeyS"].includes(e.code)) setCursor((c) => (c + 1) % COMMANDS.length);
        if (ok) answer(cursor);
        if (n >= 1 && n <= COMMANDS.length) answer(n - 1);
      }
      if (view.kind === "ask" && n >= 1 && n <= view.order.length) answer(n - 1);
      if (view.kind === "items") {
        if (e.code === "Escape") answer(-1);
        if (n >= 1 && n <= view.items.length) answer(n - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, cursor]);

  const noFocus = (e) => e.preventDefault();
  const pct = (v, m) => `${Math.max(0, (v / m) * 100)}%`;

  return (
    <div className={`battle theme-${battle.theme}`}>
      <div className="battle-scene">
        <div className={`foe ${foeAnim}`}>
          <div className="foe-name">{enemy.name}</div>
          <div className="bar foe-bar"><span style={{ width: pct(enemyHp, enemy.hp) }} /></div>
          {enemy.image
            ? <img className="foe-sprite foe-img" src={enemy.image} alt={enemy.name} style={{ "--foe-h": `${enemy.imgHeight || 150}px` }} />
            : <div className="foe-sprite">{enemy.emoji}</div>}
          {fx?.who === "foe" && <div key={fx.key} className="dmg" style={{ color: fx.color }}>{fx.text}</div>}
        </div>
        <div className={`ally ${heroAnim}`}>
          <HeroSprite />
          {fx?.who === "hero" && <div key={fx.key} className="dmg" style={{ color: fx.color }}>{fx.text}</div>}
        </div>
      </div>

      <div className="battle-ui">
        <div className={`ff-window main ${view.style === "error" ? "is-error" : ""}`}>
          {view.kind === "msg" && (
            <div className="ff-msg" onClick={() => answer(true)}>
              <p>{view.text}</p>
              {view.text && <div className="next">▼</div>}
            </div>
          )}
          {view.kind === "menu" && (
            <div className="ff-menu">
              {COMMANDS.map((c, i) => {
                const disabled = c.id === "magic" && !s.learned.zap;
                return (
                  <button key={c.id} className={`ff-cmd ${i === cursor ? "on" : ""}`} tabIndex={-1}
                    onMouseDown={noFocus} onMouseEnter={() => setCursor(i)} onClick={() => answer(i)}>
                    <span className="hand">{i === cursor ? "▶" : ""}</span>
                    {disabled ? "✨ ???" : c.label}
                    {c.id === "magic" && s.learned.zap && <span className="mp-cost">zap({magicPower(s)}) · {magicCost(s)} MP</span>}
                  </button>
                );
              })}
            </div>
          )}
          {view.kind === "ask" && (
            <div className="ff-ask">
              <div className="ask-label">{view.label}{view.q.hard && <span className="ask-hard">🔥 HARDEST RIDDLE</span>}{view.q.exam && <span className="ask-exam">🎓 1Z0-808 EXAM-STYLE · critical hit if right</span>}</div>
              {view.q.exam && <div className="ask-objective">Exam objective: {view.q.objective}</div>}
              {view.q.code && <pre className="code">{view.q.code}</pre>}
              <p className="ask-prompt">{view.q.prompt}</p>
              {view.q.hard && s.flags["clue:" + view.q.topic] && <p className="ask-clue">🪨 Clue Stone: {view.q.clue}</p>}
              <div className="choices">
                {view.order.map((oi, i) => (
                  <button key={i} className="choice" tabIndex={-1} onMouseDown={noFocus} onClick={() => answer(i)}>
                    <span className="choice-num">{i + 1}</span>
                    <span className="choice-code">{view.q.options[oi]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {view.kind === "items" && (
            <div className="ff-menu">
              {view.items.map((key, i) => (
                <button key={i} className="ff-cmd" tabIndex={-1} onMouseDown={noFocus} onClick={() => answer(i)}>
                  <span className="hand">{i + 1}</span> {ITEMS[key].icon} {ITEMS[key].name}
                  <span className="mp-cost">{ITEMS[key].text}</span>
                </button>
              ))}
              <button className="ff-cmd" tabIndex={-1} onMouseDown={noFocus} onClick={() => answer(-1)}>
                <span className="hand">⎋</span> Back
              </button>
            </div>
          )}
        </div>

        <div className="ff-window status">
          <div className="st-name">Rook <span>Lv {s.level}</span></div>
          <div className="st-row">HP <b>{s.hp}/{s.maxHp}</b></div>
          <div className="bar hp-bar"><span style={{ width: pct(s.hp, s.maxHp) }} /></div>
          <div className="st-row">MP <b>{s.mp}/{s.maxMp}</b></div>
          <div className="bar mp-bar"><span style={{ width: pct(s.mp, s.maxMp) }} /></div>
          <div className="st-row small">EXP {s.exp}/{expToNext(s.level)}</div>
        </div>
      </div>
    </div>
  );
}

// The ninja hero, facing the enemy, idling.
function HeroSprite() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current.getContext("2d");
    let raf;
    const t0 = performance.now();
    const draw = (now) => {
      const t = (now - t0) / 1000;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, 120, 140);
      c.setTransform(2.6, 0, 0, 2.6, 0, 0);
      c.fillStyle = "rgba(0,0,0,.3)";
      c.beginPath();
      c.ellipse(23, 44, 12, 4, 0, 0, 7);
      c.fill();
      paintNinja(c, 23, 28 + Math.sin(t * 3) * 1, "left", t * 0.6, false, t);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={120} height={140} className="hero-sprite" />;
}
