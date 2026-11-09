import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthModal from './components/auth/AuthModal';

const LandingPage = React.lazy(() => import('./pages/landing/LandingPage'));
const DashboardPage = React.lazy(() => import('./pages/dashboard/DashboardPage'));
const UnifiedDashboard = React.lazy(() => import('./pages/dashboard/UnifiedDashboard'));
const CodolioDashboard = React.lazy(() => import('./pages/codolio/CodolioDashboard'));
const PracticePage = React.lazy(() => import('./pages/practice/PracticePage'));
const ContestsPage = React.lazy(() => import('./pages/contests/ContestsPage'));
const LeaderboardPage = React.lazy(() => import('./pages/leaderboard/LeaderboardPage'));

function App() {
  return (
    <BrowserRouter>
      <React.Suspense fallback={<div className="flex h-screen items-center justify-center">Loading AlgoTrack AI...</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/profile" element={<UnifiedDashboard />} />
          <Route path="/u/:handle" element={<DashboardPage />} />
          <Route path="/codolio/:username" element={<CodolioDashboard />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/practice/:problemId" element={<PracticePage />} />
          <Route path="/contests" element={<ContestsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
        </Routes>
        <AuthModal />
      </React.Suspense>
    </BrowserRouter>
  );
}

export default App;
