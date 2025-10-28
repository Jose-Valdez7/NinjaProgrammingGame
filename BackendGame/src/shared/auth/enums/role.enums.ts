// Re-export Role enum from Prisma to maintain consistency with database schema
import { UserRole } from '@prisma/client';
export { UserRole as Role };

// Utility function for runtime role validation and type narrowing
export const isValidRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
};

// Role hierarchy for authorization logic (optional)
export const ROLE_HIERARCHY = {
  [UserRole.ADMIN]: 1,
  [UserRole.USER]: 2,
} as const;

// Helper to check if a role has sufficient permissions
export const hasMinimumRole = (
  userRole: UserRole,
  requiredRole: UserRole,
): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};
