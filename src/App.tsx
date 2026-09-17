import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/Landing';
import { Login } from './pages/Auth/Login';
import { Signup } from './pages/Auth/Signup';
// import { Onboarding } from './pages/Auth/Onboarding';
import { UploadPage } from './pages/Upload';
import { DashboardPage } from './pages/Dashboard';
import { PracticePage } from './pages/Practice';
import { ProgressPage } from './pages/Progress';
import { ChatPage } from './pages/Chat';
import { AssessmentPage } from './pages/Assessment';
import { MaterialsPage } from './pages/Materials';
import { SettingsPage } from './pages/Settings';
import { LearningArenaPage } from './pages/LearningArena';

import { authService } from './services/auth/authService';

export const App: React.FC = () => {
  React.useEffect(() => {
    authService.initAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page (Official Current 2nd Design) */}
        <Route path="/" element={<LandingPage />} />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<Navigate to="/dashboard" replace />} />

        {/* Upload Page */}
        <Route path="/upload" element={<UploadPage />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Courses / Materials */}
        <Route path="/courses" element={<MaterialsPage />} />
        <Route path="/materials" element={<MaterialsPage />} />

        {/* Practice */}
        <Route path="/practice" element={<PracticePage />} />

        {/* Learning Arena */}
        <Route path="/learning-arena" element={<LearningArenaPage />} />
        <Route path="/arena" element={<LearningArenaPage />} />

        {/* AI Tutor / Chat */}
        <Route path="/ai-tutor" element={<ChatPage />} />
        <Route path="/chat" element={<ChatPage />} />

        {/* Progress */}
        <Route path="/progress" element={<ProgressPage />} />

        {/* Assessment */}
        <Route path="/assessment" element={<AssessmentPage />} />
        <Route path="/test" element={<AssessmentPage />} />

        {/* Settings */}
        <Route path="/settings" element={<SettingsPage />} />

        {/* Legacy HTML Route Redirects (Always map to clean SPA routes) */}
        <Route path="/pages/student-dashboard.html" element={<Navigate to="/dashboard" replace />} />
        <Route path="/pages/practice.html" element={<Navigate to="/practice" replace />} />
        <Route path="/pages/progress.html" element={<Navigate to="/progress" replace />} />
        <Route path="/pages/chat.html" element={<Navigate to="/ai-tutor" replace />} />
        <Route path="/pages/test.html" element={<Navigate to="/assessment" replace />} />
        <Route path="/pages/settings.html" element={<Navigate to="/settings" replace />} />

        {/* Fallback Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
