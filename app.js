'use strict';
const levels=[
 {name:'Business English · Level 1',level:'05',tag:'Іскерлік ағылшын тілі',desc:'Танысу, келіссөз жүргізу және іскерлік хат жазу.'},
 {name:'Intermediate',level:'03',tag:'Орта деңгей',desc:'Күнделікті әңгіме, сөздік қор және грамматика.'},
 {name:'Advanced',level:'04',tag:'Жоғары деңгей',desc:'Күрделі құрылымдар, еркін сөйлеу және ой дәлдігі.'},
 {name:'Beginner · Level 1',level:'01',tag:'Бастапқы деңгей',desc:'Танысу, қарапайым сұрақтар және күнделікті сөздер.'},
 {name:'Beginner · Level 2',level:'02',tag:'Бастапқы деңгейді жалғастыру',desc:'Күнделікті әдеттерді, оқиғалар мен жоспарларды сипаттау.'},
 {name:'Business English · Level 2',level:'06',tag:'Іскерлік ағылшын тілі',desc:'Іскерлік келіссөздер, шарттар және жұмыс мәселелерін талқылау.'},
 {name:'English Grammar',level:null,tag:'Барлық деңгейге',desc:'Ағылшын грамматикасының ережелерін оқып, әр тақырыпты жаттығумен бекітіңіз.'}
];
const courseOrder=[6,3,4,1,2,0,5];
const app=document.querySelector('#app');
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storageKey = 'folio-study-v1';
const state = {done:{}, notes:{}, last:null, lastLesson:null, bookmarks:{}};
try {
 const stored = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
 for (const field of ['done', 'notes', 'bookmarks']) {
  if (stored?.[field] && typeof stored[field] === 'object' && !Array.isArray(stored[field])) state[field] = stored[field];
 }
 if (stored?.last && typeof stored.last === 'object') state.last = stored.last;
 if (stored?.lastLesson?.u != null) state.lastLesson = stored.lastLesson;
 else if (state.last?.u != null) state.lastLesson = state.last;
} catch {}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(state));return true}catch{return false}}
const sectionName=l=>l.level ? Number(l.level)+'-бөлім' : 'Грамматика бөлімі';
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
const title=b=>books[b]?.name??(b===12?'Grammar Guide':b%2?'Practice Book':'Course Book');
const pages=(b,p)=>'pages/'+b+'/'+p+'.webp';
const link=(b,u,p)=>'#lesson/'+b+'/'+u+(p?'/'+p:'');
const orderedBooks=()=>[...courseOrder.flatMap(i=>[books[i*2],books[i*2+1]]),...vocabularyBooks];
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
 app.innerHTML = `<div class="subhead"><a class="back" href="#courses">Барлық курс</a><h1>Кітап пен сабақ іздеу</h1></div>
  <label for="global-q">Кітап немесе сабақ атауы</label>
  <input id="global-q" class="search" type="search" placeholder="Мысалы, фразалық етістіктер" value="${esc(searchQuery)}">
  <p id="search-status" role="status"></p><ul id="search-results" class="units"></ul>
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
   for (const {book, label, keywords, units} of catalog) {
    if (terms.every(term => keywords.includes(term))) {
     matches.push({href:'#course/' + book.id, name:label, detail:book.total + ' бет', rank:0});
    }
    units.forEach((name, index) => {
     if (!terms.some(term => name.includes(term)) || !terms.every(term => name.includes(term) || keywords.includes(term))) return;
     matches.push({href:link(book.id,index), name:book.units[index].title, detail:label, rank:name.includes(query)?1:2});
    });
   }
  }
  matches.sort((a,b)=>a.rank-b.rank);
  results.innerHTML = matches.slice(0,limit).map(({href,name,detail}) =>
   `<li><a class="unit" href="${href}"><div><b>${esc(name)}</b><small>${esc(detail)}</small></div></a></li>`).join('');
  status.textContent = !query?'Мысалы, «грамматика» немесе «саяхат» деп іздеңіз.':matches.length ? matches.length + ' нәтиже' : 'Сәйкес кітап немесе сабақ табылмады.';
  more.hidden = matches.length <= limit;
 }
 input.oninput = () => { searchQuery = input.value; limit = 30; update(); };
 more.onclick = () => { limit += 30; update(); };
 update();
}

function bookmarkList() {
 const entries = Object.values(state.bookmarks).filter(readingLink).reverse();
 if (!entries.length) return '';
 return `<section class="section saved-pages"><h2>Бетбелгілер</h2><ul class="units">${entries.map(entry =>
  `<li><a class="unit" href="${readingLink(entry)}"><div><b>${esc(readingTitle(entry))}</b><small>${esc(bookGroup(entry.b))} · ${entry.p}-бет</small></div></a></li>`).join('')}</ul></section>`;
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
const feedbackWebApp = typeof siteConfig === 'object' ? siteConfig.feedbackWebApp.trim() : '';
const feedbackEnabled = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(feedbackWebApp);
const instagramIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.8" r=".8" fill="currentColor" stroke="none"/></svg>';

function instagramLink(label, iconOnly = false) {
 return instagram ? `<a class="author-instagram${iconOnly?' author-instagram--icon':''}" href="${esc(instagram)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(label)}">${instagramIcon}${iconOnly?'':'<span>'+esc(label)+'</span>'}</a>` : '';
}

function feedbackSection() {
 return `<section class="section feedback-section" aria-labelledby="feedback-heading">
  <h2 id="feedback-heading">Кері байланыс</h2>
  ${feedbackEnabled
   ? `<iframe class="feedback-frame" title="Izilingua сайтына пікір қалдыру" src="${esc(feedbackWebApp)}" loading="lazy" referrerpolicy="no-referrer"></iframe>
      <a class="back" href="${esc(feedbackWebApp)}" target="_blank" rel="noopener noreferrer">Форманы бөлек ашу</a>`
   : '<p>Пікір жіберу формасы әзірге қосылмаған.</p>'}
 </section>`;
}

function home() {
  const last = readingLink(state.last);
  const resume = last ?? '#course/12';
  const collection = [0, 1].flatMap(type => [
    ...courseOrder.map(i => 2 * i + type),
    ...vocabularyBooks.slice(type * 2, type * 2 + 2).map(book => book.id)
  ]).map(id => `<a href="#course/${id}">${coverImage(id)}</a>`).join('');
  const bookCards = bookSections.map(section => `<a href="#${section.route}" class="card vocabulary-card">
    <div class="cover-art"><span class="cover-section">Кітаптар</span>
      <div class="vocabulary-covers" aria-hidden="true">${section.books.map(book => coverImage(book.id, true)).join('')}</div>
    </div>
    <div class="cardbody"><h3>${section.title}</h3>
      <p>${section.description}</p>
      <div class="cardfoot"><b>Барлық деңгейге</b><span>${section.books.length} кітап</span></div>
    </div>
  </a>`);
  const cards = courseOrder.map(i => {
    const level = levels[i];
    const bookId = 2 * i;
    const card = `<a href="#course/${bookId}" class="card g${i}">
      <div class="cover-art">
        <span class="cover-section">${sectionName(level)}</span>
        <div class="cover-pair" aria-hidden="true">
          <div>${coverImage(bookId, true)}<span>${title(bookId)}</span></div>
          <div>${coverImage(bookId + 1, true)}<span>Practice Book</span></div>
        </div>
      </div>
      <div class="cardbody">
        <h3>${level.name}</h3>
        <p>${level.desc}</p>
        <div class="cardfoot"><b>${level.tag}</b><span>${books[bookId].units.length} сабақ</span></div>
      </div>
    </a>`;
    return card;
  }).concat(bookCards).join('');
  app.innerHTML = `<section class="hero cover-hero">
    <div class="heroCopy">
      <span class="label">IZILINGUA</span>
      <h1>Ағылшын тілін қазақша түсіндіретін онлайн платформа</h1>
      <p>Ағылшын тілін өз бетіңізше үйренуге арналған тегін ресурс. Деңгейіңізге сай кітап таңдап, қазақша түсіндірмелерді оқыңыз, аудио тыңдаңыз және жаттығу орындаңыз.</p>
      <div class="hero-actions"><a class="btn light" href="#courses">Курстарды көру</a><a class="shelf-link" href="#library">18 кітапты қарау</a></div>
      ${last ? `<a class="shelf-link" href="${resume}">Оқуды жалғастыру</a>` : ''}
      ${last ? `<p class="resume-location">${esc(readingTitle(state.last))} · ${state.last.p}-бет</p>` : ''}
    </div>
    <div id="home-books" class="cover-collection" role="group" aria-label="English for Everyone жинағының 18 мұқабасы">${collection}</div><button id="expand-books" class="soft" aria-expanded="false" aria-controls="home-books">Барлық 18 кітапты көрсету</button>
  </section>
  <section class="section">
    <div id="course-list" class="sectionhead"><h2>Оқу курстары</h2><span class="mini">${courseOrder.length + bookSections.length} бөлім · ${books.length} кітап</span></div>
    <div class="coursegrid">${cards}</div>
  </section>
  <section class="about-study" id="about-section">
    <figure><a href="#lesson/14/2/12"><img loading="lazy" src="pages/14/12.webp" alt="Елдер мен ұлттар сабағын ашу"></a><figcaption><b>Елдер мен ұлттар</b><audio controls preload="none" aria-label="Canada сөзінің айтылуы" src="https://apps-api.dk.com/efe/audio/vb/1/vb_1_1_canada_us.mp3"></audio><small>Canada сөзінің айтылуы</small></figcaption></figure>
    <div><h2>Біз туралы</h2><p>Izilingua — ағылшын тілін қазақша түсініп, өз қарқынымен үйренгісі келетіндерге арналған тегін онлайн платформа. Кітапханамызда English for Everyone сериясының 18 кітабы бар.</p>
    <h3>Қазақша түсініп оқыңыз</h3><p>Грамматиканы қазақша түсіндірмелер мен ағылшынша мысалдар арқылы меңгеріңіз.</p>
    <h3>Тыңдап, жаттығыңыз</h3><p>Сөздер мен тіркестердің айтылуын тыңдап, үйренгеніңізді кітаптағы жаттығулармен бекітіңіз.</p>
    <h3>Қалған жеріңізден жалғастырыңыз</h3><p>Керек бетке бетбелгі қойып, оны «Менің беттерім» бөлімінен қайта ашыңыз.</p></div>
  </section>
  ${feedbackSection()}`;
  const toggle = document.querySelector('#expand-books');
  toggle.onclick = () => {
    const expanded = document.querySelector('#home-books').classList.toggle('expanded');
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.textContent = expanded ? 'Алты мұқабаны көрсету' : 'Барлық 18 кітапты көрсету';
  };

}
function showBookSection(section) {
  app.innerHTML = `<div class="subhead"><a class="back" href="#courses">Барлық курс</a>
    <h1>${section.title}</h1></div>
    <div class="libgrid vocabulary-grid">${section.books.map(book => `<article class="panel lib">
      ${coverImage(book.id)}
      <div><small>${esc(book.subtitle)}</small><h3>${esc(book.name)}</h3>
        <p>${esc(book.description)}</p><small>${book.total} бет</small>
        <a class="back" href="#course/${book.id}">Мазмұны</a>
        <a class="back" href="#read/${book.id}/1">Кітапты оқу</a>
      </div>
    </article>`).join('')}</div>`;
}
function tabs(b,u){return '<div class="tabs" aria-label="Кітапты таңдау">'+[b-b%2,b-b%2+1].map(x=>'<a class="'+(x===b?'selected':'')+'" href="'+(u===undefined?'#course/'+x:link(x,u))+'">'+title(x)+'</a>').join('')+'</div>'}
function course(b){
 const l=levels[b>>1],book=books[b];
 const info=book.name?book.subtitle:sectionName(l)+' · '+l.tag;
 const section=bookSection(b);
 const back=section?'<a class="back" href="#'+section.route+'">'+esc(section.title)+'</a>':'<a class="back" href="#courses">Барлық курс</a>';
 const controls=book.name?'<a class="back" href="#read/'+b+'/1">Кітапты оқу</a>':tabs(b);
 app.innerHTML='<div class="subhead">'+back+'<h1>'+esc(book.name??l.name)+'</h1><p>'+esc(info)+' · '+book.units.length+' тақырып</p></div><div class="tline">'+controls+'<input id="q" class="search" type="search" placeholder="Сабақты іздеу" aria-label="Тақырыпты іздеу"></div><ul class="units" id="units"></ul>';
 function list(q){document.querySelector('#units').innerHTML=book.units.map((u,i)=>({u,i})).filter(({u,i})=>(u.title+' '+(i+1)).toLocaleLowerCase().includes(q.trim().toLocaleLowerCase())).map(({u,i})=>'<li><a class="unit" href="'+link(b,i)+'"><span class="num">'+String(i+1).padStart(2,'0')+'</span><div><b>'+esc(u.title)+'</b><small>'+u.start+'–'+u.end+' бет</small></div>'+'</a></li>').join('')||'<li>Мұндай тақырып табылмады.</li>'}
 list('');document.querySelector('#q').oninput=e=>list(e.target.value)
}
function bookList(){app.innerHTML='<div class="subhead"><h1>Кітапхана</h1><p>Кітапты мұқабасынан бастап оқыңыз немесе мазмұнынан тақырып таңдаңыз.</p></div><div class="libgrid">'+orderedBooks().map(b=>{const i=b.id;return '<div class="panel lib"><img src="'+pages(i,1)+'" alt="'+esc(bookGroup(i))+' мұқабасы"><div><small>'+esc(bookGroup(i))+'</small><h3>'+title(i)+'</h3><small>'+b.total+' бет</small><a class="back" href="#read/'+i+'/1">Кітапты оқу</a> · <a class="back" href="#course/'+i+'">Мазмұны</a></div></div>'}).join('')+'</div>'}
function savedReading() {
 const last = readingLink(state.last);
 const bookmarks = bookmarkList();
 const notes = Object.entries(state.notes).flatMap(([id, text]) => {
  const match = /^(\d+)-(\d+)$/.exec(id);
  const unit = match && books[Number(match[1])]?.units[Number(match[2])];
  return unit && typeof text === 'string' && text.trim() ? [{unit,text}] : [];
 });
 app.innerHTML = `<div class="subhead"><h1>Менің беттерім</h1>
  <p>Соңғы ашылған бет пен бетбелгілер осы браузерде сақталады.</p></div>
  ${last?`<section class="panel last-reading"><h2>Соңғы ашылған бет</h2>
    <a class="unit" href="${last}"><div><b>${esc(readingTitle(state.last))}</b><small>${state.last.p}-бет</small></div></a></section>`:''}
  ${bookmarks || '<p>Бетбелгі қосу үшін кітаптағы «Бетбелгі» батырмасын басыңыз.</p>'}
  ${notes.length?`<details class="panel"><summary>Бұрынғы жазбалар</summary>
    ${notes.map(({unit,text})=>`<h3>${esc(unit.title)}</h3><p class="saved-note">${esc(text)}</p>`).join('')}</details>`:''}`;
}

function lessonNavigation(book, unitIndex) {
 const previous = book.units[unitIndex - 1];
 const next = book.units[unitIndex + 1];
 if (!previous && !next) return '';
 return `<nav class="lesson-navigation" aria-label="Сабақтар арасында ауысу">
  ${previous?`<a class="soft" href="${link(book.id,unitIndex-1)}">Алдыңғы сабақ<small>${esc(previous.title)}</small></a>`:''}
  ${next?`<a class="soft lesson-next" href="${link(book.id,unitIndex+1)}">Келесі сабақ<small>${esc(next.title)}</small></a>`:''}
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
async function reader(b,u,p){
 const book=books[b],unit=book.units[u],single=!!unit,standalone=!!book.name,group=bookGroup(b),start=single?unit.start:1,end=single?unit.end:book.total;
 p=Number.isInteger(p)&&p>=start&&p<=end?p:start;
 const url=n=>single?link(b,u,n):'#read/'+b+'/'+n;
 const lessonToResume = state.lastLesson?.b === b ? readingLink(state.lastLesson) : null;
 const readerId = b + ':' + (single ? u : 'book');
 const same = activeReader?.id === readerId && app.querySelector('.page-stage');
 const request = ++readerRequest;
 let turnDirection = 0;
 if (same && activeReader.page !== p) {
  const stage = app.querySelector('.page-stage');
  const image = new Image();
  image.src = pages(b,p);
  stage.setAttribute('aria-busy','true');
  try {
   await image.decode();
  } catch {
   if (request !== readerRequest || !stage.isConnected) return;
   stage.removeAttribute('aria-busy');
   history.replaceState(history.state,'',url(activeReader.page));
   stage.querySelector('.page-status').textContent = 'Бет жүктелмеді. Қайта басыңыз.';
   return;
  }
  if (request !== readerRequest || !stage.isConnected) return;
  turnDirection = Math.sign(p-activeReader.page);
  image.alt = title(b)+' · '+p+'-бет';
  stage.querySelector('.pageimg img').replaceWith(image);
 }
 const position = {b,u:single?u:null,p};
 state.last=position;
 if (single) state.lastLesson=position;
 save();
 const markId = url(p);
 const hasBookmark = Object.hasOwn(state.bookmarks,markId);
 const zoomed = activeReader?.id === readerId && Boolean(activeReader.zoomed);
 activeReader = {id:readerId,zoomed,page:p};
 const navigation=single?lessonNavigation(book,u):'';
 const existingAudio=app.querySelector('.lesson-audio');
 const intro=single && !standalone && books[b-b%2].units[u]?.intro;
 const answer=book.answer?'<a class="back" href="#read/'+b+'/'+book.answer+'">'+(b===12?'Анықтамалықты ашу':'Жауап кілтін ашу')+'</a>':'';
 const topicIndex = single ? u : book.units.findIndex(topic => topic.start <= p && p <= topic.end);
 const audioNumber = b >= 14 ? topicIndex + 1 - (b === 16 ? 3 : 2) : u + 1;
 const hasAudio = b >= 14 ? !!dkAudio[b]?.[audioNumber] : single && b < 12;
 const lessonAudio = hasAudio ? (existingAudio?.dataset.lesson === b+'-'+audioNumber ? existingAudio : createLessonAudio(b,audioNumber)) : null;
 if (same && existingAudio !== lessonAudio) {
  existingAudio?.remove();
  if (lessonAudio) app.querySelector('.side').prepend(lessonAudio);
 }
 if (!same) {
 app.innerHTML='<div class="subhead"><a class="back" href="'+(single?'#course/'+b:'#library')+'">'+(single?esc(standalone?book.name:group)+' · Мазмұны':'Кітапхана')+'</a><h1 class="lessonTitle">'+esc(single?unit.title:standalone?book.name:group+' · '+title(b))+'</h1>'+(single?'<span class="badge">'+(u+1)+'-сабақ</span>':'')+(intro?'<p>'+esc(intro)+'</p>':'')+(lessonAudio?.querySelector('audio')?'<button type="button" id="skip-to-audio" class="soft">Сабақ аудиосына өту</button>':'')+'</div>'+(single&&!standalone?tabs(b,u):'')+navigation+'<div class="lessonlayout"><section class="panel reader"><div class="readerbar"><div class="pager">'+pageButton(-1,p===start)+'<span>'+p+' / '+end+' бет</span>'+pageButton(1,p===end)+'</div><div class="reader-actions"><button type="button" class="soft" id="bookmark" aria-pressed="'+hasBookmark+'">'+(hasBookmark?'✓ Бетбелгі':'Бетбелгі')+'</button><button type="button" class="soft" id="zoom" aria-pressed="'+zoomed+'">'+(zoomed?'Кішірейту':'Үлкейту')+'</button></div></div><div class="page-stage"><div class="pageimg'+(zoomed?' zoom':'')+'"><img src="'+pages(b,p)+'" alt="'+esc(title(b)+' · '+p+'-бет')+'"></div>'+pageButton(-1,p===start,true)+pageButton(1,p===end,true)+'</div></section><aside class="side">'+(single?'':'<section class="panel"><h3>Бетке өту</h3><form id="jump"><label for="page">Бет нөмірі</label><div class="row"><input type="number" min="1" max="'+end+'" required id="page" value="'+p+'"><button>Ашу</button></div></form>'+(lessonToResume?'<a class="back" href="'+lessonToResume+'">Сабаққа оралу</a>':'')+'</section>')+'<section class="panel"><a class="back" href="#course/'+b+'">Кітап мазмұны</a><a class="back" target="_blank" rel="noopener" href="'+book.original+'">'+(b>=12?'Қазақша PDF':'Түпнұсқа PDF')+'</a>'+answer+'</section></aside></div>'+navigation;
 if(lessonAudio)app.querySelector('.side').prepend(lessonAudio);
  app.querySelector('.page-stage').insertAdjacentHTML('beforeend','<small class="page-status" role="status"></small>');
 } else {
  const stage = app.querySelector('.page-stage');
  stage.removeAttribute('aria-busy');
  stage.querySelector('.page-status').textContent='';
  document.querySelector('.pager > span').textContent=p+' / '+end+' бет';
  for (const id of ['prev','side-prev','next','side-next']) {
   document.getElementById(id).disabled=id.endsWith('prev') ? p===start : p===end;
  }
  const bookmark=document.getElementById('bookmark');
  bookmark.textContent=hasBookmark?'✓ Бетбелгі':'Бетбелгі';
  bookmark.setAttribute('aria-pressed',String(hasBookmark));
  if (!single) document.getElementById('page').value=p;
  if (turnDirection && !zoomed && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
   stage.querySelector('.pageimg img').animate([
    {transform:'perspective(1000px) rotateY('+turnDirection*3+'deg)',transformOrigin:turnDirection>0?'left center':'right center',filter:'brightness(.96)'},
    {transform:'none',filter:'brightness(1)'}
   ],{duration:220,easing:'ease-out'});
  }
 }
 if (p<end && !navigator.connection?.saveData) {
  const next = new Image();
  next.src=pages(b,p+1);
 }
 const $=s=>document.querySelector(s);
 const audioShortcut=$('#skip-to-audio');
 if(audioShortcut && lessonAudio?.querySelector('audio')) audioShortcut.onclick=()=>{
  lessonAudio.scrollIntoView({block:'start'});
  lessonAudio.querySelector('select')?.focus({preventScroll:true});
 };
 for (const [direction, placement] of [[-1, 'prev'], [1, 'next']]) {
  const target = p + direction;
  const turnPage = () => {
   if (target >= start && target <= end) location.hash = url(target);
  };
  $('#' + placement).onclick = turnPage;
  $('#side-' + placement).onclick = turnPage;
 }
 $('#bookmark').onclick = event => {
  const marked = Object.hasOwn(state.bookmarks,markId);
  if (marked) delete state.bookmarks[markId];
  else state.bookmarks[markId] = position;
  const stored = save();
  if (!stored) {
   if (marked) state.bookmarks[markId] = position;
   else delete state.bookmarks[markId];
   event.currentTarget.textContent = 'Сақталмады';
   return;
  }
  event.currentTarget.setAttribute('aria-pressed', String(!marked));
  event.currentTarget.textContent = marked ? 'Бетбелгі' : '✓ Бетбелгі';
 };
 function zoom(){
  const on=$('.pageimg').classList.toggle('zoom');
  activeReader.zoomed=on;
  $('#zoom').textContent=on?'Кішірейту':'Үлкейту';
  $('#zoom').setAttribute('aria-pressed',String(on));
 }
 $('#zoom').onclick=zoom;$('.pageimg img').onclick=zoom;
 if(!single) $('#jump').onsubmit=e=>{e.preventDefault();location.hash=url(Number($('#page').value))};
}
let previousRoute='';
function route(){

 const [view,bb,uu,pp]=location.hash.slice(1).split('/'),b=Number(bb),u=Number(uu);
 const family=[view,bb,view==='lesson'?uu:''].join('/');
 const section=bookSections.find(group=>group.route===view);
 if (!(view==='lesson' && books[b]?.units[u]) && !(view==='read' && books[b])) activeReader=null;
 if(section)showBookSection(section);else if(view==='search')globalSearch();else if(view==='library')bookList();else if(view==='saved'||view==='progress')savedReading();else if(view==='course'&&books[b])course(b);else if(view==='lesson'&&books[b]?.units[u])reader(b,u,Number(pp));else if(view==='read'&&books[b])reader(b,null,Number(uu));else home();
 if(previousRoute!==family)window.scrollTo({top:0,behavior:'instant'});previousRoute=family;
 document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.hash===(view==='about'?'#about':view==='library'||view==='read'?'#library':view==='saved'||view==='progress'?'#saved':view==='search'?'#search':'#courses')));
 if (view==='about' || view==='courses') document.getElementById(view==='about'?'about-section':'course-list')?.scrollIntoView();
 const heading=app.querySelector('h1')?.textContent;
 document.title=heading&&heading!=='Izilingua' ? heading+' · Izilingua' : 'Izilingua · Ағылшын тілін қазақша үйрен';
}
window.addEventListener('keydown',event=>{
 if (!activeReader || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented ||
    event.target?.closest?.('input,textarea,select,audio,button,[contenteditable]')) return;
 const id = event.key==='ArrowLeft'?'#prev':event.key==='ArrowRight'?'#next':null;
 const button = id && document.querySelector(id);
 if (button && !button.disabled) { event.preventDefault(); button.click(); }
});
const footerAuthor = document.querySelector('#footer-author');
if (footerAuthor) footerAuthor.innerHTML = instagramLink('Сайт авторы · Instagram');
const sectionPicker = document.querySelector('#section-picker');
for (const i of courseOrder) sectionPicker.add(new Option(levels[i].name, '#course/' + (2*i)));
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
  history.replaceState({visit,position}, '');
 }
 updateControls();
 route();
}
history.replaceState({visit,position}, '');
backButton.onclick = () => { if (position) history.back(); else location.hash = ''; };
forwardButton.onclick = () => history.forward();
updateControls();
window.addEventListener('hashchange',recordRoute);
route();
