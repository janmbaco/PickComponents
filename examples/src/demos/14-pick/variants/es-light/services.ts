// ── services.ts ──────────────────────────────────────
// Modelo y servicio de dominio: TypeScript sin dependencia del framework.
//
// CatalogService gestiona una lista de productos y simula actualizaciones
// de existencias con setInterval. Los consumidores se suscriben con
// onStockChange() y reciben una función de limpieza.

// ── Modelo de dominio ────────────────────────────────

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

// ── CatalogService ───────────────────────────────────
// Servicio observable: las existencias se notifican cada 3 segundos.
// startStockUpdates() / stopStockUpdates() controlan el intervalo.

export class CatalogService {
  private products: Product[] = [];
  private listeners: Array<(products: Product[]) => void> = [];
  private interval: ReturnType<typeof setInterval> | null = null;

  async loadCatalog(): Promise<Product[]> {
    await new Promise((r) => setTimeout(r, 500));
    this.products = [
      { id: 1, name: "Teclado inalámbrico", price: 59, stock: 12 },
      { id: 2, name: "USB-C Hub", price: 39, stock: 8 },
      { id: 3, name: "Ratón mecánico", price: 45, stock: 15 },
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
