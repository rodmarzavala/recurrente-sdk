// ─────────────────────────────────────────────────────────────────────────────
// src/pagination.ts
//
// Recurrente uses page-number pagination (RFC 8288).
// Metadata is returned in response headers:
//   Current-Page, Total-Pages, Total-Count, Page-Items, Link
// ─────────────────────────────────────────────────────────────────────────────

import type { Page, PageMeta, PaginationParams } from "./types/index.js";

export { Page, PageMeta };

// ── Parse RFC 8288 Link header ────────────────────────────────────────────────

/**
 * Parses the response headers returned by Recurrente list endpoints.
 *
 * Headers: Current-Page, Total-Pages, Total-Count, Page-Items
 */
export function parsePaginationHeaders(headers: Headers): PageMeta {
  const currentPage  = parseInt(headers.get("Current-Page")  ?? "1",  10);
  const totalPages   = parseInt(headers.get("Total-Pages")   ?? "1",  10);
  const totalCount   = parseInt(headers.get("Total-Count")   ?? "0",  10);
  const itemsPerPage = parseInt(headers.get("Page-Items")    ?? "20", 10);

  return {
    currentPage,
    totalPages,
    totalCount,
    itemsPerPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}

// ── Build query string ────────────────────────────────────────────────────────

export function buildPaginationQuery(params: PaginationParams): string {
  const q = new URLSearchParams();
  if (params.page  !== undefined) q.set("page",  String(params.page));
  if (params.items !== undefined) q.set("items", String(params.items));
  return q.toString();
}

// ── AsyncPageIterator ─────────────────────────────────────────────────────────

export type ListFn<T> = (params: PaginationParams) => Promise<Page<T>>;

/**
 * Async iterator over all pages of a paginated endpoint.
 *
 * @example
 * for await (const page of pageIterator((p) => recurrente.products.list(p))) {
 *   for (const product of page.data) console.log(product.name);
 * }
 */
export async function* pageIterator<T>(listFn: ListFn<T>, startPage = 1, itemsPerPage = 20) {
  let current = startPage;

  while (true) {
    const page = await listFn({ page: current, items: itemsPerPage });
    yield page;
    if (!page.meta.hasNextPage) break;
    current++;
  }
}

/**
 * Fetches all pages and returns all items as a flat array.
 *
 * @example
 * const allProducts = await autoPagingToArray((p) => recurrente.products.list(p));
 */
export async function autoPagingToArray<T>(
  listFn: ListFn<T>,
  options?: { limit?: number; itemsPerPage?: number },
): Promise<T[]> {
  const result: T[] = [];
  const limit = options?.limit ?? Infinity;
  const perPage = options?.itemsPerPage ?? 20;

  for await (const page of pageIterator(listFn, 1, perPage)) {
    for (const item of page.data) {
      result.push(item);
      if (result.length >= limit) return result;
    }
  }

  return result;
}
