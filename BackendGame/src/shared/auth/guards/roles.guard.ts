import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // Si no hay role requeridos, permite el acceso
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false; // No hay usuario autenticado
    }

    const userRoles: string[] = Array.isArray(user.role)
      ? user.role
      : user.role
      ? [user.role]
      : [];

    if (userRoles.length === 0) {
      return false; // El usuario no tiene role
    }

    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
