'use client';

import React from 'react';

// Simple components to replace the UI kit

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`p-6 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`p-6 pt-0 border-t border-gray-200 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
}

export function Button({ children, onClick, disabled, className = '', variant = 'default' }) {
  const baseClasses = 'px-4 py-2 rounded-md text-sm font-medium';
  const variantClasses = {
    default: 'bg-indigo-600 text-white hover:bg-indigo-700',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'bg-transparent border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
  };
  
  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.default} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function Badge({ children, className = '', variant = 'default' }) {
  const variantClasses = {
    default: 'bg-indigo-600 text-white',
    success: 'bg-green-600 text-white',
    destructive: 'bg-red-600 text-white'
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variantClasses[variant] || variantClasses.default} ${className}`}>
      {children}
    </span>
  );
}

export function Alert({ children, className = '', variant = 'default' }) {
  const variantClasses = {
    default: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300',
    destructive: 'bg-red-50 dark:bg-red-900/10 border-red-500/50 text-red-700 dark:text-red-300',
    success: 'bg-green-50 dark:bg-green-900/10 border-green-500/50 text-green-700 dark:text-green-300'
  };
  
  return (
    <div className={`p-4 border rounded-lg ${variantClasses[variant] || variantClasses.default} ${className}`} role="alert">
      {children}
    </div>
  );
}

export function AlertTitle({ children, className = '' }) {
  return (
    <h5 className={`text-base font-medium mb-1 ${className}`}>{children}</h5>
  );
}

export function AlertDescription({ children, className = '' }) {
  return (
    <div className={`text-sm ${className}`}>{children}</div>
  );
}