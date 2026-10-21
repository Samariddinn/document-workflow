import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class OrganizationCreateDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(200)
    @Matches(/\S/, { message: 'name must not be blank' })
    name: string;

    @IsNotEmpty()
    @MaxLength(9)
    @MinLength(9)
    @Matches(/^\d{9}$/, { message: 'TIN must be exactly 9 digits' })
    tin: string;
}