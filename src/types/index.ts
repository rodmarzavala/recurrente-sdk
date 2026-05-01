// ─────────────────────────────────────────────────────────────────────────────
// src/types/index.ts — v0.2.0
// ─────────────────────────────────────────────────────────────────────────────

// ── Client options ────────────────────────────────────────────────────────────

export interface RecurrenteClientOptions {
  publicKey: string;
  secretKey: string;
  baseUrl?: string;
  maxRetries?: number;
  /** Request timeout in milliseconds (default: 30 000). Set to 0 to disable. */
  timeout?: number;
}

export interface RecurrenteErrorBody {
  message: string;
  errors?: Record<string, string[]>;
}

// ── Pagination ────────────────────────────────────────────────────────────────
// Recurrente uses page-number pagination.
// Metadata lives in response headers (RFC 8288): Current-Page, Total-Pages, etc.

export interface PaginationParams {
  /** Page number (1-indexed, default 1) */
  page?: number;
  /** Items per page (default 20) */
  items?: number;
}

export interface PageMeta {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

// ── Per-request options ───────────────────────────────────────────────────────

export interface RequestOptions {
  /** Custom idempotency key. Auto-generated (UUID) if omitted on mutating requests. */
  idempotencyKey?: string;
  /** Override timeout for this specific request (ms). */
  timeout?: number;
}

// ── Checkouts ─────────────────────────────────────────────────────────────────

export interface CheckoutItem {
  name: string;
  amount_in_cents: number;
  currency: string;
  quantity: number;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreateCheckoutRequest {
  items: [CheckoutItem, ...CheckoutItem[]];
  success_url: string;
  cancel_url: string;
  customer_email?: string;
  metadata?: Record<string, string>;
}

export interface CreateCheckoutResponse {
  id: string;
  checkout_url: string;
}

export interface CheckoutResponse {
  id: string;
  status: "unpaid" | "paid" | "expired" | "cancelled" | string;
  live_mode: boolean;
  total_in_cents: number;
  subtotal_in_cents: number;
  currency: string;
  success_url: string;
  cancel_url: string;
  metadata: Record<string, string>;
  created_at: string;
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export type BillingInterval = "day" | "week" | "month" | "year";

export interface CreateSubscriptionRequest {
  product_id: string;
  price_id: string;
  customer_email: string;
  success_url: string;
  cancel_url: string;
  metadata?: Record<string, string>;
}

export interface SubscriptionPrice {
  id: string;
  amount_in_cents: number;
  currency: string;
  billing_interval: BillingInterval;
  billing_interval_count: number;
  charge_type: "recurring" | "one_time";
  free_trial_interval: BillingInterval | null;
  free_trial_interval_count: number;
  periods_before_automatic_cancellation: number | null;
}

export interface SubscriptionResponse {
  id: string;
  status: "active" | "past_due" | "paused" | "cancelled" | "trialing";
  customer_email: string;
  customer_id: string;
  product_id: string;
  price: SubscriptionPrice;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  live_mode: boolean;
  metadata: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface CreateSubscriptionResponse {
  subscription: SubscriptionResponse;
  checkout_url: string;
}

// ── Refunds ───────────────────────────────────────────────────────────────────

export interface CreateRefundRequest {
  checkout_id: string;
  /** Partial refund amount in centavos. Omit to refund the full amount. */
  amount_in_cents?: number;
  reason?: string;
}

export interface RefundResponse {
  id: string;
  checkout_id: string;
  amount_in_cents: number;
  currency: string;
  reason: string | null;
  status: "pending" | "succeeded" | "failed";
  live_mode: boolean;
  created_at: string;
  updated_at: string;
}

// ── Products ──────────────────────────────────────────────────────────────────

export interface ProductPrice {
  id: string;
  amount_in_cents: number;
  currency: string;
  billing_interval: BillingInterval | null;
  billing_interval_count: number | null;
  charge_type: "one_time" | "recurring";
  free_trial_interval: BillingInterval | null;
  free_trial_interval_count: number;
  periods_before_automatic_cancellation: number | null;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  /** Prices to create along with the product. At least one is required by the API. */
  prices_attributes?: {
    amount_in_cents: number;
    currency: string;
    charge_type: "one_time" | "recurring";
    billing_interval?: BillingInterval | null;
    billing_interval_count?: number | null;
    free_trial_interval?: BillingInterval | null;
    free_trial_interval_count?: number;
    periods_before_automatic_cancellation?: number | null;
  }[];
  /** "none" | "optional" | "required" */
  address_requirement?: "none" | "optional" | "required";
  /** "none" | "optional" | "required" */
  phone_requirement?: "none" | "optional" | "required";
  success_url?: string;
  cancel_url?: string;
  metadata?: Record<string, string>;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  address_requirement?: "none" | "optional" | "required";
  phone_requirement?: "none" | "optional" | "required";
  success_url?: string;
  cancel_url?: string;
  metadata?: Record<string, string>;
}

export interface ProductResponse {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  address_requirement: "none" | "optional" | "required";
  phone_requirement: "none" | "optional" | "required";
  has_dynamic_pricing: boolean;
  storefront_link: string;
  success_url: string | null;
  cancel_url: string | null;
  metadata: Record<string, string>;
  prices: ProductPrice[];
  live_mode: boolean;
  created_at: string;
  updated_at: string;
}

// ── Customers ─────────────────────────────────────────────────────────────────

export interface CreateCustomerRequest {
  email: string;
  full_name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface UpdateCustomerRequest {
  email?: string;
  full_name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface CustomerResponse {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  live_mode: boolean;
  metadata: Record<string, string>;
  created_at: string;
  updated_at: string;
}

// ── Webhook Endpoints ─────────────────────────────────────────────────────────

export interface CreateWebhookEndpointRequest {
  url: string;
  description?: string;
}

export interface WebhookEndpointResponse {
  id: string;
  url: string;
  description: string | null;
  status: "enabled" | "disabled";
  signing_secret: string;
  live_mode: boolean;
  created_at: string;
  updated_at: string;
}

// ── Webhooks ──────────────────────────────────────────────────────────────────

export type WebhookEventType =
  | "payment_intent.succeeded"
  | "payment_intent.failed"
  | "subscription.create"
  | "subscription.past_due"
  | "subscription.paused"
  | "subscription.cancel"
  | "bank_transfer_intent.pending"
  | "bank_transfer_intent.succeeded"
  | "bank_transfer_intent.failed"
  | "setup_intent.succeeded"
  | "setup_intent.cancelled";

/**
 * Discriminated union of all possible webhook events from Recurrente.
 * Switch on `event.type` to automatically narrow the `event.data` payload.
 */
export type RecurrenteEvent =
  | { type: "payment_intent.succeeded"; data: any } // PaymentIntent defined in module
  | { type: "payment_intent.failed"; data: any }
  | { type: "subscription.create"; data: SubscriptionResponse }
  | { type: "subscription.past_due"; data: SubscriptionResponse }
  | { type: "subscription.paused"; data: SubscriptionResponse }
  | { type: "subscription.cancel"; data: SubscriptionResponse }
  | { type: "bank_transfer_intent.pending"; data: any }
  | { type: "bank_transfer_intent.succeeded"; data: any }
  | { type: "bank_transfer_intent.failed"; data: any }
  | { type: "setup_intent.succeeded"; data: any }
  | { type: "setup_intent.cancelled"; data: any }
  | { type: string; data: any }; // Fallback for unknown events

export interface WebhookHeaders {
  "svix-id": string;
  "svix-timestamp": string;
  "svix-signature": string;
  [key: string]: string;
}
