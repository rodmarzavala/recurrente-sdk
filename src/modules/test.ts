import type { RecurrenteClient } from "../client.js";
import type { RequestOptions } from "../types/index.js";

export interface TestResponse {
  message: string;
}

export class TestModule {
  constructor(private readonly client: RecurrenteClient) {}

  /**
   * Tests your authentication credentials.
   * Useful to validate that your API keys are correct.
   * 
   * @param options - Additional request options
   * @returns A Promise resolving to a test message (e.g. "Hello La Surf Office 🌎")
   */
  async credentials(options?: RequestOptions): Promise<TestResponse> {
    return this.client.request<TestResponse>({
      method:  "GET",
      path:    "/api/test",
      timeout: options?.timeout,
    });
  }
}
