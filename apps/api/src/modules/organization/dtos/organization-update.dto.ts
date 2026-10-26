import { PartialType } from "@nestjs/mapped-types";
import { OrganizationCreateDto } from "./organization-create.dto.js";

export class OrganizationUpdateDto extends PartialType(OrganizationCreateDto) {}