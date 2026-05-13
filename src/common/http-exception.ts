
export class HttpException<T = unknown> extends Error {
  public errCode: string
  public statusCode: number
  public messages: string[]
  public payload?: T

  constructor(params: {
    errCode: string
    statusCode: number
    messages: string[]
    payload?: T
  }) {
    super(params.messages.join(', '))

    this.errCode = params.errCode
    this.statusCode = params.statusCode
    this.messages = params.messages
    this.payload = params.payload
  }
}