'use strict';

const mApp = document.querySelector('#m-app');
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const levels = [
  { name: 'Business · L1', tag: 'Іскерлік' },
  { name: 'Intermediate', tag: 'Орта деңгей' },
  { name: 'Advanced', tag: 'Жоғары' },
  { name: 'Beginner · L1', tag: 'Бастапқы' },
  { name: 'Beginner · L2', tag: 'Бастапқы 2' },
  { name: 'Business · L2', tag: 'Іскерлік 2' },
  { name: 'Grammar Guide', tag: 'Грамматика' }
];
const courseOrder = [6, 3, 4, 1, 2, 0, 5];
const bookSections = [
  { route: 'vocabulary', title: 'Сөздік қор', books: vocabularyBooks.slice(0, 2) },
  { route: 'phrases', title: 'Фразалар мен Идиомалар', books: vocabularyBooks.slice(2) }
];

const storageKey = 'folio-study-v1';
const state = { done: {}, notes: {}, bookmarks: {}, last: null, lastLesson: null };
try {
  const s = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
  for (const k of ['done', 'notes', 'bookmarks']) if (s?.[k] && typeof s[k] === 'object') state[k] = s[k];
  if (s?.last) state.last = s.last;
  if (s?.lastLesson) state.lastLesson = s.lastLesson;
} catch {}
const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {} };

const title = b => books[b]?.name ?? (b === 12 ? 'Grammar Guide' : b % 2 ? 'Practice Book' : 'Course Book');
const pageSrc = (b, p) => `../pages/${b}/${p}.webp`;
const orderedBooks = () => [...courseOrder.flatMap(i => [books[i * 2], books[i * 2 + 1]]), ...vocabularyBooks];

function bookProg(id) {
  const b = books[id];
  if (!b?.units?.length) return { done: 0, total: 0, pct: 0 };
  let done = 0;
  for (let i = 0; i < b.units.length; i++) if (state.done[id + '-' + i]) done++;
  return { done, total: b.units.length, pct: Math.round((done / b.units.length) * 100) };
}

const loadedScripts = {};
function loadOnce(src) {
  if (loadedScripts[src]) return loadedScripts[src];
  loadedScripts[src] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = false; s.onload = res; s.onerror = rej;
    document.body.append(s);
  });
  return loadedScripts[src];
}
async function ensureAssets({ audio = false, bookAudio = false, practice = false } = {}) {
  if ((audio || bookAudio) && typeof dkAudio === 'undefined') await loadOnce('../audio-data.js');
  if (bookAudio && (typeof dkAudio === 'undefined' || !dkAudio?.[14])) await loadOnce('../book-audio.js');
  if (practice && typeof izPractice === 'undefined') await loadOnce('../practice.js?v=20261126');
}

function applyTheme(t) {
  if (t === 'sepia' || t === 'dark') document.documentElement.dataset.theme = t;
  else { delete document.documentElement.dataset.theme; t = 'day'; }
  try { localStorage.setItem('iz-theme', t); } catch {}
  document.querySelectorAll('.m-theme button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === t)));
}
try { applyTheme(localStorage.getItem('iz-theme') || 'day'); } catch { applyTheme('day'); }
document.querySelectorAll('.m-theme button').forEach(b => { b.onclick = () => applyTheme(b.dataset.theme); });

let catFilter = 'all';
function renderHome() {
  const doneTotal = Object.keys(state.done).length;
  const lastHref = state.last ? (state.last.u != null ? `#lesson/${state.last.b}/${state.last.u}/${state.last.p}` : `#read/${state.last.b}/${state.last.p}`) : null;
  const lastTitle = state.last ? (state.last.u != null ? books[state.last.b]?.units[state.last.u]?.title : title(state.last.b)) : '';

  const pills = [
    { id: 'all', label: 'Барлығы' },
    { id: 'levels', label: 'Levels 1–4' },
    { id: 'business', label: 'Business' },
    { id: 'grammar', label: 'Грамматика' },
    { id: 'vocabulary', label: 'Сөздік' },
    { id: 'phrases', label: 'Фразалар' }
  ];

  const items = [];
  for (const i of courseOrder) {
    if (catFilter === 'levels' && (i < 1 || i > 4)) continue;
    if (catFilter === 'business' && i !== 0 && i !== 5) continue;
    if (catFilter === 'grammar' && i !== 6) continue;
    if (catFilter === 'vocabulary' || catFilter === 'phrases') continue;
    const bId = 2 * i, p = bookProg(bId);
    items.push(`<a href="#course/${bId}" class="m-course">
      <div class="m-course-top" style="background:var(--soft)"><span>${esc(levels[i].tag)}</span><span>${p.pct}%</span></div>
      <div class="m-course-body"><b>${esc(levels[i].name)}</b><span class="m-muted">${p.done}/${p.total} сабақ</span>
      <div class="m-bar"><i style="width:${p.pct}%"></i></div></div>
    </a>`);
  }
  for (const sec of bookSections) {
    if (catFilter !== 'all' && catFilter !== sec.route) continue;
    for (const b of sec.books) {
      const p = bookProg(b.id);
      items.push(`<a href="#course/${b.id}" class="m-course">
        <div class="m-course-top" style="background:#ece1f5;color:#513663"><span>Кітап</span><span>${p.pct}%</span></div>
        <div class="m-course-body"><b>${esc(b.name)}</b><span class="m-muted">${p.done}/${p.total} тақырып</span>
        <div class="m-bar"><i style="width:${p.pct}%"></i></div></div>
      </a>`);
    }
  }

  mApp.innerHTML = `<section class="m-hero">
    <span class="m-badge">18 КІТАП · 1 300 САБАҚ</span>
    <h1>Ағылшын тілін қазақша үйрен</h1>
    <div style="font-size:12.5px;opacity:.9">Өтілді: <b>${doneTotal}</b> / 1 300 сабақ</div>
    ${lastHref ? `<a class="m-btn light" href="${lastHref}">Жалғастыру: ${esc(lastTitle)} →</a>` : '<a class="m-btn light" href="#library">Кітап таңдау →</a>'}
  </section>
  <div class="m-pills">${pills.map(p => `<button type="button" class="${catFilter === p.id ? 'on' : ''}" data-f="${p.id}">${p.label}</button>`).join('')}</div>
  <div class="m-grid2">${items.join('')}</div>`;

  document.querySelectorAll('.m-pills button').forEach(b => { b.onclick = () => { catFilter = b.dataset.f; renderHome(); }; });
}

function renderLibrary() {
  mApp.innerHTML = `<h1 class="m-h1">Кітапхана (18 кітап)</h1>
    <div class="m-list">${orderedBooks().map(b => {
      const p = bookProg(b.id);
      return `<a href="#course/${b.id}" class="m-row">
        <img src="${pageSrc(b.id, 1)}" alt="">
        <div style="flex:1;min-width:0"><b>${esc(b.name || levels[b.id >> 1].name + ' · ' + title(b.id))}</b>
          <div class="m-muted">${b.total} бет · ${p.done}/${p.total} сабақ</div>
        </div><span>›</span>
      </a>`;
    }).join('')}</div>`;
}

function renderCourse(b) {
  const book = books[b];
  if (!book) { renderHome(); return; }
  const pairId = b < 14 ? (b ^ 1) : -1;
  mApp.innerHTML = `<a href="#library" class="m-muted">← Кітапхана</a>
    <h1 class="m-h1">${esc(book.name || levels[b >> 1].name + ' · ' + title(b))}</h1>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <a class="m-btn soft" href="#read/${b}/1">Басынан оқу</a>
      ${pairId >= 0 ? `<a class="m-btn soft" href="#course/${pairId}">${esc(title(pairId))}</a>` : ''}
    </div>
    <input id="m-cq" class="m-input" type="search" placeholder="Сабақты іздеу...">
    <div id="m-units" class="m-list"></div>`;

  const list = q => {
    document.querySelector('#m-units').innerHTML = book.units
      .map((u, i) => ({ u, i }))
      .filter(({ u, i }) => (u.title + ' ' + (i + 1)).toLowerCase().includes(q.trim().toLowerCase()))
      .map(({ u, i }) => {
        const done = Boolean(state.done[b + '-' + i]);
        return `<a href="#lesson/${b}/${i}" class="m-row${done ? ' done' : ''}">
          <span class="m-num">${done ? '✓' : i + 1}</span>
          <div style="flex:1"><b>${esc(u.title)}</b><div class="m-muted">${u.start}–${u.end} бет</div></div>
        </a>`;
      }).join('') || '<p class="m-muted">Табылмады.</p>';
  };
  list('');
  document.querySelector('#m-cq').oninput = e => list(e.target.value);
}

let reqId = 0;
async function renderReader(b, u, p) {
  const book = books[b];
  if (!book) { renderHome(); return; }
  const unit = book.units[u], single = Boolean(unit);
  const start = single ? unit.start : 1, end = single ? unit.end : book.total;
  p = Number.isInteger(p) && p >= start && p <= end ? p : start;
  const req = ++reqId;

  const unitKey = b + '-' + u;
  const isDone = single && Boolean(state.done[unitKey]);
  const url = n => single ? `#lesson/${b}/${u}/${n}` : `#read/${b}/${n}`;
  const markId = url(p);
  const marked = Object.hasOwn(state.bookmarks, markId);
  state.last = { b, u: single ? u : null, p };
  if (single) state.lastLesson = state.last;
  save();

  const pairId = b < 14 && single && books[b ^ 1]?.units[u] ? (b ^ 1) : -1;
  mApp.innerHTML = `<div class="m-reader-top">
      <a href="${single ? '#course/' + b : '#library'}" class="m-btn soft">←</a>
      <b style="flex:1;text-align:center;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(single ? unit.title : title(b))}</b>
      ${single ? `<button type="button" id="m-done" class="m-btn ${isDone ? 'success' : 'soft'}">${isDone ? '✓ Өтілді' : 'Аяқтау'}</button>` : ''}
    </div>
    <div class="m-page-wrap">
      <div class="m-pager">
        <a href="${url(Math.max(start, p - 1))}" class="m-btn soft" ${p === start ? 'style="opacity:.4;pointer-events:none"' : ''}>‹ Алдыңғы</a>
        <span>${p} / ${end} бет</span>
        <a href="${url(Math.min(end, p + 1))}" class="m-btn soft" ${p === end ? 'style="opacity:.4;pointer-events:none"' : ''}>Келесі ›</a>
      </div>
      <img src="${pageSrc(b, p)}" alt="${p}-бет">
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${pairId >= 0 ? `<a class="m-btn" style="flex:1" href="#lesson/${pairId}/${u}">${b % 2 === 0 ? title(pairId) + ' →' : '← ' + title(pairId)}</a>` : ''}
    </div>
    <div id="m-audio-slot"></div>
    <div class="lessonlayout" style="display:block"><div class="side" id="m-practice-slot"></div></div>
    ${single ? `<div class="m-card"><b>Менің жазбам</b><textarea id="m-note" class="m-input" style="margin-top:8px;min-height:80px" placeholder="Ереже не сөздер...">${esc(state.notes[unitKey] ?? '')}</textarea></div>` : ''}`;

  if (single && document.querySelector('#m-done')) {
    document.querySelector('#m-done').onclick = () => {
      if (state.done[unitKey]) delete state.done[unitKey]; else state.done[unitKey] = Date.now();
      save(); renderReader(b, u, p);
    };
  }
  if (single && document.querySelector('#m-note')) {
    document.querySelector('#m-note').oninput = e => {
      if (e.target.value.trim()) state.notes[unitKey] = e.target.value; else delete state.notes[unitKey];
      save();
    };
  }

  const topicIndex = single ? u : book.units.findIndex(t => t.start <= p && p <= t.end);
  const audioNum = b >= 14 ? topicIndex + 1 - (b === 16 ? 3 : 2) : u + 1;
  const needAudio = (b >= 14 && topicIndex >= 0) || (single && b < 12);
  try {
    await ensureAssets({ audio: needAudio, bookAudio: needAudio && b >= 14, practice: b !== 12 });
  } catch { return; }
  if (req !== reqId) return;

  if (needAudio && (b >= 14 ? dkAudio?.[b]?.[audioNum] : single && b < 12)) {
    const slot = document.querySelector('#m-audio-slot');
    if (slot) slot.append(createLessonAudio(b, audioNum));
  }
  if (b !== 12 && typeof izPractice === 'object' && izPractice?.mount) {
    izPractice.mount(mApp, b, p, book.answer);
  }
}

function renderSearch() {
  mApp.innerHTML = `<h1 class="m-h1">Іздеу</h1>
    <input id="m-sq" class="m-input" type="search" placeholder="Сабақ немесе тақырып...">
    <div id="m-sr" class="m-list"></div>`;
  const run = q => {
    const t = q.trim().toLowerCase();
    const res = [];
    if (t) {
      for (const b of orderedBooks()) {
        b.units.forEach((u, i) => {
          if (u.title.toLowerCase().includes(t)) res.push(`<a href="#lesson/${b.id}/${i}" class="m-row"><div><b>${esc(u.title)}</b><div class="m-muted">${esc(title(b.id))}</div></div></a>`);
        });
      }
    }
    document.querySelector('#m-sr').innerHTML = res.slice(0, 30).join('') || `<p class="m-muted">${t ? 'Табылмады' : 'Іздеу сөзін енгізіңіз'}</p>`;
  };
  document.querySelector('#m-sq').oninput = e => run(e.target.value);
  run('');
}

function renderSaved() {
  const bms = Object.entries(state.bookmarks);
  const nts = Object.entries(state.notes).filter(([, v]) => typeof v === 'string' && v.trim());
  mApp.innerHTML = `<h1 class="m-h1">Менің беттерім</h1>
    <div class="m-card"><b>Өтілген сабақ:</b> ${Object.keys(state.done).length} / 1 300</div>
    <div class="m-card" style="display:grid;gap:8px">
      <button type="button" class="m-btn" id="m-pdf">📄 PDF ретінде сақтау</button>
      <div style="display:flex;gap:8px">
        <button type="button" class="m-btn soft" style="flex:1" id="m-exp">💾 Көшірме (.json)</button>
        <label class="m-btn soft" style="flex:1">⬆ Қалпына келтіру<input type="file" id="m-imp" accept=".json" hidden></label>
      </div>
    </div>
    ${bms.length ? `<div class="m-list"><b>Бетбелгілер (${bms.length})</b>${bms.map(([k, v]) => `<div class="m-row"><a style="flex:1" href="${esc(k)}"><b>${esc(v.u != null ? books[v.b]?.units[v.u]?.title : title(v.b))}</b><div class="m-muted">${v.p}-бет</div></a><button type="button" class="m-btn soft" data-db="${esc(k)}">✕</button></div>`).join('')}</div>` : ''}
    ${nts.length ? `<div class="m-list"><b>Жазбалар (${nts.length})</b>${nts.map(([k, txt]) => {
      const [b, u] = k.split('-').map(Number);
      return `<div class="m-card"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(books[b]?.units[u]?.title || k)}</b><button type="button" class="m-btn soft" data-dn="${esc(k)}">✕</button></div><p class="m-muted" style="white-space:pre-wrap">${esc(txt)}</p></div>`;
    }).join('')}</div>` : ''}`;

  document.querySelector('#m-pdf').onclick = () => window.print();
  document.querySelector('#m-exp').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, study: state }, null, 2)], { type: 'application/json' }));
    a.download = 'izilingua-progress.json'; a.click();
  };
  document.querySelector('#m-imp').onchange = async e => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (d?.study) { Object.assign(state, d.study); save(); renderSaved(); }
    } catch {}
  };
  document.querySelectorAll('[data-db]').forEach(x => { x.onclick = () => { delete state.bookmarks[x.dataset.db]; save(); renderSaved(); }; });
  document.querySelectorAll('[data-dn]').forEach(x => { x.onclick = () => { delete state.notes[x.dataset.dn]; save(); renderSaved(); }; });
}

function route() {
  const [view, b, u, p] = location.hash.slice(1).split('/');
  if (view === 'library') renderLibrary();
  else if (view === 'course' && books[Number(b)]) renderCourse(Number(b));
  else if (view === 'lesson' && books[Number(b)]?.units[Number(u)]) renderReader(Number(b), Number(u), Number(p));
  else if (view === 'read' && books[Number(b)]) renderReader(Number(b), null, Number(u));
  else if (view === 'search') renderSearch();
  else renderHome();

  const tab = view === 'library' || view === 'course' ? 'library' : view === 'search' ? 'search' : 'home';
  document.querySelectorAll('.m-tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
