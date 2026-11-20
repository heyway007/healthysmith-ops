// Rows per page on the list screens (client-safe; the server side is in pagination.ts).

export const PAGE_SIZES = [10, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;
/** the chosen size is remembered here, so it also applies after changing a filter or opening another list */
export const PAGE_SIZE_COOKIE = "page_size";
