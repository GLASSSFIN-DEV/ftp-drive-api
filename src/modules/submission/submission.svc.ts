import { HttpException } from "@/common/http-exception";
import { SubmissionCreateDto } from "@/dto/submission.dto";
import prismaProxy from "@/lib/prisma";
import { IOkResponse } from "@/types/common";
import dayjs from "dayjs";
import { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { v7 } from 'uuid';

export interface IRepositorySubmission {
    create(c: Context): Promise<IOkResponse>;
    action(c: Context): Promise<IOkResponse>;
    lists(c: Context): Promise<IOkResponse>;
    get(c: Context): Promise<IOkResponse>;
}

export class RepositorySubmission implements IRepositorySubmission {
    /**
     * 
     * @param c 
     */
    async create(c: Context): Promise<IOkResponse> {
        const account = c.get('account')
        const body = c.get('validatedBody') as SubmissionCreateDto
        const exist = await prismaProxy.account.findFirst({ where: { username: body.username } })

        if (exist && exist.recordStatus === 'ACTIVE') throw new HttpException({
            errCode: 'USER_SUBMISSION_EXIST',
            statusCode: StatusCodes.EXPECTATION_FAILED,
            messages: ['Your user is ready to use!']
        })

        if (exist && exist.recordStatus === 'NOT_ACTIVE') {
            const submission = await prismaProxy.submission.findFirst({ where: { status: 'WAITING', accountId: exist.id, expiredAt: { gt: new Date() } } })
            if (submission) {
                const newExpiredAt = dayjs().add(7, 'days')
                await prismaProxy.$transaction(async (tx) => {
                    await tx.submission.update({
                        where: { id: submission.id },
                        data: { 
                            verificationCode: v7(),
                            expiredAt: newExpiredAt.toDate() 
                        },
                    })
                })

                return {
                    statusCode: StatusCodes.CREATED,
                    messages: ['Your request submission is updated!'],
                    payload: {
                        expiredAt: newExpiredAt.toDate()
                    }
                }
            }
        }

        await prismaProxy.$transaction(async (tx) => {
            // await 
        })

        throw new Error("Method not implemented.");
    }

    /**
     * 
     * @param c 
     */
    async action(c: Context): Promise<IOkResponse> {
        const account = c.get('account')
        throw new Error("Method not implemented.");
    }

    /**
     * 
     * @param c 
     */
    async lists(c: Context): Promise<IOkResponse> {
        const account = c.get('account')
        throw new Error("Method not implemented.");
    }

    /**
     * 
     * @param c 
     */
    get(c: Context): Promise<IOkResponse> {
        const account = c.get('account')
        throw new Error("Method not implemented.");
    }
}