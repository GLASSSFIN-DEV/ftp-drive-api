import { JsonValue } from "@prisma/client/runtime/client";

export interface IAccount {
    id: string;
    username: string;
    fullname?: string;
    email: string;
    provider: string;
    rbacId: string;
    rbacName: string;
    rbac: JsonValue;
}

declare module 'hono' {
    interface ContextVariableMap {
        account: IAccount;
        validatedBody: unknown
    }
}

export {}