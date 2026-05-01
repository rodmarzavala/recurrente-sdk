// tests/pagination.test.ts
import { describe, it, expect } from "vitest";
import { parsePaginationHeaders, buildPaginationQuery, pageIterator, autoPagingToArray } from "../src/pagination.js";
import type { Page, PaginationParams } from "../src/types/index.js";

// ── parsePaginationHeaders ────────────────────────────────────────────────────

describe("parsePaginationHeaders", () => {
  function makeHeaders(values: Record<string, string>): Headers {
    return { get: (k: string) => values[k] ?? null } as unknown as Headers;
  }

  it("parses all headers correctly", () => {
    const headers = makeHeaders({
      "Current-Page": "2",
      "Total-Pages":  "5",
      "Total-Count":  "47",
      "Page-Items":   "10",
    });

    const meta = parsePaginationHeaders(headers);
    expect(meta.currentPage).toBe(2);
    expect(meta.totalPages).toBe(5);
    expect(meta.totalCount).toBe(47);
    expect(meta.itemsPerPage).toBe(10);
    expect(meta.hasNextPage).toBe(true);
    expect(meta.hasPrevPage).toBe(true);
  });

  it("defaults sensibly when headers are missing", () => {
    const meta = parsePaginationHeaders(makeHeaders({}));
    expect(meta.currentPage).toBe(1);
    expect(meta.totalPages).toBe(1);
    expect(meta.totalCount).toBe(0);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPrevPage).toBe(false);
  });

  it("hasNextPage is false on the last page", () => {
    const meta = parsePaginationHeaders(makeHeaders({ "Current-Page": "5", "Total-Pages": "5" }));
    expect(meta.hasNextPage).toBe(false);
  });

  it("hasPrevPage is false on the first page", () => {
    const meta = parsePaginationHeaders(makeHeaders({ "Current-Page": "1", "Total-Pages": "3" }));
    expect(meta.hasPrevPage).toBe(false);
  });
});

// ── buildPaginationQuery ──────────────────────────────────────────────────────

describe("buildPaginationQuery", () => {
  it("builds query string with page and items", () => {
    expect(buildPaginationQuery({ page: 2, items: 10 })).toBe("page=2&items=10");
  });

  it("omits undefined params", () => {
    expect(buildPaginationQuery({ page: 3 })).toBe("page=3");
    expect(buildPaginationQuery({})).toBe("");
  });
});

// ── pageIterator & autoPagingToArray ──────────────────────────────────────────

type Item = { id: string };

function makePaginatedListFn(totalItems: number, itemsPerPage = 20): (p: PaginationParams) => Promise<Page<Item>> {
  const items: Item[] = Array.from({ length: totalItems }, (_, i) => ({ id: `item_${i}` }));

  return async ({ page = 1, items: size = itemsPerPage }: PaginationParams): Promise<Page<Item>> => {
    const start       = (page - 1) * size;
    const data        = items.slice(start, start + size);
    const totalPages  = Math.max(1, Math.ceil(totalItems / size));

    return {
      data,
      meta: {
        currentPage:  page,
        totalPages,
        totalCount:   totalItems,
        itemsPerPage: size,
        hasNextPage:  page < totalPages,
        hasPrevPage:  page > 1,
      },
    };
  };
}

describe("pageIterator", () => {
  it("iterates through all pages", async () => {
    const listFn = makePaginatedListFn(47, 10);
    const pages: Page<Item>[] = [];

    for await (const page of pageIterator(listFn, 1, 10)) {
      pages.push(page);
    }

    expect(pages).toHaveLength(5); // ceil(47/10) = 5
    expect(pages[0]!.data).toHaveLength(10);
    expect(pages[4]!.data).toHaveLength(7); // last page has 7
  });

  it("handles single-page results", async () => {
    const listFn = makePaginatedListFn(5, 20);
    const pages: Page<Item>[] = [];
    for await (const page of pageIterator(listFn)) { pages.push(page); }
    expect(pages).toHaveLength(1);
    expect(pages[0]!.data).toHaveLength(5);
  });

  it("handles empty results", async () => {
    const listFn = makePaginatedListFn(0, 20);
    const pages: Page<Item>[] = [];
    for await (const page of pageIterator(listFn)) { pages.push(page); }
    expect(pages).toHaveLength(1);
    expect(pages[0]!.data).toHaveLength(0);
  });
});

describe("autoPagingToArray", () => {
  it("returns all items as a flat array", async () => {
    const listFn = makePaginatedListFn(47, 10);
    const all = await autoPagingToArray(listFn, { itemsPerPage: 10 });
    expect(all).toHaveLength(47);
    expect(all[0]!.id).toBe("item_0");
    expect(all[46]!.id).toBe("item_46");
  });

  it("respects the limit option", async () => {
    const listFn = makePaginatedListFn(100, 20);
    const limited = await autoPagingToArray(listFn, { limit: 35 });
    expect(limited).toHaveLength(35);
  });

  it("returns all items when limit > total", async () => {
    const listFn = makePaginatedListFn(10, 20);
    const all = await autoPagingToArray(listFn, { limit: 999 });
    expect(all).toHaveLength(10);
  });
});
