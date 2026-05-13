import { HttpException } from "@/common/http-exception";
import { LoginDto } from "@/dto/login.dto";
import prismaProxy from "@/lib/prisma";

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

        return {
            accessToken: "",
            refreshToken: "",
            expireAt: ""
        } satisfies ResObj
    }
}
