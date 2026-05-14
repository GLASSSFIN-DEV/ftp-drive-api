import { HttpException } from "@/common/http-exception";
import { LoginDto } from "@/dto/login.dto";
import prismaProxy from "@/lib/prisma";
import { sign } from 'hono/jwt';
import { env } from '@/config';
import { JWTPayload } from "hono/utils/jwt/types";
import { decodeBase64 } from "hono/utils/encode";
import { Context } from "hono";
import { InputJsonValue } from "@prisma/client/runtime/client";
import { IOkResponse } from "@/types/common";

interface IRepositoryAuth {
    login(c: Context): Promise<ResObj>;
    logout(c: Context): Promise<IOkResponse>;
    refresh(c: Context): Promise<ResObj>;
}

export interface ResObj {
    accessToken: string;
    refreshToken: string;
    expireAt: string;
    basePath?: string;
}

export class Auth implements IRepositoryAuth {
    /**
     * 
     * @param c
     * @returns 
     */
    async login(c: Context): Promise<ResObj> {
        const obj: LoginDto = c.get('validatedBody') as LoginDto
        const account = await prismaProxy.account.findFirst({
            where: {
                username: obj.username.toLowerCase(),
                recordStatus: 'ACTIVE'
            }
        })

        if (!account) throw new HttpException({
            errCode: 'ACCOUNT_NOT_FOUND',
            statusCode: 404,
            messages: ['Your account isn`t found']
        })

        const _o: JWTPayload = { sub: account.id, role: account.rbacId }
        const accessToken = await sign(_o, env.JWT_EXPIRE)
        const refreshToken = await sign({ sub: account.id }, '1d')

        await prismaProxy.$transaction(async (tx) => {
            await tx.session.create({ data: { accountId: account.id, jwtHash: decodeBase64(accessToken).toBase64() } })
            await tx.traceSpan.create({
                data: {
                    traceId: c.get('traceId'),
                    json: { obj, account } as unknown as InputJsonValue,
                    context: `[body]`,
                    durationMs: 0,
                }
            })
        })

        return {
            accessToken,
            refreshToken,
            expireAt: env.JWT_EXPIRE
        } satisfies ResObj
    }

    /**
     * 
     * @param c 
     * @returns 
     */
    async logout(c: Context): Promise<IOkResponse> {
        const account = c.get('account')
        await prismaProxy.session.updateMany({
            data: { recordStatus: 'NOT_ACTIVE' },
            where: { accountId: account.id, recordStatus: 'ACTIVE' }
        })

        return { statusCode: 200, messages: ['Logged out!'] } 
    }

    /**
     * 
     * @param c 
     */
    async refresh(c: Context): Promise<ResObj> {
        return { 
            accessToken: "",
            refreshToken: "",
            expireAt: '1d'
        }
    }
}
