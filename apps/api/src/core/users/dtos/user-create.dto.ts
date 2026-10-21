import { IsIn, IsNotEmpty, IsString, IsUUID, MaxLength } from "class-validator";
import { UserRoleEnum } from "../types/users.types.js";

export class CreateUserDto {
    @IsNotEmpty()
    @MaxLength(30)
    username: string;
    
    @IsNotEmpty()
    @IsIn([UserRoleEnum.HEAD, UserRoleEnum.EMPLOYEE])
    role: UserRoleEnum;

    @IsNotEmpty()
    @IsString()
    password: string;

    @IsNotEmpty()
    @IsUUID()
    org_id: string;

    @IsNotEmpty()
    @MaxLength(50)
    first_name: string;

    @MaxLength(50)
    @IsNotEmpty()
    middle_name: string;

    @MaxLength(50)
    @IsNotEmpty()
    last_name: string;
}