import { IsEmpty, IsOptional, IsString } from "class-validator";

export class UserNewDto {
    @IsString()
    @IsEmpty()
    username!: string;

    @IsString()
    @IsOptional()
    fullname?: string;

    @IsString()
    email!: string;

    @IsString()
    dirId!: string;

    @IsString()
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
    dirId!: string;

    @IsString()
    rbacId!: string;
}