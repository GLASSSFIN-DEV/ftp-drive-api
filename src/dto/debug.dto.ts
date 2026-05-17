import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class DebugFolderExistDto {
    @IsString()
    @IsNotEmpty()
    remotePath!: string;
}

export class SiteId {
    @IsNumber()
    siteId!: number;
}