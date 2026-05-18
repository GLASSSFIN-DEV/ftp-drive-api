import { IsNumber, IsString, IsOptional, IsUUID } from "class-validator";

export class PageQueryDto {
    @IsNumber()
    page: number = 1;

    @IsNumber()
    pageSize: number = 25;

    @IsString()
    @IsOptional()
    keyword?: string
} 

export class UuidDto {
    @IsUUID()
    id!: string;
}