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
    const pct = (v) => { const p = (v / WINDOW) * 100; return (p < 1 ? p.toFixed(1).replace('.', ',') : Math.min(100, p).toFixed(0)) + ' %'; };
    const render = () => {
      const n = Number(slider.value);
      const progressive = n * META + ACTIVE * BODY;
      const naive = n * (META + BODY);
      out.n.textContent = n;
      out.l1.textContent = progressive.toLocaleString('fr-FR');
      out.full.textContent = naive.toLocaleString('fr-FR');
      out.pct1.textContent = pct(progressive);
      out.pct.textContent = pct(naive);
      $('.l1', meter).style.width = Math.min(100, (n * META / WINDOW) * 100) + '%';
      $('.l2', meter).style.left = Math.min(100, (n * META / WINDOW) * 100) + '%';
      $('.l2', meter).style.width = Math.min(100, (ACTIVE * BODY / WINDOW) * 100) + '%';
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
  $$('.game[data-game]').forEach((box) => {
    const G = MISSION?.games?.[box.dataset.game];
    if (!G) return;
    const P = MISSION.people;
    const key = 'game:' + box.dataset.game;
    let st = store.get(key, null) ?? { at: G.start, log: [], trust: {}, cards: [], plan: [], asked: [] };
    const save = () => store.set(key, st);
    box.innerHTML = `<div class="game-main">${G.intro ? `<p class="game-intro">${esc(G.intro)}</p>` : ''}<ol class="game-log" aria-live="polite"></ol><div class="game-act"></div></div>`
      + `<aside class="game-side" aria-label="Ta fiche mission"><h3>Ta fiche mission</h3><div class="game-trust"></div><h4>Ce que tu sais</h4><ul class="game-cards"></ul>`
      + `<button class="btn game-reset" type="button">Recommencer</button></aside>`;
    const logEl = $('.game-log', box), act = $('.game-act', box), trustEl = $('.game-trust', box), cardsEl = $('.game-cards', box);
    const who = (id) => P[id] ?? { name: id, role: '', initial: '?' };
    const face = (id, mood) => id === 'skillou'
      ? `<img class="face skillou" src="media/skillou-${mood || 'parle'}.png" alt="" width="44" height="44">`
      : `<span class="face" style="--c:${who(id).color}" aria-hidden="true">${esc(who(id).initial)}</span>`;
    const line = (id, html, mood, cls = '') => `<li class="msg ${id === 'me' ? 'me' : ''} ${cls}">${id === 'me' ? '' : face(id, mood)}<div class="bubble">`
      + `${id === 'me' ? '' : `<span class="name">${esc(who(id).name)} <small>${esc(who(id).role)}</small></span>`}${html}</div></li>`;
    const push = (entry) => { st.log.push(entry); save(); };
    const bump = (delta = {}) => { for (const [k, v] of Object.entries(delta)) st.trust[k] = (st.trust[k] ?? 0) + v; };
    const addCard = (id) => { if (id && !st.cards.includes(id)) st.cards.push(id); };
    const trustOf = (id) => Math.max(-4, Math.min(4, st.trust[id] ?? 0));   // what the meter and the sheet show; verdicts use the raw total
    // Skillou's face follows the trust it comments on: a loss → oups, a gain → salut, no change → montre (a hint, not praise).
    const moodOf = (c) => { const d = Object.values(c.trust ?? {}); return c.mood || (d.some((v) => v < 0) ? 'oups' : d.some((v) => v > 0) ? 'salut' : 'montre'); };
    // An "ask" question is covered when the player already holds its card (an earlier answer gave it): it is neither
    // offered again nor reported as missed.
    const covered = (q, d) => !st.asked.includes(q) && Boolean(d.card) && st.cards.includes(d.card);

    function renderSide() {
      trustEl.innerHTML = (G.room ?? []).map((id) => {
        const v = trustOf(id);
        return `<div class="trust"><span>${esc(who(id).name)} <small>${esc(who(id).role)}</small></span><span class="meter" role="meter" aria-valuemin="-4" aria-valuemax="4" aria-valuenow="${v}" aria-label="Confiance de ${esc(who(id).name)}"><i style="--v:${(v + 4) / 8}"></i></span></div>`;
      }).join('');
      cardsEl.innerHTML = st.cards.length ? st.cards.map((c) => `<li><b>${esc(MISSION.cards[c].title)}</b> ${esc(MISSION.cards[c].text)}</li>`).join('') : '<li class="muted">Rien encore : pose des questions.</li>';
    }
    function renderLog() { logEl.innerHTML = st.log.map((e) => line(e.who, e.html, e.mood, e.cls)).join(''); }

    function go(id) { st.at = id; save(); renderSide(); renderLog(); renderAct(); act.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }

    function sheet() {
      const goodPlan = st.plan.filter((p) => G.scenes[st.planScene]?.options?.[p]?.good);
      const lines = [`# Fiche mission · ${G.client}`, '', `> ${G.brief}`, '', '## Ce que je sais du client', ...st.cards.map((c) => `- **${MISSION.cards[c].title}** ${MISSION.cards[c].text}`),
        '', `## ${G.planTitle ?? 'Ma proposition'}`, ...goodPlan.map((p) => `- ${G.scenes[st.planScene].options[p].text}`),
        '', '## Où la confiance en est (de -4 à 4)', ...(G.room ?? []).map((id) => `- ${who(id).name} (${who(id).role}) : ${trustOf(id)}/4`),
        '', '## Pour la suite', ...G.next.map((n) => `- ${n}`), ''];
      return lines.join('\n');
    }

    function renderAct() {
      const S = G.scenes[st.at];
      if (!S) { act.innerHTML = ''; return; }
      if (!st.log.some((e) => e.scene === st.at && e.intro)) { push({ who: S.who, html: `<p>${S.say}</p>`, scene: st.at, intro: true, mood: S.mood }); renderLog(); }
      if (S.kind === 'say') {
        act.innerHTML = `<div class="choices">${S.choices.map((c, i) => `<button class="choice" type="button" data-i="${i}">${esc(c.text)}</button>`).join('')}</div>`;
        act.onclick = (e) => {
          const b = e.target.closest('.choice'); if (!b) return;
          const c = S.choices[Number(b.dataset.i)];
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
        act.innerHTML = `<p class="hint">Encore ${left} question${left > 1 ? 's' : ''} : choisis bien.`
          + `${known.length ? ` Tu as déjà la réponse à « ${known.map(([, d]) => esc(d.text)).join(' », « ')} » : inutile de la reposer.` : ''}</p><div class="choices">`
          + offered.map(([q, d]) => `<button class="choice" type="button" data-q="${q}">${esc(d.text)}</button>`).join('') + '</div>';
        act.onclick = (e) => {
          const b = e.target.closest('.choice'); if (!b) return;
          const d = S.questions[b.dataset.q];
          st.asked.push(b.dataset.q);
          push({ who: 'me', html: `<p>${esc(d.text)}</p>` });
          push({ who: S.who, html: `<p>${d.answer}</p>` });
          bump(d.trust); addCard(d.card);
          save(); renderSide(); renderLog(); renderAct();
        };
      } else if (S.kind === 'plan') {
        st.planScene = st.at;
        act.innerHTML = `<fieldset class="plan"><legend>${esc(S.legend)}</legend>${Object.entries(S.options).map(([k, o]) => `<label><input type="checkbox" value="${k}"> ${esc(o.text)}</label>`).join('')}</fieldset>`
          + `<button class="btn primary" type="button">${esc(S.submit)}</button><p class="hint plan-msg" role="status" aria-live="polite"></p>`;
        const msg = $('.plan-msg', act);
        $('.plan', act).onchange = () => { msg.textContent = ''; };
        $('.btn', act).onclick = () => {
          st.plan = $$('input:checked', act).map((i) => i.value);
          if (!st.plan.length) { msg.textContent = S.empty ?? 'Coche au moins une proposition avant de passer devant le comité.'; return; }
          push({ who: 'me', html: `<ul>${st.plan.map((k) => `<li>${esc(S.options[k].text)}</li>`).join('')}</ul>` });
          for (const k of st.plan) { bump(S.options[k].trust); if (S.options[k].good) addCard(S.options[k].card); if (S.options[k].coach) push({ who: 'skillou', html: `<p>${S.options[k].coach}</p>`, mood: S.options[k].good ? 'salut' : 'oups', cls: 'coach' }); }
          for (const [k, o] of Object.entries(S.options)) if (o.good && o.key && !st.plan.includes(k)) push({ who: 'skillou', html: `<p>${o.missedCoach}</p>`, mood: 'montre', cls: 'coach' });
          go(S.next);
        };
      } else if (S.kind === 'end') {
        const v = S.verdicts.find((x) => (x.when ?? []).every(([id, op, n]) => (op === '>=' ? (st.trust[id] ?? 0) >= n : (st.trust[id] ?? 0) < n))) ?? S.verdicts[S.verdicts.length - 1];
        if (!st.log.some((e) => e.verdict)) { push({ who: v.who, html: `<p>${v.say}</p>`, verdict: true }); push({ who: 'skillou', html: `<p>${v.coach}</p>`, mood: v.mood, cls: 'coach' }); renderLog(); }
        act.innerHTML = `<div class="end"><p><b>${esc(v.title)}</b></p><button class="btn primary" type="button" data-dl>Télécharger ma fiche mission (.md)</button> <a class="btn" href="${S.link}">${esc(S.linkText)}</a></div>`;
        $('[data-dl]', act).onclick = async () => {
          const filename = `fiche-mission-${box.dataset.game}.md`;
          if (saver) { try { await saver.save({ filename, data: sheet() }); } catch { /* declined or unavailable: nothing to retry */ } return; }
          const url = URL.createObjectURL(new Blob([sheet()], { type: 'text/markdown' }));
          const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        };
      }
    }
    $('.game-reset', box).onclick = () => { st = { at: G.start, log: [], trust: {}, cards: [], plan: [], asked: [] }; save(); go(G.start); };
    renderSide(); renderLog(); renderAct();
  });

  refreshProgress();
  route();
})();
