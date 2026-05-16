import { IsNumber, IsOptional, IsString } from "class-validator";

export class FolderNewDto {
    @IsString()
    folderName!: string;

    @IsString()
    @IsOptional()
    parentId?: string;

    @IsNumber()
    siteId!: number;
}

export class FolderChangeDto {
    @IsString()
    folderName!: string;

    @IsString()
    @IsOptional()
    parentId?: string;

    @IsNumber()
    siteId!: number;
}