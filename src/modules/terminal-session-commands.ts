import type { RecurrenteClient } from "../client.js";
import type { RequestOptions } from "../types/index.js";

export interface TerminalSessionCommand {
  id: number | string;
  external_id: string;
  status: string;
  terminal_id: string;
  amount_in_cents: number;
  currency: string;
  checkout_id: string;
  checkout_url: string;
}

export interface CreateTerminalSessionCommandParams {
  terminal_id: string;
  external_id: string;
  amount_in_cents?: number;
  amount?: number;
  currency?: string;
  installments?: number;
}

export class TerminalSessionCommandsModule {
  constructor(private readonly client: RecurrenteClient) {}

  /**
   * Creates a terminal session command.
   * Dispatches a payment command to a POS terminal. Recurrente creates a checkout and sends it to the specified terminal.
   * 
   * @param data - The terminal session command payload
   * @param options - Additional request options
   * @returns A Promise resolving to the created TerminalSessionCommand.
   */
  async create(data: CreateTerminalSessionCommandParams, options?: RequestOptions): Promise<TerminalSessionCommand> {
    return this.client.request<TerminalSessionCommand>({
      method:         "POST",
      path:           "/api/terminal_session_commands",
      body:           data,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
    });
  }
}
