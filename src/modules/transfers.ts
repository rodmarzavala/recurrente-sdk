import type { RecurrenteClient } from "../client.js";
import type { RequestOptions } from "../types/index.js";

export interface TransferAccountInfo {
  id: string;
  name: string;
  type: string;
}

export interface Transfer {
  id: string;
  amount_in_cents: number;
  currency: string;
  status: string;
  created_at: string;
  note?: string;
  sender: TransferAccountInfo;
  recipient: TransferAccountInfo;
}

export interface CreateTransferParams {
  amount_in_cents: number;
  currency: string;
  recipient_id: string;
}

export class TransfersModule {
  constructor(private readonly client: RecurrenteClient) {}

  /**
   * Creates an internal transfer.
   * Sends money from your account to another Recurrente account.
   * 
   * @param data - Transfer configuration including amount and recipient ID (the @ handle)
   * @param options - Additional request options (e.g. idempotencyKey)
   * @returns A Promise resolving to the created Transfer.
   */
  async create(data: CreateTransferParams, options?: RequestOptions): Promise<Transfer> {
    return this.client.request<Transfer>({
      method:         "POST",
      path:           "/api/transfers",
      body:           data,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
    });
  }
}
