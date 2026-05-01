// ─────────────────────────────────────────────────────────────────────────────
// src/modules/subscriptions.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { RecurrenteClient } from "../client.js";
import type {
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  Page,
  PaginationParams,
  SubscriptionResponse,
  RequestOptions,
} from "../types/index.js";
import { parsePaginationHeaders, buildPaginationQuery } from "../pagination.js";

export class SubscriptionsModule {
  constructor(private readonly client: RecurrenteClient) {}

  /**
   * Initiates a subscription setup flow.
   * Returns `checkout_url` to redirect the customer and the subscription resource.
   * 
   * @param data - Subscription configuration payload
   * @param options - Additional request options
   * @returns A Promise resolving to the CreateSubscriptionResponse.
   */
  async create(data: CreateSubscriptionRequest, options?: RequestOptions): Promise<CreateSubscriptionResponse> {
    return this.client.request<CreateSubscriptionResponse>({
      method:         "POST",
      path:           "/api/subscriptions",
      body:           data,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
    });
  }

  /**
   * Retrieves a subscription by ID.
   * 
   * @param id - The unique identifier of the subscription
   * @param options - Additional request options
   * @returns A Promise resolving to the subscription details.
   */
  async retrieve(id: string, options?: RequestOptions): Promise<SubscriptionResponse> {
    return this.client.request<SubscriptionResponse>({
      method:  "GET",
      path:    `/api/subscriptions/${id}`,
      timeout: options?.timeout,
    });
  }

  /**
   * Returns a paginated list of all subscriptions.
   * 
   * @param params - Pagination parameters
   * @param options - Additional request options
   * @returns A Promise resolving to a paginated list of subscriptions.
   */
  async list(params: PaginationParams = {}, options?: RequestOptions): Promise<Page<SubscriptionResponse>> {
    const qs       = buildPaginationQuery(params);
    const response = await this.client.request<Response>({
      method:         "GET",
      path:           `/api/subscriptions${qs ? `?${qs}` : ""}`,
      returnResponse: true,
      timeout:        options?.timeout,
    });

    const data = await response.json() as SubscriptionResponse[];
    return { data, meta: parsePaginationHeaders(response.headers) };
  }

  /**
   * Cancels an active subscription.
   * 
   * @param subscriptionId - The unique identifier of the subscription to cancel
   * @param options - Additional request options
   * @returns A Promise resolving to the canceled SubscriptionResponse.
   */
  async cancel(subscriptionId: string, options?: RequestOptions): Promise<SubscriptionResponse> {
    return this.client.request<SubscriptionResponse>({
      method:         "POST",
      path:           `/api/subscriptions/${subscriptionId}/cancel`,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
    });
  }
}
