import type { IServiceProvider } from "../../src/providers/service-provider.interface.js";

/**
 * Mock implementation of IServiceProvider for unit testing.
 *
 * @description
 * Allows registering mock services for dependency injection testing.
 * Tracks all get/has calls for verification.
 */
export class MockServiceProvider implements IServiceProvider {
  private services = new Map<any, any>();
  public callLog: Array<{ method: string; key: any }> = [];

  register<T>(key: new (...args: any[]) => T, instance: T): void {
    this.services.set(key, instance);
  }

  has<T>(key: new (...args: any[]) => T): boolean {
    this.callLog.push({ method: "has", key });
    return this.services.has(key);
  }

  get<T>(key: new (...args: any[]) => T): T {
    this.callLog.push({ method: "get", key });
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service not registered: ${key.name || key}`);
    }
    return service;
  }

  reset(): void {
    this.services.clear();
    this.callLog = [];
  }

  wasServiceRequested(key: any): boolean {
    return this.callLog.some((call) => call.key === key);
  }
}
