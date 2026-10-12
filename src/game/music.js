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
  village: { url: import.meta.env.BASE_URL + "music/village.mp3", loopStart: 0.6, loopEnd: 0.6 + 56.73408 + 0.25, crossfade: 0.25, volume: 0.35 },
  // battle.mp3: 0.8 s of silence, fades out from ~129 s, and its opening
  // comes back 61.278 s in, so we loop there (longer crossfade: the repeat
  // is close, not exact). Used for fights on maps with `battleMusic`.
  battle: { url: import.meta.env.BASE_URL + "music/battle.mp3", loopStart: 0.8, loopEnd: 0.8 + 61.2778 + 0.5, crossfade: 0.5, volume: 0.35 },
  // These three are whole songs with an ending, followed by a long stretch
  // of silence in the file. The loop plays the song through to where the
  // sound stops, then starts it again. Volumes are matched to village.mp3
  // (these files are quieter, the snake song is louder).
  main: { url: import.meta.env.BASE_URL + "music/main.mp3", loopStart: 0.58, loopEnd: 109.6, crossfade: 0.4, volume: 0.75 }, // title screen
  forest: { url: import.meta.env.BASE_URL + "music/forest.mp3", loopStart: 0.78, loopEnd: 83.65, crossfade: 0.4, volume: 0.85 }, // the Private Wilds
  snake: { url: import.meta.env.BASE_URL + "music/snake.mp3", loopStart: 0.84, loopEnd: 42.8, crossfade: 0.3, volume: 0.45 }, // cobra battles
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
  if (!c || document.hidden) return;
  const go = () => wanted && !current && play(wanted);
  if (c.state === "suspended") c.resume().then(go); // play() needs it running
  else go();
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
  // Browsers that remember the player has been here before allow sound
  // straight away; the rest start it on the first tap (see unlock).
  if (!ctx && wanted) ensureContext();
  if (!ctx) return;
  if (!wanted) stopCurrent();
  else play(wanted);
}

// The game over tune: a sad "wah, wah, wah, waaah" that slides down
// half a step at a time, the last note wobbling, over a low drone.
// It's made from oscillators, so no sound file is needed, and it plays
// through `master`, so the mute button and volume slider still apply.
export function playGameOver() {
  setTrack(null);
  if (!ensureContext() || ctx.state !== "running") return;
  const t0 = ctx.currentTime + FADE * 0.5; // let the map song fade first
  const out = ctx.createGain();
  out.gain.value = 0.18;
  out.connect(master);

  const notes = [
    [392.0, 0.0, 0.42], // G4
    [370.0, 0.5, 0.42], // F#4
    [349.2, 1.0, 0.42], // F4
    [329.6, 1.5, 1.9], //  E4, held
  ];
  for (const [freq, at, len] of notes) {
    const start = t0 + at;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq * 1.03, start); // a little "wah" bend into the note
    osc.frequency.exponentialRampToValueAtTime(freq, start + 0.12);
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(1, start + 0.03);
    env.gain.setValueAtTime(1, start + len - 0.15);
    env.gain.linearRampToValueAtTime(0, start + len);
    if (len > 1) {
      const lfo = ctx.createOscillator(); // wobble on the last note
      const depth = ctx.createGain();
      lfo.frequency.value = 6;
      depth.gain.value = 6;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(start + 0.3);
      lfo.stop(start + len);
    }
    osc.connect(env).connect(out);
    osc.start(start);
    osc.stop(start + len + 0.05);
  }

  const drone = ctx.createOscillator(); // low E under the last note
  const dEnv = ctx.createGain();
  drone.type = "triangle";
  drone.frequency.value = 82.41;
  dEnv.gain.setValueAtTime(0, t0 + 1.5);
  dEnv.gain.linearRampToValueAtTime(1.6, t0 + 1.7);
  dEnv.gain.linearRampToValueAtTime(0, t0 + 3.6);
  drone.connect(dEnv).connect(out);
  drone.start(t0 + 1.5);
  drone.stop(t0 + 3.7);
}

// Calls `cb` once sound is allowed to play (right away if it already is).
// Returns a function that cancels the wait.
export function whenSoundReady(cb) {
  const c = ensureContext();
  if (!c || c.state === "running") {
    cb();
    return () => {};
  }
  const check = () => c.state === "running" && cb();
  c.addEventListener("statechange", check);
  return () => c.removeEventListener("statechange", check);
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
