import type { RecurrenteClient } from "../client.js";
import type { Page, PaginationParams } from "../types/index.js";
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
   * Crear un cupón
   */
  async create(data: CreateCouponParams): Promise<Coupon> {
    return this.client.request<Coupon>({
      method: "POST",
      path:   "/api/coupons",
      body:   data,
    });
  }

  /**
   * Obtener un cupón
   */
  async retrieve(id: string): Promise<Coupon> {
    return this.client.request<Coupon>({
      method: "GET",
      path:   `/api/coupons/${id}`,
    });
  }

  /**
   * Listar cupones
   */
  async list(params: PaginationParams = {}): Promise<Page<Coupon>> {
    const qs       = buildPaginationQuery(params);
    const response = await this.client.request<Response>({
      method:         "GET",
      path:           `/api/coupons${qs ? `?${qs}` : ""}`,
      returnResponse: true,
    });

    const data = await response.json() as Coupon[];
    return { data, meta: parsePaginationHeaders(response.headers) };
  }

  /**
   * Actualizar un cupón
   */
  async update(id: string, data: UpdateCouponParams): Promise<Coupon> {
    return this.client.request<Coupon>({
      method: "PUT",
      path:   `/api/coupons/${id}`,
      body:   data,
    });
  }

  /**
   * Archivar un cupón
   */
  async archive(id: string): Promise<void> {
    return this.client.request<void>({
      method: "DELETE",
      path:   `/api/coupons/${id}`,
    });
  }
}
