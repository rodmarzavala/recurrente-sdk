// ─────────────────────────────────────────────────────────────────────────────
// src/modules/customers.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { RecurrenteClient } from "../client.js";
import type {
  CreateCustomerRequest,
  CustomerResponse,
  Page,
  PaginationParams,
  UpdateCustomerRequest,
} from "../types/index.js";
import { parsePaginationHeaders, buildPaginationQuery } from "../pagination.js";

export class CustomersModule {
  constructor(private readonly client: RecurrenteClient) {}

  /** Returns a paginated list of all customers. */
  async list(params: PaginationParams = {}): Promise<Page<CustomerResponse>> {
    const qs       = buildPaginationQuery(params);
    const response = await this.client.request<Response>({
      method:         "GET",
      path:           `/api/customers${qs ? `?${qs}` : ""}`,
      returnResponse: true,
    });

    const data = await response.json() as CustomerResponse[];
    return { data, meta: parsePaginationHeaders(response.headers) };
  }

  /** Retrieves a customer by ID. */
  async retrieve(id: string): Promise<CustomerResponse> {
    return this.client.request<CustomerResponse>({
      method: "GET",
      path:   `/api/customers/${id}`,
    });
  }

  /** Creates a new customer. */
  async create(data: CreateCustomerRequest): Promise<CustomerResponse> {
    return this.client.request<CustomerResponse>({
      method: "POST",
      path:   "/api/customers",
      body:   data,
    });
  }

  /** Updates an existing customer. */
  async update(id: string, data: UpdateCustomerRequest): Promise<CustomerResponse> {
    return this.client.request<CustomerResponse>({
      method: "PATCH",
      path:   `/api/customers/${id}`,
      body:   data,
    });
  }
}
