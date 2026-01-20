export class ApiClient {
  public async fn(signal: AbortSignal): Promise<{ foo: boolean }> {
    return { foo: true };
  }
}
