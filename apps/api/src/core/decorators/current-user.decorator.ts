import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { AuthUser } from "../auth/types/auth-user.types.js";

/**
 * Injects the authenticated user (the JWT payload set by AuthGuard) into a route handler.
 *
 * @CurrentUser() user: AuthUser      -> the whole payload
 * @CurrentUser('sub') userId: string   -> a single field
 *
 * Only use on routes protected by AuthGuard; otherwise it is undefined.
 */
export const CurrentUser = createParamDecorator(
    (field: keyof AuthUser | undefined, context: ExecutionContext) => {
        const { user } = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
        return field ? user?.[field] : user;
    },
);
