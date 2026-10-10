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

  // ── Router: the hash is either the id of a view (a <section class="view">: one per tab in the nav) or the id
  // of any element inside a view (a lesson, a tool, an atelier…). The view to show is the target's nearest .view
  // ancestor, so deep links work whatever the id prefix is. The set of views comes from the DOM, never from this
  // file; build.mjs fails the build when an href="#x" has no target inside a view. ──
  const VIEWS = $$('.view').map((v) => v.id);
  const currentView = () => $('.view:not([hidden])')?.id ?? null;
  const decodeHash = (h) => { try { return decodeURIComponent(h); } catch { return h; } };
  function viewFor(id) {
    if (VIEWS.includes(id)) return id;
    const el = document.getElementById(id);
    if (!el) return null;                                   // unknown anchor
    return el.closest('.view')?.id ?? currentView();        // outside every view (e.g. #main, the skip link): stay where we are
  }
  function route() {
    const hash = decodeHash((location.hash || '#accueil').slice(1));
    const viewId = viewFor(hash) ?? 'accueil';
    $$('.view').forEach((v) => { v.hidden = v.id !== viewId; });
    $$('.tab').forEach((t) => { if (t.getAttribute('href') === '#' + viewId) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
    const cur = $(`.tab[href="#${viewId}"]`);
    const crumb = $('.crumb');
    if (crumb) crumb.innerHTML = cur && viewId !== 'accueil' ? `<b>${esc($('.num', cur).textContent)}</b> · ${esc($('.lbl', cur).textContent)}` : '';
    closeMenu();
    const target = hash !== viewId ? document.getElementById(hash) : null;
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    else if (!document.body.classList.contains('present')) window.scrollTo({ top: 0 });
    document.title = (document.querySelector(`#${viewId} [data-title]`)?.dataset.title ?? 'Skill Issue');
    if (document.body.classList.contains('present')) stage(0);
  }
  window.addEventListener('hashchange', route);

  // ── Navigation menu: one button opens every section, grouped; Escape, a click outside or a link closes it ──
  const menuBtn = $('#navmenu-toggle');
  const menu = $('#navmenu');
  function closeMenu() { if (menu && !menu.hidden) { menu.hidden = true; menuBtn?.setAttribute('aria-expanded', 'false'); } }
  menuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.hidden;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    if (open) ($('.tab[aria-current]', menu) ?? $('.tab', menu))?.focus();
  });
  document.addEventListener('click', (e) => { if (menu && !menu.hidden && !menu.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu && !menu.hidden) { closeMenu(); menuBtn?.focus(); } });
  // Focus that leaves both the menu and its button (Tab past the last link, Shift+Tab before the first) closes it.
  // No relatedTarget means a click on something unfocusable or the window losing focus: the click handler covers that.
  const leaveMenu = (e) => { const to = e.relatedTarget; if (to && !menu.contains(to) && !menuBtn?.contains(to)) closeMenu(); };
  menu?.addEventListener('focusout', leaveMenu);
  menuBtn?.addEventListener('focusout', leaveMenu);

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
    const btn = e.target.closest?.('.read-btn');
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
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
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
      b.innerHTML = `<span class="ind"></span>${node.dir ? '▸' : '·'} <span class="nm">${esc(node.name)}</span>${label ? `<span class="lv ${cls}" title="${esc(label)}">${esc(label.split(' · ')[0])}</span>` : ''}`;
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
    const out = { n: $('[data-k="n"]', meter), l1: $('[data-k="l1"]', meter), pct1: $('[data-k="pct1"]', meter), full: $('[data-k="full"]', meter), pct: $('[data-k="pct"]', meter) };
    const META = 100; const BODY = 4500; const ACTIVE = 2;
    const windows = $$('[data-window]', meter);
    let WINDOW = Number(windows[0]?.dataset.window ?? 200000);
    // The figure says the real share, even past 100 % (the bar itself stops at the edge of the window).
    const pct = (v) => { const p = (v / WINDOW) * 100; return (p < 1 ? p.toFixed(1).replace('.', ',') : p.toFixed(0)) + ' %'; };
    const render = () => {
      const n = Number(slider.value);
      const progressive = n * META + Math.min(ACTIVE, n) * BODY;   // only the skills the task needs load their body
      const naive = n * (META + BODY);
      out.n.textContent = n;
      out.l1.textContent = progressive.toLocaleString('fr-FR');
      out.full.textContent = naive.toLocaleString('fr-FR');
      out.pct1.textContent = pct(progressive);
      out.pct.textContent = pct(naive);
      $('.l1', meter).style.width = Math.min(100, (n * META / WINDOW) * 100) + '%';
      $('.l2', meter).style.left = Math.min(100, (n * META / WINDOW) * 100) + '%';
      $('.l2', meter).style.width = Math.min(100, (Math.min(ACTIVE, n) * BODY / WINDOW) * 100) + '%';
      $('.bad', meter).style.width = Math.min(100, (naive / WINDOW) * 100) + '%';
    };
    slider.addEventListener('input', render);
    windows.forEach((b) => b.addEventListener('click', () => {
      WINDOW = Number(b.dataset.window);
      windows.forEach((w) => w.setAttribute('aria-pressed', String(w === b)));
      render();
    }));
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

  // ── Harness matrix: one pane per harness + an at-a-glance status table (measured run vs documented only) ──
  // `status` is computed by build.mjs from course/resultats.json; the page never decides it.
  const harnesses = data('data-harnesses');
  const hTool = $('#harness');
  if (harnesses && hTool && harnesses.list?.length) {
    const seg = $('.seg', hTool);
    const pane = $('.pane', hTool);
    const badge = (s) => (s ? `<span class="lvl${s.key === 'mesure' ? ' base' : ''}">${esc(s.label)}</span>` : '');
    const statusText = (s) => (s ? `${badge(s)} <span class="small muted">${esc(s.detail)}</span>` : '');
    harnesses.list.forEach((h, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = h.name;
      b.addEventListener('click', () => show(i));
      seg.append(b);
    });
    const overview = document.createElement('div');
    overview.className = 'table-wrap';
    const pad = 'style="padding:6px 12px"'; // compact rows: eight harnesses must not double the height of the tool
    overview.innerHTML = `<table><caption class="sr-only">Statut de chaque harness : mesuré par un run, ou documenté seulement</caption>
      <thead><tr><th scope="col" ${pad}>Harness</th><th scope="col" ${pad}>Statut</th></tr></thead>
      <tbody>${harnesses.list.map((h) => `<tr><th scope="row" ${pad}>${esc(h.name)}</th><td ${pad}>${badge(h.status)}${h.status?.short ? ` <span class="small muted">${esc(h.status.short)}</span>` : ''}</td></tr>`).join('')}</tbody></table>`;
    hTool.append(overview);
    function show(i) {
      $$('button', seg).forEach((b, j) => b.setAttribute('aria-selected', String(i === j)));
      const h = harnesses.list[i];
      const row = (k, v) => (v ? `<tr><th scope="row">${k}</th><td>${v}</td></tr>` : '');
      pane.innerHTML = `<div class="table-wrap"><table><tbody>
        ${row('Statut', statusText(h.status))}
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
        : (c.yes ? '✗ Si : la description nomme ce déclencheur (relire, reviewer, vérifier, PR/MR, avant un merge).' : '✗ Non : la description ne doit pas capter ce cas — sinon le skill se déclenche à tort.');
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

  // ── Score tracker (per viewer): the learner's recall per step, next to the measured reference runs ──
  const results = data('data-results');
  const tracker = $('#score-tracker');
  if (results && tracker) {
    const STEPS = ['0', '1', '2', '3', '4', '5'];
    const LABELS = { 0: 'v0 · dix lignes', 1: 'v1 · procédure', 2: 'v2 · règles', 3: 'v3 · scripts', 4: 'v4 · exemples', 5: 'v5 · tests et partage' };
    const mine = store.get('scores', {});
    const body = $('tbody', tracker);
    const note = $('.tracker-note', tracker);
    const ref = (model, s) => results.runs[model]?.[s]?.rappel;
    // v5 has no Claude reference run: show the Codex run of the same folder instead.
    const cell = (model, s) => (ref(model, s) != null ? `${ref(model, s)} %` : model === 'opus' && ref('codex', s) != null ? `Codex ${ref('codex', s)} %` : '—');
    const refresh = () => {
      const filled = STEPS.filter((s) => Number.isFinite(mine[s]?.r));
      if (!filled.length) { note.textContent = "Reporte ton premier score après l'atelier 0."; return; }
      const first = mine[filled[0]].r;
      const last = mine[filled[filled.length - 1]].r;
      note.textContent = filled.length === 1 ? `Point de départ : ${first} %.` : `De ${first} % à ${last} %, en ${filled.length} mesures.`;
    };
    body.innerHTML = STEPS.map((s) => `<tr><th scope="row">${LABELS[s]}</th>`
      + `<td><input type="number" min="0" max="100" inputmode="numeric" data-k="r" data-s="${s}" aria-label="Ton rappel, ${LABELS[s]}" value="${mine[s]?.r ?? ''}"></td>`
      + `<td><input type="number" min="0" max="7" inputmode="numeric" data-k="l" data-s="${s}" aria-label="Tes leurres, ${LABELS[s]}" value="${mine[s]?.l ?? ''}"></td>`
      + `<td>${cell('opus', s)}</td><td>${cell('haiku', s)}</td></tr>`).join('');
    body.addEventListener('input', (e) => {
      const el = e.target.closest('input[data-s]');
      if (!el) return;
      const v = el.value === '' ? undefined : Math.max(0, Math.min(Number(el.max), Number(el.value)));
      mine[el.dataset.s] = { ...(mine[el.dataset.s] ?? {}), [el.dataset.k]: v };
      store.set('scores', mine);
      refresh();
    });
    refresh();
  }

  // ── Video chapters ──
  $$('.video-card').forEach((card) => {
    const v = $('video', card);
    $$('[data-t]', card).forEach((b) => b.addEventListener('click', () => { v.currentTime = Number(b.dataset.t); v.play().catch(() => {}); }));
  });

  // ── La mission: a role-play with branching scenes, read from the data-mission block. One <div class="game"
  // data-game="…"> per game. Scene kinds: "say" (one choice), "ask" (pick N questions, each answer may add a card
  // to the mission sheet), "plan" (tick the measures of the proposal), "end" (verdict and the sheet to download).
  // Each choice moves the trust of the people in the room; Skillou comments as a coach. The run is saved per viewer. ──
  const MISSION = data('data-mission');
  // Inside the claude.ai viewer, a file is offered through the downloads capability; elsewhere, a plain blob link.
  let saver = null;
  if (window.claude?.use) window.claude.use('downloads').then((d) => { saver = d; }).catch(() => {});
  // The game is drawn as a group chat: incoming bubbles on the left, yours on the right, Skillou's tips as private
  // messages, a typing indicator before each incoming line, and your possible answers as drafts above a composer.
  const ICON = {
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
    seen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="16" height="10" x="4" y="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
  };
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  $$('.game[data-game]').forEach((box) => {
    const G = MISSION?.games?.[box.dataset.game];
    if (!G) return;
    const P = MISSION.people;
    const CH = G.chat ?? {};
    const key = 'game:' + box.dataset.game;
    let st = store.get(key, null) ?? { at: G.start, log: [], trust: {}, cards: [], plan: [], asked: [] };
    const save = () => store.set(key, st);
    const who = (id) => P[id] ?? { name: id, role: '', initial: '?' };
    const room = G.room ?? [];
    const face = (id, mood) => id === 'skillou'
      ? `<img class="face skillou" src="media/skillou-${mood || 'parle'}.png" alt="" width="36" height="36">`
      : `<span class="face" style="--c:${who(id).color}" aria-hidden="true">${esc(who(id).initial)}</span>`;
    const idle = `${room.map((id) => who(id).name).join(', ')} · Skillou te conseille en privé`;
    box.innerHTML = `<div class="game-grid"><section class="chat" aria-label="Conversation : ${esc(CH.title ?? G.client)}">`
      + `<header class="chat-head"><div class="chat-faces">${room.map((id) => face(id)).join('')}${face('skillou', 'salut')}</div>`
      + `<div class="chat-who"><b>${esc(CH.title ?? G.client)}</b><span class="chat-status">${esc(idle)}</span></div>`
      + `<button class="chat-reset game-reset" type="button">${ICON.reset}<span>Recommencer</span></button></header>`
      + `<ol class="game-log chat-log" aria-live="polite" aria-relevant="additions" aria-label="Messages" tabindex="-1"></ol>`
      + `<div class="chat-compose"><div class="game-act"></div><div class="compose-bar" aria-hidden="true"><span></span><i>${ICON.send}</i></div></div></section>`
      + `<aside class="game-side" aria-label="Ta fiche mission"><h3>Ta fiche mission</h3><div class="game-trust"></div><h4>Ce que tu sais</h4><ul class="game-cards"></ul></aside></div>`;
    const logEl = $('.game-log', box), act = $('.game-act', box), trustEl = $('.game-trust', box), cardsEl = $('.game-cards', box);
    const statusEl = $('.chat-status', box), barEl = $('.compose-bar span', box);
    const push = (entry) => { st.log.push(entry); save(); };
    const bump = (delta = {}) => { for (const [k, v] of Object.entries(delta)) st.trust[k] = (st.trust[k] ?? 0) + v; };
    const addCard = (id) => { if (id && !st.cards.includes(id)) st.cards.push(id); };
    const trustOf = (id) => Math.max(-4, Math.min(4, st.trust[id] ?? 0));   // what the meter and the sheet show; verdicts use the raw total
    // Skillou's face follows the trust it comments on: a loss → oups, a gain → salut, no change → montre (a hint, not praise).
    const moodOf = (c) => { const d = Object.values(c.trust ?? {}); return c.mood || (d.some((v) => v < 0) ? 'oups' : d.some((v) => v > 0) ? 'salut' : 'montre'); };
    // An "ask" question is covered when the player already holds its card (an earlier answer gave it): it is neither
    // offered again nor reported as missed.
    const covered = (q, d) => !st.asked.includes(q) && Boolean(d.card) && st.cards.includes(d.card);

    // A message's clock time: the conversation starts at CH.time and each message takes a minute.
    const [h0, m0] = String(CH.time ?? '09:30').split(':').map(Number);
    const clock = (i) => { const m = h0 * 60 + m0 + i; return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
    const nb = (s) => String(s).replace(/ ([?!;:»])/g, '\u00a0$1').replace(/« /g, '«\u00a0');
    const line = (i) => {
      const e = st.log[i], prev = st.log[i - 1];
      const me = e.who === 'me', coach = (e.cls ?? '').includes('coach');
      const first = !prev || prev.who !== e.who || (prev.cls ?? '') !== (e.cls ?? '');
      const name = me || !first ? '' : `<span class="name">${esc(who(e.who).name)} <small>${coach ? `${ICON.lock}visible par toi seul` : esc(who(e.who).role)}</small></span>`;
      return `<li class="msg ${me ? 'out' : 'in'}${first ? ' first' : ''} ${e.cls ?? ''}">${me ? '' : `<span class="who">${first ? face(e.who, e.mood) : ''}</span>`}`
        + `<div class="bubble">${name}<div class="text">${nb(e.html)}</div><span class="meta"><span>${clock(i)}</span>${me ? `${ICON.seen}<span class="sr-only">lu</span>` : ''}</span></div></li>`;
    };
    const opening = () => `<li class="chat-day"><span>${esc(CH.day ?? "Aujourd'hui")}</span></li>`
      + (G.intro ? `<li class="chat-note">${ICON.info}<span>${esc(G.intro)}</span></li>` : '');
    const toBottom = (smooth) => logEl.scrollTo({ top: logEl.scrollHeight, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
    // The thread stays pinned to its last message (when the view appears, the composer changes or the window resizes),
    // unless the player scrolled up to reread.
    let pinned = true;
    logEl.addEventListener('scroll', () => { pinned = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 48; }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(() => { if (pinned) toBottom(false); }).observe(logEl);
    // The view is hidden while the page starts, and a background tab may skip resize callbacks: pin again once the
    // router has shown a view, and on every navigation.
    const repin = () => setTimeout(() => { if (pinned) toBottom(false); }, 0);
    window.addEventListener('hashchange', repin);
    repin();

    let shown = st.log.length;   // messages already on screen; the rest are revealed one by one
    let epoch = 0, busy = false, refocus = false;
    function paintAll() {
      logEl.setAttribute('aria-busy', 'true');
      logEl.innerHTML = opening() + st.log.slice(0, shown).map((_, i) => line(i)).join('');
      logEl.removeAttribute('aria-busy');
      toBottom(false);
    }
    function typing(id) {
      $('.typing', logEl)?.remove();
      if (id) {
        logEl.insertAdjacentHTML('beforeend', `<li class="msg in first typing" aria-hidden="true"><span class="who">${face(id, 'parle')}</span><div class="bubble"><span class="dots"><i></i><i></i><i></i></span></div></li>`);
        toBottom(true);
      }
      statusEl.textContent = id ? `${who(id).name} écrit…` : idle;
      statusEl.classList.toggle('is-typing', Boolean(id));
      barEl.textContent = id ? `${who(id).name} écrit…` : barText();
    }
    // Messages added since the last reveal appear in order, each incoming one after a short typing pause.
    async function reveal() {
      if (busy) return;
      busy = true; box.classList.add('is-busy');
      if (refocus) logEl.focus({ preventScroll: true });
      const run = epoch;
      while (shown < st.log.length && run === epoch) {
        const e = st.log[shown];
        if (e.who !== 'me' && !reducedMotion()) {
          typing(e.who);
          await wait(Math.min(1600, 450 + e.html.replace(/<[^>]+>/g, '').length * 7));
          if (run !== epoch) break;
        }
        typing(null);
        logEl.insertAdjacentHTML('beforeend', line(shown));
        logEl.lastElementChild.classList.add('new');
        shown += 1;
        toBottom(true);
        if (!reducedMotion()) await wait(e.who === 'me' ? 380 : 260);
      }
      if (run !== epoch) return;
      busy = false; box.classList.remove('is-busy');
      typing(null);
      toBottom(false);   // the replies are back and the thread got shorter: keep its last message in view
      if (refocus) { refocus = false; $('button, input', act)?.focus({ preventScroll: true }); }
    }

    function renderSide() {
      trustEl.innerHTML = room.map((id) => {
        const v = trustOf(id);
        return `<div class="trust"><span>${esc(who(id).name)} <small>${esc(who(id).role)}</small></span><span class="meter" role="meter" aria-valuemin="-4" aria-valuemax="4" aria-valuenow="${v}" aria-label="Confiance de ${esc(who(id).name)}"><i style="--v:${(v + 4) / 8}"></i></span></div>`;
      }).join('');
      cardsEl.innerHTML = st.cards.length ? st.cards.map((c) => `<li><b>${esc(MISSION.cards[c].title)}</b> ${esc(MISSION.cards[c].text)}</li>`).join('') : '<li class="muted">Rien encore : pose des questions.</li>';
    }
    function barText() {
      const kind = G.scenes[st.at]?.kind;
      return kind === 'plan' ? 'Coche ta proposition, puis envoie-la' : kind === 'end' ? 'Conversation terminée' : 'Choisis ta réponse au-dessus';
    }
    const renderLog = () => { reveal(); };

    function go(id) { st.at = id; save(); renderSide(); renderAct(); renderLog(); }

    // The plan read by the verdicts: key options left out, options that are not good, one option ticked.
    const planOpts = () => G.scenes[st.planScene]?.options ?? {};
    const planValue = (id) => {
      if (id === 'missing') return Object.entries(planOpts()).filter(([k, o]) => o.good && o.key && !st.plan.includes(k)).length;
      if (id === 'bad') return st.plan.filter((k) => planOpts()[k] && !planOpts()[k].good).length;
      if (id.startsWith('plan:')) return st.plan.includes(id.slice(5)) ? 1 : 0;
      return st.trust[id] ?? 0;
    };
    function gaps() {
      const O = planOpts();
      const add = Object.entries(O).filter(([k, o]) => o.good && o.key && !st.plan.includes(k)).map(([, o]) => `- À ajouter : ${o.text}`);
      const drop = st.plan.filter((k) => O[k] && !O[k].good).map((k) => `- À retirer : ${O[k].text}`);
      return add.length || drop.length ? [...add, ...drop] : ['- Rien d\'essentiel : ta proposition couvre les points clés.'];
    }
    function sheet() {
      const goodPlan = st.plan.filter((p) => G.scenes[st.planScene]?.options?.[p]?.good);
      const lines = [`# Fiche mission · ${G.client}`, '', `> ${G.brief}`, '', '## Ce que je sais du client', ...st.cards.map((c) => `- **${MISSION.cards[c].title}** ${MISSION.cards[c].text}`),
        '', `## ${G.planTitle ?? 'Ma proposition'}`, ...goodPlan.map((p) => `- ${G.scenes[st.planScene].options[p].text}`),
        '', '## Ce qui manque', ...gaps(),
        '', '## Où la confiance en est (de -4 à 4)', ...room.map((id) => `- ${who(id).name} (${who(id).role}) : ${trustOf(id)}/4`),
        '', '## Pour la suite', ...G.next.map((n) => `- ${n}`), ''];
      return lines.join('\n');
    }

    const replies = (items) => `<div class="replies" role="group" aria-label="Tes réponses possibles">${items.join('')}</div>`;
    const reply = (attr, text) => `<button class="choice reply" type="button" ${attr}><span>${nb(esc(text))}</span>${ICON.send}</button>`;
    function renderAct() {
      const S = G.scenes[st.at];
      if (!S) { act.innerHTML = ''; return; }
      if (!st.log.some((e) => e.scene === st.at && e.intro)) push({ who: S.who, html: `<p>${S.say}</p>`, scene: st.at, intro: true, mood: S.mood });
      barEl.textContent = barText();
      if (S.kind === 'say') {
        act.innerHTML = replies(S.choices.map((c, i) => reply(`data-i="${i}"`, c.text)));
        act.onclick = (e) => {
          const b = e.target.closest('.choice'); if (!b || busy) return;
          const c = S.choices[Number(b.dataset.i)];
          refocus = true;
          push({ who: 'me', html: `<p>${esc(c.text)}</p>` });
          bump(c.trust); addCard(c.card);
          if (c.reply) push({ who: S.who, html: `<p>${c.reply}</p>` });
          if (c.coach) push({ who: 'skillou', html: `<p>${c.coach}</p>`, mood: moodOf(c), cls: 'coach' });
          go(c.next);
        };
      } else if (S.kind === 'ask') {
        const offered = Object.entries(S.questions).filter(([q, d]) => !st.asked.includes(q) && !covered(q, d));
        const known = Object.entries(S.questions).filter(([q, d]) => covered(q, d));
        const left = Math.min(S.pick - st.asked.filter((q) => S.questions[q]).length, offered.length);
        if (left <= 0) {
          const missed = Object.entries(S.questions).filter(([q, d]) => d.key && !st.asked.includes(q) && !covered(q, d));
          for (const [, d] of missed) push({ who: 'skillou', html: `<p>${d.missedCoach}</p>`, mood: 'oups', cls: 'coach' });
          push({ who: S.who, html: `<p>${S.after}</p>` });
          go(S.next);
          return;
        }
        act.innerHTML = `<p class="hint"><b>Encore ${left} question${left > 1 ? 's' : ''}</b>, choisis bien.`
          + `${known.length ? ` Tu as déjà la réponse à « ${known.map(([, d]) => esc(d.text)).join(' », « ')} » : inutile de la reposer.` : ''}</p>`
          + replies(offered.map(([q, d]) => reply(`data-q="${q}"`, d.text)));
        act.onclick = (e) => {
          const b = e.target.closest('.choice'); if (!b || busy) return;
          const d = S.questions[b.dataset.q];
          refocus = true;
          st.asked.push(b.dataset.q);
          push({ who: 'me', html: `<p>${esc(d.text)}</p>` });
          push({ who: S.who, html: `<p>${d.answer}</p>` });
          bump(d.trust); addCard(d.card);
          save(); renderSide(); renderAct(); renderLog();
        };
      } else if (S.kind === 'plan') {
        st.planScene = st.at;
        act.innerHTML = `<fieldset class="plan"><legend>${esc(S.legend)}</legend>${Object.entries(S.options).map(([k, o]) => `<label><input type="checkbox" value="${k}"> <span>${esc(o.text)}</span></label>`).join('')}</fieldset>`
          + `<div class="plan-send"><p class="hint plan-msg" role="status" aria-live="polite"></p><button class="btn primary" type="button">${esc(S.submit)}${ICON.send}</button></div>`;
        const msg = $('.plan-msg', act);
        $('.plan', act).onchange = () => { msg.textContent = ''; };
        $('.btn', act).onclick = () => {
          if (busy) return;
          st.plan = $$('input:checked', act).map((i) => i.value);
          if (!st.plan.length) { msg.textContent = S.empty ?? 'Coche au moins une proposition avant de passer devant le comité.'; return; }
          refocus = true;
          push({ who: 'me', html: `<ul>${st.plan.map((k) => `<li>${esc(S.options[k].text)}</li>`).join('')}</ul>` });
          for (const k of st.plan) { bump(S.options[k].trust); if (S.options[k].good) addCard(S.options[k].card); if (S.options[k].coach) push({ who: 'skillou', html: `<p>${S.options[k].coach}</p>`, mood: S.options[k].good ? 'salut' : 'oups', cls: 'coach' }); }
          for (const [k, o] of Object.entries(S.options)) if (o.good && o.key && !st.plan.includes(k)) push({ who: 'skillou', html: `<p>${o.missedCoach}</p>`, mood: 'montre', cls: 'coach' });
          go(S.next);
        };
      } else if (S.kind === 'end') {
        const v = S.verdicts.find((x) => (x.when ?? []).every(([id, op, n]) => (op === '>=' ? planValue(id) >= n : planValue(id) < n))) ?? S.verdicts[S.verdicts.length - 1];
        if (!st.log.some((e) => e.verdict)) { push({ who: v.who, html: `<p>${v.say}</p>`, verdict: true }); push({ who: 'skillou', html: `<p>${v.coach}</p>`, mood: v.mood, cls: 'coach' }); }
        act.innerHTML = `<div class="end"><p class="end-title">${esc(v.title)}</p><div class="end-actions"><button class="btn primary" type="button" data-dl>Télécharger ma fiche mission (.md)</button> <a class="btn" href="${S.link}">${esc(S.linkText)}</a></div></div>`;
        $('[data-dl]', act).onclick = async () => {
          const filename = `fiche-mission-${box.dataset.game}.md`;
          if (saver) { try { await saver.save({ filename, data: sheet() }); } catch { /* declined or unavailable: nothing to retry */ } return; }
          const url = URL.createObjectURL(new Blob([sheet()], { type: 'text/markdown' }));
          const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        };
      }
    }
    $('.game-reset', box).onclick = () => {
      epoch += 1; busy = false; box.classList.remove('is-busy');
      st = { at: G.start, log: [], trust: {}, cards: [], plan: [], asked: [] }; shown = 0; save();
      refocus = true;
      paintAll(); typing(null); go(G.start);
    };
    paintAll(); renderSide(); renderAct(); renderLog();
  });

  refreshProgress();
  route();
})();
