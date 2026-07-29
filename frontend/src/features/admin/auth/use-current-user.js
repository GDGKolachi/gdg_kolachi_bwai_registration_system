import { useSyncExternalStore } from 'react';
import { getCurrentUserSnapshot, subscribeToAuth } from './auth-service';
import { ROLES } from './roles';

function serverSnapshot() {
  return null;
}

// Reads the signed-in admin without every view re-parsing localStorage, and
// re-renders when the session changes (login, logout, another tab).
export function useCurrentUser() {
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUserSnapshot, serverSnapshot);
  const role = user?.role ?? null;
  return {
    user,
    role,
    isSuperAdmin: role === ROLES.SUPER_ADMIN,
    isOrganizer: role === ROLES.ORGANIZER,
    isVolunteer: role === ROLES.VOLUNTEER,
    hasRole: (...roles) => !!role && roles.flat().includes(role),
  };
}

export default useCurrentUser;
