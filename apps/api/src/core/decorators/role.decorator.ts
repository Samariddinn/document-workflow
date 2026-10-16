import { SetMetadata } from "@nestjs/common";
import { UserRoleEnum } from "../users/types/users.types.js";

export const Roles = (...roles: UserRoleEnum[]) => SetMetadata('roles', roles);
