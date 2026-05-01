import type { RecurrenteClient } from "../client.js";
import type { RequestOptions } from "../types/index.js";

export interface User {
  id: string;
  email: string;
}

export interface CreateUserParams {
  email: string;
}

export class UsersModule {
  constructor(private readonly client: RecurrenteClient) {}

  /**
   * Creates a user.
   * Creates a user that can be associated with checkouts.
   * If a user with the provided email already exists, it returns the existing user.
   * 
   * @param data - User configuration (email)
   * @param options - Additional request options
   * @returns A Promise resolving to the created User.
   */
  async create(data: CreateUserParams, options?: RequestOptions): Promise<User> {
    return this.client.request<User>({
      method:         "POST",
      path:           "/api/users",
      body:           data,
      idempotencyKey: options?.idempotencyKey,
      timeout:        options?.timeout,
    });
  }
}
