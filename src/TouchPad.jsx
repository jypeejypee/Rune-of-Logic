import React from "react";

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

export default function TouchPad({ s }) {
  return (
    <div className="touchpad">
      <div className="dpad">
        <PadButton code="KeyW" className="up" label="Walk up">▲</PadButton>
        <PadButton code="KeyA" className="left" label="Walk left">◀</PadButton>
        <PadButton code="KeyD" className="right" label="Walk right">▶</PadButton>
        <PadButton code="KeyS" className="down" label="Walk down">▼</PadButton>
        <span className="dpad-hub" />
      </div>

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
          <PadButton code="KeyL" className="act journal" label="Journal"><span>📜</span><small>Journal</small></PadButton>
          <PadButton code="KeyK" className="act zap" label="Zap"><span>✨</span><small>Zap</small></PadButton>
          <PadButton code="KeyJ" className="act talk" label="Talk / use"><span>💬</span><small>Talk</small></PadButton>
        </div>
      </div>
    </div>
  );
}
