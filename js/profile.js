/* ==========================================================================
   LEARNIVO — Centralized Student Profile & State Manager
   Handles profile persistence, avatar selection, course structure, and app-wide header sync.
   ========================================================================== */

const PROFILE_STORAGE_KEY = 'learnivo_student_profile';

const DEFAULT_AVATARS = [
  { id: 1, src: '../assets/images/avatar-1.png', alt: 'Male Hoodie Avatar' },
  { id: 2, src: '../assets/images/avatar-2.png', alt: 'Female Ponytail Avatar' },
  { id: 3, src: '../assets/images/avatar-3.png', alt: 'Male Glasses Avatar' },
  { id: 4, src: '../assets/images/avatar-4.png', alt: 'Female Braids Avatar' },
  { id: 5, src: '../assets/images/avatar-5.png', alt: 'Male Cap Avatar' },
  { id: 6, src: '../assets/images/avatar-6.png', alt: 'Female Cardigan Avatar' }
];

const DEFAULT_COURSES = [
  {
    name: 'Mathematics',
    code: 'MAT101',
    units: [
      { name: 'Matrices & Determinants', topics: ['Types of Matrices', 'Matrix Operations', 'Determinants', 'Inverse Matrix'] },
      { name: 'Differential Calculus', topics: ['Limits Intro', 'Derivatives Rules', 'Chain Rule', 'Implicit Differentiation'] },
      { name: 'Integral Calculus', topics: ['Indefinite Integrals', 'Definite Integrals', 'Integration by Parts'] },
      { name: 'Vector Algebra', topics: ['Vector Operations', 'Dot Product', 'Cross Product'] },
      { name: 'Linear Systems', topics: ['2x2 Linear Systems', 'Gaussian Elimination', 'Cramer Rule'] }
    ]
  },
  {
    name: 'Physics',
    code: 'PHY101',
    units: [
      { name: 'Mechanics', topics: ['Kinematics', 'Newton Laws of Motion', 'Work & Energy', 'Momentum'] },
      { name: 'Thermodynamics', topics: ['Thermal Expansion', 'Heat Capacity', 'First Law of Thermodynamics'] },
      { name: 'Waves & Oscillations', topics: ['Simple Harmonic Motion', 'Sound Waves', 'Wave Interference'] },
      { name: 'Electromagnetism', topics: ['Electric Field', 'Gauss Law', 'Magnetic Force'] }
    ]
  },
  {
    name: 'Chemistry',
    code: 'CHM101',
    units: [
      { name: 'Atomic Structure', topics: ['Bohr Model', 'Quantum Numbers', 'Electron Configuration'] },
      { name: 'Chemical Bonding', topics: ['Ionic Bonds', 'Covalent Bonds', 'VSEPR Theory'] },
      { name: 'Thermodynamics & Kinetics', topics: ['Enthalpy', 'Rate Laws', 'Chemical Equilibrium'] }
    ]
  }
];

/**
 * Get current stored student profile from localStorage (checking both keys for robustness)
 */
function getStoredStudent() {
  try {
    let raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem('learnivo_student');
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        // Fix relative image paths if running from pages/ or root
        if (parsed.avatar && !parsed.avatar.startsWith('http') && !parsed.avatar.startsWith('data:')) {
          const isPages = window.location.pathname.includes('/pages/');
          if (isPages && parsed.avatar.startsWith('assets/')) {
            parsed.avatar = '../' + parsed.avatar;
          } else if (!isPages && parsed.avatar.startsWith('../assets/')) {
            parsed.avatar = parsed.avatar.replace('../assets/', 'assets/');
          }
        }
        if (typeof parsed.completedOnboarding === 'undefined') {
          parsed.completedOnboarding = false;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading stored profile, using defaults:', e);
  }

  // Initial default profile
  const isPages = window.location.pathname.includes('/pages/');
  const defaultAvatarPath = isPages ? '../assets/images/avatar-1.png' : 'assets/images/avatar-1.png';

  return {
    id: 'S001',
    name: 'Alex Morgan',
    grade: 'Grade 11',
    avatar: defaultAvatarPath,
    completedOnboarding: false,
    courses: DEFAULT_COURSES,
    xp: 1240,
    streak: 12,
    accuracy: '78%',
    questionsSolved: 142,
    modulesCompleted: 18
  };
}

/**
 * Save updated student profile object to localStorage & Supabase
 */
function saveStoredStudent(profile) {
  if (!profile || typeof profile !== 'object') return;
  try {
    const jsonStr = JSON.stringify(profile);
    localStorage.setItem(PROFILE_STORAGE_KEY, jsonStr);
    localStorage.setItem('learnivo_student', jsonStr); // Synchronize both keys
    updateHeaderProfile(profile);

    // Sync to Supabase if configured
    if (window.learnivoSupabase && typeof window.learnivoSupabase.syncStudentProfile === 'function') {
      window.learnivoSupabase.syncStudentProfile(profile);
    }
  } catch (e) {
    console.error('Failed to save student profile:', e);
  }
}

/**
 * Sync profile details across top-right header and student avatars across pages
 */
function updateHeaderProfile(profileObj = null) {
  const student = profileObj || getStoredStudent();

  // Find header avatar containers
  const headerAvatarImgs = document.querySelectorAll('.user-avatar-img, .header-profile-avatar, .student-avatar-pic');
  headerAvatarImgs.forEach(img => {
    if (img.tagName === 'IMG') {
      img.src = student.avatar || '../assets/images/avatar-1.png';
      img.alt = student.name;
    } else {
      img.style.backgroundImage = `url('${student.avatar}')`;
    }
  });

  // Find header student name & grade labels
  const nameElems = document.querySelectorAll('.student-name-label, .user-profile-name, .profile-info h4');
  nameElems.forEach(el => {
    el.textContent = student.name;
  });

  const gradeElems = document.querySelectorAll('.student-grade-label, .user-profile-role, .profile-info span');
  gradeElems.forEach(el => {
    el.textContent = student.grade || 'Student';
  });

  // Welcome back banners
  const welcomeHeaders = document.querySelectorAll('.welcome-banner h1, .dashboard-welcome-title');
  welcomeHeaders.forEach(el => {
    el.innerHTML = `Welcome Back, ${escapeProfileHtml(student.name.split(' ')[0])}! 👋`;
  });
}

/**
 * Guard check: Handles logical routing for new vs returning users across onboarding steps
 */
function checkOnboardingGuard() {
  const currentPath = window.location.pathname;
  const isLoginPage = currentPath.includes('student-login.html');
  const isOnboardingPage = currentPath.includes('onboarding.html');

  // 1. If on student-login.html, ALWAYS allow user to stay on login page on load/refresh
  if (isLoginPage) {
    return;
  }

  const isLoginOrOnboarding = isLoginPage || isOnboardingPage;
  const student = getStoredStudent();

  // 2. User with INCOMPLETE onboarding visiting main application pages (dashboard, practice, chat, etc.)
  if ((!student || !student.completedOnboarding) && !isLoginOrOnboarding) {
    // If student completed profile (name & avatar set) but not course setup:
    if (student && student.name && student.avatar) {
      const onboardingUrl = currentPath.includes('/pages/') ? 'onboarding.html' : 'pages/onboarding.html';
      window.location.href = onboardingUrl;
    } else {
      const loginUrl = currentPath.includes('/pages/') ? 'student-login.html' : 'pages/student-login.html';
      window.location.href = loginUrl;
    }
    return;
  }
}

/**
 * Helper to calculate total units and topics across courses
 */
function getCourseStats(coursesArray) {
  const courses = coursesArray || [];
  let totalUnits = 0;
  let totalTopics = 0;

  courses.forEach(c => {
    const units = c.units || [];
    totalUnits += units.length;
    units.forEach(u => {
      totalTopics += (u.topics || []).length;
    });
  });

  return {
    totalCourses: courses.length,
    totalUnits,
    totalTopics
  };
}

function escapeProfileHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Auto-run header sync when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  updateHeaderProfile();
});

// Expose globally
window.getStoredStudent = getStoredStudent;
window.saveStoredStudent = saveStoredStudent;
window.updateHeaderProfile = updateHeaderProfile;
window.checkOnboardingGuard = checkOnboardingGuard;
window.getCourseStats = getCourseStats;
window.DEFAULT_AVATARS = DEFAULT_AVATARS;
window.DEFAULT_COURSES = DEFAULT_COURSES;

