
import { HttpException } from '@/common/http-exception'

export const throwError = <T>(params: {
  errCode: string
  statusCode: number
  messages: string[]
  payload?: T
}): never => {
  throw new HttpException(params)
}