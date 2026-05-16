import { IsEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class FolderNewDto {
    @IsString()
    @IsEmpty()
    folderName!: string;

    @IsString()
    @IsOptional()
    parentId?: string;

    @IsNumber()
    siteId!: number;
}

export class FolderChangeDto {
    @IsString()
    @IsEmpty()
    folderName!: string;

    @IsString()
    @IsOptional()
    parentId?: string;

    @IsNumber()
    siteId!: number;
}