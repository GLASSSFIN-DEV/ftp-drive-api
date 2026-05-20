import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";

export class MediaDropDto {
    @IsString()
    @IsNotEmpty()
    fileName!: string;

    @IsString()
    @IsNotEmpty()
    remotePath!: string;

    @IsNumber()
    @IsPositive()
    site!: number;
}

export class MediaStreamDto {
    @IsString()
    @IsNotEmpty()
    fileName!: string;

    @IsString()
    @IsNotEmpty()
    remotePath!: string;

    @IsNumber()
    @IsPositive()
    site!: number;
}

export class MediaFolderUpload {
    @IsString()
    @IsOptional()
    folderId!: string;

    @IsNumber()
    @IsPositive()
    siteId!: number;
}