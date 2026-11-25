'use strict';

function createLessonAudio(bookId, lessonNumber) {
  const section = document.createElement('section');
  section.className = 'panel lesson-audio';
  section.dataset.lesson = bookId + '-' + lessonNumber;
  section.setAttribute('aria-label', 'Сабақ аудиосы');
  section.innerHTML = '<h3>Сабақ аудиосы</h3>';
  const exercises = dkAudio[bookId]?.[lessonNumber];
  if (!exercises || !Object.keys(exercises).length) {
    const message = document.createElement('p');
    message.textContent = 'Бұл сабаққа аудиожазба берілмеген.';
    section.append(message);
    return section;
  }

  section.insertAdjacentHTML('beforeend', `
    <label>Жаттығу нөмірі<select class="audio-exercise"></select></label>
    <label>Жазба<select class="audio-track"></select></label>
    <audio controls preload="none" aria-label="Сабақ аудиосын ойнату"></audio>
    <label class="audio-speed">Жылдамдық<select>
      <option value="0.75">0.75×</option>
      <option value="1" selected>1×</option>
      <option value="1.25">1.25×</option>
    </select></label>
    <p class="key audio-status" role="status"></p>
    <small class="key">DK · English for Everyone</small>
  `);

  const exercise = section.querySelector('.audio-exercise');
  const track = section.querySelector('.audio-track');
  const audio = section.querySelector('audio');
  const speed = section.querySelector('.audio-speed select');
  const status = section.querySelector('.audio-status');

  function chooseTrack(play = false) {
    const [path] = exercises[exercise.value][Number(track.value)];
    status.textContent = '';
    audio.src = 'https://apps-api.dk.com/efe' + encodeURI(path);
    audio.playbackRate = Number(speed.value);
    if (play) {
      audio.play().catch(() => {
        status.textContent = 'Келесі жазбаны тыңдау үшін ойнату батырмасын басыңыз.';
      });
    }
  }

  function chooseExercise() {
    track.replaceChildren(...exercises[exercise.value].map(([, number], index) =>
      new Option(number ? 'Жазба ' + (index + 1) + ' · ' + number : 'Жазба ' + (index + 1), index)
    ));
    chooseTrack();
  }

  for (const number of Object.keys(exercises).sort((a, b) => a.localeCompare(b, 'en', {numeric:true}))) {
    exercise.add(new Option(lessonNumber + '.' + number, number));
  }
  exercise.addEventListener('change', chooseExercise);
  track.addEventListener('change', () => chooseTrack());
  speed.addEventListener('change', () => { audio.playbackRate = Number(speed.value); });
  audio.addEventListener('error', () => {
    status.textContent = 'Аудио жүктелмеді. Байланысты тексеріп, жазбаны қайта таңдаңыз.';
  });
  audio.addEventListener('ended', () => {
    if (track.selectedIndex + 1 < track.options.length) {
      track.selectedIndex += 1;
      chooseTrack(true);
    }
  });
  chooseExercise();
  return section;
}
