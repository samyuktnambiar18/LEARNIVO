/* ==========================================================================
   LEARNIVO — Student Dashboard & Personalized Course Carousel Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof checkOnboardingGuard === 'function') {
    checkOnboardingGuard();
  }
  renderStudentDashboard();
  initNetflixCarousel();
});

function renderStudentDashboard() {
  const student = getStoredStudent();

  // Sync header profile details
  if (typeof updateHeaderProfile === 'function') {
    updateHeaderProfile(student);
  }

  const greetingName = document.getElementById('dash-greeting-name');
  if (greetingName) {
    const firstName = (student.name || 'Student').split(' ')[0];
    greetingName.textContent = `Welcome Back, ${firstName}! 👋`;
  }

  const levelGradeTag = document.getElementById('dash-level-grade-tag');
  if (levelGradeTag) {
    levelGradeTag.innerHTML = `Grade: <strong>${escapeHtml(student.grade || 'Grade 11')}</strong> • Personal Syllabus Mode`;
  }

  // Render stats
  const courses = student.courses || [];
  const stats = typeof getCourseStats === 'function' ? getCourseStats(courses) : { totalCourses: courses.length, totalUnits: 12, totalTopics: 48 };

  const xpVal = document.getElementById('dash-xp-val');
  const streakVal = document.getElementById('dash-streak-val');
  const solvedVal = document.getElementById('dash-solved-val');
  const accVal = document.getElementById('dash-acc-val');

  if (xpVal) xpVal.textContent = `${student.xp || 1240} XP`;
  if (streakVal) streakVal.textContent = `${student.streak || 12} Days`;
  if (solvedVal) solvedVal.textContent = `${stats.totalTopics} Topics`;
  if (accVal) accVal.textContent = `${stats.totalCourses} Courses`;

  // Continue Learning Banner with First Course
  const continueTitle = document.getElementById('continue-course-title');
  if (continueTitle && courses.length > 0) {
    const firstCourse = courses[0];
    const firstUnit = (firstCourse.units && firstCourse.units.length > 0) ? firstCourse.units[0].name : 'Unit 1';
    continueTitle.textContent = `${firstCourse.name} — ${firstUnit}`;
  }
}

/* Dynamic Course Carousel (Section 17) */
function initNetflixCarousel() {
  const carouselContainer = document.getElementById('netflix-carousel-container');
  if (!carouselContainer) return;

  const student = getStoredStudent();
  const courses = student.courses || window.DEFAULT_COURSES;

  carouselContainer.innerHTML = `
    <div class="carousel-section">
      <div class="carousel-header">
        <h3>🎯 Your Enrolled Courses (${courses.length})</h3>
        <div class="carousel-controls">
          <button class="carousel-arrow" onclick="scrollCarousel('track-courses', -300)">‹</button>
          <button class="carousel-arrow" onclick="scrollCarousel('track-courses', 300)">›</button>
        </div>
      </div>

      <div class="netflix-carousel-track" id="track-courses">
        ${courses.map((course, idx) => {
          const units = course.units || [];
          let topicCount = 0;
          units.forEach(u => { topicCount += (u.topics || []).length; });

          const progressPct = Math.min(100, Math.max(15, 35 - idx * 10));

          return `
            <div class="netflix-card" onclick="window.location.href='practice.html?subject=${encodeURIComponent(course.name)}'">
              <span class="netflix-card-badge">${course.code || 'COURSE'}</span>
              <h4>${escapeHtml(course.name)}</h4>
              <p><strong>${units.length} Units</strong> • ${topicCount} Topics</p>
              
              <div style="width: 100%; height: 6px; background: var(--border-light); border-radius: var(--radius-full); margin-top: auto;">
                <div style="width: ${progressPct}%; height: 100%; background: var(--primary-purple); border-radius: var(--radius-full);"></div>
              </div>
              
              <div class="netflix-card-footer">
                <span style="font-size: 0.8rem; color: var(--secondary-text);">${progressPct}% Progress</span>
                <span style="color: var(--primary-purple); font-weight: 700; font-size: 0.85rem;">Practice →</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function scrollCarousel(trackId, amount) {
  const track = document.getElementById(trackId);
  if (track) {
    track.scrollBy({ left: amount, behavior: 'smooth' });
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
