import { IsOptional, IsString } from "class-validator";

export class FolderNewDto {
    @IsString()
    folderName!: string;

    @IsString()
    @IsOptional()
    parentId?: string;
}

export class FolderChangeDto {
    @IsString()
    folderName!: string;

    @IsString()
    @IsOptional()
    parentId?: string;
}