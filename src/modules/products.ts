// ─────────────────────────────────────────────────────────────────────────────
// src/modules/products.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { RecurrenteClient } from "../client.js";
import type {
  CreateProductRequest,
  Page,
  PaginationParams,
  ProductResponse,
  UpdateProductRequest,
} from "../types/index.js";
import { parsePaginationHeaders, buildPaginationQuery } from "../pagination.js";

export class ProductsModule {
  constructor(private readonly client: RecurrenteClient) {}

  /** Returns a paginated list of all products. */
  async list(params: PaginationParams = {}): Promise<Page<ProductResponse>> {
    const qs       = buildPaginationQuery(params);
    const response = await this.client.request<Response>({
      method:         "GET",
      path:           `/api/products${qs ? `?${qs}` : ""}`,
      returnResponse: true,
    });

    const data = await response.json() as ProductResponse[];
    return { data, meta: parsePaginationHeaders(response.headers) };
  }

  /** Retrieves a product by ID. */
  async retrieve(id: string): Promise<ProductResponse> {
    return this.client.request<ProductResponse>({
      method: "GET",
      path:   `/api/products/${id}`,
    });
  }

  /** Creates a new product. */
  async create(data: CreateProductRequest): Promise<ProductResponse> {
    return this.client.request<ProductResponse>({
      method: "POST",
      path:   "/api/products",
      body:   data,
    });
  }

  /** Updates an existing product. */
  async update(id: string, data: UpdateProductRequest): Promise<ProductResponse> {
    return this.client.request<ProductResponse>({
      method: "PATCH",
      path:   `/api/products/${id}`,
      body:   data,
    });
  }

  /** Archives a product (soft delete). */
  async archive(id: string): Promise<ProductResponse> {
    return this.client.request<ProductResponse>({
      method: "DELETE",
      path:   `/api/products/${id}`,
    });
  }
}
