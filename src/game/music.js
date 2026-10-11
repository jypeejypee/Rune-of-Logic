// =====================================================================
//  MUSIC — seamless looping background songs, one per map.
// ---------------------------------------------------------------------
//  A plain <audio loop> leaves a gap and a click at the join (MP3 files
//  carry hidden silence at both ends). Instead we decode the song with
//  the Web Audio API and build a loop that has no seam:
//
//    1. cut the silence off both ends (loopStart / loopEnd)
//    2. CROSSFADE: the last `crossfade` seconds fade out while the
//       first `crossfade` seconds fade in on top of them
//    3. play that buffer with sample-accurate looping
//
//  The cut points below were measured from the song itself. village.mp3
//  starts after 0.6 s of silence, and its opening comes back exactly
//  56.734 s later (32 bars at ~135 BPM, right after a short pause in the
//  music). So the loop plays one full 56.734 s cycle and, where the song
//  would repeat its opening, jumps back to the real opening. The short
//  crossfade blends two copies of the SAME moment, so the join is smooth.
//
//  loopEnd = loopStart + cycle length + crossfade.
//  To tune a loop, change the numbers here. Times are in seconds.
// =====================================================================

const TRACKS = {
  village: { url: "/music/village.mp3", loopStart: 0.6, loopEnd: 0.6 + 56.73408 + 0.25, crossfade: 0.25, volume: 0.35 },
  // battle.mp3: 0.8 s of silence, fades out from ~129 s, and its opening
  // comes back 61.278 s in, so we loop there (longer crossfade: the repeat
  // is close, not exact). Used for fights on maps with `battleMusic`.
  battle: { url: "/music/battle.mp3", loopStart: 0.8, loopEnd: 0.8 + 61.2778 + 0.5, crossfade: 0.5, volume: 0.35 },
};

const MUTE_KEY = "rune-of-logic-music-muted";
const VOLUME_KEY = "rune-of-logic-music-volume";
const FADE = 0.8; // seconds to fade between maps

let ctx = null;
let master = null;
let current = null; // { name, gain, sources }
let wanted = null; // the track the current map asks for
const decoded = {}; // name -> Promise<{ intro, loop }>

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch (e) {
    return false;
  }
}
let muted = readMuted();

function readVolume() {
  try {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY));
    if (v >= 0 && v <= 1) return v;
  } catch (e) {
    /* storage blocked: use the default */
  }
  return 0.8;
}
let volume = readVolume(); // 0..1, the player's volume slider

// What the master gain should be. Squared so the slider feels even:
// ears hear loudness on a log scale, so a linear gain bunches all the
// change into the bottom of the slider.
function level() {
  return muted ? 0 : volume * volume;
}

function rampMaster() {
  if (!master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(level(), now + 0.1);
}

// Browsers only allow sound after the player taps or presses a key,
// so the audio system is created on the first one.
function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = level();
  master.connect(ctx.destination);
  // Pause the music while the tab/app is in the background (saves battery on phones).
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
  return ctx;
}

function unlock() {
  const c = ensureContext();
  if (c && c.state === "suspended" && !document.hidden) c.resume();
  if (wanted && !current) play(wanted);
}
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

// Build the seamless loop from the decoded song.
//   intro = the first `crossfade` seconds, untouched (played once)
//   loop  = the rest; its first `crossfade` seconds are the song's ending
//           blended into its opening, so it can repeat forever
function buildLoop(buf, t) {
  const sr = buf.sampleRate;
  const a = Math.round(t.loopStart * sr);
  const b = Math.min(buf.length, Math.round(t.loopEnd * sr));
  const x = Math.round(t.crossfade * sr);
  const len = b - a - x;
  const intro = ctx.createBuffer(buf.numberOfChannels, x, sr);
  const loop = ctx.createBuffer(buf.numberOfChannels, len, sr);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const src = buf.getChannelData(ch);
    const head = src.subarray(a, a + x);
    const tail = src.subarray(b - x, b);
    intro.copyToChannel(head, ch);
    const out = loop.getChannelData(ch);
    for (let i = 0; i < x; i++) {
      // equal-power crossfade keeps the loudness steady through the join
      const p = (i / x) * (Math.PI / 2);
      out[i] = tail[i] * Math.cos(p) + head[i] * Math.sin(p);
    }
    // after the blend, carry on with the song right after the intro
    out.set(src.subarray(a + x, b - x), x);
  }
  return { intro, loop };
}

function load(name) {
  if (!decoded[name]) {
    const t = TRACKS[name];
    decoded[name] = fetch(t.url)
      .then((r) => r.arrayBuffer())
      .then((data) => new Promise((ok, fail) => ctx.decodeAudioData(data, ok, fail)))
      .then((buf) => buildLoop(buf, t))
      .catch((e) => {
        delete decoded[name];
        throw e;
      });
  }
  return decoded[name];
}

function stopCurrent() {
  if (!current) return;
  const { gain, sources } = current;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + FADE);
  sources.forEach((s) => {
    try {
      s.stop(now + FADE + 0.05);
    } catch (e) {
      /* already stopped */
    }
  });
  current = null;
}

async function play(name) {
  if (!ensureContext() || ctx.state !== "running") return; // waits for the first tap
  const t = TRACKS[name];
  let parts;
  try {
    parts = await load(name);
  } catch (e) {
    return; // missing or broken file: the game just stays silent
  }
  if (wanted !== name || current?.name === name) return; // player moved on while it loaded
  stopCurrent();
  const gain = ctx.createGain();
  gain.connect(master);
  const start = ctx.currentTime + 0.05;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(t.volume, start + FADE);

  const intro = ctx.createBufferSource();
  intro.buffer = parts.intro;
  intro.connect(gain);
  intro.start(start);

  const loop = ctx.createBufferSource();
  loop.buffer = parts.loop;
  loop.loop = true; // sample-accurate: no gap between repeats
  loop.connect(gain);
  // Start the loop exactly where the intro ends, skipping its blended part
  // (which is only for the 2nd time round and after).
  loop.start(start + parts.intro.duration, t.crossfade);

  current = { name, gain, sources: [intro, loop] };
}

// Called whenever a map loads. `name` is the map's track, or null for silence.
export function setTrack(name) {
  wanted = name && TRACKS[name] ? name : null;
  if (current?.name === wanted) return;
  if (!ctx) return; // nothing plays until the first tap (see unlock)
  if (!wanted) stopCurrent();
  else play(wanted);
}

export function isMuted() {
  return muted;
}

export function setMuted(m) {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch (e) {
    /* storage blocked: the choice just won't be remembered */
  }
  rampMaster();
}

export function getVolume() {
  return volume;
}

export function setVolume(v) {
  volume = Math.min(1, Math.max(0, v));
  try {
    localStorage.setItem(VOLUME_KEY, String(volume));
  } catch (e) {
    /* storage blocked: the choice just won't be remembered */
  }
  rampMaster();
}
