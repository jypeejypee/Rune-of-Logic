import React, { useEffect, useRef } from "react";

// ---------------------------------------------------------------------
//  On-screen gamepad for phones and tablets. Each button pretends to be
//  a keyboard key, so the game engine doesn't need to know about touch.
//  Only shown on touch screens (see .touchpad in styles.css).
// ---------------------------------------------------------------------
function send(type, code) {
  const key = code.startsWith("Digit") ? code.slice(5) : code.replace(/^Key/, "").toLowerCase();
  window.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true }));
}

// A button that holds its key down for as long as the finger stays on it.
function PadButton({ code, className = "", children, label }) {
  const down = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.currentTarget.classList.add("is-down");
    send("keydown", code);
  };
  const up = (e) => {
    if (!e.currentTarget.classList.contains("is-down")) return;
    e.currentTarget.classList.remove("is-down");
    send("keyup", code);
  };
  return (
    <button
      type="button"
      className={`pad-btn ${className}`}
      aria-label={label}
      tabIndex={-1}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

// A see-through joystick (like Mobile Legends): drag the knob with your
// thumb, the hero walks the way you push most, and it springs back when
// you let go. The map is a grid, so it picks one of four directions.
const DIR_KEY = { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD" };

function Joystick() {
  const baseRef = useRef(null);
  const knobRef = useRef(null);
  const drag = useRef(null); // { id, dir }

  const setDir = (dir) => {
    const prev = drag.current?.dir;
    if (prev === dir) return;
    if (prev) send("keyup", DIR_KEY[prev]);
    if (dir) send("keydown", DIR_KEY[dir]);
    if (drag.current) drag.current.dir = dir;
    baseRef.current.dataset.dir = dir || "";
  };

  const move = (e) => {
    const rect = baseRef.current.getBoundingClientRect();
    const radius = rect.width / 2;
    let dx = e.clientX - (rect.left + radius);
    let dy = e.clientY - (rect.top + radius);
    const dist = Math.hypot(dx, dy);
    const max = radius * 0.6; // how far the knob may travel
    if (dist > max) {
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }
    knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    if (dist < radius * 0.22) setDir(null); // small dead zone in the middle
    else if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? "right" : "left");
    else setDir(dy > 0 ? "down" : "up");
  };

  const down = (e) => {
    e.preventDefault();
    if (drag.current) return;
    baseRef.current.setPointerCapture?.(e.pointerId);
    drag.current = { id: e.pointerId, dir: null };
    baseRef.current.classList.add("active");
    move(e);
  };
  const onMove = (e) => {
    if (drag.current?.id === e.pointerId) move(e);
  };
  const up = (e) => {
    if (drag.current?.id !== e.pointerId) return;
    setDir(null);
    drag.current = null;
    baseRef.current.classList.remove("active");
    knobRef.current.style.transform = "";
  };

  // Let go of any held direction if the joystick disappears mid-drag.
  useEffect(() => () => drag.current?.dir && send("keyup", DIR_KEY[drag.current.dir]), []);

  return (
    <div
      ref={baseRef}
      className="joystick"
      aria-label="Move joystick"
      onPointerDown={down}
      onPointerMove={onMove}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="joy-arrow up">▲</span>
      <span className="joy-arrow down">▼</span>
      <span className="joy-arrow left">◀</span>
      <span className="joy-arrow right">▶</span>
      <span ref={knobRef} className="joy-knob" />
    </div>
  );
}

export default function TouchPad({ s, muted, onToggleMute }) {
  return (
    <div className="touchpad">
      <Joystick />

      <div className="pad-actions">
        {s.learned.args && (
          <div className="pad-args">
            {[1, 2, 3].map((n) => (
              <PadButton key={n} code={`Digit${n}`} className={`arg ${s.power === n ? "on" : ""}`} label={`Argument ${n}`}>
                {n}
              </PadButton>
            ))}
          </div>
        )}
        <div className="pad-main">
          {/* Music on/off lives here too: on phones the header can be hidden behind dialog */}
          <button
            type="button"
            className="pad-btn act sound"
            aria-label={muted ? "Turn music on" : "Turn music off"}
            tabIndex={-1}
            onClick={onToggleMute}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span>{muted ? "🔇" : "🔊"}</span>
          </button>
          <PadButton code="KeyL" className="act book" label="Journal"><span>📜</span><small>Journal</small></PadButton>
          <PadButton code="KeyK" className="act zap" label="Zap"><span>✨</span><small>Zap</small></PadButton>
          <PadButton code="KeyJ" className="act talk" label="Talk / use"><span>💬</span><small>Talk</small></PadButton>
        </div>
      </div>
    </div>
  );
}
