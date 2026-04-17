// ── services.ts ──────────────────────────────────────
// Servicios de dominio: clases TypeScript sin acoplamiento al framework.
//
// InjectKit usa metadatos de dependencias explícitos.
// Las clases con inyección por constructor declaran `deps` en @Injectable().

import { Injectable } from "injectkit";

// ── Modelo de dominio ────────────────────────────────

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
// UserService declara HttpClient de forma explícita para que el mismo código
// funcione en el sandbox del playground y en las descargas estáticas.

@Injectable({ deps: [HttpClient] })
export class UserService {
  constructor(private readonly http: HttpClient) {}

  async getAll(): Promise<User[]> {
    return this.http.get("https://jsonplaceholder.typicode.com/users");
  }
}
