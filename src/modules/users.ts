import type { RecurrenteClient } from "../client.js";

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
   * Crear un usuario
   * Crea un usuario que puede ser asociado a checkouts. Si ya existe un usuario con el email proporcionado, retorna el usuario existente.
   */
  async create(data: CreateUserParams): Promise<User> {
    return this.client.request<User>({
      method: "POST",
      path:   "/api/users",
      body:   data,
    });
  }
}
