import { IPagination } from "@/types/common";

const createPagination = (
  page: number = 1,
  pageSize: number = 25,
  totalRows: number = 0
): IPagination & { take: number; skip: number } => {
  const totalPage = Math.ceil(totalRows / pageSize);
  const currentPage = Math.min(Math.max(1, page), totalPage);
  const skip = (currentPage - 1) * pageSize;

  return {
    take: pageSize,
    skip: skip,
    page,
    pageSize,
    totalPage,
    totalRows,
    currentPage,
  }
};

export default createPagination;
