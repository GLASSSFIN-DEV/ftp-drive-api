import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from "class-validator";

export class FolderNewDto {
    @IsString()
    @IsNotEmpty()
    folderName!: string;

    @IsString()
    @IsOptional()
    parentId?: string;

    @IsNumber()
    @IsPositive()
    siteId!: number;
}

export class FolderChangeDto {
    @IsString()
    @IsNotEmpty()
    folderName!: string;

    @IsString()
    @IsOptional()
    parentId?: string;

    @IsNumber()
    @IsPositive()
    siteId!: number;
}

export class FolderIdDto {
    @IsUUID()
    id!: string;
}