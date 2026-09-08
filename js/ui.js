/* ==========================================================================
   LEARNIVO — UI Helpers (Tabs, Modals, Dropdowns)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initModals();
});

function initModals() {
  const modalOverlays = document.querySelectorAll('.modal-overlay');
  modalOverlays.forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });
}
