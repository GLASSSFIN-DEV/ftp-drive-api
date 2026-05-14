import { JsonValue } from "@prisma/client/runtime/client";

export interface IFailResponse<T = unknown> {
  errCode: string
  statusCode: number
  messages: string[]
  payload?: T
}

export interface IOkResponse<T = unknown> {
  statusCode: number;
  messages: string[]
  payload?: T
}

export interface IPagination {
  page: number;
  pageSize: number;
  totalRows?: number;
  totalPage?: number;
  currentPage?: number;
}

export interface IItemPagination<T = unknown> {
  items: T;
  pagination: IPagination;
  rbac?: JsonValue
}
