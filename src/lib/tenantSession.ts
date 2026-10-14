import type { Tenant } from '../types';

/**
 * Single organizer session shared by every tab in the browser.
 *
 * Stored in localStorage (not sessionStorage), so:
 *  - Opening /admin/tenant in a new tab loads the already-logged-in organizer.
 *  - Only one organizer can be logged in per browser at a time.
 *  - Logging in / out in one tab is instantly reflected in all other tabs.
 */
const KEY = 'mv_tenant_auth';

export const getTenantSession = (): Tenant | null => {
  if (typeof window === 'undefined') return null;
  try {
    // One-time migration from the old per-tab sessionStorage session.
    const legacy = sessionStorage.getItem(KEY);
    if (legacy && !localStorage.getItem(KEY)) localStorage.setItem(KEY, legacy);
    if (legacy) sessionStorage.removeItem(KEY);

    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Tenant) : null;
  } catch {
    return null;
  }
};

export const setTenantSession = (tenant: Tenant): void => {
  localStorage.setItem(KEY, JSON.stringify(tenant));
};

export const clearTenantSession = (): void => {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
};

/** Fires when another tab logs in, switches cinema, or logs out. */
export const onTenantSessionChange = (cb: (tenant: Tenant | null) => void): (() => void) => {
  const handler = (e: StorageEvent) => {
    if (e.key !== KEY && e.key !== null) return;
    cb(getTenantSession());
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
};
