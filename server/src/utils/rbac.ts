/**
 * Role-Based Access Control (RBAC) Utility
 *
 * Central source of truth for all role constants and Prisma filter helpers.
 * - `agent`  → standard user, scoped to their own records only
 * - `staff`  → internal employee, global read/write visibility
 * - `admin`  → super-admin, equivalent to staff for ownership scoping
 */

export const UserRole = {
    admin: 'admin',
    agent: 'agent',
    staff: 'staff',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

/**
 * Returns a Prisma `where` clause fragment for ownership filtering.
 *
 * - Staff and Admin: returns `{}` — no userId constraint, global visibility.
 * - Agent (any other role): returns `{ userId }` — scoped to their own records only.
 *
 * @example
 * const where = { ...ownerFilter(userId, role), deletedAt: null };
 */
export function ownerFilter(userId: string, role: string): { userId?: string } {
    if (role === UserRole.staff || role === UserRole.admin) {
        return {};
    }
    return { userId };
}

/**
 * Same as ownerFilter but additionally includes a deletedAt: null guard.
 * Convenience helper for soft-delete patterns.
 */
export function activeOwnerFilter(userId: string, role: string): { userId?: string; deletedAt: null } {
    return { ...ownerFilter(userId, role), deletedAt: null };
}

/**
 * Returns true if the user has staff-level or higher access.
 */
export function isStaffOrAbove(role: string): boolean {
    return role === UserRole.staff || role === UserRole.admin;
}
