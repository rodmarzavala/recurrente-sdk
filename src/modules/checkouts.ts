// ─────────────────────────────────────────────────────────────────────────────
// src/modules/checkouts.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { RecurrenteClient } from "../client.js";
import type { CheckoutResponse, CreateCheckoutResponse, CreateCheckoutRequest, Page, PaginationParams, RequestOptions } from "../types/index.js";
import { parsePaginationHeaders, buildPaginationQuery } from "../pagination.js";

export class CheckoutsModule {
  constructor(private readonly client: RecurrenteClient) {}

  /**
   * Creates a payment session.
   * Safe to call with `publicOnly: true` from browser/frontend code.
   * 
   * @param data - The checkout configuration (items, urls, etc.)
   * @param options - Additional request options
   * @returns A Promise resolving to the created checkout containing the `checkout_url`.
   */
  async create(data: CreateCheckoutRequest, options?: RequestOptions & { publicOnly?: boolean }): Promise<CreateCheckoutResponse> {
    return this.client.request<CreateCheckoutResponse>({
      method: "POST",
      path:   "/api/checkouts",
      body:   data,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
      publicOnly:     options?.publicOnly,
    });
  }

  /**
   * Retrieves a checkout session by its ID.
   * 
   * @param id - The unique identifier of the checkout session (e.g. "ch_123...")
   * @param options - Additional request options
   * @returns A Promise resolving to the checkout details.
   */
  async retrieve(id: string, options?: RequestOptions): Promise<CheckoutResponse> {
    return this.client.request<CheckoutResponse>({
      method:  "GET",
      path:    `/api/checkouts/${id}`,
      timeout: options?.timeout,
    });
  }

  /**
   * Returns a paginated list of all checkouts.
   * 
   * @param params - Pagination parameters (page, items per page)
   * @param options - Additional request options
   * @returns A Promise resolving to a paginated list of checkouts.
   */
  async list(params: PaginationParams = {}, options?: RequestOptions): Promise<Page<CheckoutResponse>> {
    const qs       = buildPaginationQuery(params);
    const response = await this.client.request<Response>({
      method:         "GET",
      path:           `/api/checkouts${qs ? `?${qs}` : ""}`,
      returnResponse: true,
      timeout:        options?.timeout,
    });

    const data = await response.json() as CheckoutResponse[];
    return { data, meta: parsePaginationHeaders(response.headers) };
  }
}
