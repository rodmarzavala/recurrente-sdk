import type { RecurrenteClient } from "../client.js";

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
   * Crear un comando de terminal
   * Envía un comando de cobro a una terminal POS. Recurrente crea un checkout y lo despacha a la terminal indicada.
   */
  async create(data: CreateTerminalSessionCommandParams): Promise<TerminalSessionCommand> {
    return this.client.request<TerminalSessionCommand>({
      method: "POST",
      path:   "/api/terminal_session_commands",
      body:   data,
    });
  }
}
