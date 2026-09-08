/* ==========================================================================
   LEARNIVO — Practice Question Bank Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  renderPracticeBank();
});

function renderPracticeBank() {
  const container = document.getElementById('practice-questions-grid');
  if (!container) return;

  const questions = LEARNIVO_MOCK_DATA.testQuestions;

  container.innerHTML = questions.map(q => `
    <div class="question-card-box">
      <div>
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.85rem;">
          <span class="course-badge">${q.topic}</span>
          <span class="course-badge" style="background: var(--bg-tertiary); color: var(--dark-text);">${q.difficulty}</span>
        </div>
        <h4 style="font-size: 1.05rem; margin-bottom: 0.75rem; font-family: var(--font-body);">${q.text}</h4>
        <div class="math-formula-box" style="font-size: 1.1rem; padding: 0.75rem;">${q.formula}</div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.25rem; padding-top: 0.85rem; border-top: 1px solid var(--border-light);">
        <span style="font-size: 0.8rem; color: var(--secondary-text);">Est. Time: 3 mins</span>
        <a href="test.html?id=${q.id}" class="btn btn-primary btn-sm">Solve Now →</a>
      </div>
    </div>
  `).join('');
}
