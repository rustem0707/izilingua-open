# Izilingua (`izilingua-open`) — Негізгі жоба ережелері

- **Стек және тіл:** Build-қадамсыз статикалық SPA (`vercel.json`: `framework: null`, `outputDirectory: "."`), `<html lang="kk">`. Барлық UI/a11y мәтіндері қазақша. Қосымша бет: `terms.html`.
- **`index.html` жүктелу реті (өзгертуге болмайды):** `books.js` → `grammar.js` → `vocabulary.js` → `audio-data.js` → `book-audio.js` → `lesson-audio.js` → `site-config.js` → `practice.js` → `app.js`. Стильдер: `style.css`, `practice.css`.
- **18 кітап және ID-лер (өзгертуге/жоюға болмайды, `pages/0..17/` және `keys/2..9/` сақталады):**
  - `Levels 1–4` (`books.js`): Beginner L1 (`6, 7`), Beginner L2 (`8, 9`), Intermediate (`2, 3`), Advanced (`4, 5`).
  - `Business English` (`books.js`): L1 (`0, 1`), L2 (`10, 11`).
  - `Grammar Guide` (`grammar.js`): Guide (`12`), Practice (`13`) — аудиосыз.
  - `bookSections` (`vocabulary.js`): `#vocabulary` (`14, 15`), `#phrases` (`16, 17`).
  - Көрсетілу реті: `courseOrder = [6, 3, 4, 1, 2, 0, 5]`, содан кейін `bookSections`.
- **Маршруттар (`app.js`, бұзуға болмайды):** `#`/`#courses`, `#about`, `#library`, `#vocabulary`, `#phrases`, `#course/:b`, `#lesson/:b/:u(/:p)`, `#read/:b/:p`, `#saved`/`#progress`, `#search`, `terms.html`. Навигация: `#sub-bar`, `#site-back`, `#site-forward`, `#section-picker`, `ArrowLeft`/`ArrowRight`, `zoom`.
- **Аудио және практика:**
  - `dkAudio` (`https://apps-api.dk.com/efe` + `encodeURI(path)`). `audioNumber`: `b < 12` → `u + 1`; `b >= 14` → `topicIndex + 1 - (b === 16 ? 3 : 2)`; `12–13` → жоқ.
  - `izPractice.mount(app, b, p, b !== 12 ? book.answer : null)`: `izBooks[0..17]`, `legacy` (`6`: `13.4–13.6`), 3 кілт режимі (`reference`+`r.rect`, `clips`, `keys/{b}/{id}.webp`), `MediaRecorder` дауыс жазу, `.lessonlayout.iz-practice-open` кезінде `.lesson-audio` сақталуы тиіс.
- **`localStorage` және конфиг (кері үйлесімді):** `folio-study-v1` (`done`, `notes`, `bookmarks`, `last`, `lastLesson`), `iz-work:{book}/{exercise}/{index}`, `iz-work:{book}/{page}/note`, `izilingua-practice:*` (fallback); `siteConfig` (`instagram`, `feedbackWebApp`), `feedback-setup/`.
- **Ортақ DOM-селекторлар (атауын өзгертуге болмайды):** `#app`, `#sub-bar`, `#section-picker`, `#nav-saved-count`, `.lessonlayout`, `.side`, `.lesson-audio`, `.audio-exercise`, `.audio-track`, `.page-stage`, `.pageimg`, `.iz-practice`.
- **UI:** Барлық өзгерістер `≤520px`, `≤900px`, `≥901px` экрандарында және практика панелі ашық/жабық күйде жұмыс істеуі тиіс.
