import { ArrayMaxSize, ArrayUnique, IsArray, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";
import { Transform } from "class-transformer";

export class FolderNewDto {
    @IsString()
    @IsNotEmpty()
    folderName!: string;

    @IsString()
    @IsOptional()
    parentId?: string;

    @IsArray()
    @ArrayUnique()
    @IsOptional()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    @Transform(({ value }) =>
        Array.isArray(value)
            ? value
                .map((v) => String(v).trim())
                .filter(Boolean)
            : []
    )
    label?: string[] = []

    @IsNumber()
    @IsPositive()
    siteId!: number;

    @IsString()
    @IsOptional()
    ftpHost?: string;
}

export class FolderChangeDto {
    @IsString()
    @IsNotEmpty()
    folderName!: string;

    @IsString()
    @IsOptional()
    parentId?: string;

    @IsArray()
    @ArrayUnique()
    @IsOptional()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    @Transform(({ value }) =>
        Array.isArray(value)
            ? value
                .map((v) => String(v).trim())
                .filter(Boolean)
            : []
    )
    label?: string[] = []

    @IsNumber()
    @IsPositive()
    siteId!: number;

    @IsString()
    @IsOptional()
    ftpHost?: string;
}