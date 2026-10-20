import React, { useState, useRef, useEffect } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext.tsx';
import { useNotifications } from '../../context/NotificationContext.tsx';
import {
  GraduationCap,
  Bell,
  LogOut,
  User as UserIcon,
  Search,
  PlusCircle,
  BarChart3,
  Megaphone,
  ShieldAlert,
  Settings,
  ChevronDown,
  CheckCheck,
  CheckCircle,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

import { useCollege } from '../../context/CollegeContext.tsx';
import { RenameCollegeModal } from './RenameCollegeModal.tsx';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenNewComplaint: () => void;
  onOpenTrackModal: () => void;
  onOpenAuthModal: (mode: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewComplaint,
  onOpenTrackModal,
  onOpenAuthModal,
}) => {
  const { user, logout, quickDemoLogin, isStudent, isAdmin } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { platformName, collegeName, tagline, logoUrl, isRenameModalOpen, closeRenameModal } = useCollege();

  const [notifOpen, setNotifOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (demoRef.current && !demoRef.current.contains(e.target as Node)) setDemoOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDemoSwitch = async (email: string) => {
    setDemoOpen(false);
    await quickDemoLogin(email);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner with Quick Role Switcher for Test Reviewers */}
      <div className="bg-slate-900 text-slate-200 text-xs py-1.5 px-4 sm:px-8 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-slate-300">Live Campus System • {collegeName}</span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline">Tagline: "{tagline}"</span>
        </div>

        {/* Quick Demo Switcher */}
        <div className="relative" ref={demoRef}>
          <button
            onClick={() => setDemoOpen(!demoOpen)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-0.5 rounded text-xs font-medium transition-colors"
            title="Switch between test accounts with different roles"
          >
            <Sparkles size={12} />
            <span>Role Switcher (Demo Accounts)</span>
            <ChevronDown size={12} />
          </button>

          {demoOpen && (
            <div className="absolute right-0 mt-1 w-72 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-slate-800">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-500">
                Log In As (Real Authentication):
              </div>
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => handleDemoSwitch(acc.email)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    user?.email === acc.email ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-medium">{acc.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{acc.email}</div>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                    {acc.badge}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onSelectTab(user ? 'dashboard' : 'home')}
              className="flex items-center gap-2.5 text-left focus:outline-none group"
              title="Go to Home / Dashboard"
            >
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-white border border-slate-200 shadow-xs flex items-center justify-center p-0.5 group-hover:border-blue-400 group-hover:shadow-md transition-all shrink-0">
                <img
                  src={logoUrl || '/assets/aistudio/Fix_Buddy_Robot_Repair_Logo_220975f8.png'}
                  alt={`${platformName} Logo`}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors block leading-tight">
                  {platformName}
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 tracking-normal hidden sm:block leading-tight">
                  {collegeName} • Complaint Management Portal
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {!user ? (
              <>
                <button
                  onClick={() => onSelectTab('home')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentTab === 'home' ? 'text-blue-600 bg-blue-50/60' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => onSelectTab('how-it-works')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentTab === 'how-it-works' ? 'text-blue-600 bg-blue-50/60' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  How It Works
                </button>
                <button
                  onClick={() => onSelectTab('announcements')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentTab === 'announcements' ? 'text-blue-600 bg-blue-50/60' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Announcements
                </button>
                <button
                  onClick={onOpenTrackModal}
                  className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
                >
                  <Search size={15} />
                  <span>Track Complaint</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onSelectTab('dashboard')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentTab === 'dashboard' ? 'text-blue-600 bg-blue-50/60 font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dashboard
                </button>

                {!isStudent && (
                  <button
                    onClick={() => onSelectTab('analytics')}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                      currentTab === 'analytics' ? 'text-blue-600 bg-blue-50/60 font-semibold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 size={15} />
                    <span>Analytics</span>
                  </button>
                )}

                <button
                  onClick={() => onSelectTab('announcements')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    currentTab === 'announcements' ? 'text-blue-600 bg-blue-50/60 font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Megaphone size={15} />
                  <span>Notices</span>
                </button>

                <button
                  onClick={() => onSelectTab('known-issues')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    currentTab === 'known-issues' ? 'text-blue-600 bg-blue-50/60 font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldAlert size={15} />
                  <span>Known Issues</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => onSelectTab('admin')}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                      currentTab === 'admin' ? 'text-blue-600 bg-blue-50/60 font-semibold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Settings size={15} />
                    <span>System Admin</span>
                  </button>
                )}

                <button
                  onClick={onOpenTrackModal}
                  className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
                >
                  <Search size={15} />
                  <span>Track Ref</span>
                </button>
              </>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Submit Complaint Button for Student */}
                {isStudent && (
                  <button
                    onClick={onOpenNewComplaint}
                    className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors focus:ring-2 focus:ring-blue-500"
                  >
                    <PlusCircle size={16} />
                    <span>File Complaint</span>
                  </button>
                )}

                {/* Notifications Dropdown */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
                    aria-label={`Notifications, ${unreadCount} unread`}
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                        <div className="font-semibold text-sm text-slate-900">
                          Notifications ({unreadCount} unread)
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                          >
                            <CheckCheck size={14} />
                            <span>Mark all read</span>
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => markAsRead(n.id)}
                              className={`p-3 text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                                !n.is_read ? 'bg-blue-50/40' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-slate-900">{n.title}</span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-600 leading-relaxed mb-1">{n.message}</p>
                              {!n.is_read && (
                                <span className="inline-block text-[10px] text-blue-600 font-medium">New</span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
                    aria-label="User account menu"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left hidden lg:block">
                      <div className="text-xs font-semibold text-slate-900 line-clamp-1">{user.full_name}</div>
                      <div className="text-[10px] text-slate-500 capitalize">{user.role.replace('_', ' ').toLowerCase()}</div>
                    </div>
                    <ChevronDown size={14} className="text-slate-400" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <div className="font-semibold text-sm text-slate-900">{user.full_name}</div>
                        <div className="text-xs text-slate-500 font-mono">{user.email}</div>
                        <div className="mt-1">
                          <span className="inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {user.role}
                          </span>
                        </div>
                        {user.roll_number && (
                          <div className="text-xs text-slate-500 mt-1">Roll: {user.roll_number}</div>
                        )}
                        {user.department_name && (
                          <div className="text-xs text-slate-500 mt-0.5">Dept: {user.department_name}</div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium transition-colors"
                      >
                        <LogOut size={14} />
                        <span>Sign Out Session</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => onOpenAuthModal('login')}
                  className="hidden sm:inline-block px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={() => onOpenAuthModal('register')}
                  className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors whitespace-nowrap"
                >
                  Sign In / Register
                </button>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {!user ? (
            <>
              <button
                onClick={() => { onSelectTab('home'); setMobileMenuOpen(false); }}
                className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded"
              >
                Home
              </button>
              <button
                onClick={() => { onSelectTab('how-it-works'); setMobileMenuOpen(false); }}
                className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded"
              >
                How It Works
              </button>
              <button
                onClick={() => { onSelectTab('announcements'); setMobileMenuOpen(false); }}
                className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded"
              >
                Announcements
              </button>
              <button
                onClick={() => { onOpenTrackModal(); setMobileMenuOpen(false); }}
                className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded"
              >
                Track Complaint
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { onSelectTab('dashboard'); setMobileMenuOpen(false); }}
                className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded"
              >
                Dashboard
              </button>
              {isStudent && (
                <button
                  onClick={() => { onOpenNewComplaint(); setMobileMenuOpen(false); }}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-blue-600 font-semibold"
                >
                  + File Complaint
                </button>
              )}
              {!isStudent && (
                <button
                  onClick={() => { onSelectTab('analytics'); setMobileMenuOpen(false); }}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded"
                >
                  Analytics & Reports
                </button>
              )}
              <button
                onClick={() => { onSelectTab('announcements'); setMobileMenuOpen(false); }}
                className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded"
              >
                Announcements
              </button>
              <button
                onClick={() => { onSelectTab('known-issues'); setMobileMenuOpen(false); }}
                className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded"
              >
                Known Issues
              </button>
              {isAdmin && (
                <button
                  onClick={() => { onSelectTab('admin'); setMobileMenuOpen(false); }}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded"
                >
                  Admin System
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Replace / Rename College Modal */}
      <RenameCollegeModal
        isOpen={isRenameModalOpen}
        onClose={closeRenameModal}
      />
    </header>
  );
};
