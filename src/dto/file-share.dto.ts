import { SharePermission } from "@/generated/prisma/enums";
import { IsDate, IsNotEmpty, IsEnum, IsOptional, IsString } from "class-validator";

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
