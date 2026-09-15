/* ==========================================================================
   LEARNIVO — Fullscreen Intro Presentation & Feature Carousel Controller
   STABLE UNINTERRUPTED 2000ms AUTOPLAY TIMER (Does NOT depend on mouse hover)
   ========================================================================== */

let introCurrentSlide = 0;
let introAutoplayTimer = null;
const INTRO_SLIDE_DURATION = 2000; // 2 seconds per slide

document.addEventListener('DOMContentLoaded', () => {
  initIntroCarousel();
  initCursorHeadRotation();
});

/* ==========================================================================
   3D CURSOR HEAD-TRACKING & ROTATION ANIMATION ENGINE
   Dynamically rotates the 3D student avatar head and visual showcase card
   wherever the user moves their cursor across the viewport.
   ========================================================================== */

let targetRotateX = 0;
let targetRotateY = 0;
let currentRotateX = 0;
let currentRotateY = 0;

function initCursorHeadRotation() {
  const container = document.querySelector('.intro-experience-wrapper') || document.body;

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Relative offset normalized between -1 and +1
    const normX = (e.clientX - centerX) / (rect.width / 2);
    const normY = (e.clientY - centerY) / (rect.height / 2);

    // Max rotation angles (degrees)
    const maxDegree = 16;
    targetRotateY = normX * maxDegree;        // Rotate left/right toward cursor
    targetRotateX = -normY * maxDegree;       // Tilt up/down toward cursor
  });

  container.addEventListener('mouseleave', () => {
    targetRotateX = 0;
    targetRotateY = 0;
  });

  // RAF Lerp loop for buttery 60fps smooth rotation tracking
  function renderFrame() {
    // Lerp factor (0.1 for fluid easing)
    currentRotateX += (targetRotateX - currentRotateX) * 0.1;
    currentRotateY += (targetRotateY - currentRotateY) * 0.1;

    // Apply rotation transform to active visual composition
    const activeComposition = document.querySelector('.intro-slide.active .intro-visual-composition');
    if (activeComposition) {
      activeComposition.style.transform = `perspective(1000px) rotateX(${currentRotateX.toFixed(2)}deg) rotateY(${currentRotateY.toFixed(2)}deg) translateZ(8px)`;
    }

    // Apply focused head-rotation to 3D avatar image elements
    const avatar3D = document.querySelectorAll('.interactive-avatar-3d');
    avatar3D.forEach(avatar => {
      avatar.style.transform = `perspective(800px) rotateX(${(currentRotateX * 1.3).toFixed(2)}deg) rotateY(${(currentRotateY * 1.3).toFixed(2)}deg) scale(1.03)`;
    });

    // Parallax depth shift for floating accessory cards
    const floatingCards = document.querySelectorAll('.intro-slide.active .floating-ui-card');
    floatingCards.forEach((card, idx) => {
      const mult = (idx + 1) * 6;
      const shiftX = currentRotateY * (mult / 8);
      const shiftY = -currentRotateX * (mult / 8);
      card.style.transform = `translate3d(${shiftX.toFixed(2)}px, ${shiftY.toFixed(2)}px, ${mult * 2}px)`;
    });

    requestAnimationFrame(renderFrame);
  }

  renderFrame();
}

function initIntroCarousel() {
  const slides = document.querySelectorAll('.intro-slide');
  if (slides.length === 0) return;

  showIntroSlide(0);

  // Start continuous 2-second interval timer
  startIntroAutoplay();

  // Mobile Touch Swipe support (does NOT stop continuous timer)
  const viewport = document.querySelector('.intro-carousel-viewport');
  if (viewport) {
    let touchStartX = 0;
    let touchEndX = 0;

    viewport.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 50) {
        nextIntroSlide(); // Swipe left
      } else if (touchEndX - touchStartX > 50) {
        prevIntroSlide(); // Swipe right
      }
    }, { passive: true });
  }

  // Keybindings for accessibility
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') nextIntroSlide();
    if (e.key === 'ArrowLeft') prevIntroSlide();
  });
}

function showIntroSlide(index) {
  const slides = document.querySelectorAll('.intro-slide');
  const dots = document.querySelectorAll('.intro-dot');
  if (slides.length === 0) return;

  // Continuous looping 0 -> 1 -> 2 -> 3 -> 4 -> 0
  if (index >= slides.length) index = 0;
  if (index < 0) index = slides.length - 1;

  introCurrentSlide = index;

  slides.forEach((slide, idx) => {
    if (idx === introCurrentSlide) {
      slide.classList.add('active');
    } else {
      slide.classList.remove('active');
    }
  });

  dots.forEach((dot, idx) => {
    if (idx === introCurrentSlide) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  // Reset indicator progress animation
  resetIndicatorProgress();
}

function nextIntroSlide() {
  showIntroSlide(introCurrentSlide + 1);
  restartAutoplayTimer();
}

function prevIntroSlide() {
  showIntroSlide(introCurrentSlide - 1);
  restartAutoplayTimer();
}

function jumpToSlide(index) {
  showIntroSlide(index);
  restartAutoplayTimer();
}

function startIntroAutoplay() {
  stopIntroAutoplay();
  introAutoplayTimer = setInterval(() => {
    showIntroSlide(introCurrentSlide + 1);
  }, INTRO_SLIDE_DURATION);
}

function restartAutoplayTimer() {
  stopIntroAutoplay();
  startIntroAutoplay();
}

function stopIntroAutoplay() {
  if (introAutoplayTimer) {
    clearInterval(introAutoplayTimer);
    introAutoplayTimer = null;
  }
}

function resetIndicatorProgress() {
  const activeDot = document.querySelector('.intro-dot.active');
  if (activeDot) {
    const fill = activeDot.querySelector('.dot-progress-fill');
    if (fill) {
      fill.style.animation = 'none';
      void fill.offsetWidth; // trigger reflow
      fill.style.animation = `fillProgress ${INTRO_SLIDE_DURATION}ms linear forwards`;
    }
  }
}

/**
 * Handle "Explore LEARNIVO →" button click
 * Immediately stops carousel and redirects to appropriate onboarding or dashboard page
 */
function handleExploreLearnivoClick() {
  stopIntroAutoplay();
  showToast('Starting your profile setup...', 'info');
  setTimeout(() => {
    window.location.href = 'pages/student-login.html';
  }, 300);
}

// Expose globally
window.showIntroSlide = showIntroSlide;
window.nextIntroSlide = nextIntroSlide;
window.prevIntroSlide = prevIntroSlide;
window.jumpToSlide = jumpToSlide;
window.handleExploreLearnivoClick = handleExploreLearnivoClick;
