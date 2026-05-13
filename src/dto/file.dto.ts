import { IsInt, IsString } from "class-validator";

export class FileNewDto {
    // create auto check to db for this decorator?
    @IsString()
    folderId!: string;

    @IsString()
    fileName!: string;

    @IsInt()
    fileSize!: number;

    @IsString()
    fileType!: string;
}

export class FileChangeDto {
    @IsString()
    folderId!: string;

    @IsString()
    fileName!: string;

    @IsInt()
    fileSize!: number;

    @IsString()
    fileType!: string;
}