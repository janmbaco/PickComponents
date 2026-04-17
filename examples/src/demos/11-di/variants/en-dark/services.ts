// ── services.ts ──────────────────────────────────────
// Domain services — plain TypeScript classes with no framework coupling.
//
// InjectKit in this repo uses explicit dependency metadata.
// Classes that need constructor injection declare `deps` in @Injectable().

import { Injectable } from "injectkit";

// ── Domain Model ─────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
}

// ── HttpClient ───────────────────────────────────────

@Injectable()
export class HttpClient {
  async get<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  }
}

// ── UserService ──────────────────────────────────────
// UserService declares HttpClient explicitly so the same source works
// in the playground sandbox and in downloaded static bundles.

@Injectable({ deps: [HttpClient] })
export class UserService {
  constructor(private readonly http: HttpClient) {}

  async getAll(): Promise<User[]> {
    return this.http.get("https://jsonplaceholder.typicode.com/users");
  }
}
