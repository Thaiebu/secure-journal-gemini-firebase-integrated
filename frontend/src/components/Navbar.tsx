import React from 'react';
import { UserProfile } from '../types';
import { BookOpen, Sparkles, History, LogOut, ShieldCheck, User, Compass } from 'lucide-react';

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
    <header className="sticky top-0 z-40 bg-[#0F0F0F]/90 backdrop-blur-md border-b border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif-display text-xl font-bold text-neutral-100 tracking-tight">
                MindReflect
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Gemini 3.6 Flash
              </span>
            </div>
            <p className="text-xs text-neutral-400 hidden sm:block">
              Private AI Reflection & Journaling
            </p>
          </div>
        </div>

        {/* Navigation Tabs (when user is signed in) */}
        {user && (
          <nav className="flex items-center bg-neutral-900 border border-neutral-800/80 p-1 rounded-xl">
            <button
              id="nav-tab-editor"
              onClick={() => onSelectTab('editor')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Studio & Reflection</span>
            </button>

            <button
              id="nav-tab-history"
              onClick={() => onSelectTab('history')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <History className="w-4 h-4 text-neutral-300" />
              <span>History</span>
              {entriesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {entriesCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-map"
              onClick={() => onSelectTab('map')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Places Map</span>
              {locationsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {locationsCount}
                </span>
              )}
            </button>

            {user.admin && (
              <button
                id="nav-tab-admin"
                onClick={() => onSelectTab('admin')}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-neutral-800 text-amber-300 shadow-xs border border-amber-500/30'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Admin Center</span>
                <span className="ml-1 px-1 py-0.1 text-[9px] font-bold uppercase rounded bg-amber-500/30 text-amber-300">
                  RBAC
                </span>
              </button>
            )}
          </nav>
        )}

        {/* User Profile & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            id="btn-security-info"
            onClick={onOpenSecurityModal}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/50 transition-colors cursor-pointer"
            title="View Security & Isolation Model"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Firestore Isolated</span>
          </button>

          {user && (
            <div className="flex items-center space-x-2 pl-2 border-l border-neutral-800">
              <div className="flex items-center space-x-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-neutral-700 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-bold border border-neutral-700">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-semibold text-neutral-200 truncate max-w-[120px]">
                    {user.displayName || 'Reflective Writer'}
                  </p>
                  <p className="text-[10px] text-neutral-500 truncate max-w-[120px]">
                    {user.email || 'Google Auth'}
                  </p>
                </div>
              </div>

              <button
                id="btn-sign-out"
                onClick={onSignOut}
                className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                title="Sign Out"
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
