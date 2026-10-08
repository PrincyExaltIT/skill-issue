// engine.js — a tiny, seekable motion timeline for rendering videos frame by frame.
// Markup: any element with data-at="<s>" appears at that time; data-until="<s>" makes it leave.
//   data-fx      fade | rise | pop | wipe | type | grow | blur | slide-l | slide-r | stretch   (entrance)
//   data-dur     entrance duration (s), default 0.5 (type: 0.035 s per character)
//   data-count   "from:to" number tween between data-at and data-at + data-dur, formatted fr-FR
// Everything becomes a paused CSS/Web Animation; window.__seek(t) moves the playhead deterministically.
(() => {
  const FX = {
    fade: [{ opacity: 0 }, { opacity: 1 }],
    rise: [{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' }],
    pop: [{ opacity: 0, transform: 'scale(.86)' }, { opacity: 1, transform: 'scale(1.03)', offset: 0.7 }, { opacity: 1, transform: 'none' }],
    wipe: [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
    blur: [{ opacity: 0, filter: 'blur(14px)' }, { opacity: 1, filter: 'blur(0)' }],
    'slide-l': [{ opacity: 0, transform: 'translateX(-60px)' }, { opacity: 1, transform: 'none' }],
    'slide-r': [{ opacity: 0, transform: 'translateX(60px)' }, { opacity: 1, transform: 'none' }],
    stretch: [{ fontStretch: '55%', opacity: 0 }, { fontStretch: '125%', opacity: 1 }],
    squeeze: [{ fontStretch: '150%', opacity: 0 }, { fontStretch: '62%', opacity: 1 }],
    grow: [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
  };
  const EASE = 'cubic-bezier(.2,.8,.2,1)';
  const anims = [];
  const counters = [];
  let duration = Number(document.body.dataset.duration || 30);

  function prepare() {
    document.querySelectorAll('[data-at]').forEach((el) => {
      const at = Number(el.dataset.at);
      const fx = el.dataset.fx || 'fade';
      if (fx === 'type') {
        const n = el.textContent.length;
        const dur = Number(el.dataset.dur || n * 0.035);
        el.style.display = 'inline-block';
        el.style.whiteSpace = 'pre';
        el.style.overflow = 'hidden';
        el.style.verticalAlign = 'bottom';
        anims.push(el.animate([{ width: '0ch' }, { width: n + 'ch' }], { duration: dur * 1000, delay: at * 1000, fill: 'both', easing: `steps(${n}, end)` }));
        anims.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: at * 1000, fill: 'both' }));
      } else {
        const dur = Number(el.dataset.dur || 0.5);
        if (fx === 'grow') el.style.transformOrigin = el.dataset.origin || 'left center';
        anims.push(el.animate(FX[fx] || FX.fade, { duration: dur * 1000, delay: at * 1000, fill: 'both', easing: EASE }));
      }
      if (el.dataset.until) {
        const u = Number(el.dataset.until);
        const out = el.dataset.out || 'fade';
        const kf = out === 'up' ? [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-24px)' }]
          : out === 'blur' ? [{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(12px)' }]
          : [{ opacity: 1 }, { opacity: 0 }];
        anims.push(el.animate(kf, { duration: 400, delay: u * 1000, fill: 'forwards', easing: 'ease-in' }));
      }
      if (el.dataset.count) {
        const [from, to] = el.dataset.count.split(':').map(Number);
        counters.push({ el, from, to, at, dur: Number(el.dataset.dur || 1.2), suffix: el.dataset.suffix || '' });
      }
    });
    document.querySelectorAll('[data-pulse]').forEach((el) => {
      anims.push(el.animate([{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }], { duration: 1000, iterations: Infinity }));
    });
    document.getAnimations().forEach((a) => a.pause());
  }

  function seek(t) {
    document.getAnimations().forEach((a) => { a.pause(); a.currentTime = Math.max(0, t * 1000); });
    for (const c of counters) {
      const p = Math.min(1, Math.max(0, (t - c.at) / c.dur));
      const eased = 1 - Math.pow(1 - p, 3);
      c.el.textContent = Math.round(c.from + (c.to - c.from) * eased).toLocaleString('fr-FR') + c.suffix;
    }
    const clock = document.getElementById('clock');
    if (clock) clock.textContent = t.toFixed(1) + ' s';
  }

  window.__prepare = prepare;
  window.__seek = seek;
  window.__duration = () => duration;
  // Live preview in a normal browser: play the timeline in real time.
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
