(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const data = (id) => { try { return JSON.parse(document.getElementById(id)?.textContent ?? 'null'); } catch { return null; } };
  const store = {
    get(k, d) { try { const v = localStorage.getItem('skill-issue:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('skill-issue:' + k, JSON.stringify(v)); } catch { /* storage unavailable: progress is simply not remembered */ } },
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ── Router: #accueil, #m1, #m2, #m3, #lab, #kit, #ressources (+ #m2-l3 deep links) ──
  const VIEWS = $$('.view').map((v) => v.id);
  function route() {
    const hash = (location.hash || '#accueil').slice(1);
    const viewId = VIEWS.find((v) => hash === v || hash.startsWith(v + '-')) ?? 'accueil';
    $$('.view').forEach((v) => { v.hidden = v.id !== viewId; });
    $$('.tab').forEach((t) => { if (t.getAttribute('href') === '#' + viewId) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
    const target = hash !== viewId ? document.getElementById(hash) : null;
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    else if (!document.body.classList.contains('present')) window.scrollTo({ top: 0 });
    document.title = (document.querySelector(`#${viewId} [data-title]`)?.dataset.title ?? 'Skill Issue');
    if (document.body.classList.contains('present')) stage(0);
  }
  window.addEventListener('hashchange', route);

  // ── Theme ──
  const root = document.documentElement;
  const savedTheme = store.get('theme', null);
  if (savedTheme) root.dataset.theme = savedTheme;
  $('#theme-toggle')?.addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    store.set('theme', root.dataset.theme);
  });

  // ── Copy buttons on every code/term block ──
  $$('pre.code, pre.term').forEach((pre) => {
    if (pre.dataset.nocopy !== undefined) return;
    const wrap = document.createElement('div');
    wrap.className = 'code-wrap';
    pre.replaceWith(wrap);
    wrap.append(pre);
    if (pre.dataset.lang) { const l = document.createElement('span'); l.className = 'lang'; l.textContent = pre.dataset.lang; wrap.append(l); }
    const b = document.createElement('button');
    b.className = 'copy'; b.type = 'button'; b.textContent = 'Copier';
    b.addEventListener('click', async () => {
      const text = pre.classList.contains('term')
        ? $$('.cmd', pre).map((c) => c.textContent).join('\n') || pre.innerText
        : pre.innerText;
      try { await navigator.clipboard.writeText(text); b.textContent = 'Copié'; }
      catch { const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Sélectionné'; }
      setTimeout(() => { b.textContent = 'Copier'; }, 1600);
    });
    wrap.append(b);
  });

  // ── Lesson progress (per viewer, best effort) ──
  const read = new Set(store.get('read', []));
  function refreshProgress() {
    $$('.lesson[id]').forEach((l) => {
      const on = read.has(l.id);
      const btn = $('.read-btn', l);
      if (btn) { btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? '✓ Leçon lue' : 'Marquer comme lue'; }
      $$(`.toc a[href="#${l.id}"]`).forEach((a) => a.classList.toggle('read', on));
    });
    $$('.toc').forEach((toc) => {
      const links = $$('a[href^="#"]', toc);
      const done = links.filter((a) => a.classList.contains('read')).length;
      const bar = $('.progress i', toc);
      if (bar) bar.style.width = (links.length ? (done / links.length) * 100 : 0) + '%';
    });
    $$('.tab[data-module]').forEach((t) => {
      const lessons = $$(`#${t.dataset.module} .lesson[id]`);
      const all = lessons.length > 0 && lessons.every((l) => read.has(l.id));
      $('.done-mark', t)?.toggleAttribute('hidden', !all);
    });
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.read-btn');
    if (!btn) return;
    const id = btn.closest('.lesson').id;
    read.has(id) ? read.delete(id) : read.add(id);
    store.set('read', [...read]);
    refreshProgress();
  });

  // ── TOC highlighting ──
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        $$(`.toc a`).forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    $$('.lesson[id]').forEach((l) => io.observe(l));
  }

  // ── Presentation mode: arrows walk lessons of the current module ──
  let stageIndex = 0;
  function lessonsInView() { const v = $('.view:not([hidden])'); return v ? $$('.lesson', v) : []; }
  function stage(i) {
    const ls = lessonsInView();
    if (!ls.length) return;
    stageIndex = Math.max(0, Math.min(ls.length - 1, i));
    ls.forEach((l, j) => l.classList.toggle('on-stage', j === stageIndex));
    const label = $('#present-pos');
    if (label) label.textContent = `${stageIndex + 1} / ${ls.length}`;
    window.scrollTo({ top: 0 });
  }
  function togglePresent(force) {
    const on = force ?? !document.body.classList.contains('present');
    document.body.classList.toggle('present', on);
    if (on) {
      if (!lessonsInView().length) location.hash = '#m1';
      stage(0);
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      $$('.lesson').forEach((l) => l.classList.remove('on-stage'));
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    }
  }
  $('#present-toggle')?.addEventListener('click', () => togglePresent());
  $('#present-exit')?.addEventListener('click', () => togglePresent(false));
  $('#present-prev')?.addEventListener('click', () => stage(stageIndex - 1));
  $('#present-next')?.addEventListener('click', () => stage(stageIndex + 1));
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (!document.body.classList.contains('present')) { if (e.key === 'p' && !e.ctrlKey && !e.metaKey) togglePresent(true); return; }
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); stage(stageIndex + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); stage(stageIndex - 1); }
    if (e.key === 'Escape') togglePresent(false);
  });

  // ── Quizzes: <div class="q" data-answer="b" data-why="..."> ──
  $$('.q').forEach((q, qi) => {
    $$('input[type="radio"]', q).forEach((r) => { r.name = r.name || `q${qi}`; });
    q.addEventListener('change', (e) => {
      const r = e.target.closest('input[type="radio"]');
      if (!r) return;
      const ok = r.value === q.dataset.answer;
      let fb = $('.fb', q);
      if (!fb) { fb = document.createElement('p'); fb.className = 'fb'; fb.setAttribute('role', 'status'); q.append(fb); }
      fb.className = 'fb ' + (ok ? 'ok' : 'ko');
      fb.textContent = (ok ? 'Exact. ' : 'Pas tout à fait. ') + (q.dataset.why ?? '');
    });
  });

  // ── Anatomy explorer ──
  const anatomy = data('data-anatomy');
  const explorer = $('#anatomy');
  if (anatomy && explorer) {
    const tree = $('.tree', explorer);
    const pane = $('.pane', explorer);
    const LV = { 1: ['l1', 'N1 · toujours'], 2: ['l2', 'N2 · au déclenchement'], 3: ['l3', 'N3 · à la demande'], x: ['l3', 'exécuté'], 0: ['', 'hors skill'] };
    anatomy.forEach((node, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'treeitem'); b.setAttribute('aria-selected', 'false');
      b.style.setProperty('--d', node.depth);
      const [cls, label] = LV[node.level] ?? ['', ''];
      b.innerHTML = `<span class="ind"></span>${node.dir ? '▸' : '·'} ${esc(node.name)}${label ? `<span class="lv ${cls}" title="${esc(label)}">${esc(label.split(' · ')[0])}</span>` : ''}`;
      b.addEventListener('click', () => select(i));
      tree.append(b);
    });
    function select(i) {
      $$('button', tree).forEach((b, j) => b.setAttribute('aria-selected', String(i === j)));
      const n = anatomy[i];
      const [, label] = LV[n.level] ?? ['', ''];
      pane.innerHTML = `<h4>${esc(n.path)}</h4>${label ? `<span class="lvl ${n.level === 1 ? 'base' : n.level === 2 ? 'core' : 'deep'}">${esc(label)}</span>` : ''}<p class="role">${n.role}</p>${n.excerpt ? `<pre class="code" data-nocopy>${esc(n.excerpt)}</pre>` : ''}`;
    }
    select(anatomy.findIndex((n) => n.name === 'SKILL.md'));
  }

  // ── Context meter ──
  const meter = $('#meter');
  if (meter) {
    const slider = $('input', meter);
    const out = { n: $('[data-k="n"]', meter), l1: $('[data-k="l1"]', meter), full: $('[data-k="full"]', meter), pct: $('[data-k="pct"]', meter) };
    const WINDOW = 200000; const META = 100; const BODY = 4500; const ACTIVE = 2;
    const render = () => {
      const n = Number(slider.value);
      const progressive = n * META + ACTIVE * BODY;
      const naive = n * (META + BODY);
      out.n.textContent = n;
      out.l1.textContent = progressive.toLocaleString('fr-FR');
      out.full.textContent = naive.toLocaleString('fr-FR');
      out.pct.textContent = Math.min(100, (naive / WINDOW) * 100).toFixed(0) + ' %';
      $('.l1', meter).style.width = Math.min(100, (n * META / WINDOW) * 100) + '%';
      $('.l2', meter).style.left = Math.min(100, (n * META / WINDOW) * 100) + '%';
      $('.l2', meter).style.width = Math.min(100, (ACTIVE * BODY / WINDOW) * 100) + '%';
      $('.bad', meter).style.width = Math.min(100, (naive / WINDOW) * 100) + '%';
    };
    slider.addEventListener('input', render);
    render();
  }

  // ── Rules catalogue ──
  const rules = data('data-rules');
  const rulesTool = $('#rules');
  if (rules && rulesTool) {
    const q = $('input[type="search"]', rulesTool);
    const sev = $('#rules-sev');
    const dom = $('#rules-domain');
    const mech = $('#rules-mech');
    const body = $('tbody', rulesTool);
    const count = $('.count', rulesTool);
    [...new Set(rules.map((r) => r.domain))].sort().forEach((d) => dom.append(new Option(d, d)));
    const draw = () => {
      const term = q.value.trim().toLowerCase();
      const list = rules.filter((r) => (!term || `${r.id} ${r.title}`.toLowerCase().includes(term))
        && (!sev.value || r.severity.includes(sev.value)) && (!dom.value || r.domain === dom.value)
        && (!mech.checked || r.mechanical));
      count.textContent = `${list.length} / ${rules.length} règles`;
      body.innerHTML = list.map((r) => `<tr><td><code>${esc(r.id)}</code></td><td>${esc(r.title)}${r.gate ? ` <span class="lvl">${esc(r.gate)}</span>` : ''}${r.added ? ' <span class="lvl deep">v2</span>' : ''}</td><td>${r.severity.split('/').map((s) => `<span class="sev ${s.toLowerCase()}">${s}</span>`).join(' ')}</td><td>${esc(r.domain)}</td><td>${r.mechanical ? '<span title="détecté par scripts/scan.mjs">script + LLM</span>' : 'LLM'}</td></tr>`).join('');
    };
    [q, sev, dom, mech].forEach((el) => el.addEventListener('input', draw));
    draw();
  }

  // ── Harness matrix ──
  const harnesses = data('data-harnesses');
  const hTool = $('#harness');
  if (harnesses && hTool && harnesses.list?.length) {
    const seg = $('.seg', hTool);
    const pane = $('.pane', hTool);
    harnesses.list.forEach((h, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = h.name;
      b.addEventListener('click', () => show(i));
      seg.append(b);
    });
    function show(i) {
      $$('button', seg).forEach((b, j) => b.setAttribute('aria-selected', String(i === j)));
      const h = harnesses.list[i];
      const row = (k, v) => (v ? `<tr><th scope="row">${k}</th><td>${v}</td></tr>` : '');
      pane.innerHTML = `<div class="table-wrap"><table><tbody>
        ${row('Support SKILL.md', esc(h.support))}
        ${row('Skills projet', (h.project || []).map((p) => `<code>${esc(p)}</code>`).join('<br>'))}
        ${row('Skills utilisateur', (h.user || []).map((p) => `<code>${esc(p)}</code>`).join('<br>'))}
        ${row('Invocation', esc(h.invoke))}
        ${row('Spécificités', esc(h.extras))}
        ${row('Installer le kit', h.install ? `<code>${esc(h.install)}</code>` : '')}
        ${row('Source', (h.sources || []).map((s) => `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(s.replace(/^https?:\/\//, ''))}</a>`).join('<br>'))}
      </tbody></table></div>${h.note ? `<p class="small muted">${esc(h.note)}</p>` : ''}`;
    }
    show(0);
  }

  // ── Trigger game ──
  const triggers = data('data-triggers');
  const game = $('#trigger-game');
  if (triggers && game) {
    const deck = [...triggers.should_trigger.map((p) => ({ p, yes: true })), ...triggers.should_not_trigger.map((p) => ({ p, yes: false }))]
      .map((c, i) => ({ ...c, k: (i * 7919) % 101 })).sort((a, b) => a.k - b.k);
    let i = 0; let good = 0; let done = 0;
    const promptEl = $('.prompt', game); const fb = $('.fb-line', game); const score = $('.score', game);
    const next = () => { promptEl.textContent = '« ' + deck[i % deck.length].p + ' »'; fb.textContent = ''; };
    const answer = (yes) => {
      const c = deck[i % deck.length];
      const ok = c.yes === yes;
      done++; if (ok) good++;
      fb.textContent = ok ? (c.yes ? '✓ Oui : la description couvre ce cas.' : '✓ Non : hors périmètre, un autre skill (ou aucun) doit répondre.')
        : (c.yes ? '✗ Si : la description nomme ce déclencheur (review, audit, PR/MR, « is it good Angular »).' : '✗ Non : la description ne doit pas capter ce cas — sinon le skill se déclenche à tort.');
      score.textContent = `${good}/${done}`;
      i++;
      setTimeout(next, 1700);
    };
    $('[data-yes]', game).addEventListener('click', () => answer(true));
    $('[data-no]', game).addEventListener('click', () => answer(false));
    next();
  }

  // ── Lab checklist (per viewer) ──
  const steps = store.get('lab', {});
  $$('input[data-step]').forEach((cb) => {
    cb.checked = Boolean(steps[cb.dataset.step]);
    cb.addEventListener('change', () => { steps[cb.dataset.step] = cb.checked; store.set('lab', steps); });
  });

  // ── Video chapters ──
  $$('.video-card').forEach((card) => {
    const v = $('video', card);
    $$('[data-t]', card).forEach((b) => b.addEventListener('click', () => { v.currentTime = Number(b.dataset.t); v.play().catch(() => {}); }));
  });

  refreshProgress();
  route();
})();
