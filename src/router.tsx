// Configuration du routeur de l'application
import { Routes, Route } from 'react-router';
import { AuthProvider } from '@/contexts/AuthContext';

// Layouts
import { PublicLayout } from '@/layouts/PublicLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { OnboardingLayout } from '@/layouts/OnboardingLayout';
import { ImmersiveLayout } from '@/layouts/ImmersiveLayout';

// Pages publiques
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';

// Pages onboarding
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage';
import { OnboardingRevealPage } from '@/pages/onboarding/OnboardingRevealPage';

// Pages protégées avec bottom nav
import { HomePage } from '@/pages/home/HomePage';
import { CalendarPage } from '@/pages/calendar/CalendarPage';
import { HistoryPage } from '@/pages/history/HistoryPage';
import { HistoryDetailPage } from '@/pages/history/HistoryDetailPage';
import { ExerciseHistoryPage } from '@/pages/history/ExerciseHistoryPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { ProgramsPage } from '@/pages/programs/ProgramsPage';
import { ProgramImportPage } from '@/pages/programs/ProgramImportPage';
import { ProgramDetailPage } from '@/pages/programs/ProgramDetailPage';
import { ProgramEditPage } from '@/pages/programs/ProgramEditPage';

// Pages admin
import { AnalyticsPage } from '@/pages/admin/AnalyticsPage';

// Pages immersives — auth requise, sans bottom nav
import { ProgramNewPage } from '@/pages/programs/ProgramNewPage';
import { ExercisesPage } from '@/pages/exercises/ExercisesPage';
import { SessionPreviewPage } from '@/pages/session/SessionPreviewPage';
import { SessionActivePage } from '@/pages/session/SessionActivePage';
import { SessionRecapPage } from '@/pages/session/SessionRecapPage';

export function AppRouter() {
  return (
    <AuthProvider>
      <Routes>
        {/* Routes publiques */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Routes onboarding */}
        <Route element={<OnboardingLayout />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/onboarding/reveal" element={<OnboardingRevealPage />} />
        </Route>

        {/* Routes protégées avec bottom nav */}
        <Route element={<AppLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:id" element={<HistoryDetailPage />} />
          <Route path="/history/exercise" element={<ExerciseHistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/programs/import" element={<ProgramImportPage />} />
          <Route path="/programs/:id" element={<ProgramDetailPage />} />
          <Route path="/programs/:id/edit" element={<ProgramEditPage />} />
        </Route>

        {/* Route admin — accès réservé aux utilisatrices avec is_admin = true */}
        <Route path="/admin/analytics" element={<AnalyticsPage />} />

        {/* Routes immersives — auth + onboarding requis, sans bottom nav */}
        <Route element={<ImmersiveLayout />}>
          <Route path="/programs/new" element={<ProgramNewPage />} />
          <Route path="/exercises" element={<ExercisesPage />} />
          <Route path="/session/:id/preview" element={<SessionPreviewPage />} />
          <Route path="/session/:id/active" element={<SessionActivePage />} />
          <Route path="/session/:id/recap" element={<SessionRecapPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
