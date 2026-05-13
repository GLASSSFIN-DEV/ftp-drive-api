import { HttpException } from "@/common/http-exception";
import { LoginDto } from "@/dto/login.dto";
import prismaProxy from "@/lib/prisma";
import { sign } from 'hono/jwt';
import { env } from '@/config';
import { JWTPayload } from "hono/utils/jwt/types";
import { decodeBase64 } from "hono/utils/encode";

interface RepositoryAuth<T> {
    login(obj: LoginDto): Promise<T | HttpException>
}

export interface ResObj {
    accessToken: string;
    refreshToken: string;
    expireAt: string;
    basePath?: string;
}

export class Auth implements RepositoryAuth<ResObj> {
    /**
     * 
     * @param obj 
     */
    async login(obj: LoginDto): Promise<ResObj> {
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
        const token = await sign(_o, env.JWT_EXPIRE)

        await prismaProxy.$transaction(async (tx) => {
            await tx.session.create({ data: { accountId: account.id, jwtHash: decodeBase64(token).toBase64() }})
        })

        return {
            accessToken: "",
            refreshToken: "",
            expireAt: ""
        } satisfies ResObj
    }
}
