// ── services.ts ──────────────────────────────────────
// Modelo y servicios de dominio: TypeScript sin dependencia del framework.
//
// UserService obtiene usuarios desde JSONPlaceholder.
// DogService obtiene imágenes aleatorias desde la API dog.ceo.
// Ambos servicios son agnósticos del framework y se pueden probar aparte.

// ── Modelo de dominio ────────────────────────────────

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
}

// ── UserService ──────────────────────────────────────

export class UserService {
  async getAll(): Promise<User[]> {
    const res = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<User[]>;
  }
}

// ── DogService ───────────────────────────────────────

export class DogService {
  async getRandomImages(count: number): Promise<string[]> {
    const res = await fetch(`https://dog.ceo/api/breeds/image/random/${count}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.message as string[];
  }
}
