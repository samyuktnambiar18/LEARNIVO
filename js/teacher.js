/* ==========================================================================
   LEARNIVO — Teacher Dashboard & Student Detail Drawer Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  renderTeacherRequests();
  initStudentDrawer();
});

function renderTeacherRequests() {
  const container = document.getElementById('teacher-requests-list');
  if (!container) return;

  const requests = LEARNIVO_MOCK_DATA.teacherRequests;

  container.innerHTML = requests.map(r => `
    <div class="request-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h3 style="font-size: 1.25rem;">${r.studentName}</h3>
        <span class="course-badge">${r.grade}</span>
      </div>
      <p style="margin-bottom: 0.5rem;"><strong>Focus Topic:</strong> ${r.topic}</p>
      <div style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-sm); margin: 1rem 0; font-size: 0.9rem;">
        <strong>AI Diagnostic Summary:</strong> ${r.mistakeSummary}
      </div>
      <div style="display: flex; gap: 1rem;">
        <button class="btn btn-primary btn-sm" onclick="openStudentDrawer('${r.studentName}', '${r.topic}')">Inspect Student Diagnostics</button>
        <button class="btn btn-secondary btn-sm" onclick="showToast('Meeting link generated for ${r.studentName}', 'success')">Schedule Session</button>
      </div>
    </div>
  `).join('');
}

function initStudentDrawer() {
  const drawerOverlay = document.getElementById('student-drawer-overlay');
  const closeBtn = document.getElementById('drawer-close-btn');

  if (closeBtn && drawerOverlay) {
    closeBtn.addEventListener('click', () => drawerOverlay.classList.remove('active'));
  }
}

function openStudentDrawer(studentName, topic) {
  const drawerOverlay = document.getElementById('student-drawer-overlay');
  const nameEl = document.getElementById('drawer-student-name');
  const topicEl = document.getElementById('drawer-student-topic');

  if (nameEl) nameEl.textContent = studentName;
  if (topicEl) topicEl.textContent = topic;

  if (drawerOverlay) drawerOverlay.classList.add('active');
}
