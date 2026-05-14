import { IsNumber, IsString } from "class-validator";

export class MediaDropDto {
    @IsString()
    fileName!: string;

    @IsString()
    remotePath!: string;

    @IsNumber()
    site!: number;
}

export class MediaStreamDto {
    @IsString()
    fileName!: string;

    @IsString()
    remotePath!: string;

    @IsNumber()
    site!: number;
}