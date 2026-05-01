import type { RecurrenteClient } from "../client.js";

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
   * Crear una transferencia
   * Envía dinero desde tu cuenta a otra cuenta de Recurrente. El recipient_id es el handle (@) de la cuenta destinataria.
   */
  async create(data: CreateTransferParams): Promise<Transfer> {
    return this.client.request<Transfer>({
      method: "POST",
      path:   "/api/transfers",
      body:   data,
    });
  }
}
