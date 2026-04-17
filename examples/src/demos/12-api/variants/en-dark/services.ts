// ── services.ts ──────────────────────────────────────
// Domain model and services — plain TypeScript, no framework dependency.
//
// UserService fetches users from JSONPlaceholder.
// DogService fetches random dog images from dog.ceo API.
// Both services are framework-agnostic and can be tested independently.

// ── Domain Model ─────────────────────────────────────

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
