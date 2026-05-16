import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";

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