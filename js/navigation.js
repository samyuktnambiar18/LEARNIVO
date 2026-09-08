/* ==========================================================================
   LEARNIVO — Navigation Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  highlightActiveNavLinks();
});

function highlightActiveNavLinks() {
  const path = window.location.pathname;
  const page = path.split('/').pop() || 'index.html';

  const links = document.querySelectorAll('.nav-menu a, .sidebar-menu a');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href.endsWith(page) || (page === '' && href === 'index.html'))) {
      link.classList.add('active');
    }
  });
}
