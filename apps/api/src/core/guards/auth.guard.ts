import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from "../auth/types/jwt-payload.types.js";
import type { Request } from 'express';
import { UsersService } from "../users/users.service.js";
import { AuthUser } from "../auth/types/auth-user.types.js";


@Injectable()
export class AuthGuard implements CanActivate {
    @Inject(JwtService) jwtService: JwtService;
    @Inject(UsersService) usersService: UsersService;
    
    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
        const [type, token] = request?.headers?.authorization?.split(' ') ?? [];
        if (type !== 'Bearer' || !token) throw new UnauthorizedException();

        // Verify the user
        let payload: JwtPayload
        try {
        payload = await this.jwtService.verifyAsync(token)
    } catch (err) {
         throw new UnauthorizedException();
        }

        const activeUser = await this.usersService.findActiveById(payload.sub);

        if(!activeUser) throw new UnauthorizedException();

        request.user = activeUser;

        return true;
        
    }
}