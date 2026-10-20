import React, { useState } from 'react';
import { CollegeProvider, useCollege } from './context/CollegeContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { Navbar } from './components/common/Navbar.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { StudentDashboard } from './pages/StudentDashboard.tsx';
import { AuthorityDashboard } from './pages/AuthorityDashboard.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { AnnouncementsPage } from './pages/AnnouncementsPage.tsx';
import { KnownIssuesPage } from './pages/KnownIssuesPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { ComplaintFormModal } from './components/complaints/ComplaintFormModal.tsx';
import { ComplaintDetailModal } from './components/complaints/ComplaintDetailModal.tsx';
import { PublicTrackerModal } from './components/complaints/PublicTrackerModal.tsx';
import { Shield, GraduationCap, CheckCircle } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, isStudent, isAdmin } = useAuth();
  const { platformName, collegeName, tagline, logoUrl } = useCollege();
  const [currentTab, setCurrentTab] = useState<string>('home');

  // Modals
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: 'login' | 'register' }>({
    isOpen: false,
    mode: 'login',
  });
  const [newComplaintOpen, setNewComplaintOpen] = useState<boolean>(false);
  const [trackerOpen, setTrackerOpen] = useState<boolean>(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  // Success notice after submission
  const [submittedBanner, setSubmittedBanner] = useState<{ id: string; ref: string } | null>(null);

  // If user is logged in and on 'home', switch them to dashboard automatically
  React.useEffect(() => {
    if (user && currentTab === 'home') {
      setCurrentTab('dashboard');
    }
  }, [user]);

  const handleSelectTab = (tab: string) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleComplaintSuccess = (complaintId: string, referenceNo: string) => {
    setNewComplaintOpen(false);
    setSubmittedBanner({ id: complaintId, ref: referenceNo });
    setSelectedComplaintId(complaintId);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenNewComplaint={() => {
          if (!user) {
            setAuthModal({ isOpen: true, mode: 'login' });
          } else {
            setNewComplaintOpen(true);
          }
        }}
        onOpenTrackModal={() => setTrackerOpen(true)}
        onOpenAuthModal={(mode) => setAuthModal({ isOpen: true, mode })}
      />

      {/* Persistent Notification Banner if just submitted */}
      {submittedBanner && (
        <div className="bg-emerald-600 text-white px-4 py-3 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-md">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <CheckCircle size={18} className="shrink-0" />
            <span>
              Complaint registered successfully! Official reference number:{' '}
              <strong className="underline underline-offset-2 font-mono">{submittedBanner.ref}</strong>.
            </span>
          </div>
          <button
            onClick={() => setSubmittedBanner(null)}
            className="text-emerald-100 hover:text-white px-2 py-0.5"
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {currentTab === 'home' || currentTab === 'how-it-works' ? (
          <LandingPage
            onOpenAuth={(mode) => setAuthModal({ isOpen: true, mode })}
            onOpenNewComplaint={() => {
              if (!user) {
                setAuthModal({ isOpen: true, mode: 'login' });
              } else {
                setNewComplaintOpen(true);
              }
            }}
            onOpenTrackModal={() => setTrackerOpen(true)}
            onSelectTab={handleSelectTab}
          />
        ) : currentTab === 'dashboard' ? (
          !user ? (
            <div className="py-16 text-center">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Authentication Required</h2>
              <p className="text-sm text-slate-500 mb-4">Please log in to access your personal complaint dashboard.</p>
              <button
                onClick={() => setAuthModal({ isOpen: true, mode: 'login' })}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs"
              >
                Sign In Now
              </button>
            </div>
          ) : isStudent ? (
            <StudentDashboard
              onOpenNewComplaint={() => setNewComplaintOpen(true)}
              onOpenTrackModal={() => setTrackerOpen(true)}
              onSelectComplaint={(id) => setSelectedComplaintId(id)}
            />
          ) : (
            <AuthorityDashboard
              onSelectComplaint={(id) => setSelectedComplaintId(id)}
            />
          )
        ) : currentTab === 'analytics' ? (
          <AnalyticsPage />
        ) : currentTab === 'announcements' ? (
          <AnnouncementsPage />
        ) : currentTab === 'known-issues' ? (
          <KnownIssuesPage />
        ) : currentTab === 'admin' && isAdmin ? (
          <AdminPage />
        ) : (
          <LandingPage
            onOpenAuth={(mode) => setAuthModal({ isOpen: true, mode })}
            onOpenNewComplaint={() => setNewComplaintOpen(true)}
            onOpenTrackModal={() => setTrackerOpen(true)}
            onSelectTab={handleSelectTab}
          />
        )}
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={authModal.isOpen}
        initialMode={authModal.mode}
        onClose={() => setAuthModal({ isOpen: false, mode: 'login' })}
      />

      <ComplaintFormModal
        isOpen={newComplaintOpen}
        onClose={() => setNewComplaintOpen(false)}
        onSuccess={handleComplaintSuccess}
      />

      <ComplaintDetailModal
        isOpen={Boolean(selectedComplaintId)}
        onClose={() => setSelectedComplaintId(null)}
        complaintId={selectedComplaintId}
        onRefreshList={() => {}}
      />

      <PublicTrackerModal
        isOpen={trackerOpen}
        onClose={() => setTrackerOpen(false)}
      />

      {/* Footer */}
      <footer className="mt-16 bg-white border-t border-slate-200 text-xs text-slate-500 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center p-0.5 shadow-2xs shrink-0">
              <img src={logoUrl} alt={`${platformName} Logo`} className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{platformName} • {collegeName} COMPLAINT SYSTEM</span>
              </div>
              <span className="block text-[11px] text-slate-400">{tagline}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <Shield size={12} />
              <span>Full-Stack Relational SQLite WASM Persistent Engine</span>
            </span>
            <span>•</span>
            <span>Strict Role-Based Access Control</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <CollegeProvider>
      <AuthProvider>
        <NotificationProvider>
          <MainAppContent />
        </NotificationProvider>
      </AuthProvider>
    </CollegeProvider>
  );
}
