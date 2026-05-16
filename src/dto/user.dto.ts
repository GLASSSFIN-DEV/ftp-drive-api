import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UserNewDto {
    @IsString()
    @IsNotEmpty()
    username!: string;

    @IsString()
    @IsOptional()
    fullname?: string;

    @IsString()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsNotEmpty()
    dirId!: string;

    @IsString()
    @IsNotEmpty()
    rbacId!: string;

    @IsOptional()
    @IsString()
    provider!: string;
}

export class UserChangeDto {
    @IsString()
    @IsOptional()
    fullname?: string;

    @IsString()
    @IsNotEmpty()
    dirId!: string;

    @IsString()
    @IsNotEmpty()
    rbacId!: string;
}