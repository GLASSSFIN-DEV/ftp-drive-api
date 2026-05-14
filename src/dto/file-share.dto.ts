import { SharePermission } from "@/generated/prisma/enums";
import { IsDate, IsEnum, IsOptional, IsString } from "class-validator";

export class FileSharingNewDto {
    @IsString()
    fileId!: string;

    @IsString()
    toAccountId!: string;

    @IsEnum(SharePermission)
    @IsOptional()
    permission!: SharePermission;

    @IsDate()
    expiredAt!: Date
}
