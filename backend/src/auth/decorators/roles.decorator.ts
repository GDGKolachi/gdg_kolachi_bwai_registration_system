import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../../common/enums/admin-role.enum';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the given admin roles. Used with RolesGuard, which is
 * registered alongside JwtAuthGuard. A route with no @Roles() is reachable by
 * any authenticated admin.
 */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
