'use client';

const TOKEN_KEY = 'trailnest_token';
const OWNER_KEY = 'trailnest_owner';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getOwner() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(OWNER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(token, owner) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(OWNER_KEY, JSON.stringify(owner));
  window.dispatchEvent(new Event('trailnest-auth-change'));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(OWNER_KEY);
  window.dispatchEvent(new Event('trailnest-auth-change'));
}
