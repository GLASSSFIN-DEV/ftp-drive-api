import { JsonObject } from "@prisma/client/runtime/client";
import { IsNotEmpty, IsJSON, IsString } from "class-validator";

export class RbacNewDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsJSON()
    value!: JsonObject;
}