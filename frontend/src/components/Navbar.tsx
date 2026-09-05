import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { BookOpen, Sparkles, History, Flame, LogOut, ShieldCheck, User, Compass, ChevronDown, Check } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  user: UserProfile | null;
  activeTab: 'editor' | 'history' | 'habits' | 'map' | 'admin';
  onSelectTab: (tab: 'editor' | 'history' | 'habits' | 'map' | 'admin') => void;
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const handleSelectMobileTab = (tab: 'editor' | 'history' | 'habits' | 'map' | 'admin') => {
    onSelectTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md border-b transition-colors"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-1 sm:gap-2 md:gap-3 lg:gap-4 min-w-0">
        {/* Brand - Shows only app icon on mobile, full text on md+ viewports */}
        <button
          onClick={() => onSelectTab('editor')}
          className="flex items-center space-x-1.5 sm:space-x-2.5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded-xl transition-transform cursor-pointer shrink-0"
          title="MindReflect - Journal Studio"
          aria-label="MindReflect Home"
        >
          <div
            className="w-8 h-8 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-xl border flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 shrink-0"
            style={{
              backgroundColor: 'var(--color-accent-subtle)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-accent)',
            }}
          >
            <BookOpen className="w-4 h-4 sm:w-4 sm:h-4" />
          </div>
          <div className="hidden sm:block min-w-0">
            <div className="flex items-center">
              <span
                className="font-serif-display text-base sm:text-lg md:text-xl font-bold tracking-tight transition-colors group-hover:text-amber-500 truncate"
                style={{ color: 'var(--color-text)' }}
              >
                MindReflect
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] hidden xl:block font-normal truncate" style={{ color: 'var(--color-text-muted)' }}>
              Private AI Reflection &amp; Journaling
            </p>
          </div>
        </button>

        {/* Navigation Tabs (when user is signed in) */}
        {user && (
          <nav
            ref={mobileMenuRef}
            className="relative flex items-center min-w-0 shrink-0 z-30"
            aria-label="Screen Navigation"
          >
            {/* 1. Mobile Dropdown Navigation Trigger (shown on mobile & tablet: lg:hidden) */}
            <div className="lg:hidden relative">
              <button
                id="nav-mobile-dropdown-btn"
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`group flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-97 shrink-0 select-none hover:border-amber-500/50 relative z-10 ${
                  isMobileMenuOpen ? 'ring-2 ring-amber-500/30' : ''
                }`}
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  borderColor: isMobileMenuOpen ? 'var(--color-accent)' : 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
                aria-expanded={isMobileMenuOpen}
                aria-haspopup="true"
                aria-label="Select Screen Dropdown Menu"
                title="Select Screen (Dropdown Menu)"
              >
                {/* Active Screen Icon Pill */}
                <div className="w-5 h-5 rounded-md flex items-center justify-center bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                  {activeTab === 'editor' && <Sparkles className="w-3 h-3" />}
                  {activeTab === 'history' && <History className="w-3 h-3" />}
                  {activeTab === 'habits' && <Flame className="w-3 h-3" />}
                  {activeTab === 'map' && <Compass className="w-3 h-3" />}
                  {activeTab === 'admin' && <ShieldCheck className="w-3 h-3" />}
                </div>

                {/* Active Screen Label */}
                <span className="truncate font-semibold text-xs text-left max-w-[65px] sm:max-w-[100px]">
                  {activeTab === 'editor' && 'Studio'}
                  {activeTab === 'history' && (entriesCount > 0 ? `History (${entriesCount})` : 'History')}
                  {activeTab === 'habits' && 'Habits'}
                  {activeTab === 'map' && (locationsCount > 0 ? `Map (${locationsCount})` : 'Map')}
                  {activeTab === 'admin' && 'Admin'}
                </span>

                {/* Subtle Divider */}
                <div
                  className="w-[1px] h-3.5 mx-0.5 shrink-0 opacity-25"
                  style={{ backgroundColor: 'var(--color-border)' }}
                />

                {/* Unmistakable Dropdown Caret Badge */}
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center transition-all duration-200 shrink-0 ${
                    isMobileMenuOpen
                      ? 'bg-amber-500 text-white rotate-180 shadow-xs'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20'
                  }`}
                >
                  <ChevronDown className="w-3 h-3 stroke-[2.5]" />
                </div>
              </button>

              {/* Mobile Screen Dropdown Popover */}
              {isMobileMenuOpen && (
                <div
                  id="nav-mobile-dropdown-menu"
                  className="absolute left-0 top-full mt-2 w-60 sm:w-68 rounded-2xl border shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
                  style={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    borderColor: 'var(--color-border)',
                  }}
                  role="menu"
                  aria-orientation="vertical"
                >
                  <div
                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border-b mb-1 flex items-center justify-between"
                    style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
                  >
                    <span>Switch Screen</span>
                    <span className="text-[9px] opacity-70">Tap to navigate</span>
                  </div>

                  {/* 1. Studio */}
                  <button
                    id="mobile-nav-tab-editor"
                    type="button"
                    onClick={() => handleSelectMobileTab('editor')}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer text-left group"
                    style={{
                      backgroundColor: activeTab === 'editor' ? 'var(--color-accent-subtle)' : 'transparent',
                      color: activeTab === 'editor' ? 'var(--color-text)' : 'var(--color-text-muted)',
                    }}
                    role="menuitem"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: activeTab === 'editor' ? 'var(--color-surface)' : 'transparent',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'editor' ? 'text-amber-500' : 'opacity-70'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate text-xs" style={{ color: 'var(--color-text)' }}>
                          Studio &amp; Reflection
                        </div>
                        <div className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                          Write &amp; AI Insights
                        </div>
                      </div>
                    </div>
                    {activeTab === 'editor' && <Check className="w-4 h-4 text-amber-500 shrink-0 ml-1" />}
                  </button>

                  {/* 2. History */}
                  <button
                    id="mobile-nav-tab-history"
                    type="button"
                    onClick={() => handleSelectMobileTab('history')}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer text-left mt-0.5 group"
                    style={{
                      backgroundColor: activeTab === 'history' ? 'var(--color-accent-subtle)' : 'transparent',
                      color: activeTab === 'history' ? 'var(--color-text)' : 'var(--color-text-muted)',
                    }}
                    role="menuitem"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: activeTab === 'history' ? 'var(--color-surface)' : 'transparent',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        <History className={`w-3.5 h-3.5 ${activeTab === 'history' ? 'text-amber-500' : 'opacity-70'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold text-xs truncate" style={{ color: 'var(--color-text)' }}>
                            Journal History
                          </span>
                          {entriesCount > 0 && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              {entriesCount}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                          Past reflections &amp; trends
                        </div>
                      </div>
                    </div>
                    {activeTab === 'history' && <Check className="w-4 h-4 text-amber-500 shrink-0 ml-1" />}
                  </button>

                  {/* 3. Habits & Streaks */}
                  <button
                    id="mobile-nav-tab-habits"
                    type="button"
                    onClick={() => handleSelectMobileTab('habits')}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer text-left mt-0.5 group"
                    style={{
                      backgroundColor: activeTab === 'habits' ? 'var(--color-accent-subtle)' : 'transparent',
                      color: activeTab === 'habits' ? 'var(--color-text)' : 'var(--color-text-muted)',
                    }}
                    role="menuitem"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: activeTab === 'habits' ? 'var(--color-surface)' : 'transparent',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        <Flame className={`w-3.5 h-3.5 ${activeTab === 'habits' ? 'text-amber-500' : 'opacity-70'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs truncate" style={{ color: 'var(--color-text)' }}>
                          Habits &amp; Streaks
                        </div>
                        <div className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                          Daily mindfulness &amp; routines
                        </div>
                      </div>
                    </div>
                    {activeTab === 'habits' && <Check className="w-4 h-4 text-amber-500 shrink-0 ml-1" />}
                  </button>

                  {/* 4. Places Map */}
                  <button
                    id="mobile-nav-tab-map"
                    type="button"
                    onClick={() => handleSelectMobileTab('map')}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer text-left mt-0.5 group"
                    style={{
                      backgroundColor: activeTab === 'map' ? 'var(--color-accent-subtle)' : 'transparent',
                      color: activeTab === 'map' ? 'var(--color-text)' : 'var(--color-text-muted)',
                    }}
                    role="menuitem"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: activeTab === 'map' ? 'var(--color-surface)' : 'transparent',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        <Compass className={`w-3.5 h-3.5 ${activeTab === 'map' ? 'text-amber-500' : 'opacity-70'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold text-xs truncate" style={{ color: 'var(--color-text)' }}>
                            Places Map
                          </span>
                          {locationsCount > 0 && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              {locationsCount}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                          Geographic reflections
                        </div>
                      </div>
                    </div>
                    {activeTab === 'map' && <Check className="w-4 h-4 text-amber-500 shrink-0 ml-1" />}
                  </button>

                  {/* 4. Admin Command Center (if user is admin) */}
                  {user.admin && (
                    <button
                      id="mobile-nav-tab-admin"
                      type="button"
                      onClick={() => handleSelectMobileTab('admin')}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer text-left mt-0.5 group"
                      style={{
                        backgroundColor: activeTab === 'admin' ? 'var(--color-accent-subtle)' : 'transparent',
                        color: activeTab === 'admin' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                      }}
                      role="menuitem"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                          style={{
                            backgroundColor: activeTab === 'admin' ? 'var(--color-surface)' : 'transparent',
                            borderColor: 'var(--color-border)',
                          }}
                        >
                          <ShieldCheck className={`w-3.5 h-3.5 ${activeTab === 'admin' ? 'text-amber-500' : 'opacity-70'}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-xs truncate" style={{ color: 'var(--color-text)' }}>
                              Admin Command
                            </span>
                            <span className="px-1 py-0.2 text-[8px] font-bold uppercase rounded bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              RBAC
                            </span>
                          </div>
                          <div className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                            System telemetry &amp; security
                          </div>
                        </div>
                      </div>
                      {activeTab === 'admin' && <Check className="w-4 h-4 text-amber-500 shrink-0 ml-1" />}
                    </button>
                  )}

                  {/* Security & Isolation Dialog Trigger for Mobile Viewports */}
                  <div className="pt-1 mt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <button
                      id="mobile-nav-security-info"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenSecurityModal();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl transition-all text-left group hover:bg-emerald-500/10 active:scale-98 cursor-pointer"
                      role="menuitem"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 bg-emerald-500/10 border-emerald-500/20">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-xs truncate text-emerald-600 dark:text-emerald-400">
                            Firestore Isolated
                          </span>
                          <div className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                            Owner-bound security &amp; RBAC
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Desktop Horizontal Tabs (shown on lg breakpoint onwards: hidden lg:flex) */}
            <div
              className="hidden lg:flex items-center p-0.5 rounded-xl border shadow-2xs transition-all gap-0.5 max-w-full overflow-x-auto scrollbar-none shrink-1 min-w-0"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              <button
                id="nav-tab-editor"
                onClick={() => onSelectTab('editor')}
                className="group flex items-center space-x-1.5 px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 whitespace-nowrap"
                style={{
                  backgroundColor: activeTab === 'editor' ? 'var(--color-surface-elevated)' : 'transparent',
                  color: activeTab === 'editor' ? 'var(--color-text)' : 'var(--color-text-muted)',
                  boxShadow: activeTab === 'editor' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
                title="Studio & Reflection"
              >
                <Sparkles
                  className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                    activeTab === 'editor' ? 'text-amber-500 dark:text-amber-400' : 'text-current opacity-70 group-hover:opacity-100'
                  }`}
                />
                <span>
                  Studio<span className="hidden xl:inline"> &amp; Reflection</span>
                </span>
              </button>

              <button
                id="nav-tab-history"
                onClick={() => onSelectTab('history')}
                className="group flex items-center space-x-1.5 px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 whitespace-nowrap"
                style={{
                  backgroundColor: activeTab === 'history' ? 'var(--color-surface-elevated)' : 'transparent',
                  color: activeTab === 'history' ? 'var(--color-text)' : 'var(--color-text-muted)',
                  boxShadow: activeTab === 'history' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
                title="Journal History"
              >
                <History
                  className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                    activeTab === 'history' ? 'text-amber-500 dark:text-amber-400' : 'text-current opacity-70 group-hover:opacity-100'
                  }`}
                />
                <span>History</span>
                {entriesCount > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 text-[9px] font-bold rounded-full border transition-colors ${
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
                id="nav-tab-habits"
                onClick={() => onSelectTab('habits')}
                className="group flex items-center space-x-1.5 px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 whitespace-nowrap"
                style={{
                  backgroundColor: activeTab === 'habits' ? 'var(--color-surface-elevated)' : 'transparent',
                  color: activeTab === 'habits' ? 'var(--color-text)' : 'var(--color-text-muted)',
                  boxShadow: activeTab === 'habits' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
                title="Habit & Streak Tracker"
              >
                <Flame
                  className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                    activeTab === 'habits' ? 'text-amber-500 dark:text-amber-400 fill-amber-500/20' : 'text-current opacity-70 group-hover:opacity-100'
                  }`}
                />
                <span>Habits</span>
              </button>

              <button
                id="nav-tab-map"
                onClick={() => onSelectTab('map')}
                className="group flex items-center space-x-1.5 px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 whitespace-nowrap"
                style={{
                  backgroundColor: activeTab === 'map' ? 'var(--color-surface-elevated)' : 'transparent',
                  color: activeTab === 'map' ? 'var(--color-text)' : 'var(--color-text-muted)',
                  boxShadow: activeTab === 'map' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
                title="Geographic Reflection Map"
              >
                <Compass
                  className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                    activeTab === 'map' ? 'text-amber-500 dark:text-amber-400' : 'text-current opacity-70 group-hover:opacity-100'
                  }`}
                />
                <span>
                  <span className="hidden md:inline">Places </span>Map
                </span>
                {locationsCount > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 text-[9px] font-bold rounded-full border transition-colors ${
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
                  className="group flex items-center space-x-1.5 px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 whitespace-nowrap"
                  style={{
                    backgroundColor: activeTab === 'admin' ? 'var(--color-surface-elevated)' : 'transparent',
                    color: activeTab === 'admin' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    boxShadow: activeTab === 'admin' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  }}
                  title="Admin Command Center (RBAC)"
                >
                  <ShieldCheck
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      activeTab === 'admin' ? 'text-amber-500 dark:text-amber-400' : 'text-current opacity-70 group-hover:opacity-100'
                    }`}
                  />
                  <span>
                    Admin<span className="hidden lg:inline"> Center</span>
                  </span>
                  <span className="ml-1 px-1 py-0.2 text-[8px] font-bold uppercase rounded bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    RBAC
                  </span>
                </button>
              )}
            </div>
          </nav>
        )}

        {/* User Profile & Actions - Ordered: [Firestore Isolated Security] -> [Theme Switcher] -> [User & Sign Out] */}
        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-2.5 shrink-0 min-w-0">
          {/* 1. Security & Isolation Status Indicator (Hidden on mobile to provide maximum space for profile & sign out) */}
          <button
            id="btn-security-info"
            onClick={onOpenSecurityModal}
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 active:scale-97 shadow-2xs shrink-0"
            title="Firestore Isolated (Owner-bound documents - Click for security details)"
            aria-label="Firestore Isolated Security Status"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="font-semibold whitespace-nowrap">
              Firestore Isolated
            </span>
          </button>

          {/* 2. Dark / Light Toggle & Theme Palette Selector */}
          <ThemeToggle />

          {/* 3. User Identity & Sign Out */}
          {user && (
            <div
              className="flex items-center space-x-1 sm:space-x-1.5 pl-1 sm:pl-2 border-l shrink-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center space-x-1.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border object-cover ring-1 ring-black/5 dark:ring-white/10 shrink-0"
                    style={{ borderColor: 'var(--color-border)' }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold border ring-1 ring-black/5 dark:ring-white/10 shrink-0"
                    style={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                  </div>
                )}
                <div className="hidden 2xl:block text-left">
                  <div className="flex items-center space-x-1">
                    <p
                      className="text-xs font-semibold truncate max-w-[100px]"
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
                    className="text-[10px] truncate max-w-[100px]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {user.email || 'Google Auth'}
                  </p>
                </div>
              </div>

              <button
                id="btn-sign-out"
                onClick={onSignOut}
                className="p-1 sm:p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-rose-500/10 hover:text-rose-500 shrink-0"
                style={{ color: 'var(--color-text-muted)' }}
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
