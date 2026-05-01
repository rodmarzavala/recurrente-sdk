import type { RecurrenteClient } from "../client.js";

export interface AccountDetails {
  id: string;
  status: string;
  name: string;
  account_type: string;
  created_at: string;
  creator_name: string;
  creator_email: string;
}

export class AccountModule {
  constructor(private readonly client: RecurrenteClient) {}

  /**
   * Obtén detalles de la cuenta
   * @returns {Promise<AccountDetails>} Detalles de la cuenta
   */
  async retrieve(): Promise<AccountDetails> {
    return this.client.request<AccountDetails>({
      method: "GET",
      path:   "/api/account",
    });
  }
}
