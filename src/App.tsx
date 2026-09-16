import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/Landing';
import { Login } from './pages/Auth/Login';
import { Signup } from './pages/Auth/Signup';
import { Onboarding } from './pages/Auth/Onboarding';
import { UploadPage } from './pages/Upload';
import { DashboardPage } from './pages/Dashboard';
import { PracticePage } from './pages/Practice';
import { ProgressPage } from './pages/Progress';
import { ChatPage } from './pages/Chat';
import { AssessmentPage } from './pages/Assessment';
import { MaterialsPage } from './pages/Materials';
import { SettingsPage } from './pages/Settings';

import { authService } from './services/auth/authService';

export const App: React.FC = () => {
  React.useEffect(() => {
    authService.initAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Authentication & Onboarding */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Upload Page */}
        <Route path="/upload" element={<UploadPage />} />

        {/* Dashboard Routes & HTML Aliases */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pages/student-dashboard.html" element={<DashboardPage />} />

        {/* Practice Routes & HTML Aliases */}
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/pages/practice.html" element={<PracticePage />} />

        {/* Progress Routes & HTML Aliases */}
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/pages/progress.html" element={<ProgressPage />} />

        {/* Chat Routes & HTML Aliases */}
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/pages/chat.html" element={<ChatPage />} />

        {/* Assessment Routes & HTML Aliases */}
        <Route path="/test" element={<AssessmentPage />} />
        <Route path="/assessment" element={<AssessmentPage />} />
        <Route path="/pages/test.html" element={<AssessmentPage />} />

        {/* Materials */}
        <Route path="/materials" element={<MaterialsPage />} />

        {/* Settings Routes & HTML Aliases */}
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/pages/settings.html" element={<SettingsPage />} />

        {/* Fallback Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
