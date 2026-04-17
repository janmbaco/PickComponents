// ── services.ts ──────────────────────────────────────
// Domain model and service — plain TypeScript, no framework dependency.
//
// CatalogService manages a list of products and simulates real-time
// stock updates via setInterval. Consumers subscribe via onStockChange()
// and receive a teardown function for automatic cleanup.

// ── Domain Model ─────────────────────────────────────

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

// ── CatalogService ───────────────────────────────────
// Observable service: stock updates are pushed to listeners every 3 seconds.
// startStockUpdates() / stopStockUpdates() control the update interval.

export class CatalogService {
  private products: Product[] = [];
  private listeners: Array<(products: Product[]) => void> = [];
  private interval: ReturnType<typeof setInterval> | null = null;

  async loadCatalog(): Promise<Product[]> {
    await new Promise((r) => setTimeout(r, 500));
    this.products = [
      { id: 1, name: "Wireless Keyboard", price: 59, stock: 12 },
      { id: 2, name: "USB-C Hub", price: 39, stock: 8 },
      { id: 3, name: "Mechanical Mouse", price: 45, stock: 15 },
      { id: 4, name: '27" Monitor', price: 299, stock: 4 },
      { id: 5, name: "Webcam HD", price: 79, stock: 20 },
    ];
    return [...this.products];
  }

  startStockUpdates(): void {
    this.interval = setInterval(() => {
      this.products = this.products.map((p) => ({
        ...p,
        stock: Math.max(0, p.stock + Math.floor(Math.random() * 5) - 2),
      }));
      this.listeners.forEach((fn) => fn([...this.products]));
    }, 3000);
  }

  stopStockUpdates(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  onStockChange(listener: (products: Product[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}
