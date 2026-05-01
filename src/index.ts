// ─────────────────────────────────────────────────────────────────────────────
// src/index.ts — Public API surface
// ─────────────────────────────────────────────────────────────────────────────

export { RecurrenteError }                           from "./client.js";
export type { RecurrenteErrorBody }                 from "./types/index.js";
export type { InternalRequestOptions }              from "./client.js";

export { RecurrenteWebhooks }                        from "./modules/webhooks.js";
export type { WebhookHeaders }                       from "./modules/webhooks.js";

export { pageIterator, autoPagingToArray, parsePaginationHeaders } from "./pagination.js";
export type { Page, PageMeta }                       from "./pagination.js";

export type {
  // Request types
  CreateCheckoutRequest,
  CheckoutItem,
  PaginationParams,
  RequestOptions,
  CreateSubscriptionRequest,
  CreateRefundRequest,
  CreateProductRequest,
  UpdateProductRequest,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreateWebhookEndpointRequest,
  // Response types
  CheckoutResponse,
  CreateSubscriptionResponse,
  SubscriptionResponse,
  SubscriptionPrice,
  RefundResponse,
  ProductResponse,
  ProductPrice,
  CustomerResponse,
  WebhookEndpointResponse,
  WebhookEventType,
  BillingInterval,
} from "./types/index.js";

// ── Main SDK class ────────────────────────────────────────────────────────────

import { RecurrenteClient }                          from "./client.js";
import { CheckoutsModule }                           from "./modules/checkouts.js";
import { SubscriptionsModule }                       from "./modules/subscriptions.js";
import { RefundsModule }                             from "./modules/refunds.js";
import { ProductsModule }                            from "./modules/products.js";
import { CustomersModule }                           from "./modules/customers.js";
import { WebhookEndpointsModule }                    from "./modules/webhook-endpoints.js";
import type { RecurrenteClientOptions }              from "./types/index.js";

export { RecurrenteClient };

export class Recurrente {
  readonly checkouts:        CheckoutsModule;
  readonly subscriptions:    SubscriptionsModule;
  readonly refunds:          RefundsModule;
  readonly products:         ProductsModule;
  readonly customers:        CustomersModule;
  readonly webhookEndpoints: WebhookEndpointsModule;

  constructor(options: RecurrenteClientOptions) {
    const client            = new RecurrenteClient(options);
    this.checkouts          = new CheckoutsModule(client);
    this.subscriptions      = new SubscriptionsModule(client);
    this.refunds            = new RefundsModule(client);
    this.products           = new ProductsModule(client);
    this.customers          = new CustomersModule(client);
    this.webhookEndpoints   = new WebhookEndpointsModule(client);
  }
}
