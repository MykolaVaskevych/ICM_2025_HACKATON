'use client';

/**
 * Safely retrieves an item from localStorage with error handling
 * Only runs on the client-side
 */
export function getStorageItem(key, defaultValue = null) {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  
  try {
    const item = localStorage.getItem(key);
    return item !== null ? item : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Safely sets an item in localStorage with error handling
 * Only runs on the client-side
 */
export function setStorageItem(key, value) {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Safely removes an item from localStorage with error handling
 * Only runs on the client-side
 */
export function removeStorageItem(key) {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Get a boolean value from localStorage
 */
export function getStorageBool(key, defaultValue = false) {
  const value = getStorageItem(key);
  if (value === null) return defaultValue;
  return value === 'true';
}

/**
 * Set a boolean value in localStorage
 */
export function setStorageBool(key, value) {
  return setStorageItem(key, value.toString());
}