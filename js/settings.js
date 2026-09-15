/* ==========================================================================
   LEARNIVO — Settings & Profile Management Controller
   ========================================================================== */

let selectedSettingsAvatar = '';

document.addEventListener('DOMContentLoaded', () => {
  initSettingsThemeControls();
  initSettingsProfile();
});

function saveSupabaseSettings(e) {
  e.preventDefault();
  const url = document.getElementById('supabase-url-input').value.trim();
  const key = document.getElementById('supabase-key-input').value.trim();

  if (!url || !key) {
    showToast('Please enter both Supabase URL and Publishable Key', 'error');
    return;
  }

  if (window.learnivoSupabase) {
    window.learnivoSupabase.setCredentials(url, key);
    showToast('Supabase database credentials connected!', 'success');
  }
}

function initSettingsProfile() {
  const student = getStoredStudent();
  const nameInput = document.getElementById('settings-name');
  const gradeSelect = document.getElementById('settings-grade');

  if (nameInput) nameInput.value = student.name || 'Alex Morgan';
  if (gradeSelect) gradeSelect.value = student.grade || 'Grade 11';
  selectedSettingsAvatar = student.avatar || '../assets/images/avatar-1.png';

  // Populate Supabase inputs if saved
  const urlInput = document.getElementById('supabase-url-input');
  const keyInput = document.getElementById('supabase-key-input');
  if (urlInput && window.LEARNIVO_SUPABASE_CONFIG && window.LEARNIVO_SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_PROJECT_URL') {
    urlInput.value = window.LEARNIVO_SUPABASE_CONFIG.url;
  }
  if (keyInput && window.LEARNIVO_SUPABASE_CONFIG && window.LEARNIVO_SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_PUBLISHABLE_KEY') {
    keyInput.value = window.LEARNIVO_SUPABASE_CONFIG.anonKey;
  }

  renderSettingsAvatarGrid();
}

function renderSettingsAvatarGrid() {
  const container = document.getElementById('settings-avatar-grid');
  if (!container) return;

  container.innerHTML = DEFAULT_AVATARS.map(av => {
    const isSel = selectedSettingsAvatar.includes(`avatar-${av.id}.png`);
    return `
      <div class="avatar-option ${isSel ? 'selected' : ''}" onclick="selectSettingsAvatar('${av.src}', this)">
        <img src="${av.src}" alt="${av.alt}">
      </div>
    `;
  }).join('');
}

function selectSettingsAvatar(src, elem) {
  selectedSettingsAvatar = src;
  document.querySelectorAll('#settings-avatar-grid .avatar-option').forEach(el => el.classList.remove('selected'));
  elem.classList.add('selected');
}

function saveSettingsProfile(e) {
  e.preventDefault();
  const name = document.getElementById('settings-name').value.trim();
  const grade = document.getElementById('settings-grade').value;

  if (!name) {
    showToast('Name is required', 'error');
    return;
  }

  const student = getStoredStudent();
  student.name = name;
  student.grade = grade;
  student.avatar = selectedSettingsAvatar;

  saveStoredStudent(student);
  showToast('My Learning Profile updated successfully!', 'success');
}

function initSettingsThemeControls() {
  const currentTheme = localStorage.getItem('learnivo_theme') || 'light';
  const lightCard = document.getElementById('theme-card-light');
  const darkCard = document.getElementById('theme-card-dark');

  if (lightCard && darkCard) {
    if (currentTheme === 'dark') {
      darkCard.classList.add('selected');
      lightCard.classList.remove('selected');
    } else {
      lightCard.classList.add('selected');
      darkCard.classList.remove('selected');
    }

    lightCard.addEventListener('click', () => {
      lightCard.classList.add('selected');
      darkCard.classList.remove('selected');
      if (window.setTheme) window.setTheme('light');
    });

    darkCard.addEventListener('click', () => {
      darkCard.classList.add('selected');
      lightCard.classList.remove('selected');
      if (window.setTheme) window.setTheme('dark');
    });
  }
}
