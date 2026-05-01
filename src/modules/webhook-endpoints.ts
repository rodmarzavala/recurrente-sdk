// ─────────────────────────────────────────────────────────────────────────────
// src/modules/webhook-endpoints.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { RecurrenteClient } from "../client.js";
import type {
  CreateWebhookEndpointRequest,
  Page,
  PaginationParams,
  WebhookEndpointResponse,
  RequestOptions,
} from "../types/index.js";
import { parsePaginationHeaders, buildPaginationQuery } from "../pagination.js";

export class WebhookEndpointsModule {
  constructor(private readonly client: RecurrenteClient) {}

  /**
   * Returns a paginated list of registered webhook endpoints.
   * 
   * @param params - Pagination parameters
   * @param options - Additional request options
   * @returns A Promise resolving to a paginated list of webhook endpoints.
   */
  async list(params: PaginationParams = {}, options?: RequestOptions): Promise<Page<WebhookEndpointResponse>> {
    const qs       = buildPaginationQuery(params);
    const response = await this.client.request<Response>({
      method:         "GET",
      path:           `/api/webhook_endpoints${qs ? `?${qs}` : ""}`,
      returnResponse: true,
      timeout:        options?.timeout,
    });

    const data = await response.json() as WebhookEndpointResponse[];
    return { data, meta: parsePaginationHeaders(response.headers) };
  }

  /**
   * Retrieves a webhook endpoint by ID.
   * 
   * @param id - The unique identifier of the webhook endpoint
   * @param options - Additional request options
   * @returns A Promise resolving to the webhook endpoint details.
   */
  async retrieve(id: string, options?: RequestOptions): Promise<WebhookEndpointResponse> {
    return this.client.request<WebhookEndpointResponse>({
      method:  "GET",
      path:    `/api/webhook_endpoints/${id}`,
      timeout: options?.timeout,
    });
  }

  /**
   * Registers a new webhook endpoint.
   * The response includes `signing_secret` — save it immediately,
   * it will not be shown again.
   * 
   * @param data - Webhook endpoint configuration payload
   * @param options - Additional request options
   * @returns A Promise resolving to the created WebhookEndpointResponse.
   */
  async create(data: CreateWebhookEndpointRequest, options?: RequestOptions): Promise<WebhookEndpointResponse> {
    return this.client.request<WebhookEndpointResponse>({
      method:         "POST",
      path:           "/api/webhook_endpoints",
      body:           data,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
    });
  }

  /**
   * Deletes (unregisters) a webhook endpoint.
   * 
   * @param id - The unique identifier of the webhook endpoint to delete
   * @param options - Additional request options
   * @returns A Promise resolving when the endpoint is deleted.
   */
  async delete(id: string, options?: RequestOptions): Promise<void> {
    await this.client.request<void>({
      method:         "DELETE",
      path:           `/api/webhook_endpoints/${id}`,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
    });
  }
}
