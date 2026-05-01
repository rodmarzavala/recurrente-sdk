import type { RecurrenteClient } from "../client.js";
import type { Page, PaginationParams, RequestOptions } from "../types/index.js";
import { parsePaginationHeaders, buildPaginationQuery } from "../pagination.js";

export interface Coupon {
  id: string;
  name: string;
  discount_mode: string;
  display_name: string;
  amount_off_in_cents?: number;
  percent_off?: number;
  max_redemptions?: number;
  currency: string;
  duration: string;
  expires_at?: string;
  status: string;
}

export interface CreateCouponParams {
  name: string;
  discount_mode: string;
  display_name?: string;
  amount_off_in_cents?: number;
  percent_off?: number;
  max_redemptions?: number;
  duration?: string;
  expires_at?: string;
}

export interface UpdateCouponParams {
  name?: string;
  display_name?: string;
}

export class CouponsModule {
  constructor(private readonly client: RecurrenteClient) {}

  /**
   * Creates a new coupon.
   * 
   * @param data - Coupon configuration
   * @param options - Additional request options
   * @returns A Promise resolving to the created Coupon.
   */
  async create(data: CreateCouponParams, options?: RequestOptions): Promise<Coupon> {
    return this.client.request<Coupon>({
      method:         "POST",
      path:           "/api/coupons",
      body:           data,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
    });
  }

  /**
   * Retrieves a coupon by its ID.
   * 
   * @param id - The unique identifier of the coupon
   * @param options - Additional request options
   * @returns A Promise resolving to the coupon details.
   */
  async retrieve(id: string, options?: RequestOptions): Promise<Coupon> {
    return this.client.request<Coupon>({
      method:  "GET",
      path:    `/api/coupons/${id}`,
      timeout: options?.timeout,
    });
  }

  /**
   * Returns a paginated list of all coupons.
   * 
   * @param params - Pagination parameters
   * @param options - Additional request options
   * @returns A Promise resolving to a paginated list of coupons.
   */
  async list(params: PaginationParams = {}, options?: RequestOptions): Promise<Page<Coupon>> {
    const qs       = buildPaginationQuery(params);
    const response = await this.client.request<Response>({
      method:         "GET",
      path:           `/api/coupons${qs ? `?${qs}` : ""}`,
      returnResponse: true,
      timeout:        options?.timeout,
    });

    const data = await response.json() as Coupon[];
    return { data, meta: parsePaginationHeaders(response.headers) };
  }

  /**
   * Updates an existing coupon.
   * 
   * @param id - The unique identifier of the coupon
   * @param data - The attributes to update
   * @param options - Additional request options
   * @returns A Promise resolving to the updated Coupon.
   */
  async update(id: string, data: UpdateCouponParams, options?: RequestOptions): Promise<Coupon> {
    return this.client.request<Coupon>({
      method:         "PUT",
      path:           `/api/coupons/${id}`,
      body:           data,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
    });
  }

  /**
   * Archives a coupon.
   * Soft-deletes a coupon (sets status to "archived").
   * 
   * @param id - The unique identifier of the coupon
   * @param options - Additional request options
   */
  async archive(id: string, options?: RequestOptions): Promise<void> {
    return this.client.request<void>({
      method:         "DELETE",
      path:           `/api/coupons/${id}`,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
    });
  }
}
