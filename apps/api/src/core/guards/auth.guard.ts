import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from "../auth/types/jwt-payload.types.js";
import type { Request } from 'express';


@Injectable()
export class AuthGuard implements CanActivate {
    @Inject(JwtService) jwtService: JwtService;
    
    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
        const [type, token] = request?.headers?.authorization?.split(' ') ?? [];
        console.log(type, token, "HERE AUTH GUUARD")
        if (type !== 'Bearer' || !token) throw new UnauthorizedException();

        console.log('VERFYING USER')

        // Verify the user
        try {
        request.user = await this.jwtService.verifyAsync(token)
        } catch (err) {
         throw new UnauthorizedException();
        }

        return true;
        
    }
}