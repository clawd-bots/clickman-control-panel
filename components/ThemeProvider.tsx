'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'light', toggleTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

/** Chart-friendly colors that adapt to theme */
export function useChartColors() {
  const { theme } = useTheme();
  return theme === 'dark'
    ? {
        grid: '#2A2E2B',
        tooltipBg: '#1A1D1B',
        tooltipBorder: '1px solid #2A2E2B',
        axisText: '#94A3B8',
      }
    : {
        grid: '#E2E8F0',
        tooltipBg: '#FFFFFF',
        tooltipBorder: '1px solid #E2E8F0',
        axisText: '#64748B',
      };
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('clickman-theme') as Theme | null;
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('clickman-theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  // Prevent flash - render nothing until we know the theme
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
