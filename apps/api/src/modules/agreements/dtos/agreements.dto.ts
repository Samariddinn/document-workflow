import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";

export class AgreementsListDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset?: number;
}

export class AgreementRejectDto {
    @IsString()
    @Matches(/\S/, { message: 'reject_reason must not be blank' })
    @MaxLength(1000)
    reject_reason: string;
}