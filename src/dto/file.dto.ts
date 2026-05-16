import { IsEmpty, IsInt, IsNumber, IsString } from "class-validator";

export class FileNewDto {
    // create auto check to db for this decorator?
    @IsString()
    folderId!: string;

    @IsString()
    @IsEmpty()
    fileName!: string;

    @IsInt()
    fileSize!: number;

    @IsString()
    fileType!: string;

    @IsNumber()
    siteId!: number;
}

export class FileChangeDto {
    @IsString()
    folderId!: string;

    @IsString()
    @IsEmpty()
    fileName!: string;

    @IsNumber()
    siteId!: number;
}