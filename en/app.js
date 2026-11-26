'use strict';

const levels = [
  { name: 'Business English · Level 1', level: '05', tag: 'Business English', desc: 'Introductions, meetings, negotiations, and business emails.' },
  { name: 'Intermediate', level: '03', tag: 'Intermediate (B1)', desc: 'Everyday conversation, expanding vocabulary, and grammar.' },
  { name: 'Advanced', level: '04', tag: 'Advanced (B2–C1)', desc: 'Complex structures, fluent speaking, and nuanced expression.' },
  { name: 'Beginner · Level 1', level: '01', tag: 'Beginner (A1)', desc: 'Introducing yourself, simple questions, and everyday words.' },
  { name: 'Beginner · Level 2', level: '02', tag: 'Elementary (A2)', desc: 'Describing routines, past events, and future plans.' },
  { name: 'Business English · Level 2', level: '06', tag: 'Business English', desc: 'Negotiations, contracts, and workplace discussions.' },
  { name: 'English Grammar', level: null, tag: 'All Levels', desc: 'Visual grammar rules paired with structured practice exercises.' }
];

const courseOrder = [6, 3, 4, 1, 2, 0, 5];
const app = document.querySelector('#app');
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const assetPromises = {};
function loadScriptOnce(src) {
  if (assetPromises[src]) return assetPromises[src];
  assetPromises[src] = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => { delete assetPromises[src]; reject(new Error(src)); };
    document.body.append(script);
  });
  return assetPromises[src];
}

async function ensureStudyAssets({ audio = false, bookAudio = false, practice = false } = {}) {
  const tasks = [];
  if ((audio || bookAudio) && typeof dkAudio === 'undefined') {
    await loadScriptOnce('../audio-data.js');
  }
  if (bookAudio && (typeof dkAudio === 'undefined' || !dkAudio?.[14])) {
    tasks.push(loadScriptOnce('../book-audio.js'));
  }
  if (practice && typeof izPractice === 'undefined') {
    tasks.push(loadScriptOnce('../practice.js'));
  }
  if (tasks.length) await Promise.all(tasks);
}

const storageKey = 'efe-study-v1';
const state = { done: {}, notes: {}, last: null, lastLesson: null, bookmarks: {} };

try {
  const stored = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
  for (const field of ['done', 'notes', 'bookmarks']) {
    if (stored?.[field] && typeof stored[field] === 'object' && !Array.isArray(stored[field])) {
      state[field] = stored[field];
    }
  }
  if (stored?.last && typeof stored.last === 'object') state.last = stored.last;
  if (stored?.lastLesson?.u != null) state.lastLesson = stored.lastLesson;
  else if (state.last?.u != null) state.lastLesson = state.last;
} catch {}

function updateNavBadge() {
  const count = Object.keys(state.bookmarks).length;
  const pill = document.querySelector('#nav-saved-count');
  if (!pill) return;
  pill.textContent = count;
  pill.hidden = count === 0;
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    updateNavBadge();
    return true;
  } catch {
    return false;
  }
}

const sectionName = l => l.level ? 'Level ' + Number(l.level) : 'Grammar';

const bookSections = [
  {
    route: 'vocabulary',
    title: 'Vocabulary & Dictionary',
    description: 'Build your vocabulary with illustrated dictionaries and topic-based exercises.',
    books: vocabularyBooks.slice(0, 2)
  },
  {
    route: 'phrases',
    title: 'Phrasal Verbs & Idioms',
    description: 'Master common phrasal verbs and English idioms in real context.',
    books: vocabularyBooks.slice(2)
  }
];

const bookSection = id => bookSections.find(section => section.books.some(book => book.id === id));
const bookGroup = id => bookSection(id)?.title ?? levels[id >> 1].name;
const title = b => books[b]?.name ?? (b === 12 ? 'Grammar Guide' : b % 2 ? 'Practice Book' : 'Course Book');
const pages = (b, p) => 'pages/' + b + '/' + p + '.webp';
const link = (b, u, p) => '#lesson/' + b + '/' + u + (p ? '/' + p : '');
const orderedBooks = () => [...courseOrder.flatMap(i => [books[i * 2], books[i * 2 + 1]]), ...vocabularyBooks];

function bookProgress(bookId) {
  const book = books[bookId];
  if (!book || !book.units.length) return { done: 0, total: 0, pct: 0 };
  let doneCount = 0;
  for (let i = 0; i < book.units.length; i++) {
    if (state.done[bookId + '-' + i]) doneCount++;
  }
  return {
    done: doneCount,
    total: book.units.length,
    pct: Math.round((doneCount / book.units.length) * 100)
  };
}

function coverImage(bookId, decorative = false) {
  const label = decorative ? '' : bookGroup(bookId) + ' · ' + title(bookId);
  return `<img src="${pages(bookId, 1)}" alt="${esc(label)}" decoding="async">`;
}

function readingLink(position) {
  if (!position || !Number.isInteger(position.b)) return null;
  const book = books[position.b];
  if (!book || !Number.isInteger(position.p) || position.p < 1 || position.p > book.total) return null;
  if (position.u == null) return '#read/' + book.id + '/' + position.p;
  const unit = book.units[position.u];
  return unit && position.p >= unit.start && position.p <= unit.end ? link(book.id, position.u, position.p) : null;
}

function readingTitle(position) {
  return position.u == null ? title(position.b) : books[position.b].units[position.u].title;
}

const searchText = value => value.toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
let searchQuery = '';

function globalSearch() {
  app.innerHTML = `<div class="subhead"><a class="back" href="#courses">← All Courses</a><h1>Search Books & Lessons</h1></div>
    <label for="global-q" style="font-weight:600">Book or lesson title</label>
    <input id="global-q" class="search" type="search" placeholder="e.g. Present Simple, phrasal verbs, travel..." value="${esc(searchQuery)}">
    <p id="search-status" role="status" class="muted"></p><ul id="search-results" class="units"></ul>
    <button id="more-results" type="button" class="soft" hidden>Show more</button>`;
  const input = document.querySelector('#global-q');
  const status = document.querySelector('#search-status');
  const results = document.querySelector('#search-results');
  const more = document.querySelector('#more-results');
  let limit = 30;
  const catalog = orderedBooks().map(book => ({
    book,
    label: book.name ? title(book.id) : bookGroup(book.id) + ' · ' + title(book.id),
    keywords: searchText([bookGroup(book.id), title(book.id), book.subtitle ?? '', book.id === 12 || book.id === 13 ? 'grammar' : ''].join(' ')),
    units: book.units.map(unit => searchText(unit.title))
  }));

  function update() {
    const query = searchText(searchQuery);
    const terms = query.split(' ');
    const matches = [];
    if (query) {
      for (const { book, label, keywords, units } of catalog) {
        if (terms.every(term => keywords.includes(term))) {
          matches.push({ href: '#course/' + book.id, name: label, detail: book.total + ' pages · Book', rank: 0 });
        }
        units.forEach((name, index) => {
          if (!terms.some(term => name.includes(term)) || !terms.every(term => name.includes(term) || keywords.includes(term))) return;
          matches.push({ href: link(book.id, index), name: book.units[index].title, detail: label, rank: name.includes(query) ? 1 : 2 });
        });
      }
    }
    matches.sort((a, b) => a.rank - b.rank);
    results.innerHTML = matches.slice(0, limit).map(({ href, name, detail }) =>
      `<li><a class="unit" href="${href}"><div><b>${esc(name)}</b><small>${esc(detail)}</small></div></a></li>`).join('');
    status.textContent = !query ? 'Search across 18 books and 1,300 lessons.' : matches.length ? matches.length + ' results found' : 'No matching books or lessons found.';
    more.hidden = matches.length <= limit;
  }
  input.oninput = () => { searchQuery = input.value; limit = 30; update(); };
  more.onclick = () => { limit += 30; update(); };
  update();
  input.focus();
}

function bookmarkList() {
  const entries = Object.entries(state.bookmarks).filter(([, entry]) => readingLink(entry)).reverse();
  if (!entries.length) return '';
  return `<section class="section saved-pages">
    <div class="saved-head"><h2>Bookmarks (${entries.length})</h2>${entries.length > 1 ? '<button type="button" class="soft btn-del" id="clear-bookmarks">Clear all</button>' : ''}</div>
    <ul class="units">${entries.map(([key, entry]) =>
      `<li class="saved-item-row"><a class="unit" href="${readingLink(entry)}"><div><b>${esc(readingTitle(entry))}</b><small>${esc(bookGroup(entry.b))} · Page ${entry.p}</small></div></a><button type="button" class="soft btn-del" data-del-bookmark="${esc(key)}" aria-label="Remove bookmark">✕</button></li>`).join('')}</ul>
  </section>`;
}

let courseFilter = 'all';
function home() {
  const last = readingLink(state.last);
  const totalDone = Object.keys(state.done).length;
  let totalPracticeWork = 0;
  try {
    for (let k = 0; k < localStorage.length; k++) {
      if (localStorage.key(k)?.startsWith('iz-work:')) totalPracticeWork++;
    }
  } catch {}
  const shelfGroups = [
    ...courseOrder.map(i => ({ name: i === 6 ? 'Grammar Guide' : levels[i].name, ids: [2 * i, 2 * i + 1] })),
    ...bookSections.map(section => ({ name: section.title, ids: section.books.map(book => book.id) }))
  ];
  const collection = shelfGroups.map(({ name, ids }) => {
    const grammar = ids[0] === 12;
    const links = ids.map(id => {
      const label = grammar ? (id === 12 ? 'Grammar Guide' : 'Grammar Practice Book') : bookGroup(id) + ' · ' + title(id);
      return `<a href="#course/${id}" aria-label="${esc(label)}" title="${esc(label)}">${coverImage(id, true)}${grammar ? `<span class="single-title">${label}</span>` : ''}</a>`;
    }).join('');
    return `<div class="shelf-pair${grammar ? ' grammar-pair' : ''}">${links}<strong>${esc(name)}</strong></div>`;
  }).join('');

  const bookCards = bookSections
    .filter(section => courseFilter === 'all' || courseFilter === section.route)
    .map(section => {
    const p0 = bookProgress(section.books[0].id);
    const p1 = bookProgress(section.books[1].id);
    const done = p0.done + p1.done;
    const total = p0.total + p1.total;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `<a href="#${section.route}" class="card vocabulary-card">
      <div class="cover-art">
        <div class="cover-art-top"><span>Books</span><span>${pct}%</span></div>
        <div class="vocabulary-covers" aria-hidden="true">${section.books.map(book => coverImage(book.id, true)).join('')}</div>
      </div>
      <div class="cardbody"><h3>${section.title}</h3>
        <p>${section.description}</p>
        <div class="card-progress">
          <div class="progressbar"><i style="width:${pct}%"></i></div>
          <div class="cardfoot"><b>All Levels</b><span>${done}/${total} topics</span></div>
        </div>
      </div>
    </a>`;
  });

  const filteredCourseOrder = courseOrder.filter(i => {
    if (courseFilter === 'levels') return i >= 1 && i <= 4;
    if (courseFilter === 'business') return i === 0 || i === 5;
    if (courseFilter === 'grammar') return i === 6;
    return courseFilter === 'all';
  });

  const cards = filteredCourseOrder.map(i => {
    const level = levels[i];
    const bookId = 2 * i;
    const prog = bookProgress(bookId);
    return `<a href="#course/${bookId}" class="card g${i}">
      <div class="cover-art">
        <div class="cover-art-top"><span>${sectionName(level)}</span><span>${prog.pct}%</span></div>
        <div class="cover-pair" aria-hidden="true">
          <div>${coverImage(bookId, true)}<span>${title(bookId)}</span></div>
          <div>${coverImage(bookId + 1, true)}<span>Practice Book</span></div>
        </div>
      </div>
      <div class="cardbody">
        <h3>${level.name}</h3>
        <p>${level.desc}</p>
        <div class="card-progress">
          <div class="progressbar"><i style="width:${prog.pct}%"></i></div>
          <div class="cardfoot"><b>${level.tag}</b><span>${prog.done}/${prog.total} lessons</span></div>
        </div>
      </div>
    </a>`;
  }).concat(bookCards).join('');

  const courseTabs = [
    { id: 'all', label: 'All (9)' },
    { id: 'levels', label: 'Levels 1–4' },
    { id: 'business', label: 'Business English' },
    { id: 'grammar', label: 'Grammar Guide' },
    { id: 'vocabulary', label: 'Vocabulary' },
    { id: 'phrases', label: 'Phrasal Verbs & Idioms' }
  ];

  app.innerHTML = `<section class="hero cover-hero">
    <div class="heroCopy">
      <span class="hero-badge">ENGLISH FOR EVERYONE · 18 BOOKS</span>
      <h1>Interactive <em>English</em> self-study studio</h1>
      <p>Choose your level, study visual lessons, listen to native UK & US audio, and practice with interactive exercises.</p>
      <div class="hero-actions">
        <a class="btn light" href="#courses">Explore Courses</a>
        <a class="btn outline-light" href="#library">18 Books Shelf</a>
      </div>
      ${last ? `<a class="resume-card" href="${last}">
        <div><small>Continue Reading</small><b>${esc(readingTitle(state.last))} (Page ${state.last.p})</b></div>
        <span>→</span>
      </a>` : ''}
    </div>
    <div id="home-books" class="cover-collection" role="group" aria-label="18 English for Everyone covers">${collection}</div>
  </section>

  <section class="section">
    <div id="course-list" class="sectionhead">
      <div>
        <h2>Study Courses</h2>
        <span class="mini">${courseOrder.length + bookSections.length} sections · ${books.length} books${totalDone ? ' · ' + totalDone + ' completed' : ''}${totalPracticeWork ? ' · ' + totalPracticeWork + ' answers saved' : ''}</span>
      </div>
      <div class="tabs" id="course-filters">${courseTabs.map(t =>
        `<button type="button" class="${courseFilter === t.id ? 'selected' : ''}" data-filter="${t.id}">${t.label}</button>`).join('')}
      </div>
    </div>
    <div class="coursegrid">${cards}</div>
  </section>

  <section class="about-study" id="about-section">
    <figure>
      <a href="#lesson/14/2/12"><img loading="lazy" src="pages/14/12.webp" alt="Countries and nationalities sample lesson"></a>
      <figcaption style="margin-top:10px">
        <b>Countries & Nationalities (Sample Page)</b>
        <audio controls preload="none" aria-label="Pronunciation of Canada" src="https://apps-api.dk.com/efe/audio/vb/1/vb_1_1_canada_us.mp3"></audio>
        <small class="muted">Audio: Canada (US)</small>
      </figcaption>
    </figure>
    <div>
      <h2>About This Studio</h2>
      <p>An all-in-one interactive study workspace built around the complete 18-book <b>English for Everyone</b> series.</p>
      <h3>1. Visual Grammar & Vocabulary</h3>
      <p>Clear visual guides paired with structured practice workbooks across Beginner, Intermediate, Advanced, and Business levels.</p>
      <h3>2. Native UK & US Audio</h3>
      <p>Every coursebook and vocabulary topic includes direct native audio tracks with speed control and repeat mode.</p>
      <h3>3. Track Your Progress</h3>
      <p>Mark completed lessons, take personal notes, bookmark pages, and export your progress anytime.</p>
    </div>
  </section>`;

  document.querySelectorAll('#course-filters button').forEach(btn => {
    btn.onclick = () => { courseFilter = btn.dataset.filter; home(); };
  });
}

function showBookSection(section) {
  app.innerHTML = `<div class="subhead"><a class="back" href="#courses">← All Courses</a>
    <h1>${section.title}</h1><p>${section.description}</p></div>
    <div class="libgrid vocabulary-grid">${section.books.map(book => {
      const prog = bookProgress(book.id);
      return `<article class="panel lib">
        ${coverImage(book.id)}
        <div style="flex:1"><small>${esc(book.subtitle)}</small><h3>${esc(book.name)}</h3>
          <p>${esc(book.description)}</p><small>${book.total} pages · ${prog.done}/${prog.total} topics done</small>
          <div class="progressbar"><i style="width:${prog.pct}%"></i></div>
          <div class="lib-links">
            <a class="btn" href="#course/${book.id}">Contents</a>
            <a class="btn soft" href="#read/${book.id}/1">Read Book</a>
            <a class="btn soft" href="#flashcards/${book.id}">🗂 Flashcards</a>
          </div>
        </div>
      </article>`;
    }).join('')}</div>`;
}

async function flashcards(b) {
  const book = books[b];
  if (!book || b < 14) { home(); return; }
  app.innerHTML = `<div class="subhead"><a class="back" href="#course/${b}">← ${esc(book.name)}</a>
    <h1>${esc(book.name)} · Flashcards</h1>
    <p id="fc-status" class="muted">Loading vocabulary audio…</p></div>`;
  try {
    await ensureStudyAssets({ audio: true, bookAudio: true });
  } catch {
    const st = document.querySelector('#fc-status');
    if (st) st.textContent = 'Failed to load audio data.';
    return;
  }
  if (!location.hash.startsWith('#flashcards/' + b)) return;

  const cards = [];
  const bookAudio = dkAudio?.[b] || {};
  for (const [topicNum, exMap] of Object.entries(bookAudio)) {
    for (const tracks of Object.values(exMap || {})) {
      for (const [path, label] of tracks || []) {
        const text = String(label ?? '').trim();
        if (text && !/^\d+$/.test(text)) cards.push({ path, text, topicNum });
      }
    }
  }
  if (!cards.length) {
    document.querySelector('#fc-status').textContent = 'No flashcards found for this book.';
    return;
  }

  let idx = Math.floor(Math.random() * cards.length);
  let known = 0;

  function renderCard() {
    const item = cards[idx];
    const unit = book.units[Number(item.topicNum) + (b === 16 ? 2 : 1)];
    app.innerHTML = `<div class="subhead"><a class="back" href="#course/${b}">← ${esc(book.name)}</a>
      <h1>Flashcards</h1>
      <p class="muted">${esc(book.name)} · ${cards.length} items · Mastered: <b>${known}</b></p></div>
      <div class="flashcard-wrap">
        <div class="flashcard" id="fc-card">
          <small class="muted">Topic #${esc(item.topicNum)}${unit ? ' · ' + esc(unit.title) : ''}</small>
          <strong>${esc(item.text)}</strong>
          <small class="muted">Listen and practice saying it in a sentence</small>
        </div>
        <audio id="fc-audio" controls preload="none" src="https://apps-api.dk.com/efe${encodeURI(item.path)}" style="width:100%"></audio>
        <div class="flashcard-actions">
          <button type="button" class="soft" id="fc-repeat">↻ Review Again</button>
          <button type="button" class="success" id="fc-know">✓ Know It</button>
        </div>
      </div>`;
    document.querySelector('#fc-repeat').onclick = () => { idx = (idx + 1 + Math.floor(Math.random() * 17)) % cards.length; renderCard(); };
    document.querySelector('#fc-know').onclick = () => { known++; idx = (idx + 1 + Math.floor(Math.random() * 17)) % cards.length; renderCard(); };
  }
  renderCard();
}

function tabs(b, u) {
  return '<div class="tabs" aria-label="Switch book">' + [b - b % 2, b - b % 2 + 1].map(x =>
    '<a class="' + (x === b ? 'selected' : '') + '" href="' + (u === undefined ? '#course/' + x : link(x, u)) + '">' + title(x) + '</a>').join('') + '</div>';
}

function course(b) {
  const l = levels[b >> 1], book = books[b];
  const info = book.name ? book.subtitle : sectionName(l) + ' · ' + l.tag;
  const section = bookSection(b);
  const back = section ? '<a class="back" href="#' + section.route + '">← ' + esc(section.title) + '</a>' : '<a class="back" href="#courses">← All Courses</a>';
  const controls = book.name
    ? `<div class="lib-links" style="margin:0"><a class="btn soft" href="#read/${b}/1">Read from Start</a>${b >= 14 ? `<a class="btn soft" href="#flashcards/${b}">🗂 Flashcards</a>` : ''}</div>`
    : tabs(b);
  const prog = bookProgress(b);

  app.innerHTML = `<div class="subhead">${back}
    <h1>${esc(book.name ?? l.name)}</h1>
    <p>${esc(info)} · ${book.units.length} topics · <b>${prog.done}/${prog.total} done (${prog.pct}%)</b></p>
    <div class="progressbar" style="max-width:420px"><i style="width:${prog.pct}%"></i></div>
  </div>
  <div class="tline">${controls}<input id="q" class="search" type="search" placeholder="Filter lessons..." aria-label="Filter lessons"></div>
  <ul class="units" id="units"></ul>`;

  function list(q) {
    document.querySelector('#units').innerHTML = book.units
      .map((u, i) => ({ u, i }))
      .filter(({ u, i }) => (u.title + ' ' + (i + 1)).toLocaleLowerCase().includes(q.trim().toLocaleLowerCase()))
      .map(({ u, i }) => {
        const isDone = Boolean(state.done[b + '-' + i]);
        return `<li><a class="unit${isDone ? ' is-done' : ''}" href="${link(b, i)}">
          <span class="num">${isDone ? '✓' : String(i + 1).padStart(2, '0')}</span>
          <div><b>${esc(u.title)}</b><small>Pages ${u.start}–${u.end}</small></div>
          ${isDone ? '<span class="tick">Done</span>' : ''}
        </a></li>`;
      }).join('') || '<li>No matching lessons found.</li>';
  }
  list('');
  document.querySelector('#q').oninput = e => list(e.target.value);
}

let libraryFilter = 'all';
function bookList() {
  const filters = [
    { id: 'all', label: 'All (18)' },
    { id: 'beginner', label: 'Beginner (A1–A2)' },
    { id: 'inter', label: 'Intermediate & Advanced' },
    { id: 'business', label: 'Business English' },
    { id: 'ref', label: 'Grammar & Vocabulary' }
  ];
  const filtered = orderedBooks().filter(b => {
    if (libraryFilter === 'beginner') return b.id >= 6 && b.id <= 9;
    if (libraryFilter === 'inter') return b.id >= 2 && b.id <= 5;
    if (libraryFilter === 'business') return (b.id >= 0 && b.id <= 1) || (b.id >= 10 && b.id <= 11);
    if (libraryFilter === 'ref') return b.id >= 12;
    return true;
  });

  app.innerHTML = `<div class="subhead">
    <h1>Library</h1>
    <p>All 18 books in the English for Everyone series. Read from the cover or pick a unit from the contents.</p>
    <div class="tabs" id="lib-filters">${filters.map(f =>
      `<button type="button" class="${libraryFilter === f.id ? 'selected' : ''}" data-filter="${f.id}">${f.label}</button>`).join('')}
    </div>
  </div>
  <div class="libgrid">${filtered.map(b => {
    const i = b.id;
    const prog = bookProgress(i);
    return `<div class="panel lib">
      <img src="${pages(i, 1)}" alt="${esc(bookGroup(i))} cover">
      <div style="flex:1">
        <small>${esc(bookGroup(i))}</small>
        <h3>${title(i)}</h3>
        <small>${b.total} pages · ${prog.done}/${prog.total} lessons</small>
        <div class="progressbar"><i style="width:${prog.pct}%"></i></div>
        <div class="lib-links">
          <a class="btn" href="#course/${i}">Contents</a>
          <a class="btn soft" href="#read/${i}/1">Read Book</a>
        </div>
      </div>
    </div>`;
  }).join('')}</div>`;

  document.querySelectorAll('#lib-filters button').forEach(btn => {
    btn.onclick = () => { libraryFilter = btn.dataset.filter; bookList(); };
  });
}

function savedReading() {
  const last = readingLink(state.last);
  const bookmarks = bookmarkList();
  const doneCount = Object.keys(state.done).length;
  const notes = Object.entries(state.notes).flatMap(([id, text]) => {
    const match = /^(\d+)-(\d+)$/.exec(id);
    const b = match ? Number(match[1]) : -1;
    const u = match ? Number(match[2]) : -1;
    const unit = books[b]?.units[u];
    return unit && typeof text === 'string' && text.trim() ? [{ id, b, u, unit, text }] : [];
  });

  app.innerHTML = `<div class="subhead"><h1>My Pages</h1>
    <p>Study progress (${doneCount} lessons completed), bookmarks, and notes are stored locally in your browser.</p>
    <div class="export-bar">
      <button type="button" id="print-pdf">📄 Save as PDF</button>
    </div>
    <div class="export-bar" style="margin-top:8px">
      <button type="button" class="soft" id="export-progress">💾 Backup (.json)</button>
      <label class="btn soft" for="import-progress" style="margin:0">⬆ Restore (.json)<input type="file" id="import-progress" accept=".json,application/json" hidden></label>
      <small id="backup-status" class="muted" role="status"></small>
    </div>
    <small class="muted" style="display:block;margin-top:6px">PDF is for reading and printing. .json is for transferring your progress to another device.</small></div>
    ${last ? `<section class="panel last-reading"><h2>Last Read Page</h2>
      <a class="unit" href="${last}"><div><b>${esc(readingTitle(state.last))}</b><small>${esc(bookGroup(state.last.b))} · Page ${state.last.p}</small></div></a></section>` : ''}
    ${bookmarks || '<div class="panel"><p class="muted" style="margin:0">Tap “Bookmark” inside any lesson to save pages here.</p></div>'}
    ${notes.length ? `<section class="section"><div class="saved-head"><h2>My Notes (${notes.length})</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="soft btn-del" id="del-selected-notes" hidden>Delete selected</button>${notes.length > 1 ? '<button type="button" class="soft btn-del" id="clear-notes">Delete all</button>' : ''}</div></div><div class="libgrid">
      ${notes.map(({ id, b, u, unit, text }) => `<div class="panel">
        <div class="saved-note-head">
          <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer">
            <input type="checkbox" class="note-select" value="${esc(id)}" style="margin-top:4px">
            <div><h3>${esc(unit.title)}</h3><small class="muted">${esc(bookGroup(b))}</small></div>
          </label>
          <button type="button" class="soft btn-del" data-del-note="${esc(id)}" aria-label="Delete note">✕ Delete</button>
        </div>
        <p class="saved-note">${esc(text)}</p>
        <a class="back" href="${link(b, u)}">Open lesson →</a>
      </div>`).join('')}
    </div></section>` : ''}`;

  document.querySelectorAll('[data-del-bookmark]').forEach(btn => {
    btn.onclick = () => { delete state.bookmarks[btn.dataset.delBookmark]; save(); savedReading(); };
  });
  const clearBookmarks = document.querySelector('#clear-bookmarks');
  if (clearBookmarks) clearBookmarks.onclick = () => { state.bookmarks = {}; save(); savedReading(); };

  document.querySelectorAll('[data-del-note]').forEach(btn => {
    btn.onclick = () => { delete state.notes[btn.dataset.delNote]; save(); savedReading(); };
  });
  const delSelectedNotes = document.querySelector('#del-selected-notes');
  const noteCheckboxes = [...document.querySelectorAll('.note-select')];
  if (delSelectedNotes && noteCheckboxes.length) {
    noteCheckboxes.forEach(cb => {
      cb.onchange = () => {
        const count = noteCheckboxes.filter(c => c.checked).length;
        delSelectedNotes.hidden = count === 0;
        delSelectedNotes.textContent = `Delete selected (${count})`;
      };
    });
    delSelectedNotes.onclick = () => {
      for (const cb of noteCheckboxes) if (cb.checked) delete state.notes[cb.value];
      save(); savedReading();
    };
  }
  const clearNotes = document.querySelector('#clear-notes');
  if (clearNotes) clearNotes.onclick = () => { state.notes = {}; save(); savedReading(); };

  document.querySelector('#print-pdf').onclick = () => window.print();
  document.querySelector('#export-progress').onclick = () => {
    const work = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('iz-work:')) work[k] = localStorage.getItem(k);
      }
    } catch {}
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), study: state, work }, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    a.download = 'efe-progress-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    document.querySelector('#backup-status').textContent = 'Backup downloaded ✓';
  };

  document.querySelector('#import-progress').onchange = async e => {
    const file = e.target.files?.[0];
    const statusEl = document.querySelector('#backup-status');
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data?.study || typeof data.study !== 'object') throw new Error();
      for (const field of ['done', 'notes', 'bookmarks']) {
        if (data.study[field] && typeof data.study[field] === 'object' && !Array.isArray(data.study[field])) {
          state[field] = data.study[field];
        }
      }
      if (data.study.last) state.last = data.study.last;
      if (data.study.lastLesson) state.lastLesson = data.study.lastLesson;
      save();
      if (data.work && typeof data.work === 'object') {
        for (const [k, v] of Object.entries(data.work)) {
          if (k.startsWith('iz-work:') && typeof v === 'string') localStorage.setItem(k, v);
        }
      }
      savedReading();
      document.querySelector('#backup-status').textContent = 'Progress restored ✓';
    } catch {
      statusEl.textContent = 'Invalid backup file.';
    }
  };
}

function lessonNavigation(book, unitIndex) {
  const previous = book.units[unitIndex - 1];
  const next = book.units[unitIndex + 1];
  if (!previous && !next) return '';
  return `<nav class="lesson-navigation" aria-label="Lesson navigation">
    ${previous ? `<a class="soft" href="${link(book.id, unitIndex - 1)}">← Previous Lesson<small>${esc(previous.title)}</small></a>` : ''}
    ${next ? `<a class="soft lesson-next" href="${link(book.id, unitIndex + 1)}">Next Lesson →<small>${esc(next.title)}</small></a>` : ''}
  </nav>`;
}

function pageButton(direction, disabled, side = false) {
  const previous = direction < 0;
  const label = previous ? 'Previous page' : 'Next page';
  const placement = previous ? 'prev' : 'next';
  const classes = side ? 'page-arrow page-arrow--' + placement : 'soft';
  return `<button type="button" id="${side ? 'side-' : ''}${placement}" class="${classes}" aria-label="${label}" ${disabled ? 'disabled' : ''}><span aria-hidden="true">${previous ? '‹' : '›'}</span></button>`;
}

let activeReader = null;
let readerRequest = 0;

async function reader(b, u, p) {
  const book = books[b], unit = book.units[u], single = !!unit, standalone = !!book.name, group = bookGroup(b);
  const start = single ? unit.start : 1, end = single ? unit.end : book.total;
  p = Number.isInteger(p) && p >= start && p <= end ? p : start;
  const url = n => single ? link(b, u, n) : '#read/' + b + '/' + n;
  const lessonToResume = state.lastLesson?.b === b ? readingLink(state.lastLesson) : null;
  const readerId = b + ':' + (single ? u : 'book');
  const same = activeReader?.id === readerId && app.querySelector('.page-stage');
  const request = ++readerRequest;
  let turnDirection = 0;

  if (same && activeReader.page !== p) {
    const stage = app.querySelector('.page-stage');
    const image = new Image();
    image.src = pages(b, p);
    stage.setAttribute('aria-busy', 'true');
    try {
      await image.decode();
    } catch {
      if (request !== readerRequest || !stage.isConnected) return;
      stage.removeAttribute('aria-busy');
      history.replaceState(history.state, '', url(activeReader.page));
      stage.querySelector('.page-status').textContent = 'Page failed to load. Please try again.';
      return;
    }
    if (request !== readerRequest || !stage.isConnected) return;
    turnDirection = Math.sign(p - activeReader.page);
    image.alt = title(b) + ' · Page ' + p;
    stage.querySelector('.pageimg img').replaceWith(image);
  }

  const position = { b, u: single ? u : null, p };
  state.last = position;
  if (single) state.lastLesson = position;
  save();

  const markId = url(p);
  const unitKey = b + '-' + u;
  const isDone = single && Boolean(state.done[unitKey]);
  const hasBookmark = Object.hasOwn(state.bookmarks, markId);
  const zoomed = activeReader?.id === readerId && Boolean(activeReader.zoomed);
  activeReader = { id: readerId, zoomed, page: p };

  const navigation = single ? lessonNavigation(book, u) : '';
  const existingAudio = app.querySelector('.lesson-audio');
  const answer = book.answer ? '<a class="back" href="#read/' + b + '/' + book.answer + '">' + (b === 12 ? 'Open Reference' : 'Open Answer Key') + '</a>' : '';
  const topicIndex = single ? u : book.units.findIndex(topic => topic.start <= p && p <= topic.end);
  const audioNumber = b >= 14 ? topicIndex + 1 - (b === 16 ? 3 : 2) : u + 1;
  const needAudio = (b >= 14 && topicIndex >= 0) || (single && b < 12);
  const hasAudioData = typeof dkAudio !== 'undefined' && (b < 14 || Boolean(dkAudio[14]));
  const hasAudio = b >= 14 ? Boolean(typeof dkAudio !== 'undefined' && dkAudio[b]?.[audioNumber]) : single && b < 12;
  const lessonAudio = hasAudio ? (existingAudio?.dataset.lesson === b + '-' + audioNumber ? existingAudio : createLessonAudio(b, audioNumber)) : null;
  const zenOn = document.body.classList.contains('iz-zen');

  const pairBookId = !standalone && single ? (b ^ 1) : -1;
  const hasPairUnit = pairBookId >= 0 && Boolean(books[pairBookId]?.units[u]);
  const pairPanel = hasPairUnit ? (b % 2 === 0
    ? `<section class="panel"><h3>Practice Exercises</h3><p class="muted" style="margin:0 0 10px">Reinforce this lesson in the ${esc(title(pairBookId))}.</p><a class="btn" href="${link(pairBookId, u)}">Go to ${esc(title(pairBookId))} →</a></section>`
    : `<section class="panel"><h3>Back to Theory</h3><p class="muted" style="margin:0 0 10px">Review the rules and examples in ${esc(title(pairBookId))}.</p><a class="btn" href="${link(pairBookId, u)}">← Back to ${esc(title(pairBookId))}</a></section>`) : '';

  if (same && existingAudio !== lessonAudio) {
    existingAudio?.remove();
    if (lessonAudio) app.querySelector('.side').prepend(lessonAudio);
  }

  if (!same) {
    app.innerHTML = `<div class="subhead">
      <a class="back" href="${single ? '#course/' + b : '#library'}">← ${single ? esc(standalone ? book.name : group) + ' · Contents' : 'Library'}</a>
      <h1 class="lessonTitle">${esc(single ? unit.title : standalone ? book.name : group + ' · ' + title(b))}</h1>
      ${single ? `<span class="badge">Lesson ${u + 1}</span>` : ''}
      ${lessonAudio?.querySelector('audio') ? '<button type="button" id="skip-to-audio" class="soft">🎧 Jump to Audio</button>' : ''}
    </div>
    ${single && !standalone ? tabs(b, u) : ''}
    ${navigation}
    <div class="lessonlayout">
      <section class="panel reader">
        <div class="readerbar">
          <div class="pager">${pageButton(-1, p === start)}<span>${p} / ${end}</span>${pageButton(1, p === end)}</div>
          <div class="reader-actions">
            ${single ? `<button type="button" id="mark-done" class="${isDone ? 'success' : 'soft'}" aria-pressed="${isDone}">${isDone ? '✓ Done' : 'Mark Done'}</button>` : ''}
            <button type="button" class="soft" id="zoom" aria-pressed="${zoomed}">${zoomed ? 'Zoom Out' : 'Zoom In'}</button>
            <button type="button" class="soft" id="zen-toggle" aria-pressed="${zenOn}">${zenOn ? '✕ Exit Focus' : '⛶ Focus'}</button>
          </div>
        </div>
        <div class="page-stage">
          <div class="pageimg${zoomed ? ' zoom' : ''}"><img src="${pages(b, p)}" alt="${esc(title(b) + ' · Page ' + p)}"></div>
          ${pageButton(-1, p === start, true)}
          ${pageButton(1, p === end, true)}
        </div>
      </section>
      <aside class="side">
        ${pairPanel}
        ${single ? '' : `<section class="panel"><h3>Go to Page</h3><form id="jump"><label for="page">Page number</label><div class="row"><input type="number" min="1" max="${end}" required id="page" value="${p}"><button>Open</button></div></form>${lessonToResume ? `<a class="back" href="${lessonToResume}">Back to Lesson</a>` : ''}</section>`}
        ${single ? `<section class="panel"><h3>My Notes</h3><textarea id="lesson-note" placeholder="Write rules, vocabulary, or examples here...">${esc(state.notes[unitKey] ?? '')}</textarea><small id="note-status" class="muted"></small></section>` : ''}
        <section class="panel">
          <h3>More</h3>
          <a class="back" href="#course/${b}">Book Contents</a>
          ${answer}
        </section>
      </aside>
    </div>
    ${navigation}`;

    if (lessonAudio) app.querySelector('.side').prepend(lessonAudio);
    app.querySelector('.page-stage').insertAdjacentHTML('beforeend', '<small class="page-status" role="status"></small>');
  } else {
    const stage = app.querySelector('.page-stage');
    stage.removeAttribute('aria-busy');
    stage.querySelector('.page-status').textContent = '';
    document.querySelector('.pager > span').textContent = p + ' / ' + end;
    for (const id of ['prev', 'side-prev', 'next', 'side-next']) {
      document.getElementById(id).disabled = id.endsWith('prev') ? p === start : p === end;
    }
    if (!single) document.getElementById('page').value = p;
    if (turnDirection && !zoomed && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stage.querySelector('.pageimg img').animate([
        { transform: 'perspective(1000px) rotateY(' + turnDirection * 3 + 'deg)', transformOrigin: turnDirection > 0 ? 'left center' : 'right center', filter: 'brightness(.96)' },
        { transform: 'none', filter: 'brightness(1)' }
      ], { duration: 220, easing: 'ease-out' });
    }
  }

  if (p < end && !navigator.connection?.saveData) {
    const nextImg = new Image();
    nextImg.src = pages(b, p + 1);
  }

  if (b !== 12 && typeof izPractice === 'object' && izPractice?.mount) {
    izPractice.mount(app, b, p, book.answer);
  }

  if ((needAudio && !hasAudioData) || (b !== 12 && typeof izPractice === 'undefined')) {
    ensureStudyAssets({ audio: needAudio, bookAudio: needAudio && b >= 14, practice: b !== 12 }).then(() => {
      if (request !== readerRequest) return;
      const sideEl = app.querySelector('.side');
      if (needAudio && sideEl && !app.querySelector('.lesson-audio')) {
        const audioReady = b >= 14 ? Boolean(dkAudio?.[b]?.[audioNumber]) : single && b < 12;
        if (audioReady) sideEl.prepend(createLessonAudio(b, audioNumber));
      }
      if (b !== 12 && typeof izPractice === 'object' && izPractice?.mount) {
        izPractice.mount(app, b, p, book.answer);
      }
    }).catch(() => {});
  }

  const $ = s => document.querySelector(s);
  const audioShortcut = $('#skip-to-audio');
  if (audioShortcut && lessonAudio?.querySelector('audio')) {
    audioShortcut.onclick = () => {
      lessonAudio.scrollIntoView({ block: 'start' });
      lessonAudio.querySelector('select')?.focus({ preventScroll: true });
    };
  }

  for (const [direction, placement] of [[-1, 'prev'], [1, 'next']]) {
    const target = p + direction;
    const turnPage = () => { if (target >= start && target <= end) location.hash = url(target); };
    $('#' + placement).onclick = turnPage;
    $('#side-' + placement).onclick = turnPage;
  }

  if (single && $('#mark-done')) {
    $('#mark-done').onclick = event => {
      const currentlyDone = Boolean(state.done[unitKey]);
      if (currentlyDone) delete state.done[unitKey];
      else state.done[unitKey] = Date.now();
      save();
      const nowDone = !currentlyDone;
      event.currentTarget.className = nowDone ? 'success' : 'soft';
      event.currentTarget.textContent = nowDone ? '✓ Done' : 'Mark Done';
      event.currentTarget.setAttribute('aria-pressed', String(nowDone));
    };
  }

  if (single && $('#lesson-note')) {
    $('#lesson-note').oninput = e => {
      const val = e.target.value;
      if (val.trim()) state.notes[unitKey] = val;
      else delete state.notes[unitKey];
      save();
      $('#note-status').textContent = 'Saved ✓';
    };
  }

  function zoom() {
    const on = $('.pageimg').classList.toggle('zoom');
    activeReader.zoomed = on;
    $('#zoom').textContent = on ? 'Zoom Out' : 'Zoom In';
    $('#zoom').setAttribute('aria-pressed', String(on));
  }
  $('#zoom').onclick = zoom;
  $('.pageimg img').onclick = zoom;
  if ($('#zen-toggle')) {
    $('#zen-toggle').onclick = () => {
      const on = document.body.classList.toggle('iz-zen');
      $('#zen-toggle').textContent = on ? '✕ Exit Focus' : '⛶ Focus';
      $('#zen-toggle').setAttribute('aria-pressed', String(on));
    };
  }
  if (!single) $('#jump').onsubmit = e => { e.preventDefault(); location.hash = url(Number($('#page').value)); };
}

let previousRoute = '';
function route() {
  const hash = location.hash.slice(1);
  const [view, bb, uu, pp] = hash.split('/'), b = Number(bb), u = Number(uu);
  const family = [view, bb, view === 'lesson' ? uu : ''].join('/');
  const section = bookSections.find(group => group.route === view);

  const subBar = document.querySelector('#sub-bar');
  if (subBar) subBar.hidden = !hash || view === 'courses' || view === 'about';

  if (!(view === 'lesson' && books[b]?.units[u]) && !(view === 'read' && books[b])) {
    activeReader = null;
    document.body.classList.remove('iz-zen');
  }
  if (section) showBookSection(section);
  else if (view === 'flashcards' && books[b]) flashcards(b);
  else if (view === 'search') globalSearch();
  else if (view === 'library') bookList();
  else if (view === 'course' && books[b]) course(b);
  else if (view === 'lesson' && books[b]?.units[u]) reader(b, u, Number(pp));
  else if (view === 'read' && books[b]) reader(b, null, Number(uu));
  else home();

  if (previousRoute !== family) window.scrollTo({ top: 0, behavior: 'instant' });
  previousRoute = family;

  const activeNav = view === 'about' ? '#about' : view === 'library' || view === 'read' ? '#library' : view === 'search' ? '#search' : '#courses';
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.hash === activeNav));
  if (view === 'about') document.getElementById('about-section')?.scrollIntoView();

  const heading = app.querySelector('h1')?.textContent;
  document.title = heading && heading !== 'EFE Studio' ? heading + ' · EFE Studio' : 'EFE Studio · English for Everyone';
}

window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.classList.contains('iz-zen')) {
    document.body.classList.remove('iz-zen');
    const z = document.querySelector('#zen-toggle');
    if (z) { z.textContent = '⛶ Focus'; z.setAttribute('aria-pressed', 'false'); }
    return;
  }
  if (!activeReader || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented ||
    event.target?.closest?.('input,textarea,select,audio,button,[contenteditable]')) return;
  const id = event.key === 'ArrowLeft' ? '#prev' : event.key === 'ArrowRight' ? '#next' : null;
  const button = id && document.querySelector(id);
  if (button && !button.disabled) { event.preventDefault(); button.click(); }
});

function applyTheme(theme) {
  if (theme === 'sepia' || theme === 'dark') document.documentElement.dataset.theme = theme;
  else { delete document.documentElement.dataset.theme; theme = 'day'; }
  try { localStorage.setItem('iz-theme', theme); } catch {}
  document.querySelectorAll('.theme-switch button').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.theme === theme));
  });
}
try { applyTheme(localStorage.getItem('iz-theme') || 'day'); } catch { applyTheme('day'); }
document.querySelectorAll('.theme-switch button').forEach(btn => {
  btn.onclick = () => applyTheme(btn.dataset.theme);
});

const sectionPicker = document.querySelector('#section-picker');
for (const i of courseOrder) sectionPicker.add(new Option(levels[i].name, '#course/' + (2 * i)));
for (const section of bookSections) sectionPicker.add(new Option(section.title, '#' + section.route));
sectionPicker.onchange = () => { if (sectionPicker.value) location.hash = sectionPicker.value; sectionPicker.selectedIndex = 0; };

const backButton = document.querySelector('#site-back');
const forwardButton = document.querySelector('#site-forward');
let position = 0;
let furthest = 0;
const visit = Math.random().toString(36);

function updateControls() {
  backButton.disabled = !position && !location.hash.slice(1);
  forwardButton.disabled = position >= furthest;
}

function recordRoute() {
  const entry = history.state;
  if (entry?.visit === visit) position = entry.position;
  else {
    furthest = ++position;
    history.replaceState({ visit, position }, '');
  }
  updateControls();
  route();
}

history.replaceState({ visit, position }, '');
backButton.onclick = () => { if (position) history.back(); else location.hash = ''; };
forwardButton.onclick = () => history.forward();
updateControls();
updateNavBadge();
window.addEventListener('hashchange', recordRoute);
route();
