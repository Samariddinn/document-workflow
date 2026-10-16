import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { UserRoleEnum } from "../users/types/users.types.js";
import { JwtPayload } from "../auth/types/jwt-payload.types.js";

@Injectable()
export class RoleGuard implements CanActivate {
    @Inject(Reflector) private reflector: Reflector;

    canActivate(context: ExecutionContext) {
        const allowedRoles = this.reflector.getAllAndOverride<UserRoleEnum[] | undefined>('roles', [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!allowedRoles?.length) return true;

        const { user } = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();

        if (!user || !allowedRoles.includes(user.role)) {
            throw new ForbiddenException('You do not have permission to access this resource');
        }

        return true;
    }
}
