import { IsDate, IsNotEmpty, IsEnum, IsOptional, IsString } from "class-validator";
import { SharePermission } from "../generated/prisma/enums.js";

export class FolderSharingNewDto {
    @IsString()
    @IsNotEmpty()
    folderId!: string;

    @IsString()
    @IsNotEmpty()
    toAccountId!: string;

    @IsEnum(SharePermission)
    @IsOptional()
    permission!: SharePermission;

    @IsDate()
    expiredAt!: Date
}
