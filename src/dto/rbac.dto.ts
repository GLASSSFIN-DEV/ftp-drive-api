import { JsonObject } from "@prisma/client/runtime/client";
import { IsJSON, IsString } from "class-validator";

export class RbacNewDto {
    @IsString()
    name!: string;

    @IsJSON()
    value!: JsonObject;
}