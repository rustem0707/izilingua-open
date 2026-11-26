'use strict';

const levels = [
  { name: 'Business English · Level 1', level: '05', tag: 'Іскерлік ағылшын тілі', desc: 'Танысу, келіссөз жүргізу және іскерлік хат жазу.' },
  { name: 'Intermediate', level: '03', tag: 'Орта деңгей', desc: 'Күнделікті әңгіме, сөздік қор және грамматика.' },
  { name: 'Advanced', level: '04', tag: 'Жоғары деңгей', desc: 'Күрделі құрылымдар, еркін сөйлеу және ой дәлдігі.' },
  { name: 'Beginner · Level 1', level: '01', tag: 'Бастапқы деңгей', desc: 'Танысу, қарапайым сұрақтар және күнделікті сөздер.' },
  { name: 'Beginner · Level 2', level: '02', tag: 'Бастапқы деңгейді жалғастыру', desc: 'Күнделікті әдеттерді, оқиғалар мен жоспарларды сипаттау.' },
  { name: 'Business English · Level 2', level: '06', tag: 'Іскерлік ағылшын тілі', desc: 'Іскерлік келіссөздер, шарттар және жұмыс мәселелерін талқылау.' },
  { name: 'English Grammar', level: null, tag: 'Барлық деңгейге', desc: 'Ағылшын грамматикасының ережелерін оқып, әр тақырыпты жаттығумен бекітіңіз.' }
];

const courseOrder = [6, 3, 4, 1, 2, 0, 5];
const assetPromises = {};
function loadScriptOnce(src) {
  if (assetPromises[src]) return assetPromises[src];
  assetPromises[src] = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src; script.async = false; script.onload = resolve;
    script.onerror = () => { delete assetPromises[src]; reject(new Error(src)); };
    document.body.append(script);
  });
  return assetPromises[src];
}
async function ensureStudyAssets({ audio = false, bookAudio = false, practice = false } = {}) {
  const tasks = [];
  if ((audio || bookAudio) && typeof dkAudio === 'undefined') await loadScriptOnce('audio-data.js');
  if (bookAudio && (typeof dkAudio === 'undefined' || !dkAudio?.[14])) tasks.push(loadScriptOnce('book-audio.js'));
  if (practice && typeof izPractice === 'undefined') tasks.push(loadScriptOnce('practice.js?v=20261126b'));
  if (tasks.length) await Promise.all(tasks);
}
const app = document.querySelector('#app');
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const storageKey = 'folio-study-v1';
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

const sectionName = l => l.level ? Number(l.level) + '-бөлім' : 'Грамматика бөлімі';

const bookSections = [
  {
    route: 'vocabulary',
    title: 'Сөздік қор',
    description: 'Суретті сөздік пен тақырыптық жаттығулар арқылы жаңа сөздерді үйреніңіз.',
    books: vocabularyBooks.slice(0, 2)
  },
  {
    route: 'phrases',
    title: 'Фразалық етістіктер мен идиомалар',
    description: 'Фразалық етістіктер мен идиомалардың мағынасын мысалдар арқылы меңгеріңіз.',
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

const searchText = value => value.toLocaleLowerCase('kk').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
let searchQuery = '';

function globalSearch() {
  app.innerHTML = `<div class="subhead"><a class="back" href="#courses">← Барлық курс</a><h1>Кітап пен сабақ іздеу</h1></div>
    <label for="global-q" style="font-weight:600">Кітап немесе сабақ атауы</label>
    <input id="global-q" class="search" type="search" placeholder="Мысалы: Present Simple, фразалық етістіктер, саяхат..." value="${esc(searchQuery)}">
    <p id="search-status" role="status" class="muted"></p><ul id="search-results" class="units"></ul>
    <button id="more-results" type="button" class="soft" hidden>Тағы көрсету</button>`;
  const input = document.querySelector('#global-q');
  const status = document.querySelector('#search-status');
  const results = document.querySelector('#search-results');
  const more = document.querySelector('#more-results');
  let limit = 30;
  const catalog = orderedBooks().map(book => ({
    book,
    label: book.name ? title(book.id) : bookGroup(book.id) + ' · ' + title(book.id),
    keywords: searchText([bookGroup(book.id), title(book.id), book.subtitle ?? '', book.id === 12 || book.id === 13 ? 'грамматика' : ''].join(' ')),
    units: book.units.map(unit => searchText(unit.title))
  }));

  function update() {
    const query = searchText(searchQuery);
    const terms = query.split(' ');
    const matches = [];
    if (query) {
      for (const { book, label, keywords, units } of catalog) {
        if (terms.every(term => keywords.includes(term))) {
          matches.push({ href: '#course/' + book.id, name: label, detail: book.total + ' бет · Кітап', rank: 0 });
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
    status.textContent = !query ? '18 кітап пен 900+ сабақ ішінен іздеңіз.' : matches.length ? matches.length + ' нәтиже табылды' : 'Сәйкес кітап немесе сабақ табылмады.';
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
    <div class="saved-head"><h2>Бетбелгілер (${entries.length})</h2>${entries.length > 1 ? '<button type="button" class="soft btn-del" id="clear-bookmarks">Барлығын өшіру</button>' : ''}</div>
    <ul class="units">${entries.map(([key, entry]) =>
      `<li class="saved-item-row"><a class="unit" href="${readingLink(entry)}"><div><b>${esc(readingTitle(entry))}</b><small>${esc(bookGroup(entry.b))} · ${entry.p}-бет</small></div></a><button type="button" class="soft btn-del" data-del-bookmark="${esc(key)}" aria-label="Бетбелгіні өшіру">✕</button></li>`).join('')}</ul>
  </section>`;
}

function configuredInstagram(value) {
  const handle = String(value ?? '').trim().replace(/^@/, '');
  if (/^[A-Za-z0-9._]{1,30}$/.test(handle)) return 'https://www.instagram.com/' + handle + '/';
  try {
    const url = new URL(handle);
    if (url.protocol === 'https:' && /^(www\.)?instagram\.com$/.test(url.hostname) &&
      /^\/[A-Za-z0-9._]{1,30}\/?$/.test(url.pathname)) return url.origin + url.pathname;
  } catch {}
  return '';
}

const instagram = configuredInstagram(typeof siteConfig === 'object' ? siteConfig.instagram : '');
const feedbackWebApp = typeof siteConfig === 'object' ? String(siteConfig.feedbackWebApp ?? '').trim() : '';
const feedbackEnabled = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(feedbackWebApp);
const instagramIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.8" r=".8" fill="currentColor" stroke="none"/></svg>';

function instagramLink(label) {
  return instagram ? `<a class="author-instagram" href="${esc(instagram)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(label)}">${instagramIcon}<span>${esc(label)}</span></a>` : '';
}

function feedbackSection() {
  return `<section class="section feedback-section" aria-labelledby="feedback-heading">
    <h2 id="feedback-heading">Кері байланыс</h2>
    ${feedbackEnabled
      ? `<iframe class="feedback-frame" title="Izilingua сайтына пікір қалдыру" src="${esc(feedbackWebApp)}" loading="lazy" referrerpolicy="no-referrer"></iframe>
         <p style="margin-top:10px"><a class="back" href="${esc(feedbackWebApp)}" target="_blank" rel="noopener noreferrer">Форманы бөлек ашу ↗</a></p>`
      : '<p class="muted">Пікір жіберу формасы әзірге қосылмаған.</p>'}
  </section>`;
}

let courseFilter = 'all';
let activeShelfIdx = 2;
function home() {
  const last = readingLink(state.last);
  const totalDone = Object.keys(state.done).length;
  const shelfBooks = orderedBooks();
  const spineMeta = {
    0: ['#0b4d8c', true, 'B1'], 1: ['#0b4d8c', false, 'B1'],
    2: ['#7ab800', true, 'L3'], 3: ['#7ab800', false, 'L3'],
    4: ['#0091c9', true, 'L4'], 5: ['#0091c9', false, 'L4'],
    6: ['#b91c1c', true, 'L1'], 7: ['#ea2b24', false, 'L1'],
    8: ['#e67817', true, 'L2'], 9: ['#f27d16', false, 'L2'],
    10: ['#572971', true, 'B2'], 11: ['#572971', false, 'B2'],
    12: ['#4f5254', true, 'GG'], 13: ['#4f5254', false, 'GG'],
    14: ['#dc6428', true, '10K'], 15: ['#8c286e', true, '3K'],
    16: ['#0d8c82', true, 'IDM'], 17: ['#c88a12', true, 'PHR']
  };
  const shelfHtml = shelfBooks.map((b, idx) => {
    const lbl = bookGroup(b.id) + ' · ' + title(b.id);
    const [col, isCourse, tag] = spineMeta[b.id] || ['#245242', true, 'EFE'];
    return `<div class="book3d" data-idx="${idx}" data-id="${b.id}" style="--spine:${col}" role="button" tabindex="0" aria-label="${esc(lbl)}">
      <div class="book3d-top"></div>
      <div class="book3d-spine ${isCourse ? 'is-course' : 'is-practice'}">
        <div class="spine-cap">${tag}</div>
        <div class="spine-mid"><span>ENGLISH FOR EVERYONE</span></div>
        <div class="spine-dk">DK</div>
      </div>
      <div class="book3d-cover"><img src="${pages(b.id, 1)}" alt="${esc(lbl)}" decoding="async"></div>
      <div class="book3d-back"></div>
      <div class="book3d-pages"></div>
    </div>`;
  }).join('');

  const bookCards = bookSections.filter(section => courseFilter === 'all' || courseFilter === section.route).map(section => {
    const p0 = bookProgress(section.books[0].id);
    const p1 = bookProgress(section.books[1].id);
    const done = p0.done + p1.done;
    const total = p0.total + p1.total;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `<a href="#${section.route}" class="card vocabulary-card">
      <div class="cover-art">
        <div class="cover-art-top"><span>Кітаптар</span><span>${pct}%</span></div>
        <div class="vocabulary-covers" aria-hidden="true">${section.books.map(book => coverImage(book.id, true)).join('')}</div>
      </div>
      <div class="cardbody"><h3>${section.title}</h3>
        <p>${section.description}</p>
        <div class="card-progress">
          <div class="progressbar"><i style="width:${pct}%"></i></div>
          <div class="cardfoot"><b>Барлық деңгейге</b><span>${done}/${total} тақырып</span></div>
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
          <div class="cardfoot"><b>${level.tag}</b><span>${prog.done}/${prog.total} сабақ</span></div>
        </div>
      </div>
    </a>`;
  }).concat(bookCards).join('');

  app.innerHTML = `<section class="hero cover-hero shelf-hero">
    <div class="heroCopy">
      <span class="hero-badge">ENGLISH FOR EVERYONE · 18 КІТАП</span>
      <h1>Ағылшын тілін <em>қазақша</em> түсіндіретін оқу студиясы</h1>
      <p>Деңгейіңізге сай кітап таңдап, қазақша түсіндірмелерді оқыңыз, түпнұсқа аудио тыңдаңыз және интерактивті жаттығулармен бекітіңіз.</p>
      <div class="hero-actions">
        <a class="btn light" href="#courses">Курстарды бастау</a>
        <a class="btn outline-light" href="#library">18 кітап сөресі</a>
      </div>
      ${last ? `<a class="resume-card" href="${last}">
        <div><small>Соңғы оқылған бет · Жалғастыру</small><b>${esc(readingTitle(state.last))} (${state.last.p}-бет)</b></div>
        <span>→</span>
      </a>` : ''}
    </div>
    <div id="home-books" class="shelf-stage" role="region" aria-label="18 кітаптың 3D сөресі">
      <div class="shelf-meta">
        <div class="shelf-caption"><small id="shelf-group"></small><strong id="shelf-title"></strong></div>
        <div class="shelf-controls">
          <button type="button" class="shelf-nav" id="shelf-prev" aria-label="Алдыңғы кітап">‹</button>
          <a class="btn light" id="shelf-open" href="#course/6" style="padding:7px 14px;font-size:13px">Ашу →</a>
          <button type="button" class="shelf-nav" id="shelf-next" aria-label="Келесі кітап">›</button>
        </div>
      </div>
      <div class="shelf-viewport"><div class="shelf-track" id="shelf-track">${shelfHtml}</div></div>
      <div class="shelf-ledge"></div>
    </div>
  </section>

  <section class="section">
    <div id="course-list" class="sectionhead">
      <div><h2>Оқу курстары</h2>
      <span class="mini">${courseOrder.length + bookSections.length} бөлім · ${books.length} кітап${totalDone ? ' · ' + totalDone + ' сабақ өтілді' : ''}</span></div>
      <div class="tabs" id="course-filters">${[
        { id: 'all', label: 'Барлығы (9)' },
        { id: 'levels', label: 'Levels 1–4' },
        { id: 'business', label: 'Business English' },
        { id: 'grammar', label: 'Грамматика' },
        { id: 'vocabulary', label: 'Сөздік қор' },
        { id: 'phrases', label: 'Фразалық етістіктер мен идиомалар' }
      ].map(t => `<button type="button" class="${courseFilter === t.id ? 'selected' : ''}" data-filter="${t.id}">${t.label}</button>`).join('')}</div>
    </div>
    <div class="coursegrid">${cards}</div>
  </section>

  <section class="about-study" id="about-section">
    <figure>
      <a href="#lesson/14/2/12"><img loading="lazy" src="pages/14/12.webp" alt="Елдер мен ұлттар сабағын ашу"></a>
      <figcaption style="margin-top:10px">
        <b>Елдер мен ұлттар (Үлгі бет)</b>
        <audio controls preload="none" aria-label="Canada сөзінің айтылуы" src="https://apps-api.dk.com/efe/audio/vb/1/vb_1_1_canada_us.mp3"></audio>
        <small class="muted">Canada сөзінің айтылуы</small>
      </figcaption>
    </figure>
    <div>
      <h2>Платформа туралы</h2>
      <p>Izilingua — әлемге әйгілі <b>English for Everyone</b> сериясының 18 кітабын қазақ тілінде жүйелеп, аудио және жаттығулармен біріктірген тегін білім беру студиясы.</p>
      <h3>1. Қазақша түсініп оқыңыз</h3>
      <p>Грамматика ережелері мен сөздіктер көрнекі сызбалар және қазақша түсіндірмелер арқылы берілген.</p>
      <h3>2. Түпнұсқа аудиомен тыңдаңыз</h3>
      <p>Әр сабақта сөздер мен сөйлемдердің британдық (UK) және америкалық (US) айтылуы тікелей қосылған.</p>
      <h3>3. Прогресс пен бетбелгілерді сақтаңыз</h3>
      <p>Аяқталған сабақтарды белгілеп, маңызды беттерді «Менің беттерім» бөлімінде сақтаңыз.</p>
    </div>
  </section>
  ${feedbackSection()}`;
  document.querySelectorAll('#course-filters button').forEach(btn => { btn.onclick = () => { courseFilter = btn.dataset.filter; home(); }; });

  const shelfStage = document.querySelector('#home-books');
  const bookEls = [...document.querySelectorAll('#shelf-track .book3d')];
  const shelfGroupEl = document.querySelector('#shelf-group');
  const shelfTitleEl = document.querySelector('#shelf-title');
  const shelfOpenEl = document.querySelector('#shelf-open');
  if (window._izShelfTimer) { clearInterval(window._izShelfTimer); window._izShelfTimer = null; }
  function updateShelf(idx) {
    activeShelfIdx = (idx + shelfBooks.length) % shelfBooks.length;
    const isMob = window.innerWidth <= 520;
    const gap = isMob ? 56 : 78;
    const centerPush = isMob ? 68 : 96;
    bookEls.forEach((el, i) => {
      let d = i - activeShelfIdx;
      if (d > shelfBooks.length / 2) d -= shelfBooks.length;
      if (d < -shelfBooks.length / 2) d += shelfBooks.length;
      const abs = Math.abs(d);
      const visible = abs <= (isMob ? 3 : 5);
      el.classList.toggle('is-active', d === 0);
      el.style.visibility = visible ? 'visible' : 'hidden';
      el.style.opacity = visible ? '1' : '0';
      el.style.pointerEvents = visible ? 'auto' : 'none';
      el.style.zIndex = String(30 - abs);
      if (d === 0) {
        el.style.transform = 'translate3d(0px, -10px, 76px) rotateX(-4deg) rotateY(0deg) scale(1.06)';
      } else {
        const sign = Math.sign(d);
        const x = d * gap + sign * centerPush;
        const z = -Math.min(abs, 5) * 28;
        const rot = sign * -56;
        el.style.transform = `translate3d(${x}px, 0px, ${z}px) rotateX(-4deg) rotateY(${rot}deg) scale(0.92)`;
      }
    });
    const cur = shelfBooks[activeShelfIdx];
    shelfGroupEl.textContent = bookGroup(cur.id) + ' · ' + cur.total + ' бет';
    shelfTitleEl.textContent = title(cur.id);
    shelfOpenEl.href = '#course/' + cur.id;
  }
  bookEls.forEach(el => {
    el.onclick = () => {
      const i = Number(el.dataset.idx);
      if (i === activeShelfIdx) location.hash = '#course/' + el.dataset.id;
      else updateShelf(i);
    };
    el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } };
  });
  document.querySelector('#shelf-prev').onclick = () => updateShelf(activeShelfIdx - 1);
  document.querySelector('#shelf-next').onclick = () => updateShelf(activeShelfIdx + 1);
  let shelfPaused = false;
  let touchStartX = 0;
  if (shelfStage) {
    shelfStage.addEventListener('mouseenter', () => { shelfPaused = true; });
    shelfStage.addEventListener('mouseleave', () => { shelfPaused = false; });
    shelfStage.addEventListener('focusin', () => { shelfPaused = true; });
    shelfStage.addEventListener('focusout', () => { shelfPaused = false; });
    shelfStage.addEventListener('touchstart', e => {
      shelfPaused = true;
      touchStartX = e.changedTouches?.[0]?.clientX || 0;
    }, { passive: true });
    shelfStage.addEventListener('touchend', e => {
      const dx = (e.changedTouches?.[0]?.clientX || 0) - touchStartX;
      if (Math.abs(dx) > 36) updateShelf(activeShelfIdx + (dx < 0 ? 1 : -1));
      setTimeout(() => { shelfPaused = false; }, 3500);
    }, { passive: true });
  }
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setTimeout(() => {
      if (shelfStage && document.body.contains(shelfStage) && !document.hidden && !shelfPaused) {
        updateShelf(activeShelfIdx + 1);
      }
    }, 900);
    window._izShelfTimer = setInterval(() => {
      if (!shelfStage || !document.body.contains(shelfStage)) { clearInterval(window._izShelfTimer); window._izShelfTimer = null; return; }
      if (!document.hidden && !shelfPaused) updateShelf(activeShelfIdx + 1);
    }, 2600);
  }
  updateShelf(activeShelfIdx);
}

function showBookSection(section) {
  app.innerHTML = `<div class="subhead"><a class="back" href="#courses">← Барлық курс</a>
    <h1>${section.title}</h1><p>${section.description}</p></div>
    <div class="libgrid vocabulary-grid">${section.books.map(book => {
      const prog = bookProgress(book.id);
      return `<article class="panel lib">
        ${coverImage(book.id)}
        <div style="flex:1"><small>${esc(book.subtitle)}</small><h3>${esc(book.name)}</h3>
          <p>${esc(book.description)}</p><small>${book.total} бет · ${prog.done}/${prog.total} тақырып өтілді</small>
          <div class="progressbar"><i style="width:${prog.pct}%"></i></div>
          <div class="lib-links">
            <a class="btn" href="#course/${book.id}">Мазмұны</a>
            <a class="btn soft" href="#read/${book.id}/1">Кітапты оқу</a>
          </div>
        </div>
      </article>`;
    }).join('')}</div>`;
}

function tabs(b, u) {
  return '<div class="tabs" aria-label="Кітапты таңдау">' + [b - b % 2, b - b % 2 + 1].map(x =>
    '<a class="' + (x === b ? 'selected' : '') + '" href="' + (u === undefined ? '#course/' + x : link(x, u)) + '">' + title(x) + '</a>').join('') + '</div>';
}

function course(b) {
  const l = levels[b >> 1], book = books[b];
  const info = book.name ? book.subtitle : sectionName(l) + ' · ' + l.tag;
  const section = bookSection(b);
  const back = section ? '<a class="back" href="#' + section.route + '">← ' + esc(section.title) + '</a>' : '<a class="back" href="#courses">← Барлық курс</a>';
  const controls = book.name ? '<a class="btn soft" href="#read/' + b + '/1">Кітапты басынан оқу</a>' : tabs(b);
  const prog = bookProgress(b);

  app.innerHTML = `<div class="subhead">${back}
    <h1>${esc(book.name ?? l.name)}</h1>
    <p>${esc(info)} · ${book.units.length} тақырып · <b>${prog.done}/${prog.total} өтілді (${prog.pct}%)</b></p>
    <div class="progressbar" style="max-width:420px"><i style="width:${prog.pct}%"></i></div>
  </div>
  <div class="tline">${controls}<input id="q" class="search" type="search" placeholder="Сабақты іздеу..." aria-label="Тақырыпты іздеу"></div>
  <ul class="units" id="units"></ul>`;

  function list(q) {
    document.querySelector('#units').innerHTML = book.units
      .map((u, i) => ({ u, i }))
      .filter(({ u, i }) => (u.title + ' ' + (i + 1)).toLocaleLowerCase().includes(q.trim().toLocaleLowerCase()))
      .map(({ u, i }) => {
        const isDone = Boolean(state.done[b + '-' + i]);
        return `<li><a class="unit${isDone ? ' is-done' : ''}" href="${link(b, i)}">
          <span class="num">${isDone ? '✓' : String(i + 1).padStart(2, '0')}</span>
          <div><b>${esc(u.title)}</b><small>${u.start}–${u.end} бет</small></div>
          ${isDone ? '<span class="tick">Өтілді</span>' : ''}
        </a></li>`;
      }).join('') || '<li>Мұндай тақырып табылмады.</li>';
  }
  list('');
  document.querySelector('#q').oninput = e => list(e.target.value);
}

let libraryFilter = 'all';
function bookList() {
  const filters = [
    { id: 'all', label: 'Барлығы (18)' },
    { id: 'beginner', label: 'Beginner (A1–A2)' },
    { id: 'inter', label: 'Intermediate & Advanced' },
    { id: 'business', label: 'Business English' },
    { id: 'ref', label: 'Грамматика және Сөздік' }
  ];
  const filtered = orderedBooks().filter(b => {
    if (libraryFilter === 'beginner') return b.id >= 6 && b.id <= 9;
    if (libraryFilter === 'inter') return b.id >= 2 && b.id <= 5;
    if (libraryFilter === 'business') return (b.id >= 0 && b.id <= 1) || (b.id >= 10 && b.id <= 11);
    if (libraryFilter === 'ref') return b.id >= 12;
    return true;
  });

  app.innerHTML = `<div class="subhead">
    <h1>Кітапхана</h1>
    <p>English for Everyone сериясының барлық 18 кітабы. Кітапты мұқабасынан бастап оқыңыз немесе мазмұнынан тақырып таңдаңыз.</p>
    <div class="tabs" id="lib-filters">${filters.map(f =>
      `<button type="button" class="${libraryFilter === f.id ? 'selected' : ''}" data-filter="${f.id}">${f.label}</button>`).join('')}
    </div>
  </div>
  <div class="libgrid">${filtered.map(b => {
    const i = b.id;
    const prog = bookProgress(i);
    return `<div class="panel lib">
      <img src="${pages(i, 1)}" alt="${esc(bookGroup(i))} мұқабасы">
      <div style="flex:1">
        <small>${esc(bookGroup(i))}</small>
        <h3>${title(i)}</h3>
        <small>${b.total} бет · ${prog.done}/${prog.total} сабақ</small>
        <div class="progressbar"><i style="width:${prog.pct}%"></i></div>
        <div class="lib-links">
          <a class="btn" href="#course/${i}">Мазмұны</a>
          <a class="btn soft" href="#read/${i}/1">Кітапты оқу</a>
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
    const b = match ? Number(match[1]) : -1, u = match ? Number(match[2]) : -1;
    const unit = books[b]?.units[u];
    return unit && typeof text === 'string' && text.trim() ? [{ id, b, u, unit, text }] : [];
  });
  app.innerHTML = `<div class="subhead"><h1>Менің беттерім</h1>
    <p>Оқу прогресі (${doneCount} сабақ өтілді), соңғы ашылған бет және бетбелгілер осы браузерде сақталады.</p>
    <div class="export-bar"><button type="button" id="print-pdf">📄 PDF ретінде сақтау</button></div>
    <div class="export-bar" style="margin-top:8px">
      <button type="button" class="soft" id="export-progress">💾 Көшірме сақтау (.json)</button>
      <label class="btn soft" for="import-progress" style="margin:0">⬆ Қалпына келтіру (.json)<input type="file" id="import-progress" accept=".json,application/json" hidden></label>
      <small id="backup-status" class="muted" role="status"></small>
    </div>
    <small class="muted" style="display:block;margin-top:6px">PDF — оқу және басып шығару үшін. Ал .json — прогрессті басқа құрылғыда қалпына келтіру үшін.</small></div>
    ${last ? `<section class="panel last-reading"><h2>Соңғы ашылған бет</h2><a class="unit" href="${last}"><div><b>${esc(readingTitle(state.last))}</b><small>${esc(bookGroup(state.last.b))} · ${state.last.p}-бет</small></div></a></section>` : ''}
    ${bookmarks || '<div class="panel"><p class="muted" style="margin:0">Бетбелгі қосу үшін сабақ ішіндегі «Бетбелгі» батырмасын басыңыз.</p></div>'}
    ${notes.length ? `<section class="section"><div class="saved-head"><h2>Сабақ жазбаларым (${notes.length})</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="soft btn-del" id="del-selected-notes" hidden>Таңдалғандарды өшіру</button>${notes.length > 1 ? '<button type="button" class="soft btn-del" id="clear-notes">Барлық жазбаны өшіру</button>' : ''}</div></div><div class="libgrid">
      ${notes.map(({ id, b, u, unit, text }) => `<div class="panel"><div class="saved-note-head"><label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer"><input type="checkbox" class="note-select" value="${esc(id)}" style="margin-top:4px"><div><h3>${esc(unit.title)}</h3><small class="muted">${esc(bookGroup(b))}</small></div></label><button type="button" class="soft btn-del" data-del-note="${esc(id)}">✕ Өшіру</button></div><p class="saved-note">${esc(text)}</p><a class="back" href="${link(b, u)}">Сабаққа өту →</a></div>`).join('')}
    </div></section>` : ''}`;
  document.querySelectorAll('[data-del-bookmark]').forEach(btn => { btn.onclick = () => { delete state.bookmarks[btn.dataset.delBookmark]; save(); savedReading(); }; });
  const cb = document.querySelector('#clear-bookmarks'); if (cb) cb.onclick = () => { state.bookmarks = {}; save(); savedReading(); };
  document.querySelectorAll('[data-del-note]').forEach(btn => { btn.onclick = () => { delete state.notes[btn.dataset.delNote]; save(); savedReading(); }; });
  const dsn = document.querySelector('#del-selected-notes'), ncs = [...document.querySelectorAll('.note-select')];
  if (dsn && ncs.length) {
    ncs.forEach(c => { c.onchange = () => { const n = ncs.filter(x => x.checked).length; dsn.hidden = !n; dsn.textContent = `Таңдалғандарды өшіру (${n})`; }; });
    dsn.onclick = () => { ncs.forEach(c => { if (c.checked) delete state.notes[c.value]; }); save(); savedReading(); };
  }
  const cn = document.querySelector('#clear-notes'); if (cn) cn.onclick = () => { state.notes = {}; save(); savedReading(); };
  document.querySelector('#print-pdf').onclick = () => window.print();
  document.querySelector('#export-progress').onclick = () => {
    const work = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith('iz-work:')) work[k] = localStorage.getItem(k); } } catch {}
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), study: state, work }, null, 2)], { type: 'application/json' }));
    a.download = 'izilingua-progress-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    document.querySelector('#backup-status').textContent = 'Көшірме сақталды ✓';
  };
  document.querySelector('#import-progress').onchange = async e => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text()); if (!d?.study) throw Error();
      for (const k of ['done', 'notes', 'bookmarks']) if (d.study[k]) state[k] = d.study[k];
      if (d.study.last) state.last = d.study.last; if (d.study.lastLesson) state.lastLesson = d.study.lastLesson;
      save(); if (d.work) for (const [k, v] of Object.entries(d.work)) if (k.startsWith('iz-work:')) localStorage.setItem(k, v);
      savedReading(); document.querySelector('#backup-status').textContent = 'Прогресс қалпына келтірілді ✓';
    } catch { document.querySelector('#backup-status').textContent = 'Қате файл пішімі.'; }
  };
}

function lessonNavigation(book, unitIndex) {
  const previous = book.units[unitIndex - 1];
  const next = book.units[unitIndex + 1];
  if (!previous && !next) return '';
  return `<nav class="lesson-navigation" aria-label="Сабақтар арасында ауысу">
    ${previous ? `<a class="soft" href="${link(book.id, unitIndex - 1)}">← Алдыңғы сабақ<small>${esc(previous.title)}</small></a>` : ''}
    ${next ? `<a class="soft lesson-next" href="${link(book.id, unitIndex + 1)}">Келесі сабақ →<small>${esc(next.title)}</small></a>` : ''}
  </nav>`;
}

function pageButton(direction, disabled, side = false) {
  const previous = direction < 0;
  const label = previous ? 'Алдыңғы бет' : 'Келесі бет';
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
      stage.querySelector('.page-status').textContent = 'Бет жүктелмеді. Қайта басыңыз.';
      return;
    }
    if (request !== readerRequest || !stage.isConnected) return;
    turnDirection = Math.sign(p - activeReader.page);
    image.alt = title(b) + ' · ' + p + '-бет';
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
  const intro = single && !standalone && books[b - b % 2].units[u]?.intro;
  const answer = book.answer ? '<a class="back" href="#read/' + b + '/' + book.answer + '">' + (b === 12 ? 'Анықтамалықты ашу' : 'Жауап кілтін ашу') + '</a>' : '';
  const topicIndex = single ? u : book.units.findIndex(topic => topic.start <= p && p <= topic.end);
  const audioNumber = b >= 14 ? topicIndex + 1 - (b === 16 ? 3 : 2) : u + 1;
  const needAudio = (b >= 14 && topicIndex >= 0) || (single && b < 12);
  const hasAudioData = typeof dkAudio !== 'undefined' && (b < 14 || Boolean(dkAudio[14]));
  const hasAudio = b >= 14 ? Boolean(typeof dkAudio !== 'undefined' && dkAudio[b]?.[audioNumber]) : single && b < 12;
  const zenOn = document.body.classList.contains('iz-zen');
  const hasPublicOriginal = book.original && !String(book.original).includes('chatgpt.com/library');
  const pairBookId = !standalone && single ? (b ^ 1) : -1;
  const hasPairUnit = pairBookId >= 0 && Boolean(books[pairBookId]?.units[u]);
  const pairPanel = hasPairUnit ? (b % 2 === 0
    ? `<section class="panel"><h3>Жаттығумен бекіту</h3><p class="muted" style="margin:0 0 10px">Осы сабақты ${esc(title(pairBookId))} кітабында жаттығумен бекітіңіз.</p><a class="btn" href="${link(pairBookId, u)}">${esc(title(pairBookId))}-қа өту →</a></section>`
    : `<section class="panel"><h3>Түсіндірмеге оралу</h3><p class="muted" style="margin:0 0 10px">Осы тақырыптың ережесін ${esc(title(pairBookId))} кітабынан қараңыз.</p><a class="btn" href="${link(pairBookId, u)}">← ${esc(title(pairBookId))}-қа оралу</a></section>`) : '';
  const lessonAudio = hasAudio ? (existingAudio?.dataset.lesson === b + '-' + audioNumber ? existingAudio : createLessonAudio(b, audioNumber)) : null;

  if (same && existingAudio !== lessonAudio) {
    existingAudio?.remove();
    if (lessonAudio) app.querySelector('.side').prepend(lessonAudio);
  }

  if (!same) {
    app.innerHTML = `<div class="subhead">
      <a class="back" href="${single ? '#course/' + b : '#library'}">← ${single ? esc(standalone ? book.name : group) + ' · Мазмұны' : 'Кітапхана'}</a>
      <h1 class="lessonTitle">${esc(single ? unit.title : standalone ? book.name : group + ' · ' + title(b))}</h1>
      ${single ? `<span class="badge">${u + 1}-сабақ</span>` : ''}
      ${intro ? `<p>${esc(intro)}</p>` : ''}
      ${lessonAudio?.querySelector('audio') ? '<button type="button" id="skip-to-audio" class="soft">🎧 Сабақ аудиосына өту</button>' : ''}
    </div>
    ${single && !standalone ? tabs(b, u) : ''}
    ${navigation}
    <div class="lessonlayout">
      <section class="panel reader">
        <div class="readerbar">
          <div class="pager">${pageButton(-1, p === start)}<span>${p} / ${end} бет</span>${pageButton(1, p === end)}</div>
          <div class="reader-actions">
            ${single ? `<button type="button" id="mark-done" class="${isDone ? 'success' : 'soft'}" aria-pressed="${isDone}">${isDone ? '✓ Өтілді' : 'Сабақты аяқтау'}</button>` : ''}
            <button type="button" class="soft" id="zoom" aria-pressed="${zoomed}">${zoomed ? 'Кішірейту' : 'Үлкейту'}</button><button type="button" class="soft" id="zen-toggle" aria-pressed="${zenOn}">${zenOn ? '✕ Фокус' : '⛶ Фокус'}</button>
          </div>
        </div>
        <div class="page-stage">
          <div class="pageimg${zoomed ? ' zoom' : ''}"><img src="${pages(b, p)}" alt="${esc(title(b) + ' · ' + p + '-бет')}"></div>
          ${pageButton(-1, p === start, true)}
          ${pageButton(1, p === end, true)}
        </div>
      </section>
      <aside class="side">${pairPanel}
        ${single ? '' : `<section class="panel"><h3>Бетке өту</h3><form id="jump"><label for="page">Бет нөмірі</label><div class="row"><input type="number" min="1" max="${end}" required id="page" value="${p}"><button>Ашу</button></div></form>${lessonToResume ? `<a class="back" href="${lessonToResume}">Сабаққа оралу</a>` : ''}</section>`}
        <section class="panel">
          <h3>Қосымша</h3>
          <a class="back" href="#course/${b}">Кітап мазмұны</a>
          ${hasPublicOriginal ? `<a class="back" target="_blank" rel="noopener" href="${esc(book.original)}">${b >= 12 ? 'Қазақша PDF ↗' : 'Түпнұсқа PDF ↗'}</a>` : ''}
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
    document.querySelector('.pager > span').textContent = p + ' / ' + end + ' бет';
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
      if (b !== 12 && typeof izPractice === 'object' && izPractice?.mount) izPractice.mount(app, b, p, book.answer);
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
      event.currentTarget.textContent = nowDone ? '✓ Өтілді' : 'Сабақты аяқтау';
      event.currentTarget.setAttribute('aria-pressed', String(nowDone));
    };
  }

  if (single && $('#lesson-note')) {
    $('#lesson-note').oninput = e => {
      const val = e.target.value;
      if (val.trim()) state.notes[unitKey] = val;
      else delete state.notes[unitKey];
      save();
      $('#note-status').textContent = 'Сақталды ✓';
    };
  }

  function zoom() {
    const on = $('.pageimg').classList.toggle('zoom');
    activeReader.zoomed = on;
    $('#zoom').textContent = on ? 'Кішірейту' : 'Үлкейту';
    $('#zoom').setAttribute('aria-pressed', String(on));
  }
  $('#zoom').onclick = zoom;
  $('.pageimg img').onclick = zoom;
  if ($('#zen-toggle')) $('#zen-toggle').onclick = () => {
    const on = document.body.classList.toggle('iz-zen');
    $('#zen-toggle').textContent = on ? '✕ Фокус' : '⛶ Фокус';
    $('#zen-toggle').setAttribute('aria-pressed', String(on));
  };
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

  if (!(view === 'lesson' && books[b]?.units[u]) && !(view === 'read' && books[b])) activeReader = null;
  if (section) showBookSection(section);
  else if (view === 'search') globalSearch();
  else if (view === 'library') bookList();
  else if (view === 'course' && books[b]) course(b);
  else if (view === 'lesson' && books[b]?.units[u]) reader(b, u, Number(pp));
  else if (view === 'read' && books[b]) reader(b, null, Number(uu));
  else home();

  if (previousRoute !== family) window.scrollTo({ top: 0, behavior: 'instant' });
  previousRoute = family;

  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.hash === (view === 'about' ? '#about' : view === 'library' || view === 'read' ? '#library' : view === 'search' ? '#search' : '#courses')));
  if (view === 'about') document.getElementById('about-section')?.scrollIntoView();

  const heading = app.querySelector('h1')?.textContent;
  document.title = heading && heading !== 'Izilingua' ? heading + ' · Izilingua' : 'Izilingua · Ағылшын тілін қазақша үйрен';
}

window.addEventListener('keydown', event => {
  if (!activeReader || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented ||
    event.target?.closest?.('input,textarea,select,audio,button,[contenteditable]')) return;
  const id = event.key === 'ArrowLeft' ? '#prev' : event.key === 'ArrowRight' ? '#next' : null;
  const button = id && document.querySelector(id);
  if (button && !button.disabled) { event.preventDefault(); button.click(); }
});

const footerAuthor = document.querySelector('#footer-author');
if (footerAuthor) footerAuthor.innerHTML = instagramLink('Сайт авторы · Instagram');

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

function applyTheme(theme) {
  if (theme === 'sepia' || theme === 'dark') document.documentElement.dataset.theme = theme;
  else { delete document.documentElement.dataset.theme; theme = 'day'; }
  try { localStorage.setItem('iz-theme', theme); } catch {}
  document.querySelectorAll('.theme-switch button').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.theme === theme)));
}
try { applyTheme(localStorage.getItem('iz-theme') || 'day'); } catch { applyTheme('day'); }
document.querySelectorAll('.theme-switch button').forEach(btn => { btn.onclick = () => applyTheme(btn.dataset.theme); });
