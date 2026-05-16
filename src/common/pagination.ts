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

/**
 *
 * @param qs
 * @returns
 */
export function createOrderBy(
  qs: any,
  d: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' }
): Array<Record<string, 'asc' | 'desc'>> {
  const sortBy = typeof qs?.sortBy === 'string' ? qs.sortBy.split(',') : [];
  const sortOrder = typeof qs?.sortOrder === 'string' ? qs.sortOrder.split(',') : [];

  const orderBy: Array<Record<string, 'asc' | 'desc'>> = [];

  // Build valid pairs only
  for (let i = 0; i < sortBy.length; i++) {
    const field = sortBy[i]?.trim();
    const direction = sortOrder[i]?.trim();

    if (!field || !direction) continue;

    if (direction === 'asc' || direction === 'desc') {
      orderBy.push({ [field]: direction });
    }
  }

  // Fallback to default if result is empty
  if (orderBy.length === 0) {
    return Object.entries(d).map(([key, value]) => ({ [key]: value }));
  }

  return orderBy;
}