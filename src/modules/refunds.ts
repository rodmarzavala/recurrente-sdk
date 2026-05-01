// ─────────────────────────────────────────────────────────────────────────────
// src/modules/refunds.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { RecurrenteClient } from "../client.js";
import type {
  CreateRefundRequest,
  Page,
  PaginationParams,
  RefundResponse,
  RequestOptions,
} from "../types/index.js";
import { parsePaginationHeaders, buildPaginationQuery } from "../pagination.js";

export class RefundsModule {
  constructor(private readonly client: RecurrenteClient) {}

  /**
   * Creates a refund for a paid checkout.
   * Omit `amount_in_cents` to refund the full amount.
   * 
   * @param data - Refund creation payload
   * @param options - Additional request options
   * @returns A Promise resolving to the created Refund.
   */
  async create(data: CreateRefundRequest, options?: RequestOptions): Promise<RefundResponse> {
    return this.client.request<RefundResponse>({
      method:         "POST",
      path:           "/api/refunds",
      body:           data,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
    });
  }

  /**
   * Retrieves a refund by ID.
   * 
   * @param id - The unique identifier of the refund
   * @param options - Additional request options
   * @returns A Promise resolving to the refund details.
   */
  async retrieve(id: string, options?: RequestOptions): Promise<RefundResponse> {
    return this.client.request<RefundResponse>({
      method:  "GET",
      path:    `/api/refunds/${id}`,
      timeout: options?.timeout,
    });
  }

  /**
   * Returns a paginated list of refunds, optionally filtered by checkout.
   * 
   * @param params - Pagination parameters including optional checkout_id
   * @param options - Additional request options
   * @returns A Promise resolving to a paginated list of refunds.
   */
  async list(params: PaginationParams & { checkout_id?: string } = {}, options?: RequestOptions): Promise<Page<RefundResponse>> {
    const { checkout_id, ...pagination } = params;
    const qs = new URLSearchParams(buildPaginationQuery(pagination));
    if (checkout_id) qs.set("checkout_id", checkout_id);

    const response = await this.client.request<Response>({
      method:         "GET",
      path:           `/api/refunds${qs.toString() ? `?${qs.toString()}` : ""}`,
      returnResponse: true,
      timeout:        options?.timeout,
    });

    const data = await response.json() as RefundResponse[];
    return { data, meta: parsePaginationHeaders(response.headers) };
  }
}
