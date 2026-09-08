/* ==========================================================================
   LEARNIVO — Learn Library & Featured Courses Netflix Auto-Carousel Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  renderLearnPage();
  initFeaturedCoursesCarousel();
});

function renderLearnPage() {
  const categoryContainer = document.getElementById('learn-category-tabs');
  const gridContainer = document.getElementById('learn-courses-grid');

  if (categoryContainer) {
    categoryContainer.innerHTML = LEARNIVO_MOCK_DATA.categories.map(c => `
      <div class="category-tab ${c.id === 'all' ? 'active' : ''}" onclick="filterCategory('${c.name}')">${c.icon} ${c.name}</div>
    `).join('');
  }

  if (gridContainer) {
    renderCoursesGrid(LEARNIVO_MOCK_DATA.courses, gridContainer);
  }
}

function renderCoursesGrid(courses, container) {
  container.innerHTML = courses.map(c => `
    <div class="course-card">
      <div class="course-thumbnail">${c.icon}</div>
      <div class="course-body">
        <span class="course-badge">${c.category} • ${c.difficulty}</span>
        <h3 class="course-title">${c.title}</h3>
        <p style="font-size: 0.85rem; margin-bottom: 1.25rem;">${c.description}</p>
        <div class="course-meta">
          <span>📖 ${c.lessonsCount} Lessons</span>
          <a href="pages/test.html" class="btn btn-primary btn-sm">Start Course</a>
        </div>
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   Netflix-Style Smooth Infinite Auto-Carousel for Featured Courses
   ========================================================================== */
function initFeaturedCoursesCarousel() {
  const track = document.getElementById('featured-courses-track');
  const wrapper = document.getElementById('featured-carousel-wrapper');
  const prevBtn = document.getElementById('featured-prev-btn');
  const nextBtn = document.getElementById('featured-next-btn');

  if (!track || !wrapper) return;

  const originalCourses = LEARNIVO_MOCK_DATA.courses; // 10 items
  const totalOriginal = originalCourses.length;

  // Build card HTML string
  function createCardHTML(c) {
    const isPagesSubdir = window.location.pathname.includes('/pages/');
    const testPath = isPagesSubdir ? 'test.html' : 'pages/test.html';

    return `
      <div class="course-card">
        <div class="course-thumbnail">${c.icon}</div>
        <div class="course-body">
          <span class="course-badge">${c.category} • ${c.difficulty}</span>
          <h3 class="course-title">${c.title}</h3>
          <p style="font-size: 0.85rem; margin-bottom: 1.25rem;">${c.description}</p>
          <div class="course-meta">
            <span>📖 ${c.lessonsCount} Lessons</span>
            <a href="${testPath}" class="btn btn-primary btn-sm">Start Course</a>
          </div>
        </div>
      </div>
    `;
  }

  // Clone 4 cards at the start and 4 cards at the end for seamless infinite loop
  const cloneCount = 4;
  const headClones = originalCourses.slice(0, cloneCount);
  const tailClones = originalCourses.slice(totalOriginal - cloneCount);

  const fullList = [...tailClones, ...originalCourses, ...headClones];

  track.innerHTML = fullList.map(c => createCardHTML(c)).join('');

  let currentIndex = cloneCount; // Start at first original item
  let isTransitioning = false;
  let autoTimer = null;
  let resumeTimer = null;

  // Drag & Swipe State Variables
  let isDragging = false;
  let startX = 0;
  let currentTranslate = 0;
  let prevTranslate = 0;

  function getCardWidth() {
    const firstCard = track.querySelector('.course-card');
    if (!firstCard) return 300;
    const cardWidth = firstCard.getBoundingClientRect().width;
    const gap = parseFloat(window.getComputedStyle(track).gap) || 28;
    return cardWidth + gap;
  }

  function updateTrackPosition(animated = true) {
    const cardWidth = getCardWidth();
    currentTranslate = -currentIndex * cardWidth;
    prevTranslate = currentTranslate;

    if (animated) {
      track.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
    } else {
      track.style.transition = 'none';
    }
    track.style.transform = `translateX(${currentTranslate}px)`;
  }

  // Set initial position without animation
  updateTrackPosition(false);

  // Handle transition end for seamless infinite loop
  track.addEventListener('transitionend', () => {
    isTransitioning = false;
    if (currentIndex >= totalOriginal + cloneCount) {
      // Reached tail clones -> jump seamlessly to first real card
      currentIndex = cloneCount;
      updateTrackPosition(false);
    } else if (currentIndex < cloneCount) {
      // Reached head clones -> jump seamlessly to last real card
      currentIndex = totalOriginal + cloneCount - 1;
      updateTrackPosition(false);
    }
  });

  function moveNext() {
    if (isTransitioning) return;
    isTransitioning = true;
    currentIndex++;
    updateTrackPosition(true);
  }

  function movePrev() {
    if (isTransitioning) return;
    isTransitioning = true;
    currentIndex--;
    updateTrackPosition(true);
  }

  // Auto Slider Timer (4.5s idle movement)
  function startAutoSlide() {
    stopAutoSlide();
    autoTimer = setInterval(() => {
      moveNext();
    }, 4500);
  }

  function stopAutoSlide() {
    if (autoTimer) clearInterval(autoTimer);
    if (resumeTimer) clearTimeout(resumeTimer);
  }

  function pauseAndResumeLater() {
    stopAutoSlide();
    resumeTimer = setTimeout(() => {
      startAutoSlide();
    }, 5000);
  }

  // Button Controls
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      moveNext();
      pauseAndResumeLater();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      movePrev();
      pauseAndResumeLater();
    });
  }

  // Mouse & Touch Dragging Handlers
  function dragStart(e) {
    stopAutoSlide();
    isDragging = true;
    track.classList.add('dragging');
    startX = getPositionX(e);
    prevTranslate = -currentIndex * getCardWidth();
  }

  function dragMove(e) {
    if (!isDragging) return;
    const currentX = getPositionX(e);
    const diff = currentX - startX;
    currentTranslate = prevTranslate + diff;
    track.style.transform = `translateX(${currentTranslate}px)`;
  }

  function dragEnd() {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('dragging');

    const cardWidth = getCardWidth();
    const movedBy = currentTranslate - prevTranslate;

    if (movedBy < -50) {
      currentIndex++;
    } else if (movedBy > 50) {
      currentIndex--;
    }

    updateTrackPosition(true);
    pauseAndResumeLater();
  }

  function getPositionX(e) {
    return e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
  }

  // Event Listeners for Drag/Swipe
  wrapper.addEventListener('mouseenter', stopAutoSlide);
  wrapper.addEventListener('mouseleave', () => {
    if (!isDragging) startAutoSlide();
  });

  track.addEventListener('mousedown', dragStart);
  track.addEventListener('mousemove', dragMove);
  window.addEventListener('mouseup', dragEnd);

  track.addEventListener('touchstart', dragStart, { passive: true });
  track.addEventListener('touchmove', dragMove, { passive: true });
  window.addEventListener('touchend', dragEnd);

  // Handle window resize
  window.addEventListener('resize', () => {
    updateTrackPosition(false);
  });

  // Start initial auto slide
  startAutoSlide();
}
