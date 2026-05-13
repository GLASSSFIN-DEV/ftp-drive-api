export interface IApiResponse<T = unknown> {
  errCode: string
  statusCode: number
  messages: string[]
  payload?: T
}