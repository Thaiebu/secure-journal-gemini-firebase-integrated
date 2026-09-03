import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sun, Moon, Palette, Check, Monitor, Sparkles } from 'lucide-react';
import { useTheme, CURATED_THEMES, ThemeId } from '../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, resolvedTheme, mode, isDark, toggleMode, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  // Close on Outside Click or Escape Key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        toggleBtnRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectTheme = useCallback(
    (themeId: ThemeId) => {
      setTheme(themeId);
      // Brief feedback before closing panel
      setTimeout(() => {
        setIsOpen(false);
      }, 140);
    },
    [setTheme]
  );

  return (
    <div className="relative inline-flex items-center space-x-1.5" ref={panelRef}>
      {/* 1. Direct Quick Toggle Button (Light/Dark Switch) */}
      <button
        id="btn-theme-toggle"
        ref={toggleBtnRef}
        type="button"
        onClick={toggleMode}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className="group relative inline-flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 cursor-pointer shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          borderWidth: '1px',
          borderStyle: 'solid',
          color: 'var(--color-text)',
        }}
      >
        <span className="sr-only">
          {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        </span>

        {/* Smooth Rotation/Fade Icon Animation */}
        <div className="relative w-4 h-4 flex items-center justify-center overflow-hidden">
          <Sun
            className={`w-4 h-4 text-amber-500 transition-all duration-200 transform ${
              isDark
                ? 'opacity-100 rotate-0 scale-100'
                : 'opacity-0 -rotate-90 scale-50 absolute pointer-events-none'
            }`}
          />
          <Moon
            className={`w-4 h-4 text-amber-600 dark:text-amber-400 transition-all duration-200 transform ${
              !isDark
                ? 'opacity-100 rotate-0 scale-100'
                : 'opacity-0 rotate-90 scale-50 absolute pointer-events-none'
            }`}
          />
        </div>
      </button>

      {/* 2. Theme Palette Floating Panel Trigger */}
      <button
        id="btn-theme-suggestions-menu"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="theme-studio-panel"
        title="Appearance & Theme Studio"
        aria-label="Appearance & Theme Studio"
        className={`group inline-flex items-center space-x-1.5 h-9 px-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 ${
          isOpen ? 'ring-1 ring-amber-500/50' : ''
        }`}
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: isOpen ? 'var(--color-accent)' : 'var(--color-border)',
          borderWidth: '1px',
          borderStyle: 'solid',
          color: 'var(--color-text)',
        }}
      >
        <Palette className="w-3.5 h-3.5 text-amber-500 transition-transform group-hover:rotate-12 duration-200" />
        <span className="hidden xl:inline text-[11px] capitalize font-medium opacity-90">
          {theme === 'system' ? 'System' : resolvedTheme}
        </span>
      </button>

      {/* 3. Modern Floating Theme Studio Panel */}
      {isOpen && (
        <div
          id="theme-studio-panel"
          role="dialog"
          aria-label="Appearance settings"
          className="absolute right-0 top-full mt-2 w-80 p-3 rounded-2xl shadow-xl border z-50 backdrop-blur-md animate-in fade-in slide-in-from-top-1.5 duration-150"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Header */}
          <div
            className="px-2 pt-1 pb-2.5 mb-2 border-b flex items-start justify-between"
            style={{ borderColor: 'var(--color-border-subtle)' }}
          >
            <div>
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <h3
                  className="text-xs font-bold tracking-tight"
                  style={{ color: 'var(--color-text)' }}
                >
                  Appearance
                </h3>
              </div>
              <p
                className="text-[11px] mt-0.5 leading-snug"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Choose an appearance that fits your workflow.
              </p>
            </div>

            {/* Current Active Mode Chip */}
            <span
              className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border shrink-0 mt-0.5"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: 'var(--color-accent)',
                borderColor: 'rgba(245, 158, 11, 0.3)',
              }}
            >
              {theme === 'system' ? `Auto: ${mode}` : mode}
            </span>
          </div>

          {/* Curated Theme Options */}
          <div className="space-y-1" role="radiogroup" aria-label="Theme options">
            {CURATED_THEMES.map((item) => {
              const isSelected = theme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  id={`btn-theme-option-${item.id}`}
                  onClick={() => handleSelectTheme(item.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between cursor-pointer group ${
                    isSelected
                      ? 'shadow-xs'
                      : 'hover:border-neutral-500/30'
                  }`}
                  style={{
                    backgroundColor: isSelected
                      ? 'var(--color-surface-elevated)'
                      : 'transparent',
                    borderColor: isSelected
                      ? 'var(--color-accent)'
                      : 'transparent',
                  }}
                >
                  <div className="flex items-start space-x-2.5 min-w-0 pr-2">
                    {/* Swatches: 3 dots showing [background, surface, accent] */}
                    <div className="flex items-center space-x-1 shrink-0 mt-1 p-1 rounded-md border" style={{ borderColor: 'var(--color-border-subtle)', backgroundColor: 'var(--color-bg)' }}>
                      {item.id === 'system' ? (
                        <Monitor className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        item.swatches.map((colorHex, idx) => (
                          <span
                            key={idx}
                            className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/20 inline-block shadow-2xs"
                            style={{ backgroundColor: colorHex }}
                          />
                        ))
                      )}
                    </div>

                    {/* Title and Short Description */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className="text-xs font-semibold truncate"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {item.name}
                        </span>
                      </div>
                      <p
                        className="text-[11px] leading-tight line-clamp-1 mt-0.5 opacity-80"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {item.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Active Checkmark */}
                  {isSelected ? (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        borderColor: 'var(--color-accent)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full border opacity-20 group-hover:opacity-40 shrink-0"
                      style={{ borderColor: 'var(--color-text-muted)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Switch Footer */}
          <div
            className="mt-2.5 pt-2 border-t"
            style={{ borderColor: 'var(--color-border-subtle)' }}
          >
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider opacity-75"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Quick Switch
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                id="btn-quick-light"
                onClick={() => handleSelectTheme('pristine')}
                className="py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border transition-all duration-150 cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor:
                    mode === 'light'
                      ? 'rgba(217, 119, 6, 0.15)'
                      : 'var(--color-surface-elevated)',
                  borderColor:
                    mode === 'light'
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                  color:
                    mode === 'light'
                      ? 'var(--color-accent)'
                      : 'var(--color-text)',
                }}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </button>

              <button
                type="button"
                id="btn-quick-dark"
                onClick={() => handleSelectTheme('obsidian')}
                className="py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border transition-all duration-150 cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor:
                    mode === 'dark'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'var(--color-surface-elevated)',
                  borderColor:
                    mode === 'dark'
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                  color:
                    mode === 'dark'
                      ? 'var(--color-accent)'
                      : 'var(--color-text)',
                }}
              >
                <Moon className="w-3.5 h-3.5 text-amber-400" />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

