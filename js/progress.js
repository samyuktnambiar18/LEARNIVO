/* ==========================================================================
   LEARNIVO — Progress Analytics Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  renderProgressPage();
});

function renderProgressPage() {
  const student = getStoredStudent();

  const accEl = document.getElementById('prog-acc-val');
  const streakEl = document.getElementById('prog-streak-val');
  const solvedEl = document.getElementById('prog-solved-val');
  const xpEl = document.getElementById('prog-xp-val');

  if (accEl) accEl.textContent = student.accuracy;
  if (streakEl) streakEl.textContent = `${student.streak} Days`;
  if (solvedEl) solvedEl.textContent = student.questionsSolved;
  if (xpEl) xpEl.textContent = `${student.xp} XP`;

  const skillsContainer = document.getElementById('prog-skills-container');
  if (skillsContainer) {
    skillsContainer.innerHTML = [
      { name: "Algebra & Factorization", pct: 85 },
      { name: "Geometry & Pythagorean Proofs", pct: 70 },
      { name: "Calculus Derivatives & Limits", pct: 60 },
      { name: "Probability & Combinatorics", pct: 45 }
    ].map(s => `
      <div class="skill-bar-item">
        <div class="skill-bar-meta">
          <span>${s.name}</span>
          <span>${s.pct}% Mastery</span>
        </div>
        <div class="skill-bar-track">
          <div class="skill-bar-fill" style="width: ${s.pct}%;"></div>
        </div>
      </div>
    `).join('');
  }
}
