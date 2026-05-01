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
  RequestOptions,
} from "../types/index.js";
import { parsePaginationHeaders, buildPaginationQuery } from "../pagination.js";

export class CustomersModule {
  constructor(private readonly client: RecurrenteClient) {}

  /**
   * Returns a paginated list of all customers.
   * 
   * @param params - Pagination parameters
   * @param options - Additional request options
   * @returns A Promise resolving to a paginated list of customers.
   */
  async list(params: PaginationParams = {}, options?: RequestOptions): Promise<Page<CustomerResponse>> {
    const qs       = buildPaginationQuery(params);
    const response = await this.client.request<Response>({
      method:         "GET",
      path:           `/api/customers${qs ? `?${qs}` : ""}`,
      returnResponse: true,
      timeout:        options?.timeout,
    });

    const data = await response.json() as CustomerResponse[];
    return { data, meta: parsePaginationHeaders(response.headers) };
  }

  /**
   * Retrieves a customer by ID.
   * 
   * @param id - The unique identifier of the customer
   * @param options - Additional request options
   * @returns A Promise resolving to the customer details.
   */
  async retrieve(id: string, options?: RequestOptions): Promise<CustomerResponse> {
    return this.client.request<CustomerResponse>({
      method:  "GET",
      path:    `/api/customers/${id}`,
      timeout: options?.timeout,
    });
  }

  /**
   * Creates a new customer.
   * 
   * @param data - Customer configuration
   * @param options - Additional request options
   * @returns A Promise resolving to the created Customer.
   */
  async create(data: CreateCustomerRequest, options?: RequestOptions): Promise<CustomerResponse> {
    return this.client.request<CustomerResponse>({
      method:         "POST",
      path:           "/api/customers",
      body:           data,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
    });
  }

  /**
   * Updates an existing customer.
   * 
   * @param id - The unique identifier of the customer
   * @param data - The attributes to update
   * @param options - Additional request options
   * @returns A Promise resolving to the updated Customer.
   */
  async update(id: string, data: UpdateCustomerRequest, options?: RequestOptions): Promise<CustomerResponse> {
    return this.client.request<CustomerResponse>({
      method:         "PATCH",
      path:           `/api/customers/${id}`,
      body:           data,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
    });
  }
}
