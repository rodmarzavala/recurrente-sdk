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
import { AccountModule }                             from "./modules/account.js";
import { CouponsModule }                             from "./modules/coupons.js";
import { PaymentIntentsModule }                      from "./modules/payment-intents.js";
import { TerminalSessionCommandsModule }             from "./modules/terminal-session-commands.js";
import { TransfersModule }                           from "./modules/transfers.js";
import { UsersModule }                               from "./modules/users.js";
import { TestModule }                                from "./modules/test.js";
import type { RecurrenteClientOptions }              from "./types/index.js";

export { RecurrenteClient };

export * from "./modules/account.js";
export * from "./modules/coupons.js";
export * from "./modules/payment-intents.js";
export * from "./modules/terminal-session-commands.js";
export * from "./modules/transfers.js";
export * from "./modules/users.js";
export * from "./modules/test.js";

export class Recurrente {
  readonly checkouts:        CheckoutsModule;
  readonly subscriptions:    SubscriptionsModule;
  readonly refunds:          RefundsModule;
  readonly products:         ProductsModule;
  readonly customers:        CustomersModule;
  readonly webhookEndpoints: WebhookEndpointsModule;
  readonly account:          AccountModule;
  readonly coupons:          CouponsModule;
  readonly paymentIntents:   PaymentIntentsModule;
  readonly terminalSessionCommands: TerminalSessionCommandsModule;
  readonly transfers:        TransfersModule;
  readonly users:            UsersModule;
  readonly test:             TestModule;

  constructor(options: RecurrenteClientOptions) {
    const client            = new RecurrenteClient(options);
    this.checkouts          = new CheckoutsModule(client);
    this.subscriptions      = new SubscriptionsModule(client);
    this.refunds            = new RefundsModule(client);
    this.products           = new ProductsModule(client);
    this.customers          = new CustomersModule(client);
    this.webhookEndpoints   = new WebhookEndpointsModule(client);
    this.account            = new AccountModule(client);
    this.coupons            = new CouponsModule(client);
    this.paymentIntents     = new PaymentIntentsModule(client);
    this.terminalSessionCommands = new TerminalSessionCommandsModule(client);
    this.transfers          = new TransfersModule(client);
    this.users              = new UsersModule(client);
    this.test               = new TestModule(client);
  }
}
