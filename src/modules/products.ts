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
  RequestOptions,
} from "../types/index.js";
import { parsePaginationHeaders, buildPaginationQuery } from "../pagination.js";

export class ProductsModule {
  constructor(private readonly client: RecurrenteClient) {}

  /**
   * Returns a paginated list of all products.
   * 
   * @param params - Pagination parameters
   * @param options - Additional request options
   * @returns A Promise resolving to a paginated list of products.
   */
  async list(params: PaginationParams = {}, options?: RequestOptions): Promise<Page<ProductResponse>> {
    const qs       = buildPaginationQuery(params);
    const response = await this.client.request<Response>({
      method:         "GET",
      path:           `/api/products${qs ? `?${qs}` : ""}`,
      returnResponse: true,
      timeout:        options?.timeout,
    });

    const data = await response.json() as ProductResponse[];
    return { data, meta: parsePaginationHeaders(response.headers) };
  }

  /**
   * Retrieves a product by ID.
   * 
   * @param id - The unique identifier of the product
   * @param options - Additional request options
   * @returns A Promise resolving to the product details.
   */
  async retrieve(id: string, options?: RequestOptions): Promise<ProductResponse> {
    return this.client.request<ProductResponse>({
      method:  "GET",
      path:    `/api/products/${id}`,
      timeout: options?.timeout,
    });
  }

  /**
   * Creates a new product.
   * 
   * @param data - Product configuration (name, prices, etc.)
   * @param options - Additional request options
   * @returns A Promise resolving to the created Product.
   */
  async create(data: CreateProductRequest, options?: RequestOptions): Promise<ProductResponse> {
    return this.client.request<ProductResponse>({
      method:         "POST",
      path:           "/api/products",
      body:           data,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
    });
  }

  /**
   * Updates an existing product.
   * 
   * @param id - The unique identifier of the product
   * @param data - Attributes to update
   * @param options - Additional request options
   * @returns A Promise resolving to the updated Product.
   */
  async update(id: string, data: UpdateProductRequest, options?: RequestOptions): Promise<ProductResponse> {
    return this.client.request<ProductResponse>({
      method:         "PATCH",
      path:           `/api/products/${id}`,
      body:           data,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
    });
  }

  /**
   * Archives a product (soft delete).
   * 
   * @param id - The unique identifier of the product
   * @param options - Additional request options
   * @returns A Promise resolving to the archived Product.
   */
  async archive(id: string, options?: RequestOptions): Promise<ProductResponse> {
    return this.client.request<ProductResponse>({
      method:         "DELETE",
      path:           `/api/products/${id}`,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
    });
  }
}
