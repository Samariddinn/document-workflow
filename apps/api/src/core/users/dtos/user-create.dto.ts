import { IsNotEmpty, IsUUID, MaxLength } from "class-validator";
import { UserRoleEnum } from "../types/users.types.js";

export class CreateUserDto {
    @IsNotEmpty()
    @MaxLength(30)
    username: string;
    
    @IsNotEmpty()
    role: UserRoleEnum;

    @IsNotEmpty()
    password: string;

    @IsNotEmpty()
    @IsUUID()
    org_id: string;

    @IsNotEmpty()
    first_name: string;

    @IsNotEmpty()
    middle_name: string;

    @IsNotEmpty()
    last_name: string;
}