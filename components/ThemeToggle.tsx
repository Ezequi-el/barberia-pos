import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

const THEME_KEY = 'velo_theme';

export function applyTheme(theme: 'dark' | 'light') {
  if (theme === 'light') {
    document.documentElement.classList.add('light-mode');
  } else {
    document.documentElement.classList.remove('light-mode');
  }
}

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) as 'dark' | 'light' | null;
  applyTheme(saved ?? 'dark');
}

const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem(THEME_KEY) as 'dark' | 'light') ?? 'dark';
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${
        theme === 'dark'
          ? 'text-[#94a3b8] hover:text-[#e2b808] hover:bg-[#e2b808]/10'
          : 'text-[#6B6B6B] hover:text-[#B8860B] hover:bg-[#B8860B]/10'
      } ${className}`}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default ThemeToggle;
