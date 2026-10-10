// =====================================================================
//  ART — hand-drawn (code-drawn) characters, objects and the "wilds"
//  tileset. Everything is drawn with simple canvas shapes, no images.
// =====================================================================

const TILE = 40;

const ellipse = (c, x, y, rx, ry) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
};

// ---------------------------------------------------------------------
//  Brannoc the Smith: a burly blacksmith with a leather apron, a big
//  beard and a hammer he keeps tapping.
// ---------------------------------------------------------------------
export function paintSmith(c, cx, cy, time) {
  const OUT = "#1e140c";
  const SKIN = "#d6a27a";
  const SKIN_D = "#b07a55";
  const BEARD = "#7a4422";
  const BEARD_D = "#4f2a15";
  const SHIRT = "#8a8073";
  const APRON = "#5a3a22";
  const APRON_D = "#40281a";
  const tap = Math.max(0, Math.sin(time * 3));
  c.lineWidth = 1.5;
  c.strokeStyle = OUT;
  c.lineJoin = "round";

  c.fillStyle = "rgba(0,0,0,.32)";
  ellipse(c, cx, cy + 17, 16, 4.5);
  c.fill();

  // legs + boots
  c.fillStyle = "#3a3229";
  c.fillRect(cx - 9, cy + 8, 7, 8);
  c.fillRect(cx + 2, cy + 8, 7, 8);
  c.fillStyle = "#1f1b17";
  c.fillRect(cx - 10, cy + 14, 9, 3.5);
  c.fillRect(cx + 1, cy + 14, 9, 3.5);

  // left arm (hanging)
  c.fillStyle = SHIRT;
  c.fillRect(cx - 17, cy - 4, 6, 6);
  c.strokeRect(cx - 17, cy - 4, 6, 6);
  c.fillStyle = SKIN;
  c.fillRect(cx - 17, cy + 2, 6, 9);
  c.strokeRect(cx - 17, cy + 2, 6, 9);

  // wide torso + apron
  c.fillStyle = SHIRT;
  c.fillRect(cx - 12, cy - 5, 24, 15);
  c.strokeRect(cx - 12, cy - 5, 24, 15);
  c.fillStyle = APRON;
  c.fillRect(cx - 9, cy - 2, 18, 15);
  c.strokeRect(cx - 9, cy - 2, 18, 15);
  c.fillStyle = APRON_D;
  c.fillRect(cx - 4, cy + 5, 8, 5);
  c.strokeStyle = APRON_D;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(cx - 8, cy - 2);
  c.lineTo(cx - 10, cy - 6);
  c.moveTo(cx + 8, cy - 2);
  c.lineTo(cx + 10, cy - 6);
  c.stroke();
  c.strokeStyle = OUT;
  c.lineWidth = 1.5;

  // right arm swinging the hammer
  c.save();
  c.translate(cx + 14, cy - 3);
  c.rotate(-0.25 - tap * 1.1);
  c.fillStyle = SKIN;
  c.fillRect(-3, 0, 6, 12);
  c.strokeRect(-3, 0, 6, 12);
  c.fillStyle = "#6e4a2b";
  c.fillRect(-1.5, 10, 3, 12);
  c.fillStyle = "#555a62";
  c.fillRect(-6, 19, 12, 6);
  c.strokeRect(-6, 19, 12, 6);
  c.fillStyle = "#8d949e";
  c.fillRect(-5, 20, 10, 1.5);
  c.restore();

  // head
  const hx = cx;
  const hy = cy - 13;
  c.fillStyle = SKIN;
  ellipse(c, hx, hy, 8.5, 8.5);
  c.fill();
  c.stroke();
  c.fillStyle = "rgba(255,255,255,.25)"; // bald shine
  ellipse(c, hx - 3, hy - 5, 3, 1.6);
  c.fill();
  c.fillStyle = BEARD_D; // short hair at the temples
  c.fillRect(hx - 9, hy - 2, 2.5, 5);
  c.fillRect(hx + 6.5, hy - 2, 2.5, 5);
  c.fillRect(hx - 5.5, hy - 3.5, 4, 1.6); // eyebrows
  c.fillRect(hx + 1.5, hy - 3.5, 4, 1.6);
  c.fillStyle = "#1a120c";
  c.fillRect(hx - 4, hy - 1.5, 2, 2);
  c.fillRect(hx + 2, hy - 1.5, 2, 2);
  c.fillStyle = SKIN_D;
  c.fillRect(hx - 1, hy - 0.5, 2.5, 3);

  // big beard
  c.fillStyle = BEARD;
  c.beginPath();
  c.moveTo(hx - 8, hy + 1);
  c.quadraticCurveTo(hx - 9, hy + 12, hx, hy + 15);
  c.quadraticCurveTo(hx + 9, hy + 12, hx + 8, hy + 1);
  c.quadraticCurveTo(hx, hy + 6, hx - 8, hy + 1);
  c.fill();
  c.stroke();
  c.strokeStyle = BEARD_D;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(hx - 3, hy + 6);
  c.lineTo(hx - 2, hy + 12);
  c.moveTo(hx + 3, hy + 6);
  c.lineTo(hx + 2, hy + 12);
  c.stroke();
  c.lineWidth = 1;
}

// ---------------------------------------------------------------------
//  A cobra for the overworld: coiled body, raised neck, spread hood.
// ---------------------------------------------------------------------
export function paintCobra(c, cx, cy, time) {
  const OUT = "#1b240b";
  const BODY = "#6f8a2c";
  const BODY_D = "#4b6020";
  const BELLY = "#cfc684";
  const sway = Math.sin(time * 2.4) * 2.5;
  c.lineJoin = "round";

  c.fillStyle = "rgba(0,0,0,.32)";
  ellipse(c, cx, cy + 14, 15, 4);
  c.fill();

  // coils
  c.strokeStyle = OUT;
  c.lineWidth = 1.5;
  c.fillStyle = BODY;
  ellipse(c, cx, cy + 10, 14, 5.5);
  c.fill();
  c.stroke();
  c.fillStyle = BODY_D;
  ellipse(c, cx + 2, cy + 6, 10, 4.5);
  c.fill();
  c.stroke();
  c.fillStyle = "rgba(0,0,0,.25)";
  for (let i = -2; i <= 2; i++) c.fillRect(cx + i * 5 - 1, cy + 9, 2, 2);

  // neck (outline, body, belly stripe)
  const neck = () => {
    c.beginPath();
    c.moveTo(cx - 2, cy + 6);
    c.quadraticCurveTo(cx - 7, cy - 2, cx + sway, cy - 9);
  };
  c.lineCap = "round";
  c.strokeStyle = OUT;
  c.lineWidth = 9;
  neck();
  c.stroke();
  c.strokeStyle = BODY;
  c.lineWidth = 6.5;
  neck();
  c.stroke();
  c.strokeStyle = BELLY;
  c.lineWidth = 2.5;
  neck();
  c.stroke();
  c.lineCap = "butt";

  // hood
  const hx = cx + sway;
  const hy = cy - 12;
  c.strokeStyle = OUT;
  c.lineWidth = 1.5;
  c.fillStyle = BODY;
  ellipse(c, hx, hy, 9, 8);
  c.fill();
  c.stroke();
  c.fillStyle = BELLY;
  ellipse(c, hx, hy + 1, 4.5, 5);
  c.fill();
  c.fillStyle = BODY_D;
  c.fillRect(hx - 3, hy - 1, 2, 2);
  c.fillRect(hx + 1, hy - 1, 2, 2);

  // head
  c.fillStyle = BODY_D;
  ellipse(c, hx, hy - 6, 4.5, 3.5);
  c.fill();
  c.stroke();
  c.fillStyle = "#e0242a";
  c.fillRect(hx - 3, hy - 7.5, 1.8, 1.8);
  c.fillRect(hx + 1.2, hy - 7.5, 1.8, 1.8);
  if (Math.sin(time * 7) > 0.4) {
    c.strokeStyle = "#d4303a";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(hx, hy - 3);
    c.lineTo(hx, hy + 0.5);
    c.lineTo(hx - 1.5, hy + 2);
    c.moveTo(hx, hy + 0.5);
    c.lineTo(hx + 1.5, hy + 2);
    c.stroke();
  }
  c.lineWidth = 1;
}

// ---------------------------------------------------------------------
//  Objects: forge, anvil, rune stone
// ---------------------------------------------------------------------
export function paintForge(c, cx, cy, time, lit) {
  c.lineWidth = 1.5;
  c.strokeStyle = "#1a1512";
  c.fillStyle = "rgba(0,0,0,.3)";
  ellipse(c, cx, cy + 16, 17, 4);
  c.fill();
  // chimney
  c.fillStyle = "#3e3833";
  c.fillRect(cx + 4, cy - 22, 9, 12);
  c.strokeRect(cx + 4, cy - 22, 9, 12);
  // stone body
  c.fillStyle = "#5a524b";
  c.fillRect(cx - 17, cy - 12, 34, 28);
  c.strokeRect(cx - 17, cy - 12, 34, 28);
  c.strokeStyle = "rgba(0,0,0,.3)";
  c.lineWidth = 1;
  for (let row = 0; row < 4; row++) {
    const y = cy - 12 + row * 7;
    c.beginPath();
    c.moveTo(cx - 17, y);
    c.lineTo(cx + 17, y);
    c.stroke();
    for (let k = 0; k < 4; k++) {
      const x = cx - 17 + k * 9 + (row % 2 ? 4 : 0);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x, y + 7);
      c.stroke();
    }
  }
  // mouth
  c.fillStyle = "#16100c";
  c.beginPath();
  c.moveTo(cx - 9, cy + 14);
  c.lineTo(cx - 9, cy + 2);
  c.arc(cx, cy + 2, 9, Math.PI, 0);
  c.lineTo(cx + 9, cy + 14);
  c.fill();
  if (lit) {
    const f = 0.75 + Math.sin(time * 9) * 0.15 + Math.sin(time * 23) * 0.1;
    const g = c.createRadialGradient(cx, cy + 10, 1, cx, cy + 6, 14);
    g.addColorStop(0, `rgba(255,240,170,${f})`);
    g.addColorStop(0.5, `rgba(255,140,30,${f})`);
    g.addColorStop(1, "rgba(160,30,0,0)");
    c.fillStyle = g;
    c.fillRect(cx - 10, cy - 8, 20, 22);
    // glow on the ground
    const gg = c.createRadialGradient(cx, cy + 16, 2, cx, cy + 16, 34);
    gg.addColorStop(0, "rgba(255,140,40,.35)");
    gg.addColorStop(1, "rgba(255,140,40,0)");
    c.fillStyle = gg;
    c.fillRect(cx - 34, cy - 10, 68, 40);
    // smoke
    for (let i = 0; i < 3; i++) {
      const k = (time * 0.6 + i / 3) % 1;
      c.fillStyle = `rgba(160,160,160,${0.35 * (1 - k)})`;
      ellipse(c, cx + 8 + Math.sin(k * 6 + i) * 3, cy - 24 - k * 18, 3 + k * 4, 3 + k * 4);
      c.fill();
    }
  } else {
    // cold: frost on the stones
    c.fillStyle = "rgba(170,210,235,.35)";
    c.fillRect(cx - 17, cy - 12, 34, 5);
    c.fillStyle = "rgba(200,230,250,.5)";
    for (let i = 0; i < 6; i++) c.fillRect(cx - 15 + i * 6, cy - 7 + (i % 2) * 2, 2, 3);
  }
  c.lineWidth = 1;
}

export function paintAnvil(c, cx, cy) {
  c.lineWidth = 1.5;
  c.strokeStyle = "#141414";
  c.fillStyle = "rgba(0,0,0,.3)";
  ellipse(c, cx, cy + 15, 14, 4);
  c.fill();
  // stump
  c.fillStyle = "#5b3d25";
  c.fillRect(cx - 9, cy + 1, 18, 14);
  c.strokeRect(cx - 9, cy + 1, 18, 14);
  c.fillStyle = "#7a5534";
  ellipse(c, cx, cy + 1, 9, 3);
  c.fill();
  // anvil
  c.fillStyle = "#3d4249";
  c.beginPath();
  c.moveTo(cx - 15, cy - 10);
  c.lineTo(cx + 12, cy - 10);
  c.lineTo(cx + 8, cy - 5);
  c.lineTo(cx + 5, cy - 5);
  c.lineTo(cx + 6, cy + 1);
  c.lineTo(cx - 6, cy + 1);
  c.lineTo(cx - 5, cy - 5);
  c.quadraticCurveTo(cx - 12, cy - 6, cx - 15, cy - 10);
  c.fill();
  c.stroke();
  c.fillStyle = "#7c838d";
  c.fillRect(cx - 12, cy - 10, 22, 1.5);
  c.lineWidth = 1;
}

export function paintRune(c, cx, cy, time, solved) {
  c.lineWidth = 1.5;
  c.strokeStyle = "#1c1b18";
  c.fillStyle = "rgba(0,0,0,.3)";
  ellipse(c, cx, cy + 15, 12, 4);
  c.fill();
  c.fillStyle = "#6d6a62";
  c.beginPath();
  c.moveTo(cx - 10, cy + 15);
  c.lineTo(cx - 11, cy - 8);
  c.quadraticCurveTo(cx, cy - 20, cx + 11, cy - 8);
  c.lineTo(cx + 10, cy + 15);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#4f7a38"; // moss
  ellipse(c, cx - 6, cy + 12, 5, 2.5);
  c.fill();
  const pulse = 0.6 + Math.sin(time * 3) * 0.3;
  const col = solved ? `rgba(123,216,143,${pulse})` : `rgba(255,150,50,${pulse})`;
  c.strokeStyle = col;
  c.lineWidth = 2;
  c.beginPath(); // a glyph that looks like </>
  c.moveTo(cx - 3, cy - 6);
  c.lineTo(cx - 7, cy - 1);
  c.lineTo(cx - 3, cy + 4);
  c.moveTo(cx + 3, cy - 6);
  c.lineTo(cx + 7, cy - 1);
  c.lineTo(cx + 3, cy + 4);
  c.moveTo(cx + 1.5, cy - 7);
  c.lineTo(cx - 1.5, cy + 5);
  c.stroke();
  const g = c.createRadialGradient(cx, cy - 1, 1, cx, cy - 1, 18);
  g.addColorStop(0, solved ? "rgba(123,216,143,.3)" : "rgba(255,150,50,.3)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g;
  c.fillRect(cx - 18, cy - 19, 36, 36);
  c.lineWidth = 1;
}

// ---------------------------------------------------------------------
//  THE WILDS TILESET — darker, grittier nature tiles for map 2.
//  tile(x, y) looks up neighbours (for shorelines, cliff lips, path edges).
//  Returns false for characters it doesn't draw.
// ---------------------------------------------------------------------
export function paintWildsTile(c, ch, x, y, tile, hash, time) {
  const px = x * TILE;
  const py = y * TILE;
  const r = hash(x, y);
  const isWater = (t) => t === "~" || t === "S" || t === "b";
  const isPath = (t) => t === "," || t === "^";

  const grass = () => {
    c.fillStyle = "#3a682d";
    c.fillRect(px, py, TILE, TILE);
    for (let i = 0; i < 12; i++) {
      const gx = px + hash(x * 13 + i, y * 7) * 38;
      const gy = py + hash(x * 5, y * 11 + i) * 38;
      c.fillStyle = ["#4a7d38", "#305a25", "#43733a"][i % 3];
      c.fillRect(gx, gy, 2, i % 4 === 0 ? 3 : 2);
    }
    if (r > 0.85) {
      c.fillStyle = "#777468";
      c.fillRect(px + r * 30, py + 27, 3, 2);
      c.fillRect(px + r * 30 + 4, py + 29, 2, 1.5);
    }
  };

  const water = () => {
    c.fillStyle = "#1f5a64";
    c.fillRect(px, py, TILE, TILE);
    c.fillStyle = "#28707c";
    c.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
    c.strokeStyle = "rgba(190,235,235,.28)";
    c.lineWidth = 1.5;
    const o = Math.sin(time * 1.6 + x * 1.3 + y) * 4;
    c.beginPath();
    c.moveTo(px + 6 + o, py + 13);
    c.lineTo(px + 16 + o, py + 13);
    c.moveTo(px + 22 - o, py + 27);
    c.lineTo(px + 33 - o, py + 27);
    c.stroke();
    c.lineWidth = 1;
    // shoreline: muddy bank + foam where the neighbour is land
    const sides = [
      [0, -1, px, py, TILE, 4, px, py + 4, TILE, 2],
      [0, 1, px, py + TILE - 4, TILE, 4, px, py + TILE - 6, TILE, 2],
      [-1, 0, px, py, 4, TILE, px + 4, py, 2, TILE],
      [1, 0, px + TILE - 4, py, 4, TILE, px + TILE - 6, py, 2, TILE],
    ];
    for (const [dx, dy, bx, by, bw, bh, fx, fy, fw, fh] of sides) {
      if (isWater(tile(x + dx, y + dy))) continue;
      if (x + dx < 0 || x + dx >= 20 || y + dy < 0 || y + dy >= 14) continue;
      c.fillStyle = "#4e3f2e";
      c.fillRect(bx, by, bw, bh);
      c.fillStyle = `rgba(215,238,232,${0.45 + Math.sin(time * 2 + x + y) * 0.15})`;
      c.fillRect(fx, fy, fw, fh);
    }
  };

  switch (ch) {
    case ".":
      grass();
      return true;
    case "h": {
      grass();
      c.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const bx = px + 3 + i * 4.6;
        const sway = Math.sin(time * 1.8 + x + i * 0.7) * 1.8;
        c.strokeStyle = i % 2 ? "#5b8f44" : "#2a5122";
        c.beginPath();
        c.moveTo(bx, py + 38);
        c.quadraticCurveTo(bx + sway * 0.5, py + 26, bx + sway, py + 14 + hash(x + i, y) * 10);
        c.stroke();
      }
      c.lineWidth = 1;
      return true;
    }
    case "f": {
      grass();
      const cols = ["#d8c867", "#c4d6e4", "#e3dccb", "#a988b0"];
      for (let i = 0; i < 6; i++) {
        const fx = px + 4 + hash(x + i, y * 3) * 32;
        const fy = py + 6 + hash(y + i, x * 3) * 28;
        c.fillStyle = "#2e5424";
        c.fillRect(fx, fy + 2, 1, 4);
        c.fillStyle = cols[i % 4];
        c.fillRect(fx - 1, fy, 3, 3);
      }
      return true;
    }
    case ",": {
      c.fillStyle = "#6a4f35";
      c.fillRect(px, py, TILE, TILE);
      for (let i = 0; i < 8; i++) {
        c.fillStyle = i % 2 ? "#5a432e" : "#7d6146";
        c.fillRect(px + hash(x * 3 + i, y) * 36, py + hash(x, y * 3 + i) * 36, 4, 3);
      }
      c.fillStyle = "#958670";
      c.fillRect(px + r * 28 + 4, py + 18, 3, 3);
      // grass creeping over the path edges
      c.fillStyle = "#3a682d";
      const edge = (cond, draw) => cond && draw();
      edge(!isPath(tile(x, y - 1)), () => { for (let i = 0; i < 5; i++) c.fillRect(px + i * 8 + 1, py, 6, 2 + (i % 2) * 2); });
      edge(!isPath(tile(x, y + 1)), () => { for (let i = 0; i < 5; i++) c.fillRect(px + i * 8 + 3, py + TILE - 3 - (i % 2) * 2, 6, 4); });
      edge(!isPath(tile(x - 1, y)), () => { for (let i = 0; i < 5; i++) c.fillRect(px, py + i * 8 + 2, 2 + (i % 2) * 2, 6); });
      edge(!isPath(tile(x + 1, y)), () => { for (let i = 0; i < 5; i++) c.fillRect(px + TILE - 3 - (i % 2) * 2, py + i * 8, 4, 6); });
      return true;
    }
    case "T":
      grass();
      c.fillStyle = "rgba(0,0,0,.32)";
      ellipse(c, px + 20, py + 34, 17, 5);
      c.fill();
      c.fillStyle = "#47311f";
      c.fillRect(px + 16, py + 20, 8, 16);
      c.fillRect(px + 12, py + 33, 16, 3);
      c.fillStyle = "#22441d";
      ellipse(c, px + 20, py + 15, 18, 15);
      c.fill();
      c.fillStyle = "#33672a";
      ellipse(c, px + 15, py + 12, 11, 9);
      c.fill();
      ellipse(c, px + 26, py + 14, 10, 9);
      c.fill();
      c.fillStyle = "#4d8838";
      ellipse(c, px + 13, py + 8, 5, 4);
      c.fill();
      c.fillStyle = "rgba(0,0,0,.18)";
      ellipse(c, px + 22, py + 22, 12, 5);
      c.fill();
      return true;
    case "r":
      grass();
      c.fillStyle = "rgba(0,0,0,.3)";
      ellipse(c, px + 20, py + 33, 16, 4);
      c.fill();
      c.fillStyle = "#64635b";
      ellipse(c, px + 20, py + 24, 15, 11);
      c.fill();
      c.fillStyle = "#848378";
      ellipse(c, px + 17, py + 20, 10, 7);
      c.fill();
      c.fillStyle = "#4b7a37";
      ellipse(c, px + 12, py + 17, 5, 3);
      c.fill();
      c.strokeStyle = "rgba(0,0,0,.35)";
      c.beginPath();
      c.moveTo(px + 22, py + 16);
      c.lineTo(px + 25, py + 24);
      c.lineTo(px + 23, py + 30);
      c.stroke();
      return true;
    case "C": {
      // cliff face: layered rock strata
      c.fillStyle = "#5a4a3b";
      c.fillRect(px, py, TILE, TILE);
      let sx = px;
      let i = 0;
      while (sx < px + TILE) {
        const w = 5 + hash(x * 7 + i, y) * 6;
        c.fillStyle = i % 2 ? "#6a5745" : "#4c3e31";
        c.fillRect(sx, py, w - 1, TILE);
        sx += w;
        i++;
      }
      c.fillStyle = "rgba(0,0,0,.22)";
      c.fillRect(px, py + 14 + r * 6, TILE, 2);
      c.fillRect(px, py + 28 + r * 4, TILE, 2);
      if (tile(x, y - 1) !== "C") {
        c.fillStyle = "#3a682d";
        c.fillRect(px, py, TILE, 6);
        c.fillStyle = "#2c5222";
        for (let k = 0; k < 6; k++) {
          c.beginPath();
          c.moveTo(px + k * 7, py + 6);
          c.lineTo(px + k * 7 + 3.5, py + 10);
          c.lineTo(px + k * 7 + 7, py + 6);
          c.fill();
        }
      }
      if (tile(x, y + 1) !== "C") {
        c.fillStyle = "rgba(0,0,0,.35)";
        c.fillRect(px, py + TILE - 5, TILE, 5);
      }
      return true;
    }
    case "^":
      c.fillStyle = "#4c3e31";
      c.fillRect(px, py, TILE, TILE);
      for (let k = 0; k < 4; k++) {
        c.fillStyle = "#8a8274";
        c.fillRect(px + 5, py + k * 10 + 1, 30, 7);
        c.fillStyle = "#5f584c";
        c.fillRect(px + 5, py + k * 10 + 7, 30, 2);
      }
      return true;
    case "~":
      water();
      return true;
    case "S":
      water();
      c.fillStyle = "rgba(0,0,0,.3)";
      ellipse(c, px + 20, py + 25, 13, 8);
      c.fill();
      c.fillStyle = "#86837a";
      ellipse(c, px + 20, py + 21, 13, 9);
      c.fill();
      c.fillStyle = "#a29e92";
      ellipse(c, px + 18, py + 19, 8, 5);
      c.fill();
      return true;
    default:
      return false;
  }
}
