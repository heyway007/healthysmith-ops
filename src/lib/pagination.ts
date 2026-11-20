import { cookies } from "next/headers";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, PAGE_SIZE_COOKIE } from "@/lib/page-sizes";

export type Paging = { page: number; size: number };

const isSize = (n: number) => (PAGE_SIZES as readonly number[]).includes(n);

/** ?page= / ?size= of a list; without ?size= the remembered size (cookie), else 10. */
export async function getPaging(sp: { page?: string; size?: string }): Promise<Paging> {
  let size: number = DEFAULT_PAGE_SIZE;
  if (isSize(Number(sp.size))) {
    size = Number(sp.size);
  } else {
    const saved = Number((await cookies()).get(PAGE_SIZE_COOKIE)?.value);
    if (isSize(saved)) size = saved;
  }
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  return { page, size };
}

/** One page of an already-loaded list (the page number is clamped to the last page). */
export function paginate<T>(items: readonly T[], paging: Paging) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / paging.size));
  const page = Math.min(paging.page, pages);
  const start = (page - 1) * paging.size;
  return {
    rows: items.slice(start, start + paging.size),
    total,
    page,
    pages,
    size: paging.size,
  };
}
