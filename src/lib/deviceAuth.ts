// src/lib/deviceAuth.ts

// Helper function to set a cookie
function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

// Helper function to get a cookie
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// Fallback UUID generator if crypto.randomUUID is not available
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Gets the current device ID. 
 * Checks localStorage first, then cookies. 
 * If not found in both, generates a new one and saves it.
 */
export function getOrCreateDeviceId(): string {
  const STORAGE_KEY = 'porprov_device_id';
  
  if (typeof window === 'undefined') {
    return 'server-side-device'; // Prevent errors during SSR
  }

  // 1. Check LocalStorage
  let deviceId = localStorage.getItem(STORAGE_KEY);
  
  // 2. Check Cookie if LocalStorage is empty
  if (!deviceId) {
    deviceId = getCookie(STORAGE_KEY);
  }

  // 3. Generate new if both are empty
  if (!deviceId) {
    deviceId = generateUUID();
  }

  // 4. Ensure it's saved in both places (sync)
  localStorage.setItem(STORAGE_KEY, deviceId);
  setCookie(STORAGE_KEY, deviceId, 365); // Save for 1 year

  return deviceId;
}
