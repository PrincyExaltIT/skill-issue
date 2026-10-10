// engine.js — a tiny, seekable motion timeline for rendering videos frame by frame.
// Markup: any element with data-at="<s>" appears at that time; data-until="<s>" makes it leave.
//   data-fx      fade | rise | pop | wipe | type | grow | blur | slide-l | slide-r | track | zoom   (entrance)
//                track = letter-spacing closes from wide to the element's own value; zoom = scale 1.2 -> 1 (no width axis needed)
//   data-dur     entrance duration (s), default 0.5 (type: 0.035 s per character)
//   data-count   "from:to" number tween between data-at and data-at + data-dur, formatted fr-FR
// Everything becomes a paused Web Animation; window.__seek(t) moves the playhead deterministically.
//
// Two clocks. The scene clock is the authored timeline above. The output clock is the finished video, after
// render.py has fitted the scenes to the voice-over (window.__setTimeline). Scene animations follow the scene
// clock; the "stage" layer added by __setTimeline follows the output clock: wipes between scenes, a slow camera
// push, the drifting background, the beat-synced progress bar and the word-by-word captions.
(() => {
  const FX = {
    fade: [{ opacity: 0 }, { opacity: 1 }],
    rise: [{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' }],
    pop: [{ opacity: 0, transform: 'scale(.86)' }, { opacity: 1, transform: 'scale(1.03)', offset: 0.7 }, { opacity: 1, transform: 'none' }],
    wipe: [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
    blur: [{ opacity: 0, filter: 'blur(14px)' }, { opacity: 1, filter: 'blur(0)' }],
    'slide-l': [{ opacity: 0, transform: 'translateX(-60px)' }, { opacity: 1, transform: 'none' }],
    'slide-r': [{ opacity: 0, transform: 'translateX(60px)' }, { opacity: 1, transform: 'none' }],
    zoom: [{ opacity: 0, transform: 'scale(1.22)' }, { opacity: 1, transform: 'none' }],
    grow: [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
  };
  const EASE = 'cubic-bezier(.2,.8,.2,1)';
  const counters = [];
  const outClock = new Set();          // animations driven by the output clock
  let duration = Number(document.body.dataset.duration || 30);
  let outDuration = duration;
  let captions = [];
  let subsEl = null;
  let barEl = null;
  let host = null;          // { el, set } from mascot.js
  let hostBox = null;
  let hostPlan = null;      // { fps, talk: [], cues: [{t, dur, pose, expr, look}], blinks: [], beat }

  function typeDur(el) { return Number(el.dataset.dur || el.textContent.length * 0.035); }

  function prepare() {
    document.querySelectorAll('[data-at]').forEach((el) => {
      const at = Number(el.dataset.at);
      const fx = el.dataset.fx || 'fade';
      if (fx === 'type') {
        const n = el.textContent.length;
        const dur = typeDur(el);
        el.style.display = 'inline-block';
        el.style.whiteSpace = 'pre';
        el.style.overflow = 'hidden';
        el.style.verticalAlign = 'bottom';
        el.animate([{ width: '0ch' }, { width: n + 'ch' }], { duration: dur * 1000, delay: at * 1000, fill: 'both', easing: `steps(${n}, end)` });
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: at * 1000, fill: 'both' });
      } else if (fx === 'track') {
        const cs = getComputedStyle(el);
        const ls = parseFloat(cs.letterSpacing) || 0;
        const wide = ls + parseFloat(cs.fontSize) * 0.28;
        el.animate([{ opacity: 0, letterSpacing: wide + 'px' }, { opacity: 1, letterSpacing: ls + 'px' }], { duration: Number(el.dataset.dur || 0.9) * 1000, delay: at * 1000, fill: 'both', easing: EASE });
      } else {
        const dur = Number(el.dataset.dur || 0.5);
        if (fx === 'grow') el.style.transformOrigin = el.dataset.origin || 'left center';
        if (fx === 'zoom') el.style.transformOrigin = el.dataset.origin || 'center center';
        el.animate(FX[fx] || FX.fade, { duration: dur * 1000, delay: at * 1000, fill: 'both', easing: EASE });
      }
      if (el.dataset.until) {
        const u = Number(el.dataset.until);
        const out = el.dataset.out || 'fade';
        const kf = out === 'up' ? [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-24px)' }]
          : out === 'blur' ? [{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(12px)' }]
          : [{ opacity: 1 }, { opacity: 0 }];
        el.animate(kf, { duration: 400, delay: u * 1000, fill: 'forwards', easing: 'ease-in' });
      }
      if (el.dataset.count) {
        const [from, to] = el.dataset.count.split(':').map(Number);
        counters.push({ el, from, to, at, dur: Number(el.dataset.dur || 1.2), suffix: el.dataset.suffix || '' });
      }
    });
    document.querySelectorAll('[data-pulse]').forEach((el) => {
      el.animate([{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }], { duration: 1000, iterations: Infinity });
    });
    document.getAnimations().forEach((a) => a.pause());
  }

  /** Every timed element, for render.py: the timeline fit and the sound effects are computed from this list. */
  function events() {
    return [...document.querySelectorAll('[data-at]')].map((el) => {
      const fx = el.dataset.fx || 'fade';
      return {
        at: Number(el.dataset.at),
        dur: fx === 'type' ? typeDur(el) : fx === 'track' ? Number(el.dataset.dur || 0.9) : Number(el.dataset.dur || 0.5),
        until: el.dataset.until ? Number(el.dataset.until) : null,
        fx,
        cls: el.className || '',
        tag: el.tagName.toLowerCase(),
        scene: el.classList.contains('scene'),
        cap: el.classList.contains('cap') || !!el.closest('.cap'),
        chapter: el.classList.contains('chapter') || el.classList.contains('brandmark'),
        leaf: !el.querySelector('[data-at]'),
        count: el.dataset.count || null,
        chars: fx === 'type' ? el.textContent.length : 0,
        mark: (el.textContent.trim()[0] || ''),
      };
    });
  }

  function el(tag, cls, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    (parent || document.body).appendChild(e);
    return e;
  }

  function onOut(a) { a.pause(); outClock.add(a); return a; }

  /**
   * Build the stage layer on the output clock.
   * tl = { duration, sceneStarts: [out s], beat: s, captions: [{t0, t1, words: [{w, t}]}] }
   */
  function setTimeline(tl) {
    outDuration = tl.duration;
    captions = tl.captions || [];
    const style = el('style');
    style.textContent = `
      .cap { display: none !important; }
      #bg { position: absolute; inset: -80px; z-index: -1; overflow: hidden; }
      #bg i { position: absolute; width: 760px; height: 760px; border-radius: 50%; filter: blur(90px); opacity: .34; }
      #bg i:nth-child(1) { background: #5853FF; left: -160px; top: -260px; }
      #bg i:nth-child(2) { background: #FE2C9B; right: -220px; bottom: -330px; opacity: .22; }
      #bg i:nth-child(3) { background: #2F2F9B; left: 420px; top: 260px; opacity: .5; }
      #cam { position: absolute; inset: 0; transform-origin: 0 46%; }
      #host { position: absolute; right: -4px; bottom: 2px; width: 240px; height: 254px; z-index: 55; transform-origin: 50% 100%; }
      #host > div { position: absolute; left: 0; top: 0; width: 500px; height: 530px; transform: scale(.48); transform-origin: 0 0;
                    filter: drop-shadow(0 10px 18px rgba(0,0,0,.35)) drop-shadow(0 0 22px rgba(139,135,255,.25)); }
      #wipe { position: absolute; inset: 0; pointer-events: none; z-index: 50; overflow: hidden; }
      #wipe b { position: absolute; top: -40px; bottom: -40px; width: 160%; left: -30%; transform: translateX(-110%) skewX(-14deg); }
      #wipe b:nth-child(1) { background: #FE2C9B; }
      #wipe b:nth-child(2) { background: #5853FF; }
      #wipe b:nth-child(3) { background: #12123A; }
      #hud { position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: rgba(255,255,255,.07); z-index: 40; }
      #hud i { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: linear-gradient(90deg, #5853FF, #FE2C9B); }
      #hud u { position: absolute; top: -5px; width: 15px; height: 15px; margin-left: -7px; border-radius: 50%; background: #FFDA3E; box-shadow: 0 0 18px #FFDA3E; }
      #subs { position: absolute; left: 540px; bottom: 26px; transform: translateX(-50%); z-index: 45; max-width: 940px; width: max-content;
              padding: 12px 22px 13px; border-radius: 16px; background: rgba(10,10,40,.84); box-shadow: 0 18px 50px -18px #000;
              font: 600 29px/1.32 var(--body); color: #F4F4FF; text-align: center; letter-spacing: -.005em; }
      #subs:empty { display: none; }
      #subs span { display: inline-block; white-space: pre; }
      #subs span.now { color: #FFDA3E; }
    `;
    // background blobs behind everything, a camera wrapper around the authored content
    const bg = el('div');
    bg.id = 'bg';
    for (let i = 0; i < 3; i++) el('i', '', bg);
    document.body.insertBefore(bg, document.body.firstChild);
    const cam = el('div');
    cam.id = 'cam';
    [...document.body.children].forEach((c) => { if (c !== bg && c !== cam && c !== style && c.tagName !== 'SCRIPT') cam.appendChild(c); });
    const wipe = el('div');
    wipe.id = 'wipe';
    const hud = el('div');
    hud.id = 'hud';
    barEl = el('i', '', hud);
    const dot = el('u', '', hud);
    subsEl = el('div');
    subsEl.id = 'subs';

    const D = outDuration * 1000;
    const blobs = [...bg.children];
    blobs.forEach((b, i) => {
      const dx = [140, -120, 90][i], dy = [90, -70, -110][i];
      onOut(b.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx}px,${dy}px) scale(1.18)` }, { transform: 'translate(0,0) scale(1)' }],
        { duration: [17000, 23000, 29000][i], iterations: Infinity, easing: 'ease-in-out' }));
    });
    // beat: the progress dot and the background breathe on every beat, harder on the downbeat
    const beat = tl.beat * 1000;
    onOut(dot.animate([{ transform: 'scale(1.6)', opacity: 1 }, { transform: 'scale(1)', opacity: 0.75 }], { duration: beat, iterations: Infinity, easing: 'cubic-bezier(.1,.8,.3,1)' }));
    onOut(bg.animate([{ opacity: 1 }, { opacity: 0.82 }, { opacity: 0.88 }, { opacity: 0.82 }, { opacity: 0.86 }],
      { duration: beat * 4, iterations: Infinity }));
    // scene cuts: a three-colour diagonal wipe that covers the swap, and the camera resets behind it
    const starts = tl.sceneStarts.filter((s) => s > 0.05);
    const W = 560;
    [...'xyz'].forEach((_, i) => el('b', '', wipe));
    [...wipe.children].forEach((b, i) => {
      const kf = [{ transform: 'translateX(-110%) skewX(-14deg)', offset: 0 }];
      for (const s of starts) {
        const t0 = (s * 1000 - W / 2 + i * 45) / D;
        const t1 = (s * 1000 + i * 45) / D;
        const t2 = (s * 1000 + W / 2 + i * 45) / D;
        if (t0 <= kf[kf.length - 1].offset) continue;
        kf.push({ transform: 'translateX(-110%) skewX(-14deg)', offset: t0, easing: 'cubic-bezier(.7,0,.3,1)' });
        kf.push({ transform: 'translateX(0%) skewX(-14deg)', offset: Math.min(t1, 1), easing: 'cubic-bezier(.7,0,.3,1)' });
        kf.push({ transform: 'translateX(110%) skewX(-14deg)', offset: Math.min(t2, 1) });
        kf.push({ transform: 'translateX(-110%) skewX(-14deg)', offset: Math.min(t2 + 0.0001, 1) });
      }
      if (kf[kf.length - 1].offset < 1) kf.push({ transform: 'translateX(-110%) skewX(-14deg)', offset: 1 });
      onOut(b.animate(kf, { duration: D, fill: 'both' }));
    });
    // camera: a slow push-in on every scene, alternating drift direction
    const bounds = [0, ...starts, outDuration];
    const ck = [];
    for (let j = 0; j < bounds.length - 1; j++) {
      const a = bounds[j] / outDuration, b = Math.max(a, (bounds[j + 1] - 0.02) / outDuration);
      const dir = j % 2 ? -1 : 1;
      const z = tl.host ? 0.855 : 1;
      ck.push({ transform: `translate(${tl.host ? 14 : 0}px,0) scale(${z})`, offset: a });
      ck.push({ transform: `translate(${(tl.host ? 14 : 0) + dir * 8}px,${-dir * 5}px) scale(${z * 1.04})`, offset: b });
    }
    for (let k = 1; k < ck.length; k++) if (ck[k].offset < ck[k - 1].offset) ck[k].offset = ck[k - 1].offset;
    onOut(cam.animate(ck, { duration: D, fill: 'both' }));
    if (tl.host && window.Skillou) {
      hostBox = el('div');
      hostBox.id = 'host';
      const inner = el('div', '', hostBox);
      host = window.Skillou.mount(inner, tl.host.base);
      window.__hostReady = host.ready;
      hostPlan = tl.host;
      // entrance: drops in with a squash, on the output clock
      onOut(hostBox.animate([{ transform: 'translateY(300px) scale(.6)', offset: 0 }, { transform: 'translateY(300px) scale(.6)', offset: 0.15 / tl.duration },
        { transform: 'translateY(-18px) scale(1.04, .96)', offset: 0.55 / tl.duration }, { transform: 'translateY(0) scale(.97, 1.03)', offset: 0.7 / tl.duration },
        { transform: 'translateY(0) scale(1)', offset: 0.85 / tl.duration }, { transform: 'translateY(0) scale(1)', offset: 1 }], { duration: D, fill: 'both' }));
    }
    document.getAnimations().forEach((a) => a.pause());
  }

  /** Skillou's state at output time t, from the plan render.py computed (voice envelope, cues, blinks). */
  function poseHost(t) {
    const P = hostPlan;
    const f = Math.min(P.talk.length - 1, Math.max(0, Math.round(t * P.fps)));
    const talk = P.talk[f] || 0;
    const active = P.cues.filter((c) => t >= c.t && t < c.t + c.dur);
    const cue = active[active.length - 1];
    const RAMP = 0.22;
    let pose = 'idle', poseFrom = 'idle', poseMix = 1, expr = 'neutral', look = talk > 0.05 ? 0.25 : -0.45;
    if (cue) {
      const into = (t - cue.t) / RAMP, out = (cue.t + cue.dur - t) / RAMP;
      if (cue.pose) { pose = cue.pose; poseMix = Math.min(1, into, out); }
      if (cue.expr) expr = cue.expr;
      if (cue.look !== undefined) look = cue.look;
    }
    let blink = 0;
    for (const b of P.blinks) { const d = Math.abs(t - b); if (d < 0.09) blink = Math.max(blink, 1 - d / 0.09); }
    const ph = ((t % P.beat) + P.beat) % P.beat / P.beat;
    const bounce = Math.pow(1 - ph, 3) * (talk > 0.05 ? 0.25 : 0.55) * (P.dance === false ? 0 : 1);
    host.set({ t, talk, pose, poseMix, expr, blink, look, bounce });
  }

  function renderSubs(t) {
    const idx = captions.findIndex((c) => t >= c.t0 && t < c.t1);
    if (idx < 0) { if (subsEl.childElementCount) subsEl.textContent = ''; subsEl.dataset.cue = ''; return; }
    const cue = captions[idx];
    if (subsEl.dataset.cue !== String(idx) || subsEl.childElementCount !== cue.words.length) {
      subsEl.textContent = '';
      cue.words.forEach((w, i) => { const s = el('span', '', subsEl); s.textContent = (i ? ' ' : '') + w.w; });
      subsEl.dataset.cue = String(idx);
    }
    const spans = subsEl.children;
    let now = -1;
    cue.words.forEach((w, i) => { if (t >= w.t) now = i; });
    cue.words.forEach((w, i) => {
      const p = Math.max(0, Math.min(1, (t - w.t) / 0.14));
      spans[i].style.opacity = String(0.28 + 0.72 * p);
      spans[i].style.transform = `translateY(${(1 - p) * 6}px)`;
      spans[i].className = i === now ? 'now' : '';
    });
  }

  function seek(t, out) {
    const o = out === undefined ? t : out;
    document.getAnimations().forEach((a) => { a.pause(); a.currentTime = Math.max(0, (outClock.has(a) ? o : t) * 1000); });
    for (const c of counters) {
      const p = Math.min(1, Math.max(0, (t - c.at) / c.dur));
      const eased = 1 - Math.pow(1 - p, 3);
      c.el.textContent = Math.round(c.from + (c.to - c.from) * eased).toLocaleString('fr-FR') + c.suffix;
    }
    if (barEl) barEl.style.width = `${(100 * o) / outDuration}%`;
    if (barEl) barEl.nextSibling.style.left = `${(100 * o) / outDuration}%`;
    if (subsEl) renderSubs(o);
    if (host) poseHost(o);
    const clock = document.getElementById('clock');
    if (clock) clock.textContent = t.toFixed(1) + ' s';
  }

  window.__prepare = prepare;
  window.__seek = seek;
  window.__events = events;
  window.__setTimeline = setTimeline;
  window.__duration = () => duration;
  // Live preview in a normal browser: play the scene timeline in real time.
  window.addEventListener('load', async () => {
    await document.fonts.ready;
    prepare();
    if (!navigator.webdriver) {
      const t0 = performance.now();
      const tick = () => { const t = ((performance.now() - t0) / 1000) % duration; seek(t); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
    window.__ready = true;
  });
})();
