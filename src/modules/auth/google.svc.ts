import { HttpException } from "@/common/http-exception";
import { GoogleOAuth, IGoogleOAuth } from "@/lib/google-oauth";
import prismaProxy from "@/lib/prisma";
import { IOkResponse } from "@/types/common";
import { Context } from "hono";
import { sign } from 'hono/jwt';
import { JWTPayload } from "hono/utils/jwt/types";
import { StatusCodes } from "http-status-codes";
import { env } from "@/config";
import { v7 } from 'uuid';
import { ResObj } from "./auth.svc";
import logger from "@/lib/logger";

export interface IRepositoryGOAuth {
    handshake(c: Context): Promise<IOkResponse<string>>;
    callback(c: Context): Promise<ResObj>;
}

export class RepositoryGOAuth implements IRepositoryGOAuth {
    private readonly gauth: IGoogleOAuth = new GoogleOAuth()

    constructor() { }

    /**
     * 
     * @param c 
     */
    async handshake(c: Context): Promise<IOkResponse<string>> {
        const state = v7()
        const url = this.gauth.buildUrl(state)

        logger.debug('[handshake]', { url })
        return {
            statusCode: StatusCodes.OK,
            messages: [],
            payload: url
        }
    }

    /**
     * 
     * @param c 
     */
    async callback(c: Context): Promise<ResObj> {
        const { code, error, state } = c.req.query()
        if (error) throw new HttpException({
            errCode: 'GOOGLE_AUTH_DENIED',
            statusCode: StatusCodes.BAD_REQUEST,
            messages: [`Google Auth denined ${error}`]
        })

        if (!code) throw new HttpException({
            errCode: 'GOOGLE_AUTH_MISSING',
            statusCode: StatusCodes.BAD_REQUEST,
            messages: [`Missing authorization code`]
        })

        const googleTokens = await this.gauth.exchangeToken(code);
        await this.gauth.validateTokenScope(googleTokens.access_token);

        const googleUser = await this.gauth.userInfo(googleTokens.access_token);
        const account = await prismaProxy.account.upsert({
            update: {
                updatedAt: new Date(),
                accountInfo: { ...googleUser }
            },
            create: {
                username: googleUser.email,
                fullname: googleUser.name,
                email: googleUser.email,
                provider: 'google-oauth',
                accountInfo: { ...googleUser }
            },
            where: {
                username: googleUser.email,
            }
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
            expireAt: env.JWT_EXPIRE,
            user: googleUser
        }
    }

}