import { UserRoleEnum } from "../../users/types/users.types.js";

export interface AuthUser {
    id: string;
    role: UserRoleEnum;
    org_id: string | null;
    first_name: string;
    middle_name: string;
    last_name: string;
}