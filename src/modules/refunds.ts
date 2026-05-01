// ─────────────────────────────────────────────────────────────────────────────
// src/modules/refunds.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { RecurrenteClient } from "../client.js";
import type {
  CreateRefundRequest,
  Page,
  PaginationParams,
  RefundResponse,
} from "../types/index.js";
import { parsePaginationHeaders, buildPaginationQuery } from "../pagination.js";

export class RefundsModule {
  constructor(private readonly client: RecurrenteClient) {}

  /**
   * Creates a refund for a paid checkout.
   * Omit `amount_in_cents` to refund the full amount.
   */
  async create(data: CreateRefundRequest): Promise<RefundResponse> {
    return this.client.request<RefundResponse>({
      method: "POST",
      path:   "/api/refunds",
      body:   data,
    });
  }

  /** Retrieves a refund by ID. */
  async retrieve(id: string): Promise<RefundResponse> {
    return this.client.request<RefundResponse>({
      method: "GET",
      path:   `/api/refunds/${id}`,
    });
  }

  /** Returns a paginated list of refunds, optionally filtered by checkout. */
  async list(params: PaginationParams & { checkout_id?: string } = {}): Promise<Page<RefundResponse>> {
    const { checkout_id, ...pagination } = params;
    const qs = new URLSearchParams(buildPaginationQuery(pagination));
    if (checkout_id) qs.set("checkout_id", checkout_id);

    const response = await this.client.request<Response>({
      method:         "GET",
      path:           `/api/refunds${qs.toString() ? `?${qs.toString()}` : ""}`,
      returnResponse: true,
    });

    const data = await response.json() as RefundResponse[];
    return { data, meta: parsePaginationHeaders(response.headers) };
  }
}
