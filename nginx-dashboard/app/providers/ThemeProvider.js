'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export const ThemeContext = createContext({
  darkMode: false,
  toggleDarkMode: () => {}
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
    // Only run on client
    if (typeof window === 'undefined') return;
    
    setMounted(true);
    
    try {
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
    } catch (error) {
      console.error('Error accessing theme preferences:', error);
    }
  }, []);
  
  // Don't render children until after client-side hydration is complete
  if (!mounted) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
        {/* Render a skeleton version of your UI while waiting for client-side hydration */}
        <div className="h-screen flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-16 w-16"></div>
            <div className="mt-4 h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
            <div className="mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}