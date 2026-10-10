import React, { useEffect, useRef } from "react";
import { paintNinja } from "./game/engine.js";
import { paintCobra } from "./game/art.js";

// Words of Java that float up from the ground like magic sparks.
const GLYPHS = ["{ }", "( )", ";", "public", "private", "static", "int", "return", "void", "class", "get()", "=>", "new"];

const QUESTS = [
  { icon: "🪄", label: "Methods" },
  { icon: "🔑", label: "Arguments" },
  { icon: "🏮", label: "Static" },
  { icon: "🛡️", label: "Encapsulation" },
];

export default function TitleScreen({ hasSave, onStart }) {
  // Enter / Space starts the game (continues if there is a save).
  useEffect(() => {
    function onKey(e) {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        onStart(!hasSave);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasSave, onStart]);

  const noFocus = (e) => e.preventDefault();

  return (
    <div className="overlay title-screen">
      <TitleScene />
      <div className="title-card">
        <div className="title-emblem" aria-hidden="true">
          <span className="ring ring-a" />
          <span className="ring ring-b" />
        </div>
        <p className="title-kicker">Chapter I · The Encapsulated Kingdom</p>
        <h1 className="title-logo">Rune of Logic</h1>
        <p className="title-hook">Your code is your magic.</p>
        <p className="title-pitch">
          Forge spells from Java, outwit cursed bugs, and break <b>The Leaky Class</b> before it spills the kingdom's secrets.
        </p>
        <div className="title-quests">
          {QUESTS.map((q) => (
            <span key={q.label} className="quest-chip"><span aria-hidden="true">{q.icon}</span>{q.label}</span>
          ))}
        </div>
        <div className="row center title-actions">
          {hasSave && (
            <button className="btn-start" onMouseDown={noFocus} onClick={() => onStart(false)}>
              ▶ Continue
            </button>
          )}
          <button className={hasSave ? "btn-start ghost" : "btn-start"} onMouseDown={noFocus} onClick={() => onStart(true)}>
            {hasSave ? "New game" : "▶ Start adventure"}
          </button>
        </div>
        <p className="press-enter">press enter</p>
      </div>
      <p className="title-controls">
        <kbd>WASD</kbd> walk · <kbd>J</kbd> talk · <kbd>K</kbd> zap · <kbd>L</kbd> journal
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------
//  The animated night scene behind the title: stars, moon, castle,
//  rising code-glyphs, fireflies, and the hero facing a cobra.
// ---------------------------------------------------------------------
function TitleScene() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const c = canvas.getContext("2d");
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const rand = (a, b) => a + Math.random() * (b - a);

    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random(), y: Math.random() * 0.62, r: rand(0.4, 1.6), p: rand(0, 7), s: rand(1, 3),
    }));
    const flies = Array.from({ length: 14 }, () => ({ x: Math.random(), y: rand(0.7, 0.95), p: rand(0, 7) }));
    const newGlyph = (anywhere) => ({
      t: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      x: rand(0.04, 0.96),
      y: anywhere ? rand(0.2, 1) : rand(1, 1.15),
      v: rand(0.018, 0.04),
      size: rand(11, 18),
      gold: Math.random() < 0.5,
      p: rand(0, 7),
    });
    const glyphs = Array.from({ length: 16 }, () => newGlyph(true));

    let w = 0, h = 0, dpr = 1;
    function resize() {
      dpr = window.devicePixelRatio || 1;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function castle(t) {
      const base = h * 0.74;
      const x0 = w * 0.6;
      const u = h / 140; // castle scale unit
      c.fillStyle = "#150d29";
      // walls and towers: [x, width, height]
      const parts = [[0, 34, 16], [6, 6, 30], [24, 6, 30], [12, 10, 40], [34, 22, 12], [44, 6, 24], [-8, 8, 20]];
      c.beginPath();
      for (const [x, pw, ph] of parts) c.rect(x0 + x * u, base - ph * u, pw * u, ph * u + 2);
      c.fill();
      // pointed roofs
      for (const [x, pw, ph] of [[6, 6, 30], [24, 6, 30], [12, 10, 40], [44, 6, 24]]) {
        c.beginPath();
        c.moveTo(x0 + (x - 1) * u, base - ph * u);
        c.lineTo(x0 + (x + pw / 2) * u, base - (ph + pw * 1.4) * u);
        c.lineTo(x0 + (x + pw + 1) * u, base - ph * u);
        c.fill();
      }
      // flickering windows
      const wins = [[15.5, 30], [8, 22], [26, 22], [46, 16], [3, 10], [40, 6], [20, 8]];
      wins.forEach(([x, y], i) => {
        const f = 0.65 + 0.35 * Math.sin(t * (2 + i * 0.7) + i);
        c.fillStyle = `rgba(255, 200, 90, ${f})`;
        c.shadowColor = "rgba(255, 190, 80, .9)";
        c.shadowBlur = 8 * dpr;
        c.fillRect(x0 + x * u, base - y * u, 2 * u, 3 * u);
      });
      c.shadowBlur = 0;
    }

    function hill(color, y, amp, freq, phase) {
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(0, h);
      for (let x = 0; x <= w + 10; x += 10) {
        c.lineTo(x, h * y + Math.sin(x / w * Math.PI * freq + phase) * h * amp);
      }
      c.lineTo(w, h);
      c.fill();
    }

    let raf;
    const t0 = performance.now();
    let last = t0;
    function draw(now) {
      const t = (now - t0) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);

      // sky
      const sky = c.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#070512");
      sky.addColorStop(0.45, "#1d1340");
      sky.addColorStop(0.75, "#4a2363");
      sky.addColorStop(1, "#6b2f5f");
      c.fillStyle = sky;
      c.fillRect(0, 0, w, h);

      // stars
      for (const s of stars) {
        const a = 0.35 + 0.65 * Math.abs(Math.sin(t * s.s * 0.6 + s.p));
        c.fillStyle = `rgba(255, 246, 220, ${a})`;
        c.fillRect(s.x * w, s.y * h, s.r, s.r);
      }

      // moon with halo
      const mx = w * 0.82, my = h * 0.2, mr = h * 0.07;
      const halo = c.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 4);
      halo.addColorStop(0, "rgba(255, 228, 170, .35)");
      halo.addColorStop(1, "rgba(255, 228, 170, 0)");
      c.fillStyle = halo;
      c.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
      c.fillStyle = "#ffeec4";
      c.beginPath();
      c.arc(mx, my, mr, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(220, 190, 140, .5)";
      c.beginPath();
      c.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.18, 0, 7);
      c.arc(mx + mr * 0.35, my + mr * 0.3, mr * 0.12, 0, 7);
      c.fill();

      // landscape
      hill("#24163f", 0.7, 0.05, 3, 0.6);
      castle(t);
      hill("#160e2a", 0.8, 0.035, 2.2, 2.1);
      hill("#0c0818", 0.9, 0.025, 1.6, 4);

      // rising glyphs
      c.textAlign = "center";
      for (let i = 0; i < glyphs.length; i++) {
        const g = glyphs[i];
        if (!reduce) g.y -= g.v * dt;
        if (g.y < 0.08) glyphs[i] = newGlyph(false);
        const fade = Math.min(1, (1.05 - g.y) * 3) * Math.min(1, (g.y - 0.08) * 4);
        c.globalAlpha = Math.max(0, fade) * 0.75;
        c.font = `600 ${g.size}px "Cascadia Code", Consolas, monospace`;
        c.fillStyle = g.gold ? "#ffd77a" : "#9fd2ff";
        c.shadowColor = g.gold ? "#f4c95d" : "#6fb3ef";
        c.shadowBlur = 12 * dpr;
        c.fillText(g.t, g.x * w + Math.sin(t + g.p) * 6, g.y * h);
      }
      c.globalAlpha = 1;
      c.shadowBlur = 0;

      // fireflies
      for (const f of flies) {
        const a = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.4 + f.p));
        const fx = f.x * w + Math.sin(t * 0.5 + f.p) * 18;
        const fy = f.y * h + Math.cos(t * 0.7 + f.p) * 8;
        c.fillStyle = `rgba(190, 255, 140, ${a})`;
        c.shadowColor = "#b8ff8a";
        c.shadowBlur = 10 * dpr;
        c.beginPath();
        c.arc(fx, fy, 1.8, 0, 7);
        c.fill();
      }
      c.shadowBlur = 0;

      // hero vs cobra, standing on the front hill
      const k = Math.max(1.4, h / 230);
      const groundY = h * 0.9;
      c.setTransform(dpr * k, 0, 0, dpr * k, w * 0.13 * dpr, (groundY - 16 * k) * dpr);
      c.fillStyle = "rgba(0,0,0,.35)";
      c.beginPath();
      c.ellipse(0, 16, 12, 4, 0, 0, 7);
      c.fill();
      paintNinja(c, 0, Math.sin(t * 3) * 1, "right", t * 0.6, false, t);

      c.setTransform(dpr * k, 0, 0, dpr * k, w * 0.87 * dpr, (groundY - 14 * k) * dpr);
      paintCobra(c, 0, 0, t);

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="title-scene" aria-hidden="true" />;
}
