import type { RecurrenteClient } from "../client.js";
import type { RequestOptions } from "../types/index.js";

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
   * Retrieves the current account details.
   * 
   * @param options - Additional request options
   * @returns A Promise resolving to the account details
   */
  async retrieve(options?: RequestOptions): Promise<AccountDetails> {
    return this.client.request<AccountDetails>({
      method:  "GET",
      path:    "/api/account",
      timeout: options?.timeout,
    });
  }
}
