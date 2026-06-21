import { IsNotEmpty, IsInt, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";

export class FileNewDto {
    // create auto check to db for this decorator?
    @IsString()
    @IsNotEmpty()
    folderId!: string;

    @IsString()
    @IsNotEmpty()
    fileName!: string;

    @IsInt()
    fileSize!: number;

    @IsString()
    fileType!: string;

    @IsNumber()
    @IsPositive()
    siteId!: number;

    @IsString()
    @IsOptional()
    ftpHost?: string;
}

export class FileChangeDto {
    @IsString()
    @IsNotEmpty()
    folderId!: string;

    @IsString()
    @IsNotEmpty()
    fileName!: string;

    @IsNumber()
    @IsPositive()
    siteId!: number;

    @IsString()
    @IsOptional()
    ftpHost?: string;
}