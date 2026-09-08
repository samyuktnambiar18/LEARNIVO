# LEARNIVO — Modern Education Platform & Student Dashboard

LEARNIVO is a complete, connected, responsive FRONTEND-ONLY web application built for mathematics practice, diagnostic assessment, and student progress tracking. Its visual design is directly inspired by the **Eduwave LMS Design System UI Kit**.

---

## 🌟 Key Design & Feature Highlights

### 1. Brand & Palette (Eduwave Design System)
- **Brand**: `LEARNIVO` (clean text logo placeholder, componentized for easy image replacement).
- **Dominant Colors**: Dominant White background (`#FFFFFF`), Soft Lavender surfaces (`#FAF9FF`, `#F5F1FF`), and refined Purple accents (`#6D3FEA`, `#4C24B8`).
- **Typography System**:
  - Headings: `Playfair Display` (Serif)
  - Body & UI: `Poppins` / `Inter` (Sans-serif)
  - Statistics & Numbers: `Manrope` / `DM Sans`

### 2. Compact 10-Page Architecture
1. `index.html` — Landing page with Hero, Feature Strip, Featured Courses grid, Category row, and Footer.
2. `pages/student-login.html` — Student Login (Split-screen illustration layout).
3. `pages/teacher-login.html` — Teacher Login (Educator portal login).
4. `pages/student-dashboard.html` — Student Dashboard featuring a **Netflix-style horizontal sliding course/test carousel**, Continue Learning progress card, metric widgets, and activity timeline.
5. `pages/learn.html` — Course library with horizontal category filter tabs.
6. `pages/practice.html` — Practice question bank with search bar and filter controls.
7. `pages/test.html` — Diagnostic & Handwritten Test interface (10 questions, 3-min per-question timer bar, auto-advance on expiry marking "Not Answered", handwritten photo/PDF upload simulation, and result evaluation card).
8. `pages/progress.html` — Progress analytics, skill breakdown bars, and weekly activity heatmap.
9. `pages/teacher-dashboard.html` — Educator portal displaying student mentorship requests and a slide-out **Student Diagnostic Drawer** with pre-session AI briefs.
10. `pages/settings.html` — Settings page with profile options and a **Light/Dark Mode Theme Selector** persisted in `localStorage`.

---

## 🚀 How to Run Locally

Run a simple local web server from the project directory:

```bash
# Python HTTP Server
python -m http.server 3000
```

Open `http://localhost:3000` in your browser.
