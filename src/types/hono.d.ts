import { JsonValue } from "@prisma/client/runtime/client";

export interface IAccount {
    id: string;
    username: string;
    fullname?: string | null;
    email?: string | null;
    provider: string;
    rbacId?: string | null;
    rbacName?: string | null;
    rbac?: JsonValue | null;
    homePath: string;
}

declare module 'hono' {
    interface ContextVariableMap {
        account: IAccount;
        validatedBody: unknown;
        traceId: string;
    }
}

export {}