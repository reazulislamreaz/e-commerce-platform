import { Role } from '@prisma/client';

/**
 * Role hierarchy policy — the single source of truth for who may manage whom.
 *
 * - SUPER_ADMIN manages ADMIN and CUSTOMER accounts. Other SUPER_ADMIN
 *   accounts are never manageable through the API.
 * - ADMIN manages CUSTOMER accounts only.
 * - Nobody manages their own account through admin endpoints (prevents
 *   self-suspension lockouts).
 * - SUPER_ADMIN can never be assigned through the API.
 */
const MANAGEABLE_ROLES: Record<Role, readonly Role[]> = {
  [Role.SUPER_ADMIN]: [Role.ADMIN, Role.CUSTOMER],
  [Role.ADMIN]: [Role.CUSTOMER],
  [Role.CUSTOMER]: [],
};

export function canManage(actorRole: Role, targetRole: Role): boolean {
  return MANAGEABLE_ROLES[actorRole].includes(targetRole);
}

/** Roles that may be assigned via the role-change endpoint, per actor. */
export function canAssignRole(actorRole: Role, newRole: Role): boolean {
  if (newRole === Role.SUPER_ADMIN) return false;
  return actorRole === Role.SUPER_ADMIN;
}
