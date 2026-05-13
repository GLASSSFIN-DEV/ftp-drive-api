import { SubmissionAction } from "@/generated/prisma/enums";
import { IsEnum, IsString } from "class-validator";

export class SubmissionResolveDto {
    @IsString()
    verificationCode!: string;

    @IsEnum(SubmissionAction)
    subAction!: SubmissionAction 
}