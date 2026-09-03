import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeId = 'obsidian' | 'pristine' | 'parchment' | 'twilight' | 'system';
export type ResolvedTheme = 'obsidian' | 'pristine' | 'parchment' | 'twilight';
export type ThemeMode = 'dark' | 'light';

// Backward-compatible alias type
export type ThemePreset = ThemeId | 'dark' | 'light' | 'sepia' | 'nord';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  mode: 'dark' | 'light' | 'system';
  tagline: string;
  description: string;
  swatches: [string, string, string]; // [bg, surface, accent]
  bgHex: string;
  surfaceHex: string;
  accentHex: string;
}

export const CURATED_THEMES: ThemeOption[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Dark',
    mode: 'dark',
    tagline: 'Deep studio black',
    description: 'Minimal borders, warm amber highlights, and deep contrast',
    swatches: ['#0A0A0A', '#141414', '#F59E0B'],
    bgHex: '#0A0A0A',
    surfaceHex: '#141414',
    accentHex: '#F59E0B',
  },
  {
    id: 'pristine',
    name: 'Pristine Light',
    mode: 'light',
    tagline: 'Clean paper',
    description: 'Crisp paper-like interface with high readability and warm tones',
    swatches: ['#FBFBF9', '#FFFFFF', '#D97706'],
    bgHex: '#FBFBF9',
    surfaceHex: '#FFFFFF',
    accentHex: '#D97706',
  },
  {
    id: 'parchment',
    name: 'Warm Parchment',
    mode: 'light',
    tagline: 'Comfortable reading',
    description: 'Warm, literary sepia appearance for fatigue-free reflection',
    swatches: ['#F5EFE6', '#FFF9F0', '#B45309'],
    bgHex: '#F5EFE6',
    surfaceHex: '#FFF9F0',
    accentHex: '#B45309',
  },
  {
    id: 'twilight',
    name: 'Twilight Slate',
    mode: 'dark',
    tagline: 'Calm midnight blue',
    description: 'Developer aesthetic with midnight slate and calm sky-blue accents',
    swatches: ['#0B1120', '#111827', '#38BDF8'],
    bgHex: '#0B1120',
    surfaceHex: '#111827',
    accentHex: '#38BDF8',
  },
  {
    id: 'system',
    name: 'System',
    mode: 'system',
    tagline: 'Follow OS appearance',
    description: 'Automatically synchronizes with your device light or dark mode',
    swatches: ['#0A0A0A', '#FBFBF9', '#F59E0B'],
    bgHex: '#141414',
    surfaceHex: '#1C1C1C',
    accentHex: '#F59E0B',
  },
];

// Alias for legacy consumer compatibility
export const THEME_SUGGESTIONS = CURATED_THEMES;

interface ThemeContextType {
  theme: ThemeId;
  resolvedTheme: ResolvedTheme;
  mode: ThemeMode;
  preset: ThemePreset; // backward-compat alias
  isDark: boolean;
  setTheme: (theme: ThemeId) => void;
  setPreset: (preset: ThemePreset) => void; // backward-compat alias
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function normalizeTheme(raw: string | null): ThemeId {
  if (!raw) return 'obsidian';
  if (raw === 'dark') return 'obsidian';
  if (raw === 'light') return 'pristine';
  if (raw === 'sepia') return 'parchment';
  if (raw === 'nord') return 'twilight';
  if (['obsidian', 'pristine', 'parchment', 'twilight', 'system'].includes(raw)) {
    return raw as ThemeId;
  }
  return 'obsidian';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem('theme') || localStorage.getItem('mindreflect_theme_preset');
      return normalizeTheme(saved);
    } catch {
      return 'obsidian';
    }
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  // Watch for system appearance changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Compute resolved theme based on user choice vs system
  const resolvedTheme: ResolvedTheme = React.useMemo(() => {
    if (theme === 'system') {
      return systemIsDark ? 'obsidian' : 'pristine';
    }
    return theme;
  }, [theme, systemIsDark]);

  const mode: ThemeMode = resolvedTheme === 'pristine' || resolvedTheme === 'parchment' ? 'light' : 'dark';
  const isDark = mode === 'dark';

  const setTheme = useCallback((newTheme: ThemeId) => {
    const normalized = normalizeTheme(newTheme);
    setThemeState(normalized);
    try {
      localStorage.setItem('theme', normalized);
      localStorage.setItem('mindreflect_theme_preset', normalized);
    } catch {
      // ignore
    }
  }, []);

  const setPreset = useCallback((newPreset: ThemePreset) => {
    setTheme(normalizeTheme(newPreset));
  }, [setTheme]);

  const setMode = useCallback((newMode: ThemeMode) => {
    if (newMode === 'light') {
      setTheme(theme === 'parchment' ? 'parchment' : 'pristine');
    } else {
      setTheme(theme === 'twilight' ? 'twilight' : 'obsidian');
    }
  }, [theme, setTheme]);

  const toggleMode = useCallback(() => {
    if (isDark) {
      // Switch from dark to light
      setTheme('pristine');
    } else {
      // Switch from light to dark
      setTheme('obsidian');
    }
  }, [isDark, setTheme]);

  // Synchronize document attributes and classes smoothly
  useEffect(() => {
    const root = document.documentElement;
    // Remove all old theme classes
    root.classList.remove(
      'theme-obsidian',
      'theme-pristine',
      'theme-parchment',
      'theme-twilight',
      'theme-dark',
      'theme-light',
      'theme-sepia',
      'theme-nord',
      'dark',
      'light'
    );

    root.classList.add(mode);
    root.classList.add(`theme-${resolvedTheme}`);
    root.setAttribute('data-theme', resolvedTheme);
    root.setAttribute('data-mode', mode);
    root.setAttribute('data-user-theme', theme);
  }, [mode, resolvedTheme, theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        mode,
        preset: theme, // for backward-compatibility
        isDark,
        setTheme,
        setPreset,
        setMode,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

