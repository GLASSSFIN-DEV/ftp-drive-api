import { sign } from 'hono/jwt';
import { JWTPayload } from "hono/utils/jwt/types";
import { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { env } from '../../config.js';
import { HttpException } from '../../common/http-exception.js';
import { prismaProxy } from '../../lib/prisma.js';
import { IOkResponse } from '../../types/common.js';

interface IRepositoryAuth {
    logout(c: Context): Promise<IOkResponse>;
    refresh(c: Context): Promise<ResObj>;
    users(c: Context): Promise<IUserObj[]>;
}

interface IUserObj {
    id: string;
    username: string;
    fullname: string | null;
    email: string | null;
}

export interface ResObj {
    accessToken: string;
    refreshToken: string;
    expireAt: string;
    basePath?: string;
    [key: string]: unknown
}

export class Auth implements IRepositoryAuth {
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

        return { statusCode: StatusCodes.OK, messages: ['Logged out!'] }
    }

    /**
     * 
     * @param c 
     */
    async refresh(c: Context): Promise<ResObj> {
        const account = c.get('account')
        const find = await prismaProxy.account.findFirst({ where: { id: account.id } })

        if (!find) throw new HttpException({
            errCode: 'ACCOUNT_NOT_FOUND',
            statusCode: 404,
            messages: ['Your account isn`t found']
        })

        const _o: JWTPayload = { sub: account.id, role: account.rbacId }
        const accessToken = await sign(_o, env.JWT_SECRET, 'HS256')
        const refreshToken = await sign({ sub: account.id }, env.JWT_SECRET, 'HS256')

        await prismaProxy.$transaction(async (tx) => {
            await tx.session.create({ data: { accountId: account.id, jwtHash: accessToken, recordStatus: 'ACTIVE' } })
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
     */
    async users(c: Context): Promise<IUserObj[]> {
        const items: IUserObj[] = await prismaProxy.account.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                fullname: true,
            }
        })

        return items
    }
}
