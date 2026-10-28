import { PartialType, PickType } from "@nestjs/mapped-types";
import { Type } from "class-transformer";
import {
    ArrayMaxSize,
    ArrayMinSize,
    ArrayNotEmpty,
    ArrayUnique,
    IsArray,
    IsInt,
    IsNotEmpty,
    isNumber,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    Max,
    MaxLength,
    Min,
} from "class-validator";

export class DocumentCreateDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(150)
    @Matches(/\S/, { message: 'description must not be blank' })
    description: string;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(10)
    @ArrayUnique()
    @IsUUID(undefined, { each: true })
    main_file_ids: string[];

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @ArrayUnique()
    @IsUUID(undefined, { each: true })
    additional_file_ids?: string[];

    @IsNotEmpty()
    @IsString()
    document_number: string;
}

export class DocumentUpdateDto extends DocumentCreateDto {}

export class DocumentListDto {
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

export class DocumentSubmitDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({each: true})
    @IsNotEmpty({each: true})
    
    approver_ids: string[];
}