// ── services.ts ──────────────────────────────────────
// Servicios de dominio: clases TypeScript sin acoplamiento al framework.
//
// InjectKit usa metadatos de dependencias explícitos.
// Las clases con inyección por constructor declaran `deps` en @Injectable().

import { Injectable } from "injectkit";

// ── Modelos de dominio ───────────────────────────────

export interface UserSummary {
  id: number;
  name: string;
  email: string;
}

export interface Note {
  id: number;
  text: string;
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

@Injectable({ deps: [HttpClient] })
export class UserService {
  constructor(private readonly http: HttpClient) {}

  async getAll(): Promise<UserSummary[]> {
    return this.http.get("https://jsonplaceholder.typicode.com/users");
  }
}

// ── PostService ──────────────────────────────────────

@Injectable({ deps: [HttpClient] })
export class PostService {
  constructor(private readonly http: HttpClient) {}

  async getAll(): Promise<{ id: number; title: string }[]> {
    return this.http.get("https://jsonplaceholder.typicode.com/posts");
  }
}
