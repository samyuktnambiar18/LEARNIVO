/* ==========================================================================
   LEARNIVO — Student Dashboard & Netflix-Style Carousel Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  renderStudentDashboard();
  initNetflixCarousel();
});

function renderStudentDashboard() {
  const student = getStoredStudent();

  const greetingName = document.getElementById('dash-greeting-name');
  if (greetingName) greetingName.textContent = `Good morning, ${student.name.split(' ')[0]} 👋`;

  const xpVal = document.getElementById('dash-xp-val');
  const streakVal = document.getElementById('dash-streak-val');
  const solvedVal = document.getElementById('dash-solved-val');
  const accVal = document.getElementById('dash-acc-val');

  if (xpVal) xpVal.textContent = `${student.xp} XP`;
  if (streakVal) streakVal.textContent = `${student.streak} Days`;
  if (solvedVal) solvedVal.textContent = student.questionsSolved;
  if (accVal) accVal.textContent = student.accuracy;
}

/* Netflix-Style Horizontal Sliding Carousel (Section 17) */
function initNetflixCarousel() {
  const carouselContainer = document.getElementById('netflix-carousel-container');
  if (!carouselContainer) return;

  const categories = LEARNIVO_MOCK_DATA.carouselCategories;

  carouselContainer.innerHTML = categories.map((cat, catIdx) => `
    <div class="carousel-section">
      <div class="carousel-header">
        <h3>${cat.title}</h3>
        <div class="carousel-controls">
          <button class="carousel-arrow" onclick="scrollCarousel('track-${catIdx}', -300)">‹</button>
          <button class="carousel-arrow" onclick="scrollCarousel('track-${catIdx}', 300)">›</button>
        </div>
      </div>

      <div class="netflix-carousel-track" id="track-${catIdx}">
        ${cat.items.map(item => `
          <div class="netflix-card" onclick="window.location.href='test.html'">
            <span class="netflix-card-badge">${item.category}</span>
            <h4>${item.title}</h4>
            <p>Level: <strong>${item.level}</strong> • ${item.time}</p>
            ${item.progress > 0 ? `
              <div style="width: 100%; height: 6px; background: var(--border-light); border-radius: var(--radius-full); margin-top: auto;">
                <div style="width: ${item.progress}%; height: 100%; background: var(--primary-purple); border-radius: var(--radius-full);"></div>
              </div>
            ` : ''}
            <div class="netflix-card-footer">
              <span style="font-size: 0.8rem; color: var(--secondary-text);">${item.progress > 0 ? `${item.progress}% Completed` : 'Not Started'}</span>
              <span style="color: var(--primary-purple); font-weight: 700; font-size: 0.85rem;">Start →</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function scrollCarousel(trackId, amount) {
  const track = document.getElementById(trackId);
  if (track) {
    track.scrollBy({ left: amount, behavior: 'smooth' });
  }
}
