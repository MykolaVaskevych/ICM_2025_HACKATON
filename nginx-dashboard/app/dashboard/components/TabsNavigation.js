'use client';

import { useState, useEffect } from 'react';
import { getStorageItem, setStorageItem } from '../../utils/storage';

export default function TabsNavigation({
  tabs,
  activeTab,
  onChange,
  className = '',
}) {
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage or props
  useEffect(() => {
    setMounted(true);
    // If no active tab was passed, try loading from localStorage
    if (!activeTab) {
      const savedTab = getStorageItem('activeTab');
      if (savedTab && tabs.find(tab => tab.id === savedTab)) {
        onChange(savedTab);
      }
    }
  }, [activeTab, onChange, tabs]);

  // Handler for tab change with localStorage persistence
  const handleTabChange = (tabId) => {
    onChange(tabId);
    setStorageItem('activeTab', tabId);
  };

  // Don't render tabs until client-side hydration is complete
  if (!mounted) {
    return <div className="h-12 bg-gray-100 dark:bg-gray-800 animate-pulse rounded mb-6"></div>;
  }

  return (
    <div className={`border-b border-gray-200 dark:border-gray-700 mb-6 ${className}`}>
      <nav className="-mb-px flex space-x-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`
              whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
              ${tab.id === activeTab
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
              }
            `}
            aria-current={tab.id === activeTab ? 'page' : undefined}
          >
            <span className="flex items-center">
              {tab.icon && (
                <span className="mr-2">{tab.icon}</span>
              )}
              {tab.name}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}