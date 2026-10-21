import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { JwtPayload } from "../auth/types/jwt-payload.types.js";

/**
 * Injects the authenticated user (the JWT payload set by AuthGuard) into a route handler.
 *
 * @CurrentUser() user: JwtPayload      -> the whole payload
 * @CurrentUser('sub') userId: string   -> a single field
 *
 * Only use on routes protected by AuthGuard; otherwise it is undefined.
 */
export const CurrentUser = createParamDecorator(
    (field: keyof JwtPayload | undefined, context: ExecutionContext) => {
        const { user } = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
        return field ? user?.[field] : user;
    },
);
