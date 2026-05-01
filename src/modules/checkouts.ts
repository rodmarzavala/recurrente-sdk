// ─────────────────────────────────────────────────────────────────────────────
// src/modules/checkouts.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { RecurrenteClient } from "../client.js";
import type { CheckoutResponse, CreateCheckoutResponse, CreateCheckoutRequest, Page, PaginationParams } from "../types/index.js";
import { parsePaginationHeaders, buildPaginationQuery } from "../pagination.js";

export class CheckoutsModule {
  constructor(private readonly client: RecurrenteClient) {}

  /**
   * Creates a payment session.
   * Safe to call with `publicOnly: true` from browser/frontend code.
   */
  async create(data: CreateCheckoutRequest, opts?: { publicOnly?: boolean }): Promise<CreateCheckoutResponse> {
    return this.client.request<CreateCheckoutResponse>({
      method: "POST",
      path:   "/api/checkouts",
      body:   data,
      ...(opts?.publicOnly !== undefined ? { publicOnly: opts.publicOnly } : {}),
    });
  }

  /** Retrieves a checkout session by ID. */
  async retrieve(id: string): Promise<CheckoutResponse> {
    return this.client.request<CheckoutResponse>({
      method: "GET",
      path:   `/api/checkouts/${id}`,
    });
  }

  /** Returns a paginated list of all checkouts. */
  async list(params: PaginationParams = {}): Promise<Page<CheckoutResponse>> {
    const qs       = buildPaginationQuery(params);
    const response = await this.client.request<Response>({
      method:         "GET",
      path:           `/api/checkouts${qs ? `?${qs}` : ""}`,
      returnResponse: true,
    });

    const data = await response.json() as CheckoutResponse[];
    return { data, meta: parsePaginationHeaders(response.headers) };
  }
}
