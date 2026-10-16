import { UserRoleEnum } from '../../users/types/users.types.js';

export interface JwtPayload {
  sub: string;
  role: UserRoleEnum;
  first_name: string;
  middle_name: string;
  last_name: string;
  iat?: number;
  exp?: number;
}
