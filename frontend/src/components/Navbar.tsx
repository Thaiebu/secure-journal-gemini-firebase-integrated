import React from 'react';
import { UserProfile } from '../types';
import { BookOpen, Sparkles, History, LogOut, ShieldCheck, User, Compass } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  user: UserProfile | null;
  activeTab: 'editor' | 'history' | 'map' | 'admin';
  onSelectTab: (tab: 'editor' | 'history' | 'map' | 'admin') => void;
  onSignOut: () => void;
  onOpenSecurityModal: () => void;
  entriesCount: number;
  locationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onSelectTab,
  onSignOut,
  onOpenSecurityModal,
  entriesCount,
  locationsCount = 0,
}) => {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md border-b transition-colors"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-6">
        {/* Brand */}
        <button
          onClick={() => onSelectTab('editor')}
          className="flex items-center space-x-3 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded-xl transition-transform cursor-pointer"
          title="MindReflect - Journal Studio"
        >
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shadow-xs transition-transform group-hover:scale-105"
            style={{
              backgroundColor: 'var(--color-accent-subtle)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-accent)',
            }}
          >
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center">
              <span
                className="font-serif-display text-xl sm:text-2xl font-bold tracking-tight transition-colors group-hover:text-amber-500"
                style={{ color: 'var(--color-text)' }}
              >
                MindReflect
              </span>
            </div>
            <p className="text-[11px] hidden sm:block font-normal" style={{ color: 'var(--color-text-muted)' }}>
              Private AI Reflection &amp; Journaling
            </p>
          </div>
        </button>

        {/* Navigation Tabs (when user is signed in) */}
        {user && (
          <nav
            className="flex items-center p-1 rounded-xl border shadow-2xs transition-colors gap-1"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <button
              id="nav-tab-editor"
              onClick={() => onSelectTab('editor')}
              className="group flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer"
              style={{
                backgroundColor: activeTab === 'editor' ? 'var(--color-surface-elevated)' : 'transparent',
                color: activeTab === 'editor' ? 'var(--color-text)' : 'var(--color-text-muted)',
                boxShadow: activeTab === 'editor' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <Sparkles
                className={`w-4 h-4 transition-colors ${
                  activeTab === 'editor' ? 'text-amber-500 dark:text-amber-400' : 'text-current opacity-70 group-hover:opacity-100'
                }`}
              />
              <span>
                Studio<span className="hidden lg:inline"> &amp; Reflection</span>
              </span>
            </button>

            <button
              id="nav-tab-history"
              onClick={() => onSelectTab('history')}
              className="group flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer"
              style={{
                backgroundColor: activeTab === 'history' ? 'var(--color-surface-elevated)' : 'transparent',
                color: activeTab === 'history' ? 'var(--color-text)' : 'var(--color-text-muted)',
                boxShadow: activeTab === 'history' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <History
                className={`w-4 h-4 transition-colors ${
                  activeTab === 'history' ? 'text-amber-500 dark:text-amber-400' : 'text-current opacity-70 group-hover:opacity-100'
                }`}
              />
              <span>History</span>
              {entriesCount > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full border transition-colors ${
                    activeTab === 'history'
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'border-transparent opacity-80'
                  }`}
                  style={{
                    backgroundColor: activeTab === 'history' ? undefined : 'var(--color-surface-elevated)',
                    color: activeTab === 'history' ? undefined : 'var(--color-text-muted)',
                  }}
                >
                  {entriesCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-map"
              onClick={() => onSelectTab('map')}
              className="group flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer"
              style={{
                backgroundColor: activeTab === 'map' ? 'var(--color-surface-elevated)' : 'transparent',
                color: activeTab === 'map' ? 'var(--color-text)' : 'var(--color-text-muted)',
                boxShadow: activeTab === 'map' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <Compass
                className={`w-4 h-4 transition-colors ${
                  activeTab === 'map' ? 'text-amber-500 dark:text-amber-400' : 'text-current opacity-70 group-hover:opacity-100'
                }`}
              />
              <span>
                <span className="hidden sm:inline">Places </span>Map
              </span>
              {locationsCount > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full border transition-colors ${
                    activeTab === 'map'
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'border-transparent opacity-80'
                  }`}
                  style={{
                    backgroundColor: activeTab === 'map' ? undefined : 'var(--color-surface-elevated)',
                    color: activeTab === 'map' ? undefined : 'var(--color-text-muted)',
                  }}
                >
                  {locationsCount}
                </span>
              )}
            </button>

            {user.admin && (
              <button
                id="nav-tab-admin"
                onClick={() => onSelectTab('admin')}
                className="group flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer"
                style={{
                  backgroundColor: activeTab === 'admin' ? 'var(--color-surface-elevated)' : 'transparent',
                  color: activeTab === 'admin' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  boxShadow: activeTab === 'admin' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <ShieldCheck
                  className={`w-4 h-4 transition-colors ${
                    activeTab === 'admin' ? 'text-amber-500 dark:text-amber-400' : 'text-current opacity-70 group-hover:opacity-100'
                  }`}
                />
                <span>
                  Admin<span className="hidden sm:inline"> Center</span>
                </span>
                <span className="ml-1 px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  RBAC
                </span>
              </button>
            )}
          </nav>
        )}

        {/* User Profile & Actions - Ordered: [Security Status] -> [Theme Switcher] -> [User & Sign Out] */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* 1. Security & Isolation Status Indicator */}
          <button
            id="btn-security-info"
            onClick={onOpenSecurityModal}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 active:scale-97 shadow-2xs"
            title="View Security, RBAC & Isolation Model"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="hidden sm:inline">Firestore Isolated</span>
            <span className="sm:hidden">Secure</span>
          </button>

          {/* 2. Dark / Light Toggle & Theme Palette Selector */}
          <ThemeToggle />

          {/* 3. User Identity & Sign Out */}
          {user && (
            <div
              className="flex items-center space-x-2 pl-2 sm:pl-3 border-l"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center space-x-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border object-cover ring-1 ring-black/5 dark:ring-white/10"
                    style={{ borderColor: 'var(--color-border)' }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ring-1 ring-black/5 dark:ring-white/10"
                    style={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <div className="flex items-center space-x-1">
                    <p
                      className="text-xs font-semibold truncate max-w-[120px]"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {user.displayName || 'Reflective Writer'}
                    </p>
                    {user.admin && (
                      <span className="px-1 py-0.2 text-[8px] font-bold uppercase rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                        Admin
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[10px] truncate max-w-[120px]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {user.email || 'Google Auth'}
                  </p>
                </div>
              </div>

              <button
                id="btn-sign-out"
                onClick={onSignOut}
                className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-rose-500/10 hover:text-rose-500"
                style={{ color: 'var(--color-text-muted)' }}
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
