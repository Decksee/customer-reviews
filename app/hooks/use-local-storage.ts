import { useState, useEffect } from "react";
import { isBrowser, getLocalStorageItem, setLocalStorageItem } from "~/utils/browser.client";

export function useLocalStorage<T>(key: string, initialValue: T) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    // For SSR, return the initial value on first render
    if (!isBrowser) return initialValue;
    
    // Get from local storage by key
    return getLocalStorageItem(key, initialValue);
  });

  // Set up effect to sync localStorage when the component mounts
  // This ensures we only access localStorage after the component is mounted client-side
  useEffect(() => {
    // Get from local storage by key
    const item = getLocalStorageItem(key, initialValue);
    
    // If value in storage is different from the initial state, update the state
    if (JSON.stringify(item) !== JSON.stringify(storedValue)) {
      setStoredValue(item);
    }
  }, [key, initialValue]);
  
  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to local storage, but only if we're in the browser
      if (isBrowser) {
        setLocalStorageItem(key, valueToStore);
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.error(error);
    }
  };

  const clearValue = () => {
    setStoredValue(initialValue);
    if (isBrowser) {
      setLocalStorageItem(key, initialValue);
    }
  };

  return [storedValue, setValue, clearValue] as const;
} 