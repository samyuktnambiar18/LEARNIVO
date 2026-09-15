/* ==========================================================================
   LEARNIVO — Application Initializer & Theme Manager
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  console.log("LEARNIVO Platform Loaded — Clean LMS Design System");
  
  // Initialize Theme from LocalStorage (Section 33: Default is Light)
  initTheme();

  // Initialize Session State
  initSessionState();

  // Initialize SNS Workbench Backend Connectivity Badge
  if (window.initBackendStatusBadge) {
    window.initBackendStatusBadge('sns-home-backend-badge');
    window.initBackendStatusBadge('sns-backend-badge');
  }
});

/* Theme Manager (Light default, Dark mode toggled from Settings) */
function initTheme() {
  const savedTheme = localStorage.getItem('learnivo_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function setTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('learnivo_theme', themeName);
  showToast(`Theme switched to ${themeName.toUpperCase()} mode.`, 'info');
}

/* Session Storage Helper */
function initSessionState() {
  if (typeof window.getStoredStudent === 'function') {
    const student = window.getStoredStudent();
    if (student && typeof student.completedOnboarding === 'undefined') {
      student.completedOnboarding = false;
      if (typeof window.saveStoredStudent === 'function') {
        window.saveStoredStudent(student);
      }
    }
  }
}

function getStoredStudent() {
  if (typeof window.getStoredStudent === 'function' && window.getStoredStudent !== getStoredStudent) {
    return window.getStoredStudent();
  }
  const stored = localStorage.getItem('learnivo_student_profile') || localStorage.getItem('learnivo_student');
  return stored ? JSON.parse(stored) : LEARNIVO_MOCK_DATA.student;
}

function updateStoredStudent(data) {
  const current = getStoredStudent();
  const updated = { ...current, ...data };
  if (typeof window.saveStoredStudent === 'function') {
    window.saveStoredStudent(updated);
  } else {
    localStorage.setItem('learnivo_student_profile', JSON.stringify(updated));
    localStorage.setItem('learnivo_student', JSON.stringify(updated));
  }
  return updated;
}

/* Toast Notifications */
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <div>${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
