import { ApiClient } from "./ApiClient";

export default class SomeClient {
  private concurrencyControllers: Record<string, AbortController>;

  constructor(private apiClient: ApiClient) {
    this.concurrencyControllers = {};
  }

  async requestQuotes({
    concurrencyKey,
  }: {
    concurrencyKey?: string;
  }): Promise<{ foo: boolean }> {
    let signal;
    if (concurrencyKey) {
      this.cancelRequestQuotes(concurrencyKey);
      this.concurrencyControllers[concurrencyKey] = new AbortController();
      signal = this.concurrencyControllers[concurrencyKey].signal;
    }

    if (!signal) {
      throw new Error("expected signal to exist");
    }

    try {
      const response = await this.apiClient.fn(signal);

      //@ts-ignore
      return response;
    } finally {
      if (concurrencyKey) {
        delete this.concurrencyControllers[concurrencyKey];
      }
    }
  }

  cancelRequestQuotes(concurrencyKey: string) {
    if (this.concurrencyControllers[concurrencyKey]) {
      // already aborted
      if (this.concurrencyControllers[concurrencyKey].signal.aborted) {
        return;
      }
      this.concurrencyControllers[concurrencyKey].abort();
    }
  }
}
