import { PriceData } from './types';

// Mock Pyth integration - in production, use actual Pyth SDK
export class PriceService {
  private ws: WebSocket | null = null;
  private callbacks: ((prices: Record<string, PriceData>) => void)[] = [];
  private mockPrices: Record<string, PriceData> = {
    'USD/USD': { symbol: 'USD/USD', price: 1.0000, change24h: 0, lastUpdated: new Date() },
    'EUR/USD': { symbol: 'EUR/USD', price: 1.0834, change24h: 0.0045, lastUpdated: new Date() },
    'GBP/USD': { symbol: 'GBP/USD', price: 1.2712, change24h: -0.0023, lastUpdated: new Date() },
    'JPY/USD': { symbol: 'JPY/USD', price: 0.0067, change24h: 0.0001, lastUpdated: new Date() },
    'CNY/USD': { symbol: 'CNY/USD', price: 0.1389, change24h: 0.0012, lastUpdated: new Date() },
    'INR/USD': { symbol: 'INR/USD', price: 0.0120, change24h: -0.0002, lastUpdated: new Date() },
    'CHF/USD': { symbol: 'CHF/USD', price: 1.0924, change24h: 0.0018, lastUpdated: new Date() },
    'AUD/USD': { symbol: 'AUD/USD', price: 0.6543, change24h: 0.0034, lastUpdated: new Date() },
  };

  constructor() {
    this.startMockPriceUpdates();
  }

  private startMockPriceUpdates() {
    setInterval(() => {
      const updatedPrices = { ...this.mockPrices };
      
      Object.keys(updatedPrices).forEach(symbol => {
        const currentPrice = updatedPrices[symbol];
        const variation = (Math.random() - 0.5) * 0.002; // ±0.1% variation
        const newPrice = currentPrice.price * (1 + variation);
        const change = newPrice - currentPrice.price;
        
        updatedPrices[symbol] = {
          ...currentPrice,
          price: Number(newPrice.toFixed(6)),
          change24h: Number((currentPrice.change24h + change).toFixed(6)),
          lastUpdated: new Date(),
        };
      });
      
      this.mockPrices = updatedPrices;
      this.callbacks.forEach(callback => callback(updatedPrices));
    }, 2000); // Update every 2 seconds
  }

  subscribe(callback: (prices: Record<string, PriceData>) => void) {
    this.callbacks.push(callback);
    // Send initial prices
    callback(this.mockPrices);
    
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  getCurrentPrices() {
    return this.mockPrices;
  }
}

export const priceService = new PriceService();