// ─────────────────────────────────────────────────────────────────────────────
// src/modules/webhook-endpoints.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { RecurrenteClient } from "../client.js";
import type {
  CreateWebhookEndpointRequest,
  Page,
  PaginationParams,
  WebhookEndpointResponse,
} from "../types/index.js";
import { parsePaginationHeaders, buildPaginationQuery } from "../pagination.js";

export class WebhookEndpointsModule {
  constructor(private readonly client: RecurrenteClient) {}

  /** Returns a paginated list of registered webhook endpoints. */
  async list(params: PaginationParams = {}): Promise<Page<WebhookEndpointResponse>> {
    const qs       = buildPaginationQuery(params);
    const response = await this.client.request<Response>({
      method:         "GET",
      path:           `/api/webhook_endpoints${qs ? `?${qs}` : ""}`,
      returnResponse: true,
    });

    const data = await response.json() as WebhookEndpointResponse[];
    return { data, meta: parsePaginationHeaders(response.headers) };
  }

  /** Retrieves a webhook endpoint by ID. */
  async retrieve(id: string): Promise<WebhookEndpointResponse> {
    return this.client.request<WebhookEndpointResponse>({
      method: "GET",
      path:   `/api/webhook_endpoints/${id}`,
    });
  }

  /**
   * Registers a new webhook endpoint.
   * The response includes `signing_secret` — save it immediately,
   * it will not be shown again.
   */
  async create(data: CreateWebhookEndpointRequest): Promise<WebhookEndpointResponse> {
    return this.client.request<WebhookEndpointResponse>({
      method: "POST",
      path:   "/api/webhook_endpoints",
      body:   data,
    });
  }

  /** Deletes (unregisters) a webhook endpoint. */
  async delete(id: string): Promise<void> {
    await this.client.request<void>({
      method: "DELETE",
      path:   `/api/webhook_endpoints/${id}`,
    });
  }
}
