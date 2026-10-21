import { PartialType } from "@nestjs/mapped-types";
import { CreateUserDto } from "./user-create.dto.js";

export class UserUpdateDto extends PartialType(CreateUserDto) {
}