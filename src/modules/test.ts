import type { RecurrenteClient } from "../client.js";

export interface TestResponse {
  message: string;
}

export class TestModule {
  constructor(private readonly client: RecurrenteClient) {}

  /**
   * Prueba tus credenciales de autenticación
   * @returns {Promise<TestResponse>} Test response
   */
  async credentials(): Promise<TestResponse> {
    return this.client.request<TestResponse>({
      method: "GET",
      path:   "/api/test",
    });
  }
}
