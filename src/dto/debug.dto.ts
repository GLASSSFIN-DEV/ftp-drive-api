import { IsNotEmpty, IsString } from "class-validator";

export class DebugFolderExistDto {
    @IsString()
    @IsNotEmpty()
    remotePath!: string;
}