'use strict';

function createLessonAudio(bookId, lessonNumber) {
  const section = document.createElement('section');
  section.className = 'panel lesson-audio';
  section.dataset.lesson = bookId + '-' + lessonNumber;
  section.setAttribute('aria-label', 'Lesson audio');
  section.innerHTML = '<h3>Lesson Audio</h3>';
  const exercises = typeof dkAudio !== 'undefined' ? dkAudio[bookId]?.[lessonNumber] : null;
  if (!exercises || !Object.keys(exercises).length) {
    const message = document.createElement('p');
    message.textContent = 'No audio tracks available for this lesson.';
    section.append(message);
    return section;
  }

  section.insertAdjacentHTML('beforeend', `
    <label>Exercise<select class="audio-exercise"></select></label>
    <label>Track<select class="audio-track"></select></label>
    <audio controls preload="none" aria-label="Play lesson audio"></audio>
    <div class="audio-tools">
      <button type="button" class="soft audio-rewind" aria-label="Rewind 5 seconds">↺ -5s</button>
      <button type="button" class="soft audio-repeat" aria-pressed="false" aria-label="Repeat track">🔁 Repeat</button>
    </div>
    <label class="audio-speed">Speed<select>
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
  const rewind = section.querySelector('.audio-rewind');
  const repeat = section.querySelector('.audio-repeat');
  const speed = section.querySelector('.audio-speed select');
  const status = section.querySelector('.audio-status');
  let repeatOn = false;

  function chooseTrack(play = false) {
    const [path] = exercises[exercise.value][Number(track.value)];
    status.textContent = '';
    audio.src = 'https://apps-api.dk.com/efe' + encodeURI(path);
    audio.playbackRate = Number(speed.value);
    if (play) {
      audio.play().catch(() => {
        status.textContent = 'Press Play to listen to the next track.';
      });
    }
  }

  function chooseExercise() {
    track.replaceChildren(...exercises[exercise.value].map(([, number], index) =>
      new Option(number ? 'Track ' + (index + 1) + ' · ' + number : 'Track ' + (index + 1), index)
    ));
    chooseTrack();
  }

  for (const number of Object.keys(exercises).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))) {
    exercise.add(new Option(lessonNumber + '.' + number, number));
  }
  exercise.addEventListener('change', chooseExercise);
  track.addEventListener('change', () => chooseTrack());
  speed.addEventListener('change', () => { audio.playbackRate = Number(speed.value); });
  rewind.addEventListener('click', () => {
    audio.currentTime = Math.max(0, (audio.currentTime || 0) - 5);
  });
  repeat.addEventListener('click', () => {
    repeatOn = !repeatOn;
    repeat.setAttribute('aria-pressed', String(repeatOn));
    repeat.classList.toggle('is-active', repeatOn);
  });
  audio.addEventListener('error', () => {
    status.textContent = 'Audio failed to load. Please check your connection and try again.';
  });
  audio.addEventListener('ended', () => {
    if (repeatOn) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }
    if (track.selectedIndex + 1 < track.options.length) {
      track.selectedIndex += 1;
      chooseTrack(true);
    }
  });
  chooseExercise();
  return section;
}
