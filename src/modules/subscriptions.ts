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
} from "../types/index.js";
import { parsePaginationHeaders, buildPaginationQuery } from "../pagination.js";

export class SubscriptionsModule {
  constructor(private readonly client: RecurrenteClient) {}

  /**
   * Initiates a subscription setup flow.
   * Returns `checkout_url` to redirect the customer and the subscription resource.
   */
  async create(data: CreateSubscriptionRequest): Promise<CreateSubscriptionResponse> {
    return this.client.request<CreateSubscriptionResponse>({
      method: "POST",
      path:   "/api/subscriptions",
      body:   data,
    });
  }

  /** Retrieves a subscription by ID. */
  async retrieve(id: string): Promise<SubscriptionResponse> {
    return this.client.request<SubscriptionResponse>({
      method: "GET",
      path:   `/api/subscriptions/${id}`,
    });
  }

  /** Returns a paginated list of all subscriptions. */
  async list(params: PaginationParams = {}): Promise<Page<SubscriptionResponse>> {
    const qs       = buildPaginationQuery(params);
    const response = await this.client.request<Response>({
      method:         "GET",
      path:           `/api/subscriptions${qs ? `?${qs}` : ""}`,
      returnResponse: true,
    });

    const data = await response.json() as SubscriptionResponse[];
    return { data, meta: parsePaginationHeaders(response.headers) };
  }

  /** Cancels an active subscription. */
  async cancel(subscriptionId: string): Promise<SubscriptionResponse> {
    return this.client.request<SubscriptionResponse>({
      method: "POST",
      path:   `/api/subscriptions/${subscriptionId}/cancel`,
    });
  }
}
