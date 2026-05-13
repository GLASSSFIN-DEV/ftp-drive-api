import { SharePermission } from "@/generated/prisma/enums";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class FolderSharingNewDto {
    @IsString()
    folderId!: string;
    
    @IsString()
    toAccountId!: string;

    @IsEnum(SharePermission)
    @IsOptional()
    permission!: SharePermission;
}
