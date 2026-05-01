import type { RecurrenteClient } from "../client.js";
import type { RequestOptions } from "../types/index.js";

// Simplification of the full Payment Intent response for the SDK types
export interface PaymentIntent {
  id: string;
  receipt_number?: number;
  api_version?: string;
  created_at: string;
  checkout?: Record<string, any>;
  payment?: Record<string, any>;
  customer_id?: string;
  user_id?: string;
  customer?: Record<string, any>;
  failure_reason?: string;
  amount_in_cents: number;
  currency: string;
  fee?: number;
  vat_withheld?: number;
  vat_withheld_currency?: string;
  used_presaved_payment_method?: boolean;
  product?: Record<string, any>;
  products?: Record<string, any>[];
  tax_invoice_url?: string;
  channel?: string;
}

export interface UpdatePaymentIntentParams {
  payment_intent: {
    tax_invoice_url?: string;
    [key: string]: any;
  };
}

export class PaymentIntentsModule {
  constructor(private readonly client: RecurrenteClient) {}

  /**
   * Updates a payment intent.
   * Attaches a tax invoice URL to a successful payment intent. Only intents with status `succeeded` can be updated.
   * 
   * @param id - The unique identifier of the payment intent
   * @param data - Payment intent update payload containing the tax invoice URL
   * @param options - Additional request options
   * @returns A Promise resolving to the updated PaymentIntent.
   */
  async update(id: string, data: UpdatePaymentIntentParams, options?: RequestOptions): Promise<PaymentIntent> {
    return this.client.request<PaymentIntent>({
      method:         "PUT",
      path:           `/api/payment_intents/${id}`,
      body:           data,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
    });
  }
}
