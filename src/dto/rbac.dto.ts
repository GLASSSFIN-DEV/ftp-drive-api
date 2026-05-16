import { JsonObject } from "@prisma/client/runtime/client";
import { IsEmpty, IsJSON, IsString } from "class-validator";

export class RbacNewDto {
    @IsString()
    @IsEmpty()
    name!: string;

    @IsJSON()
    value!: JsonObject;
}