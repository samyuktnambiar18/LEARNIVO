/* ==========================================================================
   LEARNIVO — Central Mock Data Store
   Realistic dataset for Mathematics Courses, Diagnostic Questions, Student/Teacher
   Profiles, Netflix Carousel categories, Mistakes, Mentors & Activity.
   ========================================================================== */

const LEARNIVO_MOCK_DATA = {
  // Student Profile
  student: {
    name: "Alex Morgan",
    email: "alex.morgan@learnivo.edu",
    grade: "Grade 10",
    level: "Intermediate",
    xp: 1240,
    streak: 12,
    accuracy: "78%",
    questionsSolved: 142,
    modulesCompleted: 18,
    uploadedPdf: "Grade10_Math_Syllabus.pdf"
  },

  // Teacher Profile
  teacher: {
    name: "Dr. Eleanor Vance",
    email: "eleanor.vance@learnivo.edu",
    department: "Mathematics & Pedagogy",
    activeMentorships: 8,
    pendingRequests: 3
  },

  // Course Categories
  categories: [
    { id: "all", name: "All Topics", icon: "📚" },
    { id: "algebra", name: "Algebra", icon: "∑" },
    { id: "geometry", name: "Geometry", icon: "△" },
    { id: "calculus", name: "Calculus", icon: "∫" },
    { id: "probability", name: "Probability", icon: "🎲" },
    { id: "trigonometry", name: "Trigonometry", icon: "∿" },
    { id: "statistics", name: "Statistics", icon: "📊" }
  ],

  // Featured Courses (Landing & Learn Page)
  courses: [
    {
      id: "alg-101",
      title: "Algebra Fundamentals & Quadratic Equations",
      category: "Algebra",
      difficulty: "Intermediate",
      lessonsCount: 12,
      progress: 65,
      icon: "∑",
      description: "Master quadratic factorization, sign rules, and algebraic roots."
    },
    {
      id: "geo-201",
      title: "Geometry Essentials & Pythagorean Proofs",
      category: "Geometry",
      difficulty: "Beginner",
      lessonsCount: 10,
      progress: 40,
      icon: "△",
      description: "Understand right triangles, angle bisectors, and spatial reasoning."
    },
    {
      id: "cal-301",
      title: "Calculus: Derivatives & Limits",
      category: "Calculus",
      difficulty: "Advanced",
      lessonsCount: 15,
      progress: 20,
      icon: "∫",
      description: "Introduction to differentiation, rates of change, and fundamental limits."
    },
    {
      id: "prb-401",
      title: "Probability Theorems & Combinatorics",
      category: "Probability",
      difficulty: "Intermediate",
      lessonsCount: 8,
      progress: 85,
      icon: "🎲",
      description: "Permutations, combinations, and conditional event probabilities."
    },
    {
      id: "trg-501",
      title: "Trigonometry: Angles & Identities",
      category: "Trigonometry",
      difficulty: "Intermediate",
      lessonsCount: 14,
      progress: 50,
      icon: "∿",
      description: "Unit circle angles, sine/cosine proofs, and identity simplifications."
    },
    {
      id: "sta-601",
      title: "Statistics: Mean, Median & Probability",
      category: "Statistics",
      difficulty: "Beginner",
      lessonsCount: 9,
      progress: 30,
      icon: "📊",
      description: "Central tendencies, standard deviation, and data distributions."
    },
    {
      id: "la-701",
      title: "Linear Algebra: Vectors & Matrices",
      category: "Algebra",
      difficulty: "Advanced",
      lessonsCount: 16,
      progress: 15,
      icon: "🔢",
      description: "Vector spaces, matrix transformations, and determinants."
    },
    {
      id: "nt-801",
      title: "Number Theory: Patterns & Prime Numbers",
      category: "Number Theory",
      difficulty: "Beginner",
      lessonsCount: 11,
      progress: 75,
      icon: "#",
      description: "Prime factorizations, modular arithmetic, and divisibility rules."
    },
    {
      id: "cg-901",
      title: "Coordinate Geometry: Lines & Circles",
      category: "Geometry",
      difficulty: "Intermediate",
      lessonsCount: 13,
      progress: 45,
      icon: "📐",
      description: "Equations of straight lines, circles, slopes, and distance formulas."
    },
    {
      id: "de-1001",
      title: "Differential Equations: Fundamentals",
      category: "Calculus",
      difficulty: "Advanced",
      lessonsCount: 18,
      progress: 10,
      icon: "∂",
      description: "First-order differential equations and growth models."
    }
  ],

  // Netflix-Style Dashboard Carousel Items (Section 17)
  carouselCategories: [
    {
      title: "Continue Learning",
      items: [
        { title: "Algebra: Linear Equations", level: "Intermediate", progress: 65, time: "25 mins left", category: "Algebra" },
        { title: "Geometry: Angle Bisectors", level: "Beginner", progress: 40, time: "15 mins left", category: "Geometry" },
        { title: "Calculus: Limits Intro", level: "Advanced", progress: 20, time: "45 mins left", category: "Calculus" }
      ]
    },
    {
      title: "Recommended Practice Tests",
      items: [
        { title: "Diagnostic Assessment 2026", level: "All Levels", progress: 0, time: "30 mins", category: "Diagnostic" },
        { title: "Quadratic Sign Consistency Test", level: "Intermediate", progress: 0, time: "15 mins", category: "Algebra" },
        { title: "Trigonometry Unit Circle Sprint", level: "Advanced", progress: 0, time: "20 mins", category: "Trigonometry" }
      ]
    },
    {
      title: "Quick 5-Minute Practice",
      items: [
        { title: "5 Quick Algebra Factors", level: "Beginner", progress: 0, time: "5 mins", category: "Algebra" },
        { title: "Pythagorean Quick Quiz", level: "Intermediate", progress: 0, time: "5 mins", category: "Geometry" },
        { title: "Probability Speed Run", level: "Advanced", progress: 0, time: "5 mins", category: "Probability" }
      ]
    }
  ],

  // Test Questions (10 Diagnostic Questions)
  testQuestions: [
    {
      id: 1,
      topic: "Algebra",
      difficulty: "Intermediate",
      text: "Solve for x in the quadratic polynomial equation:",
      formula: "2x² - 8x + 6 = 0",
      solution: "x = 1 or x = 3"
    },
    {
      id: 2,
      topic: "Geometry",
      difficulty: "Beginner",
      text: "Calculate the hypotenuse of a right triangle with legs 6 cm and 8 cm.",
      formula: "c = √(a² + b²)",
      solution: "10 cm"
    },
    {
      id: 3,
      topic: "Trigonometry",
      difficulty: "Intermediate",
      text: "Simplify the trigonometric expression:",
      formula: "(sin²θ + cos²θ) / tanθ",
      solution: "cotθ (or 1/tanθ)"
    },
    {
      id: 4,
      topic: "Calculus",
      difficulty: "Advanced",
      text: "Find the derivative of f(x) with respect to x:",
      formula: "f(x) = 3x⁴ - 5x² + 9x - 12",
      solution: "12x³ - 10x + 9"
    },
    {
      id: 5,
      topic: "Probability",
      difficulty: "Intermediate",
      text: "Two fair dice are rolled. What is the probability of obtaining a sum of 8?",
      formula: "P(Sum=8) = Favorable / 36",
      solution: "5/36"
    },
    {
      id: 6,
      topic: "Algebra",
      difficulty: "Advanced",
      text: "Solve the system of equations for y:",
      formula: "3x + 2y = 16  and  x - y = 2",
      solution: "y = 2"
    },
    {
      id: 7,
      topic: "Number Theory",
      difficulty: "Beginner",
      text: "Find the Greatest Common Divisor (GCD) of 48 and 180.",
      formula: "GCD(48, 180)",
      solution: "12"
    },
    {
      id: 8,
      topic: "Geometry",
      difficulty: "Intermediate",
      text: "Calculate the area of a circle with a circumference of 16π cm.",
      formula: "C = 2πr , Area = πr²",
      solution: "64π cm²"
    },
    {
      id: 9,
      topic: "Calculus",
      difficulty: "Advanced",
      text: "Evaluate the definite integral:",
      formula: "∫₀² (4x³ + 3) dx",
      solution: "22"
    },
    {
      id: 10,
      topic: "Trigonometry",
      difficulty: "Advanced",
      text: "Solve for θ in the range 0° ≤ θ < 360°:",
      formula: "2 cos θ + 1 = 0",
      solution: "120° and 240°"
    }
  ],

  // Mistake History Archive
  mistakes: [
    {
      id: "MST-01",
      topic: "Algebra",
      type: "Sign Error",
      question: "Quadratic Factorization Sign Ambiguity",
      whatYouDid: "Changed + to - during expansion: (x - 3)(x + 2) => x² - 5x - 6",
      correctApproach: "Keep signs consistent: (x - 3)(x + 2) => x² - x - 6",
      date: "2026-09-06"
    },
    {
      id: "MST-02",
      topic: "Geometry",
      type: "Formula Error",
      question: "Pythagorean Hypotenuse Calculation",
      whatYouDid: "Forgot to take square root of c² = 100",
      correctApproach: "Evaluate principal root: c = √100 = 10 cm",
      date: "2026-09-04"
    }
  ],

  // Mentors List
  mentors: [
    { id: "m1", name: "Dr. Marcus Vance", subject: "Higher Algebra & Calculus", rating: "4.9 ★", availability: "Today, 4:30 PM" },
    { id: "m2", name: "Prof. Sophia Sterling", subject: "Geometry & Trigonometry", rating: "4.9 ★", availability: "Tomorrow, 2:00 PM" }
  ],

  // Teacher Student Requests
  teacherRequests: [
    {
      id: "req-1",
      studentName: "Alex Morgan",
      grade: "Grade 10",
      topic: "Quadratic Factorization Sign Consistency",
      mistakeSummary: "Failed 2 attempts due to sign flips in step 2. Prefers visual step breakdown.",
      status: "Pending Meeting"
    }
  ]
};
