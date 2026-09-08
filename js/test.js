/* ==========================================================================
   LEARNIVO — Test & Diagnostic Assessment Engine
   Features: 10 Questions, 3-min Timer per Question, Auto-advance on expiry 
   (marking NOT ANSWERED), Handwritten solution upload simulation, 5-min final 
   submission window simulation, and result evaluation.
   ========================================================================== */

let currentQIndex = 0;
let perQuestionTimer = null;
let secondsLeft = 180; // 3 minutes
const recordedAnswers = [];

document.addEventListener('DOMContentLoaded', () => {
  initTestEngine();
  renderResultPage();
});

function initTestEngine() {
  const container = document.getElementById('test-questions-wrapper');
  if (!container) return;

  renderTestQuestion(currentQIndex);

  const nextBtn = document.getElementById('test-next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => recordAndAdvance());
  }

  // Handwritten Upload Simulation
  const hwDropzone = document.getElementById('hw-test-dropzone');
  const hwFileInput = document.getElementById('hw-test-file');
  const hwFilename = document.getElementById('hw-test-filename');

  if (hwDropzone && hwFileInput) {
    hwDropzone.addEventListener('click', () => hwFileInput.click());
    hwFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        if (hwFilename) {
          hwFilename.textContent = `Attached Solution File: ${file.name}`;
          hwFilename.style.display = 'block';
        }
        showToast('Handwritten solution attached for OCR scanning.', 'success');
      }
    });
  }
}

function renderTestQuestion(index) {
  const questions = LEARNIVO_MOCK_DATA.testQuestions;
  if (index >= questions.length) {
    finishTest();
    return;
  }

  const q = questions[index];

  const counterEl = document.getElementById('test-q-counter');
  const textEl = document.getElementById('test-q-text');
  const formulaEl = document.getElementById('test-q-formula');
  const topicEl = document.getElementById('test-q-topic');
  const diffEl = document.getElementById('test-q-diff');
  const inputEl = document.getElementById('test-q-input');

  if (counterEl) counterEl.textContent = `Question ${index + 1} of ${questions.length}`;
  if (textEl) textEl.textContent = q.text;
  if (formulaEl) formulaEl.textContent = q.formula;
  if (topicEl) topicEl.textContent = q.topic;
  if (diffEl) diffEl.textContent = q.difficulty;
  if (inputEl) inputEl.value = '';

  const hwFilename = document.getElementById('hw-test-filename');
  if (hwFilename) hwFilename.style.display = 'none';

  resetPerQuestionTimer();
}

function resetPerQuestionTimer() {
  clearInterval(perQuestionTimer);
  secondsLeft = 180; // 3 minutes
  updateClockDisplay();

  perQuestionTimer = setInterval(() => {
    secondsLeft--;
    updateClockDisplay();

    if (secondsLeft <= 0) {
      clearInterval(perQuestionTimer);
      showToast(`Time expired for Question ${currentQIndex + 1}. Auto-advancing...`, 'warning');
      recordAndAdvance(true); // Expired -> NOT ANSWERED
    }
  }, 1000);
}

function updateClockDisplay() {
  const clock = document.getElementById('test-clock-display');
  const fill = document.getElementById('test-timer-fill-line');

  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const secs = (secondsLeft % 60).toString().padStart(2, '0');

  if (clock) clock.textContent = `${mins}:${secs}`;
  if (fill) {
    const percentage = (secondsLeft / 180) * 100;
    fill.style.width = `${percentage}%`;
  }
}

function recordAndAdvance(expired = false) {
  const questions = LEARNIVO_MOCK_DATA.testQuestions;
  const currentQ = questions[currentQIndex];
  const inputEl = document.getElementById('test-q-input');
  const answerVal = inputEl ? inputEl.value.trim() : '';

  const status = expired && !answerVal ? 'NOT ANSWERED' : answerVal ? 'SUBMITTED' : 'NOT ANSWERED';

  recordedAnswers.push({
    questionId: currentQ.id,
    topic: currentQ.topic,
    answer: answerVal || 'NOT ANSWERED',
    status
  });

  currentQIndex++;
  if (currentQIndex < questions.length) {
    renderTestQuestion(currentQIndex);
  } else {
    finishTest();
  }
}

function finishTest() {
  clearInterval(perQuestionTimer);
  showToast('Test Assessment Completed! Evaluating your answers...', 'success');

  let correctCount = 0;
  let notAnsweredCount = 0;

  recordedAnswers.forEach(ans => {
    if (ans.status === 'NOT ANSWERED') {
      notAnsweredCount++;
    } else {
      correctCount++;
    }
  });

  const total = recordedAnswers.length;
  const scorePercent = Math.round((correctCount / total) * 100);

  const resultObj = {
    scorePercent,
    correctCount,
    incorrectCount: total - correctCount - notAnsweredCount,
    notAnsweredCount,
    accuracy: `${scorePercent}%`
  };

  localStorage.setItem('learnivo_last_test', JSON.stringify(resultObj));
  updateStoredStudent({ accuracy: `${scorePercent}%` });

  setTimeout(() => {
    window.location.href = 'test.html?view=result';
  }, 1000);
}

function renderResultPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const view = urlParams.get('view');
  const resultCard = document.getElementById('test-result-card');
  const testBox = document.getElementById('test-questions-wrapper');

  if (view === 'result' && resultCard) {
    if (testBox) testBox.style.display = 'none';
    resultCard.style.display = 'block';

    const stored = localStorage.getItem('learnivo_last_test');
    const res = stored ? JSON.parse(stored) : { scorePercent: 78, correctCount: 7, incorrectCount: 1, notAnsweredCount: 2, accuracy: '78%' };

    const scoreEl = document.getElementById('res-score-val');
    const correctEl = document.getElementById('res-correct-val');
    const incorrectEl = document.getElementById('res-incorrect-val');
    const unansweredEl = document.getElementById('res-unanswered-val');

    if (scoreEl) scoreEl.textContent = `${res.scorePercent}%`;
    if (correctEl) correctEl.textContent = res.correctCount;
    if (incorrectEl) incorrectEl.textContent = res.incorrectCount;
    if (unansweredEl) unansweredEl.textContent = res.notAnsweredCount;
  }
}
