import { JsonValue } from "@prisma/client/runtime/client";
import { TimingVariables } from "hono/timing";
import { Redis } from "ioredis";

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
        redis: Redis;
        timingVariable: TimingVariables
    }
}

export {}