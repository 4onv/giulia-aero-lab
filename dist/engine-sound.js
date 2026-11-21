// Original, offline-rendered sound study. Physical timings and source are in
// tools/render_engine.py. Construction and import are silent. Call start()
// directly from a user gesture; onChange reports starting/running/off and
// onRPM reports simulated crankshaft RPM. rev() is a self-releasing blip.
const asset = (name) => new URL("./assets/engine/" + name, import.meta.url);
let activeEngine;

async function fetchPart(name, signal) {
  const response = await fetch(asset(name), { signal });
  if (!response.ok) throw new Error("Could not load the engine sound");
  return name.endsWith(".json") ? response.json() : response.arrayBuffer();
}

function fadeOut(gain, now, seconds) {
  if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
  else {
    const level = gain.value;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(level, now);
  }
  gain.linearRampToValueAtTime(0, now + seconds);
}

function rpmAt(time, profile) {
  if (time >= profile.idleStart) {
    const phase = (time - profile.idleStart) * 2 * Math.PI / profile.idleLength;
    return Math.round(800 + 13 * Math.sin(4 * phase) + 4.5 * Math.sin(7 * phase));
  }
  const knots = profile.curve;
  for (let i = 1; i < knots.length; i++) {
    const [t1, r1] = knots[i];
    if (time > t1) continue;
    const [t0, r0] = knots[i - 1];
    return Math.round(r0 + (r1 - r0) * Math.max(0, (time - t0) / (t1 - t0)));
  }
  return 800;
}

export function createEngineSound({ onChange = () => {}, onRPM = () => {} } = {}) {
  let session = null;
  let cache = null;
  let disposed = false;

  function stop() {
    const old = session;
    if (!old) return;
    session = null;
    if (activeEngine === api) activeEngine = null;
    clearTimeout(old.timeout);
    clearTimeout(old.meterTimer);
    old.controller.abort();
    old.ctx.onstatechange = null;
    const { ctx, master } = old;
    const fade = master && ctx.state === "running" ? 0.065 : 0;
    if (fade) fadeOut(master.gain, ctx.currentTime, fade);
    const close = () => { if (ctx.state !== "closed") ctx.close().catch(() => {}); };
    if (fade) setTimeout(close, fade * 1000 + 10);
    else close();
    onRPM(0);
    onChange("off");
  }

  function startClip(run, offset) {
    const { ctx, master } = run;
    const { buffer, profile } = cache;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    const level = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = profile.idleStart;
    source.loopEnd = Math.min(buffer.duration, profile.idleStart + profile.idleLength);
    level.gain.setValueAtTime(0, now);
    level.gain.linearRampToValueAtTime(1, now + (offset ? 0.075 : 0.009));
    source.connect(level).connect(master);
    source.onended = () => { source.disconnect(); level.disconnect(); };
    source.start(now, offset);
    if (run.voice) {
      fadeOut(run.voice.level.gain, now, 0.075);
      run.voice.source.stop(now + 0.08);
    }
    run.voice = { source, level, start: now - offset };
  }

  function tick(run) {
    if (session !== run) return;
    const time = run.ctx.currentTime - run.voice.start;
    if (!run.running && time >= cache.profile.ignition) {
      run.running = true;
      onChange("running");
    }
    if (session !== run) return;
    onRPM(rpmAt(time, cache.profile));
    // The sound clock advances even if a heavy WebGL frame misses its vsync.
    if (session === run) run.meterTimer = setTimeout(() => tick(run), 75);
  }

  function start() {
    if (disposed || document.hidden) return Promise.resolve(false);
    if (session) return session.ready;
    if (activeEngine && activeEngine !== api) activeEngine.stop();
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    let ctx;
    try {
      ctx = new Audio();
    } catch {
      onChange("off");
      return Promise.resolve(false);
    }
    const run = {
      ctx, controller: new AbortController(), voice: null, master: null,
      running: false, lastBlip: -1, meterTimer: 0, timeout: 0, ready: null,
    };
    session = run;
    activeEngine = api;
    const { signal } = run.controller;
    document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); }, { signal });
    window.addEventListener("pagehide", stop, { signal });
    // A browser can hold resume() indefinitely when a gesture is rejected.
    // Racing cancellation also settles start() if the visitor leaves mid-load.
    const cancelled = new Promise((resolve) => {
      signal.addEventListener("abort", () => resolve(false), { once: true });
    });
    run.timeout = setTimeout(() => { if (session === run) stop(); }, 8000);
    async function open() {
      try {
        const resumed = ctx.resume();
        const load = cache ? Promise.resolve(cache) : Promise.all([
          fetchPart("giulia-v6.mp3", signal).then((bytes) => ctx.decodeAudioData(bytes)),
          fetchPart("sequence.json", signal),
        ]).then(([buffer, profile]) => ({ buffer, profile }));
        const [, loaded] = await Promise.all([resumed, load]);
        if (session !== run || ctx.state !== "running" || document.hidden) {
          if (session === run) stop();
          return false;
        }
        clearTimeout(run.timeout);
        cache = loaded;
        run.master = ctx.createGain();
        run.master.gain.value = 0.80;
        run.master.connect(ctx.destination);
        startClip(run, 0);
        ctx.onstatechange = () => { if (session === run && ctx.state !== "running") stop(); };
        tick(run);
        return true;
      } catch {
        if (session === run) stop();
        return false;
      }
    }
    run.ready = Promise.race([cancelled, open()]);
    onChange("starting");
    return run.ready;
  }

  function rev() {
    if (!session?.running) return false;
    const now = session.ctx.currentTime;
    if (now - session.lastBlip < 0.45) return false;
    const time = now - session.voice.start;
    if (time >= cache.profile.revStart && rpmAt(time, cache.profile) > 1600) return false;
    session.lastBlip = now;
    startClip(session, cache.profile.revStart);
    return true;
  }

  function dispose() {
    disposed = true;
    stop();
    cache = null;
  }

  const api = { start, rev, stop, dispose };
  return api;
}
