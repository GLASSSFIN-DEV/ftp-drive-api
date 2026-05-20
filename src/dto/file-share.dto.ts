import { IsDate, IsNotEmpty, IsEnum, IsOptional, IsString } from "class-validator";
import { SharePermission } from "../generated/prisma/enums.js";

export class FileSharingNewDto {
    @IsString()
    @IsNotEmpty()
    fileId!: string;

    @IsString()
    @IsNotEmpty()
    toAccountId!: string;

    @IsEnum(SharePermission)
    @IsOptional()
    permission!: SharePermission;

    @IsDate()
    expiredAt!: Date
}
