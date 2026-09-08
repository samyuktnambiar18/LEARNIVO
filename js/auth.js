/* ==========================================================================
   LEARNIVO — Auth Controller (Student & Teacher Login)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initStudentLogin();
  initTeacherLogin();
});

function initStudentLogin() {
  const form = document.getElementById('student-login-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('student-email').value.trim();

    updateStoredStudent({ email, loggedIn: true });
    showToast('Student Login Successful! Redirecting to Dashboard...', 'success');

    setTimeout(() => {
      window.location.href = 'student-dashboard.html';
    }, 1000);
  });
}

function initTeacherLogin() {
  const form = document.getElementById('teacher-login-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Teacher Portal Access Granted! Opening Mentor Dashboard...', 'success');

    setTimeout(() => {
      window.location.href = 'teacher-dashboard.html';
    }, 1000);
  });
}
