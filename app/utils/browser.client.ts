/**
 * Safely checks if code is running in a browser environment
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Safely get item from localStorage with fallback for server-side rendering
 * @param key The localStorage key
 * @param defaultValue Optional default value if key doesn't exist
 * @returns The stored value or default value
 */
export function getLocalStorageItem(key: string, defaultValue: any = null): any {
  if (!isBrowser) return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage: ${error}`);
    return defaultValue;
  }
}

/**
 * Safely set item in localStorage with fallback for server-side rendering
 * @param key The localStorage key
 * @param value The value to store
 * @returns True if successful, false otherwise
 */
export function setLocalStorageItem(key: string, value: any): boolean {
  if (!isBrowser) return false;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage: ${error}`);
    return false;
  }
}

/**
 * Safely remove item from localStorage with fallback for server-side rendering
 * @param key The localStorage key to remove
 * @returns True if successful, false otherwise
 */
export function removeLocalStorageItem(key: string): boolean {
  if (!isBrowser) return false;
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage: ${error}`);
    return false;
  }
}

/**
 * Generate a robust device identifier that's consistent for the same device/browser
 * Uses multiple browser characteristics and hardware info for uniqueness
 * @returns A unique device identifier string
 */
export function getDeviceIdentifier(): string {
  if (!isBrowser) return 'server';
  
  const storageKey = 'deviceIdentifier';
  let deviceId = getLocalStorageItem(storageKey);
  
  if (!deviceId) {
    // Collect extensive device fingerprinting data
    const components = [
      // Browser info
      navigator.userAgent,
      navigator.language,
      navigator.languages?.join(','),
      navigator.platform,
      navigator.vendor,
      
      // Screen properties
      `${screen.width}x${screen.height}`,
      `${screen.availWidth}x${screen.availHeight}`,
      screen.colorDepth,
      screen.pixelDepth,
      
      // System info
      new Date().getTimezoneOffset(),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      
      // Hardware info
      navigator.hardwareConcurrency,
      
      // Browser capabilities
      navigator.cookieEnabled,
      'serviceWorker' in navigator,
      'localStorage' in window,
      'indexedDB' in window,
      'FileReader' in window,
      'WebSocket' in window,
      
      // Canvas fingerprinting
      (() => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return '';
          
          // Draw some shapes and text
          canvas.width = 200;
          canvas.height = 50;
          ctx.textBaseline = 'top';
          ctx.font = '14px Arial';
          ctx.fillStyle = '#f60';
          ctx.fillRect(125,1,62,20);
          ctx.fillStyle = '#069';
          ctx.fillText('Fingerprint', 2, 15);
          ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
          ctx.fillText('Canvas', 4, 17);
          
          return canvas.toDataURL();
        } catch {
          return '';
        }
      })(),
      
      // Additional entropy
      Date.now(),
      Math.random()
    ].filter(Boolean); // Remove any undefined values
    
    // Create SHA-256 hash of the components
    const hashString = components.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(hashString);
    
    // Use SubtleCrypto if available, fallback to simple hash
    if (window.crypto && window.crypto.subtle) {
      window.crypto.subtle.digest('SHA-256', data).then((hashBuffer) => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        deviceId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        setLocalStorageItem(storageKey, deviceId);
      });
    } else {
      // Simple fallback hash if crypto API is not available
      deviceId = components.reduce((acc, component) => {
        let hash = 0;
        for (let i = 0; i < component.toString().length; i++) {
          const char = component.toString().charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return acc + Math.abs(hash).toString(16);
      }, '');
      setLocalStorageItem(storageKey, deviceId);
    }
  }
  
  return deviceId;
}