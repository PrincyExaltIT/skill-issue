// mascot.js — Skillou, the course host: a chubby white cat in eXalt-pink sunglasses with a taro bubble tea.
// Art: pieces generated with ChatGPT (studio/assets/skillou), assembled into a cutout rig by skillou_rig.py.
// Every motion is continuous and computed from the output time, so a frame-by-frame render is smooth and repeatable.
// window.Skillou.mount(parent, base) returns { el, ready, set(state) }:
//   state = { t, talk 0..1, pose, poseMix 0..1, expr, blink 0..1, look -1..1, bounce 0..1 }
//   pose: idle | sip | wave | point | cheer | oops        expr: neutral | happy | shock
(() => {
  const RIG = window.SKILLOU_RIG;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };

  function mount(parent, base) {
    const [W, H] = RIG.canvas;
    const root = document.createElement('div');
    root.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:50% 100%;`;
    parent.appendChild(root);
    const head = document.createElement('div');
    const P = {};
    const hp = RIG.parts.head;
    head.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:${hp.x + hp.w * hp.px}px ${hp.y + hp.h * hp.py}px;`;
    const HEAD = new Set(['head', 'eyeL', 'eyeR', 'happyL', 'happyR', 'mouth0', 'mouth1', 'mouth2', 'mouthO', 'glasses']);
    const MOUTH = new Set(['mouth0', 'mouth1', 'mouth2', 'mouthO']);
    const mouthLayer = document.createElement('div');
    mouthLayer.style.cssText = head.style.cssText;
    const loads = [];
    let headAdded = false;
    for (const [name, p] of Object.entries(RIG.parts)) {
      if (HEAD.has(name) && !headAdded) { root.appendChild(head); headAdded = true; }
      const img = new Image();
      img.src = `${base}/${name}.png`;
      img.style.cssText = `position:absolute;left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;transform-origin:${p.w * p.px}px ${p.h * p.py}px;`;
      (MOUTH.has(name) ? mouthLayer : HEAD.has(name) ? head : root).appendChild(img);
      loads.push(img.decode().catch(() => {}));
      P[name] = img;
    }
    root.appendChild(mouthLayer);
    const show = (name, v) => { P[name].style.opacity = String(v); };

    function set(s) {
      const t = s.t || 0;
      const pose = s.pose || 'idle';
      const k = smooth(s.poseMix === undefined ? 1 : s.poseMix);
      const expr = s.expr || 'neutral';
      const talk = s.talk || 0;
      const b = s.bounce || 0;
      // whole body: breathing, a bob on the beat, a hop on cheer, a flinch on shock
      const breath = Math.sin((2 * Math.PI * t) / 2.6);
      const hop = pose === 'cheer' ? Math.abs(Math.sin(t * 7)) * 22 * k : 0;
      const flinch = pose === 'oops' ? Math.sin(t * 40) * 3 * k : 0;
      root.style.transform = `translate(${flinch}px, ${-8 * b - hop}px) scale(${1 - 0.006 * breath + 0.02 * b}, ${1 + 0.012 * breath - 0.02 * b})`;
      // head: idle sway, nods while talking, turns toward where it looks
      const nod = talk * 2.2 * Math.sin(t * 9);
      head.style.transform = `translate(${(s.look || 0) * 9}px, ${-3 * talk - 2 * b}px) rotate(${2.2 * Math.sin((2 * Math.PI * t) / 3.4) + nod}deg)`;
      mouthLayer.style.transform = head.style.transform;
      P.tail.style.transform = `rotate(${8 * Math.sin((2 * Math.PI * t) / 2.2) + 4 * b}deg)`;
      // sunglasses: on the nose; they slide down on shock and the eyes show above them
      const slide = expr === 'shock' ? 34 * k : expr === 'happy' ? -4 : 0;
      P.glasses.style.transform = `translate(0, ${slide}px) rotate(${expr === 'shock' ? -6 * k : 0}deg)`;
      const open = clamp(1 - (s.blink || 0), 0.08, 1);
      const wide = expr === 'shock' ? 1 + 0.15 * k : 1;
      for (const e of ['eyeL', 'eyeR']) P[e].style.transform = `scale(${wide}, ${wide * open})`;
      show('eyeL', expr === 'happy' ? 0 : 1); show('eyeR', expr === 'happy' ? 0 : 1);
      show('happyL', expr === 'happy' ? 1 : 0); show('happyR', expr === 'happy' ? 1 : 0);
      // mouth: four shapes chosen by the voice level, a small "o" on shock, closed while sipping
      let m = talk < 0.12 ? 'mouth0' : talk < 0.42 ? 'mouth1' : 'mouth2';
      if (expr === 'shock') m = 'mouthO';
      if (expr === 'happy' && talk < 0.12) m = 'mouth1';
      if (pose === 'sip') m = 'mouth0';
      for (const n of ['mouth0', 'mouth1', 'mouth2', 'mouthO']) show(n, n === m ? 1 : 0);
      // hands: both paws on the cup; one paw leaves it to wave, point or cheer
      const freeArm = pose === 'wave' || pose === 'point' || pose === 'cheer';
      show('cup', freeArm ? 0 : 1);
      show('cupR', freeArm ? 1 : 0);
      const sip = pose === 'sip' ? k : 0;
      P.cup.style.transform = `translate(0, ${-9 * sip}px) rotate(${-2 * sip}deg)`;
      const cheerLift = pose === 'cheer' ? k : 0;
      P.cupR.style.transform = `translate(${4 * cheerLift}px, ${-10 * cheerLift}px) rotate(${6 * cheerLift + 3 * Math.sin(t * 14) * cheerLift}deg)`;   // the paw must stay on the body
      const waving = pose === 'wave' || pose === 'cheer';
      show('wave', waving ? 1 : 0);
      const wv = pose === 'cheer' ? 16 * Math.sin(t * 14) : 14 * Math.sin(t * 9.5);
      P.wave.style.transform = `rotate(${(1 - k) * 70 + wv * k}deg)`;
      show('pointL', pose === 'point' ? 1 : 0);
      P.pointL.style.transform = `rotate(${(1 - k) * -45 + 3 * Math.sin(t * 4)}deg) scale(${0.7 + 0.3 * k}, 1)`;
    }
    set({ t: 0 });
    return { el: root, ready: Promise.all(loads), set };
  }

  window.Skillou = { mount };
})();
