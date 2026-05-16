import { IsNotEmpty, IsNumber, IsPositive, IsString } from "class-validator";

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