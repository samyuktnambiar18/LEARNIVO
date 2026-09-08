/* ==========================================================================
   LEARNIVO — Settings & LocalStorage Theme Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initSettingsThemeControls();
});

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
      setTheme('light');
    });

    darkCard.addEventListener('click', () => {
      darkCard.classList.add('selected');
      lightCard.classList.remove('selected');
      setTheme('dark');
    });
  }
}
