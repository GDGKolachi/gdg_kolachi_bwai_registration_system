import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AdminRole, ADMIN_ROLE_LABELS } from '../../common/enums/admin-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // No @Roles() on the route → any authenticated admin may pass.
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.role) {
      throw new ForbiddenException('Your account has no role assigned. Contact a Super Admin.');
    }
    if (!required.includes(user.role)) {
      const allowed = required.map((r) => ADMIN_ROLE_LABELS[r] ?? r).join(' or ');
      throw new ForbiddenException(`This action requires ${allowed} access.`);
    }
    return true;
  }
}
