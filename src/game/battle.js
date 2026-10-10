// =====================================================================
//  BATTLE RULES — Final Fantasy style, but every hit is a Java question.
//  The battle SCREEN is in src/BattleScreen.jsx; the numbers live here.
// =====================================================================

import { QUESTIONS } from "./questions.js";
import { EXAM } from "./exam.js";

// topic = which questions this enemy asks ("all" = everything you've studied)
export const ENEMIES = {
  bug:    { name: "Bridge Bug",    emoji: "🐛", hp: 8,  atk: 3, exp: 8,  gold: 3, topic: "methods" },
  beetle: { name: "Syntax Beetle", emoji: "🐞", hp: 10, atk: 3, exp: 10, gold: 3, topic: "params" },
  // `image` = a picture shown in battle (files in /public). `sprite` = how it's drawn on the map.
  cobra:  { name: "Wilds Cobra",   emoji: "🐍", hp: 15, atk: 5, exp: 14, gold: 5, topic: "encap",
            image: "/sprites/cobra.png", sprite: "cobra" },
  ghost:  { name: "Null Ghost",    emoji: "👻", hp: 14, atk: 4, exp: 14, gold: 5, topic: "static" },
  slime:  { name: "Leak Slime",    emoji: "🦠", hp: 16, atk: 5, exp: 16, gold: 6, topic: "encap" },
  minion: { name: "Leaky Minion",  emoji: "🪲", hp: 14, atk: 5, exp: 14, gold: 5, topic: "all" },
};

export const ITEMS = {
  bread: { name: "Bread", icon: "🍞", text: "Restores 8 HP", use: (s) => { s.hp = Math.min(s.maxHp, s.hp + 8); return "HP +8"; } },
  gem:   { name: "Gem",   icon: "💎", text: "Restores 6 MP", use: (s) => { s.mp = Math.min(s.maxMp, s.mp + 6); return "MP +6"; } },
};

// Topics you've already studied, so enemies can throw in review questions.
export function studiedTopics(s) {
  const t = ["methods"];
  if (s.flags.metTamsin) t.push("params"); // parameters are taught in Method Village
  if (s.flags.metOrrin) t.push("static");
  if (s.flags.metBrannoc || s.flags.metVessa) t.push("encap");
  return t;
}

// How likely the next question is a hard 1Z0-808 exam-style one.
// Starts low, grows with your level and how far you've travelled.
export function examChance(s, topic) {
  const studied = studiedTopics(s).length;
  const chance = 0.15 + 0.08 * (s.level - 1) + 0.07 * (studied - 1) + (topic === "all" ? 0.25 : 0);
  return Math.min(0.65, chance);
}

// Pick a question the player has seen the least, never repeating in one battle.
export function pickQuestion(s, topic, usedIds) {
  const studied = studiedTopics(s);
  let t = topic;
  if (topic === "all") t = studied[Math.floor(Math.random() * studied.length)];
  else if (studied.length > 1 && Math.random() < 0.25) {
    const others = studied.filter((x) => x !== topic);
    t = others[Math.floor(Math.random() * others.length)]; // a review question
  }
  const bank = Math.random() < examChance(s, topic) ? EXAM : QUESTIONS;
  let pool = bank[t].filter((q) => !usedIds.has(q.id));
  if (pool.length === 0) pool = [...QUESTIONS[t], ...EXAM[t]].filter((q) => !usedIds.has(q.id));
  if (pool.length === 0) pool = QUESTIONS[t];
  s.qSeen = s.qSeen || {};
  const least = Math.min(...pool.map((q) => s.qSeen[q.id] || 0));
  const fresh = pool.filter((q) => (s.qSeen[q.id] || 0) === least);
  const q = fresh[Math.floor(Math.random() * fresh.length)];
  s.qSeen[q.id] = (s.qSeen[q.id] || 0) + 1;
  usedIds.add(q.id);
  return q;
}

const roll = (n) => Math.floor(Math.random() * (n + 1));

export const attackDamage = (s) => 4 + s.level + (s.atkBonus || 0) + roll(2); // atkBonus: the forged blade
export const magicPower = (s) => (s.learned.args ? s.power : 1);
export const magicCost = (s) => magicPower(s) * 2;
export const magicDamage = (s) => magicPower(s) * 2 * 2 + s.level + roll(1);
export const enemyDamage = (enemy, defending) => Math.max(1, enemy.atk + roll(2) - (defending ? 2 : 0));

export const expToNext = (level) => level * 20;

// Adds EXP and returns a list of level-up messages.
export function gainExp(s, amount) {
  const msgs = [];
  s.exp += amount;
  while (s.exp >= expToNext(s.level)) {
    s.exp -= expToNext(s.level);
    s.level++;
    s.maxHp += 4;
    s.maxMp += 2;
    s.hp = s.maxHp;
    s.mp = s.maxMp;
    msgs.push(`⭐ LEVEL UP! Rook is now level ${s.level}.\nMax HP ${s.maxHp} · Max MP ${s.maxMp} · fully healed!`);
  }
  return msgs;
}

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
