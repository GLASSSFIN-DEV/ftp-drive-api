import { IsEmpty, IsNumber, IsString } from "class-validator";

export class MediaDropDto {
    @IsString()
    @IsEmpty()
    fileName!: string;

    @IsString()
    remotePath!: string;

    @IsNumber()
    site!: number;
}

export class MediaStreamDto {
    @IsString()
    @IsEmpty()
    fileName!: string;

    @IsString()
    remotePath!: string;

    @IsNumber()
    site!: number;
}