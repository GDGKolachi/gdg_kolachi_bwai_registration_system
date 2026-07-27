import { ROLES } from './roles';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

// Fired whenever the stored session changes so hooks in the same tab re-render
// (the native 'storage' event only fires in *other* tabs).
const AUTH_EVENT = 'admin-auth-changed';

// Sessions created before roles existed carry a token but no stored user.
// The backend treats those tokens as super admins, so the UI must agree —
// otherwise a signed-in admin would lose their own panel mid-session.
const LEGACY_USER = { id: null, email: '', name: 'Admin', role: ROLES.SUPER_ADMIN };

function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  notifyAuthChanged();
}

export function saveCurrentUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
  notifyAuthChanged();
}

// Convenience for the login response: { access_token, user }
export function saveSession({ access_token, user }) {
  localStorage.setItem(TOKEN_KEY, access_token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
  notifyAuthChanged();
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

// Returns null when nobody is signed in, otherwise always a usable user object.
export function getCurrentUser() {
  if (!getToken()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return LEGACY_USER;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return LEGACY_USER;
    return { ...LEGACY_USER, ...parsed, role: parsed.role || LEGACY_USER.role };
  } catch {
    return LEGACY_USER;
  }
}

export function getRole() {
  return getCurrentUser()?.role ?? null;
}

// hasRole('super_admin', 'organizer') or hasRole(['super_admin', 'organizer'])
export function hasRole(...roles) {
  const role = getRole();
  if (!role) return false;
  const allowed = roles.flat();
  return allowed.length === 0 || allowed.includes(role);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthChanged();
}

export function subscribeToAuth(listener) {
  window.addEventListener(AUTH_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(AUTH_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

// useSyncExternalStore needs a referentially stable snapshot, so only rebuild
// the user object when what is actually stored changes.
let snapshotKey = null;
let snapshotValue = null;

export function getCurrentUserSnapshot() {
  const key = `${getToken() ?? ''}|${localStorage.getItem(USER_KEY) ?? ''}`;
  if (key !== snapshotKey) {
    snapshotKey = key;
    snapshotValue = getCurrentUser();
  }
  return snapshotValue;
}
