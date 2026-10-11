// =====================================================================
//  ENGINE — walking, collision, drawing, zapping, starting battles.
//  It knows nothing about the story: all content lives in world.js.
// =====================================================================

import { MAPS } from "./world.js";
import { SCROLLS } from "./scrolls.js";
import { ENEMIES } from "./battle.js";
import { ADMIN, ADMIN_ORDER } from "./admin.js";
import { isTouch } from "./controls.js";
import { paintSmith, paintCobra, paintKnight, paintForge, paintAnvil, paintRune, paintWildsTile } from "./art.js";

export const TILE = 40;
export const COLS = 20;
export const ROWS = 14;

const MOVE_TIME = 0.14; // seconds to walk one tile
const SOLID = new Set(["T", "~", "W", "H", "r", "R", "B", "D", "o", "g", "C"]);
const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};
const KEY_DIR = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
};
const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

export function newState() {
  return {
    map: "village",
    x: MAPS.village.spawn.x,
    y: MAPS.village.spawn.y,
    hp: 20,
    maxHp: 20,
    mp: 6,
    maxMp: 6,
    level: 1,
    exp: 0,
    coins: 5,
    bag: ["bread"],
    fragments: [],
    args: [],
    power: 1,
    learned: { zap: false, args: false },
    flags: {},
    scrolls: [],
    log: [],
    stats: { zapped: 0, errors: 0, steps: 0, right: 0, wrong: 0 },
    qSeen: {},
  };
}

export class Game {
  constructor(canvas, state, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.s = state;
    this.ui = ui;
    this.held = []; // direction keys currently held, newest last
    this.busy = false; // a script (dialogue) is running
    this.bolts = [];
    this.floats = [];
    this.time = 0;
    this.zapCd = 0;
    this.hurtCd = 0;
    this.bumpCd = 0;
    this.grace = 0; // after running away, enemies leave you alone briefly
    this.shake = 0;
    this.bossFlash = 0;
    this.api = this.makeApi();
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.frame = this.frame.bind(this);
  }

  // ------------------------------------------------------------- lifecycle
  start() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", () => (this.held = []));
    this.loadMap(this.s.map, this.s.x, this.s.y);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    cancelAnimationFrame(this.raf);
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.frame);
  }

  save() {
    this.s.x = this.player.x;
    this.s.y = this.player.y;
    this.ui.save(this.s);
  }

  paused() {
    return this.busy || this.ui.isBlocking();
  }

  // ------------------------------------------------------------- the api scripts use
  makeApi() {
    const g = this;
    return {
      get s() { return g.s; },
      say: (who, text, code, style) => g.ui.say(who, text, code, style),
      choose: (who, text, options, code) => g.ui.choose(who, text, options, code),
      assemble: (opts) => g.ui.assemble(opts),
      error: (who, err, why) => {
        g.s.stats.errors++;
        g.log(err.split("\n")[0], "err");
        return g.ui.say(who, why, err, "error");
      },
      log: (text, kind) => g.log(text, kind),
      toast: (text) => g.ui.toast(text),
      flag: (name, value = true) => { g.s.flags[name] = value; g.changed(); },
      scroll: (id) => {
        if (!g.s.scrolls.includes(id)) {
          g.s.scrolls.push(id);
          g.ui.toast(`📜 New scroll: ${SCROLLS[id].title}  (press L)`);
        }
      },
      // Move to another map once the current script ends (so the new map's onEnter can run).
      go: (map, x, y) => { g.pendingWarp = { map, x, y }; },
      hurt: (n) => g.hurt(n, true),
      bossHit: () => { g.bossFlash = 0.6; g.shake = 0.3; },
      victory: () => g.ui.victory(),
    };
  }

  log(text, kind = "out") {
    this.s.log.push({ text, kind });
    if (this.s.log.length > 40) this.s.log.shift();
    this.changed();
  }

  changed() {
    this.ui.changed();
  }

  async run(script, ...args) {
    if (this.busy) return;
    this.busy = true;
    try {
      await script(this.api, ...args);
    } catch (err) {
      console.error(err);
    } finally {
      this.busy = false;
      this.save();
      this.changed();
    }
    const w = this.pendingWarp;
    if (w) {
      this.pendingWarp = null;
      this.loadMap(w.map, w.x, w.y);
    }
  }

  // ------------------------------------------------------------- maps
  loadMap(id, x, y) {
    this.map = MAPS[id];
    this.mapId = id;
    this.s.map = id;
    this.entities = this.map.entities();
    this.bolts = [];
    this.player = { x, y, fromX: x, fromY: y, t: 1, moving: false, dir: this.player?.dir || "down" };
    this.entry = { x, y };
    this.save();
    this.changed();
    this.ui.banner(this.map.name);
    this.ui.music(this.map.music || null);
    if (this.map.onEnter) this.run(this.map.onEnter);
  }

  tile(x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return "W";
    return this.map.tiles[y][x];
  }

  visible(e) {
    return !e.dead && (!e.visible || e.visible(this.s));
  }

  isSolid(e) {
    return typeof e.solid === "function" ? e.solid(this.s) : !!e.solid;
  }

  entitiesAt(x, y) {
    return this.entities.filter((e) => this.visible(e) && e.x === x && e.y === y);
  }

  blocked(x, y) {
    if (SOLID.has(this.tile(x, y))) return true;
    return this.entitiesAt(x, y).some((e) => this.isSolid(e));
  }

  spawn(e) {
    this.entities.push(e);
  }

  // ------------------------------------------------------------- input
  onKeyDown(e) {
    const dir = KEY_DIR[e.code];
    if (dir || e.code === "Space") e.preventDefault();
    if (dir) {
      this.held = this.held.filter((d) => d !== dir);
      this.held.push(dir);
      return;
    }
    if (e.ctrlKey && e.shiftKey && e.code === "KeyY") {
      e.preventDefault();
      if (!e.repeat && !this.paused()) this.adminSkip();
      return;
    }
    if (e.repeat || this.paused()) return;
    if (e.code === "KeyJ" || e.code === "Enter") this.interact();
    else if (e.code === "KeyK") this.zap();
    else if (e.code === "KeyL") this.ui.toggleJournal();
    else if (["Digit1", "Digit2", "Digit3"].includes(e.code)) this.setPower(Number(e.code.slice(5)));
  }

  // ADMIN (Ctrl+Shift+Y): finish this area (and every earlier one), go to the next map.
  adminSkip() {
    const index = ADMIN_ORDER.indexOf(this.mapId);
    if (index < 0) return;
    for (let k = 0; k <= index; k++) ADMIN[ADMIN_ORDER[k]].complete(this.s);
    this.s.hp = this.s.maxHp;
    this.s.mp = this.s.maxMp;
    this.log(`[ADMIN] ${this.map.name}: all challenges completed`, "ok");
    const next = ADMIN[this.mapId].next;
    if (next) {
      this.loadMap(next.map, next.x, next.y);
      this.ui.toast(`🛠️ ADMIN: skipped to ${this.map.name}`);
    } else {
      this.entities.filter((e) => e.kind === "bug" || e.kind === "shot").forEach((e) => (e.dead = true));
      this.save();
      this.changed();
      this.ui.toast("🛠️ ADMIN: boss defeated");
      this.ui.victory();
    }
  }

  onKeyUp(e) {
    const dir = KEY_DIR[e.code];
    if (dir) this.held = this.held.filter((d) => d !== dir);
  }

  setPower(n) {
    if (!this.s.learned.args) {
      this.ui.toast("You can't choose arguments yet. (Brannoc can teach you.)");
      return;
    }
    this.s.power = n;
    this.log(`// next cast: hero.zap(${n})  returns ${n * 2}`, "out");
  }

  facing() {
    const d = DIRS[this.player.dir];
    return { x: this.player.x + d.dx, y: this.player.y + d.dy };
  }

  interact() {
    if (this.player.moving) return;
    const f = this.facing();
    const target = this.entitiesAt(f.x, f.y).find((e) => e.onUse || e.onBump || e.kind === "bug");
    if (!target) return;
    if (target.kind === "bug") {
      this.fight(target);
      return;
    }
    if (target.kind === "npc" && target.heals && (this.s.hp < this.s.maxHp || this.s.mp < this.s.maxMp)) {
      this.s.hp = this.s.maxHp;
      this.s.mp = this.s.maxMp;
      this.ui.toast(`❤️ ${target.name} patches you up. HP and MP restored!`);
      this.changed();
    }
    this.run(target.onUse || target.onBump, target);
  }

  // Touching (or zapping) an enemy starts a turn-based battle.
  fight(e, firstStrike = 0) {
    if (this.busy || e.dead) return;
    if (e.requires && !e.requires(this.s)) {
      if (e.onBump) this.run(e.onBump, e);
      return;
    }
    const enemy = ENEMIES[e.enemy] || ENEMIES.bug;
    this.held = [];
    this.run(async () => {
      this.log(`// battle: ${enemy.name}`, "out");
      // an enemy's own song (e.g. cobras) wins over the map's battle song
      const map = this.map;
      const fightSong = enemy.music || map.battleMusic;
      if (fightSong) this.ui.music(fightSong);
      const result = await this.ui.battle({ enemy, first: firstStrike, theme: this.map.theme });
      if (fightSong && this.map === map) this.ui.music(map.music || null);
      if (result === "win") {
        e.dead = true;
        if (e.persist) this.s.flags["dead:" + e.id] = true;
        this.s.stats.zapped++;
        this.log(`${enemy.name} defeated!`, "ok");
      } else if (result === "run") {
        this.grace = 2;
        e.cd = 2;
      }
    });
  }

  zap() {
    if (!this.s.learned.zap) {
      this.ui.toast("You don't know any spells yet. Talk to Old Tamsin.");
      return;
    }
    if (this.zapCd > 0) return;
    this.zapCd = 0.32;
    const power = this.s.learned.args ? this.s.power : 1;
    const d = DIRS[this.player.dir];
    this.bolts.push({
      fx: this.player.x, fy: this.player.y, dx: d.dx, dy: d.dy,
      power, dmg: power * 2, life: 1.2,
    });
  }

  // ------------------------------------------------------------- update
  update(dt) {
    this.time += dt;
    this.zapCd -= dt;
    this.hurtCd -= dt;
    this.bumpCd -= dt;
    this.grace -= dt;
    this.shake = Math.max(0, this.shake - dt);
    this.bossFlash = Math.max(0, this.bossFlash - dt);
    this.floats = this.floats.filter((f) => (f.t += dt) < 1);
    if (this.dead) this.fallT = Math.min(1, (this.fallT || 0) + dt / 0.4);

    if (this.paused()) return;

    if (this.s.hp <= 0) {
      this.run(this.die.bind(this));
      return;
    }

    this.updatePlayer(dt);
    this.updateBolts(dt);
    for (const e of this.entities) {
      if (!this.visible(e)) continue;
      if (e.kind === "bug" && e.roam) this.updateBug(e, dt);
      if (e.kind === "shot") this.updateShot(e, dt);
      if (e.update) e.update(dt, this);
      if (e.t !== undefined && e.kind === "bug") e.t = Math.min(1, e.t + dt / 0.18);
    }
    this.entities = this.entities.filter((e) => !e.dead);
  }

  updatePlayer(dt) {
    const p = this.player;
    if (p.moving) {
      p.t += dt / MOVE_TIME;
      if (p.t >= 1) {
        p.t = 1;
        p.moving = false;
        this.arrive();
        if (this.paused()) return;
      } else return;
    }
    const dir = this.held[this.held.length - 1];
    if (!dir) return;
    p.dir = dir;
    const nx = p.x + DIRS[dir].dx;
    const ny = p.y + DIRS[dir].dy;
    if (this.blocked(nx, ny)) {
      this.bump(nx, ny);
      return;
    }
    p.fromX = p.x;
    p.fromY = p.y;
    p.x = nx;
    p.y = ny;
    p.t = 0;
    p.moving = true;
    this.s.stats.steps++;
  }

  arrive() {
    const { x, y } = this.player;
    for (const e of this.entitiesAt(x, y)) {
      if (e.kind === "item") {
        this.s.flags["got:" + e.id] = true;
        e.onPick(this.api);
        this.floats.push({ x, y, text: e.label, color: e.color, t: 0 });
        this.save();
        this.changed();
      }
    }
    const w = this.entitiesAt(x, y).find((e) => e.kind === "warp");
    if (w && w.when && !w.when(this.s)) {
      // locked: step back to where we came from
      const p = this.player;
      p.x = p.fromX;
      p.y = p.fromY;
      p.fromX = p.x;
      p.fromY = p.y;
      if (w.onBlocked) this.run(w.onBlocked);
    } else if (w) this.loadMap(w.to, w.tx, w.ty);
    else this.save();
  }

  bump(x, y) {
    if (this.bumpCd > 0) return;
    this.bumpCd = 0.45;
    const e = this.entitiesAt(x, y).find((en) => en.kind === "bug" || en.onBump);
    if (!e) return;
    if (e.kind === "bug") {
      if (this.grace <= 0) this.fight(e);
    } else if (e.onBump) this.run(e.onBump, e);
  }

  updateBug(b, dt) {
    b.cd = (b.cd ?? Math.random()) - dt;
    if (b.cd > 0) return;
    b.cd = 0.45 + Math.random() * 0.5;
    const p = this.player;
    let dir;
    const dist = Math.abs(p.x - b.x) + Math.abs(p.y - b.y);
    if (dist < 6 && Math.random() < 0.55) {
      // chase the player a little
      if (Math.abs(p.x - b.x) > Math.abs(p.y - b.y)) dir = p.x > b.x ? "right" : "left";
      else dir = p.y > b.y ? "down" : "up";
    } else {
      dir = ["up", "down", "left", "right"][Math.floor(Math.random() * 4)];
    }
    const nx = b.x + DIRS[dir].dx;
    const ny = b.y + DIRS[dir].dy;
    if (nx === p.x && ny === p.y) {
      if (this.grace <= 0 && !p.moving) this.fight(b);
      return;
    }
    const special = this.entitiesAt(nx, ny).some((e) => e.kind === "warp" || e.kind === "item");
    if (this.blocked(nx, ny) || special) return;
    b.fromX = b.x;
    b.fromY = b.y;
    b.x = nx;
    b.y = ny;
    b.t = 0;
  }

  updateShot(e, dt) {
    e.fx += e.vx * dt;
    e.fy += e.vy * dt;
    if (e.fy > ROWS || SOLID.has(this.tile(Math.round(e.fx), Math.round(e.fy)))) {
      e.dead = true;
      return;
    }
    const pp = this.playerPos();
    if (Math.abs(pp.x - e.fx) < 0.6 && Math.abs(pp.y - e.fy) < 0.6) {
      e.dead = true;
      this.hurt(e.dmg);
    }
  }

  updateBolts(dt) {
    for (const b of this.bolts) {
      b.fx += b.dx * 13 * dt;
      b.fy += b.dy * 13 * dt;
      b.life -= dt;
      const tx = Math.round(b.fx);
      const ty = Math.round(b.fy);
      if (b.life <= 0 || SOLID.has(this.tile(tx, ty))) {
        b.dead = true;
        continue;
      }
      const boss = this.entities.find((e) => e.kind === "boss" && this.visible(e));
      if (boss && Math.abs(b.fx - boss.x) < 1.1 && b.fy < 3.2) {
        b.dead = true;
        this.floats.push({ x: boss.x, y: 2.5, text: "NO EFFECT", color: "#a99fc4", t: 0 });
        if (!this.s.flags.toldNoEffect) {
          this.s.flags.toldNoEffect = true;
          this.ui.toast("Zaps bounce off! Seal the leaks 💧 with J instead.");
        }
        continue;
      }
      const hit = this.entitiesAt(tx, ty).find((e) => e.kind === "bug");
      if (hit) {
        b.dead = true;
        this.log(`hero.zap(${b.power});  // returned ${b.dmg} — first strike!`, "cmd");
        this.fight(hit, b.dmg);
        continue;
      }
      if (this.entitiesAt(tx, ty).some((e) => this.isSolid(e))) b.dead = true;
    }
    this.bolts = this.bolts.filter((b) => !b.dead);
  }

  hurt(n, force = false) {
    if (!force && this.hurtCd > 0) return;
    this.hurtCd = 1;
    this.s.hp = Math.max(0, this.s.hp - n);
    this.shake = 0.25;
    const pp = this.playerPos();
    this.floats.push({ x: pp.x, y: pp.y, text: `-${n} HP`, color: "#ef6f7a", t: 0 });
    this.changed();
  }

  // HP hit 0: the hero falls over, the music stops, and the Game Over
  // screen takes it from there. Retry starts a brand-new game, so this
  // never returns.
  async die() {
    this.dead = true;
    this.held = [];
    this.ui.music(null);
    this.log("HeroDefeatedException: hp == 0", "err");
    await new Promise((r) => setTimeout(r, 900)); // let the fall play out
    await this.ui.gameOver();
  }

  playerPos() {
    const p = this.player;
    return {
      x: p.fromX + (p.x - p.fromX) * p.t,
      y: p.fromY + (p.y - p.fromY) * p.t,
    };
  }

  // ------------------------------------------------------------- drawing
  render() {
    const c = this.ctx;
    c.save();
    if (this.shake > 0) c.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) this.drawTile(x, y);

    const drawables = this.entities.filter((e) => this.visible(e) && e.kind !== "warp");
    drawables.sort((a, b) => (a.fy ?? a.y) - (b.fy ?? b.y));
    for (const e of drawables) this.drawEntity(e);
    this.drawPlayer();
    for (const b of this.bolts) this.drawBolt(b);
    for (const e of drawables) if (e.tag) this.drawTag(e);
    this.drawHint();
    for (const f of this.floats) {
      c.globalAlpha = 1 - f.t;
      this.text(f.text, f.x * TILE + 20, f.y * TILE - f.t * 30, 14, f.color, true);
      c.globalAlpha = 1;
    }
    if (this.bossFlash > 0) {
      c.fillStyle = `rgba(255,255,255,${this.bossFlash * 0.5})`;
      c.fillRect(0, 0, COLS * TILE, ROWS * TILE);
    }
    c.restore();
  }

  hash(x, y) {
    let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  drawTile(x, y) {
    const c = this.ctx;
    const ch = this.tile(x, y);
    const px = x * TILE;
    const py = y * TILE;
    const theme = this.map.theme;
    const r = this.hash(x, y);
    if (theme === "wilds" && paintWildsTile(c, ch, x, y, (tx, ty) => this.tile(tx, ty), (a, b) => this.hash(a, b), this.time)) return;

    const grass = () => {
      c.fillStyle = theme === "plains" ? "#7aa84a" : "#5a9445";
      c.fillRect(px, py, TILE, TILE);
      c.fillStyle = theme === "plains" ? "#8dbb57" : "#68a551";
      for (let i = 0; i < 4; i++) {
        const gx = px + this.hash(x * 7 + i, y * 3) * 36;
        const gy = py + this.hash(x * 3, y * 7 + i) * 36;
        c.fillRect(gx, gy, 2, 5);
      }
    };
    const floor = () => {
      if (theme === "house") {
        // wooden planks, staggered so it doesn't look like a grid
        c.fillStyle = "#9a6a3e";
        c.fillRect(px, py, TILE, TILE);
        c.fillStyle = "#a8774a";
        c.fillRect(px, py + 1, TILE, 8);
        c.fillRect(px, py + 21, TILE, 8);
        c.strokeStyle = "rgba(60,35,15,.45)";
        c.beginPath();
        c.moveTo(px, py + 20.5); c.lineTo(px + TILE, py + 20.5);
        c.moveTo(px, py + 0.5); c.lineTo(px + TILE, py + 0.5);
        const off = (y % 2) * 20;
        c.moveTo(px + off + 0.5, py); c.lineTo(px + off + 0.5, py + 20);
        c.moveTo(px + ((off + 20) % 40) + 0.5, py + 20); c.lineTo(px + ((off + 20) % 40) + 0.5, py + TILE);
        c.stroke();
        return;
      }
      const pal = {
        spire: ["#4b5675", "#56627f"],
        castle: ["#6d6a73", "#7a7780"],
        boss: ["#2a1d3a", "#33244a"],
      }[theme] || ["#6d6a73", "#7a7780"];
      c.fillStyle = (x + y) % 2 ? pal[0] : pal[1];
      c.fillRect(px, py, TILE, TILE);
      c.strokeStyle = "rgba(0,0,0,.18)";
      c.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      if (theme === "boss" && r > 0.8) {
        c.strokeStyle = "rgba(190,90,255,.5)";
        c.beginPath();
        c.moveTo(px + 6, py + 10);
        c.lineTo(px + 20, py + 22);
        c.lineTo(px + 30, py + 18);
        c.stroke();
      }
    };
    const water = () => {
      c.fillStyle = "#3772b8";
      c.fillRect(px, py, TILE, TILE);
      c.strokeStyle = "rgba(255,255,255,.35)";
      c.lineWidth = 2;
      const o = Math.sin(this.time * 2 + x + y * 0.7) * 4;
      c.beginPath();
      c.moveTo(px + 6 + o, py + 14);
      c.lineTo(px + 18 + o, py + 14);
      c.moveTo(px + 20 - o, py + 28);
      c.lineTo(px + 32 - o, py + 28);
      c.stroke();
      c.lineWidth = 1;
    };
    const pave = () => {
      c.fillStyle = "#b8ad94";
      c.fillRect(px, py, TILE, TILE);
      if (r > 0.75) {
        c.fillStyle = "rgba(255,255,255,.12)";
        c.fillRect(px + 4 + r * 20, py + 4 + r * 8, 10, 7);
      }
      c.strokeStyle = "rgba(80,68,48,.3)";
      c.beginPath();
      c.moveTo(px, py + 0.5); c.lineTo(px + TILE, py + 0.5);
      c.moveTo(px, py + 20.5); c.lineTo(px + TILE, py + 20.5);
      c.moveTo(px + 20.5, py); c.lineTo(px + 20.5, py + 20);
      c.moveTo(px + 0.5, py + 20); c.lineTo(px + 0.5, py + TILE);
      c.stroke();
    };
    const clip = (draw) => {
      c.save();
      c.beginPath();
      c.rect(px, py, TILE, TILE);
      c.clip();
      draw();
      c.restore();
    };

    switch (ch) {
      // ---- town tiles
      case "p": pave(); break;
      case "^":
        pave();
        for (let i = 0; i < 4; i++) {
          c.fillStyle = "#8f846d";
          c.fillRect(px, py + i * 10 + 4, TILE, 6);
          c.fillStyle = "#d3c8ae";
          c.fillRect(px, py + i * 10, TILE, 2);
        }
        break;
      case "R":
        c.fillStyle = "#6f6455";
        c.fillRect(px, py, TILE, TILE);
        clip(() => {
          c.fillStyle = "#857a68";
          for (let i = 0; i < 4; i++) {
            const off = i % 2 ? -10 : 0;
            for (let j = 0; j < 3; j++) c.fillRect(px + off + j * 20 + 1, py + i * 10 + 1, 18, 7);
          }
        });
        if (this.tile(x, y + 1) !== "R") {
          c.fillStyle = "#4e463c";
          c.fillRect(px, py + TILE - 5, TILE, 5);
        }
        break;
      case "B":
      case "D":
        c.fillStyle = "#c7b38c";
        c.fillRect(px, py, TILE, TILE);
        c.strokeStyle = "rgba(90,70,40,.3)";
        c.beginPath();
        for (let i = 1; i < 4; i++) { c.moveTo(px, py + i * 10 + 0.5); c.lineTo(px + TILE, py + i * 10 + 0.5); }
        c.stroke();
        if (ch === "D") {
          c.fillStyle = "#5a3a22";
          c.beginPath();
          c.moveTo(px + 9, py + TILE);
          c.lineTo(px + 9, py + 16);
          c.arc(px + 20, py + 16, 11, Math.PI, 0);
          c.lineTo(px + 31, py + TILE);
          c.fill();
          c.fillStyle = "#e0b45a";
          c.fillRect(px + 25, py + 26, 3, 3);
        } else {
          c.fillStyle = "#e9dcbc";
          c.fillRect(px + 10, py + 9, 20, 18);
          c.fillStyle = "#33303d";
          c.fillRect(px + 12, py + 11, 16, 14);
          c.fillStyle = "#e9dcbc";
          c.fillRect(px + 19, py + 11, 2, 14);
          c.fillStyle = "#9c8a66";
          c.fillRect(px + 8, py + 27, 24, 3);
        }
        if (this.tile(x, y - 1) === "R") {
          c.fillStyle = "rgba(0,0,0,.25)";
          c.fillRect(px, py, TILE, 5);
        }
        break;
      case "o":
        pave();
        c.fillStyle = "rgba(0,0,0,.25)";
        c.beginPath();
        c.ellipse(px + 20, py + 34, 13, 4, 0, 0, 7);
        c.fill();
        c.fillStyle = "#8a5a32";
        c.fillRect(px + 9, py + 10, 22, 24);
        c.fillStyle = "#a8703f";
        c.beginPath();
        c.ellipse(px + 20, py + 10, 11, 5, 0, 0, 7);
        c.fill();
        c.fillStyle = "#4a4038";
        c.fillRect(px + 9, py + 16, 22, 3);
        c.fillRect(px + 9, py + 27, 22, 3);
        break;
      case "g":
        pave();
        c.fillStyle = "#8c7f68";
        c.fillRect(px + 6, py + 22, 28, 14);
        c.fillStyle = "#2f6b2f";
        c.beginPath();
        c.arc(px + 14, py + 19, 9, 0, 7);
        c.arc(px + 26, py + 19, 9, 0, 7);
        c.arc(px + 20, py + 12, 9, 0, 7);
        c.fill();
        c.fillStyle = "#3d8a3d";
        c.beginPath();
        c.arc(px + 17, py + 10, 4, 0, 7);
        c.fill();
        break;
      // ---- nature tiles
      case ".": grass(); break;
      case ",":
        c.fillStyle = "#c9a66b";
        c.fillRect(px, py, TILE, TILE);
        c.fillStyle = "#b8935a";
        c.fillRect(px + r * 30, py + 8, 4, 3);
        c.fillRect(px + 10, py + 20 + r * 12, 3, 3);
        break;
      case "s":
        c.fillStyle = "#e3d08f";
        c.fillRect(px, py, TILE, TILE);
        break;
      case "f": {
        grass();
        const cols = ["#ff7eb6", "#ffe066", "#ffffff", "#b388ff"];
        for (let i = 0; i < 3; i++) {
          c.fillStyle = cols[Math.floor(this.hash(x + i, y) * 4)];
          c.beginPath();
          c.arc(px + 8 + i * 11, py + 12 + this.hash(y, x + i) * 18, 3, 0, 7);
          c.fill();
        }
        break;
      }
      case "T":
        grass();
        c.fillStyle = "#6b4423";
        c.fillRect(px + 16, py + 24, 8, 14);
        c.fillStyle = "#2f6b2f";
        c.beginPath();
        c.arc(px + 20, py + 17, 15, 0, 7);
        c.fill();
        c.fillStyle = "#3d8a3d";
        c.beginPath();
        c.arc(px + 15, py + 13, 7, 0, 7);
        c.fill();
        break;
      case "~": water(); break;
      case "b":
        water();
        c.fillStyle = "#9a6b3c";
        c.fillRect(px, py + 4, TILE, TILE - 8);
        c.fillStyle = "#7d5530";
        for (let i = 0; i < 4; i++) c.fillRect(px + i * 10 + 8, py + 4, 2, TILE - 8);
        break;
      case "r":
        grass();
        c.fillStyle = "#8a8f99";
        c.beginPath();
        c.ellipse(px + 20, py + 24, 15, 11, 0, 0, 7);
        c.fill();
        c.fillStyle = "#a7acb6";
        c.beginPath();
        c.ellipse(px + 16, py + 20, 6, 4, 0, 0, 7);
        c.fill();
        break;
      case "H": {
        const roof = this.tile(x, y - 1) !== "H";
        if (roof) {
          c.fillStyle = "#a8432f";
          c.fillRect(px, py, TILE, TILE);
          c.fillStyle = "#c25a3f";
          for (let i = 0; i < 4; i++) c.fillRect(px, py + i * 10, TILE, 5);
        } else {
          c.fillStyle = "#e8d3a8";
          c.fillRect(px, py, TILE, TILE);
          c.fillStyle = "#6b4423";
          if (this.tile(x - 1, y) === "H" && this.tile(x + 1, y) === "H") c.fillRect(px + 12, py + 12, 16, 28);
          else {
            c.fillStyle = "#7fc4e8";
            c.fillRect(px + 10, py + 10, 20, 14);
          }
        }
        break;
      }
      case "W": {
        const pal = { spire: "#2f3852", castle: "#4a4750", boss: "#140d1f", house: "#4a2f1d" }[theme] || "#4a4750";
        c.fillStyle = pal;
        c.fillRect(px, py, TILE, TILE);
        c.strokeStyle = "rgba(255,255,255,.08)";
        c.strokeRect(px + 0.5, py + 0.5, TILE / 2, TILE / 2);
        c.strokeRect(px + TILE / 2 + 0.5, py + TILE / 2 + 0.5, TILE / 2 - 1, TILE / 2 - 1);
        break;
      }
      case "_": floor(); break;
      case "$":
        floor();
        c.fillStyle = "#f4c95d";
        c.beginPath();
        c.arc(px + 12 + r * 8, py + 26, 6, 0, 7);
        c.arc(px + 26, py + 22 - r * 6, 7, 0, 7);
        c.fill();
        break;
      default:
        grass();
    }
  }

  emoji(ch, x, y, size = 28) {
    const c = this.ctx;
    c.font = `${size}px ${EMOJI_FONT}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#ffffff"; // emoji take their alpha from fillStyle
    c.fillText(ch, x, y);
  }

  text(str, x, y, size, color, bold) {
    const c = this.ctx;
    c.font = `${bold ? "bold " : ""}${size}px "Courier New", monospace`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.lineWidth = 3;
    c.strokeStyle = "rgba(0,0,0,.8)";
    c.strokeText(str, x, y);
    c.fillStyle = color;
    c.fillText(str, x, y);
  }

  drawEntity(e) {
    const c = this.ctx;
    let x = e.x;
    let y = e.y;
    if (e.kind === "bug" && e.t !== undefined && e.t < 1) {
      x = e.fromX + (e.x - e.fromX) * e.t;
      y = e.fromY + (e.y - e.fromY) * e.t;
    }
    const cx = x * TILE + TILE / 2;
    const cy = y * TILE + TILE / 2;
    const bob = Math.sin(this.time * 3 + e.x) * 2;

    const shadow = (w = 13) => {
      c.fillStyle = "rgba(0,0,0,.25)";
      c.beginPath();
      c.ellipse(cx, cy + 14, w, 4, 0, 0, 7);
      c.fill();
    };

    if (e.sprite === "smith") {
      paintSmith(c, cx, cy - 2, this.time);
      return;
    }

    switch (e.kind) {
      case "door": // the door is already painted by its 'D' tile
        break;
      case "forge":
        paintForge(c, cx, cy, this.time, e.lit(this.s));
        break;
      case "anvil":
        paintAnvil(c, cx, cy);
        break;
      case "well": {
        // soft blue glow so it reads as "magic water"
        const glow = c.createRadialGradient(cx, cy + 4, 2, cx, cy + 4, 30);
        glow.addColorStop(0, `rgba(111,179,239,${0.35 + Math.sin(this.time * 3) * 0.12})`);
        glow.addColorStop(1, "rgba(111,179,239,0)");
        c.fillStyle = glow;
        c.fillRect(cx - 30, cy - 26, 60, 60);
        shadow(17);
        c.fillStyle = "#7d8290"; // stone ring
        c.fillRect(cx - 15, cy, 30, 15);
        c.fillStyle = "#5c616d";
        for (let i = 0; i < 3; i++) c.fillRect(cx - 15 + i * 10 + (i % 2) * 2, cy + 7, 1, 8);
        c.fillRect(cx - 15, cy + 7, 30, 1);
        c.fillStyle = "#9aa0ad";
        c.beginPath();
        c.ellipse(cx, cy, 16, 6, 0, 0, 7);
        c.fill();
        c.fillStyle = "#3d7fc4"; // water
        c.beginPath();
        c.ellipse(cx, cy, 12, 4, 0, 0, 7);
        c.fill();
        c.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(this.time * 4) * 0.3})`;
        c.fillRect(cx - 5 + Math.sin(this.time * 2) * 3, cy - 1, 4, 1);
        c.fillStyle = "#6b4a2b"; // posts and roof
        c.fillRect(cx - 14, cy - 18, 3, 20);
        c.fillRect(cx + 11, cy - 18, 3, 20);
        c.fillStyle = "#8a3b2e";
        c.beginPath();
        c.moveTo(cx - 19, cy - 15);
        c.lineTo(cx, cy - 25);
        c.lineTo(cx + 19, cy - 15);
        c.closePath();
        c.fill();
        c.fillStyle = "#4a3320"; // crank rope + bucket
        c.fillRect(cx - 11, cy - 15, 22, 2);
        c.fillRect(cx - 1, cy - 13, 1, 9);
        c.fillStyle = "#8b6239";
        c.fillRect(cx - 3, cy - 5, 6, 4);
        break;
      }
      case "rune":
        paintRune(c, cx, cy, this.time, e.solved(this.s));
        break;
      case "item": {
        const glow = 0.5 + Math.sin(this.time * 4 + e.x) * 0.3;
        c.fillStyle = e.color + Math.round(glow * 120).toString(16).padStart(2, "0");
        c.beginPath();
        c.arc(cx, cy - 4 + bob, 12, 0, 7);
        c.fill();
        this.text(e.emoji, cx, cy - 4 + bob, 18, e.color, true);
        this.text(e.label, cx, cy + 14, 10, "#ffffff", true);
        break;
      }
      case "gate": {
        const open = !this.isSolid(e);
        if (open) {
          c.strokeStyle = "rgba(123,216,143,.6)";
          c.setLineDash([4, 4]);
          c.strokeRect(cx - 18, cy - 18, 36, 36);
          c.setLineDash([]);
        } else {
          c.fillStyle = "#3a1020";
          c.fillRect(cx - 20, cy - 20, 40, 40);
          c.fillStyle = `rgba(239,111,122,${0.7 + Math.sin(this.time * 5) * 0.3})`;
          for (let i = 0; i < 4; i++) c.fillRect(cx - 16 + i * 10, cy - 20, 4, 40);
          this.text("</>", cx, cy, 11, "#fff", true);
        }
        break;
      }
      case "pedestal": {
        const full = !!this.s.flags[e.id];
        c.fillStyle = "#7d8290";
        c.fillRect(cx - 14, cy - 6, 28, 22);
        c.fillStyle = "#9aa0ad";
        c.fillRect(cx - 16, cy - 10, 32, 6);
        c.fillStyle = full ? "#6fb3ef" : "#2b2f38";
        c.beginPath();
        c.arc(cx, cy + 4, 6, 0, 7);
        c.fill();
        break;
      }
      case "lantern": {
        const lit = e.lit(this.s);
        if (lit) {
          const g = c.createRadialGradient(cx, cy - 6, 2, cx, cy - 6, 46);
          g.addColorStop(0, "rgba(255,214,102,.55)");
          g.addColorStop(1, "rgba(255,214,102,0)");
          c.fillStyle = g;
          c.fillRect(cx - 46, cy - 52, 92, 92);
        }
        shadow(9);
        c.fillStyle = "#2a2a2a";
        c.fillRect(cx - 2, cy, 4, 16);
        c.fillStyle = lit ? "#ffd666" : "#555b66";
        c.fillRect(cx - 9, cy - 18, 18, 20);
        c.strokeStyle = "#1a1a1a";
        c.lineWidth = 2;
        c.strokeRect(cx - 9, cy - 18, 18, 20);
        c.lineWidth = 1;
        this.text(e.name, cx, cy - 8, 12, lit ? "#5a3a00" : "#ddd", true);
        break;
      }
      case "leak": {
        const sealed = e.sealed(this.s);
        c.fillStyle = sealed ? "#3d5a48" : "#1d3b5c";
        c.beginPath();
        c.ellipse(cx, cy + 8, 16, 8, 0, 0, 7);
        c.fill();
        if (sealed) this.emoji("🔒", cx, cy - 2, 22);
        else {
          for (let i = 0; i < 3; i++) {
            const k = (this.time * 1.5 + i / 3) % 1;
            c.globalAlpha = 1 - k;
            this.emoji("💧", cx + (i - 1) * 8, cy + 4 - k * 26, 14);
          }
          c.globalAlpha = 1;
        }
        break;
      }
      case "boss": {
        const bx = e.x * TILE + TILE / 2;
        const by = e.y * TILE + TILE / 2 + Math.sin(this.time * 2) * 5;
        const g = c.createRadialGradient(bx, by, 10, bx, by, 70);
        g.addColorStop(0, "rgba(190,90,255,.5)");
        g.addColorStop(1, "rgba(190,90,255,0)");
        c.fillStyle = g;
        c.fillRect(bx - 70, by - 70, 140, 140);
        this.emoji(e.emoji, bx, by, 64);
        // HP pips
        const left = 4 - [1, 2, 3, 4].filter((n) => this.s.flags["leak" + n]).length;
        for (let i = 0; i < 4; i++) {
          c.fillStyle = i < left ? "#ef6f7a" : "#3a3047";
          c.fillRect(bx - 38 + i * 20, by - 46, 16, 6);
        }
        break;
      }
      case "shot":
        this.emoji(e.emoji, e.fx * TILE + TILE / 2, e.fy * TILE + TILE / 2, 22);
        break;
      case "bug": {
        shadow(10);
        const wiggle = Math.sin(this.time * 12 + e.x * 3) * 2;
        if (e.flash > 0) {
          e.flash -= 0.016;
          c.globalAlpha = 0.5;
        }
        if (e.sprite === "cobra") paintCobra(c, cx, cy, this.time + e.x);
        else if (e.sprite === "knight") paintKnight(c, cx, cy - 2, this.time, e.x * 1.7);
        else this.emoji(e.emoji, cx + wiggle, cy, 28);
        c.globalAlpha = 1;
        break;
      }
      case "board": {
        // a wooden notice board with a pinned paper
        shadow(14);
        c.fillStyle = "#5a3a22";
        c.fillRect(cx - 13, cy - 2, 4, 18);
        c.fillRect(cx + 9, cy - 2, 4, 18);
        c.fillStyle = "#8a5a32";
        c.fillRect(cx - 17, cy - 16, 34, 20);
        c.strokeStyle = "#4a2e18";
        c.lineWidth = 2;
        c.strokeRect(cx - 17, cy - 16, 34, 20);
        c.lineWidth = 1;
        c.fillStyle = "#f3ead2";
        c.fillRect(cx - 11, cy - 13, 22, 14);
        c.fillStyle = "#9c8a66";
        for (let i = 0; i < 3; i++) c.fillRect(cx - 8, cy - 10 + i * 4, 16 - (i === 2 ? 6 : 0), 1.5);
        c.fillStyle = "#d9534f";
        c.beginPath();
        c.arc(cx, cy - 13, 2, 0, 7);
        c.fill();
        if (e.unread(this.s)) {
          const by = cy - 30 + Math.sin(this.time * 5) * 3;
          c.fillStyle = "#f4c95d";
          c.beginPath();
          c.arc(cx, by, 9, 0, 7);
          c.fill();
          c.strokeStyle = "#2a2140";
          c.stroke();
          this.text("!", cx, by + 1, 13, "#2a2140", true);
        }
        break;
      }
      default:
        shadow();
        if (e.body === "granny") paintGranny(c, cx, cy + bob * 0.3, this.time);
        else this.emoji(e.emoji, cx, cy + (e.kind === "npc" ? bob * 0.5 : 0), e.kind === "npc" ? 30 : 28);
    }
  }

  drawTag(e) {
    const c = this.ctx;
    const label = e.tag(this.s);
    const cx = e.x * TILE + TILE / 2;
    const cy = Math.max(10, e.y * TILE - 6); // keep labels on things in the top row visible
    c.font = 'bold 11px "Courier New", monospace';
    const w = c.measureText(label).width + 10;
    c.fillStyle = "rgba(20,16,31,.85)";
    c.fillRect(cx - w / 2, cy - 9, w, 16);
    c.strokeStyle = "#6fb3ef";
    c.strokeRect(cx - w / 2 + 0.5, cy - 8.5, w - 1, 15);
    c.fillStyle = "#d6e8ff";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(label, cx, cy - 1);
  }

  drawHint() {
    if (this.paused() || this.player.moving) return;
    const f = this.facing();
    const t = this.entitiesAt(f.x, f.y).find((e) => e.onUse);
    if (!t) return;
    const c = this.ctx;
    const cx = f.x * TILE + TILE / 2;
    const cy = f.y * TILE - 18 - (t.tag ? 16 : 0) - (t.kind === "board" ? 22 : 0) + Math.sin(this.time * 6) * 2;
    c.fillStyle = "#f4c95d";
    c.beginPath();
    c.arc(cx, cy, 10, 0, 7);
    c.fill();
    c.fillStyle = "#2a2140";
    c.font = 'bold 12px "Trebuchet MS", sans-serif';
    c.textAlign = "center";
    c.textBaseline = "middle";
    // phones have no J key: show a speech bubble that matches the TALK button
    if (isTouch()) {
      c.font = `11px ${EMOJI_FONT}`;
      c.fillText("💬", cx, cy + 1);
    } else {
      c.fillText("J", cx, cy + 1);
    }
  }

  drawPlayer() {
    const c = this.ctx;
    const pp = this.playerPos();
    const cx = pp.x * TILE + TILE / 2;
    const cy = pp.y * TILE + TILE / 2;
    if (this.dead) return this.drawFallen(cx, cy);
    const step = this.player.moving ? Math.abs(Math.sin(this.player.t * Math.PI)) * 4 : 0;
    if (this.hurtCd > 0 && Math.floor(this.time * 20) % 2) return;
    c.fillStyle = "rgba(0,0,0,.3)";
    c.beginPath();
    c.ellipse(cx, cy + 14, 12, 4, 0, 0, 7);
    c.fill();
    if (this.s.learned.zap) {
      c.fillStyle = `rgba(111,179,239,${0.25 + Math.sin(this.time * 4) * 0.1})`;
      c.beginPath();
      c.arc(cx, cy, 18, 0, 7);
      c.fill();
    }
    const p = this.player;
    const phase = p.moving ? p.t / 2 + ((p.x + p.y) % 2) * 0.5 : 0;
    this.drawNinja(cx, cy - step, p.dir, phase, p.moving);
  }

  // The hero topples over sideways (pivoting on the feet) and lies flat.
  drawFallen(cx, cy) {
    const c = this.ctx;
    const k = this.fallT || 0;
    const ease = 1 - (1 - k) * (1 - k);
    const footY = cy + 14;
    c.fillStyle = "rgba(0,0,0,.3)";
    c.beginPath();
    c.ellipse(cx, footY, 12 + 6 * ease, 4, 0, 0, 7);
    c.fill();
    c.save();
    c.translate(cx + 14 * ease, footY - 4 * ease); // head falls left; shift so the body stays on its tile
    c.rotate((-Math.PI / 2) * ease);
    paintNinja(c, 0, -14, "down", 0, false, 0);
    c.restore();
  }

  drawNinja(cx, cy, dir, phase, moving) {
    paintNinja(this.ctx, cx, cy, dir, phase, moving, this.time);
  }

  drawBolt(b) {
    const c = this.ctx;
    const cx = b.fx * TILE + TILE / 2;
    const cy = b.fy * TILE + TILE / 2;
    const r = 5 + b.power * 2;
    const g = c.createRadialGradient(cx, cy, 1, cx, cy, r * 2);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.4, "#6fb3ef");
    g.addColorStop(1, "rgba(111,179,239,0)");
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, r * 2, 0, 7);
    c.fill();
  }
}

// A chibi old woman (Old Tamsin): grey bun, round glasses, shawl,
// long dress and a walking cane. Same size and outline as the hero.
export function paintGranny(c, cx, cy, time) {
  const OUT = "#2a1a10";
  const SKIN = "#f2c9a0";
  const HAIR = "#d9d9e0";
  const HAIR_DARK = "#a9a9b6";
  const DRESS = "#6a4c93";
  const DRESS_DARK = "#523a73";
  const SHAWL = "#3f7d5a";
  c.lineWidth = 1.5;
  c.strokeStyle = OUT;
  c.lineJoin = "round";

  // ---- cane (behind her right hand)
  c.strokeStyle = "#5a3a22";
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(cx + 12, cy + 16);
  c.lineTo(cx + 12, cy - 1);
  c.arc(cx + 9, cy - 1, 3, 0, Math.PI, true);
  c.stroke();
  c.lineWidth = 1.5;
  c.strokeStyle = OUT;

  // ---- shoes peeking out under the dress
  c.fillStyle = "#3b2a20";
  c.fillRect(cx - 7, cy + 13, 5, 3);
  c.fillRect(cx + 2, cy + 13, 5, 3);

  // ---- long dress (widens toward the hem) with an apron
  c.fillStyle = DRESS;
  c.beginPath();
  c.moveTo(cx - 7, cy + 1);
  c.lineTo(cx + 7, cy + 1);
  c.lineTo(cx + 10, cy + 14);
  c.lineTo(cx - 10, cy + 14);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = DRESS_DARK;
  c.fillRect(cx - 9, cy + 11, 18, 2);
  c.fillStyle = "#efe6d2";
  c.fillRect(cx - 4, cy + 5, 8, 8);
  c.strokeRect(cx - 4, cy + 5, 8, 8);

  // ---- arms: left one at her side, right one resting on the cane
  c.fillStyle = DRESS;
  c.fillRect(cx - 11, cy + 2, 4, 7);
  c.strokeRect(cx - 11, cy + 2, 4, 7);
  c.fillRect(cx + 7, cy + 1, 4, 5);
  c.strokeRect(cx + 7, cy + 1, 4, 5);
  c.fillStyle = SKIN;
  c.fillRect(cx - 11, cy + 8, 4, 2.5);
  c.beginPath();
  c.arc(cx + 10, cy - 1, 2.5, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  // ---- shawl over the shoulders, tied at the front
  c.fillStyle = SHAWL;
  c.beginPath();
  c.moveTo(cx - 9, cy + 1);
  c.lineTo(cx + 9, cy + 1);
  c.lineTo(cx + 4, cy + 6);
  c.lineTo(cx, cy + 4);
  c.lineTo(cx - 4, cy + 6);
  c.closePath();
  c.fill();
  c.stroke();

  // ---- head
  const hx = cx;
  const hy = cy - 8;
  // bun on top
  c.fillStyle = HAIR_DARK;
  c.beginPath();
  c.arc(hx, hy - 10, 5, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  // face
  c.fillStyle = SKIN;
  c.beginPath();
  c.arc(hx, hy, 10, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  // grey hair cap with a side part, and puffs over the ears
  c.fillStyle = HAIR;
  c.beginPath();
  c.arc(hx, hy - 1, 10.5, Math.PI * 1.02, Math.PI * 1.98);
  c.quadraticCurveTo(hx + 3, hy - 6, hx - 1, hy - 4);
  c.quadraticCurveTo(hx - 6, hy - 6, hx - 10.4, hy - 1);
  c.fill();
  c.stroke();
  for (const s of [-1, 1]) {
    c.beginPath();
    c.arc(hx + s * 9.5, hy + 1, 3.5, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }
  // eyes (blink now and then) behind round glasses
  const blink = time % 4 < 0.12;
  c.fillStyle = OUT;
  for (const s of [-1, 1]) {
    if (blink) c.fillRect(hx + s * 4 - 1.5, hy + 1, 3, 1);
    else c.fillRect(hx + s * 4 - 1, hy, 2, 2.5);
  }
  c.strokeStyle = "#6b4a2b";
  c.lineWidth = 1.2;
  c.beginPath();
  c.arc(hx - 4, hy + 1, 3.2, 0, Math.PI * 2);
  c.moveTo(hx + 7.2, hy + 1);
  c.arc(hx + 4, hy + 1, 3.2, 0, Math.PI * 2);
  c.moveTo(hx - 0.8, hy + 1);
  c.lineTo(hx + 0.8, hy + 1);
  c.stroke();
  // rosy cheeks and a small smile
  c.fillStyle = "rgba(232,120,120,.45)";
  c.beginPath();
  c.arc(hx - 6, hy + 5, 1.8, 0, Math.PI * 2);
  c.arc(hx + 6, hy + 5, 1.8, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = OUT;
  c.lineWidth = 1.2;
  c.beginPath();
  c.arc(hx, hy + 5, 2.5, 0.2 * Math.PI, 0.8 * Math.PI);
  c.stroke();
  c.lineWidth = 1;
}

// A chibi ninja hero: spiky blond hair, headband, orange jumpsuit.
// Exported so the battle screen can draw the hero too.
export function paintNinja(c, cx, cy, dir, phase, moving, time) {
  const side = dir === "left" ? -1 : dir === "right" ? 1 : 0;
  const swing = moving ? Math.sin(phase * Math.PI * 2) * 3 : 0;
  const OUT = "#2a1a10";
  const ORANGE = "#f28a1e";
  const BLACK = "#22222b";
  const SKIN = "#f7d2a8";
  const HAIR = "#ffd23f";
  const NAVY = "#2b3a67";
  c.lineWidth = 1.5;
  c.strokeStyle = OUT;
  c.lineJoin = "round";

  // ---- legs + sandals
  const leg = (x, lift) => {
    c.fillStyle = ORANGE;
    c.fillRect(x, cy + 9, 5, 6 - lift);
    c.strokeRect(x, cy + 9, 5, 6 - lift);
    c.fillStyle = NAVY;
    c.fillRect(x - 0.5, cy + 14 - lift, 6, 2.5);
  };
  if (side === 0) {
    leg(cx - 6, Math.max(0, swing));
    leg(cx + 1, Math.max(0, -swing));
  } else {
    leg(cx - 3 - swing, 0);
    leg(cx - 3 + swing, 0);
  }

  // ---- arms (swing opposite to legs)
  const arm = (x, dy) => {
    c.fillStyle = ORANGE;
    c.fillRect(x, cy + 2 + dy, 4, 7);
    c.strokeRect(x, cy + 2 + dy, 4, 7);
    c.fillStyle = SKIN;
    c.fillRect(x, cy + 8 + dy, 4, 2.5);
  };
  if (side === 0) {
    arm(cx - 12, -swing * 0.6);
    arm(cx + 8, swing * 0.6);
  }

  // ---- torso: orange jacket, black shoulders
  c.fillStyle = ORANGE;
  c.fillRect(cx - 8, cy + 1, 16, 9);
  c.fillStyle = BLACK;
  c.fillRect(cx - 8, cy + 1, 16, 3.5);
  c.strokeRect(cx - 8, cy + 1, 16, 9);
  if (dir === "down") {
    c.fillStyle = "#fff";
    c.fillRect(cx - 0.5, cy + 4, 1.5, 6);
  }
  if (side !== 0) arm(cx - 2 - swing * 0.8 * side, 0);

  // ---- head
  const hx = cx + side * 1;
  const hy = cy - 8;
  // Big, uneven spikes that fan OUT from the crown (not a neat star):
  // [angle in degrees (180 = left, 270 = up, 360 = right), length].
  const HAIR_DARK = "#e0a313";
  const SPIKES = [[168, 14], [203, 18], [238, 19], [273, 18], [308, 19], [343, 17], [378, 14]];
  const tilt = -side * 18; // hair sweeps backwards when walking sideways
  const hairShape = (scale, dy) => {
    c.beginPath();
    SPIKES.forEach(([deg, len], i) => {
      const a = ((deg + tilt) * Math.PI) / 180;
      const lean = ((deg - 277) * Math.PI) / 180 * 0.22; // tips flare away from the top
      const next = SPIKES[i + 1];
      c.lineTo(hx + Math.cos(a + lean) * len * scale, hy - 2 + dy + Math.sin(a + lean) * len * scale);
      if (next) {
        const v = (((deg + next[0]) / 2 + tilt) * Math.PI) / 180;
        c.lineTo(hx + Math.cos(v) * 11 * scale, hy - 2 + dy + Math.sin(v) * 11 * scale);
      }
    });
    c.lineTo(hx + 8 * scale, hy + 2 + dy);
    c.lineTo(hx - 8 * scale, hy + 2 + dy);
    c.closePath();
  };
  // darker back layer for depth, then the bright front layer
  c.fillStyle = HAIR_DARK;
  hairShape(1, 0);
  c.fill();
  c.stroke();
  c.fillStyle = HAIR;
  hairShape(0.82, 0.5);
  c.fill();

  // a hanging bang that frames the face, under the headband
  const bang = (x, s) => {
    c.fillStyle = HAIR;
    c.beginPath();
    c.moveTo(x, hy - 4);
    c.lineTo(x + s * 1.5, hy + 6);
    c.lineTo(x + s * 4.5, hy - 2);
    c.closePath();
    c.fill();
    c.stroke();
  };

  if (dir === "up") {
    // back of the head: all hair, plus the headband knot
    c.fillStyle = HAIR;
    c.beginPath();
    c.arc(hx, hy, 10.5, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // spikes at the nape of the neck
    c.fillStyle = HAIR_DARK;
    c.beginPath();
    c.moveTo(hx - 8, hy + 5);
    c.lineTo(hx - 5, hy + 11);
    c.lineTo(hx - 2, hy + 7);
    c.lineTo(hx + 1, hy + 12);
    c.lineTo(hx + 4, hy + 7);
    c.lineTo(hx + 7, hy + 10);
    c.lineTo(hx + 8, hy + 5);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = NAVY;
    c.fillRect(hx - 10.5, hy - 4, 21, 4);
    c.strokeRect(hx - 10.5, hy - 4, 21, 4);
    c.strokeStyle = NAVY;
    c.lineWidth = 2.5;
    const flap = Math.sin(time * 6) * 2;
    c.beginPath();
    c.moveTo(hx, hy - 2);
    c.lineTo(hx - 5, hy + 8 + flap);
    c.moveTo(hx, hy - 2);
    c.lineTo(hx + 4, hy + 9 - flap);
    c.stroke();
    return;
  }

  // face
  c.fillStyle = SKIN;
  c.beginPath();
  c.arc(hx, hy, 10, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  // hair cap above the headband, with a jagged fringe peeking under it
  c.fillStyle = HAIR;
  c.beginPath();
  c.arc(hx, hy - 3, 10.5, Math.PI, Math.PI * 2);
  c.closePath();
  c.fill();
  // side bangs: both when facing you, only the near one from the side
  if (side === 0) {
    bang(hx - 10.5, 1);
    bang(hx + 10.5, -1);
  } else {
    bang(hx + side * 10.5, -side);
  }
  // headband + metal plate
  c.fillStyle = NAVY;
  c.fillRect(hx - 10.5, hy - 5, 21, 4);
  c.fillStyle = "#c9ced6";
  const plateX = hx - 5 + side * 4;
  c.fillRect(plateX, hy - 5.5, 10, 5);
  c.strokeRect(plateX, hy - 5.5, 10, 5);
  c.strokeStyle = "#6b7280";
  c.lineWidth = 1;
  c.beginPath();
  c.arc(plateX + 5, hy - 3, 1.5, 0, Math.PI * 2);
  c.stroke();

  // eyes, whiskers, grin
  const eye = (x) => {
    c.fillStyle = "#2f7de1";
    c.beginPath();
    c.ellipse(x, hy + 2.5, 2, 2.6, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#fff";
    c.fillRect(x - 1, hy + 1, 1.2, 1.2);
  };
  const whiskers = (x, s) => {
    c.strokeStyle = "#8a5a3c";
    c.lineWidth = 0.8;
    c.beginPath();
    for (let i = 0; i < 3; i++) {
      c.moveTo(x, hy + 4.5 + i * 1.6);
      c.lineTo(x + s * 3.5, hy + 4 + i * 1.6);
    }
    c.stroke();
  };
  if (side === 0) {
    eye(hx - 4);
    eye(hx + 4);
    whiskers(hx - 6, -1);
    whiskers(hx + 6, 1);
    c.strokeStyle = OUT;
    c.lineWidth = 1;
    c.beginPath();
    c.arc(hx, hy + 5.5, 2.5, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();
  } else {
    eye(hx + side * 5);
    whiskers(hx + side * 3, -side);
    c.strokeStyle = OUT;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(hx + side * 6, hy + 7);
    c.lineTo(hx + side * 8, hy + 6.5);
    c.stroke();
  }
  c.lineWidth = 1;

}
