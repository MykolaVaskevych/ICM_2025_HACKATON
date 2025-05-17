'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export const ThemeContext = createContext({
  darkMode: false,
  setDarkMode: () => {}
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Toggle dark mode and save preference
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Only access localStorage on the client
    if (typeof window !== 'undefined') {
      if (newDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  };
  
  // Initialize from localStorage only on client
  useEffect(() => {
    setMounted(true);
    
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // If no saved preference, check system preference
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);
  
  // Don't render children until after client-side hydration is complete
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        {/* Render a skeleton version of your UI while waiting for client-side hydration */}
        {children}
      </div>
    );
  }
  
  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}